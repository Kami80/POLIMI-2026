import {applyTextHeuristics, baseExtract, finalize} from "./common.js";
export function parseGeneric(html, url, fetchMode="direct", label="Rental listing", id="generic") {
  const base = applyTextHeuristics(baseExtract(html, url));
  return finalize(base,{provider:label,providerId:id,url,fetchMode});
}
