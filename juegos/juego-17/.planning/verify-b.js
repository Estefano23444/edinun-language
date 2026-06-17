// verify-b.js — Verifica el comportamiento B (auto-evaluación de rondas de
// 1 toque) en juego-17, en ambos niveles:
//   • NIVEL 1 (Escritura y tecnología): R3 "El asistente misterioso" (acertijo)
//     debe NO mostrar VERIFICAR y auto-evaluarse al tocar una herramienta.
//   • NIVEL 2 (La noticia): R2 "Caza la opinión" y R3 "¿Confiable o trampa?"
//     deben NO mostrar VERIFICAR y auto-evaluarse al tocar.
// Las rondas de ORDENAR (N1 R1, N2 R1) deben seguir mostrando 1 VERIFICAR.
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const htmlPath = path.join(__dirname, "..", "index.html");
const outDir = path.join(__dirname, "verify-shots-b");
fs.mkdirSync(outDir, { recursive: true });
const url = "file://" + htmlPath.replace(/\\/g, "/");

let failures = 0;
function check(label, got, expected) {
  const ok = got === expected;
  if (!ok) failures++;
  console.log(`  ${ok ? "✅" : "❌"} ${label}: ${got} (esperado ${expected})`);
}

async function start(page, levelLabel) {
  // Home: elegir tema (botón con el label), escribir nombre, ENTRAR.
  await page.waitForSelector("#root *", { timeout: 30000 });
  await page.waitForTimeout(800);
  await page.click(`button:has-text("${levelLabel}")`);
  await page.fill("input", "Verificador");
  await page.click('button:has-text("ENTRAR")');
  await page.waitForTimeout(500);
  // CharacterScreen: ¡VAMOS!
  await page.click('button:has-text("¡VAMOS")');
  await page.waitForSelector('[data-qa="zona-central"]', { timeout: 15000 });
  await page.waitForTimeout(700);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [];

  async function shot(page, n) { await page.screenshot({ path: path.join(outDir, n + ".png") }); console.log("  📸", n); }

  // ─── NIVEL 1 ─────────────────────────────────────────────────
  console.log("\n=== NIVEL 1 — Escritura y tecnología ===");
  {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });
    page.on("console", (m) => { if (m.type() === "error") errors.push("N1 " + m.text()); });
    page.on("pageerror", (e) => errors.push("N1 pageerror: " + e.message));
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    await start(page, "Escritura y tecnología");

    // R1 = ordenar → debe tener 1 VERIFICAR.
    const verifyR1 = await page.locator(".ed-btn-verify").count();
    check("N1 R1 (ordenar) VERIFICAR", verifyR1, 1);
    await shot(page, "n1-r1-ordenar-con-verificar");

    // Resolver R1 (ordenar las 5 fichas) tocando cada ficha de la bandeja en
    // orden correcto: identificamos por el orden n (drag no, tap llena hueco).
    // El tap llena el primer hueco libre, así que tocamos en el orden n=1..5.
    // Para no depender del set, simplemente tocamos en cualquier orden y
    // verificamos — el objetivo es solo AVANZAR a R3. Tocamos todas y pulsamos.
    for (let i = 0; i < 5; i++) {
      const tray = page.locator('[data-qa="bandeja"] .ed-draggable');
      const c = await tray.count();
      if (c > 0) await tray.first().click();
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(300);
    await page.click(".ed-btn-verify");
    // Esperar avance a R2 (shooter).
    await page.waitForFunction(() => /Atrapa las frases/.test(document.body.innerText), { timeout: 15000 }).catch(() => {});
    // Esperar a que el shooter termine y avance a R3 (acertijo).
    await page.waitForFunction(() => /Adivina qué herramienta/.test(document.body.innerText), { timeout: 25000 }).catch(() => console.log("  ⚠ No llegó a R3"));
    await page.waitForTimeout(700);

    // R3 = acertijo (1 opción) → NO debe haber VERIFICAR.
    const verifyR3 = await page.locator(".ed-btn-verify").count();
    check("N1 R3 (acertijo) VERIFICAR", verifyR3, 0);
    await shot(page, "n1-r3-acertijo-sin-verificar");

    // Tocar una opción → debe auto-evaluar y avanzar a results.
    await page.locator('[data-qa="zona-central"] .ed-numpad-key').first().click();
    await page.waitForFunction(() => /Ronda completa|JUGAR OTRA RONDA/.test(document.body.innerText), { timeout: 15000 })
      .then(() => console.log("  ✅ N1 R3 auto-evaluó y avanzó a resultados"))
      .catch(() => { failures++; console.log("  ❌ N1 R3 no avanzó tras tocar"); });
    await shot(page, "n1-r3-autoevaluado");
    await page.close();
  }

  // ─── NIVEL 2 ─────────────────────────────────────────────────
  console.log("\n=== NIVEL 2 — La noticia ===");
  {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });
    page.on("console", (m) => { if (m.type() === "error") errors.push("N2 " + m.text()); });
    page.on("pageerror", (e) => errors.push("N2 pageerror: " + e.message));
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    await start(page, "La noticia");

    // R1 = ordenar la pirámide → 1 VERIFICAR.
    const verifyR1 = await page.locator(".ed-btn-verify").count();
    check("N2 R1 (ordenar) VERIFICAR", verifyR1, 1);
    await shot(page, "n2-r1-ordenar-con-verificar");

    for (let i = 0; i < 4; i++) {
      const tray = page.locator('[data-qa="bandeja"] .ed-draggable');
      const c = await tray.count();
      if (c > 0) await tray.first().click();
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(300);
    await page.click(".ed-btn-verify");
    // Avance a R2 (caza la opinión).
    await page.waitForFunction(() => /Encuentra la frase que opina/.test(document.body.innerText), { timeout: 15000 })
      .catch(() => console.log("  ⚠ No llegó a R2"));
    await page.waitForTimeout(700);

    // R2 = caza la opinión (1 toque) → NO VERIFICAR.
    const verifyR2 = await page.locator(".ed-btn-verify").count();
    check("N2 R2 (caza opinión) VERIFICAR", verifyR2, 0);
    await shot(page, "n2-r2-opinion-sin-verificar");

    // Tocar una frase → auto-evalúa y avanza a R3.
    await page.locator('[data-qa="bandeja"] span').first().click();
    await page.waitForFunction(() => /Decide si el titular es confiable/.test(document.body.innerText), { timeout: 15000 })
      .then(() => console.log("  ✅ N2 R2 auto-evaluó y avanzó a R3"))
      .catch(() => { failures++; console.log("  ❌ N2 R2 no avanzó tras tocar"); });
    await page.waitForTimeout(700);

    // R3 = confiable o trampa (1 toque) → NO VERIFICAR.
    const verifyR3 = await page.locator(".ed-btn-verify").count();
    check("N2 R3 (confiable/trampa) VERIFICAR", verifyR3, 0);
    await shot(page, "n2-r3-confiable-sin-verificar");

    // Tocar un veredicto → auto-evalúa y avanza a results.
    await page.locator('[data-qa="zona-central"] .ed-numpad-key').first().click();
    await page.waitForFunction(() => /Ronda completa|JUGAR OTRA RONDA/.test(document.body.innerText), { timeout: 15000 })
      .then(() => console.log("  ✅ N2 R3 auto-evaluó y avanzó a resultados"))
      .catch(() => { failures++; console.log("  ❌ N2 R3 no avanzó tras tocar"); });
    await shot(page, "n2-r3-autoevaluado");
    await page.close();
  }

  await browser.close();
  if (errors.length) { console.log("\n❌ Errores de consola:"); errors.forEach((e) => console.log("  -", e)); }
  else console.log("\n✅ Sin errores de consola.");
  if (failures > 0 || errors.length) { console.log(`\n❌ FALLÓ (${failures} checks + ${errors.length} errores)`); process.exit(1); }
  console.log("\n✅ TODO OK.");
})().catch((e) => { console.error("❌", e); process.exit(1); });
