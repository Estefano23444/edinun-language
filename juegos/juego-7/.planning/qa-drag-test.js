// qa-drag-test.js — verifica que el drag-and-drop coloca elementos correctamente.
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 80 });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (msg) => { if (msg.type() === "error") errors.push("console: " + msg.text()); });

  await page.goto("http://localhost:8765/juegos/juego-7/index.html", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);

  // Home → seleccionar La reseña + nombre + entrar
  await page.locator("button:has-text('La reseña')").first().click();
  await page.fill("input.ed-input", "Test");
  await page.locator("button:has-text('ENTRAR')").first().click();
  await page.waitForTimeout(500);
  await page.locator("button:has-text('¡VAMOS')").first().click();
  await page.waitForTimeout(700);

  // Estamos en N1R1 Ficha. Vamos a arrastrar.
  console.log("\n=== Test drag en N1R1 Ficha ===");
  // Tomar el primer item de la bandeja
  const bandejaItems = page.locator("[data-qa='bandeja'] .ed-draggable");
  const count = await bandejaItems.count();
  console.log(`Items en bandeja: ${count}`);

  if (count > 0) {
    const item = bandejaItems.first();
    const itemText = await item.textContent();
    console.log(`Arrastrando: "${itemText}"`);
    const itemBox = await item.boundingBox();

    // Tomar el primer slot
    const firstSlot = page.locator("[data-dropzone^='slot:']").first();
    const slotBox = await firstSlot.boundingBox();
    const slotName = await firstSlot.getAttribute("data-dropzone");
    console.log(`Slot destino: ${slotName} at (${slotBox.x}, ${slotBox.y})`);

    // Simular drag con pointer events
    await page.mouse.move(itemBox.x + itemBox.width / 2, itemBox.y + itemBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(50);
    // Mover en pasos para que sea > 8px y se active drag
    const steps = 10;
    const dx = (slotBox.x + slotBox.width / 2) - (itemBox.x + itemBox.width / 2);
    const dy = (slotBox.y + slotBox.height / 2) - (itemBox.y + itemBox.height / 2);
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(
        itemBox.x + itemBox.width / 2 + (dx * i) / steps,
        itemBox.y + itemBox.height / 2 + (dy * i) / steps,
        { steps: 1 }
      );
      await page.waitForTimeout(20);
    }
    await page.waitForTimeout(150);
    await page.screenshot({ path: ".planning/qa-screenshots/drag-mid.png" });
    await page.mouse.up();
    await page.waitForTimeout(500);
    await page.screenshot({ path: ".planning/qa-screenshots/drag-end.png" });

    // Verificar que el slot ahora tiene un valor
    const slotText = await firstSlot.textContent();
    console.log(`Texto del slot tras drop: "${slotText}"`);

    if (slotText && slotText.includes(itemText.trim())) {
      console.log(`✓ DRAG OK — el item se colocó correctamente`);
    } else {
      console.log(`✗ DRAG FAIL — el item NO se colocó`);
    }
  }

  // Pasar a R2
  await page.evaluate(() => window.__qa_skip && window.__qa_skip());
  await page.waitForTimeout(500);

  console.log("\n=== Test drag en N1R2 Partes ===");
  const frases = page.locator("[data-qa='bandeja'] .ed-draggable");
  const frasesCount = await frases.count();
  console.log(`Frases en bandeja: ${frasesCount}`);

  if (frasesCount > 0) {
    const f = frases.first();
    const fText = await f.textContent();
    console.log(`Arrastrando: "${fText.slice(0, 50)}..."`);
    const fBox = await f.boundingBox();
    const cajon = page.locator("[data-dropzone='descripcion']");
    const cajonBox = await cajon.boundingBox();

    await page.mouse.move(fBox.x + fBox.width / 2, fBox.y + fBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(50);
    const steps = 15;
    const dx = (cajonBox.x + cajonBox.width / 2) - (fBox.x + fBox.width / 2);
    const dy = (cajonBox.y + cajonBox.height / 2) - (fBox.y + fBox.height / 2);
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(
        fBox.x + fBox.width / 2 + (dx * i) / steps,
        fBox.y + fBox.height / 2 + (dy * i) / steps
      );
      await page.waitForTimeout(20);
    }
    await page.waitForTimeout(150);
    await page.screenshot({ path: ".planning/qa-screenshots/drag-partes-mid.png" });
    await page.mouse.up();
    await page.waitForTimeout(500);
    await page.screenshot({ path: ".planning/qa-screenshots/drag-partes-end.png" });

    const cajonText = await cajon.textContent();
    const fSlice = fText.slice(0, 30);
    if (cajonText && cajonText.includes(fSlice.slice(0, 20))) {
      console.log(`✓ DRAG OK — la frase se colocó en DESCRIPCIÓN`);
    } else {
      console.log(`✗ DRAG FAIL — la frase NO se colocó`);
      console.log(`  Texto del cajón: "${cajonText.slice(0, 100)}"`);
    }
  }

  console.log("\nErrores en consola:", errors.length);
  errors.forEach((e) => console.log(" -", e));

  await page.waitForTimeout(1500);
  await browser.close();
})();
