// qa-checks.js — QA visual del juego-12 ("Te invito a mi fiesta") con Playwright.
// Asume el repo sirviéndose en http://localhost:8765
// Recorre Home → Personaje → Game (R1 Laboratorio mp/mb · R2 Acertijos homófonas ·
// R3 Ruleta formal/coloquial) en 6 viewports, capturando pantallas y errores.

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const URL = "http://localhost:8765/juegos/juego-12/index.html";
const OUT_DIR = path.join(__dirname, "qa-screenshots");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const VIEWPORTS = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1280x800",  width: 1280, height: 800 },
  { name: "1024x768",  width: 1024, height: 768 },
  { name: "768x1024",  width: 768,  height: 1024 },
  { name: "667x375",   width: 667,  height: 375 },
  { name: "375x667",   width: 375,  height: 667 },
];

async function shoot(page, label) {
  const file = path.join(OUT_DIR, `${label}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  📸 ${label}`);
}

async function clickIfEnabled(page, selector) {
  const btn = page.locator(selector).first();
  if (await btn.count() === 0) return false;
  if (await btn.isDisabled().catch(() => true)) return false;
  await btn.click();
  return true;
}

// Mide si algún elemento data-qa se sale del lienzo 900x540 (en sus coords
// internas del DeviceStage) o se solapa groseramente con personaje/acciones.
async function overlapCheck(page) {
  return await page.evaluate(() => {
    function box(sel) {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height, right: r.right, bottom: r.bottom };
    }
    const out = {};
    for (const q of ["hud", "personaje", "acciones", "zona-central", "bandeja", "bocadillo"]) {
      out[q] = box(`[data-qa='${q}']`);
    }
    return out;
  });
}

async function runFlow(browser, vp) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });

  console.log(`\n──── Viewport ${vp.name} ────`);
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);

  // 1. Home
  await shoot(page, `${vp.name}-01-home`);

  // Móvil vertical (portrait pequeño): el shell bloquea con "Gira tu teléfono".
  // Es comportamiento esperado del invariante → solo capturamos el overlay.
  const blocked = await page.locator("[role='dialog'][aria-label*='Gira']").count() > 0;
  if (blocked) {
    console.log("  (portrait bloqueado — overlay esperado)");
    await ctx.close();
    return { errors: [], boxes: {}, blocked: true };
  }

  await page.fill("input.ed-input", "Sofía");
  await page.waitForTimeout(120);
  await page.locator("button:has-text('ENTRAR')").first().click();
  await page.waitForTimeout(500);

  // 2. Personaje
  await shoot(page, `${vp.name}-02-character`);
  await page.locator("button:has-text('¡VAMOS')").first().click();
  await page.waitForTimeout(700);

  // 3. R1 — Shooter (con temporizador): cazar palabras correctas (mp/mb).
  // Se auto-resuelve al cazar la meta o al acabar el tiempo (sin VERIFICAR).
  await shoot(page, `${vp.name}-03-R1`);
  for (let k = 0; k < 120; k++) {
    if (await page.locator("[data-opt]").count() > 0) break; // ya avanzó a R2
    const ok = page.locator("[data-qa='zona-central'] button[data-ok='1']").first();
    if (await ok.count() > 0) {
      await ok.click({ force: true, timeout: 500 }).catch(() => {});
    }
    await page.waitForTimeout(130);
  }
  // Respaldo: esperar a que aparezca la lectura (por si terminó por tiempo).
  await page.waitForSelector("[data-opt]", { timeout: 35000 }).catch(() => {});
  await page.waitForTimeout(300);
  await shoot(page, `${vp.name}-04-R1-fin`);

  // 4. R2 — Lectura con varios huecos: elegir una homófona en CADA selector.
  await shoot(page, `${vp.name}-05-R2`);
  const opts = page.locator("[data-qa='zona-central'] [data-opt]");
  const nOpts = await opts.count();
  for (let i = 0; i < nOpts; i += 2) { // primera mitad de cada par
    await opts.nth(i).click({ force: true }).catch(() => {});
    await page.waitForTimeout(90);
  }
  await shoot(page, `${vp.name}-06-R2-elige`);
  await clickIfEnabled(page, "button:has-text('VERIFICAR')");
  await page.waitForTimeout(2200);

  // 5. R3 — Ruleta de la fiesta (girar → clasificar formal/coloquial)
  await shoot(page, `${vp.name}-07-R3`);
  await clickIfEnabled(page, "button:has-text('GIRAR')");
  await page.waitForTimeout(2700); // espera el giro
  await shoot(page, `${vp.name}-08-R3-girada`);
  const formalBtn = page.locator("button:has-text('Formal')").first();
  if (await formalBtn.count() > 0) {
    await formalBtn.click();
    await page.waitForTimeout(150);
  }
  await shoot(page, `${vp.name}-09-R3-clasifica`);
  // medir cajas en R3
  const boxes = await overlapCheck(page);

  await clickIfEnabled(page, "button:has-text('VERIFICAR')");
  await page.waitForTimeout(2400);

  // 6. Results
  await shoot(page, `${vp.name}-10-results`);

  await ctx.close();
  return { errors, boxes };
}

(async () => {
  console.log("Inicio QA visual juego-12");
  const browser = await chromium.launch();
  const allErrors = {};
  const allBoxes = {};
  for (const vp of VIEWPORTS) {
    try {
      const { errors, boxes } = await runFlow(browser, vp);
      allErrors[vp.name] = errors;
      allBoxes[vp.name] = boxes;
    } catch (e) {
      console.error(`✖ Viewport ${vp.name} falló:`, e.message);
      allErrors[vp.name] = [e.message];
    }
  }
  await browser.close();

  const summary = {
    timestamp: new Date().toISOString(),
    url: URL,
    viewports: VIEWPORTS.map((v) => v.name),
    errors: allErrors,
    boxes: allBoxes,
  };
  fs.writeFileSync(path.join(__dirname, "qa-results.json"), JSON.stringify(summary, null, 2), "utf8");

  console.log("\n══════════════════════════════════════════");
  let totalErr = 0;
  for (const vp of VIEWPORTS) {
    const e = allErrors[vp.name] || [];
    totalErr += e.length;
    if (e.length === 0) console.log(`  ✓ ${vp.name}: sin errores`);
    else console.log(`  ✖ ${vp.name}: ${e.length} error(es)\n${e.map((x) => "    · " + x).join("\n")}`);
  }
  console.log(`\nTotal errores: ${totalErr}`);
  console.log("Resumen en .planning/qa-results.json · Capturas en .planning/qa-screenshots/");
})();
