const MONEY_NUMBER = "(?:[0-9]{1,3}(?:[.,][0-9]{3})+(?:[.,][0-9]{1,2})?|[0-9]{2,5}(?:[.,][0-9]{1,2})?)";
const MONEY_RE = new RegExp(`(?:€|EUR\\s*)\\s*(${MONEY_NUMBER})|(${MONEY_NUMBER})\\s*(?:€|EUR)`, "gi");

export function cleanText(value = "") {
  return String(value)
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

export function stripHtml(html = "") {
  const raw = String(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|li|div|section|article|h[1-6]|tr|dt|dd)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return raw.split(/\r?\n/).map(cleanText).filter(Boolean).join("\n");
}

function attrs(tag = "") {
  const out = {};
  const re = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let m;
  while ((m = re.exec(tag))) out[m[1].toLowerCase()] = cleanText(m[2] ?? m[3] ?? m[4] ?? "");
  return out;
}

export function metaMap(html = "") {
  const out = new Map();
  const tags = String(html).match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const a = attrs(tag);
    const key = (a.property || a.name || a.itemprop || "").toLowerCase();
    if (key && a.content && !out.has(key)) out.set(key, a.content);
  }
  return out;
}

export function extractJsonLd(html = "") {
  const nodes = [];
  const re = /<script\b[^>]*type\s*=\s*(?:"application\/ld\+json"|'application\/ld\+json'|application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(String(html)))) {
    const raw = m[1].trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) nodes.push(...parsed);
      else if (parsed && typeof parsed === "object") nodes.push(parsed);
    } catch (_) {
      // Some sites include invalid JSON-LD. Other extractors can still succeed.
    }
  }
  return nodes;
}

export function flattenNodes(value, out = [], seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return out;
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach(v => flattenNodes(v, out, seen));
    return out;
  }
  out.push(value);
  for (const v of Object.values(value)) flattenNodes(v, out, seen);
  return out;
}

function typeText(node) {
  const t = node?.["@type"];
  return Array.isArray(t) ? t.join(" ") : String(t || "");
}

export function choosePropertyNode(jsonLd = []) {
  const all = flattenNodes(jsonLd);
  const preferred = /apartment|house|room|residence|accommodation|place|product|realestate|singlefamily|lodging/i;
  return all.find(n => preferred.test(typeText(n)) && (n.name || n.description || n.offers || n.address))
    || all.find(n => n.offers && (n.name || n.description))
    || all[0]
    || null;
}

export function normalizeMoney(value) {
  if (value === null || value === undefined || value === "") return null;
  let raw = String(value).replace(/\s/g, "").replace(/[^0-9.,]/g, "");
  if (!raw) return null;
  const lastDot = raw.lastIndexOf("."), lastComma = raw.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    const decimalSep = lastDot > lastComma ? "." : ",";
    const thousandsSep = decimalSep === "." ? "," : ".";
    raw = raw.split(thousandsSep).join("");
    raw = raw.replace(decimalSep, ".");
  } else {
    const sep = lastDot >= 0 ? "." : lastComma >= 0 ? "," : "";
    if (sep) {
      const parts = raw.split(sep);
      if (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3) raw = parts.join("");
      else if (parts.length > 2) { const tail = parts.pop(); raw = tail.length <= 2 ? parts.join("") + "." + tail : parts.join("") + tail; }
      else raw = raw.replace(sep, ".");
    }
  }
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

