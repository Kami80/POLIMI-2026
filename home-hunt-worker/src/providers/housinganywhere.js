import {applyTextHeuristics, baseExtract, finalize} from "./common.js";
export function parseHousingAnywhere(html, url, fetchMode="direct") {
  const base = applyTextHeuristics(baseExtract(html, url), {
    addressPatterns: [/(?:address|location|neighbourhood|neighborhood)\s*[:\-]?\s*([^\n|]{4,120})/i],
    landlordPatterns: [/(?:landlord|advertiser|host)\s*[:\-]?\s*([^\n|]{2,100})/i]
  });
  return finalize(base,{provider:"HousingAnywhere",providerId:"housinganywhere",url,fetchMode});
}
