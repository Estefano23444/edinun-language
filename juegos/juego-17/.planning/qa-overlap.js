// qa-overlap.js — QA de distribución y solapes para "Escritura y noticia".
// Mide las zonas data-qa en coordenadas LÓGICAS del lienzo 900x540 (descuenta
// la escala del DeviceStage) y reporta: desbordes del lienzo, solapes
// zona-central↔acciones, tamaños de touch target. Captura cada ronda.
//
// Uso: con el repo servido en http://localhost:8791
//   node .planning/qa-overlap.js

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = "http://localhost:8791/juegos/juego-17/index.html";
const OUT = path.join(__dirname, "qa-shots");
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "1280x800", width: 1280, height: 800 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "667x375",  width: 667,  height: 375 },
];

// Mide zonas en coords lógicas (0..900, 0..540).
const MEASURE = () => {
  function findStage() {
    const all = [...document.querySelectorAll("div")];
    for (const d of all) {
      const r = d.getBoundingClientRect();
      // El lienzo lógico mide 900x540 escalado; buscamos el div cuyo
      // offsetWidth/Height sean exactamente 900x540.
      if (d.offsetWidth === 900 && d.offsetHeight === 540) return { el: d, rect: r };
    }
    return null;
  }
  const stage = findStage();
  if (!stage) return { error: "no-stage" };
  const sr = stage.rect;
  const scale = sr.width / 900;
  const toLogical = (r) => ({
    x: (r.left - sr.left) / scale,
    y: (r.top - sr.top) / scale,
    w: r.width / scale,
    h: r.height / scale,
  });
  const zones = {};
  for (const qa of ["hud", "hud-temas", "zona-central", "bocadillo", "personaje", "acciones", "bandeja"]) {
    const el = document.querySelector(`[data-qa="${qa}"]`);
    if (el) { const L = toLogical(el.getBoundingClientRect()); zones[qa] = { x: +L.x.toFixed(1), y: +L.y.toFixed(1), w: +L.w.toFixed(1), h: +L.h.toFixed(1) }; }
  }
  // Botones de acción (tamaño touch)
  const actionBtns = [...document.querySelectorAll('[data-qa="acciones"] button')].map((b) => {
    const L = toLogical(b.getBoundingClientRect());
    return { t: b.textContent.trim().slice(0, 10), w: +L.w.toFixed(0), h: +L.h.toFixed(0) };
  });
  // enunciado (primer hijo de zona-central con texto blanco) — su bottom vs el
  // siguiente bloque lo revisamos visualmente; aquí basta la zona-central.
  const enun = (document.body.innerText.match(/Ordena[^\n]*|Atrapa[^\n]*|Adivina[^\n]*|Encuentra[^\n]*|Decide[^\n]*/) || ["?"])[0];
  return { scale: +scale.toFixed(3), zones, actionBtns, enun };
};

function analyze(m, label) {
  const issues = [];
  if (m.error) { issues.push(`${label}: ${m.error}`); return issues; }
  const Z = m.zones;
  const within = (z) => z && z.x >= -2 && z.y >= -2 && (z.x + z.w) <= 902 && (z.y + z.h) <= 542;
  for (const [k, z] of Object.entries(Z)) {
    if (k === "bocadillo") continue; // el bocadillo puede subir; se revisa aparte
    if (!within(z)) issues.push(`${label}: zona "${k}" fuera del lienzo → x${z.x} y${z.y} w${z.w} h${z.h} (right=${(z.x+z.w).toFixed(0)}, bottom=${(z.y+z.h).toFixed(0)})`);
  }
  // Solape REAL zona-central ↔ acciones (riel derecho). Tolerancia 2px.
  if (Z["zona-central"] && Z["acciones"]) {
    const a = Z["zona-central"], b = Z["acciones"];
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (ox > 2 && oy > 2) issues.push(`${label}: zona-central SOLAPA acciones por ${ox.toFixed(0)}x${oy.toFixed(0)}px (zc.right=${(a.x+a.w).toFixed(0)} vs acc.left=${b.x.toFixed(0)})`);
  }
  // bocadillo dentro del lienzo (top no muy negativo)
  if (Z["bocadillo"] && Z["bocadillo"].y < -2) issues.push(`${label}: bocadillo top=${Z["bocadillo"].y} (sube fuera del lienzo)`);
  // touch targets
  for (const b of m.actionBtns || []) {
    if (b.h < 44 || b.w < 44) issues.push(`${label}: botón "${b.t}" pequeño ${b.w}x${b.h} (<44)`);
  }
  return issues;
}

