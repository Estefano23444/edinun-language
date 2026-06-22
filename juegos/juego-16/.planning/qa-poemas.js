const { chromium } = require("playwright");
const path = require("path");
const dir = path.join(__dirname, "qa-screenshots");
const VPS = [{n:"1280x800",w:1280,h:800},{n:"1024x768",w:1024,h:768},{n:"667x375",w:667,h:375}];
async function run(browser, vp){
  const ctx = await browser.newContext({ viewport:{width:vp.w,height:vp.h} });
  const page = await ctx.newPage();
  const errors=[];
  page.on("pageerror",e=>errors.push("PAGEERR: "+e.message));
  page.on("console",m=>{ if(m.type()==="error") errors.push("CONSOLE: "+m.text()); });
  const shot = (l)=>page.screenshot({path:path.join(dir,`N2-${vp.n}-${l}.png`)});
  await page.goto("http://localhost:8765/juegos/juego-14/index.html",{waitUntil:"networkidle"});
  await page.waitForTimeout(500);
  await shot("01-home");
  await page.locator("button:has-text('Poemas populares')").first().click();
  await page.waitForTimeout(150);
  await page.fill("input.ed-input","Sofía");
  await page.locator("button:has-text('ENTRAR')").first().click();
  await page.waitForTimeout(400);
  await shot("02-character");
  await page.locator("button:has-text('¡VAMOS')").first().click();
  await page.waitForTimeout(500);
  await shot("03-R1-pre");
  // R1 ruleta
  await page.locator("button:has-text('GIRAR')").first().click();
  await page.waitForTimeout(2100);
  await shot("04-R1-options");
  await page.locator("[data-qa='zona-central'] .ed-numpad-key").first().click();
  await page.waitForTimeout(200);
  await page.locator("button:has-text('VERIFICAR')").first().click();
  await page.waitForTimeout(700);
  await shot("05-R1-feedback");
  await page.waitForTimeout(1300);
  // R2 rima
  await shot("06-R2");
  await page.locator("[data-qa='zona-central'] .ed-numpad-key").first().click();
  await page.waitForTimeout(200);
  await page.locator("button:has-text('VERIFICAR')").first().click();
  await page.waitForTimeout(1900);
  // R3 detective
  await shot("07-R3");
  await page.locator("[data-qa='zona-central'] button").first().click();
  await page.waitForTimeout(200);
  await page.locator("button:has-text('VERIFICAR')").first().click();
  await page.waitForTimeout(700);
  await shot("08-R3-feedback");
  await page.waitForTimeout(1700);
  await shot("09-results");
  console.log(vp.n,"errores:",errors.length, errors.slice(0,4));
  await ctx.close();
}
(async()=>{
  const b = await chromium.launch();
  for(const vp of VPS){ try{ await run(b,vp);}catch(e){ console.log(vp.n,"FALLO:",e.message.split("\n")[0]); } }
  await b.close();
})();
