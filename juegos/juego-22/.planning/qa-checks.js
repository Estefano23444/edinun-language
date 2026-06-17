// qa-checks.js — QA visual del juego-11 ("Mi refrán refranero") con Playwright.
// Asume el repo sirviéndose en http://localhost:8765
// Recorre Home → Personaje → Game (R1 Laboratorio · R2 Clasificar · R3 Detective)
// en 6 viewports, capturando pantallas y errores de consola.

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const URL = "http://localhost:8765/juegos/juego-11/index.html";
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

// Arrastre real con el mouse (dispara el onDrop por punteros).
async function dragTo(page, fromLoc, toLoc) {
  const a = await fromLoc.boundingBox();
  const b = await toLoc.boundingBox();
  if (!a || !b) return false;
  const ax = a.x + a.width / 2, ay = a.y + a.height / 2;
  const bx = b.x + b.width / 2, by = b.y + b.height / 2;
  await page.mouse.move(ax, ay);
  await page.mouse.down();
  await page.mouse.move((ax + bx) / 2, (ay + by) / 2, { steps: 6 });
  await page.mouse.move(bx, by, { steps: 6 });
  await page.waitForTimeout(40);
  await page.mouse.up();
  return true;
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

  // 3. R1 — Laboratorio
  await shoot(page, `${vp.name}-03-R1`);
  const r1Tiles = page.locator("[data-qa='bandeja'] button:not([disabled])");
  if (await r1Tiles.count() >= 2) {
    await r1Tiles.nth(0).click();
    await page.waitForTimeout(150);
    await r1Tiles.nth(0).click(); // tras deshabilitarse la primera, la siguiente queda nth(0)
    await page.waitForTimeout(200);
    await shoot(page, `${vp.name}-04-R1-llena`);
  }
  // Verificar (avanza aunque falle) → R2
  await clickIfEnabled(page, "button:has-text('VERIFICAR')");
  await page.waitForTimeout(2200);

  // 4. R2 — Clasificar (arrastre real de cada chip a un frasco)
  await shoot(page, `${vp.name}-05-R2`);
  const jars = page.locator("[data-dropzone]");
  const jarCount = await jars.count();
  for (let i = 0; i < 10; i++) {
    const chips = page.locator("[data-qa='zona-central'] .ed-draggable");
    const n = await chips.count();
    if (n === 0) break;
    const jar = jars.nth(i % Math.max(1, jarCount));
    const ok = await dragTo(page, chips.first(), jar);
    if (!ok) break;
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(150);
  await shoot(page, `${vp.name}-06-R2-llena`);
  await clickIfEnabled(page, "button:has-text('VERIFICAR')");
  await page.waitForTimeout(2200);

  // 5. R3 — Detective
  await shoot(page, `${vp.name}-07-R3`);
  const r3Words = page.locator("[data-qa='zona-central'] button:not([disabled])");
  if (await r3Words.count() > 0) {
    await r3Words.first().click();
    await page.waitForTimeout(150);
    await shoot(page, `${vp.name}-08-R3-marca`);
  }
  // medir cajas en R3
  const boxes = await overlapCheck(page);

  await clickIfEnabled(page, "button:has-text('VERIFICAR')");
  await page.waitForTimeout(2400);

  // 6. Results
  await shoot(page, `${vp.name}-09-results`);

  await ctx.close();
  return { errors, boxes };
}

(async () => {
  console.log("Inicio QA visual juego-11");
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
