// verify-b.js — Verifica el comportamiento B en la R3 de juego-12:
// la R3 (ruleta: clasificar frase formal/coloquial) NO debe mostrar VERIFICAR
// y debe auto-evaluarse al tocar "formal"/"coloquial" tras girar la ruleta.
// Además comprueba que R2 (lectura) SÍ mantiene su VERIFICAR (respuesta
// compuesta de varios huecos) y que no hay errores de consola.
//
// Flujo del juego: R1 shooter (sin VERIFICAR, auto al expirar el timer de 20s)
// → R2 lectura (con VERIFICAR) → R3 ruleta (ahora auto, sin VERIFICAR).
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

  // ── R1 (shooter) — sin VERIFICAR. Se auto-resuelve al expirar el timer de 20s.
  const verifyR1 = await page.locator(".ed-btn-verify").count();
  console.log("  VERIFICAR visible en R1 (shooter):", verifyR1, "(esperado 0)");
  await shot("r1-shooter");
  console.log("  ⏳ Esperando a que expire el timer del shooter (~22s)…");
  await page.waitForFunction(
    () => /elige la palabra correcta en cada hueco/.test(document.body.innerText),
    { timeout: 30000 }
  ).catch(() => console.log("  ⚠ No avanzó a R2"));
  await page.waitForTimeout(800);

  // ── R2 (lectura) — CON VERIFICAR. Llenar los huecos y verificar para avanzar.
  const verifyR2 = await page.locator(".ed-btn-verify").count();
  console.log("  VERIFICAR visible en R2 (lectura):", verifyR2, "(esperado 1)");
  await shot("r2-lectura");

  // Cada hueco es un selector inline con dos <span data-opt>. Tocar el primero
  // de cada par (basta para completar todos los huecos).
  const gaps = await page.locator('[data-qa="bandeja"] span[data-opt]').count();
  // Tomar el primer span de cada par (índices pares: 0,2,4,…).
  const opts = page.locator('[data-qa="bandeja"] span[data-opt]');
  for (let i = 0; i < gaps; i += 2) {
    await opts.nth(i).click();
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(300);
  await page.click(".ed-btn-verify");

  // Avanza a R3 (ruleta).
  await page.waitForFunction(
    () => /formal o coloquial/.test(document.body.innerText),
    { timeout: 15000 }
  ).catch(() => console.log("  ⚠ No avanzó a R3"));
  await page.waitForTimeout(800);

  // ── R3 (ruleta) — comportamiento B: sin VERIFICAR + auto-evalúa.
  const verifyR3 = await page.locator(".ed-btn-verify").count();
  console.log("  VERIFICAR visible en R3 (ruleta):", verifyR3, "(esperado 0)");
  await shot("r3-sin-verificar");

  // Girar la ruleta.
  const spinBtn = page.locator('[data-qa="zona-central"] button', { hasText: /GIRAR/ });
  await spinBtn.click();
  // La ruleta gira ~2.35s y luego muestra la frase + botones formal/coloquial.
  await page.waitForFunction(
    () => /Formal/.test(document.body.innerText) && /Coloquial/.test(document.body.innerText),
    { timeout: 8000 }
  ).catch(() => console.log("  ⚠ No apareció la clasificación tras girar"));
  await page.waitForTimeout(400);
  await shot("r3-frase-sorteada");

  // Tocar una clasificación → debe auto-evaluar (sin VERIFICAR) y avanzar a results.
  const classifyBtns = page.locator('[data-qa="zona-central"] button');
  await classifyBtns.last().click();
  await page.waitForTimeout(500);
  await shot("r3-clasificado");

  // Confirmar que auto-avanzó al reporte de resultados (no quedó atascado).
  const reachedResults = await page.waitForFunction(
    () => /Ronda completa|Reporte académico/.test(document.body.innerText),
    { timeout: 12000 }
  ).then(() => true).catch(() => false);
  console.log("  Auto-avanzó a resultados tras 1 toque en R3:", reachedResults, "(esperado true)");
  await page.waitForTimeout(500);
  await shot("resultados");

  await browser.close();
  if (errors.length) { console.log("\n❌ Errores:"); errors.forEach((e) => console.log("  -", e)); process.exit(1); }
  console.log("\n✅ Sin errores de consola.");
})().catch((e) => { console.error("❌", e); process.exit(1); });
