import {applyTextHeuristics, baseExtract, finalize} from "./common.js";
export function parseImmobiliare(html, url, fetchMode="direct") {
  const base = applyTextHeuristics(baseExtract(html, url), {
    addressPatterns: [/(?:indirizzo|location|zona)\s*[:\-]?\s*([^\n|]{4,120})/i],
    landlordPatterns: [/(?:agenzia|inserzionista|agency)\s*[:\-]?\s*([^\n|]{2,100})/i]
  });
  const p = base.property;
  if (!p.address) { const m=p.title.match(/((?:Via|Viale|Piazza|Corso|Largo|Alzaia|Vicolo)\b[^|]{3,140})/i); if(m){p.address=m[1].trim();base.fieldOrigins.address="provider";} }
  return finalize(base,{provider:"Immobiliare.it",providerId:"immobiliare",url,fetchMode});
}
