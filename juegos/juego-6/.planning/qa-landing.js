// qa-landing.js — verifica que el landing muestra juego-6
const { chromium } = require("playwright");
const path = require("path");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto("http://localhost:8765/", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(__dirname, "qa-screenshots", "landing.png"), fullPage: true });

  // Buscar texto del juego-6
  const has6 = await page.locator("text=Versos, recetas y palabras").count() > 0;
  const card = page.locator("a[href*='juego-6']");
  const cardCount = await card.count();
  console.log(`Card juego-6 en landing: ${cardCount} (texto: ${has6})`);

  await ctx.close();
  await browser.close();
})();
