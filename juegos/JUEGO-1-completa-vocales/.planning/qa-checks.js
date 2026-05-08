/**
 * qa-checks.js — QA visual automatizado de un juego EDINUN GAMES.
 *
 * Lanza Chromium en 6 viewports canónicos, abre el index.html del juego,
 * recorre el flujo Home → Personaje → Game, valida que las zonas del
 * grid (data-qa="...") estén dentro de sus coordenadas declaradas y no
 * se superpongan, y guarda screenshots en .planning/qa-screenshots/.
 *
 * Uso:
 *   cd juegos/<slug>
 *   node .planning/qa-checks.js
 *
 * Requiere:
 *   - Node.js 18+
 *   - npm install --save-dev @playwright/test playwright
 *   - npx playwright install chromium
 *
 * Output:
 *   - .planning/qa-screenshots/<viewport>-<screen>.png  (capturas)
 *   - .planning/qa-results.json                          (resumen)
 *   - exit code 0 si pasa todo, 1 si hay issues
 *
 * Documentación detallada en .planning/qa-checks.md.
 */

const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

// ─────────────────────────────────────────────────────────────
// Configuración: viewports canónicos definidos en USER.md
// ─────────────────────────────────────────────────────────────
const VIEWPORTS = [
  { name: "desktop-fullhd",  width: 1920, height: 1080 },
  { name: "laptop",          width: 1280, height: 800  },
  { name: "tablet-landscape", width: 1024, height: 768  },
  { name: "tablet-portrait", width: 768,  height: 1024 },
  { name: "mobile-landscape", width: 667, height: 375  },
  { name: "mobile-portrait", width: 375,  height: 667  },
];

// ─────────────────────────────────────────────────────────────
// Zonas del grid en coordenadas del lienzo lógico (900×540).
// Tolerancia de 4 px para overshoot por borders/sombras.
// ─────────────────────────────────────────────────────────────
const ZONES = {
  hud:          { x: 0,   y: 0,   w: 900, h: 56 },
  bocadillo:    { x: 12,  y: 68,  w: 228, h: 132 },
  "zona-central": { x: 260, y: 68,  w: 460, h: 352 },
  acciones:     { x: 740, y: 68,  w: 148, h: 352 },
  personaje:    { x: 0,   y: 440, w: 100, h: 100 },
  bandeja:      { x: 120, y: 440, w: 768, h: 100 },
};

// Pares de zonas que SÍ pueden superponerse (excepciones por mecánica).
const ALLOWED_OVERLAPS = new Set([
  // Si la mecánica extiende la zona central a toda la altura sin bandeja:
  "zona-central|bandeja",
  // Si las acciones bajan a horizontal absorbiendo la bandeja:
  "acciones|bandeja",
]);

const TOLERANCE = 4; // px en lienzo lógico
const MIN_BUTTON_SIZE = 44;
const MIN_FICHA_SIZE = 56;

