// verify-b.js — Verifica el comportamiento B en el nivel POEMAS de juego-14:
// las 3 rondas (R1 ruleta, R2 rima, R3 detective) son de "1 toque = respuesta"
// y deben auto-evaluarse SIN botón VERIFICAR. Además comprueba que el nivel
// BIBLIOTECA (completar palabra) SIGUE siendo manual (1 VERIFICAR).
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const htmlPath = path.join(__dirname, "..", "index.html");
const outDir = path.join(__dirname, "verify-shots-b");
fs.mkdirSync(outDir, { recursive: true });
const url = "file://" + htmlPath.replace(/\\/g, "/");

let failed = false;
function expect(label, got, want) {
  const ok = got === want;
  console.log(`  ${ok ? "✅" : "❌"} ${label}: ${got} (esperado ${want})`);
  if (!ok) failed = true;
}

async function enterLevel(page, levelLabel) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForSelector("#root *", { timeout: 30000 });
  await page.waitForTimeout(700);
  await page.locator(`button:has-text("${levelLabel}")`).first().click();
  await page.waitForTimeout(150);
  await page.fill("input.ed-input", "Verificador");
  await page.locator('button:has-text("ENTRAR")').first().click();
  await page.waitForTimeout(500);
  await page.locator('button:has-text("¡VAMOS")').first().click();
  await page.waitForSelector('[data-qa="zona-central"]', { timeout: 15000 });
  await page.waitForTimeout(700);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  const shot = async (n) => { await page.screenshot({ path: path.join(outDir, n + ".png") }); console.log("  📸", n); };

  // ───────── NIVEL POEMAS (debe ser AUTO en las 3 rondas) ─────────
  console.log("\n=== NIVEL POEMAS (comportamiento B / AUTO) ===");
  await enterLevel(page, "Poemas populares");

  // R1: ruleta. Antes de girar no hay opciones; tras girar tampoco hay VERIFICAR.
  await shot("poemas-r1-pre-giro");
  await page.locator('button:has-text("GIRAR")').first().click();
  await page.waitForTimeout(2100);
  await shot("poemas-r1-opciones");
  expect("VERIFICAR en R1 (ruleta)", await page.locator(".ed-btn-verify").count(), 0);

  // Tocar una opción → auto-evalúa y avanza a R2.
  await page.locator('[data-qa="zona-central"] button').first().click();
  await page.waitForTimeout(450);
  await shot("poemas-r1-seleccion");
  await page.waitForFunction(
    () => /Completa el verso con la palabra que rima/.test(document.body.innerText),
    { timeout: 15000 }
  ).catch(() => { console.log("  ⚠ No avanzó a R2"); failed = true; });
  await page.waitForTimeout(500);

  // R2: completar la rima (toca opción → auto).
  expect("VERIFICAR en R2 (rima)", await page.locator(".ed-btn-verify").count(), 0);
  await shot("poemas-r2");
  await page.locator('[data-qa="zona-central"] button').first().click();
  await page.waitForTimeout(450);
  await page.waitForFunction(
    () => /Encuentra el verso que no rima/.test(document.body.innerText),
    { timeout: 15000 }
  ).catch(() => { console.log("  ⚠ No avanzó a R3"); failed = true; });
  await page.waitForTimeout(500);

  // R3: detective (toca verso → auto).
  expect("VERIFICAR en R3 (detective)", await page.locator(".ed-btn-verify").count(), 0);
  await shot("poemas-r3");
  await page.locator('[data-qa="zona-central"] button').first().click();
  await page.waitForTimeout(450);
  await shot("poemas-r3-seleccion");

  // ───────── NIVEL BIBLIOTECA (debe seguir MANUAL: 1 VERIFICAR) ─────────
  console.log("\n=== NIVEL BIBLIOTECA (manual, intacto) ===");
  await enterLevel(page, "La biblioteca");
  expect("VERIFICAR en Biblioteca (completar palabra)", await page.locator(".ed-btn-verify").count(), 1);
  await shot("biblioteca-con-verificar");

  await browser.close();
  if (errors.length) { console.log("\n❌ Errores de consola:"); errors.forEach((e) => console.log("  -", e)); failed = true; }
  else console.log("\n✅ Sin errores de consola.");
  if (failed) { console.log("\n❌ VERIFICACIÓN FALLÓ."); process.exit(1); }
  console.log("\n✅ VERIFICACIÓN OK.");
})().catch((e) => { console.error("❌", e); process.exit(1); });
