const { chromium } = require("playwright");
const path = require("path"); const dir = path.join(__dirname,"qa-screenshots");
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:1280,height:800}});
  const page=await ctx.newPage();
  await page.goto("http://localhost:8765/juegos/juego-4/index.html",{waitUntil:"networkidle"});
  await page.waitForTimeout(600);
  await page.screenshot({path:path.join(dir,"CMP-juego4-home.png")});
  await b.close();
})();
