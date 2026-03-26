declare namespace Cloudflare {
  interface Env {
    LOADER: WorkerLoader;
    OPENROUTER_API_KEY: string;
    GOOGLE_API_KEY: string;
    TOOLS_KV: KVNamespace;
  }
}
interface Env extends Cloudflare.Env {}
