import {applyTextHeuristics, baseExtract, finalize} from "./common.js";
export function parseSpotahome(html, url, fetchMode="direct") {
  const base = applyTextHeuristics(baseExtract(html, url), {
    addressPatterns: [/(?:address|location|area)\s*[:\-]?\s*([^\n|]{4,120})/i],
    landlordPatterns: [/(?:landlord|property manager|host)\s*[:\-]?\s*([^\n|]{2,100})/i]
  });
  return finalize(base,{provider:"Spotahome",providerId:"spotahome",url,fetchMode});
}
