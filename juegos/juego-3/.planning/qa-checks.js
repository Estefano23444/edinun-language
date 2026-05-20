/**
 * qa-checks.js — QA visual automatizado del juego "Completa la palabra".
 *
 * Lanza Chromium en 6 viewports canónicos, recorre Home → Personaje →
 * Game, valida zonas del grid, tamaños mínimos de tap targets, y captura
 * screenshots a .planning/qa-screenshots/.
 *
 * Uso:
 *   cd juegos/completa-palabras
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
// Layout heredado del shell de juego-2/juego-3: personaje grande en columna
// izquierda, zona-central arrancando en left=240, sin "acciones" verticales
// a la derecha (el botón REINICIAR vive en bottom-left).
const ZONES = {
  // HUD principal: top:10, left:16, right:16, alto 64.
  hud:           { x: 12,  y: 4,   w: 876, h: 80  },
  // Chips de tema centrados encima del HUD principal (top:24, ancho variable).
  "hud-temas":   { x: 260, y: 14,  w: 380, h: 44  },
  // Personaje wrapper: left:8, bottom:90, width:220, alto ~210.
  personaje:     { x: 0,   y: 232, w: 230, h: 224 },
  // Bocadillo: anidado dentro de personaje, top:-80 width:208 → arranca en
  // y_abs ≈ 540-90-210-80+padding = ~150.
  bocadillo:     { x: 8,   y: 144, w: 226, h: 92  },
  // Zona-central: centrada al lienzo (left:230 right:230 → ancho 440).
  "zona-central":{ x: 224, y: 126, w: 452, h: 340 },
  // Bandeja (solo en Nivel 1): centrada al lienzo (left:230 right:230) → bbox ~(230, 448, 440, 64).
  bandeja:       { x: 224, y: 442, w: 452, h: 76  },
  // Acciones (Nivel 1 y Nivel 2): right:18, top:90, bottom:28, width:130 → bbox (752, 90, 130, 422).
  acciones:      { x: 746, y: 84, w: 142, h: 434 },
};

// Pares cuyo overlap está permitido (zonas que comparten espacio por diseño).
const ALLOWED_OVERLAPS = new Set([
  "hud|hud-temas",            // chips de tema están encima del HUD principal
  "bocadillo|personaje",      // el bocadillo cuelga arriba del personaje
  "hud|bocadillo",            // bocadillo puede pegar al borde inferior del HUD
  "bocadillo|zona-central",   // bocadillo termina ~x=232, central inicia ~x=234
  "personaje|zona-central",   // pueden tocarse en bordes inferiores
  "bandeja|zona-central",     // zona-central nivel 2 puede invadir la fila de bandeja (no usa bandeja)
  "bandeja|personaje",        // personaje y bandeja comparten fila inferior
  "hud|zona-central",
  "hud-temas|zona-central",   // si la zona-central queda alta, el chip puede solaparse
  "acciones|zona-central",    // columna de acciones a la derecha (nivel 1) puede tocar el borde
  "acciones|bandeja",         // pueden tocarse en la esquina inferior derecha
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
      // juego-3 requiere seleccionar un tema (botón de nivel) antes de habilitar ENTRAR.
      // Tocamos el primer botón de tema disponible (La letra C y Q por defecto).
      const levelBtn = page.locator('button:has-text("La letra C y Q")').first();
      if (await levelBtn.count() > 0) {
        await levelBtn.click();
        await page.waitForTimeout(150);
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
