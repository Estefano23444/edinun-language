// qa-distrib.js — Verifica distribución/superposiciones de juego-12 en las 3
// rondas (R1 shooter, R2 lectura, R3 ruleta). Para cada ronda extrae los boxes
// data-qa y hace check pairwise de overlap (en CSS px). Pares permitidos:
//   - bocadillo ↔ personaje  (la nube cuelga del personaje)
//   - zona-central ↔ bandeja (la bandeja vive dentro de la zona central)

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const URL = "http://localhost:8765/juegos/juego-12/index.html";
const VIEWPORTS = [
  { name: "1280x800", width: 1280, height: 800 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "768x1024", width: 768, height: 1024 },
];
const ALLOWED = new Set([
  "bocadillo|personaje", "personaje|bocadillo",
  "zona-central|bandeja", "bandeja|zona-central",
]);

function intersect(a, b) {
  if (!a || !b) return null;
  const x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  if (x2 <= x1 || y2 <= y1) return null;
  return { w: x2 - x1, h: y2 - y1 };
}

async function getBoxes(page) {
  const labels = ["hud", "bocadillo", "zona-central", "acciones", "bandeja", "personaje"];
  const out = {};
  for (const l of labels) {
    const h = page.locator(`[data-qa="${l}"]`).first();
    out[l] = (await h.count()) ? await h.boundingBox() : null;
  }
  return out;
}

function checkOverlaps(boxes) {
  const labels = Object.keys(boxes);
  const issues = [];
  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) {
      const a = labels[i], b = labels[j];
      if (ALLOWED.has(`${a}|${b}`)) continue;
      const inter = intersect(boxes[a], boxes[b]);
      if (inter && inter.w > 4 && inter.h > 4) {
        issues.push(`${a} ↔ ${b}: ${Math.round(inter.w)}×${Math.round(inter.h)}px`);
      }
    }
  }
  return issues;
}

async function runFlow(browser, vp) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.fill("input.ed-input", "Sofía");
  await page.locator("button:has-text('ENTRAR')").first().click();
  await page.waitForTimeout(400);
  await page.locator("button:has-text('¡VAMOS')").first().click();
  await page.waitForTimeout(600);

  const rounds = {};

  // R1 — shooter
  rounds.R1 = checkOverlaps(await getBoxes(page));
  // avanzar: cazar correctas; la ronda cierra por temporizador (~20s)
  for (let k = 0; k < 140; k++) {
    if (await page.locator("[data-opt]").count() > 0) break;
    const ok = page.locator("[data-qa='zona-central'] button[data-ok='1']").first();
    if (await ok.count() > 0) await ok.click({ force: true, timeout: 400 }).catch(() => {});
    await page.waitForTimeout(120);
  }
  await page.waitForSelector("[data-opt]", { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(300);

  // R2 — lectura
  rounds.R2 = checkOverlaps(await getBoxes(page));
  const opts = page.locator("[data-qa='zona-central'] [data-opt]");
  const n = await opts.count();
  for (let i = 0; i < n; i += 2) { await opts.nth(i).click({ force: true }).catch(() => {}); await page.waitForTimeout(70); }
  await page.locator("button:has-text('VERIFICAR')").first().click().catch(() => {});
  await page.waitForTimeout(2200);

  // R3 — ruleta
  await page.locator("button:has-text('GIRAR')").first().click().catch(() => {});
  await page.waitForTimeout(2700);
  rounds.R3 = checkOverlaps(await getBoxes(page));

  await ctx.close();
  return { rounds, errors };
}

(async () => {
  console.log("QA distribución juego-12");
  const browser = await chromium.launch();
  const all = {};
  let total = 0;
  for (const vp of VIEWPORTS) {
    console.log(`\n──── ${vp.name} ────`);
    try {
      const { rounds, errors } = await runFlow(browser, vp);
      all[vp.name] = { rounds, errors };
      for (const r of ["R1", "R2", "R3"]) {
        const iss = rounds[r] || [];
        total += iss.length;
        console.log(`  ${r}: ${iss.length === 0 ? "✓ sin overlaps" : "✖ " + iss.join(" | ")}`);
      }
      if (errors.length) { console.log(`  errores consola: ${errors.length}`); total += errors.length; }
    } catch (e) {
      console.log(`  ✖ falló: ${e.message}`); total++;
      all[vp.name] = "ERROR: " + e.message;
    }
  }
  await browser.close();
  fs.writeFileSync(path.join(__dirname, "qa-distrib-results.json"), JSON.stringify(all, null, 2), "utf8");
  console.log(`\n${total === 0 ? "✓ TODO LIMPIO — nada superpuesto en R1/R2/R3" : `✖ ${total} issue(s)`}`);
})();
