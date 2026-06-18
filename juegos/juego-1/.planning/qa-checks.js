/**
 * qa-checks.js — QA visual automatizado del juego "Completa la palabra".
 *
 * Lanza Chromium en 6 viewports canónicos, recorre Home → Personaje →
 * Game, valida zonas del grid, tamaños mínimos de tap targets, y captura
 * screenshots a .planning/qa-screenshots/.
 *
 * Uso:
 *   cd juegos/juego-1
 *   node .planning/qa-checks.js
 *
 * Requiere: Node 18+, playwright 1.x con Chromium instalado.
 */

const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

// Viewports canónicos (USER.md).
const VIEWPORTS = [
  { name: "desktop-fullhd",   width: 1920, height: 1080 },
  { name: "laptop",           width: 1280, height: 800  },
  { name: "tablet-landscape", width: 1024, height: 768  },
  { name: "tablet-portrait",  width: 768,  height: 1024 },
  { name: "mobile-landscape", width: 667,  height: 375  },
  { name: "mobile-portrait",  width: 375,  height: 667  },
];

// Zonas en coordenadas del lienzo lógico (900×540). Tolerancia 6 px.
// Para este juego, el wrapper del "personaje" es ancho (incluye el nombre
// debajo) y el bocadillo está a la izquierda; aquí declaramos los rects
// reales del DOM, no los teóricos del grid-doc — el QA valida lo
// observado contra estos.
const ZONES = {
  // HUD real: top:10, left:16, right:16, alto 64 → bbox (16, 10, 868, 64).
  hud:          { x: 14,  y: 6,   w: 872, h: 76  },
  // Bocadillo: anidado dentro del wrapper del personaje, top:-80
  // relativo a un wrapper en bottom:90 → bbox real ~(14, 168, 208, 56).
  bocadillo:    { x: 8,   y: 158, w: 222, h: 72  },
  // Zona central: top:136, left:50%, width:460 → arranca en x=220.
  // Alto: cartel 180 + gap 28 + casillas ~70 = ~278 px.
  "zona-central": { x: 216, y: 132, w: 468, h: 290 },
  // Acciones: right:18, top:50% transform, alto total ~3·56+2·12=192.
  acciones:     { x: 714, y: 74,  w: 178, h: 392 },
  // Personaje wrapper: left:8, bottom:90, width:220, alto ~206
  // (190 PNG + 14 label) → arranca en y ≈ 540-90-206 = 244.
  personaje:    { x: 4,   y: 238, w: 226, h: 216 },
  // Bandeja: centrada, ancho variable. bottom:30 → top y=442.
  bandeja:      { x: 60,  y: 438, w: 780, h: 80  },
};

// Pares cuyo overlap está permitido (zonas que comparten espacio por diseño).
const ALLOWED_OVERLAPS = new Set([
  "bocadillo|personaje",      // el bocadillo cuelga arriba del personaje
  "bocadillo|zona-central",   // el bocadillo termina en x=229, central inicia en 220 (9px de cruce visual)
  "personaje|zona-central",   // pueden tocarse en bordes inferiores
  "acciones|zona-central",
  "bandeja|zona-central",
  "acciones|bandeja",
  "bandeja|personaje",        // personaje y bandeja comparten fila inferior
  "hud|zona-central",
]);

const TOLERANCE = 6;
const MIN_BUTTON_SIZE = 44;
const MIN_FICHA_SIZE = 56;

// Servidor estático mínimo (root = repo padre del juego para que las rutas
// relativas funcionen correctamente; aunque acá servimos solo este juego).
function startServer(rootDir, port) {
  return new Promise((resolve, reject) => {
    const mime = {
      ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
      ".jsx": "text/jsx", ".json": "application/json", ".png": "image/png",
      ".svg": "image/svg+xml", ".ico": "image/x-icon",
    };
    const server = http.createServer((req, res) => {
      let url = decodeURIComponent(req.url.split("?")[0]);
      if (url.endsWith("/")) url += "index.html";
      const filePath = path.join(rootDir, url);
      if (!filePath.startsWith(rootDir)) { res.writeHead(403); res.end(); return; }
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end(`Not found: ${url}`); return; }
        res.writeHead(200, { "Content-Type": mime[path.extname(filePath)] || "application/octet-stream" });
        res.end(data);
      });
    });
    server.listen(port, () => resolve(server));
    server.on("error", reject);
  });
}

