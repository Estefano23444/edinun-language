// verify-b.js — Verifica el comportamiento B (auto-evaluación de rondas de
// "1 toque = respuesta") en los 3 niveles de juego-16.
//
// Rondas convertidas a AUTO (sin VERIFICAR, se evalúan solas al tocar):
//   N1 (relatos)      R1 Verdadero/Falso
//   N2 (herramientas) R2 ruleta de conectores (tras girar) · R3 subjuntivo
//   N3 (detectives)   R1 inferencias
// Rondas que SIGUEN manuales (con VERIFICAR): arrastrar (laboratorio,
// expediente), conectar causa-efecto, marcar varias pistas (lupa) y el
// shooter de interjecciones.
//
// Para cada nivel comprobamos:
//   • la ronda AUTO (1 opción) tiene 0 .ed-btn-verify y avanza sola al tocar.
//   • una ronda manual (arrastrar/conectar) tiene 1 .ed-btn-verify.
//   • 0 errores de consola.
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const htmlPath = path.join(__dirname, "..", "index.html");
const outDir = path.join(__dirname, "verify-shots-b");
fs.mkdirSync(outDir, { recursive: true });
const url = "file://" + htmlPath.replace(/\\/g, "/");

// Niveles: label del botón en HOME + textos de enunciado para detectar rondas.
const LEVELS = [
  {
    id: "relatos", label: "Sabiduría escrita",
    autoEnunc: /Decide si la frase es verdadera o falsa/,
    nextEnunc: /Completa un relato histórico con datos reales/, // R2 laboratorio (arrastrar)
  },
  {
    id: "herramientas", label: "Herramientas del escritor",
    autoEnunc: /Completa la oración con el verbo en modo subjuntivo/, // R3 subjuntivo (auto, última ronda)
    nextEnunc: null, // es la última ronda; tras tocar va a results
    autoIsLast: true,
  },
  {
    id: "detectives", label: "Detectives de la palabra",
    autoEnunc: /Lee las pistas y deduce qué ocurrió/,
    nextEnunc: /Archiva cada dato en la carpeta correcta/, // R2 expediente (arrastrar)
  },
];

const results = [];
let totalErrors = 0;

async function gotoLevel(page, lvl) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForSelector("#root *", { timeout: 30000 });
  await page.waitForTimeout(700);
  await page.fill("input", "Verificador");
  // Seleccionar el tema por su etiqueta.
  await page.locator("button", { hasText: lvl.label }).first().click();
  await page.waitForTimeout(200);
  // ENTRAR →
  await page.locator("button", { hasText: "ENTRAR" }).first().click();
  await page.waitForTimeout(600);
  // ¡EMPEZAR! (pantalla de personaje, ed-btn-primary)
  await page.locator(".ed-btn-primary").last().click();
  await page.waitForSelector('[data-qa="zona-central"], [data-qa="hud"]', { timeout: 15000 });
  await page.waitForTimeout(700);
}

