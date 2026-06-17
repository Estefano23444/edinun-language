// verify-b.js — Verifica el comportamiento B en juego-4 (tema "tipos"):
//   - La R1 (trivia "¿Qué tipo de texto es?", 1 opción) NO muestra VERIFICAR
//     y se auto-evalúa al tocar una opción.
//   - La R2 (organizador gráfico, arrastrar piezas) SÍ muestra VERIFICAR.
//   - Sin errores de consola.
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
  const shot = async (n) => { await page.screenshot({ path: path.join(outDir, n + ".png") }); console.log("  shot", n); };

  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForSelector("#root *", { timeout: 30000 });
  await page.waitForTimeout(1000);

  // Pantalla de inicio: elegir tema "Tipos de texto" + nombre → ENTRAR.
  await page.click('button:has-text("Tipos de texto")');
  await page.waitForTimeout(200);
  await page.fill("input", "Verificador");
  await page.click(".ed-btn-primary:has-text('ENTRAR')");
  await page.waitForTimeout(800);

  // Pantalla de personaje → ¡VAMOS!
  await page.click(".ed-btn-primary");
  await page.waitForSelector('[data-qa="zona-central"]', { timeout: 15000 });
  await page.waitForTimeout(700);

  // ── R1: trivia de 1 opción ("¿Qué tipo de texto es?") ──
  const enR1 = await page.evaluate(() => document.body.innerText);
  console.log("  R1 enunciado contiene '¿Qué tipo de texto es?':", /¿Qué tipo de texto es\?/.test(enR1));

  const verifyR1 = await page.locator(".ed-btn-verify").count();
  console.log("  VERIFICAR visible en R1:", verifyR1, "(esperado 0)");
  await shot("r1-sin-verificar");

  // Tocar una opción de la trivia → debe auto-evaluar y avanzar a la R2.
  const opt = page.locator('[data-qa="zona-central"] button').first();
  await opt.click();
  await page.waitForTimeout(450);
  await shot("r1-seleccionado");

  // Esperar a la R2 (organizador, arrastrar) → confirma que avanzó solo.
  let reachedR2 = true;
  await page.waitForFunction(
    () => /Organizador gráfico|Coloca cada una/.test(document.body.innerText),
    { timeout: 15000 }
  ).catch(() => { reachedR2 = false; console.log("  AVISO: no avanzó a R2"); });
  await page.waitForTimeout(600);

  // ── R2: arrastrar/organizar → SÍ debe mostrar VERIFICAR ──
  const verifyR2 = await page.locator(".ed-btn-verify").count();
  console.log("  VERIFICAR visible en R2 (arrastrar):", verifyR2, "(esperado 1)");
  await shot("r2-con-verificar");

  // ── Segundo tema: "Enriquece tu lengua" — R1 (polisémica) y R2 (homófona)
  //    son de 1 opción (auto-evaluadas); R3 (arrastrar verbos) es manual. ──
  console.log("\n  Tema 'Enriquece tu lengua':");
  // Volver al inicio: SALIR desde el rail.
  await page.click('button:has-text("SALIR")');
  await page.waitForTimeout(300);
  await page.click(".ed-btn-primary"); // confirmar SÍ, SALIR
  await page.waitForTimeout(800);
  await page.click('button:has-text("Enriquece tu lengua")');
  await page.waitForTimeout(200);
  await page.fill("input", "Verificador");
  await page.click(".ed-btn-primary:has-text('ENTRAR')");
  await page.waitForTimeout(800);
  await page.click(".ed-btn-primary"); // ¡VAMOS!
  await page.waitForSelector('[data-qa="zona-central"]', { timeout: 15000 });
  await page.waitForTimeout(700);

  const enrR1Verify = await page.locator(".ed-btn-verify").count();
  console.log("  VERIFICAR en R1 (polisémica):", enrR1Verify, "(esperado 0)");
  await shot("enr-r1-sin-verificar");
  await page.locator('[data-qa="zona-central"] button').first().click();
  await page.waitForTimeout(450);

  // R2 homófona (1 de 2) — esperar enunciado "Elige la letra correcta."
  let reachedEnrR2 = true;
  await page.waitForFunction(
    () => /Elige la letra correcta/.test(document.body.innerText),
    { timeout: 15000 }
  ).catch(() => { reachedEnrR2 = false; console.log("  AVISO: no avanzó a R2 homófona"); });
  await page.waitForTimeout(600);
  const enrR2Verify = await page.locator(".ed-btn-verify").count();
  console.log("  VERIFICAR en R2 (homófona):", enrR2Verify, "(esperado 0)");
  await shot("enr-r2-sin-verificar");
  await page.locator('[data-qa="zona-central"] button').first().click();
  await page.waitForTimeout(450);

  // R3 condicional (arrastrar) — esperar enunciado y confirmar VERIFICAR=1.
  let reachedEnrR3 = true;
  await page.waitForFunction(
    () => /Completa el párrafo|Arrastra cada verbo/.test(document.body.innerText),
    { timeout: 15000 }
  ).catch(() => { reachedEnrR3 = false; console.log("  AVISO: no avanzó a R3 arrastrar"); });
  await page.waitForTimeout(600);
  const enrR3Verify = await page.locator(".ed-btn-verify").count();
  console.log("  VERIFICAR en R3 (arrastrar):", enrR3Verify, "(esperado 1)");
  await shot("enr-r3-con-verificar");

  await browser.close();

  let fail = false;
  if (verifyR1 !== 0) { console.log("  FALLO: tipos R1 mostró VERIFICAR"); fail = true; }
  if (!reachedR2)     { console.log("  FALLO: tipos R1 no auto-avanzó"); fail = true; }
  if (verifyR2 !== 1) { console.log("  FALLO: tipos R2 (arrastrar) no mostró VERIFICAR"); fail = true; }
  if (enrR1Verify !== 0) { console.log("  FALLO: enriquece R1 mostró VERIFICAR"); fail = true; }
  if (!reachedEnrR2)     { console.log("  FALLO: enriquece R1 no auto-avanzó"); fail = true; }
  if (enrR2Verify !== 0) { console.log("  FALLO: enriquece R2 (homófona) mostró VERIFICAR"); fail = true; }
  if (!reachedEnrR3)     { console.log("  FALLO: enriquece R2 no auto-avanzó"); fail = true; }
  if (enrR3Verify !== 1) { console.log("  FALLO: enriquece R3 (arrastrar) no mostró VERIFICAR"); fail = true; }

  if (errors.length) { console.log("\nErrores de consola:"); errors.forEach((e) => console.log("  -", e)); fail = true; }
  else { console.log("\nSin errores de consola."); }

  if (fail) process.exit(1);
  console.log("OK comportamiento B verificado.");
})().catch((e) => { console.error("ERROR", e); process.exit(1); });
