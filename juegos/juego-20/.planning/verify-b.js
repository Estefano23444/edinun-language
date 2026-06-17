// verify-b.js — Verifica el comportamiento B (auto-evaluación) en juego-20.
// Nivel "La entrevista": R1 (¿abierta o cerrada?) y R2 (tipo de entrevista) NO
// deben mostrar VERIFICAR y deben calificarse solas al tocar una opción; R3
// (ordenar los momentos) SÍ conserva VERIFICAR (1 botón).
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

  // HOME: elegir el tema "La entrevista", escribir nombre y ENTRAR.
  await page.getByRole("button", { name: "La entrevista" }).click();
  await page.fill("input", "Verificador");
  await page.click(".ed-btn-primary"); // ENTRAR →
  await page.waitForTimeout(700);
  await page.click(".ed-btn-primary"); // ¡VAMOS, ...! →
  await page.waitForSelector('[data-qa="zona-central"]', { timeout: 15000 });
  await page.waitForTimeout(700);

  let fail = false;

  // ── R1 (¿abierta o cerrada?) — convertida: 0 VERIFICAR, auto-evalúa ──
  const verifyR1 = await page.locator(".ed-btn-verify").count();
  console.log("  R1 VERIFICAR visible:", verifyR1, "(esperado 0)");
  if (verifyR1 !== 0) fail = true;
  await shot("ent-r1-sin-verificar");

  await page.locator('[data-qa="zona-central"] button').first().click();
  await page.waitForTimeout(450);
  await shot("ent-r1-seleccionado");

  // Debe avanzar solo a la R2 (Detective de entrevistas).
  await page.waitForFunction(
    () => /tipo de entrevista|el tipo correcto/.test(document.body.innerText),
    { timeout: 15000 }
  ).catch(() => { console.log("  ⚠ R1 no avanzó a R2"); fail = true; });
  await page.waitForTimeout(600);

  // ── R2 (tipo de entrevista) — convertida: 0 VERIFICAR, auto-evalúa ──
  const verifyR2 = await page.locator(".ed-btn-verify").count();
  console.log("  R2 VERIFICAR visible:", verifyR2, "(esperado 0)");
  if (verifyR2 !== 0) fail = true;
  await shot("ent-r2-sin-verificar");

  await page.locator('[data-qa="zona-central"] button').first().click();
  await page.waitForTimeout(450);

  // Debe avanzar solo a la R3 (Ordena los momentos).
  await page.waitForFunction(
    () => /Ordena los momentos/.test(document.body.innerText),
    { timeout: 15000 }
  ).catch(() => { console.log("  ⚠ R2 no avanzó a R3"); fail = true; });
  await page.waitForTimeout(600);

  // ── R3 (ordenar momentos) — manual: 1 VERIFICAR ──
  const verifyR3 = await page.locator(".ed-btn-verify").count();
  console.log("  R3 VERIFICAR visible:", verifyR3, "(esperado 1)");
  if (verifyR3 !== 1) fail = true;
  await shot("ent-r3-con-verificar");

  await browser.close();
  if (errors.length) { console.log("\n❌ Errores de consola:"); errors.forEach((e) => console.log("  -", e)); process.exit(1); }
  if (fail) { console.log("\n❌ Conteos inesperados (ver arriba)."); process.exit(1); }
  console.log("\n✅ Sin errores y conteos correctos (R1=0, R2=0, R3=1 VERIFICAR).");
})().catch((e) => { console.error("❌", e); process.exit(1); });