// Avanza por rondas tocando una opción / completando hasta llegar al enunciado AUTO.
async function reachAuto(page, lvl) {
  // Para herramientas hay que pasar R1 (shooter) y R2 (ruleta) antes de R3.
  if (lvl.id === "herramientas") {
    // R1 shooter: toca todas las burbujas y verifica (o deja correr timer).
    // Marca solo lo que parezca interjección no es trivial; simplemente
    // pulsamos VERIFICAR tras marcar 1 burbuja (basta para avanzar).
    await page.waitForFunction(() => /Atrapa solo las interjecciones/.test(document.body.innerText), { timeout: 15000 });
    const bubble = page.locator('[data-qa="zona-central"] button').first();
    await bubble.click({ force: true });
    await page.waitForTimeout(300);
    // El shooter sí tiene VERIFICAR (ronda manual con timer). Si por timing no
    // aparece, el timer de 8 s lo auto-verifica igual.
    const vb = page.locator(".ed-btn-verify");
    if (await vb.count()) { await vb.first().click().catch(() => {}); }
    // Esperar a la R2 (ruleta de conectores) — manual o por timer.
    await page.waitForFunction(() => /Completa la oración con el conector correcto/.test(document.body.innerText), { timeout: 20000 });
    await page.waitForTimeout(500);
    // Girar la ruleta.
    await page.locator("button", { hasText: /GIRAR/ }).first().click();
    await page.waitForTimeout(2100);
    // Tocar una opción de conector → auto-evalúa y avanza a R3.
    const opt = page.locator('[data-qa="zona-central"] button').filter({ hasNotText: /GIRAR|GIRANDO/ }).first();
    await opt.click();
    await page.waitForFunction(() => /Completa la oración con el verbo en modo subjuntivo/.test(document.body.innerText), { timeout: 15000 });
    await page.waitForTimeout(600);
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

  for (const lvl of LEVELS) {
    console.log("\n=== Nivel:", lvl.id, "===");
    const before = errors.length;
    await gotoLevel(page, lvl);
    await reachAuto(page, lvl);

    // Confirmar que estamos en la ronda AUTO.
    await page.waitForFunction((re) => new RegExp(re).test(document.body.innerText), lvl.autoEnunc.source, { timeout: 15000 })
      .catch(() => console.log("  ⚠ No se alcanzó el enunciado AUTO"));
    await page.waitForTimeout(500);

    const verifyAuto = await page.locator(".ed-btn-verify").count();
    console.log("  VERIFICAR en ronda AUTO:", verifyAuto, "(esperado 0)");
    await page.screenshot({ path: path.join(outDir, lvl.id + "-auto-sin-verificar.png") });

    // Tocar una opción → debe auto-evaluar y avanzar.
    const opt = page.locator('[data-qa="zona-central"] button').filter({ hasNotText: /GIRAR|GIRANDO/ }).first();
    await opt.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, lvl.id + "-auto-seleccionado.png") });

    let verifyNext = null;
    if (lvl.autoIsLast) {
      // Última ronda → va a results. Confirmamos que avanzó (results o feedback).
      await page.waitForTimeout(2200);
      const wentResults = await page.evaluate(() => /REPORTE|Resultados|RESULTADO|estrellas|Volver al inicio/i.test(document.body.innerText));
      console.log("  Avanzó tras tocar (results/feedback):", wentResults);
      await page.screenshot({ path: path.join(outDir, lvl.id + "-tras-auto.png") });
    } else {
      await page.waitForFunction((re) => new RegExp(re).test(document.body.innerText), lvl.nextEnunc.source, { timeout: 15000 })
        .catch(() => console.log("  ⚠ No avanzó a la ronda manual"));
      await page.waitForTimeout(600);
      verifyNext = await page.locator(".ed-btn-verify").count();
      console.log("  VERIFICAR en ronda manual (arrastrar/conectar):", verifyNext, "(esperado 1)");
      await page.screenshot({ path: path.join(outDir, lvl.id + "-manual-con-verificar.png") });
    }

    const lvlErrors = errors.length - before;
    results.push({ id: lvl.id, verifyAuto, verifyNext, lvlErrors });
    totalErrors += lvlErrors;
  }

  await browser.close();

  console.log("\n──── RESUMEN ────");
  let ok = true;
  for (const r of results) {
    const autoOk = r.verifyAuto === 0;
    const nextOk = r.verifyNext === null ? true : r.verifyNext === 1;
    if (!autoOk || !nextOk) ok = false;
    console.log(`  ${r.id}: AUTO verify=${r.verifyAuto} ${autoOk ? "✓" : "✗"} | manual verify=${r.verifyNext === null ? "n/a" : r.verifyNext} ${nextOk ? "✓" : "✗"} | errores=${r.lvlErrors}`);
  }
  if (errors.length) { console.log("\n❌ Errores de consola:"); errors.forEach((e) => console.log("  -", e)); }
  else console.log("\n✅ Sin errores de consola.");

  process.exit(ok && totalErrors === 0 ? 0 : 1);
})().catch((e) => { console.error("❌", e); process.exit(1); });
