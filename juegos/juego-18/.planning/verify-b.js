// verify-b.js — Verifica el comportamiento B en R1 y R2 de juego-18:
//   R1 (ruleta): NO muestra VERIFICAR; al girar y tocar un verbo, se
//   auto-evalúa y avanza.
//   R2 (taller): NO muestra VERIFICAR; al tocar un afijo, se auto-evalúa y avanza.
//   R3 (desinencias): VERIFICAR vuelve a estar (manual).
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

  let ok = true;
  const expect = (label, got, want) => {
    const pass = got === want;
    console.log(`  ${pass ? "✓" : "✗"} ${label}: ${got} (esperado ${want})`);
    if (!pass) ok = false;
  };

  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForSelector("#root *", { timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.fill("input", "Verificador");
  await page.click(".ed-btn-primary");
  await page.waitForTimeout(800);
  await page.click(".ed-btn-primary"); // ¡VAMOS!
  await page.waitForSelector('[data-qa="zona-central"]', { timeout: 15000 });
  await page.waitForTimeout(700);

  // ── R1 ──────────────────────────────────────────────────────────────────
  expect("VERIFICAR en R1", await page.locator(".ed-btn-verify").count(), 0);
  await shot("r1-sin-verificar");

  // Girar la ruleta: el botón GIRAR está en la zona central.
  const girar = page.locator('[data-qa="zona-central"] button', { hasText: /GIRAR/ });
  if (await girar.count()) {
    await girar.first().click();
    console.log("  • GIRAR pulsado");
  } else {
    console.log("  ⚠ No se encontró botón GIRAR");
  }
  // Esperar a que aterrice la ruleta y aparezcan las opciones de verbo.
  await page.waitForTimeout(3000);
  await shot("r1-ruleta-aterrizo");

  // Tocar la primera opción de verbo → debe auto-evaluar y avanzar.
  const r1opt = page.locator('[data-qa="zona-central"] button').first();
  await r1opt.click();
  await page.waitForTimeout(450);
  await shot("r1-seleccionado");

  // Confirmar avance a R2 (enunciado del taller).
  await page.waitForFunction(
    () => /Forma la palabra que tenga ese significado/.test(document.body.innerText),
    { timeout: 15000 }
  ).catch(() => { console.log("  ⚠ No avanzó a R2"); ok = false; });
  await page.waitForTimeout(600);

  // ── R2 ──────────────────────────────────────────────────────────────────
  expect("VERIFICAR en R2", await page.locator(".ed-btn-verify").count(), 0);
  await shot("r2-sin-verificar");

  // Tocar un afijo de la bandeja → última fila de botones en la zona central.
  const r2opts = page.locator('[data-qa="zona-central"] button');
  const n2 = await r2opts.count();
  await r2opts.nth(n2 - 1).click();
  await page.waitForTimeout(450);
  await shot("r2-seleccionado");

  // Confirmar avance a R3 (enunciado de desinencias).
  await page.waitForFunction(
    () => /Lleva cada verbo al grupo de su persona/.test(document.body.innerText),
    { timeout: 15000 }
  ).catch(() => { console.log("  ⚠ No avanzó a R3"); ok = false; });
  await page.waitForTimeout(600);

  // ── R3 ──────────────────────────────────────────────────────────────────
  expect("VERIFICAR en R3", await page.locator(".ed-btn-verify").count(), 1);
  await shot("r3-con-verificar");

  await browser.close();
  if (errors.length) { console.log("\n❌ Errores de consola:"); errors.forEach((e) => console.log("  -", e)); process.exit(1); }
  if (!ok) { console.log("\n❌ Alguna comprobación falló."); process.exit(1); }
  console.log("\n✅ Comportamiento B correcto en R1 y R2; R3 conserva VERIFICAR; 0 errores de consola.");
})().catch((e) => { console.error("❌", e); process.exit(1); });
