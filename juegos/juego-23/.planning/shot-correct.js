// shot-correct.js — entra a R1 y elige la respuesta CORRECTA para capturar el ✓.
const path = require("path");
const { chromium } = require(path.resolve(__dirname, "../../../node_modules/playwright"));
const FILE = "file://" + path.resolve(__dirname, "../index.html").replace(/\\/g, "/");
const SHOTS = path.resolve(__dirname, "verify-shots");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BANK = {
  Coloquial: ["¿Qué más, bro? Asoma al party.","Todo piola, ¿cachas?","Ese man es full bacán.","Ñaño, préstame un toque.","Nos pillamos al rato, chao."],
  "Estándar": ["Buenos días, ¿cómo está usted?","¿Me indica el horario, por favor?","Gracias por tu ayuda, te lo agradezco.","Nos vemos mañana en la tarde.","Con gusto, ¿en qué le ayudo?"],
  Culto: ["La poesía transforma al lector.","Su discurso reveló una notable elocuencia.","El conocimiento nos dota de recursos.","La melancolía habita en sus versos.","La palabra precisa ennoblece la idea."],
};
function correctLabel(txt) {
  const clean = txt.replace(/[«»]/g, "").trim();
  for (const [label, arr] of Object.entries(BANK)) if (arr.includes(clean)) return label;
  return null;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(FILE, { waitUntil: "networkidle" });
  await sleep(900);
  await page.fill(".ed-input", "Ana");
  await page.click('button:has-text("ENTRAR")');
  await sleep(600);
  await page.click('button:has-text("VAMOS")');
  await sleep(1000);

  // Lee el mensaje y pulsa el nivel correcto.
  const cardTxt = await page.$eval('[data-qa="zona-central"] div[style*="italic"]', (el) => el.textContent);
  const label = correctLabel(cardTxt);
  const btns = await page.$$('[data-qa="zona-central"] button');
  for (const b of btns) {
    const t = (await b.innerText()).trim();
    if (label && t.includes(label)) { await b.click(); break; }
  }
  await sleep(450); // ventana de feedback (antes de avanzar)
  await page.screenshot({ path: path.join(SHOTS, "r1-correct.png") });
  console.log("mensaje:", cardTxt, "→ correcto:", label);
  await browser.close();
})();
