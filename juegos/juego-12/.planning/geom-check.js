// geom-check.js — Chequeo geométrico de superposiciones del juego-11 en
// coordenadas LÓGICAS del lienzo 900×540 (descontando el escalado del stage).
// Detecta: elementos fuera del lienzo, solape de elementos interactivos con el
// personaje o el rail de acciones, y bocadillo invadiendo enunciado/zona central.

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const URL = "http://localhost:8765/juegos/juego-11/index.html";
const VIEWPORTS = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1280x800",  width: 1280, height: 800 },
  { name: "1024x768",  width: 1024, height: 768 },
  { name: "768x1024",  width: 768,  height: 1024 },
  { name: "667x375",   width: 667,  height: 375 },
];

const W = 900, H = 540;
const TOL = 1.5; // px lógicos de tolerancia

// Mide cajas lógicas de zonas data-qa + hijos interactivos de la ronda actual.
async function measure(page) {
  return await page.evaluate(({ W, H }) => {
    // Localiza el div lienzo (offsetWidth==900 && offsetHeight==540).
    let stage = null;
    for (const el of document.querySelectorAll("div")) {
      if (el.offsetWidth === W && el.offsetHeight === H) { stage = el; break; }
    }
    if (!stage) return { error: "no-stage" };
    const sr = stage.getBoundingClientRect();
    const sx = sr.width / W, sy = sr.height / H;
    const toLogic = (r) => ({
      x: (r.left - sr.left) / sx,
      y: (r.top - sr.top) / sy,
      r: (r.right - sr.left) / sx,
      b: (r.bottom - sr.top) / sy,
    });
    const boxOf = (el) => toLogic(el.getBoundingClientRect());
    const zone = (q) => {
      const el = stage.querySelector(`[data-qa='${q}']`);
      return el ? boxOf(el) : null;
    };
    // Hijos interactivos de la zona central + bandeja (botones/chips/frascos).
    const interactive = [];
    const central = stage.querySelector("[data-qa='zona-central']");
    const bandeja = stage.querySelector("[data-qa='bandeja']");
    function collect(root, kind) {
      if (!root) return;
      const sel = "button, .ed-draggable, [data-dropzone]";
      for (const el of root.querySelectorAll(sel)) {
        const b = boxOf(el);
        interactive.push({ kind, t: (el.textContent || "").trim().slice(0, 14), ...b });
      }
    }
    collect(central, "central");
    collect(bandeja, "bandeja");
    return {
      hud: zone("hud"), personaje: zone("personaje"), bocadillo: zone("bocadillo"),
      central: zone("zona-central"), bandeja: zone("bandeja"), acciones: zone("acciones"),
      interactive,
    };
  }, { W, H });
}

function overlapArea(a, b) {
  const ox = Math.max(0, Math.min(a.r, b.r) - Math.max(a.x, b.x));
  const oy = Math.max(0, Math.min(a.b, b.b) - Math.max(a.y, b.y));
  return ox * oy;
}

function analyze(vp, round, m, issues) {
  if (!m || m.error) { issues.push(`[${vp}/${round}] sin stage`); return; }
  // Footprint VISUAL del personaje (char ~190 centrado en caja de 220 desde x=8):
  // aprox x 23..213. El rail de acciones es la zona 'acciones'.
  const charVisual = { x: 18, y: m.personaje ? m.personaje.y + 70 : 250, r: 218, b: 540 };
  const rail = m.acciones;
  for (const it of m.interactive || []) {
    // fuera del lienzo
    if (it.x < -TOL || it.y < -TOL || it.r > W + TOL || it.b > H + TOL) {
      issues.push(`[${vp}/${round}] FUERA DE LIENZO "${it.t}" (${it.kind}) x=${it.x.toFixed(0)} y=${it.y.toFixed(0)} r=${it.r.toFixed(0)} b=${it.b.toFixed(0)}`);
    }
    // solape con personaje (visual)
    const opChar = overlapArea(it, charVisual);
    if (opChar > 25) {
      issues.push(`[${vp}/${round}] SOLAPE personaje "${it.t}" (${it.kind}) area=${opChar.toFixed(0)} x=${it.x.toFixed(0)}..${it.r.toFixed(0)} y=${it.y.toFixed(0)}..${it.b.toFixed(0)}`);
    }
    // solape con rail de acciones
    if (rail) {
      const opRail = overlapArea(it, rail);
      if (opRail > 25) {
        issues.push(`[${vp}/${round}] SOLAPE rail "${it.t}" (${it.kind}) area=${opRail.toFixed(0)} x=${it.x.toFixed(0)}..${it.r.toFixed(0)}`);
      }
    }
  }
  // bocadillo invadiendo enunciado (y<~110 zona del enunciado) o saliendo por arriba
  if (m.bocadillo) {
    if (m.bocadillo.y < -TOL) issues.push(`[${vp}/${round}] BOCADILLO fuera por arriba y=${m.bocadillo.y.toFixed(0)}`);
    if (m.central && overlapArea(m.bocadillo, m.central) > 40)
      issues.push(`[${vp}/${round}] BOCADILLO solapa zona-central area=${overlapArea(m.bocadillo, m.central).toFixed(0)}`);
  }
  // zona-central / bandeja fuera del lienzo
  for (const [k, z] of [["central", m.central], ["bandeja", m.bandeja]]) {
    if (z && (z.x < -TOL || z.r > W + TOL || z.y < -TOL || z.b > H + TOL))
      issues.push(`[${vp}/${round}] ${k} fuera de lienzo x=${z.x.toFixed(0)}..${z.r.toFixed(0)} y=${z.y.toFixed(0)}..${z.b.toFixed(0)}`);
  }
}

