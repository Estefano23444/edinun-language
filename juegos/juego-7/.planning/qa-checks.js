// qa-checks.js — QA visual del juego-7 con Playwright.
// Asume que el repo está sirviéndose en http://localhost:8765
// Captura el flujo Home → Personaje → Game (R1, R2, R3 de N1) en 6 viewports.

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const URL = "http://localhost:8765/juegos/juego-7/index.html";
const OUT_DIR = path.join(__dirname, "qa-screenshots");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const VIEWPORTS = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1280x800",  width: 1280, height: 800 },
  { name: "1024x768",  width: 1024, height: 768 },
  { name: "768x1024",  width: 768,  height: 1024 },
  { name: "667x375",   width: 667,  height: 375 },
  { name: "375x667",   width: 375,  height: 667 },
];

async function shoot(page, label) {
  const file = path.join(OUT_DIR, `${label}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  📸 ${label}`);
}

async function runFlow(browser, vp) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });

  console.log(`\n──── Viewport ${vp.name} ────`);
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);

  // 1. Home
  await shoot(page, `${vp.name}-01-home`);
  // Seleccionar Tema 1 "La reseña"
  await page.locator("button:has-text('La reseña')").first().click();
  await page.waitForTimeout(200);
  // Escribir nombre
  await page.fill("input.ed-input", "Sofía");
  await page.waitForTimeout(120);
  await shoot(page, `${vp.name}-02-home-listo`);
  await page.locator("button:has-text('ENTRAR')").first().click();
  await page.waitForTimeout(500);

  // 2. CharacterScreen
  await shoot(page, `${vp.name}-03-character`);
  await page.locator("button:has-text('¡VAMOS')").first().click();
  await page.waitForTimeout(700);

  // 3. Game N1R1 — Ficha del libro
  await shoot(page, `${vp.name}-04-N1R1-ficha`);
  // Skip al next round
  await page.evaluate(() => { if (window.__qa_skip) window.__qa_skip(); });
  await page.waitForTimeout(400);

  // 4. Game N1R2 — Partes de la reseña
  await shoot(page, `${vp.name}-05-N1R2-partes`);
  await page.evaluate(() => { if (window.__qa_skip) window.__qa_skip(); });
  await page.waitForTimeout(400);

  // 5. Game N1R3 — Ordena el cuento
  await shoot(page, `${vp.name}-06-N1R3-ordena`);
  await page.waitForTimeout(200);

  // Ir a Home y luego a N2
  await page.evaluate(() => {
    // Salir directo de modo destructivo
    const setApp = window.__set_app;
  });
  await ctx.close();
  return errors;
}

async function runFlowN2(browser, vp) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });

  console.log(`\n──── Viewport ${vp.name} (N2) ────`);
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);

  // Seleccionar Tema 2 "Aprendiendo a escribir"
  await page.locator("button:has-text('Aprendiendo a escribir')").first().click();
  await page.waitForTimeout(200);
  await page.fill("input.ed-input", "Diego");
  await page.waitForTimeout(120);
  await page.locator("button:has-text('ENTRAR')").first().click();
  await page.waitForTimeout(500);
  await page.locator("button:has-text('¡VAMOS')").first().click();
  await page.waitForTimeout(700);

  // N2R1 — Pronombre detective
  await shoot(page, `${vp.name}-07-N2R1-pronombre`);
  await page.evaluate(() => { if (window.__qa_skip) window.__qa_skip(); });
  await page.waitForTimeout(400);

  // N2R2 — Laboratorio de verboides
  await shoot(page, `${vp.name}-08-N2R2-verboides`);
  await page.evaluate(() => { if (window.__qa_skip) window.__qa_skip(); });
  await page.waitForTimeout(400);

  // N2R3 — Pintor de verbos
  await shoot(page, `${vp.name}-09-N2R3-pintor`);
  await page.waitForTimeout(200);

  await ctx.close();
  return errors;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const allErrors = {};
  for (const vp of VIEWPORTS) {
    try {
      const errs1 = await runFlow(browser, vp);
      const errs2 = await runFlowN2(browser, vp);
      const errs = [...errs1, ...errs2];
      allErrors[vp.name] = errs;
      if (errs.length > 0) {
        console.log(`  ❌ ${errs.length} errores en consola`);
        errs.slice(0, 3).forEach((e) => console.log(`    - ${e.slice(0, 200)}`));
      } else {
        console.log(`  ✓ sin errores de consola`);
      }
    } catch (e) {
      console.error(`  💥 ERROR en ${vp.name}: ${e.message}`);
      allErrors[vp.name] = [`fatal: ${e.message}`];
    }
  }
  await browser.close();

  const totalErr = Object.values(allErrors).reduce((acc, e) => acc + e.length, 0);
  console.log(`\n═══ RESUMEN ═══`);
  console.log(`Viewports: ${VIEWPORTS.length}`);
  console.log(`Errores totales: ${totalErr}`);
  fs.writeFileSync(path.join(__dirname, "qa-results.json"), JSON.stringify({
    url: URL,
    viewports: VIEWPORTS,
    errors: allErrors,
    totalErrors: totalErr,
    timestamp: new Date().toISOString(),
  }, null, 2));
  console.log(`Detalles en: ${path.join(__dirname, "qa-results.json")}`);

  process.exit(totalErr > 0 ? 1 : 0);
})();