// ─────────────────────────────────────────────────────────────
// Servidor estático mínimo (sin dependencias) para servir el repo.
// El script asume que se corre desde juegos/<slug>/ así que sirve
// el directorio actual en localhost:8765.
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// Calcula el bounding box en coordenadas del lienzo lógico (900×540).
// El DeviceStage aplica transform: scale(s) al lienzo, así que un
// elemento con boundingBox físico {x, y, w, h} en pantalla está, en el
// lienzo lógico, en {x/s - canvasOffsetX/s, y/s - canvasOffsetY/s, ...}.
// Pero: deshacer el transform es complicado. En lugar de hacerlo en
// JS, le pedimos al navegador la posición relativa al lienzo via JS
// inyectado.
// ─────────────────────────────────────────────────────────────
async function getZoneBoxes(page) {
  return await page.evaluate(() => {
    const stage = document.querySelector("[data-stage]") ||
                  document.querySelector(".ed-stage") ||
                  // El lienzo es el div de 900×540 dentro de DeviceStage.
                  // Buscar el descendiente con width:900px.
                  Array.from(document.querySelectorAll("div")).find(d => {
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

// ─────────────────────────────────────────────────────────────
// Validaciones programáticas.
// ─────────────────────────────────────────────────────────────
function validateZones(observed, viewportName) {
  const issues = [];
  if (!observed || !observed.zones) {
    issues.push({ severity: "error", msg: "No se pudo localizar el lienzo o ningún elemento data-qa" });
    return issues;
  }
  const z = observed.zones;

  // Check 1: cada zona observada debe estar dentro de su zona declarada.
  for (const [key, expected] of Object.entries(ZONES)) {
    const got = z[key];
    if (!got) {
      // No es error si la zona es opcional (bandeja, bocadillo); solo loguear.
      if (key === "bandeja" || key === "bocadillo") continue;
      issues.push({ severity: "warn", msg: `Zona "${key}" no encontrada en el DOM (data-qa missing)` });
      continue;
    }
    if (!rectInside(got, expected, TOLERANCE)) {
      issues.push({
        severity: "error",
        msg: `Zona "${key}" fuera de su área declarada: ` +
             `observado (${got.x.toFixed(0)}, ${got.y.toFixed(0)}, ${got.w.toFixed(0)}×${got.h.toFixed(0)}) ` +
             `vs declarado (${expected.x}, ${expected.y}, ${expected.w}×${expected.h})`,
      });
    }
  }

  // Check 2: ningún par de zonas se superpone (con excepciones).
  const keys = Object.keys(z);
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const a = keys[i], b = keys[j];
      const pair = [a, b].sort().join("|");
      if (ALLOWED_OVERLAPS.has(pair)) continue;
      if (rectsOverlap(z[a], z[b])) {
        issues.push({
          severity: "error",
          msg: `Zonas "${a}" y "${b}" se superponen. Ajustar posiciones.`,
        });
      }
    }
  }

  // Check 3: ningún elemento sale del lienzo (con margen 8px).
  for (const [key, got] of Object.entries(z)) {
    if (got.x < -TOLERANCE || got.y < -TOLERANCE ||
        got.x + got.w > 900 + TOLERANCE || got.y + got.h > 540 + TOLERANCE) {
      issues.push({
        severity: "error",
        msg: `Zona "${key}" sale del lienzo 900×540: (${got.x.toFixed(0)}, ${got.y.toFixed(0)}, ${got.w.toFixed(0)}×${got.h.toFixed(0)})`,
      });
    }
  }

  return issues;
}

async function checkButtonSizes(page) {
  return await page.evaluate(({ minBtn, minFicha }) => {
    const issues = [];
    // Botones dentro de data-qa="acciones"
    const accionesEl = document.querySelector('[data-qa="acciones"]');
    if (accionesEl) {
      accionesEl.querySelectorAll("button").forEach(btn => {
        const r = btn.getBoundingClientRect();
        if (r.width < minBtn || r.height < minBtn) {
          issues.push({ severity: "warn", msg: `Botón "${btn.textContent.trim()}" en acciones: ${r.width.toFixed(0)}×${r.height.toFixed(0)} (mínimo ${minBtn}×${minBtn})` });
        }
      });
    }
    // Fichas dentro de data-qa="bandeja"
    const bandejaEl = document.querySelector('[data-qa="bandeja"]');
    if (bandejaEl) {
      bandejaEl.querySelectorAll("button").forEach(btn => {
        const r = btn.getBoundingClientRect();
        if (r.width < minFicha || r.height < minFicha) {
          issues.push({ severity: "warn", msg: `Ficha "${btn.textContent.trim()}" en bandeja: ${r.width.toFixed(0)}×${r.height.toFixed(0)} (mínimo ${minFicha}×${minFicha})` });
        }
      });
    }
    return issues;
  }, { minBtn: MIN_BUTTON_SIZE, minFicha: MIN_FICHA_SIZE });
}

// ─────────────────────────────────────────────────────────────
// Flujo principal: ejercicio el juego en cada viewport, captura,
// valida.
// ─────────────────────────────────────────────────────────────
async function runForViewport(browser, vp, baseUrl, screenshotsDir) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  const allIssues = [];

  try {
    // 1. Home — cargar y capturar
    await page.goto(baseUrl, { waitUntil: "load" });
    await page.waitForTimeout(700); // dejar que Babel compile y React monte
    await page.screenshot({ path: path.join(screenshotsDir, `${vp.name}-1-home.png`), fullPage: false });

    // En mobile-portrait el overlay BLOQUEANTE "Gira tu teléfono" cubre toda
    // la app — es comportamiento esperado, no un bug. Si está activo, el
    // único QA posible es la captura de Home; el resto del flujo no aplica.
    const rotateOverlay = page.locator('[role="dialog"][aria-label*="Gira" i]').first();
    if (await rotateOverlay.count() > 0 && await rotateOverlay.isVisible()) {
      // Salida temprana: el overlay es la UI esperada en este viewport.
      return { viewport: vp.name, issues: allIssues, skippedFlow: "rotate-overlay" };
    }

    // 2. Avanzar: escribir nombre y presionar ENTRAR
    const nameInput = page.locator('input[placeholder*="nombre" i]').first();
    if (await nameInput.count() > 0) {
      await nameInput.fill("QABot");
      await page.locator('button:has-text("ENTRAR")').first().click();
      await page.waitForTimeout(400);
    }

    // 3. Personaje — capturar y elegir
    await page.screenshot({ path: path.join(screenshotsDir, `${vp.name}-2-character.png`), fullPage: false });
    const vamosBtn = page.locator('button:has-text("VAMOS")').first();
    if (await vamosBtn.count() > 0) {
      await vamosBtn.click();
      await page.waitForTimeout(500);
    }

    // 4. Game — capturar y validar zonas
    await page.screenshot({ path: path.join(screenshotsDir, `${vp.name}-3-game.png`), fullPage: false });
    const observed = await getZoneBoxes(page);
    const zoneIssues = validateZones(observed, vp.name);
    allIssues.push(...zoneIssues);
    const buttonIssues = await checkButtonSizes(page);
    allIssues.push(...buttonIssues);

  } catch (err) {
    allIssues.push({ severity: "error", msg: `Excepción durante el flujo: ${err.message}` });
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

  // Resumen
  const total = results.reduce((acc, r) => acc + r.issues.length, 0);
  const errors = results.reduce((acc, r) => acc + r.issues.filter(i => i.severity === "error").length, 0);
  const summary = {
    timestamp: new Date().toISOString(),
    cwd,
    viewports: VIEWPORTS.length,
    totalIssues: total,
    errorIssues: errors,
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
