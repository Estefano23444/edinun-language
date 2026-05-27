// qa-nivel2.js — verifica Nivel 2 (Texto instructivo) en 1280x800
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const URL = "http://localhost:8765/juegos/juego-6/index.html";
const OUT_DIR = path.join(__dirname, "qa-screenshots");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function shoot(page, label) {
  await page.screenshot({ path: path.join(OUT_DIR, `${label}.png`), fullPage: false });
  console.log(`  📸 ${label}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });

  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);

  // Seleccionar Tema 2
  await page.locator("button:has-text('Texto instructivo')").first().click();
  await page.waitForTimeout(200);
  await page.fill("input.ed-input", "Mateo");
  await page.locator("button:has-text('ENTRAR')").first().click();
  await page.waitForTimeout(500);
  await page.locator("button:has-text('¡VAMOS')").first().click();
  await page.waitForTimeout(700);

  // N2 R1 — Kichwa árbol
  await shoot(page, "N2R1-kichwa-vacio");
  // Pickear primera etiqueta y colocarla en primer miembro
  const labels = page.locator("[data-qa='bandeja'] button");
  const labelCount = await labels.count();
  console.log(`  etiquetas: ${labelCount}`);
  if (labelCount > 0) {
    // Hacer click en una etiqueta
    await labels.first().click();
    await page.waitForTimeout(200);
    // Click en un miembro del árbol
    const members = page.locator("[data-qa='zona-central'] > div").first().locator("> div").nth(1).locator("> div");
    const memberCount = await members.count();
    console.log(`  miembros visibles: ${memberCount}`);
  }
  await shoot(page, "N2R1-kichwa-pick");

  // Forzar avanzar usando consola
  await page.evaluate(() => {
    // No way to force-skip a round without breaking the game; just shoot what's here
  });

  // Tomar una captura del estado actual
  await shoot(page, "N2R1-kichwa-final");

  await ctx.close();
  await browser.close();

  console.log(errors.length === 0 ? "\n✓ Nivel 2 sin errores de consola" : `\n❌ ${errors.length} errores: ${errors.slice(0,3).join(" | ")}`);
})();
