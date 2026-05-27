// qa-siguiente.js — verifica que tras VERIFICAR aparece el botón SIGUIENTE
const { chromium } = require("playwright");
const path = require("path");

const URL = "http://localhost:8765/juegos/juego-6/index.html";
const OUT = path.join(__dirname, "qa-screenshots");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.locator("button:has-text('Texto poético')").first().click();
  await page.fill("input.ed-input", "Sofía");
  await page.locator("button:has-text('ENTRAR')").first().click();
  await page.waitForTimeout(400);
  await page.locator("button:has-text('¡VAMOS')").first().click();
  await page.waitForTimeout(700);

  // R1 cofres — seleccionar uno y verificar
  await page.locator("button:has-text('COMPARACIÓN')").first().click();
  await page.waitForTimeout(200);
  await page.locator("button:has-text('VERIFICAR')").first().click();
  await page.waitForTimeout(1700); // espera a que el overlay se vaya
  await page.screenshot({ path: path.join(OUT, "SIG-N1R1-tras-verify.png") });

  // Click SIGUIENTE
  const sig = page.locator("button:has-text('SIGUIENTE')").first();
  if (await sig.count() > 0) {
    console.log("✓ Botón SIGUIENTE encontrado tras verificar");
    await sig.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, "SIG-N1R2-tras-siguiente.png") });
  } else {
    console.log("❌ NO se encontró botón SIGUIENTE");
  }

  await ctx.close();
  await browser.close();
})();
