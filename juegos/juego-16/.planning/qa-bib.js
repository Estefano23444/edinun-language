const { chromium } = require("playwright");
const path = require("path");
const dir = path.join(__dirname, "qa-screenshots");
(async()=>{
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport:{width:1280,height:800} });
  const page = await ctx.newPage();
  const errors=[];
  page.on("pageerror",e=>errors.push("PAGEERR: "+e.message));
  page.on("console",m=>{ if(m.type()==="error") errors.push("CONSOLE: "+m.text()); });
  await page.goto("http://localhost:8765/juegos/juego-14/index.html",{waitUntil:"networkidle"});
  await page.waitForTimeout(400);
  await page.locator("button:has-text('La biblioteca')").first().click();
  await page.waitForTimeout(120);
  await page.fill("input.ed-input","Mateo");
  await page.locator("button:has-text('ENTRAR')").first().click();
  await page.waitForTimeout(400);
  await page.locator("button:has-text('¡VAMOS')").first().click();
  await page.waitForTimeout(500);
  await page.screenshot({path:path.join(dir,"N1-1280x800-game.png")});
  // jugar 1 ronda: tocar primera sílaba + verificar
  await page.locator("[data-qa='bandeja'] .ed-numpad-key").first().click();
  await page.waitForTimeout(150);
  await page.locator("button:has-text('VERIFICAR')").first().click();
  await page.waitForTimeout(1100);
  await page.screenshot({path:path.join(dir,"N1-1280x800-feedback.png")});
  console.log("N1 errores:",errors.length, errors.slice(0,4));
  await b.close();
})();
