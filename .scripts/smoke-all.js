// smoke-all.js — Prueba de humo de TODOS los juegos del repo.
// Para cada juego: carga index.html, confirma que React montó, entra hasta la
// pantalla de juego y reporta errores de consola/página. Detecta juegos rotos
// (pantalla en blanco, error de sintaxis, crash al montar/entrar).
//
// Uso: node .scripts/smoke-all.js
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const REPO = path.resolve(__dirname, "..");
const juegosDir = path.join(REPO, "juegos");
const outDir = path.join(REPO, ".scripts", "smoke-shots");
fs.mkdirSync(outDir, { recursive: true });

const slugs = fs.readdirSync(juegosDir)
  .filter((f) => fs.statSync(path.join(juegosDir, f)).isDirectory())
  .sort();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const slug of slugs) {
    const htmlPath = path.join(juegosDir, slug, "index.html");
    if (!fs.existsSync(htmlPath)) { results.push({ slug, ok: false, note: "sin index.html" }); continue; }
    const url = "file://" + htmlPath.replace(/\\/g, "/");
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

    let mounted = false, enteredGame = false, note = "";
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
      await page.waitForSelector("#root *", { timeout: 30000 });
      await page.waitForTimeout(1200);
      mounted = (await page.locator("#root *").count()) > 0;

      // Home → escribir nombre (si hay input) → ENTRAR
      const hasInput = await page.locator("input").count();
      if (hasInput) await page.fill("input", "QA");
      const prim = page.locator(".ed-btn-primary");
      if (await prim.count()) await prim.first().click();
      await page.waitForTimeout(700);
      // Pantalla de personaje → ¡VAMOS!
      const prim2 = page.locator(".ed-btn-primary");
      if (await prim2.count()) await prim2.first().click();
      // ¿Llegó a la pantalla de juego?
      await page.waitForSelector('[data-qa="zona-central"], [data-qa="hud"], [data-qa="acciones"]', { timeout: 15000 });
      await page.waitForTimeout(800);
      enteredGame = true;
    } catch (e) {
      note = "no entró al juego: " + String(e.message).slice(0, 80);
    }

    await page.screenshot({ path: path.join(outDir, slug + ".png") }).catch(() => {});
    const ok = mounted && enteredGame && errors.length === 0;
    results.push({ slug, ok, mounted, enteredGame, errs: errors.length, note, sample: errors.slice(0, 2) });
    console.log(`${ok ? "✅" : "❌"} ${slug.padEnd(18)} montó=${mounted} juego=${enteredGame} errores=${errors.length}${note ? " · " + note : ""}`);
    if (errors.length) errors.slice(0, 3).forEach((e) => console.log("      ↳", e.slice(0, 120)));
    await page.close();
  }

  await browser.close();
  const bad = results.filter((r) => !r.ok);
  console.log(`\n${"=".repeat(48)}`);
  console.log(`Total: ${results.length} · OK: ${results.length - bad.length} · CON PROBLEMAS: ${bad.length}`);
  if (bad.length) { console.log("Revisar:", bad.map((b) => b.slug).join(", ")); process.exit(1); }
  console.log("✅ Todos los juegos cargan, montan y entran al juego sin errores.");
})().catch((e) => { console.error("❌ smoke-all falló:", e); process.exit(1); });
