/**
 * Tail Worker — captures logs, exceptions, and fetch events from Dynamic Workers.
 * Stores structured observability data per run in KV.
 *
 * Deploy separately:
 *   wrangler deploy --name yukti-tail src/tail-worker.ts
 *
 * Then add to the main worker config (wrangler.jsonc):
 *   "tail_consumers": [{ "service": "yukti-tail" }]
 *
 * The tail worker needs its own KV binding. Create a wrangler.jsonc for it or
 * use `wrangler deploy --name yukti-tail --kv TOOLS_KV=<kv-id> src/tail-worker.ts`
 */

interface TailEvent {
  scriptName: string | null;
  outcome: string;
  exceptions: { name: string; message: string; timestamp: number }[];
  logs: { level: string; message: string[]; timestamp: number }[];
  event: {
    request?: { url: string; method: string };
  } | null;
}

export default {
  async tail(events: TailEvent[], env: Env): Promise<void> {
    for (const event of events) {
      const domains: string[] = [];
      const sandboxLogs: string[] = [];
      let runId: string | null = null;

      for (const log of event.logs) {
        const msg = log.message.join(" ");

        // Capture fetched domains from the outbound guard's logs
        const fetchMatch = msg.match(/\[sandbox\] Fetch: ([^\s/]+)/);
        if (fetchMatch) {
          const domain = fetchMatch[1];
          if (!domains.includes(domain)) domains.push(domain);
        }

        // Capture blocked domain attempts
        const blockedMatch = msg.match(
          /\[sandbox\] Blocked (?:private network|domain not in allowlist): (.+)/
        );
        if (blockedMatch) {
          sandboxLogs.push(`BLOCKED: ${blockedMatch[1]}`);
        }

        // Capture run ID if logged (8-char hex prefix from host worker)
        const runMatch = msg.match(/\[([a-z0-9]{8})\]/);
        if (runMatch && !runId) runId = runMatch[1];

        sandboxLogs.push(msg);
      }

      // Extract exceptions
      const exceptions = event.exceptions.map((e) => ({
        name: e.name,
        message: e.message,
        timestamp: e.timestamp,
      }));

      // Store in KV if we captured anything useful
      if (
        env.TOOLS_KV &&
        (domains.length > 0 || exceptions.length > 0 || sandboxLogs.length > 0)
      ) {
        const tailData = {
          scriptName: event.scriptName,
          outcome: event.outcome,
          domains,
          exceptions,
          logs: sandboxLogs.slice(0, 100), // cap at 100 log lines
          capturedAt: new Date().toISOString(),
        };

        // Use a short-lived key the host worker can query
        const tailKey = `tail:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
        try {
          await env.TOOLS_KV.put(tailKey, JSON.stringify(tailData), {
            expirationTtl: 300, // 5 minutes — ephemeral, picked up by host
            metadata: { domains, outcome: event.outcome },
          });
        } catch {
          // Best-effort — tail workers must not throw
        }
      }
    }
  },
} satisfies ExportedHandler<Env>;
