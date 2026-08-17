import {applyTextHeuristics, baseExtract, finalize} from "./common.js";
export function parseIdealista(html, url, fetchMode="direct") {
  const base = applyTextHeuristics(baseExtract(html, url), {
    addressPatterns: [/(?:ubicazione|indirizzo|location)\s*[:\-]?\s*([^\n|]{4,120})/i],
    landlordPatterns: [/(?:agenzia|agency|professional)\s*[:\-]?\s*([^\n|]{2,100})/i]
  });
  const p = base.property;
  if (!p.address) { const m=p.title.match(/(?:\bin\s+)?((?:Via|Viale|Piazza|Corso|Largo|Alzaia|Vicolo)\b[^|]{3,140})/i); if(m){p.address=m[1].trim();base.fieldOrigins.address="provider";} }
  return finalize(base,{provider:"Idealista",providerId:"idealista",url,fetchMode});
}
