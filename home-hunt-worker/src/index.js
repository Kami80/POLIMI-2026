import {parseIdealista} from "./providers/idealista.js";
import {parseImmobiliare} from "./providers/immobiliare.js";
import {parseHousingAnywhere} from "./providers/housinganywhere.js";
import {parseSpotahome} from "./providers/spotahome.js";
import {parseGeneric} from "./providers/generic.js";

const MAX_HTML_BYTES = 4_000_000;
const MAX_REDIRECTS = 3;
const DEFAULT_ALLOWED_ORIGINS = "https://kami80.github.io,http://localhost:8000,http://127.0.0.1:8000,http://localhost:5500,http://127.0.0.1:5500";
const PROVIDERS = [
  {id:"idealista", label:"Idealista", hosts:["idealista.it"], parser:parseIdealista},
  {id:"immobiliare", label:"Immobiliare.it", hosts:["immobiliare.it"], parser:parseImmobiliare},
  {id:"housinganywhere", label:"HousingAnywhere", hosts:["housinganywhere.com"], parser:parseHousingAnywhere},
  {id:"spotahome", label:"Spotahome", hosts:["spotahome.com"], parser:parseSpotahome}
];

function json(data, status=200, origin="*") {
  return new Response(status === 204 ? null : JSON.stringify(data), {
    status,
    headers: {
      "content-type":"application/json; charset=utf-8",
      "cache-control":"no-store",
      "access-control-allow-origin": origin,
      "access-control-allow-methods":"POST, GET, OPTIONS",
      "access-control-allow-headers":"content-type",
      "access-control-max-age":"86400",
      "vary":"Origin",
      "x-content-type-options":"nosniff"
    }
  });
}

function allowedOrigin(request, env) {
  const origin = request.headers.get("Origin") || "";
  if (!origin) return "*";
  const configured = String(env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS).split(",").map(x=>x.trim()).filter(Boolean);
  if (configured.includes("*")) return "*";
  return configured.includes(origin) ? origin : null;
}

function providerForHost(hostname) {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  return PROVIDERS.find(p => p.hosts.some(base => host === base || host.endsWith(`.${base}`))) || null;
}

function validateListingUrl(raw) {
  let url;
  try { url = new URL(String(raw || "").trim()); }
  catch (_) { throw new Error("Enter a valid rental listing URL."); }
  if (url.protocol !== "https:") throw new Error("Only HTTPS listing URLs are accepted.");
  if (url.username || url.password) throw new Error("URLs containing credentials are not accepted.");
  if (url.port && url.port !== "443") throw new Error("Non-standard URL ports are not accepted.");
  const provider = providerForHost(url.hostname);
  if (!provider) throw new Error("This importer currently supports Idealista, Immobiliare.it, HousingAnywhere, and Spotahome URLs.");
  return {url, provider};
}

async function readLimited(response) {
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared && declared > MAX_HTML_BYTES) throw new Error("Listing page is too large to import safely.");
  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > MAX_HTML_BYTES) throw new Error("Listing page exceeded the importer size limit.");
  return text;
}

async function fetchDirect(initialUrl, provider) {
  let current = new URL(initialUrl.href);
  for (let i=0; i<=MAX_REDIRECTS; i++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 14_000);
    let response;
    try {
      response = await fetch(current.href, {
        method:"GET",
        redirect:"manual",
        signal:controller.signal,
        headers:{
          "accept":"text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
          "accept-language":"en-GB,en;q=0.8,it;q=0.6",
          "user-agent":"Mozilla/5.0 (compatible; POLIMI-Home-Hunt/1.0; +https://github.com/Kami80/POLIMI-2026)"
        }
      });
    } finally { clearTimeout(timeout); }

    if ([301,302,303,307,308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Listing redirected without a destination.");
      const next = new URL(location, current);
      const validated = validateListingUrl(next.href);
      if (validated.provider.id !== provider.id) throw new Error("Cross-provider redirects are blocked.");
      current = validated.url;
      continue;
    }

    if (!response.ok) {
      const error = new Error(`Source returned HTTP ${response.status}.`);
      error.status = response.status;
      throw error;
    }
    const type = (response.headers.get("content-type") || "").toLowerCase();
    if (type && !type.includes("text/html") && !type.includes("text/plain") && !type.includes("application/xhtml")) throw new Error("Source did not return a readable listing page.");
    const content = await readLimited(response);
    if (content.trim().length < 220) throw new Error("Source returned too little listing content.");
    return {content, finalUrl:current.href, fetchMode:"direct"};
  }
  throw new Error("Too many redirects while reading the listing.");
}

