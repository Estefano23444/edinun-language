// qa-all-rondas.js — captura las 6 rondas usando window.__qa_skip
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const URL = "http://localhost:8765/juegos/juego-6/index.html";
const OUT = path.join(__dirname, "qa-screenshots");
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

async function shot(p, n) {
  await p.screenshot({ path: path.join(OUT, `${n}.png`), fullPage: false });
  console.log(`  📸 ${n}`);
}

async function start(browser, vp, levelText) {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.locator(`button:has-text('${levelText}')`).first().click();
  await page.fill("input.ed-input", "Sofía");
  await page.waitForTimeout(100);
  await page.locator("button:has-text('ENTRAR')").first().click();
  await page.waitForTimeout(400);
  await page.locator("button:has-text('¡VAMOS')").first().click();
  await page.waitForTimeout(700);
  return { ctx, page };
}

async function skip(page) {
  await page.evaluate(() => { if (window.__qa_skip) window.__qa_skip(); });
  await page.waitForTimeout(450);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const vp = { width: 1280, height: 800 };

  // ── Nivel 1
  {
    const { ctx, page } = await start(browser, vp, "Texto poético");
    await shot(page, "ALL-N1R1-ruleta");
    await skip(page);
    await shot(page, "ALL-N1R2-detective");
    await skip(page);
    await shot(page, "ALL-N1R3-memoria");
    await ctx.close();
  }

  // ── Nivel 2
  {
    const { ctx, page } = await start(browser, vp, "Texto instructivo");
    await shot(page, "ALL-N2R1-kichwa");
    await skip(page);
    await shot(page, "ALL-N2R2-receta");
    await skip(page);
    await shot(page, "ALL-N2R3-laboratorio");
    await ctx.close();
  }

  await browser.close();
  console.log("Listo.");
})();
