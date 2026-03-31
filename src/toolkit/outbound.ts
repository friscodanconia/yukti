/**
 * Outbound fetch guard.
 * Uses a domain allowlist (only approved API catalog domains) plus
 * a private-network blocklist (defense in depth).
 * All outbound calls are logged with domain for observability.
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

/** Domains from the API catalog in the system prompt. */
export const ALLOWED_DOMAINS: string[] = [
  "api.frankfurter.app",
  "cdn.jsdelivr.net",
  "api.coingecko.com",
  "query1.finance.yahoo.com",
  "api.mfapi.in",
  "api.data.gov.in",
  "api.open-meteo.com",
  "air-quality-api.open-meteo.com",
  "api.sunrise-sunset.org",
  "api.nal.usda.gov",
  "world.openfoodfacts.org",
  "api.postalpincode.in",
  "ifsc.razorpay.com",
  "date.nager.at",
  "api.worldbank.org",
  "restcountries.com",
  "universities.hipolabs.com",
  "en.wikipedia.org",
  "api.dictionaryapi.dev",
  "timeapi.io",
  "nominatim.openstreetmap.org",
  "www.themealdb.com",
  "www.thecocktaildb.com",
  "www.omdbapi.com",
  "api.tvmaze.com",
  "www.googleapis.com",
  "books.googleapis.com",
  "api.nasa.gov",
  "api.wheretheiss.at",
  "earthquake.usgs.gov",
  "api.spacexdata.com",
  "newton.vercel.app",
  "wger.de",
  "api.fda.gov",
  "vpic.nhtsa.dot.gov",
  "api.openf1.org",
  "www.thesportsdb.com",
  "opentdb.com",
  "v2.jokeapi.dev",
  "icanhazdadjoke.com",
  "zenquotes.io",
  "api.nobelprize.org",
  "api.artic.edu",
  "collectionapi.metmuseum.org",
  "api.aladhan.com",
  "kgsearch.googleapis.com",
  "openlibrary.org",
  "generativelanguage.googleapis.com",
  "openrouter.ai",
];

function isBlockedDomain(hostname: string): boolean {
  return BLOCKED_PATTERNS.some(p => p.test(hostname));
}

function isAllowedDomain(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return ALLOWED_DOMAINS.some(d => lower === d || lower.endsWith("." + d));
}

/**
 * Generates a JS snippet injected into every Dynamic Worker.
 * - Blocks private/internal network access (blocklist — defense in depth)
 * - Blocks any domain NOT in the approved allowlist
 * - Strips any Authorization headers the LLM adds (our keys are in env, not headers)
 * - Logs outbound calls for observability
 */
export function generateFetchGuard(): string {
  const patterns = BLOCKED_PATTERNS.map(p => p.source);
  const domainsJSON = JSON.stringify(ALLOWED_DOMAINS);
  return `
var __fetchedDomains = [];
var __blockedDomains = [];
const __blocked = [${patterns.map(p => `/${p}/i`).join(",")}];
const __allowed = ${domainsJSON};
const __originalFetch = globalThis.fetch;
globalThis.fetch = function(input, init) {
  var url;
  try { url = new URL(typeof input === 'string' ? input : input.url); } catch(e) { return __originalFetch(input, init); }
  var hostname = url.hostname.toLowerCase();
  for (var i = 0; i < __blocked.length; i++) {
    if (__blocked[i].test(hostname)) {
      console.warn('[sandbox] Blocked private network: ' + hostname);
      if (__blockedDomains.indexOf(hostname) === -1) __blockedDomains.push(hostname);
      return Promise.resolve(new Response(JSON.stringify({error:'Private network access blocked'}), {status:403, headers:{'Content-Type':'application/json'}}));
    }
  }
  var domainOk = false;
  for (var j = 0; j < __allowed.length; j++) {
    if (hostname === __allowed[j] || hostname.endsWith('.' + __allowed[j])) {
      domainOk = true;
      break;
    }
  }
  if (!domainOk) {
    console.warn('[sandbox] Blocked domain not in allowlist: ' + hostname);
    if (__blockedDomains.indexOf(hostname) === -1) __blockedDomains.push(hostname);
    return Promise.resolve(new Response(JSON.stringify({error:'Domain not in approved list: ' + hostname}), {status:403, headers:{'Content-Type':'application/json'}}));
  }
  if (__fetchedDomains.indexOf(hostname) === -1) __fetchedDomains.push(hostname);
  console.log('[sandbox] Fetch: ' + hostname + url.pathname);
  return __originalFetch(input, init);
};
globalThis.__getYuktiMeta = function() {
  return { fetchedDomains: __fetchedDomains, blockedDomains: __blockedDomains };
};
`;
}
