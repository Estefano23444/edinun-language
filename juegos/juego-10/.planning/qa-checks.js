// qa-checks.js — QA visual del juego-10 con Playwright.
// Asume que el repo está sirviéndose en http://localhost:8765
// Captura Home → Personaje → Game (R1 ordenar, R2 moraleja, R3 acertijo)
// en 6 viewports y recoge errores de consola/página.

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const URL = "http://localhost:8765/juegos/juego-10/index.html";
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
  await page.screenshot({ path: path.join(OUT_DIR, `${label}.png`), fullPage: false });
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
  await page.waitForTimeout(800);

  // 1. Home (sin chips de nivel — solo nombre)
  await shoot(page, `${vp.name}-01-home`);
  await page.fill("input.ed-input", "Sofía");
  await page.waitForTimeout(120);
  await page.locator("button:has-text('ENTRAR')").first().click();
  await page.waitForTimeout(600);

  // 2. CharacterScreen
  await shoot(page, `${vp.name}-02-character`);
  await page.locator("button:has-text('¡VAMOS')").first().click();
  await page.waitForTimeout(800);

  // 3. Game — R1 (ordenar Inicio/Nudo/Desenlace)
  await shoot(page, `${vp.name}-03-R1-ordenar`);

  // Avanzar a R2 con el hook de QA
  await page.evaluate(() => window.__qa_skip && window.__qa_skip());
  await page.waitForTimeout(400);
  await shoot(page, `${vp.name}-04-R2-moraleja`);

  // Avanzar a R3
  await page.evaluate(() => window.__qa_skip && window.__qa_skip());
  await page.waitForTimeout(400);
  await shoot(page, `${vp.name}-05-R3-acertijo`);

  await ctx.close();
  return errors;
}

(async () => {
  console.log("Inicio QA visual juego-10");
  const browser = await chromium.launch();
  const allErrors = {};
  for (const vp of VIEWPORTS) {
    try {
      allErrors[vp.name] = await runFlow(browser, vp);
    } catch (e) {
      console.error(`✖ Viewport ${vp.name} falló:`, e.message);
      allErrors[vp.name] = [e.message];
    }
  }
  await browser.close();

  const summary = {
    timestamp: new Date().toISOString(),
    url: URL,
    viewports: VIEWPORTS.map((v) => v.name),
    errors: allErrors,
  };
  fs.writeFileSync(path.join(__dirname, "qa-results.json"), JSON.stringify(summary, null, 2), "utf8");
  console.log("\n══════════════════════════════════════════");
  let totalErr = 0;
  for (const vp of VIEWPORTS) {
    const e = allErrors[vp.name] || [];
    totalErr += e.length;
    if (e.length === 0) console.log(`  ✓ ${vp.name}: sin errores`);
    else console.log(`  ✖ ${vp.name}: ${e.length} error(es)\n${e.map((x) => "    · " + x).join("\n")}`);
  }
  console.log(`\nErrores totales: ${totalErr}`);
  console.log("Resumen en .planning/qa-results.json · Capturas en .planning/qa-screenshots/");
})();
