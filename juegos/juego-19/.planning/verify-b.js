// verify-b.js — Verifica el comportamiento B en el nivel CIENCIA FICCIÓN de
// juego-19:
//   • R1 (clasificar utopía/distopía) NO se tocó → debe seguir mostrando 1
//     botón VERIFICAR.
//   • R2 (identificar elemento narrativo, 1 opción) → debe mostrar 0 VERIFICAR
//     y auto-evaluarse al tocar una opción (avanza solo a R3).
// Comprueba además que no haya errores de consola.
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

  // HOME: seleccionar el tema "La ciencia ficción", nombre y ENTRAR.
  await page.getByText("La ciencia ficción", { exact: true }).first().click();
  await page.fill("input", "Verificador");
  await page.click(".ed-btn-primary"); // ENTRAR →
  await page.waitForTimeout(700);
  // CHARACTER: ¡VAMOS! →
  await page.click(".ed-btn-primary");
  await page.waitForSelector('[data-qa="zona-central"]', { timeout: 15000 });
  await page.waitForTimeout(700);

  // ── R1 (clasificar) — NO convertida: debe haber 1 VERIFICAR.
  const verifyR1 = await page.locator(".ed-btn-verify").count();
  console.log("  R1 (clasificar) VERIFICAR:", verifyR1, "(esperado 1)");
  await shot("r1-clasificar-con-verificar");

  // Clasificar las 6 fichas correctamente: tocar ficha → tocar su caja.
  // tipo de cada ficha = id del bin (utopia/distopia). Se decide por el texto.
  const distopiaHints = ["vigilan", "cúpulas", "decide qué se puede pensar", "sirven a las máquinas", "controla lo que todos", "precio de oro", "desierto", "poderosos respiran", "recuerdos se borran"];
  for (let pass = 0; pass < 14; pass++) {
    const trayCount = await page.locator('[data-qa="bandeja"] .ed-draggable').count();
    if (trayCount === 0) break;
    const ficha = page.locator('[data-qa="bandeja"] .ed-draggable').first();
    const info = (await ficha.textContent()).trim().toLowerCase();
    const isDist = distopiaHints.some((h) => info.includes(h.toLowerCase()));
    const bin = page.locator(`[data-dropzone="${isDist ? "distopia" : "utopia"}"]`);
    // Drag real con varios pasos para que makeDragHandler detecte la zona.
    const fb = await ficha.boundingBox();
    const bb = await bin.boundingBox();
    if (!fb || !bb) break;
    await page.mouse.move(fb.x + fb.width / 2, fb.y + fb.height / 2);
    await page.mouse.down();
    await page.mouse.move(fb.x + fb.width / 2 + 12, fb.y + fb.height / 2 + 12, { steps: 4 });
    await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2, { steps: 10 });
    await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2 + 4, { steps: 3 });
    await page.mouse.up();
    await page.waitForTimeout(200);
  }
  await shot("r1-clasificado");
  // Verificar R1 (esperar a que se habilite tras colocar las 6 fichas).
  const verifyBtn = page.locator(".ed-btn-verify");
  await verifyBtn.click({ timeout: 8000 }).catch(async () => {
    console.log("  ⚠ VERIFICAR no se habilitó (R1 incompleta).");
  });
  // Esperar a que avance a R2 (identificar).
  await page.waitForFunction(
    () => /Descubre el elemento narrativo|Lee el fragmento y toca/.test(document.body.innerText),
    { timeout: 20000 }
  ).catch(() => console.log("  ⚠ No avanzó a R2"));
  await page.waitForTimeout(800);

  // ── R2 (identificar, 1 opción) — convertida: 0 VERIFICAR + auto-evalúa.
  const verifyR2 = await page.locator(".ed-btn-verify").count();
  console.log("  R2 (identificar) VERIFICAR:", verifyR2, "(esperado 0)");
  await shot("r2-identificar-sin-verificar");

  // Tocar la primera opción del fragmento → debe auto-evaluar y avanzar a R3.
  await page.locator('[data-qa="zona-central"] button').first().click();
  await page.waitForTimeout(450);
  await shot("r2-seleccionado");

  await page.waitForFunction(
    () => /Investiga la fuente|Marca los criterios|Veredicto/.test(document.body.innerText),
    { timeout: 20000 }
  ).catch(() => console.log("  ⚠ No avanzó a R3 (auto-evaluación R2)"));
  await page.waitForTimeout(700);
  const reachedR3 = await page.evaluate(() => /Investiga la fuente|Marca los criterios|Veredicto/.test(document.body.innerText));
  console.log("  R2 auto-evaluó y avanzó a R3:", reachedR3 ? "SÍ" : "NO");
  const verifyR3 = await page.locator(".ed-btn-verify").count();
  console.log("  R3 (veredicto) VERIFICAR:", verifyR3, "(esperado 0)");
  await shot("r3-veredicto-sin-verificar");

  await browser.close();
  if (errors.length) { console.log("\n❌ Errores:"); errors.forEach((e) => console.log("  -", e)); process.exit(1); }
  console.log("\n✅ Sin errores de consola.");
})().catch((e) => { console.error("❌", e); process.exit(1); });