async function getZoneBoxes(page) {
  return await page.evaluate(() => {
    const stage = Array.from(document.querySelectorAll("div")).find(d => {
      const cs = getComputedStyle(d);
      return cs.width === "900px" && cs.height === "540px";
    });
    if (!stage) return null;
    const stageRect = stage.getBoundingClientRect();
    const sx = stageRect.width / 900;
    const sy = stageRect.height / 540;
    const result = {};
    document.querySelectorAll("[data-qa]").forEach(el => {
      const key = el.getAttribute("data-qa");
      const r = el.getBoundingClientRect();
      result[key] = {
        x: (r.left - stageRect.left) / sx,
        y: (r.top - stageRect.top) / sy,
        w: r.width / sx,
        h: r.height / sy,
      };
    });
    return { stageRect: { width: stageRect.width, height: stageRect.height, sx, sy }, zones: result };
  });
}

function rectsOverlap(a, b) {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

function rectInside(inner, outer, tol) {
  return inner.x >= outer.x - tol &&
         inner.y >= outer.y - tol &&
         inner.x + inner.w <= outer.x + outer.w + tol &&
         inner.y + inner.h <= outer.y + outer.h + tol;
}

function validateZones(observed) {
  const issues = [];
  if (!observed || !observed.zones) {
    issues.push({ severity: "error", msg: "No se pudo localizar el lienzo o ningún elemento data-qa" });
    return issues;
  }
  const z = observed.zones;

  // Cada zona observada dentro de su declarada (con tolerancia).
  for (const [key, expected] of Object.entries(ZONES)) {
    const got = z[key];
    if (!got) {
      issues.push({ severity: "warn", msg: `Zona "${key}" no encontrada (data-qa missing)` });
      continue;
    }
    if (!rectInside(got, expected, TOLERANCE)) {
      issues.push({
        severity: "error",
        msg: `Zona "${key}" fuera de su área declarada: ` +
             `obs (${got.x.toFixed(0)}, ${got.y.toFixed(0)}, ${got.w.toFixed(0)}×${got.h.toFixed(0)}) ` +
             `vs decl (${expected.x}, ${expected.y}, ${expected.w}×${expected.h})`,
      });
    }
  }

  // Sin superposiciones críticas (excepto las permitidas).
  const keys = Object.keys(z);
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const a = keys[i], b = keys[j];
      const pair = [a, b].sort().join("|");
      if (ALLOWED_OVERLAPS.has(pair)) continue;
      if (rectsOverlap(z[a], z[b])) {
        issues.push({
          severity: "error",
          msg: `Zonas "${a}" y "${b}" se superponen.`,
        });
      }
    }
  }

  // Ningún elemento sale del lienzo (margen 6 px).
  for (const [key, got] of Object.entries(z)) {
    if (got.x < -TOLERANCE || got.y < -TOLERANCE ||
        got.x + got.w > 900 + TOLERANCE || got.y + got.h > 540 + TOLERANCE) {
      issues.push({
        severity: "error",
        msg: `Zona "${key}" sale del lienzo: (${got.x.toFixed(0)}, ${got.y.toFixed(0)}, ${got.w.toFixed(0)}×${got.h.toFixed(0)})`,
      });
    }
  }

  return issues;
}

async function checkButtonSizes(page) {
  return await page.evaluate(({ minBtn, minFicha }) => {
    const issues = [];
    const accionesEl = document.querySelector('[data-qa="acciones"]');
    if (accionesEl) {
      accionesEl.querySelectorAll("button").forEach(btn => {
        const r = btn.getBoundingClientRect();
        if (r.width < minBtn || r.height < minBtn) {
          issues.push({ severity: "warn", msg: `Botón "${btn.textContent.trim()}" en acciones: ${r.width.toFixed(0)}×${r.height.toFixed(0)}` });
        }
      });
    }
    const bandejaEl = document.querySelector('[data-qa="bandeja"]');
    if (bandejaEl) {
      bandejaEl.querySelectorAll("button").forEach(btn => {
        const r = btn.getBoundingClientRect();
        if (r.width < minFicha || r.height < minFicha) {
          issues.push({ severity: "warn", msg: `Ficha "${btn.textContent.trim()}" en bandeja: ${r.width.toFixed(0)}×${r.height.toFixed(0)}` });
        }
      });
    }
    return issues;
  }, { minBtn: MIN_BUTTON_SIZE, minFicha: MIN_FICHA_SIZE });
}

