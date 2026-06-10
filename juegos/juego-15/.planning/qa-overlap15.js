// qa-overlap15.js — Mide SOLAPES REALES entre contenido y distribución de
// espacio en juego-15. No mide cajas data-qa (la central es ancha y daría
// falsos positivos): mide el arte del personaje, el bocadillo, la action rail
// y CADA carta/botón real de la zona central, y reporta intersecciones reales
// (>6px) + huecos verticales grandes (espacio desperdiciado).

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const URL = "http://localhost:8766/juegos/juego-15/index.html";
const VIEWPORTS = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1280x800",  width: 1280, height: 800 },
  { name: "1024x768",  width: 1024, height: 768 },
  { name: "768x1024",  width: 768,  height: 1024 },
  { name: "667x375",   width: 667,  height: 375 },
];

const MEASURE = `(() => {
  function r(el){ if(!el) return null; const b=el.getBoundingClientRect(); return {x:b.left,y:b.top,w:b.width,h:b.height,right:b.right,bottom:b.bottom}; }
  function inter(a,b){ if(!a||!b) return 0; const x=Math.max(0,Math.min(a.right,b.right)-Math.max(a.x,b.x)); const y=Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)); return Math.min(x,y); }
  const personajeBox = document.querySelector("[data-qa='personaje']");
  const art = personajeBox ? (personajeBox.querySelector("img,svg,canvas") || personajeBox) : null;
  const bocadillo = document.querySelector("[data-qa='bocadillo'] > div");
  const acciones = document.querySelector("[data-qa='acciones']");
  const central = document.querySelector("[data-qa='zona-central']");
  // Contenido real medido en TODO el lienzo (no solo zona-central, que en R2
  // está en la bandeja). Botones, fichas arrastrables, casilleros, y cualquier
  // div con borde grueso (cartel/pregunta/stem). Excluye action rail/hud/personaje.
  const stage = document.querySelector("[data-qa='hud']").offsetParent || document.body;
  const exclude = ["[data-qa='acciones']", "[data-qa='hud']", "[data-qa='personaje']"];
  function excluded(e){ return exclude.some(sel => e.closest(sel)); }
  const content = [];
  stage.querySelectorAll("button, .ed-draggable, [data-dropzone]").forEach(e => {
    if (excluded(e)) return; const x=r(e); if(x&&x.w>20&&x.h>14) content.push({tag:e.tagName==="BUTTON"?"btn":"piece",box:x});
  });
  stage.querySelectorAll("div").forEach(e => {
    if (excluded(e)) return;
    const cs = getComputedStyle(e);
    const bw = parseFloat(cs.borderTopWidth)||0;
    if (bw >= 2.4) { const x=r(e); if(x&&x.w>120&&x.h>28&&x.w<860) content.push({tag:"card",box:x}); }
  });
  const A = { art:r(art), bocadillo:r(bocadillo), acciones:r(acciones), central:r(central) };
  const issues = [];
  const obstacles = [["personaje", A.art], ["bocadillo", A.bocadillo], ["acciones", A.acciones]];
  for (const c of content) {
    for (const [name, ob] of obstacles) {
      const ov = inter(c.box, ob);
      if (ov > 6) issues.push(name + " ↔ " + c.tag + " solapan " + Math.round(ov) + "px");
    }
  }
  // distribución: hueco vertical máximo entre piezas consecutivas de la central
  let gap = null;
  if (content.length >= 2) {
    const ys = content.map(c=>c.box).sort((p,q)=>p.y-q.y);
    let maxGap = 0;
    for (let i=1;i<ys.length;i++){ const g = ys[i].y - ys[i-1].bottom; if (g>maxGap) maxGap=g; }
    gap = Math.round(maxGap);
  }
  return { issues, gap, contentCount: content.length, central: A.central };
})()`;

async function clickIfEnabled(page, sel) {
  const b = page.locator(sel).first();
  if (await b.count() === 0) return false;
  if (await b.isDisabled().catch(() => true)) return false;
  await b.click(); return true;
}

async function run(browser, vp) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const blocked = await page.locator("[role='dialog'][aria-label*='Gira']").count() > 0;
  if (blocked) { await ctx.close(); return { blocked: true }; }
  await page.fill("input.ed-input", "Sofía");
  await page.locator("button:has-text('ENTRAR')").first().click();
  await page.waitForTimeout(350);
  await page.locator("button:has-text('¡VAMOS')").first().click();
  await page.waitForTimeout(650);

  const out = {};
  // R1 (antes de tocar; estado base con 2-3 opciones)
  out.R1 = await page.evaluate(MEASURE);
  // avanzar las 4 casillas
  for (let k=0;k<4;k++){ const o=page.locator("[data-qa='zona-central'] button:not([disabled])").first(); if(await o.count()===0)break; await o.click().catch(()=>{}); await page.waitForTimeout(k===3?900:1250);}
  await page.waitForTimeout(1700);
  // R2
  out.R2_vacio = await page.evaluate(MEASURE);
  for (let k=0;k<3;k++){ const ch=page.locator("[data-qa='zona-central'] .ed-draggable").first(); if(await ch.count()===0)break; await ch.click().catch(()=>{}); await page.waitForTimeout(110); await page.locator("[data-dropzone^='slot']").nth(k).click().catch(()=>{}); await page.waitForTimeout(130);}
  out.R2_lleno = await page.evaluate(MEASURE);
  await clickIfEnabled(page,"button:has-text('VERIFICAR')");
  await page.waitForTimeout(2300);
  // R3
  out.R3 = await page.evaluate(MEASURE);

  await ctx.close();
  return out;
}

(async () => {
  const browser = await chromium.launch();
  const all = {};
  for (const vp of VIEWPORTS) {
    try { all[vp.name] = await run(browser, vp); }
    catch (e) { all[vp.name] = { error: e.message }; }
  }
  await browser.close();
  fs.writeFileSync(path.join(__dirname, "qa-overlap-results.json"), JSON.stringify(all, null, 2), "utf8");

  console.log("\n═══ SOLAPES Y DISTRIBUCIÓN ═══");
  let totalIssues = 0;
  for (const vp of VIEWPORTS) {
    const v = all[vp.name];
    if (!v || v.error) { console.log(`  ${vp.name}: ERROR ${v && v.error}`); continue; }
    if (v.blocked) { console.log(`  ${vp.name}: (portrait bloqueado)`); continue; }
    for (const phase of Object.keys(v)) {
      const p = v[phase];
      const iss = (p.issues || []);
      totalIssues += iss.length;
      const gapTag = p.gap != null && p.gap > 130 ? `  ⚠ hueco ${p.gap}px` : (p.gap != null ? ` (hueco máx ${p.gap}px)` : "");
      const tag = iss.length ? "✖" : "✓";
      console.log(`  ${tag} ${vp.name}/${phase}: ${iss.length} solape(s)${gapTag}${iss.length?(" → "+iss.join("; ")):""}`);
    }
  }
  console.log(`\nTotal solapes reales: ${totalIssues}`);
})();
