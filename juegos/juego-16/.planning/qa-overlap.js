// qa-overlap.js — Detecta superposiciones reales entre las zonas
// data-qa del juego-9 en los 6 viewports.
// Para cada viewport:
//   1. Llega al GameScreen.
//   2. Extrae bounding box del HUD, bocadillo, zona-central,
//      acciones, bandeja, personaje.
//   3. Hace check pairwise de overlap usando rects en CSS px.
//   4. Reporta cualquier intersección no permitida.
//
// Pares PERMITIDOS de overlap (no son bug):
//   - zona-central ↔ bandeja (zona central puede extender vertical)
//   - personaje ↔ bocadillo  (bocadillo cuelga del personaje)

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const URL = "http://localhost:8765/juegos/juego-9/index.html";
const OUT_DIR = path.join(__dirname, "qa-screenshots");

const VIEWPORTS = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1280x800",  width: 1280, height: 800 },
  { name: "1024x768",  width: 1024, height: 768 },
  { name: "768x1024",  width: 768,  height: 1024 },
  { name: "667x375",   width: 667,  height: 375 },
];

const ALLOWED_PAIRS = new Set([
  "bocadillo|personaje", "personaje|bocadillo",
  "zona-central|bandeja", "bandeja|zona-central",
]);

function intersect(a, b) {
  if (!a || !b) return null;
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  if (x2 <= x1 || y2 <= y1) return null;
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

async function getBoxes(page) {
  const labels = ["hud", "bocadillo", "zona-central", "acciones", "bandeja", "personaje"];
  const out = {};
  for (const label of labels) {
    const handle = await page.locator(`[data-qa="${label}"]`).first();
    const count = await handle.count();
    if (count === 0) {
      out[label] = null;
      continue;
    }
    out[label] = await handle.boundingBox();
  }
  return out;
}

async function runFlow(browser, vp) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  console.log(`\n──── Viewport ${vp.name} ────`);
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);

  // Home → escribir nombre y entrar
  await page.fill("input.ed-input", "Sofía");
  await page.waitForTimeout(120);
  await page.locator("button:has-text('ENTRAR')").first().click();
  await page.waitForTimeout(500);

  // CharacterScreen → entrar al juego
  await page.locator("button:has-text('¡VAMOS')").first().click();
  await page.waitForTimeout(700);

  const boxes = await getBoxes(page);
  console.log("Bounding boxes:");
  for (const k of Object.keys(boxes)) {
    const b = boxes[k];
    if (!b) { console.log(`  ${k}: <missing>`); continue; }
    console.log(`  ${k.padEnd(14)}: x=${Math.round(b.x)} y=${Math.round(b.y)} w=${Math.round(b.width)} h=${Math.round(b.height)}`);
  }

  // Chequear overlaps no permitidos
  const labels = Object.keys(boxes);
  const overlaps = [];
  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) {
      const a = labels[i], b = labels[j];
      const pairKey = `${a}|${b}`;
      if (ALLOWED_PAIRS.has(pairKey)) continue;
      const inter = intersect(boxes[a], boxes[b]);
      if (inter && inter.w > 4 && inter.h > 4) {
        overlaps.push({ a, b, inter });
      }
    }
  }

  if (overlaps.length === 0) {
    console.log("  ✓ Sin superposiciones no permitidas");
  } else {
    console.log("  ✖ Overlaps detectados:");
    for (const o of overlaps) {
      console.log(`    · ${o.a} ↔ ${o.b}: ${Math.round(o.inter.w)}×${Math.round(o.inter.h)} px en (${Math.round(o.inter.x)}, ${Math.round(o.inter.y)})`);
    }
  }

  await page.screenshot({ path: path.join(OUT_DIR, `${vp.name}-overlap-check.png`) });
  await ctx.close();
  return overlaps;
}

(async () => {
  console.log("Inicio QA overlap juego-9");
  const browser = await chromium.launch();
  const allOverlaps = {};
  for (const vp of VIEWPORTS) {
    try {
      const overlaps = await runFlow(browser, vp);
      allOverlaps[vp.name] = overlaps;
    } catch (e) {
      console.error(`✖ Viewport ${vp.name} falló: ${e.message}`);
      allOverlaps[vp.name] = "ERROR: " + e.message;
    }
  }
  await browser.close();

  console.log("\n══════════════════════════════════════════");
  let totalIssues = 0;
  for (const vp of VIEWPORTS) {
    const overlaps = allOverlaps[vp.name];
    if (typeof overlaps === "string") {
      console.log(`  ✖ ${vp.name}: ${overlaps}`);
      totalIssues++;
    } else if (overlaps.length === 0) {
      console.log(`  ✓ ${vp.name}: sin overlaps`);
    } else {
      console.log(`  ✖ ${vp.name}: ${overlaps.length} overlap(s)`);
      totalIssues += overlaps.length;
    }
  }
  fs.writeFileSync(
    path.join(__dirname, "qa-overlap-results.json"),
    JSON.stringify(allOverlaps, null, 2),
    "utf8"
  );
  console.log(`\n${totalIssues === 0 ? "✓ TODO LIMPIO" : `✖ ${totalIssues} issue(s) total`}`);
})();