async function tapTrayUntilFilled(page) {
  for (let i = 0; i < 8; i++) {
    const trayCards = page.locator('[data-qa="bandeja"] .ed-draggable');
    const n = await trayCards.count();
    if (n === 0) break;
    await trayCards.first().click({ position: { x: 5, y: 5 } });
    await page.waitForTimeout(120);
  }
}

async function runLevel(browser, vp, temaLabel, levelKey) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.fill("input.ed-input", "Sofía");
  await page.locator(`button:has-text("${temaLabel}")`).first().click();
  await page.waitForTimeout(120);
  await page.locator("button:has-text('ENTRAR')").first().click();
  await page.waitForTimeout(500);
  await page.locator("button:has-text('¡VAMOS')").first().click();
  await page.waitForTimeout(700);

  const report = [];
  const tag = `${levelKey}-${vp.name}`;

  // R1
  let m = await page.evaluate(MEASURE);
  report.push(...analyze(m, `${tag}-R1`));
  await page.screenshot({ path: path.join(OUT, `${tag}-R1.png`) });

  // avanzar R1 (ordenar): llenar + verificar
  await tapTrayUntilFilled(page);
  await page.waitForTimeout(150);
  await page.locator("button:has-text('VERIFICAR')").first().click().catch(() => {});
  await page.waitForTimeout(2200);

  // R2
  m = await page.evaluate(MEASURE);
  report.push(...analyze(m, `${tag}-R2`));
  await page.screenshot({ path: path.join(OUT, `${tag}-R2.png`) });

  if (levelKey === "escritura") {
    // shooter: esperar a que termine (16s) + finish(0.5s) + feedback(1.45s) y avance
    await page.waitForTimeout(20500);
  } else {
    // detective: tocar una frase y verificar
    await page.locator('[data-qa="zona-central"] button').first().click().catch(() => {});
    await page.waitForTimeout(150);
    await page.locator("button:has-text('VERIFICAR')").first().click().catch(() => {});
    await page.waitForTimeout(2200);
  }

  // R3
  m = await page.evaluate(MEASURE);
  report.push(...analyze(m, `${tag}-R3`));
  await page.screenshot({ path: path.join(OUT, `${tag}-R3.png`) });

  await ctx.close();
  return { report, errors };
}

(async () => {
  const browser = await chromium.launch();
  const all = [];
  const allErrors = {};
  for (const vp of VIEWPORTS) {
    for (const [temaLabel, levelKey] of [["Escritura y tecnología", "escritura"], ["La noticia", "noticia"]]) {
      try {
        const { report, errors } = await runLevel(browser, vp, temaLabel, levelKey);
        all.push(...report);
        if (errors.length) allErrors[`${levelKey}-${vp.name}`] = errors;
      } catch (e) {
        all.push(`${levelKey}-${vp.name}: EXCEPCIÓN ${e.message}`);
      }
    }
  }
  await browser.close();
  console.log("\n═══════ QA DISTRIBUCIÓN / SOLAPES ═══════");
  if (all.length === 0) console.log("  ✓ Sin problemas de distribución/solape/desborde en ningún viewport.");
  else all.forEach((x) => console.log("  ✖ " + x));
  console.log("\n─── Errores de consola ───");
  if (Object.keys(allErrors).length === 0) console.log("  ✓ 0 errores de consola.");
  else for (const [k, v] of Object.entries(allErrors)) console.log(`  ✖ ${k}: ${v.join(" | ")}`);
  console.log("\nCapturas en .planning/qa-shots/");
})();
