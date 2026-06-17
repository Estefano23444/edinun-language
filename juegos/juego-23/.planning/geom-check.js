// geom-check.js — QA geométrica del juego-23. Mide las cajas de las zonas
// clave en coordenadas LÓGICAS (lienzo 900×540, descontando el scale del stage)
// y detecta: (a) solapes entre zona-central y el riel/personaje/enunciado,
// (b) overflow fuera del lienzo. Recorre las 3 rondas en 3 viewports.
//   node .planning/geom-check.js
const path = require("path");
const { chromium } = require(path.resolve(__dirname, "../../../node_modules/playwright"));
const FILE = "file://" + path.resolve(__dirname, "../index.html").replace(/\\/g, "/");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const VIEWPORTS = [
  { w: 1920, h: 1080 }, { w: 1280, h: 800 }, { w: 1024, h: 768 },
];

// Mide cajas lógicas de los [data-qa] presentes.
async function measure(page) {
  return await page.evaluate(() => {
    // Buscar el lienzo 900×540.
    let stage = null;
    const all = document.querySelectorAll("div");
    for (const el of all) {
      if (el.offsetWidth === 900 && el.offsetHeight === 540) { stage = el; break; }
    }
    if (!stage) return { error: "no-stage" };
    const sr = stage.getBoundingClientRect();
    const scale = sr.width / 900;
    const toLogical = (r) => ({
      x1: (r.left - sr.left) / scale, y1: (r.top - sr.top) / scale,
      x2: (r.right - sr.left) / scale, y2: (r.bottom - sr.top) / scale,
    });
    const out = {};
    for (const qa of ["personaje", "bocadillo", "acciones", "zona-central", "hud", "bandeja"]) {
      const el = document.querySelector(`[data-qa="${qa}"]`);
      if (el) out[qa] = toLogical(el.getBoundingClientRect());
    }
    // enunciado: el div blanco centrado superior (no tiene data-qa).
    return out;
  });
}

function overlap(a, b) {
  if (!a || !b) return 0;
  const ix = Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1));
  const iy = Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));
  return Math.round(ix) * 1 > 0 && Math.round(iy) > 0 ? { ox: Math.round(ix), oy: Math.round(iy) } : 0;
}
function outOfBounds(box) {
  const v = [];
  if (box.x1 < -1) v.push(`x1=${box.x1.toFixed(0)}`);
  if (box.y1 < -1) v.push(`y1=${box.y1.toFixed(0)}`);
  if (box.x2 > 901) v.push(`x2=${box.x2.toFixed(0)}`);
  if (box.y2 > 541) v.push(`y2=${box.y2.toFixed(0)}`);
  return v;
}

async function driveToRound(page, round) {
  // round 0 = R1 dial (ya está al entrar). 1 = R2 chat. 2 = R3 reparador.
  await page.click('button:has-text("VAMOS")');
  await sleep(900);
  if (round === 0) return;
  // Completar R1 (6 mensajes)
  for (let i = 0; i < 6; i++) {
    const b = await page.$$('[data-qa="zona-central"] button');
    if (b.length) await b[i % b.length].click().catch(() => {});
    await sleep(1500);
  }
  await sleep(1700);
  if (round === 1) return;
  // Completar R2 (3 turnos)
  for (let i = 0; i < 3; i++) {
    const o = await page.$$('[data-qa="zona-central"] button');
    if (o.length) await o[0].click().catch(() => {});
    await sleep(1600);
  }
  await sleep(1800);
}

(async () => {
  const browser = await chromium.launch();
  const problems = [];
  for (const vp of VIEWPORTS) {
    for (let round = 0; round < 3; round++) {
      const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
      await page.goto(FILE, { waitUntil: "networkidle" });
      await sleep(900);
      await page.fill(".ed-input", "Ana");
      await page.click('button:has-text("ENTRAR")');
      await sleep(600);
      await driveToRound(page, round);
      await sleep(300);
      const m = await measure(page);
      const tag = `${vp.w}x${vp.h} R${round + 1}`;
      if (m.error) { problems.push(`${tag}: ${m.error}`); await page.close(); continue; }
      // Solapes que importan
      const checks = [
        ["zona-central", "acciones"],
        ["zona-central", "personaje"],
        ["zona-central", "bocadillo"],
        ["zona-central", "hud"],
      ];
      for (const [a, b] of checks) {
        const o = overlap(m[a], m[b]);
        if (o) problems.push(`${tag}: SOLAPE ${a}∩${b} = ${o.ox}×${o.oy}px`);
      }
      // Overflow del lienzo
      for (const qa of Object.keys(m)) {
        const ob = outOfBounds(m[qa]);
        if (ob.length) problems.push(`${tag}: OVERFLOW ${qa} → ${ob.join(", ")}`);
      }
      await page.close();
    }
  }
  console.log("=== GEOM CHECK ===");
  console.log("Problemas (" + problems.length + "):");
  problems.forEach((p) => console.log("  " + p));
  if (problems.length === 0) console.log("  ✓ sin solapes ni overflow en los 3 viewports × 3 rondas");
  await browser.close();
})();