async function fetchReaderFallback(url, env) {
  if (String(env.ENABLE_READER_FALLBACK || "true").toLowerCase() === "false") throw new Error("Reader fallback is disabled.");
  const readerUrl = `https://r.jina.ai/${url.href}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18_000);
  try {
    const headers = {"accept":"text/plain"};
    if (env.JINA_API_KEY) headers.authorization = `Bearer ${env.JINA_API_KEY}`;
    const response = await fetch(readerUrl,{headers,signal:controller.signal,redirect:"follow"});
    if (!response.ok) throw new Error(`Reader fallback returned HTTP ${response.status}.`);
    const content = await readLimited(response);
    if (content.trim().length < 220) throw new Error("Reader fallback returned too little content.");
    return {content, finalUrl:url.href, fetchMode:"reader-fallback"};
  } finally { clearTimeout(timeout); }
}

function normalizeOutput(result, originalUrl) {
  const p = result.property || {};
  const allowedImages = Array.isArray(p.images) ? p.images.filter(x => /^https?:\/\//i.test(String(x))).slice(0,12) : [];
  return {
    ...result,
    originalUrl,
    property:{
      ...p,
      canonicalUrl: /^https?:\/\//i.test(String(p.canonicalUrl || "")) ? p.canonicalUrl : originalUrl,
      image: /^https?:\/\//i.test(String(p.image || "")) ? p.image : (allowedImages[0] || ""),
      images:allowedImages,
      description:String(p.description || "").slice(0,1800),
      title:String(p.title || "Rental listing").slice(0,240),
      address:String(p.address || "").slice(0,300),
      landlordName:String(p.landlordName || "").slice(0,180),
      minimumStay:String(p.minimumStay || "").slice(0,120),
      available:String(p.available || "").slice(0,120),
      floor:String(p.floor || "").slice(0,80)
    }
  };
}

async function importHome(rawUrl, env) {
  const {url, provider} = validateListingUrl(rawUrl);
  let fetched;
  let directError = null;
  try { fetched = await fetchDirect(url, provider); }
  catch (err) {
    directError = err;
    fetched = await fetchReaderFallback(url, env);
  }
  const parsed = provider.parser(fetched.content, fetched.finalUrl, fetched.fetchMode)
    || parseGeneric(fetched.content, fetched.finalUrl, fetched.fetchMode, provider.label, provider.id);
  const normalized = normalizeOutput(parsed, url.href);
  normalized.transport = {
    mode:fetched.fetchMode,
    directAttempted:true,
    directError: directError ? String(directError.message || directError).slice(0,180) : null
  };
  return normalized;
}

export {validateListingUrl, providerForHost};

export default {
  async fetch(request, env) {
    const origin = allowedOrigin(request, env);
    if (!origin) return json({success:false,error:"This website origin is not allowed to call the Home Hunt importer."},403,"null");
    if (request.method === "OPTIONS") return json({ok:true},204,origin);
    const url = new URL(request.url);
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health" || url.pathname === "/api/health")) {
      return json({ok:true,service:"POLIMI Home Hunt Importer",version:"1.0.0",providers:PROVIDERS.map(p=>p.id)},200,origin);
    }
    if (url.pathname !== "/api/import-home" || request.method !== "POST") return json({success:false,error:"Not found"},404,origin);

    const type = (request.headers.get("content-type") || "").toLowerCase();
    if (!type.includes("application/json")) return json({success:false,error:"Send application/json with a url field."},415,origin);
    const length = Number(request.headers.get("content-length") || 0);
    if (length > 4096) return json({success:false,error:"Request body is too large."},413,origin);

    let body;
    try { body = await request.json(); }
    catch (_) { return json({success:false,error:"Invalid JSON request."},400,origin); }

    try {
      const result = await importHome(body?.url, env);
      return json({success:true,...result},200,origin);
    } catch (err) {
      const message = String(err?.message || "The listing could not be imported.");
      const status = /valid|only HTTPS|supports|credentials|ports|blocked/i.test(message) ? 400 : 502;
      return json({success:false,error:message,manualFallback:true},status,origin);
    }
  }
};
