// shot25.js — captura las 3 rondas del juego-25 y reporta errores de consola.
const path = require("path");
const { chromium } = require(path.resolve(__dirname, "../../../node_modules/playwright"));
const FILE = "file://" + path.resolve(__dirname, "../index.html").replace(/\\/g, "/");
const SHOTS = path.resolve(__dirname, "verify-shots");
const fs = require("fs");
if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push("CONSOLE: " + m.text()); });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  const shot = (n) => page.screenshot({ path: path.join(SHOTS, n + ".png") });

  try {
    await page.goto(FILE, { waitUntil: "networkidle" });
    await sleep(1000);
    await shot("25-1-home");
    await page.fill(".ed-input", "Ana");
    await page.click('button:has-text("ENTRAR")');
    await sleep(600);
    await page.click('button:has-text("VAMOS")');
    await sleep(1000);
    await shot("25-2-r1-card");

    // R1: 8 cartas, usar botones ESTEREOTIPO/INCLUSIVO alternando
    for (let i = 0; i < 8; i++) {
      const sel = i % 2 === 0 ? 'button:has-text("ESTEREOTIPO")' : 'button:has-text("INCLUSIVO")';
      await page.click(sel).catch(() => {});
      if (i === 0) { await sleep(600); await shot("25-2b-r1-feedback"); }
      await sleep(1900);
    }
    await sleep(1700);
    await shot("25-3-r2-bar");

    // R2: tocar SOLO las acciones buenas (mantienen viva la lengua) para pasar.
    const GOOD = ["Enseñ", "orgullo", "Mantener", "Compartir", "tradicion"];
    const btns = await page.$$('[data-qa="zona-central"] button');
    for (const b of btns) {
      const t = (await b.innerText().catch(() => "")) || "";
      if (GOOD.some((g) => t.includes(g))) { await b.click().catch(() => {}); await sleep(450); }
    }
    await sleep(2000);
    await shot("25-4-r3-slider");
    // Arrastrar el marcador a "Es verdad" para ver el estado activo
    const track = await page.$('[data-qa="zona-central"] .ed-draggable');
    if (track) {
      const box = await track.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width * 0.85, box.y + box.height / 2, { steps: 8 });
        await page.mouse.up();
        await sleep(300);
        await shot("25-4b-r3-dragged");
      }
    }
  } catch (e) {
    errors.push("SCRIPT: " + e.message);
  }
  console.log("ERRORES (" + errors.length + "):");
  errors.forEach((e) => console.log("  " + e));
  await browser.close();
})();
