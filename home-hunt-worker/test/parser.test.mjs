import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
import {parseIdealista} from "../src/providers/idealista.js";
import {parseImmobiliare} from "../src/providers/immobiliare.js";
import {parseHousingAnywhere} from "../src/providers/housinganywhere.js";
import {parseSpotahome} from "../src/providers/spotahome.js";
const here=dirname(fileURLToPath(import.meta.url));
const fixture=name=>readFile(join(here,"fixtures",name),"utf8");

test("Idealista structured + nearby money fields", async()=>{
  const r=parseIdealista(await fixture("idealista.html"),"https://www.idealista.it/immobile/123/");
  assert.equal(r.property.rent,690);
  assert.equal(r.property.bills,80);
  assert.equal(r.property.deposit,1380);
  assert.equal(r.property.agencyFee,0);
  assert.equal(r.property.furnished,"yes");
  assert.equal(r.property.address,"Via Pacini 20, Milano");
  assert.ok(r.property.images.length>=1);
});

test("Immobiliare parses studio costs and amenities", async()=>{
  const r=parseImmobiliare(await fixture("immobiliare.html"),"https://www.immobiliare.it/annunci/123/");
  assert.equal(r.property.rent,980);
  assert.equal(r.property.bills,120);
  assert.equal(r.property.deposit,1960);
  assert.equal(r.property.size,35);
  assert.equal(r.property.bathrooms,1);
  assert.equal(r.property.elevator,"yes");
  assert.equal(r.property.airConditioning,"yes");
});

test("HousingAnywhere understands included bills", async()=>{
  const r=parseHousingAnywhere(await fixture("housinganywhere.html"),"https://housinganywhere.com/room/abc");
  assert.equal(r.property.rent,750);
  assert.equal(r.property.bills,0);
  assert.equal(r.property.billsStatus,"included");
  assert.equal(r.property.deposit,750);
  assert.equal(r.property.agencyFee,250);
  assert.match(r.property.minimumStay,/5 months/i);
});

test("Spotahome parser keeps structured rent and text details", async()=>{
  const r=parseSpotahome(await fixture("spotahome.html"),"https://www.spotahome.com/milan/for-rent:studios/123");
  assert.equal(r.property.rent,1100);
  assert.equal(r.property.deposit,1100);
  assert.equal(r.property.billsStatus,"extra");
  assert.equal(r.property.size,40);
  assert.equal(r.property.balcony,"yes");
});

import worker, {validateListingUrl} from "../src/index.js";

test("URL allowlist blocks non-rental and local targets", ()=>{
  assert.throws(()=>validateListingUrl("https://example.com/listing/1"),/supports/i);
  assert.throws(()=>validateListingUrl("http://idealista.it/immobile/1"),/HTTPS/i);
  assert.throws(()=>validateListingUrl("https://127.0.0.1/"),/supports/i);
  assert.equal(validateListingUrl("https://www.idealista.it/immobile/1/").provider.id,"idealista");
});

test("health and CORS preflight respond without upstream fetch", async()=>{
  const health=await worker.fetch(new Request("https://worker.example/health",{headers:{Origin:"https://kami80.github.io"}}),{});
  assert.equal(health.status,200);
  const payload=await health.json();
  assert.equal(payload.ok,true);
  const preflight=await worker.fetch(new Request("https://worker.example/api/import-home",{method:"OPTIONS",headers:{Origin:"https://kami80.github.io"}}),{});
  assert.equal(preflight.status,204);
  assert.equal(preflight.headers.get("access-control-allow-origin"),"https://kami80.github.io");
});

test("current-style Italian labels parse without a euro symbol", ()=>{
  const html=`<html><body><h1>Camera in affitto in Piazza Carlo Stuparich, 8</h1><p>Disponibile da: 19/08/2026</p><p>Canone: 450</p><p>Minimo mesi prenotabili: 4</p><p>Camera arredata di 17 m² con balcone.</p></body></html>`;
  const r=parseIdealista(html,"https://www.idealista.it/immobile/36480098/");
  assert.equal(r.property.rent,450);
  assert.equal(r.property.size,17);
  assert.equal(r.property.furnished,"yes");
  assert.equal(r.property.balcony,"yes");
});

test("Italian yes/no amenities do not become false positives", ()=>{
  const html=`<html><body><h1>Monolocale via Cadibona, Milano</h1><p>Contratto: Affitto, transitorio</p><p>Piano: Interrato (-1)</p><p>Ascensore: No</p><p>Superficie: 40 m²</p><p>Locali: 1</p><p>Camere da letto: 0</p><p>Bagni: 1</p><p>Arredato: Sì</p><p>Balcone: No</p><p>Terrazzo: No</p><p>€ 900 / mese</p></body></html>`;
  const r=parseImmobiliare(html,"https://www.immobiliare.it/annunci/131718896/");
  assert.equal(r.property.rent,900);
  assert.equal(r.property.elevator,"no");
  assert.equal(r.property.balcony,"no");
  assert.equal(r.property.size,40);
  assert.equal(r.property.bathrooms,1);
});

test("Worker endpoint normalizes an allowed listing end-to-end", async()=>{
  const originalFetch=globalThis.fetch;
  const html=await fixture("idealista.html");
  globalThis.fetch=async()=>new Response(html,{status:200,headers:{"content-type":"text/html; charset=utf-8"}});
  try{
    const req=new Request("https://worker.example/api/import-home",{method:"POST",headers:{Origin:"https://kami80.github.io","content-type":"application/json"},body:JSON.stringify({url:"https://www.idealista.it/immobile/123/"})});
    const res=await worker.fetch(req,{ALLOWED_ORIGINS:"https://kami80.github.io",ENABLE_READER_FALLBACK:"false"});
    assert.equal(res.status,200);
    const data=await res.json();
    assert.equal(data.success,true);
    assert.equal(data.providerId,"idealista");
    assert.equal(data.property.rent,690);
    assert.equal(data.property.deposit,1380);
    assert.equal(data.transport.mode,"direct");
  }finally{globalThis.fetch=originalFetch;}
});
