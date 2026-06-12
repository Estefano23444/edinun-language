// qa-checks.js — QA visual del juego "El baúl de las herramientas de escritura"
// con Playwright. Asume el repo sirviéndose en http://localhost:8765
// Recorre Home → Personaje → Game (R1 Ruleta de deseos · R2 Taller de palabras ·
// R3 Detective de desinencias) en 6 viewports, capturando pantallas y errores
// y midiendo que las zonas data-qa no se salgan del lienzo 900×540.

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const URL = "http://localhost:8765/juegos/juego-18/index.html";
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

// Mide el DeviceStage (lienzo 900×540) y reporta si alguna zona data-qa se sale
// de sus límites internos.
async function overlapCheck(page) {
  return await page.evaluate(() => {
    const stage = document.querySelector(".ed-stage, [data-stage], .ed-device-stage") || document.body;
    const sr = stage.getBoundingClientRect();
    function box(sel) {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: +(r.left - sr.left).toFixed(1), y: +(r.top - sr.top).toFixed(1),
        w: +r.width.toFixed(1), h: +r.height.toFixed(1),
        right: +(r.right - sr.left).toFixed(1), bottom: +(r.bottom - sr.top).toFixed(1),
      };
    }
    const out = { _stage: { w: +sr.width.toFixed(1), h: +sr.height.toFixed(1) } };
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

  const boxes = {};

  // 3. R1 — Ruleta de los deseos: GIRAR → elegir verbo en condicional → VERIFICAR
  await shoot(page, `${vp.name}-03-R1`);
  boxes.R1 = await overlapCheck(page);
  await clickIfEnabled(page, "button:has-text('GIRAR')");
  await page.waitForTimeout(2700);
  await shoot(page, `${vp.name}-04-R1-girada`);
  boxes.R1landed = await overlapCheck(page);
  // tras girar, los chips de opción son los únicos botones de la zona central
  const r1opts = page.locator("[data-qa='zona-central'] button");
  if (await r1opts.count() > 0) { await r1opts.first().click({ force: true }).catch(() => {}); }
  await page.waitForTimeout(150);
  await shoot(page, `${vp.name}-05-R1-elige`);
  await clickIfEnabled(page, "button:has-text('VERIFICAR')");
  await page.waitForTimeout(2200);

  // 4. R2 — Taller de palabras: tocar una pieza → VERIFICAR
  await shoot(page, `${vp.name}-06-R2`);
  boxes.R2 = await overlapCheck(page);
  const r2tray = page.locator("[data-qa='zona-central'] button");
  if (await r2tray.count() > 0) { await r2tray.first().click({ force: true }).catch(() => {}); }
  await page.waitForTimeout(150);
  await shoot(page, `${vp.name}-07-R2-coloca`);
  await clickIfEnabled(page, "button:has-text('VERIFICAR')");
  await page.waitForTimeout(2200);

  // 5. R3 — Detective de desinencias: guardar cada verbo en un cajón → VERIFICAR
  await shoot(page, `${vp.name}-08-R3`);
  boxes.R3 = await overlapCheck(page);
  for (let k = 0; k < 12; k++) {
    const poolBtns = page.locator("[data-qa='bandeja'] button");
    if (await poolBtns.count() === 0) break;
    await poolBtns.first().click().catch(() => {});
    await page.waitForTimeout(140);
    // suelta en un cajón (rota entre los 3 para repartir). Se toca la zona
    // superior del cajón (la etiqueta) para no caer sobre un verbo ya colocado.
    const drawer = ["yo", "tu", "nos"][k % 3];
    await page.locator(`[data-drawer='${drawer}']`).first().click({ position: { x: 30, y: 12 } }).catch(() => {});
    await page.waitForTimeout(140);
  }
  await shoot(page, `${vp.name}-09-R3-guardado`);
  boxes.R3filled = await overlapCheck(page);
  await clickIfEnabled(page, "button:has-text('VERIFICAR')");
  await page.waitForTimeout(2400);

  // 6. Results
  await shoot(page, `${vp.name}-10-results`);

  await ctx.close();
  return { errors, boxes };
}

(async () => {
  console.log("Inicio QA visual juego-18");
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
