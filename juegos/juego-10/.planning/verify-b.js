// verify-b.js — Verifica el comportamiento B en la R2 de juego-10:
// la R2 (elegir moraleja) NO debe mostrar VERIFICAR y debe auto-evaluarse al
// tocar una opción. R1 (ordenar) y R3 (sílabas) conservan VERIFICAR manual.
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
  await page.waitForTimeout(700);

  // R1 — ordenar (mecánica de arrastre compleja). Comprobamos que SÍ tiene
  // VERIFICAR y avanzamos a R2 con el hook de QA (no afecta a la lógica de B).
  const verifyR1 = await page.locator(".ed-btn-verify").count();
  console.log("  VERIFICAR visible en R1:", verifyR1, "(esperado 1)");
  await shot("r1-con-verificar");

  await page.evaluate(() => window.__qa_skip && window.__qa_skip());
  await page.waitForTimeout(700);

  // R2 — ruleta + moraleja. Primero girar la ruleta.
  await page.waitForFunction(
    () => /Gira la ruleta|elige su moraleja/.test(document.body.innerText),
    { timeout: 15000 }
  ).catch(() => console.log("  ⚠ No llegó a R2"));
  await shot("r2-ruleta");

  // Girar la ruleta (botón GIRAR 🎡).
  const girar = page.locator('[data-qa="zona-central"] button.ed-btn-primary');
  if (await girar.count()) {
    await girar.first().click();
    await page.waitForTimeout(2600); // espera fin del giro (2300 ms)
  }
  await shot("r2-girada");

  // En R2 (fase elegir moraleja) NO debe haber VERIFICAR.
  const verifyR2 = await page.locator(".ed-btn-verify").count();
  console.log("  VERIFICAR visible en R2:", verifyR2, "(esperado 0)");

  // Tocar una opción de moraleja → debe auto-evaluar y avanzar.
  const opt = page.locator('[data-qa="zona-central"] button').filter({ hasNotText: "GIRAR" }).first();
  await opt.click();
  await page.waitForTimeout(450);
  await shot("r2-seleccionada");

  // Espera el overlay de feedback y/o el avance a R3.
  const autoGraded = await page.waitForFunction(
    () => /¡EXCELENTE!|¡UPS!|Adivina el personaje/.test(document.body.innerText),
    { timeout: 15000 }
  ).then(() => true).catch(() => false);
  console.log("  R2 auto-evaluada (overlay/avance):", autoGraded, "(esperado true)");
  await shot("r2-autoevaluada");

  // Espera a R3, que SÍ tiene VERIFICAR → confirma avance y que R3 no cambió.
  await page.waitForFunction(
    () => /Adivina el personaje/.test(document.body.innerText),
    { timeout: 15000 }
  ).catch(() => console.log("  ⚠ No avanzó a R3"));
  await page.waitForTimeout(600);
  const verifyR3 = await page.locator(".ed-btn-verify").count();
  console.log("  VERIFICAR visible en R3:", verifyR3, "(esperado 1)");
  await shot("r3-con-verificar");

  await browser.close();
  let fail = false;
  if (verifyR1 !== 1) { console.log("  ❌ R1 debería mostrar VERIFICAR"); fail = true; }
  if (verifyR2 !== 0) { console.log("  ❌ R2 NO debería mostrar VERIFICAR"); fail = true; }
  if (!autoGraded)    { console.log("  ❌ R2 no se auto-evaluó"); fail = true; }
  if (verifyR3 !== 1) { console.log("  ❌ R3 debería mostrar VERIFICAR"); fail = true; }
  if (errors.length) { console.log("\n❌ Errores de consola:"); errors.forEach((e) => console.log("  -", e)); fail = true; }
  else console.log("\n✅ Sin errores de consola.");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("❌", e); process.exit(1); });
