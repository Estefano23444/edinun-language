const { chromium } = require("playwright");
const path = require("path"); const dir = path.join(__dirname,"qa-screenshots");
async function reachN4R3(page){
  await page.goto("http://localhost:8765/juegos/juego-14/index.html",{waitUntil:"networkidle"});
  await page.waitForTimeout(400);
  await page.locator("button:has-text('El género de opinión')").first().click(); await page.waitForTimeout(120);
  await page.fill("input.ed-input","Ana");
  await page.locator("button:has-text('ENTRAR')").first().click(); await page.waitForTimeout(350);
  await page.locator("button:has-text('¡VAMOS')").first().click(); await page.waitForTimeout(450);
  for(let i=0;i<4;i++){ await page.locator("button:has-text('INFORMATIVO')").first().click().catch(()=>{}); await page.waitForTimeout(700); }
  await page.waitForTimeout(1700);
  await page.locator("[data-qa='zona-central'] .ed-numpad-key").first().click(); await page.waitForTimeout(150);
  await page.locator("button:has-text('VERIFICAR')").first().click(); await page.waitForTimeout(2100);
}
async function probe(b,vp){
  const ctx=await b.newContext({viewport:{width:vp.w,height:vp.h}}); const page=await ctx.newPage();
  await reachN4R3(page);
  await page.screenshot({path:path.join(dir,`GEOM-N4R3-${vp.n}.png`)});
  const m = await page.evaluate(()=>{
    const acc=document.querySelector("[data-qa='acciones']").getBoundingClientRect();
    const per=document.querySelector("[data-qa='personaje']").getBoundingClientRect();
    const zc=document.querySelector("[data-qa='zona-central']");
    const rows=[...zc.children];
    const binRow=rows[rows.length-1];
    const bins=[...binRow.children].map(el=>el.getBoundingClientRect());
    const left=Math.min(...bins.map(r=>r.left)), right=Math.max(...bins.map(r=>r.right));
    return { accLeft:acc.left, perRight:per.right, binsLeft:left, binsRight:right };
  });
  const overRail = m.binsRight - m.accLeft;   // >0 => bins entran al riel
  const overChar = m.perRight - m.binsLeft;   // >0 => bins entran al personaje
  console.log(`${vp.n}  binsRight=${Math.round(m.binsRight)} accLeft=${Math.round(m.accLeft)} -> riel ${overRail>0?'OVERLAP '+Math.round(overRail)+'px':'ok '+Math.round(-overRail)+'px libre'} | binsLeft=${Math.round(m.binsLeft)} perRight=${Math.round(m.perRight)} -> personaje ${overChar>0?'OVERLAP '+Math.round(overChar)+'px':'ok '+Math.round(-overChar)+'px libre'}`);
  await ctx.close();
}
(async()=>{const b=await chromium.launch(); for(const vp of [{n:"1280x800",w:1280,h:800},{n:"667x375",w:667,h:375}]){ try{await probe(b,vp);}catch(e){console.log(vp.n,"FALLO",e.message.split("\n")[0]);} } await b.close();})();
