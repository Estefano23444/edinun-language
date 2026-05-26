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

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  ctx.on("page", (p) => p.on("pageerror", (e) => console.log("ERR:", e.message)));

  // Capturar labels disponibles
  const p0 = await ctx.newPage();
  await p0.goto(URL, { waitUntil: "networkidle" });
  await p0.waitForTimeout(500);
  const labels = await p0.evaluate(() =>
    Array.from(document.querySelectorAll("button,div"))
      .map((e) => e.textContent && e.textContent.trim())
      .filter((t) => t && t.length > 3 && t.length < 60)
      .slice(0, 30)
  );
  console.log("Labels:", labels.join(" | "));
  await p0.close();

  // Probar los temas que veamos
  for (const tema of [
    { text: "Reglas C, S, Z", out: "j5-csz.png" },
    { text: "Lengua y pensamiento", out: "j5-lp.png" },
  ]) {
    try {
      const page = await ctx.newPage();
      await startGame(page, tema.text);
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(OUT, tema.out) });
      await page.close();
      console.log("OK", tema.out);
    } catch (e) {
      console.log("FAIL", tema.text, e.message);
    }
  }

  await browser.close();
  console.log("DONE");
})();
