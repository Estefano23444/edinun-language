const { chromium } = require("playwright");
const path = require("path"); const dir = path.join(__dirname,"qa-screenshots");
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:1280,height:800}});
  const page=await ctx.newPage();
  await page.goto("http://localhost:8765/juegos/juego-14/index.html",{waitUntil:"networkidle"});
  await page.waitForTimeout(400);
  await page.locator("button:has-text('El poema y sus voces')").first().click(); await page.waitForTimeout(120);
  await page.fill("input.ed-input","Luis");
  await page.locator("button:has-text('ENTRAR')").first().click(); await page.waitForTimeout(350);
  await page.locator("button:has-text('¡VAMOS')").first().click(); await page.waitForTimeout(450);
  // R1
  await page.locator("[data-qa='zona-central'] .ed-numpad-key").first().click(); await page.waitForTimeout(120);
  await page.locator("button:has-text('VERIFICAR')").first().click(); await page.waitForTimeout(2100);
  // R2
  for (const bin of ["CONSONANTE","ASONANTE","VERSO LIBRE"]) {
    await page.locator("[data-qa='zona-central'] button",{hasText:"·"}).first().click(); await page.waitForTimeout(100);
    await page.getByText(bin,{exact:true}).click(); await page.waitForTimeout(120);
  }
  await page.locator("button:has-text('VERIFICAR')").first().click(); await page.waitForTimeout(2200);
  // R3 — capture before verifying
  await page.screenshot({path:path.join(dir,"N3-R3-clean.png")});
  await page.locator("[data-qa='zona-central'] .ed-numpad-key").first().click(); await page.waitForTimeout(150);
  await page.screenshot({path:path.join(dir,"N3-R3-picked.png")});
  await b.close();
})();
