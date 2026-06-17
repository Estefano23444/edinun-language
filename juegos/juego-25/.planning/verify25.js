// verify25.js — Verificación visual del juego-25 "Otras palabras, otros mundos".
// Juega Home → personaje → R1 (deslizar) → R2 (rescate) → R3 (medidor) →
// Resultados, captura cada pantalla y reporta errores de consola.
//
// Uso: node juegos/juego-25/.planning/verify25.js [--headed]
// Requiere internet (React/Babel desde unpkg).

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const argv = process.argv.slice(2);
const headed = argv.includes("--headed") || process.env.HEADED === "1";
const ROOT = path.resolve(__dirname, "..", "..", "..");
const htmlPath = path.join(__dirname, "..", "index.html");
const outDir = path.join(__dirname, "verify-shots");
fs.mkdirSync(outDir, { recursive: true });
const url = "file://" + htmlPath.replace(/\\/g, "/");

(async () => {
  const browser = await chromium.launch({ headless: !headed, slowMo: headed ? 200 : 0 });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

  const shot = async (name) => {
    await page.screenshot({ path: path.join(outDir, name + ".png") });
    console.log("  📸", name);
  };

  console.log("▶ Verificando juego-25\n  " + url + "\n");
  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForSelector("#root *", { timeout: 30000 });
  await page.waitForTimeout(1200);
  await shot("1-home");

  // HOME → ENTRAR
  await page.fill("input", "Verificador");
  await page.click(".ed-btn-primary");
  await page.waitForTimeout(900);
  await shot("2-personaje");

  // PERSONAJE → ¡VAMOS!
  await page.click(".ed-btn-primary");
  await page.waitForSelector('[data-qa="zona-central"]', { timeout: 15000 });
  await page.waitForTimeout(700);
  await shot("3-ronda1-swipe");

  // R1 — deslizar: 8 cartas. Clic alternando los dos botones para vaciar el mazo.
  for (let i = 0; i < 8; i++) {
    const btns = page.locator('[data-qa="zona-central"] button');
    const n = await btns.count();
    if (n < 2) break;
    // botón izquierdo = ESTEREOTIPO, derecho = INCLUSIVO
    await btns.nth(i % 2).click().catch(() => {});
    await page.waitForTimeout(620);
  }

  // R2 — rescate
  await page.waitForFunction(
    () => /mantienen viva la lengua/.test(document.body.innerText),
    { timeout: 20000 }
  );
  await page.waitForTimeout(700);
  await shot("4-ronda2-rescate");
  // Tocar las 6 acciones (las 3 buenas terminan la ronda).
  for (let i = 0; i < 6; i++) {
    const cards = page.locator('[data-qa="zona-central"] button');
    const n = await cards.count();
    if (i >= n) break;
    await cards.nth(i).click().catch(() => {});
    await page.waitForTimeout(300);
  }

  // R3 — medidor
  await page.waitForFunction(
    () => /cuánta razón tiene/.test(document.body.innerText),
    { timeout: 20000 }
  );
  await page.waitForTimeout(700);
  await shot("5-ronda3-medidor");
  // 3 afirmaciones: clic en la zona derecha del medidor y VERIFICAR.
  for (let i = 0; i < 3; i++) {
    const track = page.locator('[data-qa="zona-central"] .ed-draggable').first();
    const box = await track.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width * 0.85, box.y + box.height / 2);
      await page.waitForTimeout(300);
    }
    if (i === 0) await shot("5b-ronda3-marcado");
    await page.locator(".ed-btn-verify").click().catch(() => {});
    await page.waitForTimeout(4700);
  }

  // RESULTADOS
  await page.waitForFunction(
    () => /Ronda completa/.test(document.body.innerText),
    { timeout: 15000 }
  ).catch(() => console.log("  ⚠ No se detectó 'Ronda completa'"));
  await page.waitForTimeout(800);
  await shot("6-resultados");

  await browser.close();
  console.log("\nCapturas en:", outDir);
  if (errors.length) {
    console.log("\n❌ Errores de consola (" + errors.length + "):");
    for (const e of errors) console.log("   -", e);
    process.exit(1);
  }
  console.log("\n✅ Sin errores de consola.");
})().catch((e) => { console.error("\n❌ Falló la verificación:\n", e); process.exit(1); });
