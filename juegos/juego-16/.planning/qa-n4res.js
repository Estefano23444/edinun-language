const { chromium } = require("playwright");
const path = require("path"); const dir = path.join(__dirname,"qa-screenshots");
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:1280,height:800}});
  const page=await ctx.newPage();
  const errs=[]; page.on("pageerror",e=>errs.push(e.message));
  await page.goto("http://localhost:8765/juegos/juego-14/index.html",{waitUntil:"networkidle"});
  await page.waitForTimeout(400);
  await page.locator("button:has-text('El género de opinión')").first().click(); await page.waitForTimeout(120);
  await page.fill("input.ed-input","Ana");
  await page.locator("button:has-text('ENTRAR')").first().click(); await page.waitForTimeout(350);
  await page.locator("button:has-text('¡VAMOS')").first().click(); await page.waitForTimeout(450);
  for(let i=0;i<4;i++){ await page.locator("button:has-text('INFORMATIVO')").first().click().catch(()=>{}); await page.waitForTimeout(700); }
  await page.waitForTimeout(1700);
  // R2
  await page.locator("[data-qa='zona-central'] .ed-numpad-key").first().click(); await page.waitForTimeout(150);
  await page.locator("button:has-text('VERIFICAR')").first().click(); await page.waitForTimeout(2000);
  // R3: place 3 fichas into the 3 bins (by exact label)
  const bins=["SUST. + MODIFICADOR","INTERJECCIÓN","FRASE NOMINAL"];
  for(let i=0;i<3;i++){
    const f = page.locator("[data-qa='zona-central'] > div").nth(1).locator("button").first();
    await f.click(); await page.waitForTimeout(120);
    await page.getByText(bins[i],{exact:true}).first().click(); await page.waitForTimeout(160);
  }
  await page.locator("button:has-text('VERIFICAR')").first().click(); await page.waitForTimeout(2000);
  await page.screenshot({path:path.join(dir,"N4-results-clean.png")});
  console.log("errores:",errs.length, errs.slice(0,3));
  await b.close();
})();
