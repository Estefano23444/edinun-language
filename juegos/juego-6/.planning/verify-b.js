// verify-b.js — Verifica el comportamiento B en juego-6 (nivel poético):
//   R1 (cofre, elegir-1): NO muestra VERIFICAR y auto-evalúa al tocar.
//   R2 (pintar palabras sin tilde, multi): SIGUE con VERIFICAR.
//   R3 (memoria): NO muestra VERIFICAR y auto-finaliza al emparejar todo.
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
  await page.waitForTimeout(800);

  // Home: elegir nivel "Texto poético", nombre y entrar.
  await page.locator("button:has-text('Texto poético')").first().click();
  await page.fill("input.ed-input", "Verificador");
  await page.locator("button:has-text('ENTRAR')").first().click();
  await page.waitForTimeout(500);
  await page.locator("button:has-text('¡VAMOS')").first().click();
  await page.waitForSelector('[data-qa="zona-central"]', { timeout: 15000 });
  await page.waitForTimeout(700);

  // ── R1 (cofre) — sin VERIFICAR, auto-evalúa al tocar.
  const verifyR1 = await page.locator(".ed-btn-verify").count();
  console.log("  VERIFICAR visible en R1 (cofre):", verifyR1, "(esperado 0)");
  await shot("r1-cofre-sin-verificar");

  await page.locator('[data-qa="zona-central"] button').first().click();
  await page.waitForTimeout(400);
  await shot("r1-cofre-seleccionado");

  // Debe avanzar solo a R2 (pintar palabras sin tilde).
  await page.waitForFunction(
    () => /palabras sin tilde|Marcadas/.test(document.body.innerText),
    { timeout: 15000 }
  ).catch(() => console.log("  ⚠ R1 no avanzó a R2"));
  await page.waitForTimeout(700);

  // ── R2 (pintar, multi) — SIGUE con VERIFICAR.
  const verifyR2 = await page.locator(".ed-btn-verify").count();
  console.log("  VERIFICAR visible en R2 (pintar):", verifyR2, "(esperado 1)");
  await shot("r2-pintar-con-verificar");

  // Marcar 3 palabras (spans tocables) y verificar manualmente para pasar a R3.
  // (No importa acertar; solo avanzar a la ronda de memoria.)
  const tokens = page.locator('[data-qa="zona-central"] span[style*="inline-block"]');
  const tCount = await tokens.count();
  let marked = 0;
  for (let i = 0; i < tCount && marked < 3; i++) {
    await tokens.nth(i).click().catch(() => {});
    marked++;
  }
  await page.waitForTimeout(300);
  await page.locator(".ed-btn-verify").first().click({ timeout: 5000 }).catch(() => console.log("  ⚠ VERIFICAR R2 no clicable"));
  await page.waitForTimeout(2800); // overlay + avance

  // ── R3 (memoria) — sin VERIFICAR, auto-finaliza al emparejar todo.
  await page.waitForSelector('[data-qa="carta-memoria"]', { timeout: 15000 })
    .catch(() => console.log("  ⚠ No llegó a R3 (memoria)"));
  await page.waitForTimeout(500);
  const verifyR3 = await page.locator(".ed-btn-verify").count();
  console.log("  VERIFICAR visible en R3 (memoria):", verifyR3, "(esperado 0)");
  await shot("r3-memoria-sin-verificar");

  // Resolver la memoria por fuerza bruta: probar pares hasta que queden 6 matched.
  async function matchedCount() {
    return await page.locator('[data-qa="carta-memoria"][data-matched="1"]').count();
  }
  const N = await page.locator('[data-qa="carta-memoria"]').count();
  console.log("  Cartas de memoria:", N);
  let safety = 0;
  outer:
  for (let i = 0; i < N; i++) {
    const ci = page.locator(`[data-qa="carta-memoria"][data-idx="${i}"]`);
    if ((await ci.getAttribute("data-matched")) === "1") continue;
    for (let j = i + 1; j < N; j++) {
      if (safety++ > 60) break outer;
      const cj = page.locator(`[data-qa="carta-memoria"][data-idx="${j}"]`);
      if ((await cj.getAttribute("data-matched")) === "1") continue;
      if ((await ci.getAttribute("data-matched")) === "1") break; // i ya emparejada
      await ci.click().catch(() => {});
      await page.waitForTimeout(150);
      await cj.click().catch(() => {});
      await page.waitForTimeout(1000); // match (500) o flip-back (900)
      if ((await ci.getAttribute("data-matched")) === "1") continue outer;
      // si la última pareja disparó el grading, las cartas pueden desaparecer
      if ((await matchedCount()) >= N) break outer;
    }
  }
  await page.waitForTimeout(400);
  await shot("r3-memoria-emparejada");

  // Tras emparejar TODAS, debe auto-finalizar e ir a resultados (sin VERIFICAR).
  await page.waitForFunction(
    () => /Reporte|Resultados|Volver|Jugar de nuevo|reporte/i.test(document.body.innerText),
    { timeout: 15000 }
  ).catch(() => console.log("  ⚠ R3 no auto-finalizó a resultados"));
  await page.waitForTimeout(500);
  await shot("resultados");

  await browser.close();
  if (errors.length) { console.log("\n❌ Errores de consola:"); errors.forEach((e) => console.log("  -", e)); process.exit(1); }
  console.log("\n✅ Sin errores de consola.");
})().catch((e) => { console.error("❌", e); process.exit(1); });
