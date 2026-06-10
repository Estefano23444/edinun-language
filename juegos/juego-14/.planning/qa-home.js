const { chromium } = require("playwright");
const path = require("path"); const dir = path.join(__dirname,"qa-screenshots");
(async()=>{
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport:{width:1280,height:800} });
  const page = await ctx.newPage();
  const errs=[]; page.on("pageerror",e=>errs.push(e.message));
  await page.goto("http://localhost:8765/juegos/juego-14/index.html",{waitUntil:"networkidle"});
  await page.waitForTimeout(500);
  await page.screenshot({path:path.join(dir,"HOME-01-inicial.png")});
  await page.locator("button:has-text('Poemas populares')").first().click();
  await page.waitForTimeout(300);
  await page.screenshot({path:path.join(dir,"HOME-02-poemas-sel.png")});
  console.log("errores:",errs.length, errs.slice(0,3));
  await b.close();
})();
