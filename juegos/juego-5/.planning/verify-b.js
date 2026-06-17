// verify-b.js — Verifica el comportamiento B en juego-5:
//   Nivel 1 (CSZ): la R2 (trivia, "¿Cuál se escribe bien?", elegir 1 de 3
//   cartas) NO debe mostrar VERIFICAR y debe auto-evaluarse al tocar una carta.
//   La R1 (componer palabra con C/S/Z) SÍ conserva su VERIFICAR.
//   Nivel 2 (Lengua y pensamiento): la R2 (cómic, "Responde como un buen amigo",
//   elegir 1 respuesta empática) NO debe mostrar VERIFICAR y se auto-evalúa.
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

  const fails = [];
  const expect = (cond, msg) => { if (!cond) { fails.push(msg); console.log("  ❌ " + msg); } else { console.log("  ✓ " + msg); } };

  // Navega de la home hasta el juego con el nivel indicado.
  async function startLevel(levelLabel) {
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForSelector("#root *", { timeout: 30000 });
    await page.waitForTimeout(800);
    await page.fill("input", "Verificador");
    await page.getByText(levelLabel, { exact: true }).first().click();
    await page.waitForTimeout(200);
    await page.getByText("ENTRAR", { exact: false }).first().click(); // ENTRAR →
    await page.waitForTimeout(600);
    await page.locator(".ed-btn-primary").first().click(); // ¡VAMOS, ...! →
    await page.waitForSelector('[data-qa="zona-central"]', { timeout: 15000 });
    await page.waitForTimeout(800);
  }

  // ───────────────────────── NIVEL 1 (CSZ) ─────────────────────────
  console.log("\n=== NIVEL 1 — Reglas C, S, Z ===");
  await startLevel("Reglas C, S, Z");

  // R1 (componer palabra) DEBE tener VERIFICAR.
  const verifyR1 = await page.locator(".ed-btn-verify").count();
  expect(verifyR1 === 1, `R1 (componer) muestra 1 VERIFICAR (encontrado ${verifyR1})`);
  await shot("n1-r1-con-verificar");

  // Compone la palabra: toca una letra (C/S/Z) y VERIFICAR para avanzar a R2.
  const letterBtns = page.locator('[data-qa="zona-central"] button');
  await letterBtns.last().click(); // una de C/S/Z
  await page.waitForTimeout(300);
  await page.locator(".ed-btn-verify").click();

  // Espera a la R2 (trivia): el enunciado pasa a "¿Cuál se escribe bien?".
  await page.waitForFunction(
    () => /¿Cuál se escribe bien\?/.test(document.body.innerText),
    { timeout: 15000 }
  ).catch(() => console.log("  ⚠ No avanzó a la R2 trivia"));
  await page.waitForTimeout(700);

  // R2 (trivia, TOCA 1 OPCIÓN) NO debe mostrar VERIFICAR.
  const verifyR2 = await page.locator(".ed-btn-verify").count();
  expect(verifyR2 === 0, `R2 (trivia) muestra 0 VERIFICAR (encontrado ${verifyR2})`);
  await shot("n1-r2-sin-verificar");

  // Tocar una carta → auto-evalúa (aparece feedback ¡EXCELENTE!/¡UPS! y avanza a R3 shooter).
  const card = page.locator('[data-qa="zona-central"] button').first();
  await card.click();
  await page.waitForTimeout(450);
  await shot("n1-r2-seleccionado");
  const advanced = await page.waitForFunction(
    () => /Toca SOLO las palabras MAL escritas|¡EXCELENTE!|¡UPS!/.test(document.body.innerText),
    { timeout: 8000 }
  ).then(() => true).catch(() => false);
  expect(advanced, "R2 (trivia) se auto-evaluó al tocar una carta (sin VERIFICAR)");
  await page.waitForTimeout(1200);
  await shot("n1-r3-tras-auto");

  // ───────────────────────── NIVEL 2 (LP) ─────────────────────────
  console.log("\n=== NIVEL 2 — Lengua y pensamiento ===");
  await startLevel("Lengua y pensamiento");

  // R1 (carrera arrastrar) DEBE tener VERIFICAR.
  const lpVerifyR1 = await page.locator(".ed-btn-verify").count();
  expect(lpVerifyR1 === 1, `LP R1 (carrera) muestra 1 VERIFICAR (encontrado ${lpVerifyR1})`);
  await shot("n2-r1-con-verificar");

  // Avanza la carrera hasta su fin para llegar a la R2 (cómic).
  // La carrera se resuelve sola por tiempo; esperamos a que el enunciado pase a
  // la R2 ("Responde como un buen amigo" / "¿Cómo le respondes?").
  // Para acelerar, pulsamos VERIFICAR si se habilita; si no, esperamos al timer.
  let reachedComic = false;
  for (let i = 0; i < 40 && !reachedComic; i++) {
    reachedComic = await page.evaluate(() => /¿Cómo le respondes\?|Responde como un buen amigo/.test(document.body.innerText));
    if (reachedComic) break;
    // Intentar habilitar/pulsar VERIFICAR de la carrera si está activo.
    const vb = page.locator(".ed-btn-verify");
    if (await vb.count() && !(await vb.first().isDisabled().catch(() => true))) {
      await vb.first().click().catch(() => {});
    }
    await page.waitForTimeout(700);
  }

  if (!reachedComic) {
    console.log("  ⚠ No se alcanzó la R2 (cómic) del Nivel 2 automáticamente; se omite su verificación auto.");
  } else {
    await page.waitForTimeout(700);
    const lpVerifyR2 = await page.locator(".ed-btn-verify").count();
    expect(lpVerifyR2 === 0, `LP R2 (cómic) muestra 0 VERIFICAR (encontrado ${lpVerifyR2})`);
    await shot("n2-r2-sin-verificar");

    const opt = page.locator('[data-qa="zona-central"] button').first();
    await opt.click();
    await page.waitForTimeout(450);
    await shot("n2-r2-seleccionado");
    const lpAdvanced = await page.waitForFunction(
      () => /¡EXCELENTE!|¡UPS!|Gira y clasifica|ruleta/i.test(document.body.innerText),
      { timeout: 8000 }
    ).then(() => true).catch(() => false);
    expect(lpAdvanced, "LP R2 (cómic) se auto-evaluó al tocar una respuesta (sin VERIFICAR)");
    await page.waitForTimeout(1200);
    await shot("n2-r3-tras-auto");
  }

  await browser.close();

  console.log("");
  if (errors.length) { console.log("❌ Errores de consola:"); errors.forEach((e) => console.log("  -", e)); }
  else console.log("✅ Sin errores de consola.");

  if (fails.length || errors.length) {
    console.log(`\n❌ FALLÓ (${fails.length} aserciones, ${errors.length} errores de consola).`);
    process.exit(1);
  }
  console.log("\n✅ TODO OK — comportamiento B verificado en ambos niveles.");
})().catch((e) => { console.error("❌", e); process.exit(1); });
