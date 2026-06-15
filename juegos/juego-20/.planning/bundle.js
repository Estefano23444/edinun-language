// bundle.js — Re-empaqueta los .jsx editables en el bloque
// <script type="text/babel"> de index.html y EDINUN GAMES.html.
// Equivalente Node de bundle.py. Pensado para entornos Windows
// sin Python (este repo tiene Node v24 + Playwright disponibles).
//
// Uso:
//   cd juegos/<slug>
//   node .planning/bundle.js
//
// Mantiene los dos HTML idénticos byte a byte.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const JSX_FILES  = ["logo.jsx", "characters.jsx", "screens.jsx", "game-screens.jsx", "app.jsx"];
const HTML_FILES = ["index.html", "EDINUN GAMES.html"];

// 1. Concatenar los .jsx en orden de dependencia.
const bundleParts = [];
for (const f of JSX_FILES) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) {
    console.error(`ERROR: no se encontró ${f} en ${ROOT}`);
    process.exit(1);
  }
  const text = fs.readFileSync(p, "utf8");
  // Sanity check: ningún .jsx puede contener </script> literal porque
  // el parser HTML cerraría el <script type=text/babel> antes de tiempo.
  if (/<\/script>/i.test(text)) {
    console.error(`ERROR: ${f} contiene '</script>' literal. Dividir el token (ej: "<\\/scr"+"ipt>").`);
    process.exit(1);
  }
  bundleParts.push(text);
}
const bundle = bundleParts.join("\n");

// 2. Patrón: reemplaza desde <script type="text/babel" data-presets="react">
// hasta </html>. Flags: s = . matches \n, i = case-insensitive.
const PATTERN = /(<script type="text\/babel" data-presets="react">)[\s\S]*<\/html>/i;
const replacement = `$1\n${bundle}\n</script>\n</body>\n</html>`;

for (const html of HTML_FILES) {
  const p = path.join(ROOT, html);
  if (!fs.existsSync(p)) {
    console.error(`ERROR: no se encontró ${html} en ${ROOT}`);
    process.exit(1);
  }
  const src = fs.readFileSync(p, "utf8");
  if (!PATTERN.test(src)) {
    console.error(`ERROR: no se encontró el bloque <script babel> en ${html}`);
    process.exit(1);
  }
  const out = src.replace(PATTERN, replacement);
  fs.writeFileSync(p, out, "utf8");
  console.log(`  OK ${html} actualizado (${out.length} bytes)`);
}

console.log("Bundle listo.");
