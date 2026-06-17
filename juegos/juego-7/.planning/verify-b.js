// verify-b.js — Verifica el comportamiento B en la R1 del nivel ESCRITOR de juego-7:
// la R1 (pronombre) NO debe mostrar VERIFICAR y debe auto-evaluarse cuando los
// 3 huecos quedan elegidos. La R2 (arrastrar verboides) SÍ muestra VERIFICAR.
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

  // Home → elegir nivel ESCRITOR ("Aprendiendo a escribir") → nombre → ENTRAR
  await page.locator("button:has-text('Aprendiendo a escribir')").first().click();
  await page.waitForTimeout(200);
  await page.fill("input.ed-input", "Verificador");
  await page.waitForTimeout(120);
  await page.locator("button:has-text('ENTRAR')").first().click();
  await page.waitForTimeout(500);

  // CharacterScreen → ¡VAMOS!
  await page.locator("button:has-text('¡VAMOS')").first().click();
  await page.waitForSelector('[data-qa="zona-central"]', { timeout: 15000 });
  await page.waitForTimeout(700);

  // ── R1 (pronombre): NO debe haber botón VERIFICAR.
  const verifyVisibleR1 = await page.locator(".ed-btn-verify").count();
  console.log("  VERIFICAR visible en R1 (pronombre):", verifyVisibleR1, "(esperado 0)");
  await shot("r1-sin-verificar");

  // Tocar una opción por hueco usando los botones dentro de la tarjeta.
  // La tarjeta de pronombre tiene 3 grupos de 3 botones = 9 botones. El objetivo
  // del test es verificar la AUTO-EVALUACIÓN (que avanza solo al llenar los 3),
  // no el acierto; por eso tocamos la 1ª opción de cada grupo.
  const optButtons = page.locator('[data-qa="zona-central"] button');
  const nOpts = await optButtons.count();
  console.log("  Botones de opción en R1:", nOpts, "(esperado 9 = 3 huecos x 3)");
  // Tocar el 1º botón de cada grupo de 3 (índices 0, 3, 6) → llena los 3 huecos.
  for (const i of [0, 3, 6]) {
    if (i < nOpts) { await optButtons.nth(i).click(); await page.waitForTimeout(150); }
  }
  await page.waitForTimeout(300);
  await shot("r1-tres-huecos-elegidos");

  // Tras ~700 ms debe auto-evaluar y avanzar a R2 (verboides, "Arrastra la terminación").
  await page.waitForFunction(
    () => /Forma los 3 verboides|Arrastra la terminación/.test(document.body.innerText),
    { timeout: 15000 }
  ).catch(() => console.log("  ⚠ No avanzó a R2"));
  await page.waitForTimeout(600);
  const verifyVisibleR2 = await page.locator(".ed-btn-verify").count();
  console.log("  VERIFICAR visible en R2 (arrastrar verboides):", verifyVisibleR2, "(esperado 1)");
  await shot("r2-con-verificar");

  await browser.close();
  if (errors.length) { console.log("\n❌ Errores:"); errors.forEach((e) => console.log("  -", e)); process.exit(1); }
  console.log("\n✅ Sin errores de consola.");
})().catch((e) => { console.error("❌", e); process.exit(1); });
