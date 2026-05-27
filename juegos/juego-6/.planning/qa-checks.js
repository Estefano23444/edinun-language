// qa-checks.js — QA visual del juego-6 con Playwright.
// Asume que el repo está sirviéndose en http://localhost:8765
// Captura el flujo Home → Personaje → Game (R1, R2, R3 de cada nivel) en 6 viewports.

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const URL = "http://localhost:8765/juegos/juego-6/index.html";
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
  // Seleccionar Tema 1
  await page.locator("button:has-text('Texto poético')").first().click();
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

  // 3. Game R1 — Ruleta poética
  await shoot(page, `${vp.name}-04-N1R1-ruleta`);
  // Click en COMPARACIÓN
  const compBtn = page.locator("button:has-text('COMPARACIÓN')").first();
  if (await compBtn.count() > 0) {
    await compBtn.click();
    await page.waitForTimeout(1300);
    await shoot(page, `${vp.name}-05-N1R1-spun`);
    // Verificar
    const verify = page.locator("button:has-text('VERIFICAR')").first();
    if (await verify.count() > 0 && await verify.isEnabled()) {
      await verify.click();
      await page.waitForTimeout(1400);
    }
  }

  // 4. Game R2 — Detective tildes
  await shoot(page, `${vp.name}-06-N1R2-detective`);
  // Click en 3 spans (palabras) que tengan border dashed — los con err
  // Simplemente clickeo los primeros 3 spans dentro del poema
  const tokens = page.locator("[data-qa='zona-central'] span");
  const tokenCount = await tokens.count();
  if (tokenCount > 0) {
    // Hacer click en 3 palabras para llegar a 3/3 (cualquiera)
    let clicked = 0;
    for (let i = 0; i < tokenCount && clicked < 3; i++) {
      try {
        const t = tokens.nth(i);
        const isVisible = await t.isVisible();
        if (isVisible) { await t.click(); clicked++; }
      } catch {}
    }
    await page.waitForTimeout(300);
    await shoot(page, `${vp.name}-07-N1R2-marked`);
    const verify = page.locator("button:has-text('VERIFICAR')").first();
    if (await verify.isEnabled()) {
      await verify.click();
      await page.waitForTimeout(1500);
    }
  }

  // 5. Game R3 — Memoria
  await shoot(page, `${vp.name}-08-N1R3-memoria-back`);
  // Voltear las 6 cartas (3 pares — voltear todas para simular completar)
  const cards = page.locator("[data-qa='zona-central'] [style*='perspective']");
  const cardCount = await cards.count();
  console.log(`  cartas memoria: ${cardCount}`);

  // Si no hay errores, ya pasa
  await ctx.close();
  return errors;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const allErrors = {};
  for (const vp of VIEWPORTS) {
    try {
      const errs = await runFlow(browser, vp);
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
