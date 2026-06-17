// verify-b.js — Verifica el comportamiento B en juego-15:
//   R1 (El camino de los recuerdos) — 0 VERIFICAR, auto-evalúa por casilla.
//   R2 (La línea del tiempo)        — 1 VERIFICAR (sigue manual, drag).
//   R3 (El tono justo)              — 0 VERIFICAR, auto-evalúa al elegir.
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
  const verifyCount = () => page.locator(".ed-btn-verify").count();

  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForSelector("#root *", { timeout: 30000 });
  await page.waitForTimeout(800);
  await page.fill("input", "Verificador");
  await page.locator("button:has-text('ENTRAR')").first().click();
  await page.waitForTimeout(500);
  await page.locator("button:has-text('¡VAMOS')").first().click();
  await page.waitForSelector('[data-qa="zona-central"]', { timeout: 15000 });
  await page.waitForTimeout(700);

  const results = {};

  // ── R1: 0 VERIFICAR + auto-evalúa por casilla ────────────────
  const r1Verify = await verifyCount();
  console.log("  VERIFICAR visible en R1:", r1Verify, "(esperado 0)");
  results.r1Verify = r1Verify;
  await shot("r1-sin-verificar");

  // Recorre las 4 casillas tocando una opción; cada toque debe auto-avanzar.
  for (let k = 0; k < 4; k++) {
    await page.waitForTimeout(400);
    const opt = page.locator('[data-qa="zona-central"] button').first();
    await opt.click();
    await page.waitForTimeout(1400); // ventana 700ms + feedback de la casilla
  }
  await shot("r1-recorrida");

  // Debe haber avanzado SOLO a R2 (enunciado de la línea del tiempo).
  await page.waitForFunction(
    () => /Ordena los momentos/.test(document.body.innerText),
    { timeout: 15000 }
  ).catch(() => console.log("  ⚠ No avanzó a R2"));
  await page.waitForTimeout(600);

  // ── R2: 1 VERIFICAR (manual) ─────────────────────────────────
  const r2Verify = await verifyCount();
  console.log("  VERIFICAR visible en R2:", r2Verify, "(esperado 1)");
  results.r2Verify = r2Verify;
  await shot("r2-con-verificar");

  // Coloca los 3 fragmentos en orden correcto: cada slotN espera el frag id N.
  // tap frag → tap su casillero correcto. Los frag llevan data por orden, pero
  // como no exponen id en el DOM, colocamos en orden de bandeja a slots libres
  // (suficiente para completar y poder VERIFICAR → avanzar).
  for (let s = 0; s < 3; s++) {
    const tray = page.locator('[data-qa="zona-central"] .ed-draggable');
    const chip = tray.first();
    if (await chip.count() === 0) break;
    await chip.click();
    await page.waitForTimeout(250);
    const zone = page.locator('[data-dropzone="slot' + s + '"]');
    await zone.click();
    await page.waitForTimeout(250);
  }
  await shot("r2-colocada");
  // VERIFICAR (manual) para avanzar a R3.
  const vbtn = page.locator(".ed-btn-verify");
  if (await vbtn.count() > 0) { await vbtn.first().click(); }
  await page.waitForTimeout(500);

  // ── R3: 0 VERIFICAR + auto-evalúa al elegir ──────────────────
  await page.waitForFunction(
    () => /Elige el final que transmite emoci/.test(document.body.innerText),
    { timeout: 15000 }
  ).catch(() => console.log("  ⚠ No avanzó a R3"));
  await page.waitForTimeout(600);

  const r3Verify = await verifyCount();
  console.log("  VERIFICAR visible en R3:", r3Verify, "(esperado 0)");
  results.r3Verify = r3Verify;
  await shot("r3-sin-verificar");

  // Tocar un final → debe auto-evaluar y avanzar a resultados.
  const r3opt = page.locator('[data-qa="bandeja"] button').first();
  await r3opt.click();
  await page.waitForTimeout(500);
  await shot("r3-seleccionado");
  const r3Auto = await page.waitForFunction(
    () => /Ronda completa|Reporte acad/.test(document.body.innerText),
    { timeout: 15000 }
  ).then(() => true).catch(() => false);
  console.log("  R3 auto-evaluó y avanzó a resultados:", r3Auto, "(esperado true)");
  results.r3Auto = r3Auto;
  await shot("resultados");

  await browser.close();

  const pass =
    results.r1Verify === 0 &&
    results.r2Verify === 1 &&
    results.r3Verify === 0 &&
    results.r3Auto === true &&
    errors.length === 0;

  if (errors.length) { console.log("\n❌ Errores de consola:"); errors.forEach((e) => console.log("  -", e)); }
  else { console.log("\n✅ Sin errores de consola."); }
  console.log("\nRESULTADO:", pass ? "✓ comportamiento B OK (R1=0, R2=1, R3=0, R3 auto)" : "✖ revisar");
  process.exit(pass ? 0 : 1);
})().catch((e) => { console.error("❌", e); process.exit(1); });