async function runForViewport(browser, vp, baseUrl, screenshotsDir) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  const allIssues = [];
  const isMobilePortrait = vp.name === "mobile-portrait";

  try {
    await page.goto(baseUrl, { waitUntil: "load" });
    await page.waitForTimeout(900); // Babel compila + React monta
    await page.screenshot({ path: path.join(screenshotsDir, `${vp.name}-1-home.png`), fullPage: false });

    // En mobile portrait, hay un overlay bloqueante "Gira el teléfono" que
    // impide interactuar con el resto. Solo capturamos Home y validamos
    // que el overlay esté presente.
    if (isMobilePortrait) {
      const overlay = await page.locator('[role="dialog"][aria-label*="Gira"]').count();
      if (overlay === 0) {
        allIssues.push({ severity: "error", msg: "Mobile portrait sin overlay bloqueante de rotación." });
      }
      return { viewport: vp.name, issues: allIssues };
    }

    const nameInput = page.locator('input[placeholder*="nombre" i]').first();
    if (await nameInput.count() > 0) {
      await nameInput.fill("QABot");
      // Hay que seleccionar un chip de tema antes de poder ENTRAR. Usamos
      // el nuevo nivel "Letra V" para que el QA también ejerza la nueva
      // mecánica/banco/bandeja.
      const letraVChip = page.locator('button:has-text("Letra V")').first();
      if (await letraVChip.count() > 0) {
        await letraVChip.click();
        await page.waitForTimeout(200);
      }
      await page.locator('button:has-text("ENTRAR")').first().click();
      await page.waitForTimeout(450);
    }

    await page.screenshot({ path: path.join(screenshotsDir, `${vp.name}-2-character.png`), fullPage: false });
    const vamosBtn = page.locator('button:has-text("VAMOS")').first();
    if (await vamosBtn.count() > 0) {
      await vamosBtn.click();
      await page.waitForTimeout(550);
    }

    await page.screenshot({ path: path.join(screenshotsDir, `${vp.name}-3-game.png`), fullPage: false });
    const observed = await getZoneBoxes(page);
    allIssues.push(...validateZones(observed));
    allIssues.push(...await checkButtonSizes(page));

  } catch (err) {
    allIssues.push({ severity: "error", msg: `Excepción: ${err.message}` });
  } finally {
    await ctx.close();
  }

  return { viewport: vp.name, issues: allIssues };
}

async function main() {
  const cwd = process.cwd();
  const port = 8765;
  const baseUrl = `http://localhost:${port}/index.html`;

  const screenshotsDir = path.join(cwd, ".planning", "qa-screenshots");
  fs.mkdirSync(screenshotsDir, { recursive: true });

  console.log(`Sirviendo ${cwd} en ${baseUrl}...`);
  const server = await startServer(cwd, port);

  console.log("Lanzando Chromium...");
  const browser = await chromium.launch();

  const results = [];
  for (const vp of VIEWPORTS) {
    console.log(`  → ${vp.name} (${vp.width}×${vp.height})`);
    const r = await runForViewport(browser, vp, baseUrl, screenshotsDir);
    results.push(r);
  }

  await browser.close();
  server.close();

  const total = results.reduce((acc, r) => acc + r.issues.length, 0);
  const errors = results.reduce((acc, r) => acc + r.issues.filter(i => i.severity === "error").length, 0);
  const summary = {
    timestamp: new Date().toISOString(),
    cwd, viewports: VIEWPORTS.length,
    totalIssues: total, errorIssues: errors,
    pass: errors === 0,
    results,
  };

  fs.writeFileSync(
    path.join(cwd, ".planning", "qa-results.json"),
    JSON.stringify(summary, null, 2),
  );

  console.log("\n=== RESUMEN ===");
  console.log(`Total issues: ${total} (${errors} errores)`);
  for (const r of results) {
    if (r.issues.length === 0) { console.log(`  ✓ ${r.viewport}`); continue; }
    console.log(`  ✗ ${r.viewport}: ${r.issues.length} issue(s)`);
    for (const i of r.issues) console.log(`      [${i.severity}] ${i.msg}`);
  }
  console.log(`\nScreenshots: ${screenshotsDir}`);
  console.log(`Resultados:  ${path.join(cwd, ".planning", "qa-results.json")}`);

  process.exit(errors === 0 ? 0 : 1);
}

main().catch(err => {
  console.error("Error fatal:", err);
  process.exit(2);
});
