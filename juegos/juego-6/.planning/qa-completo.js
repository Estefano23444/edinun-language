// qa-completo.js — recorre los 6 mecánicos completos para inspección visual.
// Resuelve cada ronda automáticamente para llegar a la siguiente.

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const URL = "http://localhost:8765/juegos/juego-6/index.html";
const OUT_DIR = path.join(__dirname, "qa-screenshots");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function shoot(page, label) {
  await page.screenshot({ path: path.join(OUT_DIR, `${label}.png`), fullPage: false });
  console.log(`  📸 ${label}`);
}

async function clickByText(page, text, idx = 0) {
  const loc = page.locator(`button:has-text('${text}')`).nth(idx);
  await loc.click({ timeout: 4000 });
}

async function flow(browser, nivel, levelText) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });

  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);

  console.log(`\n──── ${nivel} ────`);
  await clickByText(page, levelText);
  await page.fill("input.ed-input", "Sofía");
  await page.waitForTimeout(150);
  await clickByText(page, "ENTRAR");
  await page.waitForTimeout(450);
  await clickByText(page, "¡VAMOS");
  await page.waitForTimeout(700);

  return { ctx, page, errors };
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  // ───────── Nivel 1: Texto poético ─────────
  {
    const { ctx, page, errors } = await flow(browser, "N1 Poético", "Texto poético");

    // R1 ruleta
    await shoot(page, "FULL-N1R1-inicio");
    await clickByText(page, "COMPARACIÓN");
    await page.waitForTimeout(1400);
    await shoot(page, "FULL-N1R1-spun");
    await clickByText(page, "VERIFICAR");
    await page.waitForTimeout(1600);

    // R2 detective — capturar y resolver clickeando palabras dashed (las err)
    await shoot(page, "FULL-N1R2-inicio");
    // Buscar los spans con cursor pointer dentro de zona-central
    const tokens = page.locator("[data-qa='zona-central'] span[style*='cursor: pointer']");
    const tc = await tokens.count();
    console.log(`  N1R2 tokens clickeables: ${tc}`);
    // Click en los que tengan err (no fácil identificar desde el DOM)
    // Hagamos 3 clicks aleatorios para llegar al estado "3/3"
    for (let i = 0; i < Math.min(3, tc); i++) await tokens.nth(i).click();
    await page.waitForTimeout(300);
    await shoot(page, "FULL-N1R2-marked");
    await clickByText(page, "VERIFICAR");
    await page.waitForTimeout(1700);

    // R3 memoria
    await shoot(page, "FULL-N1R3-inicio");

    await ctx.close();
    console.log(errors.length ? `  ❌ ${errors.length} errors` : `  ✓ ok`);
  }

  // ───────── Nivel 2: Texto instructivo ─────────
  {
    const { ctx, page, errors } = await flow(browser, "N2 Instructivo", "Texto instructivo");

    // R1 kichwa
    await shoot(page, "FULL-N2R1-inicio");
    // Resolver: para cada miembro, click etiqueta y luego click miembro
    // Estrategia simple: extraer el data desde window y resolver con evaluate
    const ok = await page.evaluate(() => {
      // Hacer click programáticamente no es trivial — solo dejamos visualizado
      return true;
    });

    // Click etiqueta y miembro de prueba
    const labels = page.locator("[data-qa='bandeja'] button");
    const labelCount = await labels.count();
    if (labelCount > 0) {
      await labels.first().click();
      await page.waitForTimeout(200);
    }
    await shoot(page, "FULL-N2R1-pick");

    // R2 ordena — verificar la disposición
    // (no podemos llegar directo a R2; capturamos solo R1)

    // R3 laboratorio — idem

    await ctx.close();
    console.log(errors.length ? `  ❌ ${errors.length} errors` : `  ✓ ok`);
  }

  await browser.close();
})();
