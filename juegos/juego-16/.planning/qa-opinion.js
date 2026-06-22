const { chromium } = require("playwright");
const path = require("path"); const dir = path.join(__dirname,"qa-screenshots");
const VPS=[{n:"1280x800",w:1280,h:800},{n:"1024x768",w:1024,h:768},{n:"667x375",w:667,h:375}];
async function run(b,vp){
  const ctx=await b.newContext({viewport:{width:vp.w,height:vp.h}});
  const page=await ctx.newPage();
  const errs=[]; page.on("pageerror",e=>errs.push("PE:"+e.message)); page.on("console",m=>{if(m.type()==="error")errs.push("CE:"+m.text());});
  const shot=(l)=>page.screenshot({path:path.join(dir,`N4-${vp.n}-${l}.png`)});
  await page.goto("http://localhost:8765/juegos/juego-14/index.html",{waitUntil:"networkidle"});
  await page.waitForTimeout(500); await shot("01-home");
  await page.locator("button:has-text('El género de opinión')").first().click(); await page.waitForTimeout(150);
  await page.fill("input.ed-input","Ana");
  await page.locator("button:has-text('ENTRAR')").first().click(); await page.waitForTimeout(400);
  await page.locator("button:has-text('¡VAMOS')").first().click(); await page.waitForTimeout(500);
  await shot("03-R1-shooter");
  // R1 shooter: catch 4 cards (click a basket each)
  for (let i=0;i<4;i++){
    await page.locator("button:has-text('INFORMATIVO')").first().click().catch(()=>{});
    await page.waitForTimeout(650);
  }
  await page.waitForTimeout(1500); await shot("04-R2-hecho");
  // R2 hecho/opinión
  await page.locator("[data-qa='zona-central'] .ed-numpad-key").first().click(); await page.waitForTimeout(150);
  await page.locator("button:has-text('VERIFICAR')").first().click(); await page.waitForTimeout(1800);
  await shot("05-R3-oracion");
  // R3 classify
  for (const bin of ["MODIFICADOR","INTERJECCIÓN","FRASE NOMINAL"]) {
    await page.locator("[data-qa='zona-central'] button",{hasText:"."}).first().click().catch(()=>{});
    await page.waitForTimeout(120);
    await page.getByText(bin,{exact:false}).first().click().catch(()=>{});
    await page.waitForTimeout(150);
  }
  await shot("06-R3-placed");
  await page.locator("button:has-text('VERIFICAR')").first().click().catch(()=>{}); await page.waitForTimeout(1800);
  await shot("07-results");
  console.log(vp.n,"errores:",errs.length, errs.slice(0,4));
  await ctx.close();
}
(async()=>{const b=await chromium.launch(); for(const vp of VPS){try{await run(b,vp);}catch(e){console.log(vp.n,"FALLO:",e.message.split("\n")[0]);}} await b.close();})();