export function moneyNear(text, terms = [], exclusions = []) {
  const source = String(text || "");
  const lower = source.toLowerCase();
  for (const term of terms) {
    let startAt = 0;
    const needle = String(term).toLowerCase();
    while (startAt < lower.length) {
      const idx = lower.indexOf(needle, startAt);
      if (idx < 0) break;
      const from = Math.max(0, idx - 75), to = Math.min(source.length, idx + needle.length + 110);
      const context = source.slice(from, to);
      if (!exclusions.some(x => context.toLowerCase().includes(String(x).toLowerCase()))) {
        MONEY_RE.lastIndex = 0;
        const candidates = [];
        let m;
        while ((m = MONEY_RE.exec(context))) {
          const amount = normalizeMoney(m[1] || m[2]);
          const absolute = from + m.index;
          const termEnd = idx + needle.length;
          const distance = absolute >= idx ? Math.abs(absolute - termEnd) : 100 + Math.abs(absolute - idx);
          if (amount !== null) candidates.push({amount, distance});
        }
        candidates.sort((a, b) => a.distance - b.distance);
        if (candidates[0]) return candidates[0].amount;
      }
      startAt = idx + needle.length;
    }
  }
  return null;
}

export function numberNearLabel(text, terms = []) {
  const source = String(text || "");
  for (const term of terms) {
    const re = new RegExp(`${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[:\\-]?\\s*(?:€|EUR(?:O)?S?)?\\s*([0-9]{2,5}(?:[.,][0-9]{1,3})?)`, "i");
    const m = source.match(re);
    if (m) { const n = normalizeMoney(m[1]); if (n !== null) return n; }
  }
  return null;
}

export function firstMonthlyRent(text = "") {
  const chunks = String(text).split(/\n|\r|\|/).map(cleanText).filter(Boolean).slice(0, 500);
  const scored = [];
  chunks.forEach((line, index) => {
    MONEY_RE.lastIndex = 0;
    let m;
    while ((m = MONEY_RE.exec(line))) {
      const amount = normalizeMoney(m[1] || m[2]);
      if (amount === null || amount < 150 || amount > 15000) continue;
      const l = line.toLowerCase();
      let score = 0;
      if (/month|mese|mensil|monthly|al mese|\/mese|pcm/.test(l)) score += 6;
      if (/rent|affitto|canone|price|prezzo|camera|stanza|studio|apartment|appartamento/.test(l)) score += 4;
      if (/deposit|cauzion|agency|commission|fee|spese|utilities|utenze|bills|service fee/.test(l)) score -= 5;
      score += Math.max(0, 2 - index / 100);
      scored.push({amount, score, index});
    }
  });
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored[0]?.amount ?? null;
}

export function resolveUrl(candidate, base) {
  if (!candidate) return "";
  try {
    const u = new URL(candidate, base);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : "";
  } catch (_) {
    return "";
  }
}

function arrayify(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.flatMap(arrayify);
  if (typeof v === "object") return arrayify(v.url || v.contentUrl || v.thumbnailUrl || "");
  return [String(v)];
}

export function collectImages({html, node, meta, url}) {
  const candidates = [
    ...arrayify(node?.image),
    meta.get("og:image"), meta.get("og:image:url"), meta.get("twitter:image"),
  ].filter(Boolean);
  const markdownImages = [...String(html).matchAll(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/gi)].map(m => m[1]);
  candidates.push(...markdownImages);
  const imgTags = String(html).match(/<img\b[^>]*>/gi) || [];
  for (const tag of imgTags.slice(0, 120)) {
    const a = attrs(tag);
    const src = a["data-src"] || a["data-lazy-src"] || a.src || "";
    if (src) candidates.push(src);
  }
  const out = [];
  for (const c of candidates) {
    const resolved = resolveUrl(c, url);
    if (!resolved) continue;
    if (/logo|sprite|icon|avatar|tracking|pixel|favicon/i.test(resolved)) continue;
    if (!out.includes(resolved)) out.push(resolved);
    if (out.length >= 12) break;
  }
  return out;
}

function addressFromNode(node) {
  const a = node?.address;
  if (!a) return "";
  if (typeof a === "string") return cleanText(a);
  if (typeof a === "object") return cleanText([a.streetAddress, a.postalCode, a.addressLocality, a.addressRegion, a.addressCountry?.name || a.addressCountry].filter(Boolean).join(", "));
  return "";
}

