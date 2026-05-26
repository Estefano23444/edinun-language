// Captura cada ronda de juego-5 para inspección de centrado.
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const URL = "http://localhost:8766/juegos/juego-5/index.html";
const OUT = path.resolve(__dirname, "qa-screenshots");
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

async function startGame(page, temaText) {
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.fill("input", "QA");
  await page.locator(`text=${temaText}`).first().click();
  await page.waitForTimeout(200);
  await page.click("text=ENTRAR");
  await page.waitForTimeout(700);
  const verne = page.locator("text=Verne").first();
  if (await verne.count() > 0) await verne.click();
  await page.waitForTimeout(300);
  const vamos = page.locator("button:has-text('VAMOS')");
  if (await vamos.count() > 0) await vamos.click();
  await page.waitForTimeout(900);
}

async function advanceWithVerificar(page) {
  // Intenta clickear primera opción y verificar
  const btn = page.locator("[data-qa='zona-central'] button").first();
  if (await btn.count() > 0) await btn.click();
  await page.waitForTimeout(200);
  const verificar = page.locator("button:has-text('VERIFICAR')");
  if (await verificar.count() > 0) {
    try { await verificar.click({ timeout: 5000 }); } catch {}
  }
  await page.waitForTimeout(2800);
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  ctx.on("page", (p) => p.on("pageerror", (e) => console.log("ERR:", e.message)));

  // T1 (Reglas C, S, Z): R1 Completa, R2 Trivia, R3 Shooter
  {
    const page = await ctx.newPage();
    await startGame(page, "Reglas C, S, Z");
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, "t1-r1-completa.png") });
    // Avanzar a R2
    await page.evaluate(() => {
      const zone = document.querySelector("[data-qa='zona-central']");
      if (zone) {
        const btns = zone.querySelectorAll("button");
        if (btns[0]) btns[0].click();
      }
    });
    await page.waitForTimeout(300);
    try { await page.click("button:has-text('VERIFICAR')", { timeout: 5000 }); } catch {}
    await page.waitForTimeout(2800);
    await page.screenshot({ path: path.join(OUT, "t1-r2-trivia.png") });
    // R3 Shooter — solo capturar inicio
    await page.evaluate(() => {
      const zone = document.querySelector("[data-qa='zona-central']");
      if (zone) {
        const btns = zone.querySelectorAll("button");
        if (btns[0]) btns[0].click();
      }
    });
    await page.waitForTimeout(300);
    try { await page.click("button:has-text('VERIFICAR')", { timeout: 5000 }); } catch {}
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(OUT, "t1-r3-shooter.png") });
    await page.close();
  }

  // T2 (Lengua y pensamiento)
  {
    const page = await ctx.newPage();
    await startGame(page, "Lengua y pensamiento");
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, "t2-r1-carrera.png") });
    // R2 / R3 son cómic y ruleta — tienen tiempo de exposición
    await page.waitForTimeout(15000); // dejar pasar la carrera
    await page.screenshot({ path: path.join(OUT, "t2-r1b-carrera.png") });
    await page.close();
  }

  await browser.close();
  console.log("DONE");
})();
