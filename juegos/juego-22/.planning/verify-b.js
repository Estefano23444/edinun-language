// verify-b.js — Verifica que juego-22 quede 100% automático: ninguna ronda
// muestra VERIFICAR y la R2 (coloquio) se auto-evalúa al elegir.
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const htmlPath = path.join(__dirname, "..", "index.html");
const outDir = path.join(__dirname, "verify-shots-b");
fs.mkdirSync(outDir, { recursive: true });
const url = "file://" + htmlPath.replace(/\\/g, "/");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  const shot = async (n) => { await page.screenshot({ path: path.join(outDir, n + ".png") }); console.log("  📸", n); };

  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForSelector("#root *", { timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.fill("input", "Verificador");
  await page.click(".ed-btn-primary");
  await page.waitForTimeout(800);
  await page.click(".ed-btn-primary"); // ¡VAMOS!
  await page.waitForSelector('[data-qa="zona-central"]', { timeout: 15000 });

  // R1 shooter (auto, ~16s) → esperar a la R2 (coloquio).
  await page.waitForFunction(() => /Modera el coloquio/.test(document.body.innerText), { timeout: 30000 });
  await page.waitForTimeout(700);
  const vR2 = await page.locator(".ed-btn-verify").count();
  console.log("  VERIFICAR en R2:", vR2, "(esperado 0)");
  await shot("r2-sin-verificar");

  // Resolver 3 fases tocando una opción en cada una (auto-avanza).
  for (let i = 0; i < 3; i++) {
    const opt = page.locator('[data-qa="zona-central"] button').first();
    await opt.click().catch(() => {});
    if (i === 0) { await page.waitForTimeout(300); await shot("r2-seleccionado"); }
    await page.waitForTimeout(5400); // espera el auto-avance (hasta 5s si falla)
  }

  // R3 memoria
  await page.waitForFunction(
    () => document.querySelectorAll('[data-qa="memo-card"]').length > 0,
    { timeout: 20000 }
  ).catch(() => console.log("  ⚠ no se vio el tablero de memoria"));
  const vR3 = await page.locator(".ed-btn-verify").count();
  console.log("  VERIFICAR en R3:", vR3, "(esperado 0)");
  await shot("r3-memoria");

  await browser.close();
  if (errors.length) { console.log("\n❌ Errores:"); errors.forEach((e) => console.log("  -", e)); process.exit(1); }
  console.log("\n✅ Sin errores de consola.");
})().catch((e) => { console.error("❌", e); process.exit(1); });
