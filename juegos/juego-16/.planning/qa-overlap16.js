// qa-overlap16.js — Auditoría de solapes/espacios del juego-16.
// Recorre los 3 niveles × 3 rondas a 900×540 (escala 1:1 = coords lógicas),
// saca screenshot de cada ronda y mide bounding boxes para detectar:
//   · contenido que se mete bajo la barra de acciones (rail derecho)
//   · contenido que toca el bocadillo del personaje
//   · cualquier elemento fuera del lienzo 900×540
// Uso: node .planning/qa-overlap16.js   (server en localhost:8123)

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const URL = "http://localhost:8123/juegos/juego-16/index.html";
const OUT = path.join(__dirname, "qa-shots");
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MEASURE = () => {
  const lien = document.querySelector('[data-qa="zona-central"]');
  const railEl = document.querySelector('[data-qa="acciones"]');
  const bocEl = document.querySelector('[data-qa="bocadillo"]');
  const charEl = document.querySelector('[data-qa="personaje"]');
  // El lienzo lógico es el div escalado; a 900x540 viewport scale=1, así que
  // getBoundingClientRect ya está en coords lógicas relativas al viewport.
  const R = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.left, y: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height }; };
  // Contenido a evaluar: botones de la mecánica + dropzones + burbujas shooter
  const scope = lien || document.body;
  const set = new Set();
  scope.querySelectorAll('button, [data-dropzone]').forEach((e) => set.add(e));
  const content = [...set].map((e) => ({ t: (e.textContent || "").trim().slice(0, 24), rect: R(e) })).filter((c) => c.rect && c.rect.w > 0);
  return { rail: R(railEl), boc: R(bocEl), char: R(charEl), content };
};

function intersect(a, b, pad = 2) {
  if (!a || !b) return false;
  return a.x < b.r - pad && a.r > b.x + pad && a.y < b.b - pad && a.b > b.y + pad;
}
function outOfCanvas(r) {
  return r.x < -1 || r.y < -1 || r.r > 901 || r.b > 541;
}

async function clickText(page, txt, opts = {}) {
  const el = page.locator(`button:has-text("${txt}")`).first();
  await el.click({ timeout: 3000, force: opts.force });
}
async function evalClick(page, txt) {
  await page.evaluate((t) => {
    const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === t || x.textContent.includes(t));
    if (b) b.click();
  }, txt);
}

async function audit(page, label, issues) {
  await sleep(350);
  await page.screenshot({ path: path.join(OUT, label + ".png") });
  const m = await page.evaluate(MEASURE);
  const found = [];
  for (const c of m.content) {
    if (m.rail && intersect(c.rect, m.rail)) found.push(`"${c.t}" SOLAPA barra de acciones`);
    if (m.boc && intersect(c.rect, m.boc)) found.push(`"${c.t}" SOLAPA bocadillo`);
    if (outOfCanvas(c.rect)) found.push(`"${c.t}" FUERA del lienzo (${Math.round(c.rect.x)},${Math.round(c.rect.y)}→${Math.round(c.rect.r)},${Math.round(c.rect.b)})`);
  }
  if (found.length) issues.push({ ronda: label, problemas: found });
  console.log(`  ${found.length ? "⚠️ " : "✅ "}${label}${found.length ? " — " + found.join(" · ") : ""}`);
}

