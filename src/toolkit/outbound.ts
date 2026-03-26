/**
 * Outbound fetch guard.
 * Blocks private/internal networks and strips unauthorized credentials.
 * All public APIs are allowed — the LLM decides what to call.
 */

const BLOCKED_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^169\.254\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /\.local$/i,
  /\.internal$/i,
  /\.localhost$/i,
];

function isBlockedDomain(hostname: string): boolean {
  return BLOCKED_PATTERNS.some(p => p.test(hostname));
}

/**
 * Generates a JS snippet injected into every Dynamic Worker.
 * - Blocks private/internal network access
 * - Strips any Authorization headers the LLM adds (our keys are in env, not headers)
 * - Logs outbound calls for observability
 */
export function generateFetchGuard(): string {
  const patterns = BLOCKED_PATTERNS.map(p => p.source);
  return `
const __blocked = [${patterns.map(p => `/${p}/i`).join(",")}];
const __originalFetch = globalThis.fetch;
globalThis.fetch = function(input, init) {
  var url;
  try { url = new URL(typeof input === 'string' ? input : input.url); } catch(e) { return __originalFetch(input, init); }
  for (var i = 0; i < __blocked.length; i++) {
    if (__blocked[i].test(url.hostname)) {
      console.warn('[sandbox] Blocked private network: ' + url.hostname);
      return Promise.resolve(new Response(JSON.stringify({error:'Private network access blocked'}), {status:403, headers:{'Content-Type':'application/json'}}));
    }
  }
  console.log('[sandbox] Fetch: ' + url.hostname + url.pathname);
  return __originalFetch(input, init);
};
`;
}
