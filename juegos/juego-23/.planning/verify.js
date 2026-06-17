// verify.js — recorre el flujo del juego-23 con Playwright y captura
// screenshots + errores de consola/página en cada etapa.
//   node .planning/verify.js
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

  async function shot(name) { await page.screenshot({ path: path.join(SHOTS, name + ".png") }); }

  try {
    await page.goto(FILE, { waitUntil: "networkidle" });
    await sleep(1200);
    await shot("1-home");

    // Home → nombre → ENTRAR
    await page.fill(".ed-input", "Ana");
    await page.click('button:has-text("ENTRAR")');
    await sleep(700);
    await shot("2-character");

    // Personaje → VAMOS
    await page.click('button:has-text("VAMOS")');
    await sleep(900);
    await shot("3-r1-dial");

    // R1 — 6 mensajes: clic en un nivel cada vez (avanza acierte o no)
    for (let i = 0; i < 6; i++) {
      const btns = await page.$$('[data-qa="zona-central"] button');
      if (btns.length) await btns[i % btns.length].click().catch(() => {});
      await sleep(1500);
    }
    await sleep(1600); // feedback overlay de fin de ronda
    await shot("4-r2-chat");

    // R2 — 3 turnos: clic en la primera opción cada vez
    for (let i = 0; i < 3; i++) {
      const opts = await page.$$('[data-qa="zona-central"] button');
      if (opts.length) await opts[0].click().catch(() => {});
      await sleep(1600);
    }
    await sleep(1700);
    await shot("5-r3-reparador");

    // R3 — colocar 3 fichas por tap: tile bandeja → hueco
    for (let i = 0; i < 3; i++) {
      const tiles = await page.$$('[data-qa="bandeja"] .ed-draggable');
      if (tiles[0]) await tiles[0].click().catch(() => {});
      await sleep(250);
      const blanks = await page.$$('[data-dropzone^="blank:"]');
      // primer hueco vacío
      for (const b of blanks) {
        const txt = (await b.innerText().catch(() => "")) || "";
        if (txt.includes("arrastra")) { await b.click().catch(() => {}); break; }
      }
      await sleep(350);
    }
    await shot("6-r3-filled");

    await page.click('button:has-text("VERIFICAR")').catch(() => {});
    await sleep(1400);
    await shot("7-r3-verify");
    await sleep(3600); // espera resultados
    await shot("8-results");

  } catch (e) {
    errors.push("SCRIPT: " + e.message);
  }

  console.log("ERRORES (" + errors.length + "):");
  errors.forEach((e) => console.log("  " + e));
  await browser.close();
})();
