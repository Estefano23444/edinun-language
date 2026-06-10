// qa-verify-r1.js — Verifica el tablero R1 rediseñado:
// 1) VERIFICAR deshabilitado hasta elegir; 2) no auto-avanza al tocar;
// 3) cada casilla se marca verde/roja y SIEMPRE avanza;
// 4) se recorren las 4 casillas y pasa a R2.
const { chromium } = require("playwright");
const path = require("path");

const URL = "http://localhost:8766/juegos/juego-15/index.html";

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.fill("input.ed-input", "Sofía");
  await page.locator("button:has-text('ENTRAR')").first().click();
  await page.waitForTimeout(300);
  await page.locator("button:has-text('¡VAMOS')").first().click();
  await page.waitForTimeout(600);

  const casilla = async () => (await page.locator("text=/Casilla \\d de 4/").first().innerText()).replace(/\D/g, "").slice(0, 1);
  const verifyDisabled = () => page.locator("button:has-text('VERIFICAR')").first().isDisabled();
  // cuenta nodos del camino por color (verde acierto, rojo fallo)
  const colores = () => page.evaluate(() => {
    const out = { verde: 0, rojo: 0 };
    document.querySelectorAll("[data-qa='bandeja'] > * > div, [data-qa='bandeja'] div").forEach((d) => {
      const bg = getComputedStyle(d).backgroundImage || "";
      if (/46,\s*204,\s*143/.test(bg)) out.verde++;       // #2ecc8f
      if (/255,\s*107,\s*107/.test(bg)) out.rojo++;        // #ff6b6b
    });
    return out;
  });

  const r = { pasos: [] };
  r.verifyAntesDeElegir = await verifyDisabled();   // true esperado
  const c0 = await casilla();

  // Recorrer las 4 casillas: elegir 1ª opción + VERIFICAR
  for (let k = 0; k < 4; k++) {
    const before = await casilla();
    await page.locator("[data-qa='zona-central'] button").first().click();
    await page.waitForTimeout(700);
    const afterPick = await casilla(); // no debe cambiar al solo elegir
    await page.locator("button:has-text('VERIFICAR')").first().click();
    await page.waitForTimeout(1500);
    r.pasos.push({ k: k + 1, before, afterPick });
    if (k === 1) { await page.screenshot({ path: path.join(__dirname, "qa-r1-colores.png") }); r.coloresEnCasilla3 = await colores(); }
  }
  await page.waitForTimeout(1200); // transición a R2

  // ¿Llegamos a R2? (enunciado de la línea del tiempo)
  r.enR2 = await page.locator("text=Ordena los momentos").count() > 0;
  r.errores = errs;
  console.log(JSON.stringify(r, null, 2));

  const noAutoAvance = r.pasos.every((p) => p.before === p.afterPick);
  const huboColores = r.coloresEnCasilla3 && (r.coloresEnCasilla3.verde + r.coloresEnCasilla3.rojo) >= 1;
  const ok = r.verifyAntesDeElegir === true && noAutoAvance && huboColores && r.enR2 && errs.length === 0;
  console.log("\nRESULTADO:", ok ? "✓ tablero R1 OK (verde/rojo, sin auto-avance, recorre todo y pasa a R2)" : "✖ revisar");
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
