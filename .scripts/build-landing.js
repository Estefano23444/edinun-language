// build-landing.js — Regenera index.html (landing) del repo edinun-language.
// Lee la plantilla de la skill, sustituye los placeholders {{LOGO_JSX}},
// {{CHARACTERS_JSX}} y {{GAMES_JSON}} con el contenido actual.
//
// GAMES_JSON se construye listando carpetas en juegos/ y leyendo un
// pequeño "manifest" (.planning/<slug>-design.md) o un fallback a
// MEMORY.md para extraer title + charId.
//
// Uso: node .scripts/build-landing.js

const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
// La skill vive dentro de este mismo repo en .claude/skills/edinun-language-builder/.
const SKILL_TEMPLATE = path.resolve(
  REPO,
  ".claude",
  "skills",
  "edinun-game-builder",
  "assets"
);

const landingTemplatePath = path.join(SKILL_TEMPLATE, "landing-template", "index.html");
const juegosDir = path.join(REPO, "juegos");

// Leer logo.jsx y characters.jsx desde el primer juego (alfabético) o desde el template si no hay juegos.
function readSharedJsx() {
  const slugs = fs.existsSync(juegosDir)
    ? fs.readdirSync(juegosDir).filter((f) => fs.statSync(path.join(juegosDir, f)).isDirectory()).sort()
    : [];
  const source = slugs.length > 0
    ? path.join(juegosDir, slugs[0])
    : path.join(SKILL_TEMPLATE, "template-juego");
  const logoJsx = fs.readFileSync(path.join(source, "logo.jsx"), "utf8");
  const charactersJsx = fs.readFileSync(path.join(source, "characters.jsx"), "utf8");
  return { logoJsx, charactersJsx };
}

// Construye GAMES = [{ slug, title, charId }, ...] leyendo cada .planning/<slug>-design.md
function buildGamesJson() {
  if (!fs.existsSync(juegosDir)) return [];
  const slugs = fs.readdirSync(juegosDir)
    .filter((f) => fs.statSync(path.join(juegosDir, f)).isDirectory())
    .sort();
  return slugs.map((slug) => {
    const designPath = path.join(juegosDir, slug, ".planning", `${slug}-design.md`);
    let title = slug;
    let charId = "escritor";
    if (fs.existsSync(designPath)) {
      const content = fs.readFileSync(designPath, "utf8");
      const titleMatch = content.match(/^#\s+(.+?)(?:\s*—|$)/m);
      if (titleMatch) title = titleMatch[1].trim();
      const charMatch = content.match(/charId:\s*(\w+)/);
      if (charMatch) charId = charMatch[1];
    }
    return { slug, title, charId };
  });
}

const template = fs.readFileSync(landingTemplatePath, "utf8");
const { logoJsx, charactersJsx } = readSharedJsx();
const games = buildGamesJson();

// `replaceAll` con string busca todas las ocurrencias literales — necesario
// porque el template tiene comentarios HTML que mencionan los placeholders
// (ej: "{{LOGO_JSX}}  contenido tal cual de logo.jsx"); con `replace` solo
// se sustituye la PRIMERA ocurrencia (la del comentario) y la real queda
// sin reemplazar.
const out = template
  .replaceAll("{{LOGO_JSX}}", logoJsx)
  .replaceAll("{{CHARACTERS_JSX}}", charactersJsx)
  .replaceAll("{{GAMES_JSON}}", JSON.stringify(games, null, 2))
  // Corrige el título: el template dice "matemáticas" pero este repo es de lenguaje.
  .replaceAll("EDINUN GAMES · Juegos de matemáticas", "EDINUN GAMES · Juegos de lenguaje y literatura");

fs.writeFileSync(path.join(REPO, "index.html"), out, "utf8");
console.log(`landing escrito: ${games.length} juego(s) — ${games.map((g) => g.slug).join(", ") || "(vacío)"}`);