async function startLevel(page, btnText) {
  await page.goto(URL, { waitUntil: "networkidle" });
  await sleep(300);
  await evalClick(page, btnText);
  await page.locator("input.ed-input").fill("Ana");
  await page.locator("input.ed-input").press("Enter");
  await sleep(300);
  await evalClick(page, "VAMOS");
  await sleep(500);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 540 } });
  const issues = [];

  // ───────── NIVEL RELATOS ─────────
  console.log("NIVEL RELATOS");
  await startLevel(page, "Sabiduría escrita");
  await audit(page, "relatos-r1", issues);
  await evalClick(page, "VERDADERO"); await sleep(150); await clickText(page, "VERIFICAR"); await sleep(3200);
  await audit(page, "relatos-r2", issues);
  // tap 3 primeras piezas (llenan las 3 ranuras) y verificar
  await page.evaluate(() => {
    const fire = (el, t) => el.dispatchEvent(new PointerEvent(t, { bubbles: true, button: 0, clientX: 1, clientY: 1 }));
    const tray = document.querySelector('[data-qa="bandeja"]');
    if (!tray) return;
    const pcs = [...tray.querySelectorAll("div")].filter((d) => d.className.includes("ed-draggable")).slice(0, 3);
    pcs.forEach((d) => { fire(d, "pointerdown"); fire(d, "pointerup"); });
  });
  await sleep(400); await clickText(page, "VERIFICAR", { force: true }).catch(() => {}); await sleep(3200);
  await audit(page, "relatos-r3", issues);
  await browser.close().catch(() => {});

  // Re-open por nivel para flujo limpio
  const b2 = await chromium.launch();
  const p2 = await b2.newPage({ viewport: { width: 900, height: 540 } });

  // ───────── NIVEL HERRAMIENTAS ─────────
  console.log("NIVEL HERRAMIENTAS");
  await startLevel(p2, "Herramientas del escritor");
  await audit(p2, "herramientas-r1", issues);
  // marcar las interjecciones y pulsar VERIFICAR para avanzar
  await p2.evaluate(() => {
    const INT = ["Ay","Uf","Huy","Bah","Epa","Ojalá","Caramba","Achachay","Ananay","Guácala","Ayayay","Arrarray"];
    [...document.querySelectorAll('[data-qa="zona-central"] button')].forEach((b) => { if (INT.includes(b.textContent.trim())) b.click(); });
  });
  await sleep(150); await clickText(p2, "VERIFICAR").catch(()=>{}); await sleep(3200);
  await audit(p2, "herramientas-r2", issues);
  await p2.evaluate(() => { const g=[...document.querySelectorAll("button")].find((x)=>x.textContent.includes("GIRAR")); if(g) g.click(); });
  await sleep(2200);
  await audit(p2, "herramientas-r2-spun", issues);
  await p2.evaluate(() => { const o=document.querySelector('[data-qa="zona-central"]').querySelectorAll("button"); for(const x of o){ if(!/GIRAR|GIRANDO/.test(x.textContent)){ x.click(); break; } } });
  await sleep(150); await clickText(p2, "VERIFICAR").catch(()=>{}); await sleep(3200);
  await audit(p2, "herramientas-r3", issues);
  await b2.close().catch(()=>{});

  const b3 = await chromium.launch();
  const p3 = await b3.newPage({ viewport: { width: 900, height: 540 } });

  // ───────── NIVEL DETECTIVES ─────────
  console.log("NIVEL DETECTIVES");
  await startLevel(p3, "Detectives de la palabra");
  await audit(p3, "detectives-r1", issues);
  await p3.evaluate(() => { const o=document.querySelector('[data-qa="zona-central"]').querySelectorAll("button"); if(o[0]) o[0].click(); });
  await sleep(150); await clickText(p3, "VERIFICAR").catch(()=>{}); await sleep(3200);
  await audit(p3, "detectives-r2", issues);
  // clasificar: tap ficha (pointer) + click bin, x3
  await p3.evaluate(async () => {
    const fire = (el, t) => el.dispatchEvent(new PointerEvent(t, { bubbles: true, button: 0, clientX: 1, clientY: 1 }));
    const bins = [...document.querySelectorAll('[data-dropzone]')].filter((d) => ["detective","victimario","pista"].includes(d.dataset.dropzone));
    for (let i = 0; i < 3; i++) {
      const tray = document.querySelector('[data-qa="bandeja"]');
      const ficha = [...tray.querySelectorAll("div")].find((d) => d.className.includes("ed-draggable"));
      if (!ficha) break;
      fire(ficha, "pointerdown"); fire(ficha, "pointerup");
      await new Promise((r)=>setTimeout(r,80));
      bins[i].click();
      await new Promise((r)=>setTimeout(r,80));
    }
  });
  await sleep(400); await clickText(p3, "VERIFICAR", { force: true }).catch(()=>{}); await sleep(3200);
  await audit(p3, "detectives-r3", issues);
  await b3.close().catch(()=>{});

  console.log("\n=== RESUMEN ===");
  console.log(issues.length ? JSON.stringify(issues, null, 2) : "Sin solapes ni desbordes detectados en las 9 rondas.");
  fs.writeFileSync(path.join(OUT, "issues.json"), JSON.stringify(issues, null, 2));
})();
