// verify-game.js — Verificación visual automática de un juego EDINUN.
//
// Abre el juego en Chromium (Playwright), lo juega de principio a fin
// (Home → personaje → R1 → R2 → R3 → Resultados), guarda una captura de
// cada pantalla y reporta cualquier error de consola.
//
// Uso:
//   node .scripts/verify-game.js [slug] [--headed]
//   (slug por defecto: juego-22)
//   --headed  → abre una ventana visible del navegador (por defecto headless).
//   También: HEADED=1 node .scripts/verify-game.js
//
// Requisitos: `npm install` y el navegador de Playwright instalado
//   node node_modules/playwright/cli.js install chromium
//
// Nota: el HTML carga React/Babel desde unpkg (CDN), así que la
// verificación necesita conexión a internet.

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const argv = process.argv.slice(2);
const headed = argv.includes("--headed") || process.env.HEADED === "1";
const slug = argv.find((a) => !a.startsWith("--")) || "juego-22";
const ROOT = path.resolve(__dirname, "..");
const htmlPath = path.join(ROOT, "juegos", slug, "index.html");
const outDir = path.join(ROOT, "juegos", slug, ".planning", "verify-shots");

if (!fs.existsSync(htmlPath)) {
  console.error("❌ No existe:", htmlPath);
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });

const url = "file://" + htmlPath.replace(/\\/g, "/");
const OPT = '[data-qa="zona-central"] button:not(.ed-btn-primary):not([disabled])';

(async () => {
  const browser = await chromium.launch({ headless: !headed, slowMo: headed ? 250 : 0 });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

  const shot = async (name) => {
    await page.screenshot({ path: path.join(outDir, name + ".png") });
    console.log("  📸", name);
  };

  console.log("▶ Verificando", slug, "\n  " + url + "\n");
  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });

  // Esperar a que Babel compile y React monte algo.
  await page.waitForSelector("#root *", { timeout: 30000 });
  await page.waitForTimeout(1200);
  await shot("1-home");

  // HOME — nombre + ENTRAR
  await page.fill("input", "Verificador");
  await page.click(".ed-btn-primary");
  await page.waitForTimeout(900);
  await shot("2-personaje");

  // PERSONAJE — ¡VAMOS! →
  await page.click(".ed-btn-primary");
  await page.waitForSelector('[data-qa="zona-central"]', { timeout: 15000 });
  await page.waitForTimeout(800);
  await shot("3-ronda1");

  // R1 (shooter) — se auto-termina a los 16 s. Esperamos a que aparezca R2.
  await page.waitForFunction(
    () => /Modera el coloquio/.test(document.body.innerText),
    { timeout: 30000 }
  );
  await page.waitForTimeout(700);
  await shot("4-ronda2");

  // R2 (coloquio) — 3 fases: seleccionar opción + VERIFICAR (rail). Tras
  // calificar, la fase avanza sola (~1.8-3 s).
  for (let i = 0; i < 3; i++) {
    await page.locator(OPT).first().click();   // selecciona
    await page.waitForTimeout(400);
    if (i === 0) await shot("4b-ronda2-seleccion"); // opción marcada + VERIFICAR activo
    await page.locator(".ed-btn-verify").click(); // VERIFICAR
    await page.waitForTimeout(5400);            // espera el auto-avance (5 s si falla)
  }

  // R3 (memoria) — esperar el tablero de cartas.
  await page.waitForFunction(
    () => document.querySelectorAll('[data-qa="memo-card"]').length > 0,
    { timeout: 20000 }
  );
  await page.waitForTimeout(500);
  await shot("5-ronda3-memoria");

  // Resolver: agrupar índices de carta por data-pair y voltear cada pareja.
  const pairGroups = await page.$$eval('[data-qa="memo-card"]', (els) => {
    const m = {};
    els.forEach((e, i) => {
      const p = e.getAttribute("data-pair");
      (m[p] = m[p] || []).push(i);
    });
    return Object.values(m);
  });
  for (let g = 0; g < pairGroups.length; g++) {
    const [a, b] = pairGroups[g];
    const cardsNow = await page.$$('[data-qa="memo-card"]');
    await cardsNow[a].click();
    await page.waitForTimeout(250);
    await cardsNow[b].click();
    await page.waitForTimeout(450);
    if (g === 1) await shot("5b-ronda3-emparejando"); // 2 parejas a la vista
  }

  // RESULTADOS
  await page.waitForFunction(
    () => /Ronda completa/.test(document.body.innerText),
    { timeout: 15000 }
  ).catch(() => console.log("  ⚠ No se detectó 'Ronda completa' (revisa la captura)"));
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
