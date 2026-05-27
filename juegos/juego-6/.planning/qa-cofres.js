// qa-cofres.js — captura los estados del cofre: idle, seleccionado, abierto correcto, abierto incorrecto
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

  // Estado idle
  await page.screenshot({ path: path.join(OUT, "COFRE-1-idle.png") });

  // Seleccionar el primer cofre (COMPARACIÓN)
  await page.locator("button:has-text('COMPARACIÓN')").first().click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, "COFRE-2-seleccionado.png") });

  // Verificar
  await page.locator("button:has-text('VERIFICAR')").first().click();
  await page.waitForTimeout(800);  // Espera mientras está el overlay
  await page.screenshot({ path: path.join(OUT, "COFRE-3-overlay.png") });
  await page.waitForTimeout(1500);  // overlay se va, marcas visibles
  await page.screenshot({ path: path.join(OUT, "COFRE-4-abierto.png") });

  await ctx.close();
  await browser.close();
  console.log("Capturas cofres listas.");
})();
