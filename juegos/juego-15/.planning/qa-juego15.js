// qa-juego15.js — QA visual de juego-15 ("El cuaderno de mis memorias").
// Flujo Home → Personaje → R1 (camino) · R2 (línea del tiempo) · R3 (tono justo)
// en 6 viewports. Captura pantallas, errores de consola y desbordes del lienzo.
// Requiere el repo servido en http://localhost:8765

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const URL = "http://localhost:8765/juegos/juego-15/index.html";
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
  await page.screenshot({ path: path.join(OUT_DIR, `${label}.png`), fullPage: false });
  console.log(`  📸 ${label}`);
}

// Mide desbordes: cada zona data-qa debe quedar dentro del lienzo (offsetParent
// del HUD = el DeviceStage escalado). Tolerancia 3px.
async function overflowCheck(page) {
  return await page.evaluate(() => {
    const hud = document.querySelector("[data-qa='hud']");
    if (!hud) return { stage: null, issues: ["no hud"] };
    const stageEl = hud.offsetParent || hud.parentElement;
    const s = stageEl.getBoundingClientRect();
    const issues = [];
    const zones = ["hud", "personaje", "acciones", "zona-central", "bandeja", "bocadillo"];
    for (const q of zones) {
      const el = document.querySelector(`[data-qa='${q}']`);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const t = 3;
      if (r.left < s.left - t || r.right > s.right + t || r.top < s.top - t || r.bottom > s.bottom + t) {
        issues.push(`${q} fuera del lienzo (z:${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)} vs stage ${Math.round(s.left)},${Math.round(s.top)},${Math.round(s.right)},${Math.round(s.bottom)})`);
      }
    }
    return { stage: { w: Math.round(s.width), h: Math.round(s.height) }, issues };
  });
}

async function clickIfEnabled(page, selector) {
  const btn = page.locator(selector).first();
  if (await btn.count() === 0) return false;
  if (await btn.isDisabled().catch(() => true)) return false;
  await btn.click();
  return true;
}

async function runFlow(browser, vp) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  const errors = [];
  const overflows = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });

  console.log(`\n──── Viewport ${vp.name} ────`);
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await shoot(page, `${vp.name}-01-home`);

  const blocked = await page.locator("[role='dialog'][aria-label*='Gira']").count() > 0;
  if (blocked) {
    console.log("  (portrait bloqueado — overlay esperado)");
    await ctx.close();
    return { errors: [], overflows: [], blocked: true };
  }

  await page.fill("input.ed-input", "Sofía");
  await page.waitForTimeout(120);
  await page.locator("button:has-text('ENTRAR')").first().click();
  await page.waitForTimeout(450);

  await shoot(page, `${vp.name}-02-character`);
  await page.locator("button:has-text('¡VAMOS')").first().click();
  await page.waitForTimeout(700);

  // ── R1 — El camino de los recuerdos (4 casillas)
  await shoot(page, `${vp.name}-03-R1`);
  let of = await overflowCheck(page); if (of.issues.length) overflows.push(`R1: ${of.issues.join("; ")}`);
  for (let k = 0; k < 4; k++) {
    const opt = page.locator("[data-qa='zona-central'] button:not([disabled])").first();
    if (await opt.count() === 0) break;
    await opt.click().catch(() => {});
    await page.waitForTimeout(k === 3 ? 900 : 1250);
  }
  // R1 llama answer → overlay feedback → R2
  await page.waitForTimeout(1800);

  // ── R2 — La línea del tiempo (colocar 3 fragmentos por tap)
  await shoot(page, `${vp.name}-05-R2`);
  of = await overflowCheck(page); if (of.issues.length) overflows.push(`R2: ${of.issues.join("; ")}`);
  for (let k = 0; k < 3; k++) {
    const chip = page.locator("[data-qa='zona-central'] .ed-draggable").first();
    if (await chip.count() === 0) break;
    await chip.click().catch(() => {});
    await page.waitForTimeout(120);
    const slot = page.locator("[data-dropzone^='slot']").nth(k);
    await slot.click().catch(() => {});
    await page.waitForTimeout(150);
  }
  await shoot(page, `${vp.name}-06-R2-llena`);
  await clickIfEnabled(page, "button:has-text('VERIFICAR')");
  await page.waitForTimeout(2300);

  // ── R3 — El tono justo (elegir un final + VERIFICAR)
  await shoot(page, `${vp.name}-07-R3`);
  of = await overflowCheck(page); if (of.issues.length) overflows.push(`R3: ${of.issues.join("; ")}`);
  const opt3 = page.locator("[data-qa='bandeja'] button:not([disabled])").first();
  if (await opt3.count() > 0) { await opt3.click().catch(() => {}); await page.waitForTimeout(180); }
  await shoot(page, `${vp.name}-08-R3-marca`);
  await clickIfEnabled(page, "button:has-text('VERIFICAR')");
  await page.waitForTimeout(2400);

  await shoot(page, `${vp.name}-09-results`);
  await ctx.close();
  return { errors, overflows, blocked: false };
}

(async () => {
  console.log("Inicio QA visual juego-15");
  const browser = await chromium.launch();
  const allErrors = {}, allOverflows = {};
  for (const vp of VIEWPORTS) {
    try {
      const { errors, overflows } = await runFlow(browser, vp);
      allErrors[vp.name] = errors || [];
      allOverflows[vp.name] = overflows || [];
    } catch (e) {
      console.error(`✖ Viewport ${vp.name} falló:`, e.message);
      allErrors[vp.name] = [e.message];
      allOverflows[vp.name] = [];
    }
  }
  await browser.close();

  const summary = {
    timestamp: new Date().toISOString(), url: URL,
    viewports: VIEWPORTS.map((v) => v.name),
    errors: allErrors, overflows: allOverflows,
  };
  fs.writeFileSync(path.join(__dirname, "qa-results.json"), JSON.stringify(summary, null, 2), "utf8");

  console.log("\n══════════════════════════════════════════");
  let totalErr = 0, totalOf = 0;
  for (const vp of VIEWPORTS) {
    const e = allErrors[vp.name] || [], o = allOverflows[vp.name] || [];
    totalErr += e.length; totalOf += o.length;
    const tag = (e.length === 0 && o.length === 0) ? "✓" : "✖";
    console.log(`  ${tag} ${vp.name}: ${e.length} err, ${o.length} desborde(s)`);
    e.forEach((x) => console.log("      · err: " + x));
    o.forEach((x) => console.log("      · of:  " + x));
  }
  console.log(`\nTotal errores consola: ${totalErr} · Total desbordes: ${totalOf}`);
})();