function offerFromNode(node) {
  const offers = Array.isArray(node?.offers) ? node.offers[0] : node?.offers;
  return offers && typeof offers === "object" ? offers : null;
}

export function inferType(text = "") {
  const s = String(text).toLowerCase();
  if (/shared room|twin room|posto letto|camera doppia/.test(s)) return "shared";
  if (/private room|single room|camera singola|stanza singola|room for rent|affitto stanza/.test(s)) return "room";
  if (/studio apartment|monolocale|studio flat|studio for rent/.test(s)) return "studio";
  if (/coliving|co-living/.test(s)) return "coliving";
  if (/apartment|appartamento|bilocale|trilocale|flat|loft/.test(s)) return "apartment";
  return "other";
}

export function baseExtract(html, url) {
  const meta = metaMap(html);
  const jsonLd = extractJsonLd(html);
  const node = choosePropertyNode(jsonLd);
  const offer = offerFromNode(node);
  const visible = stripHtml(html);
  const titleTag = String(html).match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "";
  const h1Tag = String(html).match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "";
  const markdownTitle = String(html).split(/\r?\n/).map(x=>x.trim()).find(x=>/^#{1,3}\s+/.test(x))?.replace(/^#{1,3}\s+/, "") || "";
  const title = cleanText(node?.name || meta.get("og:title") || meta.get("twitter:title") || titleTag || h1Tag || markdownTitle);
  const paragraphFallback = (String(html).match(/<p\b[^>]*>([\s\S]*?)<\/p>/gi) || []).map(x=>cleanText(x.replace(/<[^>]+>/g," "))).filter(x=>x.length>=80&&x.length<=1800).sort((a,b)=>b.length-a.length)[0] || "";
  const description = cleanText(node?.description || meta.get("og:description") || meta.get("description") || paragraphFallback).slice(0, 1800);
  const canonicalTag = String(html).match(/<link\b[^>]*rel\s*=\s*(?:"canonical"|'canonical'|canonical)[^>]*>/i)?.[0] || "";
  const canonical = resolveUrl(attrs(canonicalTag).href || meta.get("og:url") || url, url) || url;
  const structuredRent = normalizeMoney(offer?.price ?? node?.price);
  const floorSize = normalizeMoney(node?.floorSize?.value ?? node?.floorSize);
  const rooms = normalizeMoney(node?.numberOfRooms ?? node?.numberOfBedrooms ?? node?.numberOfRoomsTotal);
  const images = collectImages({html, node, meta, url});
  const fieldOrigins = {};
  if (title) fieldOrigins.title = node?.name ? "structured" : "meta";
  if (description) fieldOrigins.description = node?.description ? "structured" : "meta";
  if (structuredRent !== null) fieldOrigins.rent = "structured";
  const address = addressFromNode(node);
  if (address) fieldOrigins.address = "structured";
  if (floorSize !== null) fieldOrigins.size = "structured";
  if (rooms !== null) fieldOrigins.rooms = "structured";
  if (images.length) fieldOrigins.images = node?.image ? "structured" : "meta";

  return {
    meta, jsonLd, node, visible, fieldOrigins,
    property: {
      canonicalUrl: canonical,
      title,
      description,
      rent: structuredRent,
      address,
      size: floorSize,
      rooms,
      images,
      image: images[0] || "",
      type: inferType(`${typeText(node)} ${title} ${description} ${visible.slice(0, 1500)}`),
      available: "",
      furnished: "unknown",
      contract: "unknown",
      bills: null,
      billsStatus: "unknown",
      deposit: null,
      agencyFee: null,
      bedrooms: null,
      bathrooms: null,
      floor: "",
      elevator: "unknown",
      balcony: "unknown",
      airConditioning: "unknown",
      minimumStay: "",
      landlordName: cleanText(node?.seller?.name || node?.provider?.name || offer?.seller?.name || "")
    }
  };
}

export function applyTextHeuristics(base, options = {}) {
  const {property: p, visible, fieldOrigins} = base;
  const text = visible;
  const lower = text.toLowerCase();
  const set = (key, value, origin = "text") => {
    if (typeof value === "number" && !Number.isFinite(value)) return;
    if ((p[key] === null || p[key] === "" || p[key] === "unknown" || p[key] === undefined) && value !== null && value !== "" && value !== undefined) {
      p[key] = value; fieldOrigins[key] = origin;
    }
  };

  set("rent", firstMonthlyRent(text) ?? numberNearLabel(text,["canone","rent","monthly rent","affitto","prezzo"]));
  const noDeposit = /no deposit|senza cauzione|nessuna cauzione|deposit not required/.test(lower);
  set("deposit", noDeposit ? 0 : moneyNear(text, ["security deposit", "deposito cauzionale", "deposit", "cauzione"]), "text");
  const noAgency = /no agency fee|senza commissioni|nessuna commissione|senza agenzia/.test(lower);
  set("agencyFee", noAgency ? 0 : moneyNear(text, ["agency fee", "commissione di agenzia", "provvigione", "commission", "service fee"]), "text");
  const billsIncluded = /bills included|utilities included|utenze incluse|spese incluse|tutte le spese incluse/.test(lower);
  const billsPartial = /some utilities included|alcune utenze incluse|partially included/.test(lower);
  const billsExtra = /bills excluded|utilities excluded|utenze escluse|utenze a parte|spese escluse|spese a parte/.test(lower);
  if (billsIncluded) { p.bills = 0; p.billsStatus = "included"; fieldOrigins.bills = fieldOrigins.billsStatus = "text"; }
  else {
    set("bills", moneyNear(text, ["spese condominiali", "spese mensili", "monthly charges", "monthly expenses", "utilities", "utenze", "bills", "charges"], ["agency fee", "spese di agenzia"]));
    if (billsPartial) p.billsStatus = "partial";
    else if (billsExtra || p.bills !== null) p.billsStatus = "extra";
    if (p.billsStatus !== "unknown") fieldOrigins.billsStatus = "text";
  }

  const size = text.match(/\b(\d{1,3}(?:[.,]\d+)?)\s*(?:m²|m2|mq|m\^2)/i);
  set("size", size ? normalizeMoney(size[1]) : null);
  const bedroomsLabel = text.match(/(?:bedrooms?|camere da letto|camera da letto)\s*[:\-]?\s*(\d{1,2})/i);
  const bedroomsBefore = text.match(/\b(\d{1,2})[ \t]+(?:bedrooms?|camere da letto|camera da letto)\b/i);
  set("bedrooms", Number((bedroomsLabel||bedroomsBefore)?.[1] ?? NaN));
  const roomsLabel = text.match(/(?:rooms?|locale|locali)\s*[:\-]?\s*(\d{1,2})/i);
  const roomsBefore = text.match(/\b(\d{1,2})[ \t]+(?:rooms?|locale|locali|camere)\b/i);
  set("rooms", Number((roomsLabel||roomsBefore)?.[1] ?? NaN));
  const bathroomsLabel = text.match(/(?:bathrooms?|bagni|bagno)\s*[:\-]?\s*(\d{1,2})/i);
  const bathroomsBefore = text.match(/\b(\d{1,2})[ \t]+(?:bathrooms?|bagni|bagno)\b/i);
  set("bathrooms", Number((bathroomsLabel||bathroomsBefore)?.[1] ?? NaN));
  const floor = text.match(/(?:floor|piano)\s*[:\-]?\s*([0-9A-Za-zÀ-ÿº°-]{1,16})/i);
  set("floor", floor ? cleanText(floor[1]) : "");

  if (/unfurnished|non arredat|non ammobiliat/.test(lower)) set("furnished", "no");
  else if (/partly furnished|parzialmente arredat/.test(lower)) set("furnished", "partial");
  else if (/furnished|arredat|ammobiliat/.test(lower)) set("furnished", "yes");
  if (/contratto|rental contract|lease agreement|tenancy agreement/.test(lower)) set("contract", "yes");
  if (/\belevator\b|\blift\b|ascensore/.test(lower)) set("elevator", /no elevator|without elevator|senza ascensore|ascensore\s*[:\-]?\s*(?:no|assente)/.test(lower) ? "no" : "yes");
  if (/balcon|terraz/.test(lower)) set("balcony", /senza balcon|no balcony|without balcony|balcone\s*[:\-]?\s*no|terrazzo\s*[:\-]?\s*no/.test(lower) ? "no" : "yes");
  if (/air conditioning|a\/c|aria condizionata|climatizzat/.test(lower)) set("airConditioning", /no air conditioning|senza aria condizionata|aria condizionata\s*[:\-]?\s*no/.test(lower) ? "no" : "yes");

  const minStay = text.match(/(?:minimum stay|min(?:imum)? rental period|permanenza minima|durata minima)\s*[:\-]?\s*([^.;\n]{1,60})/i);
  const minMonths = text.match(/(?:minimo mesi prenotabili|mensilità minime prenotabili|minimum months rental)\s*[:\-]?\s*(\d{1,2})/i);
  set("minimumStay", minStay ? cleanText(minStay[1]) : minMonths ? `${minMonths[1]} months` : "");
  const available = text.match(/(?:available from|availability|disponibile dal|disponibilità|libero dal)\s*[:\-]?\s*([^.;\n]{1,70})/i);
  set("available", available ? cleanText(available[1]) : "");

  if (options.addressPatterns && !p.address) {
    for (const re of options.addressPatterns) {
      const m = text.match(re); if (m?.[1]) { set("address", cleanText(m[1]), "provider"); break; }
    }
  }
  if (options.landlordPatterns && !p.landlordName) {
    for (const re of options.landlordPatterns) {
      const m = text.match(re); if (m?.[1]) { set("landlordName", cleanText(m[1]), "provider"); break; }
    }
  }
  return base;
}

export function confidenceFromOrigins(property, origins = {}) {
  const keys = ["title","rent","bills","billsStatus","deposit","agencyFee","type","address","size","rooms","bedrooms","bathrooms","floor","available","furnished","contract","elevator","balcony","airConditioning","minimumStay","landlordName","description"];
  const out = {};
  for (const key of keys) {
    const value = property[key];
    const known = value !== null && value !== undefined && value !== "" && value !== "unknown";
    if (!known) out[key] = "low";
    else if (["structured","provider"].includes(origins[key])) out[key] = "high";
    else if (["meta","text"].includes(origins[key])) out[key] = "medium";
    else out[key] = "medium";
  }
  if (property.images?.length) out.images = origins.images === "structured" ? "high" : "medium";
  else out.images = "low";
  return out;
}

export function finalize(base, {provider, providerId, url, fetchMode}) {
  const p = base.property;
  if (p.rent !== null && p.bills !== null && p.rent === p.bills && p.billsStatus !== "included") p.bills = null;
  const canonical = p.canonicalUrl || url;
  const result = {
    provider,
    providerId,
    originalUrl: url,
    canonicalUrl: canonical,
    fetchMode,
    extractedAt: new Date().toISOString(),
    property: p,
    confidence: confidenceFromOrigins(p, base.fieldOrigins),
    warnings: []
  };
  if (p.rent === null) result.warnings.push("Monthly rent was not confidently identified.");
  if (!p.address) result.warnings.push("Exact address was not exposed by the listing.");
  if (p.deposit === null) result.warnings.push("Deposit was not clearly stated.");
  if (p.billsStatus === "unknown") result.warnings.push("Bills/utilities were not clearly stated.");
  if (!p.images?.length) result.warnings.push("No usable listing images were exposed.");
  return result;
}
