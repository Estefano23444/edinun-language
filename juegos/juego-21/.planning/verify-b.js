// verify-b.js — Verifica el comportamiento B en la R1 de juego-21:
// la R1 NO debe mostrar VERIFICAR y debe auto-evaluarse al tocar una opción.
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

  const verifyVisibleR1 = await page.locator(".ed-btn-verify").count();
  console.log("  VERIFICAR visible en R1:", verifyVisibleR1, "(esperado 0)");
  await shot("r1-sin-verificar");

  // Tocar una opción de la R1 (tarjeta de mundo) → debe auto-evaluar.
  const opt = page.locator('[data-qa="zona-central"] button').first();
  await opt.click();
  await page.waitForTimeout(450);
  await shot("r1-seleccionado");

  // Esperar a que aparezca la R2 (que SÍ tiene VERIFICAR) → confirma que avanzó solo.
  await page.waitForFunction(
    () => /Ordena las escenas|Arrastra cada escena/.test(document.body.innerText),
    { timeout: 15000 }
  ).catch(() => console.log("  ⚠ No avanzó a R2"));
  await page.waitForTimeout(600);
  const verifyVisibleR2 = await page.locator(".ed-btn-verify").count();
  console.log("  VERIFICAR visible en R2:", verifyVisibleR2, "(esperado 1)");
  await shot("r2-con-verificar");

  await browser.close();
  if (errors.length) { console.log("\n❌ Errores:"); errors.forEach((e) => console.log("  -", e)); process.exit(1); }
  console.log("\n✅ Sin errores de consola.");
})().catch((e) => { console.error("❌", e); process.exit(1); });
