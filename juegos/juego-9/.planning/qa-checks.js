// qa-checks.js — QA visual del juego-9 con Playwright.
// Asume que el repo está sirviéndose en http://localhost:8765
// Captura el flujo Home → Personaje → Game (3 rondas) en 6 viewports.

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const URL = "http://localhost:8765/juegos/juego-9/index.html";
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
  await page.waitForTimeout(800);

  // 1. Home (sin chips de nivel — solo nombre)
  await shoot(page, `${vp.name}-01-home`);
  await page.fill("input.ed-input", "Sofía");
  await page.waitForTimeout(120);
  await shoot(page, `${vp.name}-02-home-listo`);
  await page.locator("button:has-text('ENTRAR')").first().click();
  await page.waitForTimeout(600);

  // 2. CharacterScreen
  await shoot(page, `${vp.name}-03-character`);
  await page.locator("button:has-text('¡VAMOS')").first().click();
  await page.waitForTimeout(800);

  // 3. Game — Ronda 1 (PR/PL)
  await shoot(page, `${vp.name}-04-R1-inicial`);

  // Picar una sílaba (la primera de la bandeja) y mostrar slot lleno
  const trayBtn = page.locator("[data-qa='bandeja'] button").first();
  if (await trayBtn.count() > 0) {
    await trayBtn.click();
    await page.waitForTimeout(250);
    await shoot(page, `${vp.name}-05-R1-elegido`);
  }

  await ctx.close();
  return errors;
}

(async () => {
  console.log("Inicio QA visual juego-9");
  const browser = await chromium.launch();
  const allErrors = {};
  for (const vp of VIEWPORTS) {
    try {
      const errs = await runFlow(browser, vp);
      allErrors[vp.name] = errs;
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
  fs.writeFileSync(
    path.join(__dirname, "qa-results.json"),
    JSON.stringify(summary, null, 2),
    "utf8"
  );
  console.log("\n══════════════════════════════════════════");
  for (const vp of VIEWPORTS) {
    const e = allErrors[vp.name] || [];
    if (e.length === 0) console.log(`  ✓ ${vp.name}: sin errores`);
    else console.log(`  ✖ ${vp.name}: ${e.length} error(es)\n${e.map((x) => "    · " + x).join("\n")}`);
  }
  console.log("\nResumen en .planning/qa-results.json");
  console.log("Capturas en .planning/qa-screenshots/");
})();