async function placeAllR2(page) {
  const jars = page.locator("[data-dropzone]");
  const jc = await jars.count();
  for (let i = 0; i < 10; i++) {
    const chips = page.locator("[data-qa='zona-central'] .ed-draggable");
    if (await chips.count() === 0) break;
    const a = await chips.first().boundingBox();
    const b = await jars.nth(i % Math.max(1, jc)).boundingBox();
    if (!a || !b) break;
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 6 });
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 });
    await page.waitForTimeout(30); await page.mouse.up();
    await page.waitForTimeout(90);
  }
}

async function run(browser, vp, issues) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  if (await page.locator("[role='dialog'][aria-label*='Gira']").count() > 0) { await ctx.close(); return; }
  await page.fill("input.ed-input", "Sofía");
  await page.locator("button:has-text('ENTRAR')").first().click();
  await page.waitForTimeout(450);
  await page.locator("button:has-text('¡VAMOS')").first().click();
  await page.waitForTimeout(650);

  // R1: llenar 2 slots para medir bandeja + probeta llenos también
  analyze(vp.name, "R1", await measure(page), issues);
  const tiles = page.locator("[data-qa='bandeja'] button:not([disabled])");
  if (await tiles.count() >= 2) { await tiles.nth(0).click(); await page.waitForTimeout(120); await tiles.nth(0).click(); await page.waitForTimeout(150); }
  analyze(vp.name, "R1-llena", await measure(page), issues);
  const v1 = page.locator("button:has-text('VERIFICAR')").first();
  if (!(await v1.isDisabled())) { await v1.click(); await page.waitForTimeout(2100); }

  // R2
  analyze(vp.name, "R2", await measure(page), issues);
  await placeAllR2(page);
  await page.waitForTimeout(120);
  analyze(vp.name, "R2-llena", await measure(page), issues);
  const v2 = page.locator("button:has-text('VERIFICAR')").first();
  if (!(await v2.isDisabled())) { await v2.click(); await page.waitForTimeout(2100); }

  // R3
  analyze(vp.name, "R3", await measure(page), issues);
  const words = page.locator("[data-qa='zona-central'] button:not([disabled])");
  const wc = await words.count();
  for (let i = 0; i < wc; i++) { await words.nth(i).click(); await page.waitForTimeout(20); }
  analyze(vp.name, "R3-marcada", await measure(page), issues);

  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  const issues = [];
  for (const vp of VIEWPORTS) {
    try { await run(browser, vp, issues); }
    catch (e) { issues.push(`[${vp.name}] EXCEPCIÓN: ${e.message.split("\n")[0]}`); }
  }
  await browser.close();
  console.log("\n═══════ CHEQUEO GEOMÉTRICO juego-11 ═══════");
  if (issues.length === 0) console.log("✓ Sin superposiciones ni desbordes en ninguna ronda/viewport.");
  else { console.log(`✖ ${issues.length} hallazgo(s):`); for (const i of issues) console.log("  · " + i); }
})();
