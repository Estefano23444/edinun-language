// qa-landing.js — verifica el landing del repo con juego-7 añadido.
const { chromium } = require("playwright");
const path = require("path");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
  await page.goto("http://localhost:8765/index.html", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(__dirname, "qa-screenshots", "landing-1280x800.png") });
  console.log("errors:", errors.length);
  if (errors.length) errors.slice(0, 3).forEach(e => console.log(" -", e.slice(0, 200)));
  await browser.close();
})();
