// game-screens.jsx — Juego 7. Dos niveles de lenguaje con mecánicas distintas:
//   1. La reseña             (8 años)  — ficha del libro / partes de la reseña / ordena el cuento
//   2. Aprendiendo a escribir (10 años) — pronombre detective / laboratorio verboides / pintor de verbos
//
// GameScreen delega al sub-componente según app.currentCategory.
// ResultsScreen es compartido y se monta automáticamente al terminar.

const { useState: useStateG, useEffect: useEffectG, useRef: useRefG, useMemo: useMemoG } = React;

function PortalToBody({ children }) {
  return ReactDOM.createPortal(children, document.body);
}

// ─────────────────────────────────────────────────────────────
// Utilidades comunes
// ─────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─────────────────────────────────────────────────────────────
// makeDragHandler — pointer-events drag with tap fallback.
// Usage: onPointerDown={makeDragHandler({ item, ghostHtml, onTap, onDrop })}
// Drops sobre el primer ancestor con data-dropzone="<id>".
// ─────────────────────────────────────────────────────────────
function makeDragHandler({ item, ghostHtml, onTap, onDrop, disabled }) {
  return function onPointerDown(e) {
    if (disabled) return;
    if (e.button !== undefined && e.button !== 0) return;
    // Prevent default to avoid native drag interference and text selection
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    let started = false;
    let ghost = null;
    let currentZoneId = null;       // last hovered drop zone id (trackeada en move)
    let lastX = startX, lastY = startY;
    const highlights = new Set();

    function clearHighlights() {
      for (const el of highlights) el.classList.remove("ed-drop-hover");
      highlights.clear();
    }

    function findZoneAt(x, y) {
      // Hide ghost momentarily to ensure elementFromPoint hits real DOM
      let prevVis = null;
      if (ghost) { prevVis = ghost.style.visibility; ghost.style.visibility = "hidden"; }
      const under = document.elementFromPoint(x, y);
      if (ghost) ghost.style.visibility = prevVis || "";
      if (!under || !under.closest) return null;
      const zone = under.closest("[data-dropzone]");
      return zone || null;
    }

    function onMove(ev) {
      const x = ev.clientX, y = ev.clientY;
      lastX = x; lastY = y;
      if (!started && Math.hypot(x - startX, y - startY) > 6) {
        started = true;
        ghost = document.createElement("div");
        ghost.style.cssText = "position:fixed;pointer-events:none;z-index:9999;transform:translate(-50%,-50%);transition:none;left:" + x + "px;top:" + y + "px;";
        ghost.innerHTML = ghostHtml || `<div style="background:#fce9a8;color:#3a2608;padding:6px 12px;border-radius:10px;font-family:Fredoka,Nunito,sans-serif;font-weight:800;font-size:12px;border:2px solid #4fd8ff;box-shadow:0 6px 18px rgba(0,0,0,0.5);">${String(item).slice(0,60)}</div>`;
        document.body.appendChild(ghost);
        document.body.style.cursor = "grabbing";
      }
      if (started && ghost) {
        ghost.style.left = x + "px";
        ghost.style.top = y + "px";
        // highlight hover zone (y guardarlo para el up)
        clearHighlights();
        const zone = findZoneAt(x, y);
        if (zone) {
          zone.classList.add("ed-drop-hover");
          highlights.add(zone);
          currentZoneId = zone.dataset.dropzone;
        } else {
          currentZoneId = null;
        }
      }
    }

    function onUp(ev) {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onCancel);

      // Antes de remover el ghost, intentar resolver el zone más reciente
      let finalZone = currentZoneId;
      if (started && !finalZone) {
        // último recurso: chequear posición exacta del up
        const x = (ev && ev.clientX != null) ? ev.clientX : lastX;
        const y = (ev && ev.clientY != null) ? ev.clientY : lastY;
        const zone = findZoneAt(x, y);
        if (zone) finalZone = zone.dataset.dropzone;
      }

      if (ghost) { ghost.remove(); ghost = null; }
      document.body.style.cursor = "";
      clearHighlights();

      if (!started) {
        if (onTap) onTap(item);
      } else if (finalZone && onDrop) {
        onDrop(finalZone, item);
      }
    }

    function onCancel() {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onCancel);
      if (ghost) { ghost.remove(); ghost = null; }
      document.body.style.cursor = "";
      clearHighlights();
    }

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onCancel);
  };
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function calcStars(isCorrect, exerciseSec) {
  return isCorrect ? Math.max(1, 10 - Math.floor(exerciseSec / 3)) : 0;
}

const ENCOURAGEMENTS = [
  "¡Casi! Sigue intentándolo.",
  "¡La próxima es tuya!",
  "Equivocarse también es aprender.",
  "¡Vamos a la siguiente!",
  "Cada error te acerca al acierto.",
];

const RECENT_KEYS = {
  resena:   "edinun_juego7_resena_recientes_v1",
  escritor: "edinun_juego7_escritor_recientes_v1",
  usog:     "edinun_juego7_usog_recientes_v1",
};
const RECENT_LIMIT = 4;

function getRecent(level) {
  try {
    const raw = localStorage.getItem(RECENT_KEYS[level]);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function pushRecent(level, key) {
  const arr = getRecent(level).filter((k) => k !== key);
  arr.unshift(key);
  const trimmed = arr.slice(0, RECENT_LIMIT);
  try { localStorage.setItem(RECENT_KEYS[level], JSON.stringify(trimmed)); } catch {}
}

// ─────────────────────────────────────────────────────────────
// BANCOS — TEMA 1 (La reseña)
// ─────────────────────────────────────────────────────────────

// R1 — Partes de la reseña: 6 párrafos cortos a clasificar en D/V/C (2 de cada)
const RESENAS_BANK = [
  {
    id: "matilda",
    titulo: "Matilda",
    portada: "📕",
    parrafos: [
      { id: "p1", texto: "Es una novela de Roald Dahl publicada en 1988.",                       tipo: "descripcion" },
      { id: "p2", texto: "Cuenta la historia de una niña genial con poderes especiales.",        tipo: "descripcion" },
      { id: "p3", texto: "Me gustó muchísimo porque Matilda es valiente e inteligente.",         tipo: "valoracion" },
      { id: "p4", texto: "Lo más bonito es la amistad de Matilda con su maestra.",               tipo: "valoracion" },
      { id: "p5", texto: "Lo recomiendo a quienes aman las historias con personajes fuertes.",   tipo: "conclusion" },
      { id: "p6", texto: "Si te gustan las niñas valientes, este libro es para ti.",             tipo: "conclusion" },
    ],
  },
  {
    id: "oso-piano",
    titulo: "El oso y el piano",
    portada: "🐻",
    parrafos: [
      { id: "p1", texto: "Es un álbum ilustrado de David Litchfield del año 2015.",              tipo: "descripcion" },
      { id: "p2", texto: "Cuenta la historia de un oso que encuentra un piano en el bosque.",    tipo: "descripcion" },
      { id: "p3", texto: "Me encantó cómo las ilustraciones acompañan la historia.",             tipo: "valoracion" },
      { id: "p4", texto: "Lo que más me gustó es que el oso nunca olvida a sus amigos.",         tipo: "valoracion" },
      { id: "p5", texto: "Lo recomiendo para regalar a quienes están lejos de casa.",            tipo: "conclusion" },
      { id: "p6", texto: "Si buscas una historia tierna, este libro es perfecto.",               tipo: "conclusion" },
    ],
  },
  {
    id: "principito",
    titulo: "El principito",
    portada: "👑",
    parrafos: [
      { id: "p1", texto: "Es un libro de Antoine de Saint-Exupéry publicado en 1943.",           tipo: "descripcion" },
      { id: "p2", texto: "Trata sobre un piloto que conoce a un niño llegado de otro planeta.",  tipo: "descripcion" },
      { id: "p3", texto: "Me encantó la forma sencilla de hablar de la amistad y el amor.",      tipo: "valoracion" },
      { id: "p4", texto: "Lo que más me gustó es la parte del zorro y su secreto del corazón.",  tipo: "valoracion" },
      { id: "p5", texto: "Lo recomiendo a niños y a adultos por igual.",                         tipo: "conclusion" },
      { id: "p6", texto: "Si buscas un libro corto y profundo, no dudes en leerlo.",             tipo: "conclusion" },
    ],
  },
  {
    id: "pinocho",
    titulo: "Pinocho",
    portada: "🪵",
    parrafos: [
      { id: "p1", texto: "Es una novela de Carlo Collodi publicada en 1883.",                    tipo: "descripcion" },
      { id: "p2", texto: "Cuenta la historia de un muñeco de madera que quiere ser un niño real.", tipo: "descripcion" },
      { id: "p3", texto: "Me gustó porque enseña a no decir mentiras.",                          tipo: "valoracion" },
      { id: "p4", texto: "Lo más bonito es cuando Pinocho aprende a ser valiente.",              tipo: "valoracion" },
      { id: "p5", texto: "Lo recomiendo a quienes disfrutan los cuentos clásicos.",              tipo: "conclusion" },
      { id: "p6", texto: "Si te gusta la fantasía, este libro te encantará.",                    tipo: "conclusion" },
    ],
  },
  {
    id: "charlie-chocolate",
    titulo: "Charlie y la fábrica de chocolate",
    portada: "🍫",
    parrafos: [
      { id: "p1", texto: "Es una novela de Roald Dahl publicada en 1964.",                       tipo: "descripcion" },
      { id: "p2", texto: "Cuenta cómo un niño pobre gana un boleto para visitar una fábrica mágica.", tipo: "descripcion" },
      { id: "p3", texto: "Me encantó la imaginación y los inventos golosos del señor Wonka.",    tipo: "valoracion" },
      { id: "p4", texto: "Lo que más me gustó es la familia humilde y unida de Charlie.",        tipo: "valoracion" },
      { id: "p5", texto: "Lo recomiendo a quienes aman la fantasía y la aventura.",              tipo: "conclusion" },
      { id: "p6", texto: "Si buscas una historia divertida, este libro es ideal.",               tipo: "conclusion" },
    ],
  },
  {
    id: "patito-feo",
    titulo: "El patito feo",
    portada: "🦢",
    parrafos: [
      { id: "p1", texto: "Es un cuento clásico de Hans Christian Andersen del año 1843.",        tipo: "descripcion" },
      { id: "p2", texto: "Trata sobre un patito diferente que crece sintiéndose solo.",          tipo: "descripcion" },
      { id: "p3", texto: "Me gustó muchísimo el mensaje sobre aceptarse uno mismo.",             tipo: "valoracion" },
      { id: "p4", texto: "Lo más bonito es el final, cuando descubre quién es realmente.",       tipo: "valoracion" },
      { id: "p5", texto: "Lo recomiendo para hablar de respeto y diferencias.",                  tipo: "conclusion" },
      { id: "p6", texto: "Si buscas un cuento corto con enseñanza, este es perfecto.",           tipo: "conclusion" },
    ],
  },
];

// R2 — Determinantes numerales e indefinidos: texto con 5 determinantes a clasificar
// Tipos: cardinal (cantidad exacta), ordinal (orden), indefinido (cantidad no exacta)
const DETERMINANTES_BANK = [
  {
    id: "ana-clara",
    titulo: "Ana Clara y el videojuego",
    parrafo: [
      { t: "Ana Clara llegó en el " },
      { d: "tercer",      tipo: "ordinal",    note: "ordinal · indica orden" },
      { t: " lugar. Para ganar completó el nivel " },
      { d: "cinco",       tipo: "cardinal",   note: "cardinal · cantidad exacta" },
      { t: " presionando el botón " },
      { d: "varias",      tipo: "indefinido", note: "indefinido · cantidad no exacta" },
      { t: " veces hasta tener " },
      { d: "doscientos",  tipo: "cardinal",   note: "cardinal · cantidad exacta" },
      { t: " puntos y " },
      { d: "todos",       tipo: "indefinido", note: "indefinido · cantidad no exacta" },
      { t: " los premios." },
    ],
  },
  {
    id: "carrera",
    titulo: "La carrera",
    parrafo: [
      { t: "En la carrera, Marco ganó el " },
      { d: "primer",   tipo: "ordinal",    note: "ordinal · indica orden" },
      { t: " lugar y Roberta el " },
      { d: "segundo",  tipo: "ordinal",    note: "ordinal · indica orden" },
      { t: ". Hubo " },
      { d: "veinte",   tipo: "cardinal",   note: "cardinal · cantidad exacta" },
      { t: " corredores y " },
      { d: "algunos",  tipo: "indefinido", note: "indefinido · cantidad no exacta" },
      { t: " perdieron. Ella corrió " },
      { d: "tres",     tipo: "cardinal",   note: "cardinal · cantidad exacta" },
      { t: " kilómetros." },
    ],
  },
  {
    id: "biblioteca",
    titulo: "En la biblioteca",
    parrafo: [
      { t: "En el " },
      { d: "noveno",     tipo: "ordinal",    note: "ordinal · indica orden" },
      { t: " piso encontré " },
      { d: "muchos",     tipo: "indefinido", note: "indefinido · cantidad no exacta" },
      { t: " libros. Mi prima leyó " },
      { d: "trescientas",tipo: "cardinal",   note: "cardinal · cantidad exacta" },
      { t: " páginas. El " },
      { d: "quinto",     tipo: "ordinal",    note: "ordinal · indica orden" },
      { t: " tomo tenía " },
      { d: "algún",      tipo: "indefinido", note: "indefinido · cantidad no exacta" },
      { t: " dibujo precioso." },
    ],
  },
  {
    id: "cumple",
    titulo: "El cumpleaños",
    parrafo: [
      { t: "Sofía cumplió " },
      { d: "ocho",       tipo: "cardinal",   note: "cardinal · cantidad exacta" },
      { t: " años. Recibió " },
      { d: "varios",     tipo: "indefinido", note: "indefinido · cantidad no exacta" },
      { t: " regalos y comió el " },
      { d: "primer",     tipo: "ordinal",    note: "ordinal · indica orden" },
      { t: " pedazo de torta. Después, " },
      { d: "todos",      tipo: "indefinido", note: "indefinido · cantidad no exacta" },
      { t: " sus amigos cantaron por " },
      { d: "diez",       tipo: "cardinal",   note: "cardinal · cantidad exacta" },
      { t: " minutos." },
    ],
  },
  {
    id: "futbol",
    titulo: "El partido de fútbol",
    parrafo: [
      { t: "Mi equipo quedó en " },
      { d: "segundo",    tipo: "ordinal",    note: "ordinal · indica orden" },
      { t: " lugar. Anotamos " },
      { d: "cuatro",     tipo: "cardinal",   note: "cardinal · cantidad exacta" },
      { t: " goles. " },
      { d: "Algunos",    tipo: "indefinido", note: "indefinido · cantidad no exacta" },
      { t: " jugadores estaban cansados. El " },
      { d: "tercer",     tipo: "ordinal",    note: "ordinal · indica orden" },
      { t: " tiempo fue duro y ganamos por " },
      { d: "dos",        tipo: "cardinal",   note: "cardinal · cantidad exacta" },
      { t: " puntos." },
    ],
  },
  {
    id: "mercado",
    titulo: "El mercado",
    parrafo: [
      { t: "En el mercado compré " },
      { d: "varias",   tipo: "indefinido", note: "indefinido · cantidad no exacta" },
      { t: " frutas. La " },
      { d: "primera",  tipo: "ordinal",    note: "ordinal · indica orden" },
      { t: " caja tenía " },
      { d: "doce",     tipo: "cardinal",   note: "cardinal · cantidad exacta" },
      { t: " manzanas y " },
      { d: "muchos",   tipo: "indefinido", note: "indefinido · cantidad no exacta" },
      { t: " mangos. Pagué con " },
      { d: "cinco",    tipo: "cardinal",   note: "cardinal · cantidad exacta" },
      { t: " dólares." },
    ],
  },
  {
    id: "excursion",
    titulo: "La excursión",
    parrafo: [
      { t: "Salimos de excursión y vimos " },
      { d: "diez",      tipo: "cardinal",   note: "cardinal · cantidad exacta" },
      { t: " mariposas. " },
      { d: "Algunas",   tipo: "indefinido", note: "indefinido · cantidad no exacta" },
      { t: " eran azules. El " },
      { d: "cuarto",    tipo: "ordinal",    note: "ordinal · indica orden" },
      { t: " día subimos una loma. Llevamos " },
      { d: "ochenta",   tipo: "cardinal",   note: "cardinal · cantidad exacta" },
      { t: " litros de agua y " },
      { d: "pocas",     tipo: "indefinido", note: "indefinido · cantidad no exacta" },
      { t: " mochilas." },
    ],
  },
];

// R3 — Verbo camaleón: lexema + tabla de conjugación (5 personas)
const VERBO_TABLA_BANK = [
  {
    id: "cambiar",
    verbo: "CAMBIAR",
    lexema: "cambi",
    filas: [
      { id: "yo",       persona: "Yo",         desinencia: "o" },
      { id: "tu",       persona: "Tú",         desinencia: "as" },
      { id: "el",       persona: "Él / Ella",  desinencia: "a" },
      { id: "nosotros", persona: "Nosotros",   desinencia: "amos" },
      { id: "ellos",    persona: "Ellos",      desinencia: "an" },
    ],
    bandeja: ["o", "as", "es", "a", "e", "amos", "emos", "an", "en"],
  },
  {
    id: "correr",
    verbo: "CORRER",
    lexema: "corr",
    filas: [
      { id: "yo",       persona: "Yo",         desinencia: "o" },
      { id: "tu",       persona: "Tú",         desinencia: "es" },
      { id: "el",       persona: "Él / Ella",  desinencia: "e" },
      { id: "nosotros", persona: "Nosotros",   desinencia: "emos" },
      { id: "ellos",    persona: "Ellos",      desinencia: "en" },
    ],
    bandeja: ["o", "as", "es", "a", "e", "amos", "emos", "an", "en"],
  },
  {
    id: "escribir",
    verbo: "ESCRIBIR",
    lexema: "escrib",
    filas: [
      { id: "yo",       persona: "Yo",         desinencia: "o" },
      { id: "tu",       persona: "Tú",         desinencia: "es" },
      { id: "el",       persona: "Él / Ella",  desinencia: "e" },
      { id: "nosotros", persona: "Nosotros",   desinencia: "imos" },
      { id: "ellos",    persona: "Ellos",      desinencia: "en" },
    ],
    bandeja: ["o", "as", "es", "e", "imos", "amos", "emos", "an", "en"],
  },
  {
    id: "saltar",
    verbo: "SALTAR",
    lexema: "salt",
    filas: [
      { id: "yo",       persona: "Yo",         desinencia: "o" },
      { id: "tu",       persona: "Tú",         desinencia: "as" },
      { id: "el",       persona: "Él / Ella",  desinencia: "a" },
      { id: "nosotros", persona: "Nosotros",   desinencia: "amos" },
      { id: "ellos",    persona: "Ellos",      desinencia: "an" },
    ],
    bandeja: ["o", "as", "es", "a", "e", "amos", "emos", "an", "en"],
  },
  {
    id: "leer",
    verbo: "LEER",
    lexema: "le",
    filas: [
      { id: "yo",       persona: "Yo",         desinencia: "o" },
      { id: "tu",       persona: "Tú",         desinencia: "es" },
      { id: "el",       persona: "Él / Ella",  desinencia: "e" },
      { id: "nosotros", persona: "Nosotros",   desinencia: "emos" },
      { id: "ellos",    persona: "Ellos",      desinencia: "en" },
    ],
    bandeja: ["o", "as", "es", "a", "e", "amos", "emos", "an", "en"],
  },
  {
    id: "cantar",
    verbo: "CANTAR",
    lexema: "cant",
    filas: [
      { id: "yo",       persona: "Yo",         desinencia: "o" },
      { id: "tu",       persona: "Tú",         desinencia: "as" },
      { id: "el",       persona: "Él / Ella",  desinencia: "a" },
      { id: "nosotros", persona: "Nosotros",   desinencia: "amos" },
      { id: "ellos",    persona: "Ellos",      desinencia: "an" },
    ],
    bandeja: ["o", "as", "es", "a", "e", "amos", "emos", "an", "en"],
  },
  {
    id: "vivir",
    verbo: "VIVIR",
    lexema: "viv",
    filas: [
      { id: "yo",       persona: "Yo",         desinencia: "o" },
      { id: "tu",       persona: "Tú",         desinencia: "es" },
      { id: "el",       persona: "Él / Ella",  desinencia: "e" },
      { id: "nosotros", persona: "Nosotros",   desinencia: "imos" },
      { id: "ellos",    persona: "Ellos",      desinencia: "en" },
    ],
    bandeja: ["o", "as", "es", "e", "imos", "amos", "emos", "an", "en"],
  },
];

// ─────────────────────────────────────────────────────────────
// BANCOS — TEMA 2 (Aprendiendo a escribir)
// ─────────────────────────────────────────────────────────────

// R1 — Pronombre detective: párrafo con 3 sustantivos subrayados; cada uno con 3 opciones
const PRONOMBRES_BANK = [
  {
    id: "amigas",
    titulo: "De viaje",
    huecos: [
      { id: "h1", sustantivo: "Julia y Verónica",       pronombre: "Ellas", opciones: ["Él", "Ellas", "Tú"] },
      { id: "h2", sustantivo: "Raúl",                   pronombre: "Él",    opciones: ["Ella", "Yo", "Él"] },
      { id: "h3", sustantivo: "El cuaderno de Pablo",   pronombre: "Suyo",  opciones: ["Suyo", "Mío", "Nuestro"] },
    ],
  },
  {
    id: "casa",
    titulo: "En casa",
    huecos: [
      { id: "h1", sustantivo: "Mireya y yo",            pronombre: "Nosotras", opciones: ["Ustedes", "Nosotras", "Ellas"] },
      { id: "h2", sustantivo: "Los libros de mis amigos", pronombre: "Suyos",  opciones: ["Míos", "Suyos", "Tuyos"] },
      { id: "h3", sustantivo: "La mochila mía",         pronombre: "Mía",      opciones: ["Mía", "Tuya", "Nuestra"] },
    ],
  },
  {
    id: "clase",
    titulo: "En clase",
    huecos: [
      { id: "h1", sustantivo: "El maestro",             pronombre: "Él",       opciones: ["Yo", "Ella", "Él"] },
      { id: "h2", sustantivo: "Tú y tu hermana",        pronombre: "Ustedes",  opciones: ["Ustedes", "Nosotros", "Ellas"] },
      { id: "h3", sustantivo: "El lápiz de nosotros",   pronombre: "Nuestro",  opciones: ["Suyo", "Nuestro", "Mío"] },
    ],
  },
  {
    id: "parque",
    titulo: "En el parque",
    huecos: [
      { id: "h1", sustantivo: "Los niños del barrio",   pronombre: "Ellos",    opciones: ["Ellos", "Ustedes", "Nosotros"] },
      { id: "h2", sustantivo: "El balón de Sara",       pronombre: "Suyo",     opciones: ["Mío", "Suyo", "Tuyo"] },
      { id: "h3", sustantivo: "Andrea",                 pronombre: "Ella",     opciones: ["Él", "Ella", "Tú"] },
    ],
  },
  {
    id: "familia",
    titulo: "Mi familia",
    huecos: [
      { id: "h1", sustantivo: "Mamá y papá",            pronombre: "Ellos",    opciones: ["Ellos", "Ellas", "Ustedes"] },
      { id: "h2", sustantivo: "El perro de Diego",      pronombre: "Suyo",     opciones: ["Tuyo", "Suyo", "Nuestro"] },
      { id: "h3", sustantivo: "La casa de nosotros",    pronombre: "Nuestra",  opciones: ["Mía", "Nuestra", "Suya"] },
    ],
  },
  {
    id: "cumple",
    titulo: "El cumpleaños",
    huecos: [
      { id: "h1", sustantivo: "Daniela",                pronombre: "Ella",     opciones: ["Él", "Ella", "Yo"] },
      { id: "h2", sustantivo: "Los regalos de Diego",   pronombre: "Suyos",    opciones: ["Míos", "Tuyos", "Suyos"] },
      { id: "h3", sustantivo: "Tú y tus amigos",        pronombre: "Ustedes",  opciones: ["Nosotros", "Ustedes", "Ellos"] },
    ],
  },
  {
    id: "vacaciones",
    titulo: "Las vacaciones",
    huecos: [
      { id: "h1", sustantivo: "Mis abuelos",            pronombre: "Ellos",    opciones: ["Ellos", "Ustedes", "Ellas"] },
      { id: "h2", sustantivo: "El mar de Esmeraldas",   pronombre: "Suyo",     opciones: ["Mío", "Tuyo", "Suyo"] },
      { id: "h3", sustantivo: "Tú y yo",                pronombre: "Nosotros", opciones: ["Ustedes", "Nosotros", "Ellos"] },
    ],
  },
];

// R2 — Laboratorio de verboides: lexema + 3 desinencias correctas + 3 distractoras
const VERBOIDES_BANK = [
  {
    id: "cantar",
    verbo: "CANTAR",
    lexema: "cant",
    correctas: { infinitivo: "ar", gerundio: "ando", participio: "ado" },
    bandeja: ["ar", "er", "ir", "ando", "iendo", "ado", "ido"],
  },
  {
    id: "comer",
    verbo: "COMER",
    lexema: "com",
    correctas: { infinitivo: "er", gerundio: "iendo", participio: "ido" },
    bandeja: ["ar", "er", "ir", "ando", "iendo", "ado", "ido"],
  },
  {
    id: "vivir",
    verbo: "VIVIR",
    lexema: "viv",
    correctas: { infinitivo: "ir", gerundio: "iendo", participio: "ido" },
    bandeja: ["ar", "er", "ir", "ando", "iendo", "ado", "ido"],
  },
  {
    id: "amar",
    verbo: "AMAR",
    lexema: "am",
    correctas: { infinitivo: "ar", gerundio: "ando", participio: "ado" },
    bandeja: ["ar", "er", "ir", "ando", "iendo", "ado", "ido"],
  },
  {
    id: "beber",
    verbo: "BEBER",
    lexema: "beb",
    correctas: { infinitivo: "er", gerundio: "iendo", participio: "ido" },
    bandeja: ["ar", "er", "ir", "ando", "iendo", "ado", "ido"],
  },
  {
    id: "saltar",
    verbo: "SALTAR",
    lexema: "salt",
    correctas: { infinitivo: "ar", gerundio: "ando", participio: "ado" },
    bandeja: ["ar", "er", "ir", "ando", "iendo", "ado", "ido"],
  },
  {
    id: "leer",
    verbo: "LEER",
    lexema: "le",
    correctas: { infinitivo: "er", gerundio: "yendo", participio: "ído" },
    bandeja: ["ar", "er", "ir", "yendo", "iendo", "ado", "ído"],
  },
];

// R3 — Uso de la letra G y J: párrafo con 5 huecos; cada uno con su letra correcta (c)
// Mezcla: hay palabras con G y con J en el mismo texto.
const USO_G_BANK = [
  {
    id: "viaje-refugio",
    titulo: "Un viaje al refugio",
    regla: "Recuerda las reglas de uso de G y J.",
    parrafo: [
      { t: "El " },
      { c: "j", g: "efe" },                    // jefe
      { t: " organizó un via" },
      { c: "j", g: "e" },                       // viaje
      { t: " al refu" },
      { c: "g", g: "io" },                      // refugio
      { t: " en la sierra. La " },
      { c: "g", g: "ente" },                    // gente
      { t: " llevó equipa" },
      { c: "j", g: "e" },                       // equipaje
      { t: "." },
    ],
  },
  {
    id: "jefe-jardin",
    titulo: "El jefe del jardín",
    regla: "Recuerda las reglas de uso de G y J.",
    parrafo: [
      { t: "El " },
      { c: "j", g: "efe" },                     // jefe
      { t: " del " },
      { c: "j", g: "ardín" },                   // jardín
      { t: " cortó las ho" },
      { c: "j", g: "as" },                      // hojas
      { t: ". La " },
      { c: "g", g: "ente" },                    // gente
      { t: " trabaja con dili" },
      { c: "g", g: "encia" },                   // diligencia
      { t: "." },
    ],
  },
  {
    id: "magia-abejas",
    titulo: "Magia y abejas",
    regla: "Recuerda las reglas de uso de G y J.",
    parrafo: [
      { t: "En la ma" },
      { c: "g", g: "ia" },                      // magia
      { t: " del bosque, las abe" },
      { c: "j", g: "as" },                      // abejas
      { t: " trabajan. El " },
      { c: "j", g: "efe" },                     // jefe
      { t: " dirige con dili" },
      { c: "g", g: "encia" },                   // diligencia
      { t: ". El presti" },
      { c: "g", g: "io" },                      // prestigio
      { t: " del panal es famoso." },
    ],
  },
  {
    id: "biblioteca-mix",
    titulo: "En la biblioteca",
    regla: "Recuerda las reglas de uso de G y J.",
    parrafo: [
      { t: "Tomé un libro de psicolo" },
      { c: "g", g: "ía" },                      // psicología
      { t: " y otro de mitolo" },
      { c: "g", g: "ía" },                      // mitología
      { t: ". Hice un buen traba" },
      { c: "j", g: "o" },                       // trabajo
      { t: ". El presti" },
      { c: "g", g: "io" },                      // prestigio
      { t: " del autor es enorme. Es un consejo de un experto vie" },
      { c: "j", g: "o" },                       // viejo
      { t: "." },
    ],
  },
  {
    id: "comunicado-mix",
    titulo: "Comunicado importante",
    regla: "Recuerda las reglas de uso de G y J.",
    parrafo: [
      { t: "Se comunica a la " },
      { c: "g", g: "ente" },                    // gente
      { t: " que por la negli" },
      { c: "g", g: "encia" },                   // negligencia
      { t: " no se podrá traba" },
      { c: "j", g: "ar" },                      // trabajar
      { t: ". El mensa" },
      { c: "j", g: "e" },                       // mensaje
      { t: " lo dieron los diri" },
      { c: "g", g: "entes" },                   // dirigentes
      { t: "." },
    ],
  },
  {
    id: "escuela-mix",
    titulo: "En la escuela",
    regla: "Recuerda las reglas de uso de G y J.",
    parrafo: [
      { t: "En clase de biolo" },
      { c: "g", g: "ía" },                      // biología (biolo + g + ía)
      { t: " no debemos de" },
      { c: "j", g: "ar" },                      // dejar (de + j + ar)
      { t: " las tareas. El profesor exi" },
      { c: "g", g: "e" },                       // exige (exi + g + e)
      { t: " respeto y nunca " },
      { c: "j", g: "uega" },                    // juega (_ + j + uega)
      { t: " con eso. La " },
      { c: "g", g: "ente" },                    // gente (_ + g + ente)
      { t: " lo respeta." },
    ],
  },
  // ─── Escenas nuevas (variedad anti-repetición) ────────────────
  {
    id: "libro-magico",
    titulo: "El libro mágico",
    regla: "Recuerda las reglas de uso de G y J.",
    parrafo: [
      { t: "Tomé un libro de ma" },
      { c: "g", g: "ia" },                      // magia (ma + g + ia)
      { t: " donde cada pá" },
      { c: "g", g: "ina" },                     // página (pá + g + ina)
      { t: " es un viaje. El persona" },
      { c: "j", g: "e" },                       // personaje (persona + j + e)
      { t: " principal lleva un mensa" },
      { c: "j", g: "e" },                       // mensaje (mensa + j + e)
      { t: " de respeto a la " },
      { c: "g", g: "ente" },                    // gente (_ + g + ente)
      { t: "." },
    ],
  },
  {
    id: "tareas-hogar",
    titulo: "Tareas del hogar",
    regla: "Recuerda las reglas de uso de G y J.",
    parrafo: [
      { t: "Mamá pidió recoger las ho" },
      { c: "j", g: "as" },                      // hojas (ho + j + as)
      { t: " del jardín. Luego organicé mi equipa" },
      { c: "j", g: "e" },                       // equipaje (equipa + j + e)
      { t: " para el viaje. Mi hermano arregló los relo" },
      { c: "j", g: "es" },                      // relojes (relo + j + es)
      { t: " con dili" },
      { c: "g", g: "encia" },                   // diligencia (dili + g + encia)
      { t: ". Todos cumplimos con el traba" },
      { c: "j", g: "o" },                       // trabajo (traba + j + o)
      { t: "." },
    ],
  },
  {
    id: "aventura-bosque",
    titulo: "Aventura en el bosque",
    regla: "Recuerda las reglas de uso de G y J.",
    parrafo: [
      { t: "Llegamos al refu" },
      { c: "g", g: "io" },                      // refugio (refu + g + io)
      { t: " del bosque. Vi una ima" },
      { c: "g", g: "en" },                      // imagen (ima + g + en)
      { t: " hermosa y caminé con ener" },
      { c: "g", g: "ía" },                      // energía (ener + g + ía)
      { t: ". Encontré a un sabio vie" },
      { c: "j", g: "o" },                       // viejo (vie + j + o)
      { t: " que vivía cerca de un espe" },
      { c: "j", g: "o" },                       // espejo (espe + j + o)
      { t: " de agua." },
    ],
  },
  {
    id: "clase-tecnologia",
    titulo: "Clase de tecnología",
    regla: "Recuerda las reglas de uso de G y J.",
    parrafo: [
      { t: "En clase de tecnolo" },
      { c: "g", g: "ía" },                      // tecnología (tecnolo + g + ía)
      { t: " estudiamos la lógica de la ima" },
      { c: "g", g: "en" },                      // imagen (ima + g + en)
      { t: ". El profesor exi" },
      { c: "g", g: "e" },                       // exige (exi + g + e)
      { t: " atención. Cada e" },
      { c: "j", g: "ercicio" },                 // ejercicio (e + j + ercicio)
      { t: " es un traba" },
      { c: "j", g: "o" },                       // trabajo (traba + j + o)
      { t: " creativo." },
    ],
  },
  // ─── Lote 2 de escenas (junio 2026) — más variedad anti-repetición ──
  {
    id: "fiesta-cumple",
    titulo: "La fiesta de cumpleaños",
    regla: "Recuerda las reglas de uso de G y J.",
    parrafo: [
      { t: "Mi tía organizó una fiesta. La " },
      { c: "g", g: "ente" },                    // gente (_ + g + ente)
      { t: " llegó al " },
      { c: "j", g: "ardín" },                   // jardín (_ + j + ardín)
      { t: " con re" },
      { c: "g", g: "alos" },                    // regalos (re + g + alos)
      { t: ". Bailamos con ener" },
      { c: "g", g: "ía" },                      // energía (ener + g + ía)
      { t: " y reímos como un persona" },
      { c: "j", g: "e" },                       // personaje (persona + j + e)
      { t: " de cuento." },
    ],
  },
  {
    id: "joven-viajero",
    titulo: "El joven viajero",
    regla: "Recuerda las reglas de uso de G y J.",
    parrafo: [
      { t: "El " },
      { c: "j", g: "oven" },                    // joven (_ + j + oven)
      { t: " cargó su equipa" },
      { c: "j", g: "e" },                       // equipaje (equipa + j + e)
      { t: " y partió. Estudió la geo" },
      { c: "g", g: "rafía" },                   // geografía (geo + g + rafía)
      { t: " de la región y cada pá" },
      { c: "g", g: "ina" },                     // página (pá + g + ina)
      { t: " del mapa fue un via" },
      { c: "j", g: "e" },                       // viaje (via + j + e)
      { t: " nuevo." },
    ],
  },
  {
    id: "garaje-abuelo",
    titulo: "El garaje del abuelo",
    regla: "Recuerda las reglas de uso de G y J.",
    parrafo: [
      { t: "El abuelo abrió el " },
      { c: "g", g: "araje" },                   // garaje (_ + g + araje)
      { t: " y nos mostró sus relo" },
      { c: "j", g: "es" },                      // relojes (relo + j + es)
      { t: " vie" },
      { c: "j", g: "os" },                      // viejos (vie + j + os)
      { t: ". Cada uno guarda un mensa" },
      { c: "j", g: "e" },                       // mensaje (mensa + j + e)
      { t: " lleno de ma" },
      { c: "g", g: "ia" },                      // magia (ma + g + ia)
      { t: " familiar." },
    ],
  },
  {
    id: "excursion-bosque",
    titulo: "Excursión por el bosque",
    regla: "Recuerda las reglas de uso de G y J.",
    parrafo: [
      { t: "Caminamos con un " },
      { c: "g", g: "uía" },                     // guía (_ + g + uía)
      { t: " experto. Recogimos ho" },
      { c: "j", g: "as" },                      // hojas (ho + j + as)
      { t: " secas. El sol cruzó con ener" },
      { c: "g", g: "ía" },                      // energía (ener + g + ía)
      { t: ". Llegamos al puente que el " },
      { c: "j", g: "efe" },                     // jefe (_ + j + efe)
      { t: " construyó con dili" },
      { c: "g", g: "encia" },                   // diligencia (dili + g + encia)
      { t: "." },
    ],
  },
  {
    id: "carta-amigo",
    titulo: "Carta a un amigo",
    regla: "Recuerda las reglas de uso de G y J.",
    parrafo: [
      { t: "Querido amigo, te envío este mensa" },
      { c: "j", g: "e" },                       // mensaje (mensa + j + e)
      { t: " con cariño. Eres una persona inteli" },
      { c: "g", g: "ente" },                    // inteligente (inteli + g + ente)
      { t: " que ayuda con un " },
      { c: "g", g: "esto" },                    // gesto (_ + g + esto)
      { t: " noble. Te recuerdo en cada pá" },
      { c: "g", g: "ina" },                     // página (pá + g + ina)
      { t: " que escribo. Tu ami" },
      { c: "g", g: "o" },                       // amigo (ami + g + o)
      { t: " siempre." },
    ],
  },
  {
    id: "gigante-amable",
    titulo: "El gigante amable",
    regla: "Recuerda las reglas de uso de G y J.",
    parrafo: [
      { t: "Había una vez un " },
      { c: "g", g: "igante" },                  // gigante (_ + g + igante)
      { t: " amable que vivía en un refu" },
      { c: "g", g: "io" },                      // refugio (refu + g + io)
      { t: " del bosque. Su me" },
      { c: "j", g: "or" },                      // mejor (me + j + or)
      { t: " ami" },
      { c: "g", g: "o" },                       // amigo (ami + g + o)
      { t: " era un cone" },
      { c: "j", g: "o" },                       // conejo (cone + j + o)
      { t: " sabio." },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// GameScreen — delega al sub-componente según el nivel elegido
// ─────────────────────────────────────────────────────────────
function GameScreen({ app, setApp, go }) {
  const cat = app.currentCategory || "resena";
  const [restartTick, setRestartTick] = useStateG(0);
  const restart = () => setRestartTick((t) => t + 1);
  return (
    <>
      <style>{`
        .ed-drop-hover {
          outline: 3px dashed #4fd8ff !important;
          outline-offset: 2px;
          box-shadow: 0 0 22px rgba(79,216,255,0.7) !important;
          background-color: rgba(79,216,255,0.18) !important;
          transition: all 0.12s ease;
        }
        .ed-draggable {
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
        }
      `}</style>
      {cat === "escritor"
        ? <EscritorGame key={`esc-${restartTick}`} app={app} setApp={setApp} go={go} onRestart={restart} />
        : <ResenaGame key={`res-${restartTick}`} app={app} setApp={setApp} go={go} onRestart={restart} />}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Shell común: HUD, modales, action rail, feedback, personaje
// ─────────────────────────────────────────────────────────────
function GameEnunciado({ text, top = 84 }) {
  if (!text) return null;
  return (
    <div style={{
      position: "absolute", top, left: "50%", transform: "translateX(-50%)", width: 488,
      textAlign: "center",
      fontFamily: "var(--ed-font-display)", fontWeight: 700,
      fontSize: 17, lineHeight: 1.2,
      color: "#fff",
      textShadow: "0 2px 6px rgba(0,0,0,0.6)",
      pointerEvents: "none",
      zIndex: 5,
    }}>
      {text}
    </div>
  );
}

function GameHUD({ elapsed, stars, attempted, solved, total = 3, app, setApp }) {
  const levels = (typeof LEVELS_CFG !== "undefined" && LEVELS_CFG) || (window.LEVELS_CFG || []);
  const currentId = app && app.currentCategory ? app.currentCategory : "resena";
  const [pendingLevel, setPendingLevel] = useStateG(null);

  function requestSwitch(lvId) {
    if (lvId === currentId) return;
    setPendingLevel(lvId);
  }
  function confirmSwitch() {
    if (!pendingLevel) return;
    const cfg = levels.find((l) => l.id === pendingLevel);
    if (!cfg) { setPendingLevel(null); return; }
    setApp((s) => ({
      ...s,
      level: cfg.id,
      currentCategory: cfg.id,
      currentCatLabel: cfg.catLabel,
    }));
    setPendingLevel(null);
  }

  return (
    <>
      <div data-qa="hud" style={{
        position: "absolute", top: 10, left: 16, right: 16,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <EdinunLogoMini size={56} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(0,0,0,0.35)", borderRadius: 999, padding: "6px 12px",
            border: "1px solid rgba(242,194,96,0.4)", fontFamily: "var(--ed-font-mono)", fontSize: 13, color: "#fce9a8",
          }}>
            ⏱ {formatTime(elapsed)}
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(0,0,0,0.35)", borderRadius: 999, padding: "6px 12px",
            border: "1px solid rgba(242,194,96,0.4)", fontFamily: "var(--ed-font-display)", fontWeight: 600, color: "#fce9a8",
          }}>
            ⭐ {stars}
          </div>
        </div>
      </div>

      <div data-qa="hud-temas" style={{
        position: "absolute", top: 22, left: "50%", transform: "translateX(-50%)",
        display: "flex", alignItems: "center", gap: 5,
      }}>
        {levels.map((lv) => {
          const active = lv.id === currentId;
          return (
            <button
              key={lv.id}
              onClick={() => requestSwitch(lv.id)}
              title={active ? "Tema actual" : `Cambiar a "${lv.label}"`}
              style={{
                padding: "4px 12px",
                borderRadius: 999,
                background: active ? lv.grad : "rgba(0,0,0,0.35)",
                color: active ? lv.ink : "rgba(252,233,168,0.85)",
                fontFamily: "var(--ed-font-display)",
                fontWeight: 700, fontSize: 11, letterSpacing: "0.02em",
                border: active ? "1px solid rgba(255,255,255,0.55)" : "1px solid rgba(242,194,96,0.35)",
                boxShadow: active
                  ? "inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -2px 0 rgba(0,0,0,0.18), 0 0 12px rgba(255,255,255,0.18)"
                  : "none",
                cursor: active ? "default" : "pointer",
                transition: "all 0.18s ease",
                whiteSpace: "nowrap",
              }}
            >
              {lv.label}
            </button>
          );
        })}
      </div>

      <div style={{
        position: "absolute", top: 58, left: "50%", transform: "translateX(-50%)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span className="ed-label" style={{ color: "rgba(255,255,255,0.7)" }}>Ronda</span>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{
            width: 10, height: 10, borderRadius: "50%",
            background: i < attempted ? (i < solved ? "#fce9a8" : "#ff6b6b") : "rgba(255,255,255,0.2)",
            boxShadow: i < attempted ? "0 0 10px currentColor" : "none",
            color: i < solved ? "#fce9a8" : "#ff6b6b",
          }} />
        ))}
      </div>

      <SwitchLevelModal
        pendingLevel={pendingLevel}
        levels={levels}
        attempted={attempted}
        total={total}
        onCancel={() => setPendingLevel(null)}
        onConfirm={confirmSwitch}
      />
    </>
  );
}

function SwitchLevelModal({ pendingLevel, levels, attempted, total, onCancel, onConfirm }) {
  if (!pendingLevel) return null;
  const cfg = levels.find((l) => l.id === pendingLevel);
  if (!cfg) return null;
  return (
    <PortalToBody>
      <div onClick={onCancel} style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.62)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "ed-pop-in 0.18s", padding: 16,
      }}>
        <div onClick={(e) => e.stopPropagation()} className="ed-card"
          style={{ padding: 24, maxWidth: 460, textAlign: "center", boxShadow: "var(--ed-shadow-card), 0 0 40px rgba(148,120,255,0.3)" }}>
          <div className="ed-label" style={{ color: "#a78bfa", marginBottom: 6 }}>Cambiar de tema</div>
          <h2 className="ed-h1" style={{ fontSize: 22, lineHeight: 1.15, marginBottom: 8 }}>
            ¿Ir a "{cfg.label}"?
          </h2>
          <p className="ed-body" style={{ marginBottom: 16, fontSize: 14 }}>
            Vas a perder el progreso de esta ronda ({attempted}/{total}). No habrá reporte de esta sesión.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button className="ed-btn ed-btn-ghost" onClick={onCancel} style={{ height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
              SEGUIR JUGANDO
            </button>
            <button className="ed-btn ed-btn-primary" onClick={onConfirm} style={{ height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
              SÍ, CAMBIAR
            </button>
          </div>
        </div>
      </div>
    </PortalToBody>
  );
}

function RestartModal({ confirmingExit, setConfirmingExit, attempted, total, onRestart }) {
  if (!confirmingExit) return null;
  return (
    <PortalToBody>
      <div onClick={() => setConfirmingExit(false)} style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.62)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "ed-pop-in 0.18s", padding: 16,
      }}>
        <div onClick={(e) => e.stopPropagation()} className="ed-card"
          style={{ padding: 24, maxWidth: 440, textAlign: "center", boxShadow: "var(--ed-shadow-card), 0 0 40px rgba(255,107,107,0.3)" }}>
          <div className="ed-label" style={{ color: "#ff8b8b", marginBottom: 6 }}>Reiniciar juego</div>
          <h2 className="ed-h1" style={{ fontSize: 22, lineHeight: 1.15, marginBottom: 8 }}>¿Empezar de nuevo?</h2>
          <p className="ed-body" style={{ marginBottom: 16, fontSize: 14 }}>
            Vas a perder el progreso de esta ronda ({attempted}/{total}) y volverás a la primera.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button className="ed-btn ed-btn-ghost" onClick={() => setConfirmingExit(false)} style={{ height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
              SEGUIR JUGANDO
            </button>
            <button className="ed-btn ed-btn-primary" onClick={() => { setConfirmingExit(false); onRestart && onRestart(); }} style={{ height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
              SÍ, REINICIAR
            </button>
          </div>
        </div>
      </div>
    </PortalToBody>
  );
}

function ExitModal({ confirmingExit, setConfirmingExit, attempted, total, onExit }) {
  if (!confirmingExit) return null;
  return (
    <PortalToBody>
      <div onClick={() => setConfirmingExit(false)} style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.62)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "ed-pop-in 0.18s", padding: 16,
      }}>
        <div onClick={(e) => e.stopPropagation()} className="ed-card"
          style={{ padding: 24, maxWidth: 440, textAlign: "center", boxShadow: "var(--ed-shadow-card), 0 0 40px rgba(255,138,76,0.3)" }}>
          <div className="ed-label" style={{ color: "#ff8b4c", marginBottom: 6 }}>Volver al inicio</div>
          <h2 className="ed-h1" style={{ fontSize: 22, lineHeight: 1.15, marginBottom: 8 }}>¿Volver al inicio?</h2>
          <p className="ed-body" style={{ marginBottom: 16, fontSize: 14 }}>
            Vas a perder el progreso de esta ronda ({attempted}/{total}). No habrá reporte de esta sesión.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button className="ed-btn ed-btn-ghost" onClick={() => setConfirmingExit(false)} style={{ height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
              SEGUIR JUGANDO
            </button>
            <button className="ed-btn ed-btn-primary" onClick={() => { setConfirmingExit(false); onExit && onExit(); }} style={{ height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
              SÍ, SALIR
            </button>
          </div>
        </div>
      </div>
    </PortalToBody>
  );
}

function ActionRail({ canVerify, onVerify, showErase, onErase, onRestart, onExit }) {
  return (
    <div data-qa="acciones" style={{
      position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
      display: "flex", flexDirection: "column", gap: 10, width: 148,
    }}>
      <button className="ed-btn ed-btn-verify"
        onClick={() => { if (canVerify && onVerify) onVerify(); }}
        disabled={!canVerify}
        style={{
          fontSize: 13, padding: "0 8px", height: 48, fontWeight: 800, letterSpacing: "0.04em",
          opacity: canVerify ? 1 : 0.45, cursor: canVerify ? "pointer" : "not-allowed",
        }}>
        ¡VERIFICAR!
      </button>
      {showErase && (
        <button className="ed-btn ed-btn-erase" onClick={onErase}
          style={{ fontSize: 13, padding: "0 8px", height: 48, fontWeight: 800, letterSpacing: "0.04em" }}>
          BORRAR
        </button>
      )}
      <button className="ed-btn ed-btn-restart" onClick={onRestart}
        style={{ fontSize: 13, padding: "0 8px", height: 48, fontWeight: 800, letterSpacing: "0.04em" }}>
        REINICIAR
      </button>
      <button className="ed-btn ed-btn-ghost" onClick={onExit}
        style={{ fontSize: 13, padding: "0 8px", height: 48, fontWeight: 800, letterSpacing: "0.04em" }}>
        SALIR
      </button>
    </div>
  );
}

function FeedbackOverlay({ feedback, feedbackMsg, charName }) {
  if (!feedback) return null;
  return (
    <PortalToBody>
      <div style={{
        position: "fixed", inset: 0, zIndex: 1000,
        pointerEvents: "none",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 14,
        background: "rgba(0,0,0,0.62)", backdropFilter: "blur(3px)",
        animation: "ed-pop-in 0.3s",
      }}>
        <div style={{
          fontFamily: "'Fredoka','Baloo 2',system-ui,sans-serif",
          fontWeight: 700, fontSize: "clamp(60px, 11vmin, 120px)",
          color: feedback === "ok" ? "#2ecc8f" : "#ff6b6b",
          textShadow: "0 4px 0 rgba(0,0,0,0.45), 0 0 60px currentColor",
        }}>
          {feedback === "ok" ? "¡EXCELENTE!" : "¡UPS!"}
        </div>
        {feedbackMsg && (
          <div style={{
            fontFamily: "'Fredoka','Baloo 2',system-ui,sans-serif",
            fontWeight: 700, fontSize: "clamp(18px, 2.6vmin, 30px)",
            color: feedback === "ok" ? "#fce9a8" : "#fff",
            background: "rgba(0,0,0,0.55)",
            padding: "8px 26px", borderRadius: 999,
            textShadow: "0 2px 6px rgba(0,0,0,0.6)",
            textAlign: "center", maxWidth: "80vw",
          }}>
            {feedback === "ok" ? feedbackMsg : `${feedbackMsg} — ${charName}`}
          </div>
        )}
      </div>
    </PortalToBody>
  );
}

function CharacterCorner({ char, message }) {
  return (
    <div data-qa="personaje" style={{
      position: "absolute", left: 8, bottom: 90, width: 220,
      pointerEvents: "none", textAlign: "center",
    }}>
      <div data-qa="bocadillo" className="ed-float-soft" style={{
        position: "absolute", left: 0, right: 0, bottom: "100%",
        display: "flex", justifyContent: "center",
        pointerEvents: "none",
      }}>
        <div style={{
          position: "relative",
          maxWidth: 208,
          background: "linear-gradient(180deg, rgba(20,12,55,0.95), rgba(10,6,35,0.95))",
          border: "1.5px solid rgba(242,194,96,0.65)",
          borderRadius: 16, padding: "10px 14px",
          fontFamily: "var(--ed-font-display)",
          fontWeight: 700, fontSize: 14, lineHeight: 1.25,
          color: "#fce9a8", textAlign: "center",
          whiteSpace: "pre-line",
          boxShadow: "0 10px 24px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}>
          {message}
          <div style={{
            position: "absolute", bottom: -10, left: "50%", transform: "translateX(-50%)",
            width: 0, height: 0,
            borderLeft: "9px solid transparent", borderRight: "9px solid transparent",
            borderTop: "10px solid rgba(20,12,55,0.95)",
            filter: "drop-shadow(0 1px 0 rgba(242,194,96,0.55))",
          }} />
        </div>
      </div>
      <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
        <div style={{
          position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)",
          width: 140, height: 16, borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(242,194,96,0.45), transparent 70%)",
          filter: "blur(5px)",
        }} />
        <char.Component size={190} floating />
      </div>
      <div style={{
        marginTop: -2,
        fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 14,
        color: "#fce9a8", letterSpacing: "0.04em",
        textShadow: "0 2px 6px rgba(0,0,0,0.6)",
      }}>{char.name}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TEMA 1 · ResenaGame — 3 rondas:
//   R1: Ficha del libro (drag etiquetas a slots)
//   R2: Partes de la reseña (tap-tap para asignar cajón)
//   R3: Ordena el cuento (tap-tap intercambio)
// ─────────────────────────────────────────────────────────────
function ResenaGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "La reseña";

  const [ronda, setRonda] = useStateG(0);

  // R1 state (Partes de la reseña): { parrafoId: tipo } + cajón seleccionado
  const [r1Assigned, setR1Assigned] = useStateG({});
  const [r1SelectedBin, setR1SelectedBin] = useStateG(null);
  const [r1Locked, setR1Locked] = useStateG(false);

  // R2 state (Pintor de determinantes): { tokenIdx: tipo } + tipo seleccionado
  const [r2Colors, setR2Colors] = useStateG({});
  const [r2SelectedTipo, setR2SelectedTipo] = useStateG(null);
  const [r2Locked, setR2Locked] = useStateG(false);

  // R3 state (Verbo tabla): { filaId: desinencia } + picked desinencia
  const [r3Placed, setR3Placed] = useStateG({});
  const [r3Picked, setR3Picked] = useStateG(null);
  const [r3Locked, setR3Locked] = useStateG(false);

  // Picks de cada ronda
  const [r1Pick] = useStateG(() => {
    const recent = new Set(getRecent("resena"));
    let pool = RESENAS_BANK.filter((p) => !recent.has(p.id));
    if (pool.length === 0) pool = RESENAS_BANK;
    const p = pool[Math.floor(Math.random() * pool.length)];
    pushRecent("resena", p.id);
    return p;
  });

  // r1: orden estable de los párrafos (mezclados para que no aparezcan agrupados por tipo)
  const [r1Parrafos] = useStateG(() => shuffle(r1Pick.parrafos));

  const [r2Pick] = useStateG(() => {
    const recent = new Set(getRecent("resena"));
    let pool = DETERMINANTES_BANK.filter((d) => !recent.has(d.id));
    if (pool.length === 0) pool = DETERMINANTES_BANK;
    const p = pool[Math.floor(Math.random() * pool.length)];
    pushRecent("resena", p.id);
    return p;
  });

  // r2 verbs flat list with index — determinantes en el párrafo
  const r2Determinantes = r2Pick.parrafo.map((tk, i) => tk.d ? { ...tk, idx: i } : null).filter(Boolean);

  const [r3Pick] = useStateG(() => {
    const recent = new Set(getRecent("resena"));
    let pool = VERBO_TABLA_BANK.filter((v) => !recent.has(v.id));
    if (pool.length === 0) pool = VERBO_TABLA_BANK;
    const p = pool[Math.floor(Math.random() * pool.length)];
    pushRecent("resena", p.id);
    return p;
  });

  // Shell state
  const [elapsed, setElapsed] = useStateG(0);
  const [stars, setStars] = useStateG(0);
  const [solved, setSolved] = useStateG(0);
  const [attempted, setAttempted] = useStateG(0);
  const [starsSession, setStarsSession] = useStateG(0);
  const [feedback, setFeedback] = useStateG(null);
  const [feedbackMsg, setFeedbackMsg] = useStateG("");
  const [confirmingRestart, setConfirmingRestart] = useStateG(false);
  const [confirmingExit, setConfirmingExit] = useStateG(false);
  const [log, setLog] = useStateG([]);
  const started = useRefG(Date.now());
  const exerciseStart = useRefG(Date.now());

  useEffectG(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started.current) / 1000)), 500);
    return () => clearInterval(id);
  }, []);

  useEffectG(() => {
    window.__qa_skip = () => { setRonda((r) => r + 1); exerciseStart.current = Date.now(); };
    return () => { delete window.__qa_skip; };
  }, []);

  useEffectG(() => {
    window.__currentChalkGlyphs = [
      { c: "📖", l: "6%",  t: "12%", r: "-8deg" },
      { c: "✍",  l: "82%", t: "16%", r: "6deg",  s: "0.62em" },
      { c: "★",  l: "10%", t: "78%", r: "12deg", s: "0.7em" },
      { c: "📚", l: "88%", t: "72%", r: "-10deg", s: "0.55em" },
      { c: "✨", l: "45%", t: "8%",  r: "4deg",  s: "0.55em" },
      { c: "?",  l: "3%",  t: "45%", r: "-4deg", s: "0.6em" },
      { c: "¿",  l: "92%", t: "45%", r: "8deg",  s: "0.5em" },
      { c: "¡",  l: "30%", t: "55%", r: "-6deg", s: "0.55em" },
      { c: "🔖", l: "70%", t: "62%", r: "8deg",  s: "0.5em" },
      { c: "📝", l: "55%", t: "30%", r: "-4deg", s: "0.5em" },
    ];
    return () => { window.__currentChalkGlyphs = null; };
  }, []);

  // R1: todos los párrafos asignados a un cajón
  const r1AllAssigned = r1Parrafos.every((p) => r1Assigned[p.id]);
  // R2: todos los determinantes pintados
  const r2AllPainted = r2Determinantes.every((d) => r2Colors[d.idx]);
  // R3: todas las filas de la tabla llenas
  const r3AllPlaced = pick => Object.keys(r3Placed).length === r3Pick.filas.length;

  const canVerify =
    ronda === 0 ? (r1AllAssigned && !r1Locked) :
    ronda === 1 ? (r2AllPainted && !r2Locked) :
    ronda === 2 ? (Object.keys(r3Placed).length === r3Pick.filas.length && !r3Locked) :
    false;
  const showErase = true;

  function handleVerify() {
    if (!canVerify) return;
    if (ronda === 0) {
      setR1Locked(true);
      let correct = true;
      for (const p of r1Parrafos) {
        if (r1Assigned[p.id] !== p.tipo) { correct = false; }
      }
      const userText = r1Parrafos.map((p) => `${p.id}=${r1Assigned[p.id] || "?"}`).join(", ");
      const correctText = r1Parrafos.map((p) => `${p.id}=${p.tipo}`).join(", ");
      setTimeout(() => answer(correct, userText, correctText, "✍"), 350);
    } else if (ronda === 1) {
      setR2Locked(true);
      let correct = true;
      for (const d of r2Determinantes) {
        if (r2Colors[d.idx] !== d.tipo) { correct = false; }
      }
      const userText = r2Determinantes.map((d) => `${d.d}=${r2Colors[d.idx] || "?"}`).join(", ");
      const correctText = r2Determinantes.map((d) => `${d.d}=${d.tipo}`).join(", ");
      setTimeout(() => answer(correct, userText, correctText, "🖍"), 350);
    } else if (ronda === 2) {
      setR3Locked(true);
      let correct = true;
      for (const f of r3Pick.filas) {
        if (r3Placed[f.id] !== f.desinencia) { correct = false; }
      }
      const userText = r3Pick.filas.map((f) => `${f.persona}=${r3Placed[f.id] || "?"}`).join(", ");
      const correctText = r3Pick.filas.map((f) => `${f.persona}=${f.desinencia}`).join(", ");
      setTimeout(() => answer(correct, userText, correctText, "🧪"), 350);
    }
  }

  function handleErase() {
    if (ronda === 0) {
      if (r1Locked) return;
      setR1Assigned({});
      setR1SelectedBin(null);
    } else if (ronda === 1) {
      if (r2Locked) return;
      setR2Colors({});
    } else if (ronda === 2) {
      if (r3Locked) return;
      setR3Placed({});
      setR3Picked(null);
    }
  }

  function answer(isCorrect, userText, correctText, opIcon) {
    if (typeof window.markFirstAttempt === "function") window.markFirstAttempt();
    const exerciseSec = Math.max(0, Math.floor((Date.now() - exerciseStart.current) / 1000));
    const earned = calcStars(isCorrect, exerciseSec);
    const newAttempted = attempted + 1;
    const newSolved = solved + (isCorrect ? 1 : 0);
    const newStarsTotal = stars + earned;
    const newStarsSession = starsSession + earned;

    const entry = {
      idx: newAttempted,
      a: correctText, b: userText, op: opIcon || "·",
      correctAnswer: correctText, userAnswer: userText,
      isCorrect, time: exerciseSec, earned,
    };
    const newLog = [...log, entry];

    setAttempted(newAttempted);
    setSolved(newSolved);
    setStars(newStarsTotal);
    setStarsSession(newStarsSession);
    setLog(newLog);

    // Al fallar, dar tiempo para ver el estado (marcas verdes/rojas) antes
    // del overlay ¡UPS!. Al acertar mostramos overlay enseguida.
    const okMsg = `+${earned} ⭐`;
    const errMsg = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
    const revealDelay = isCorrect ? 0 : 1500;
    const overlayTime = isCorrect ? 950 : 1300;
    const totalTime   = revealDelay + overlayTime;

    setTimeout(() => {
      setFeedback(isCorrect ? "ok" : "err");
      setFeedbackMsg(isCorrect ? okMsg : errMsg);
    }, revealDelay);

    setTimeout(() => {
      setFeedback(null);
      setFeedbackMsg("");
      if (newAttempted >= 3) {
        setApp((s) => ({
          ...s, stars: newStarsTotal,
          lastResult: { category: catLabel, solved: newSolved, total: 3, time: elapsed, starsEarned: newStarsSession, log: newLog },
        }));
        window.incrementGamesCompleted && window.incrementGamesCompleted();
        go("results");
      } else {
        setRonda((r) => r + 1);
        exerciseStart.current = Date.now();
      }
    }, totalTime);
  }

  const enunciado =
    ronda === 0 ? `Clasifica las partes de la reseña de "${r1Pick.titulo}".` :
    ronda === 1 ? `Pinta cada determinante con su color.` :
    `Forma el verbo "${r3Pick.verbo}" en cada persona.`;

  const bocadillo =
    ronda === 0 ? "Lleva cada frase a donde pertenece." :
    ronda === 1 ? "1 tap = cardinal, 2 = ordinal,\n3 = indefinido." :
    "Arrastra la terminación a cada fila.";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <GameHUD elapsed={elapsed} stars={stars} attempted={attempted} solved={solved} total={3} app={app} setApp={setApp} />
      <CharacterCorner char={char} message={bocadillo} />
      <GameEnunciado text={enunciado} top={(ronda === 1 || ronda === 2) ? 120 : 84} />

      <div data-qa="zona-central" style={{
        position: "absolute", top: (ronda === 1 || ronda === 2) ? 150 : 116, left: "50%", transform: "translateX(-50%)", width: 440, bottom: 14,
      }}>
        {ronda === 0 && (
          <PartesResenaCard pick={r1Pick} parrafos={r1Parrafos}
            assigned={r1Assigned} selectedBin={r1SelectedBin} locked={r1Locked}
            onSelectBin={(tipo) => { if (r1Locked) return; setR1SelectedBin(r1SelectedBin === tipo ? null : tipo); }}
            onAssignParrafo={(pid, zoneId) => {
              if (r1Locked) return;
              if (zoneId) {
                setR1Assigned({ ...r1Assigned, [pid]: zoneId });
                setR1SelectedBin(null);
                return;
              }
              if (r1SelectedBin) {
                setR1Assigned({ ...r1Assigned, [pid]: r1SelectedBin });
                setR1SelectedBin(null);
              } else if (r1Assigned[pid]) {
                const next = { ...r1Assigned }; delete next[pid];
                setR1Assigned(next);
              }
            }}
          />
        )}
        {ronda === 1 && (
          <PintorDeterminantesCard pick={r2Pick}
            colors={r2Colors} locked={r2Locked}
            onCycle={(idx) => {
              if (r2Locked) return;
              const cur = r2Colors[idx];
              const next = cur === undefined ? "cardinal"
                         : cur === "cardinal" ? "ordinal"
                         : cur === "ordinal"  ? "indefinido"
                         : undefined;
              const newColors = { ...r2Colors };
              if (next === undefined) delete newColors[idx]; else newColors[idx] = next;
              setR2Colors(newColors);
            }}
          />
        )}
        {ronda === 2 && (
          <TablaVerboCard pick={r3Pick}
            placed={r3Placed} picked={r3Picked} locked={r3Locked}
            onPickLabel={(d) => { if (r3Locked) return; setR3Picked(r3Picked === d ? null : d); }}
            onPlaceIn={(filaId) => {
              if (r3Locked) return;
              if (r3Picked === null) {
                if (r3Placed[filaId]) {
                  const d = r3Placed[filaId];
                  const next = { ...r3Placed }; delete next[filaId];
                  setR3Placed(next); setR3Picked(d);
                }
                return;
              }
              const next = { ...r3Placed };
              for (const k of Object.keys(next)) if (next[k] === r3Picked) delete next[k];
              next[filaId] = r3Picked;
              setR3Placed(next); setR3Picked(null);
            }}
            onSetPlaced={(next) => { if (r3Locked) return; setR3Placed(next); setR3Picked(null); }}
          />
        )}
      </div>

      <ActionRail
        canVerify={canVerify}
        onVerify={handleVerify}
        showErase={showErase}
        onErase={handleErase}
        onRestart={() => setConfirmingRestart(true)}
        onExit={() => setConfirmingExit(true)}
      />

      <FeedbackOverlay feedback={feedback} feedbackMsg={feedbackMsg} charName={char.name} />
      <RestartModal confirmingExit={confirmingRestart} setConfirmingExit={setConfirmingRestart} attempted={attempted} total={3} onRestart={onRestart} />
      <ExitModal confirmingExit={confirmingExit} setConfirmingExit={setConfirmingExit} attempted={attempted} total={3} onExit={() => go("home")} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// R2 · Pintor de determinantes — texto con determinantes a clasificar
//      por color: 🟠 cardinal, 🟣 ordinal, 🟢 indefinido
// ─────────────────────────────────────────────────────────────
function PintorDeterminantesCard({ pick, colors, locked, onCycle }) {
  const TIPOS = [
    { id: "cardinal",   label: "CARDINAL",   color: "#ff9a3a", ink: "#5a3208", hint: "cantidad exacta" },
    { id: "ordinal",    label: "ORDINAL",    color: "#a78bfa", ink: "#2a0a4a", hint: "indica orden" },
    { id: "indefinido", label: "INDEFINIDO", color: "#5fb878", ink: "#0a3a18", hint: "no exacta" },
  ];
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-around", paddingTop: 4, paddingBottom: 4 }}>
      {/* Cartel del texto con determinantes — PRIMERO */}
      <div style={{
        width: "100%", maxWidth: 380,
        background: "linear-gradient(180deg, rgba(255,253,245,0.97), rgba(245,238,225,0.92))",
        border: "3px solid #f2c260",
        borderRadius: 18,
        padding: "12px 22px",
        boxShadow: "0 12px 26px rgba(0,0,0,0.5)",
        color: "#3a2608",
      }}>
        <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 13, marginBottom: 8, textAlign: "center", color: "#7a4a0e", letterSpacing: "0.02em" }}>
          📝 {pick.titulo}
        </div>
        <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 15, lineHeight: 1.95, textAlign: "center" }}>
          {pick.parrafo.map((tk, i) => {
            if (tk.t) return <span key={i}>{tk.t}</span>;
            const color = colors[i];
            const expected = tk.tipo;
            const isCorrect = locked && color === expected;
            const isWrong = locked && color && color !== expected;
            const isEmpty = locked && !color;
            const correctTipo = TIPOS.find((t) => t.id === expected);
            let bg = "rgba(252,233,168,0.4)";
            let border = "2px dashed rgba(116,72,32,0.45)";
            let textColor = "#3a2608";
            if (color === "cardinal")   { bg = "rgba(255,154,58,0.4)";   border = "2px solid #ff9a3a"; textColor = "#5a3208"; }
            if (color === "ordinal")    { bg = "rgba(167,139,250,0.4)";  border = "2px solid #a78bfa"; textColor = "#2a0a4a"; }
            if (color === "indefinido") { bg = "rgba(95,184,120,0.4)";   border = "2px solid #5fb878"; textColor = "#0a3a18"; }
            if (isCorrect)              { bg = "rgba(46,204,143,0.45)";  border = "2px solid #2ecc8f"; }
            if (isWrong)                { bg = "rgba(255,107,107,0.4)";  border = "2px solid #ff6b6b"; }
            return (
              <span key={i}
                onClick={() => !locked && onCycle(i)}
                style={{
                  display: "inline-block",
                  padding: "1px 8px", margin: "1px 2px",
                  borderRadius: 8, background: bg, border,
                  cursor: locked ? "default" : "pointer",
                  color: textColor, fontWeight: 700,
                  transition: "all 0.15s",
                  userSelect: "none",
                }}>
                {tk.d}
                {(isWrong || isEmpty) && correctTipo && (
                  <sup style={{ fontSize: 9, color: "#c33b3b", marginLeft: 2, fontWeight: 800 }}>
                    ✗ {correctTipo.label.charAt(0)}
                  </sup>
                )}
              </span>
            );
          })}
        </div>
      </div>

      {/* Leyenda de colores en columna — DESPUÉS del cartel, solo visual */}
      <div style={{ display: "flex", flexDirection: "column", gap: 7, alignItems: "center" }}>
        {TIPOS.map((t) => (
          <div key={t.id}
            style={{
              display: "flex", flexDirection: "row", alignItems: "center", gap: 10,
              background: t.color, color: "#fff",
              padding: "8px 22px", borderRadius: 14,
              fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 14,
              border: "2px solid rgba(255,255,255,0.8)",
              boxShadow: "0 3px 8px rgba(0,0,0,0.35)",
              letterSpacing: "0.04em",
              minWidth: 320,
              justifyContent: "center",
            }}>
            <span>{t.label}</span>
            <span style={{ fontSize: 11.5, opacity: 0.95, fontStyle: "italic", letterSpacing: 0 }}>
              · {t.hint}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// R3 · Tabla del verbo camaleón — lexema + tabla con 5 personas
//      drag desinencia a cada fila (yo, tú, él, nosotros, ellos)
// ─────────────────────────────────────────────────────────────
function TablaVerboCard({ pick, placed, picked, locked, onPickLabel, onPlaceIn, onSetPlaced }) {
  const usedDesinencias = new Set(Object.values(placed));

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22 }}>
      {/* Cabecera con verbo */}
      <div style={{
        fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 13, color: "#fce9a8", letterSpacing: "0.04em",
        background: "rgba(10,6,35,0.55)",
        border: "1px solid rgba(242,194,96,0.5)",
        borderRadius: 999, padding: "3px 18px",
      }}>
        ✍ Verbo: <span style={{ color: "#4fd8ff" }}>{pick.verbo}</span> · raíz: <span style={{ color: "#fce9a8" }}>{pick.lexema}-</span>
      </div>

      {/* Tabla de 5 filas — ancho ajustado al contenido y centrado */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
        {pick.filas.map((f) => {
          const des = placed[f.id];
          const isCorrect = locked && des === f.desinencia;
          const isWrong = locked && des && des !== f.desinencia;
          const isEmpty = locked && !des;
          return (
            <div key={f.id}
              data-dropzone={`fila:${f.id}`}
              onClick={() => onPlaceIn(f.id)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "5px 12px", borderRadius: 10,
                background: isCorrect
                  ? "linear-gradient(180deg, rgba(46,204,143,0.32), rgba(255,255,255,0.95))"
                  : isWrong
                  ? "linear-gradient(180deg, rgba(255,107,107,0.28), rgba(255,255,255,0.95))"
                  : "rgba(255,255,255,0.94)",
                border: `2px solid ${isCorrect ? "#2ecc8f" : isWrong ? "#ff6b6b" : "#f2c260"}`,
                cursor: locked ? "default" : "pointer",
                boxShadow: "0 3px 7px rgba(0,0,0,0.3)",
                transition: "all 0.15s",
                minHeight: 36,
              }}>
              <div style={{
                width: 86, fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 11.5, color: "#3a2608",
                letterSpacing: "0.02em", flexShrink: 0,
              }}>
                {f.persona}
              </div>
              <div style={{
                fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 16, color: "#3a2608",
                padding: "3px 10px", background: "rgba(252,233,168,0.65)", borderRadius: 8,
                minWidth: 60, textAlign: "center",
              }}>
                {pick.lexema}
              </div>
              <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 16, color: "#7a4a0e" }}>+</div>
              <div
                className={des && !locked ? "ed-draggable" : ""}
                onPointerDown={des && !locked ? makeDragHandler({
                  item: des,
                  ghostHtml: `<div style="background:#fce9a8;color:#3a2608;padding:6px 14px;border-radius:10px;font-family:Fredoka,Nunito,sans-serif;font-weight:800;font-size:14px;border:2px solid #4fd8ff;box-shadow:0 8px 22px rgba(0,0,0,0.5);">${des}</div>`,
                  onTap: () => onPlaceIn(f.id),
                  onDrop: (zoneId, item) => {
                    if (zoneId && zoneId.startsWith("fila:") && onSetPlaced) {
                      const filaId = zoneId.slice(5);
                      if (filaId === f.id) return;
                      const next = { ...placed };
                      for (const k of Object.keys(next)) if (next[k] === item) delete next[k];
                      next[filaId] = item;
                      onSetPlaced(next);
                    }
                  },
                  disabled: locked,
                }) : undefined}
                onClick={des && !locked ? (e) => e.stopPropagation() : undefined}
                style={{
                  minWidth: 64, height: 30,
                  background: des
                    ? (isWrong ? "linear-gradient(180deg,#ff8888,#e04545)" : "linear-gradient(180deg, #4fd8ff, #2a98c8)")
                    : "rgba(10,6,35,0.1)",
                  border: `2px ${des ? "solid" : "dashed"} ${des ? (isWrong ? "#ff6b6b" : "#4fd8ff") : "rgba(116,72,32,0.5)"}`,
                  borderRadius: 8,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 13,
                  color: des ? "#fff" : "rgba(116,72,32,0.5)",
                  padding: "0 8px",
                  cursor: des && !locked ? "grab" : (locked ? "default" : "pointer"),
                  userSelect: "none",
                  textDecoration: isWrong ? "line-through" : "none",
                  textDecorationColor: "rgba(255,255,255,0.7)",
                }}>
                {des || "?"}
              </div>
              {(isWrong || isEmpty) && (
                <div style={{
                  fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 10.5,
                  color: "#1e8a5d",
                  background: "rgba(46,204,143,0.2)",
                  padding: "2px 7px", borderRadius: 999,
                  border: "1px solid rgba(46,204,143,0.5)",
                  marginLeft: "auto",
                }}>
                  ✓ {f.desinencia}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bandeja de desinencias — siempre en 1 sola fila */}
      <div data-qa="bandeja" style={{
        width: "100%", maxWidth: 440,
        background: "rgba(10,6,35,0.55)",
        border: "1px dashed rgba(252,233,168,0.35)",
        borderRadius: 14,
        padding: "12px 14px",
        display: "flex", gap: 5, justifyContent: "center", alignItems: "center",
        flexWrap: "nowrap",
        boxSizing: "border-box",
      }}>
        {pick.bandeja.map((d) => {
          if (usedDesinencias.has(d)) return null;
          const isPicked = picked === d;
          return (
            <div key={d}
              className="ed-draggable"
              onPointerDown={makeDragHandler({
                item: d,
                ghostHtml: `<div style="background:#fce9a8;color:#3a2608;padding:6px 14px;border-radius:10px;font-family:Fredoka,Nunito,sans-serif;font-weight:800;font-size:14px;border:2px solid #4fd8ff;box-shadow:0 8px 22px rgba(0,0,0,0.5);">${d}</div>`,
                onTap: () => onPickLabel(d),
                onDrop: (zoneId, item) => {
                  if (zoneId && zoneId.startsWith("fila:") && onSetPlaced) {
                    const filaId = zoneId.slice(5);
                    const next = { ...placed };
                    for (const k of Object.keys(next)) if (next[k] === item) delete next[k];
                    next[filaId] = item;
                    onSetPlaced(next);
                  }
                },
                disabled: locked,
              })}
              style={{
                padding: "6px 7px", borderRadius: 9,
                background: isPicked ? "linear-gradient(180deg,#fce9a8,#d9a441)" : "rgba(255,255,255,0.94)",
                color: "#3a2608",
                border: `2px solid ${isPicked ? "#4fd8ff" : "rgba(242,194,96,0.6)"}`,
                fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 12,
                cursor: locked ? "default" : "grab",
                boxShadow: isPicked ? "0 0 14px rgba(79,216,255,0.6)" : "0 3px 7px rgba(0,0,0,0.3)",
                transform: isPicked ? "translateY(-2px)" : "none",
                transition: "all 0.15s",
                minWidth: 32, flex: "0 0 auto",
                whiteSpace: "nowrap",
                userSelect: "none",
                textAlign: "center",
              }}>
              {d}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// (LEGACY · NO USADO) R1 · Ficha del libro
// ─────────────────────────────────────────────────────────────
function FichaLibroCard({ pick, placed, picked, locked, onPickLabel, onPlaceIn, onSetPlaced }) {
  // Construir bandeja: todos los valores correctos + distractores
  const bandejaItems = useMemoG(() => {
    const correctos = pick.campos.map((c) => c.valor);
    return shuffle([...correctos, ...pick.distractores]);
  }, [pick]);

  const usedValues = new Set(Object.values(placed));

  // Pistas para cada campo — ayudan al niño a identificar qué tipo de dato va
  const HINTS = {
    titulo:  "¿Cómo se llama?",
    autor:   "Quien lo escribió",
    editor:  "Quien lo publica",
    anio:    "4 cifras",
    paginas: "Cantidad de hojas",
    genero:  "Tipo de libro",
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
      {/* Cabecera ficha — portada emoji + título "Ficha del libro" */}
      <div style={{
        width: "100%", maxWidth: 470,
        display: "flex", alignItems: "center", gap: 12,
        background: "linear-gradient(180deg, rgba(255,253,245,0.97), rgba(245,238,225,0.92))",
        border: "3px solid #f2c260",
        borderRadius: 14,
        padding: "8px 14px",
        boxShadow: "0 6px 14px rgba(0,0,0,0.4)",
      }}>
        <div style={{
          width: 42, height: 54, borderRadius: 6,
          background: pick.color,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, flexShrink: 0,
          boxShadow: "0 2px 6px rgba(0,0,0,0.35), inset 0 -3px 0 rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.3)",
        }}>{pick.portada}</div>
        <div style={{ flex: 1, fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 13.5, color: "#3a2608", letterSpacing: "0.02em", lineHeight: 1.2 }}>
          📕 Ficha del libro
        </div>
      </div>

      {/* Slots de la ficha — grid 2 cols (dropzones) */}
      <div style={{
        width: "100%", maxWidth: 470,
        background: "rgba(10,6,35,0.45)",
        border: "1.5px dashed rgba(252,233,168,0.4)",
        borderRadius: 14,
        padding: "10px 12px",
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
      }}>
        {pick.campos.map((c) => {
          const val = placed[c.id];
          const isCorrect = locked && val === c.valor;
          const isWrong = locked && val && val !== c.valor;
          const isEmpty = locked && !val;
          const bg = isCorrect
            ? "linear-gradient(180deg, rgba(46,204,143,0.45), rgba(255,255,255,0.92))"
            : isWrong
            ? "linear-gradient(180deg, rgba(255,107,107,0.4), rgba(255,255,255,0.92))"
            : isEmpty
            ? "linear-gradient(180deg, rgba(252,233,168,0.25), rgba(10,6,35,0.55))"
            : val ? "linear-gradient(180deg, rgba(252,233,168,0.95), rgba(217,164,65,0.85))" : "rgba(10,6,35,0.55)";
          const borderColor = isCorrect ? "#2ecc8f" : isWrong ? "#ff6b6b" : isEmpty ? "#d9a441" : val ? "#fce9a8" : "rgba(252,233,168,0.4)";
          return (
            <div key={c.id}
              data-dropzone={`slot:${c.id}`}
              onClick={() => onPlaceIn(c.id)}
              style={{
                background: bg,
                border: `1.5px solid ${borderColor}`,
                borderRadius: 10,
                padding: "6px 10px",
                cursor: locked ? "default" : "pointer",
                transition: "all 0.15s",
                minHeight: 48,
                display: "flex", flexDirection: "column", justifyContent: "center", gap: 3,
              }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 9.5, color: (val || locked) ? "#3a2608" : "#fce9a8", letterSpacing: "0.06em" }}>
                  {c.label}
                </div>
                {!val && !locked && HINTS[c.id] && (
                  <div style={{
                    fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 8.5,
                    color: "#4fd8ff", fontStyle: "italic", letterSpacing: "0.02em",
                  }}>
                    💡 {HINTS[c.id]}
                  </div>
                )}
              </div>
              <div style={{
                minHeight: 16,
                fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 11.5,
                color: val ? "#3a2608" : "rgba(252,233,168,0.45)",
                fontStyle: val ? "normal" : "italic",
                lineHeight: 1.15,
                wordBreak: "break-word",
                textDecoration: isWrong ? "line-through" : "none",
                textDecorationColor: "#ff6b6b",
              }}>
                {val || (isEmpty ? "(vacío)" : "(arrastra o toca)")}
              </div>
              {(isWrong || isEmpty) && (
                <div style={{
                  fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 10,
                  color: "#1e8a5d", lineHeight: 1.15, wordBreak: "break-word",
                  background: "rgba(46,204,143,0.18)",
                  border: "1px solid rgba(46,204,143,0.5)",
                  borderRadius: 6, padding: "2px 6px", marginTop: 2,
                }}>
                  ✓ {c.valor}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bandeja con datos arrastrables */}
      <div data-qa="bandeja" style={{
        width: "100%", maxWidth: 470,
        background: "rgba(10,6,35,0.55)",
        border: "1px dashed rgba(252,233,168,0.35)",
        borderRadius: 12,
        padding: "8px 10px",
        display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap",
        minHeight: 46,
        alignItems: "center",
      }}>
        {bandejaItems.map((v, i) => {
          if (usedValues.has(v)) return null;
          const isPicked = picked === v;
          return (
            <div key={`${v}-${i}`}
              className="ed-draggable"
              onPointerDown={makeDragHandler({
                item: v,
                ghostHtml: `<div style="background:#fce9a8;color:#3a2608;padding:6px 12px;border-radius:10px;font-family:Fredoka,Nunito,sans-serif;font-weight:700;font-size:11.5px;border:2px solid #4fd8ff;box-shadow:0 8px 22px rgba(0,0,0,0.5);max-width:240px;">${String(v).replace(/"/g,'&quot;')}</div>`,
                onTap: () => onPickLabel(v),
                onDrop: (zoneId, item) => {
                  if (zoneId && zoneId.startsWith("slot:")) {
                    const slotId = zoneId.slice(5);
                    // limpiar previo + asignar
                    const cleared = { ...placed };
                    for (const k of Object.keys(cleared)) if (cleared[k] === item) delete cleared[k];
                    cleared[slotId] = item;
                    onSetPlaced(cleared);
                  }
                },
                disabled: locked,
              })}
              style={{
                padding: "6px 12px", borderRadius: 10,
                background: isPicked ? "linear-gradient(180deg,#fce9a8,#d9a441)" : "rgba(255,255,255,0.94)",
                color: "#3a2608",
                border: `1.5px solid ${isPicked ? "#4fd8ff" : "rgba(242,194,96,0.55)"}`,
                fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 11.5,
                cursor: locked ? "default" : "grab",
                boxShadow: isPicked ? "0 0 14px rgba(79,216,255,0.6)" : "0 2px 6px rgba(0,0,0,0.3)",
                transform: isPicked ? "translateY(-2px)" : "none",
                transition: "all 0.15s",
                maxWidth: 200,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                userSelect: "none",
              }}>
              {v}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// R2 · Partes de la reseña — 3 cajones a la izquierda, 6 párrafos a la derecha
// ─────────────────────────────────────────────────────────────
function PartesResenaCard({ pick, parrafos, assigned, selectedBin, locked, onSelectBin, onAssignParrafo }) {
  const BINS = [
    { id: "descripcion", label: "DESCRIPCIÓN", color: "#7ab8ff", ink: "#08264d", emoji: "📋",
      hint: "De qué trata", ejemplos: '"Es...", "Trata sobre...", "Cuenta..."' },
    { id: "valoracion",  label: "VALORACIÓN",  color: "#ffb87a", ink: "#3a2608", emoji: "⭐",
      hint: "Tu opinión",   ejemplos: '"Me gustó...", "Me encantó...", "Lo más bonito..."' },
    { id: "conclusion",  label: "CONCLUSIÓN",  color: "#c39cff", ink: "#2a0a4a", emoji: "✅",
      hint: "Recomendación", ejemplos: '"Lo recomiendo...", "Si te gusta..."' },
  ];

  // Párrafos sin clasificar (siguen en la bandeja)
  const pendientes = parrafos.filter((p) => !assigned[p.id]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-around", gap: 6, paddingTop: 4, paddingBottom: 4 }}>
      {/* 3 cajones grandes en fila — dropzones */}
      <div style={{ width: "100%", maxWidth: 480, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
        {BINS.map((b) => {
          const isSel = selectedBin === b.id;
          const parrafosEnCajon = parrafos.filter((p) => assigned[p.id] === b.id);
          return (
            <div key={b.id}
              data-dropzone={b.id}
              onClick={() => !locked && onSelectBin(b.id)}
              style={{
                background: isSel
                  ? "linear-gradient(180deg, rgba(252,233,168,0.95), rgba(217,164,65,0.85))"
                  : `linear-gradient(180deg, ${b.color}, ${b.color}cc)`,
                border: `2px solid ${isSel ? "#4fd8ff" : "rgba(255,255,255,0.65)"}`,
                borderRadius: 12,
                padding: "6px 6px",
                cursor: locked ? "default" : "pointer",
                boxShadow: isSel ? "0 0 16px rgba(79,216,255,0.7)" : "0 3px 8px rgba(0,0,0,0.35)",
                transition: "all 0.18s",
                display: "flex", flexDirection: "column", alignItems: "stretch", gap: 4,
                minHeight: 130,
              }}>
              {/* Header del cajón + pista */}
              <div style={{
                textAlign: "center",
                color: isSel ? "#3a2608" : b.ink,
                fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 10, letterSpacing: "0.04em",
                lineHeight: 1.05,
              }}>
                <span style={{ fontSize: 14, marginRight: 4 }}>{b.emoji}</span>
                {b.label}
              </div>
              <div style={{
                textAlign: "center",
                color: isSel ? "rgba(58,38,8,0.85)" : b.ink,
                fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 8.5,
                fontStyle: "italic", lineHeight: 1.2, padding: "0 2px",
                opacity: 0.85,
              }}>
                {b.hint}<br/>
                <span style={{ fontWeight: 800, opacity: 0.95 }}>{b.ejemplos}</span>
              </div>
              {/* Lista interna de párrafos asignados */}
              <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
                {parrafosEnCajon.length === 0 ? (
                  <div style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--ed-font-display)", fontStyle: "italic", fontSize: 9.5,
                    color: isSel ? "rgba(58,38,8,0.55)" : "rgba(255,255,255,0.6)",
                    border: `1.5px dashed ${isSel ? "rgba(58,38,8,0.4)" : "rgba(255,255,255,0.5)"}`,
                    borderRadius: 8, padding: "10px 4px",
                    textAlign: "center", lineHeight: 1.15,
                  }}>
                    Arrastra una frase aquí
                  </div>
                ) : parrafosEnCajon.map((p) => {
                  const isCorrect = locked && p.tipo === b.id;
                  const isWrong = locked && p.tipo !== b.id;
                  const correctBin = isWrong ? BINS.find((x) => x.id === p.tipo) : null;
                  return (
                    <div key={p.id}
                      className="ed-draggable"
                      onPointerDown={makeDragHandler({
                        item: p.id,
                        ghostHtml: `<div style="max-width:260px;background:#fff;color:#3a2608;padding:6px 10px;border-radius:10px;font-family:Fredoka,Nunito,sans-serif;font-weight:600;font-size:11px;border:2px solid #4fd8ff;box-shadow:0 8px 22px rgba(0,0,0,0.5);">${p.texto.replace(/"/g,'&quot;')}</div>`,
                        onTap: () => !locked && onAssignParrafo(p.id),
                        onDrop: (zoneId, itemId) => { if (!locked) onAssignParrafo(itemId, zoneId); },
                        disabled: locked,
                      })}
                      style={{
                        background: isCorrect
                          ? "linear-gradient(180deg, rgba(46,204,143,0.35), rgba(255,255,255,0.95))"
                          : isWrong
                          ? "linear-gradient(180deg, rgba(255,107,107,0.3), rgba(255,255,255,0.95))"
                          : "rgba(255,255,255,0.95)",
                        color: "#3a2608",
                        border: `1.5px solid ${isCorrect ? "#2ecc8f" : isWrong ? "#ff6b6b" : "rgba(255,255,255,0.85)"}`,
                        borderRadius: 8, padding: "4px 6px",
                        cursor: locked ? "default" : "grab",
                        fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 9.5, lineHeight: 1.15,
                        boxShadow: "0 2px 4px rgba(0,0,0,0.25)",
                      }}>
                      <div>{p.texto.length > 60 ? p.texto.slice(0, 58) + "…" : p.texto}</div>
                      {isWrong && correctBin && (
                        <div style={{
                          marginTop: 3, fontSize: 8.5, fontWeight: 800,
                          color: "#c33b3b",
                          background: "rgba(255,107,107,0.18)",
                          padding: "1px 4px", borderRadius: 4,
                          letterSpacing: "0.04em",
                        }}>
                          ✗ Era: {correctBin.label}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bandeja de párrafos pendientes — arrastrables */}
      <div data-qa="bandeja" style={{
        width: "100%", maxWidth: 480,
        background: "rgba(10,6,35,0.55)",
        border: "1px dashed rgba(252,233,168,0.35)",
        borderRadius: 12,
        padding: "8px 10px",
        display: "flex", flexDirection: "column", gap: 4,
        minHeight: 50,
      }}>
        {pendientes.length === 0 ? (
          <div style={{
            textAlign: "center", color: "rgba(252,233,168,0.7)",
            fontFamily: "var(--ed-font-display)", fontStyle: "italic", fontSize: 11.5,
            padding: "10px 4px",
          }}>
            Todas las frases ya están clasificadas.
          </div>
        ) : pendientes.map((p) => (
          <div key={p.id}
            className="ed-draggable"
            onPointerDown={makeDragHandler({
              item: p.id,
              ghostHtml: `<div style="max-width:300px;background:#fce9a8;color:#3a2608;padding:6px 12px;border-radius:10px;font-family:Fredoka,Nunito,sans-serif;font-weight:600;font-size:11.5px;border:2px solid #4fd8ff;box-shadow:0 8px 22px rgba(0,0,0,0.5);">${p.texto.replace(/"/g,'&quot;')}</div>`,
              onTap: () => !locked && onAssignParrafo(p.id),
              onDrop: (zoneId, itemId) => { if (!locked) onAssignParrafo(itemId, zoneId); },
              disabled: locked,
            })}
            style={{
              background: "rgba(255,255,255,0.95)",
              color: "#3a2608",
              border: "1.5px solid rgba(242,194,96,0.6)",
              borderRadius: 9, padding: "6px 10px",
              cursor: locked ? "default" : "grab",
              fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 11, lineHeight: 1.3,
              boxShadow: "0 2px 5px rgba(0,0,0,0.25)",
              userSelect: "none",
            }}>
            <span style={{ marginRight: 6, color: "#4fd8ff", fontWeight: 800 }}>≡</span>
            {p.texto}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// R3 · Ordena el cuento — 5 escenas con foto+texto, tap-tap intercambia
// ─────────────────────────────────────────────────────────────
function OrdenaCuentoCard({ cuento, order, selected, locked, onTap }) {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
      <div style={{
        fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 13.5, color: "#fce9a8", textAlign: "center",
        background: "rgba(10,6,35,0.55)",
        border: "1px solid rgba(242,194,96,0.45)",
        borderRadius: 999,
        padding: "5px 18px",
      }}>
        📖 {cuento.titulo}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, width: "100%", maxWidth: 480 }}>
        {order.map((escena, i) => {
          const isSelected = selected === i;
          const isCorrect = locked && escena.n === i + 1;
          const isWrong = locked && escena.n !== i + 1;
          return (
            <div key={`${escena.n}-${i}`}
              onClick={() => onTap(i)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                background: isCorrect
                  ? "linear-gradient(180deg, rgba(46,204,143,0.28), rgba(255,255,255,0.94))"
                  : isWrong
                  ? "linear-gradient(180deg, rgba(255,107,107,0.22), rgba(255,255,255,0.94))"
                  : isSelected
                  ? "linear-gradient(180deg, rgba(79,216,255,0.45), rgba(252,233,168,0.88))"
                  : "rgba(255,255,255,0.95)",
                color: "#3a2608",
                border: `2.5px solid ${isCorrect ? "#2ecc8f" : isWrong ? "#ff6b6b" : isSelected ? "#4fd8ff" : "#f2c260"}`,
                borderRadius: 12, padding: "7px 11px",
                cursor: locked ? "default" : "pointer",
                boxShadow: isSelected ? "0 0 18px rgba(79,216,255,0.65)" : "0 3px 8px rgba(0,0,0,0.35)",
                transform: isSelected ? "translateX(5px)" : "none",
                transition: "all 0.18s",
              }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "linear-gradient(180deg, #f2c260, #d9a441)",
                color: "#3a2608", fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 14,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                border: "2px solid rgba(255,255,255,0.9)",
                boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
              }}>
                {i + 1}
              </div>
              <div style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{escena.emoji}</div>
              <div style={{ flex: 1, minWidth: 0, fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 12, lineHeight: 1.25 }}>
                {escena.texto}
              </div>
              {isWrong && (
                <div style={{
                  flexShrink: 0,
                  fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 10,
                  color: "#fff",
                  background: "linear-gradient(180deg, #2ecc8f, #15a06a)",
                  padding: "2px 8px", borderRadius: 999,
                  letterSpacing: "0.04em",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                }}>
                  ✓ Iba en {escena.n}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TEMA 2 · EscritorGame — 3 rondas:
//   R1: Pronombre detective (multi-choice por hueco)
//   R2: Laboratorio de verboides (drag desinencias a 3 cajones)
//   R3: Pintor de verbos (tap cicla AZUL/ROJO)
// ─────────────────────────────────────────────────────────────
function EscritorGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "Aprendiendo a escribir";

  const [ronda, setRonda] = useStateG(0);

  // R1 state: { huecoId: pronombreElegido }
  const [r1Selections, setR1Selections] = useStateG({});
  const [r1Locked, setR1Locked] = useStateG(false);

  // R2 state: { tipo: desinencia } + picked desinencia
  const [r2Placed, setR2Placed] = useStateG({});
  const [r2Picked, setR2Picked] = useStateG(null);
  const [r2Locked, setR2Locked] = useStateG(false);

  // R3 state: { huecoIdx: "g" | "j" } — selector inline en cada hueco
  const [r3Colors, setR3Colors] = useStateG({});
  const [r3Locked, setR3Locked] = useStateG(false);

  // Picks
  const [r1Pick] = useStateG(() => {
    const recent = new Set(getRecent("escritor"));
    let pool = PRONOMBRES_BANK.filter((p) => !recent.has(p.id));
    if (pool.length === 0) pool = PRONOMBRES_BANK;
    const p = pool[Math.floor(Math.random() * pool.length)];
    pushRecent("escritor", p.id);
    return p;
  });

  const [r2Pick] = useStateG(() => {
    const recent = new Set(getRecent("escritor"));
    let pool = VERBOIDES_BANK.filter((v) => !recent.has(v.id));
    if (pool.length === 0) pool = VERBOIDES_BANK;
    const p = pool[Math.floor(Math.random() * pool.length)];
    pushRecent("escritor", p.id);
    return p;
  });

  const [r3Pick] = useStateG(() => {
    // Key exclusiva de R3 G/J (antes compartía "escritor" con R1/R2, lo que
    // contaminaba el FIFO y reducía la variedad real).
    const recent = new Set(getRecent("usog"));
    let pool = USO_G_BANK.filter((v) => !recent.has(v.id));
    if (pool.length === 0) pool = USO_G_BANK;
    const p = pool[Math.floor(Math.random() * pool.length)];
    pushRecent("usog", p.id);
    return p;
  });

  // r3 huecos: lista plana de huecos G/J con su índice
  const r3Huecos = r3Pick.parrafo.map((tk, i) => tk.g != null ? { ...tk, idx: i } : null).filter(Boolean);

  // Shell state
  const [elapsed, setElapsed] = useStateG(0);
  const [stars, setStars] = useStateG(0);
  const [solved, setSolved] = useStateG(0);
  const [attempted, setAttempted] = useStateG(0);
  const [starsSession, setStarsSession] = useStateG(0);
  const [feedback, setFeedback] = useStateG(null);
  const [feedbackMsg, setFeedbackMsg] = useStateG("");
  const [confirmingRestart, setConfirmingRestart] = useStateG(false);
  const [confirmingExit, setConfirmingExit] = useStateG(false);
  const [log, setLog] = useStateG([]);
  const started = useRefG(Date.now());
  const exerciseStart = useRefG(Date.now());

  useEffectG(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started.current) / 1000)), 500);
    return () => clearInterval(id);
  }, []);

  useEffectG(() => {
    window.__qa_skip = () => { setRonda((r) => r + 1); exerciseStart.current = Date.now(); };
    return () => { delete window.__qa_skip; };
  }, []);

  useEffectG(() => {
    window.__currentChalkGlyphs = [
      { c: "yo", l: "6%",  t: "12%", r: "-8deg", s: "0.5em" },
      { c: "tú", l: "82%", t: "16%", r: "6deg",  s: "0.55em" },
      { c: "él", l: "10%", t: "78%", r: "12deg", s: "0.5em" },
      { c: "ar", l: "88%", t: "72%", r: "-10deg", s: "0.5em" },
      { c: "✍",  l: "45%", t: "8%",  r: "4deg",  s: "0.55em" },
      { c: "?",  l: "3%",  t: "45%", r: "-4deg", s: "0.6em" },
      { c: "✨", l: "92%", t: "45%", r: "8deg",  s: "0.5em" },
      { c: "ir", l: "30%", t: "55%", r: "-6deg", s: "0.5em" },
      { c: "-ando", l: "70%", t: "62%", r: "8deg",  s: "0.42em" },
      { c: "-ado", l: "55%", t: "30%", r: "-4deg", s: "0.42em" },
    ];
    return () => { window.__currentChalkGlyphs = null; };
  }, []);

  const r1AllSelected = r1Pick.huecos.every((h) => r1Selections[h.id]);
  const r2AllPlaced = Object.keys(r2Placed).length === 3;
  const r3AllPainted = r3Huecos.every((h) => r3Colors[h.idx]);

  const canVerify =
    ronda === 0 ? (r1AllSelected && !r1Locked) :
    ronda === 1 ? (r2AllPlaced && !r2Locked) :
    ronda === 2 ? (r3AllPainted && !r3Locked) :
    false;
  const showErase = true;

  function handleVerify() {
    if (!canVerify) return;
    if (ronda === 0) {
      setR1Locked(true);
      let correct = true;
      for (const h of r1Pick.huecos) {
        if (r1Selections[h.id] !== h.pronombre) { correct = false; }
      }
      const userText = r1Pick.huecos.map((h) => `${h.sustantivo}=${r1Selections[h.id] || "?"}`).join(", ");
      const correctText = r1Pick.huecos.map((h) => `${h.sustantivo}=${h.pronombre}`).join(", ");
      setTimeout(() => answer(correct, userText, correctText, "🕵"), 350);
    } else if (ronda === 1) {
      setR2Locked(true);
      const correct =
        r2Placed.infinitivo === r2Pick.correctas.infinitivo &&
        r2Placed.gerundio === r2Pick.correctas.gerundio &&
        r2Placed.participio === r2Pick.correctas.participio;
      const userText = `INF=${r2Placed.infinitivo || "?"} | GER=${r2Placed.gerundio || "?"} | PART=${r2Placed.participio || "?"}`;
      const correctText = `INF=${r2Pick.correctas.infinitivo} | GER=${r2Pick.correctas.gerundio} | PART=${r2Pick.correctas.participio}`;
      setTimeout(() => answer(correct, userText, correctText, "🧪"), 350);
    } else if (ronda === 2) {
      setR3Locked(true);
      let correct = true;
      for (const h of r3Huecos) {
        // Cada hueco tiene su propia letra correcta (h.c = "g" | "j")
        if (r3Colors[h.idx] !== h.c) { correct = false; }
      }
      const userText = r3Huecos.map((h) => `_${h.g}=${r3Colors[h.idx] || "?"}`).join(", ");
      const correctText = r3Huecos.map((h) => `${h.c}${h.g}`).join(", ");
      setTimeout(() => answer(correct, userText, correctText, "🔠"), 350);
    }
  }

  function handleErase() {
    if (ronda === 0) {
      if (r1Locked) return;
      setR1Selections({});
    } else if (ronda === 1) {
      if (r2Locked) return;
      setR2Placed({});
      setR2Picked(null);
    } else if (ronda === 2) {
      if (r3Locked) return;
      setR3Colors({});
    }
  }

  function answer(isCorrect, userText, correctText, opIcon) {
    if (typeof window.markFirstAttempt === "function") window.markFirstAttempt();
    const exerciseSec = Math.max(0, Math.floor((Date.now() - exerciseStart.current) / 1000));
    const earned = calcStars(isCorrect, exerciseSec);
    const newAttempted = attempted + 1;
    const newSolved = solved + (isCorrect ? 1 : 0);
    const newStarsTotal = stars + earned;
    const newStarsSession = starsSession + earned;

    const entry = {
      idx: newAttempted,
      a: correctText, b: userText, op: opIcon || "·",
      correctAnswer: correctText, userAnswer: userText,
      isCorrect, time: exerciseSec, earned,
    };
    const newLog = [...log, entry];

    setAttempted(newAttempted);
    setSolved(newSolved);
    setStars(newStarsTotal);
    setStarsSession(newStarsSession);
    setLog(newLog);

    const okMsg = `+${earned} ⭐`;
    const errMsg = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
    const revealDelay = isCorrect ? 0 : 1500;
    const overlayTime = isCorrect ? 950 : 1300;
    const totalTime   = revealDelay + overlayTime;

    setTimeout(() => {
      setFeedback(isCorrect ? "ok" : "err");
      setFeedbackMsg(isCorrect ? okMsg : errMsg);
    }, revealDelay);

    setTimeout(() => {
      setFeedback(null);
      setFeedbackMsg("");
      if (newAttempted >= 3) {
        setApp((s) => ({
          ...s, stars: newStarsTotal,
          lastResult: { category: catLabel, solved: newSolved, total: 3, time: elapsed, starsEarned: newStarsSession, log: newLog },
        }));
        window.incrementGamesCompleted && window.incrementGamesCompleted();
        go("results");
      } else {
        setRonda((r) => r + 1);
        exerciseStart.current = Date.now();
      }
    }, totalTime);
  }

  const enunciado =
    ronda === 0 ? `Reemplaza cada nombre por el pronombre correcto.` :
    ronda === 1 ? `Forma los 3 verboides del verbo "${r2Pick.verbo}".` :
    `Completa el texto con G o J.`;

  const bocadillo =
    ronda === 0 ? "Toca el pronombre que reemplaza cada nombre." :
    ronda === 1 ? "Arrastra la terminación al cajón correcto." :
    "Toca g o j en cada palabra para elegir.";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <GameHUD elapsed={elapsed} stars={stars} attempted={attempted} solved={solved} total={3} app={app} setApp={setApp} />
      <CharacterCorner char={char} message={bocadillo} />
      <GameEnunciado text={enunciado} top={120} />

      <div data-qa="zona-central" style={{
        position: "absolute", top: 150, left: "50%", transform: "translateX(-50%)", width: 440, bottom: 14,
      }}>
        {ronda === 0 && (
          <PronombreCard pick={r1Pick}
            selections={r1Selections} locked={r1Locked}
            onChoose={(huecoId, pronombre) => {
              if (r1Locked) return;
              setR1Selections({ ...r1Selections, [huecoId]: pronombre });
            }}
          />
        )}
        {ronda === 1 && (
          <VerboidesCard pick={r2Pick}
            placed={r2Placed} picked={r2Picked} locked={r2Locked}
            onPickLabel={(d) => { if (r2Locked) return; setR2Picked(r2Picked === d ? null : d); }}
            onPlaceIn={(tipo) => {
              if (r2Locked) return;
              if (r2Picked === null) {
                if (r2Placed[tipo]) {
                  const d = r2Placed[tipo];
                  const next = { ...r2Placed }; delete next[tipo];
                  setR2Placed(next); setR2Picked(d);
                }
                return;
              }
              const next = { ...r2Placed };
              for (const k of Object.keys(next)) if (next[k] === r2Picked) delete next[k];
              next[tipo] = r2Picked;
              setR2Placed(next); setR2Picked(null);
            }}
            onSetPlaced={(next) => { if (r2Locked) return; setR2Placed(next); setR2Picked(null); }}
          />
        )}
        {ronda === 2 && (
          <DetectiveGCard pick={r3Pick}
            choices={r3Colors} locked={r3Locked}
            onSelectLetter={(idx, letter) => {
              if (r3Locked) return;
              const cur = r3Colors[idx];
              const next = { ...r3Colors };
              if (cur === letter) delete next[idx]; // re-tap = deseleccionar
              else next[idx] = letter;
              setR3Colors(next);
            }}
          />
        )}
      </div>

      <ActionRail
        canVerify={canVerify}
        onVerify={handleVerify}
        showErase={showErase}
        onErase={handleErase}
        onRestart={() => setConfirmingRestart(true)}
        onExit={() => setConfirmingExit(true)}
      />

      <FeedbackOverlay feedback={feedback} feedbackMsg={feedbackMsg} charName={char.name} />
      <RestartModal confirmingExit={confirmingRestart} setConfirmingExit={setConfirmingRestart} attempted={attempted} total={3} onRestart={onRestart} />
      <ExitModal confirmingExit={confirmingExit} setConfirmingExit={setConfirmingExit} attempted={attempted} total={3} onExit={() => go("home")} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// R1 (N2) · Pronombre detective — 3 huecos con 3 opciones cada uno
// ─────────────────────────────────────────────────────────────
function PronombreCard({ pick, selections, locked, onChoose }) {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
      <div style={{
        width: "100%", maxWidth: 380,
        background: "linear-gradient(180deg, rgba(255,253,245,0.97), rgba(245,238,225,0.92))",
        border: "3px solid #f2c260",
        borderRadius: 16,
        padding: "22px 18px 22px 18px",
        boxShadow: "0 10px 22px rgba(0,0,0,0.45)",
        color: "#3a2608",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {pick.huecos.map((h, i) => {
            const userPick = selections[h.id];
            const isCorrect = locked && userPick === h.pronombre;
            const isWrong = locked && userPick && userPick !== h.pronombre;
            return (
              <div key={h.id} style={{
                display: "flex", flexDirection: "column", gap: 10,
                padding: "12px 12px",
                background: isCorrect ? "rgba(46,204,143,0.18)" : isWrong ? "rgba(255,107,107,0.18)" : "rgba(252,233,168,0.18)",
                borderRadius: 10,
                border: isCorrect ? "1.5px solid #2ecc8f" : isWrong ? "1.5px solid #ff6b6b" : "1.5px solid rgba(217,164,65,0.35)",
              }}>
                <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 12, lineHeight: 1.25, textAlign: "center" }}>
                  <span style={{ color: "#999", fontWeight: 600 }}>{i + 1}.</span>{" "}
                  <span style={{ background: "rgba(252,233,168,0.85)", padding: "2px 7px", borderRadius: 6, textDecoration: "underline", textDecorationColor: "#d9a441", fontWeight: 800 }}>
                    {h.sustantivo}
                  </span>{" "}
                  → ¿qué pronombre?
                </div>
                <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                  {h.opciones.map((op) => {
                    const isPicked = userPick === op;
                    const isCorrectAns = op === h.pronombre;
                    const showCorrect = locked && isCorrectAns;
                    const showWrong = locked && isPicked && !isCorrectAns;
                    let bg, bd, col, shadow;
                    if (showCorrect) {
                      bg = "linear-gradient(180deg, rgba(46,204,143,0.95), rgba(34,160,108,0.95))";
                      bd = "2px solid #2ecc8f";
                      col = "#fff";
                      shadow = "0 0 14px rgba(46,204,143,0.55)";
                    } else if (showWrong) {
                      bg = "linear-gradient(180deg, rgba(255,107,107,0.95), rgba(220,80,80,0.95))";
                      bd = "2px solid #ff6b6b";
                      col = "#fff";
                      shadow = "0 0 12px rgba(255,107,107,0.5)";
                    } else if (isPicked) {
                      bg = "linear-gradient(180deg,#fce9a8,#d9a441)";
                      bd = "1.5px solid #4fd8ff";
                      col = "#3a2608";
                      shadow = "0 0 12px rgba(79,216,255,0.55)";
                    } else {
                      bg = "rgba(255,255,255,0.95)";
                      bd = "1.5px solid rgba(242,194,96,0.55)";
                      col = "#3a2608";
                      shadow = "0 2px 5px rgba(0,0,0,0.25)";
                    }
                    return (
                      <button key={op}
                        onClick={() => onChoose(h.id, op)}
                        disabled={locked}
                        style={{
                          position: "relative",
                          padding: "6px 16px", borderRadius: 9,
                          background: bg,
                          color: col,
                          border: bd,
                          fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 12,
                          cursor: locked ? "default" : "pointer",
                          boxShadow: shadow,
                          transform: (isPicked && !locked) || showCorrect ? "translateY(-1.5px)" : "none",
                          transition: "all 0.15s",
                          minWidth: 76,
                        }}>
                        {op}
                        {showCorrect && !isPicked && (
                          <span style={{
                            position: "absolute", top: -7, right: -7,
                            background: "#2ecc8f", color: "#fff",
                            borderRadius: "50%", width: 18, height: 18,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11, fontWeight: 900,
                            border: "2px solid #fff",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                          }}>✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// R2 (N2) · Laboratorio de verboides — lexema + 3 slots (INF/GER/PART)
// ─────────────────────────────────────────────────────────────
function VerboidesCard({ pick, placed, picked, locked, onPickLabel, onPlaceIn, onSetPlaced }) {
  const BINS = [
    { id: "infinitivo", label: "INFINITIVO", emoji: "🌱", color: "#7ab8ff", ink: "#08264d" },
    { id: "gerundio",   label: "GERUNDIO",   emoji: "🌀", color: "#ff8ab4", ink: "#5c1f3a" },
    { id: "participio", label: "PARTICIPIO", emoji: "🎯", color: "#c39cff", ink: "#2a0a4a" },
  ];
  const usedDesinencias = new Set(Object.values(placed));

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-around", paddingTop: 4, paddingBottom: 4 }}>
      {/* Cabecera con verbo */}
      <div style={{
        fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 14, color: "#fce9a8", letterSpacing: "0.04em",
        background: "rgba(10,6,35,0.55)",
        border: "1px solid rgba(242,194,96,0.5)",
        borderRadius: 999, padding: "4px 18px",
      }}>
        🧪 Verbo: <span style={{ color: "#4fd8ff" }}>{pick.verbo}</span>
      </div>

      {/* 3 cajones: lexema + slot desinencia */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 360 }}>
        {BINS.map((b) => {
          const des = placed[b.id];
          const isCorrect = locked && des === pick.correctas[b.id];
          const isWrong = locked && des && des !== pick.correctas[b.id];
          const isEmpty = locked && !des;
          return (
            <div key={b.id}
              data-dropzone={`verboide:${b.id}`}
              onClick={() => onPlaceIn(b.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px", borderRadius: 14,
                background: isCorrect
                  ? "linear-gradient(180deg, rgba(46,204,143,0.3), rgba(255,255,255,0.95))"
                  : isWrong
                  ? "linear-gradient(180deg, rgba(255,107,107,0.25), rgba(255,255,255,0.95))"
                  : `linear-gradient(180deg, ${b.color}44, rgba(255,255,255,0.95))`,
                border: `2.5px solid ${isCorrect ? "#2ecc8f" : isWrong ? "#ff6b6b" : b.color}`,
                cursor: locked ? "default" : "pointer",
                boxShadow: "0 4px 10px rgba(0,0,0,0.35)",
                transition: "all 0.18s",
                minHeight: 52,
              }}>
              <div style={{
                width: 96, fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 11, color: b.ink,
                letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: 5,
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>{b.emoji}</span>
                <span>{b.label}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, justifyContent: "center" }}>
                <div style={{
                  fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 22, color: "#3a2608",
                  padding: "6px 14px", background: "rgba(252,233,168,0.7)", borderRadius: 10,
                  minWidth: 64, textAlign: "center",
                }}>
                  {pick.lexema}
                </div>
                <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 20, color: "#7a4a0e" }}>+</div>
                <div
                  className={des && !locked ? "ed-draggable" : ""}
                  onPointerDown={des && !locked ? makeDragHandler({
                    item: des,
                    ghostHtml: `<div style="background:#fce9a8;color:#3a2608;padding:6px 14px;border-radius:10px;font-family:Fredoka,Nunito,sans-serif;font-weight:800;font-size:14px;border:2px solid #4fd8ff;box-shadow:0 8px 22px rgba(0,0,0,0.5);">${des}</div>`,
                    onTap: () => onPlaceIn(b.id),  // tap normal: levantar y volver a bandeja
                    onDrop: (zoneId, item) => {
                      if (zoneId && zoneId.startsWith("verboide:") && onSetPlaced) {
                        const tipo = zoneId.slice(9);
                        if (tipo === b.id) return;  // soltó en el mismo slot
                        const next = { ...placed };
                        for (const k of Object.keys(next)) if (next[k] === item) delete next[k];
                        next[tipo] = item;
                        onSetPlaced(next);
                      }
                    },
                    disabled: locked,
                  }) : undefined}
                  onClick={des && !locked ? (e) => e.stopPropagation() : undefined}
                  style={{
                    minWidth: 80, height: 40,
                    background: des
                      ? (isWrong ? "linear-gradient(180deg,#ff8888,#e04545)" : "linear-gradient(180deg, #4fd8ff, #2a98c8)")
                      : "rgba(10,6,35,0.15)",
                    border: `2px ${des ? "solid" : "dashed"} ${des ? (isWrong ? "#ff6b6b" : "#4fd8ff") : "rgba(116,72,32,0.5)"}`,
                    borderRadius: 10,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 16,
                    color: des ? "#fff" : "rgba(116,72,32,0.5)",
                    padding: "0 10px",
                    cursor: des && !locked ? "grab" : (locked ? "default" : "pointer"),
                    userSelect: "none",
                    textDecoration: isWrong ? "line-through" : "none",
                    textDecorationColor: "rgba(255,255,255,0.7)",
                  }}>
                  {des || "?"}
                </div>
                {(isWrong || isEmpty) && (
                  <div style={{
                    fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 12,
                    color: "#fff",
                    background: "linear-gradient(180deg, #ff8b8b, #c33b3b)",
                    padding: "4px 10px", borderRadius: 999,
                    border: "1.5px solid #fff",
                    boxShadow: "0 3px 7px rgba(0,0,0,0.3)",
                    letterSpacing: "0.04em",
                  }}>
                    ✗ {pick.correctas[b.id]}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bandeja de desinencias — single row balanced */}
      <div data-qa="bandeja" style={{
        width: "100%", maxWidth: 460,
        background: "rgba(10,6,35,0.55)",
        border: "1px dashed rgba(252,233,168,0.35)",
        borderRadius: 12,
        padding: "8px 10px",
        display: "flex", gap: 5, justifyContent: "center", alignItems: "center",
        flexWrap: "nowrap",
      }}>
        {pick.bandeja.map((d) => {
          if (usedDesinencias.has(d)) return null;
          const isPicked = picked === d;
          return (
            <div key={d}
              className="ed-draggable"
              onPointerDown={makeDragHandler({
                item: d,
                ghostHtml: `<div style="background:#fce9a8;color:#3a2608;padding:6px 14px;border-radius:10px;font-family:Fredoka,Nunito,sans-serif;font-weight:800;font-size:14px;border:2px solid #4fd8ff;box-shadow:0 8px 22px rgba(0,0,0,0.5);">${d}</div>`,
                onTap: () => onPickLabel(d),
                onDrop: (zoneId, item) => {
                  if (zoneId && zoneId.startsWith("verboide:") && onSetPlaced) {
                    const tipo = zoneId.slice(9);
                    const next = { ...placed };
                    for (const k of Object.keys(next)) if (next[k] === item) delete next[k];
                    next[tipo] = item;
                    onSetPlaced(next);
                  }
                },
                disabled: locked,
              })}
              style={{
                padding: "7px 8px", borderRadius: 10,
                background: isPicked ? "linear-gradient(180deg,#fce9a8,#d9a441)" : "rgba(255,255,255,0.94)",
                color: "#3a2608",
                border: `2px solid ${isPicked ? "#4fd8ff" : "rgba(242,194,96,0.6)"}`,
                fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 12,
                cursor: locked ? "default" : "grab",
                boxShadow: isPicked ? "0 0 14px rgba(79,216,255,0.6)" : "0 3px 7px rgba(0,0,0,0.3)",
                transform: isPicked ? "translateY(-2px)" : "none",
                transition: "all 0.15s",
                minWidth: 48, flex: "0 0 auto",
                whiteSpace: "nowrap",
                userSelect: "none",
                textAlign: "center",
              }}>
              {d}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// R3 (N2) · Pintor de verbos — texto con verbos cliclables, ciclan AZUL/ROJO/limpio
// ─────────────────────────────────────────────────────────────
function DetectiveGCard({ pick, choices, locked, onSelectLetter }) {
  // Reagrupo los tokens del párrafo para que la cabeza de la palabra
  // ("psicolo"), el selector g/j y el sufijo ("ía") queden en un mismo
  // nowrap. Sin esto, el navegador puede romper la línea entre la cabeza
  // (texto inline) y el selector (inline-block atómico).
  const groups = [];
  for (let i = 0; i < pick.parrafo.length; i++) {
    const tk = pick.parrafo[i];
    if (tk.c !== undefined) {
      const last = groups[groups.length - 1];
      if (last && last.kind === "text") {
        const idx = last.value.lastIndexOf(" ");
        const head = idx >= 0 ? last.value.slice(0, idx + 1) : "";
        const tail = idx >= 0 ? last.value.slice(idx + 1) : last.value;
        if (head) last.value = head; else groups.pop();
        groups.push({ kind: "word", prefix: tail, choice: tk, choiceIdx: i });
      } else {
        groups.push({ kind: "word", prefix: "", choice: tk, choiceIdx: i });
      }
    } else {
      groups.push({ kind: "text", value: tk.t });
    }
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-around", paddingTop: 4, paddingBottom: 4 }}>
      {/* Cartel del comunicado — width fit-content para que se ajuste al
          texto: escenas cortas no quedan con aire vacío a los lados. */}
      <div style={{
        width: "fit-content", maxWidth: 470,
        background: "linear-gradient(180deg, rgba(255,253,245,0.97), rgba(245,238,225,0.92))",
        border: "3px solid #f2c260",
        borderRadius: 18,
        padding: "16px 24px 20px 24px",
        boxShadow: "0 12px 26px rgba(0,0,0,0.5)",
        color: "#3a2608",
      }}>
        <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 13, marginBottom: 10, textAlign: "center", color: "#7a4a0e", letterSpacing: "0.02em" }}>
          🔠 {pick.titulo}
        </div>
        <div style={{ fontFamily: "var(--ed-font-ui)", fontWeight: 400, fontSize: 17, lineHeight: 2.5, textAlign: "center" }}>
          {groups.map((g, j) => {
            if (g.kind === "text") return <span key={`t-${j}`}>{g.value}</span>;
            const i = g.choiceIdx;
            const choice = choices[i];
            const correct = g.choice.c;
            const isCorrect = locked && choice === correct;
            const isWrong = locked && choice && choice !== correct;
            const isEmpty = locked && !choice;
            const renderHalf = (letter, fillColor) => {
              const isSel = choice === letter;
              return (
                <span
                  onClick={() => !locked && onSelectLetter(i, letter)}
                  style={{
                    display: "inline-block",
                    padding: "1px 8px",
                    background: isSel ? fillColor : "transparent",
                    color: isSel ? "#fff" : "rgba(116,72,32,0.55)",
                    fontWeight: 800,
                    fontFamily: "var(--ed-font-display)",
                    fontSize: 14,
                    cursor: locked ? "default" : "pointer",
                    userSelect: "none",
                    transition: "all 0.15s",
                  }}>
                  {letter}
                </span>
              );
            };
            const pillBorder = isCorrect ? "1.5px solid #2ecc8f"
                              : isWrong  ? "1.5px solid #ff6b6b"
                              : "1.5px solid rgba(116,72,32,0.3)";
            return (
              <span key={`w-${j}`} style={{ display: "inline-block", margin: 0, userSelect: "none", whiteSpace: "nowrap" }}>
                {g.prefix && <span>{g.prefix}</span>}
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  margin: "0 3px",
                  background: "rgba(255,255,255,0.85)",
                  border: pillBorder,
                  borderRadius: 8,
                  overflow: "hidden",
                  verticalAlign: "middle",
                  lineHeight: 1,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                }}>
                  {renderHalf("g", "#2ecc8f")}
                  <span style={{ width: 1, height: 16, background: "rgba(116,72,32,0.25)" }} />
                  {renderHalf("j", "#ff8a3a")}
                </span>
                <span>{g.choice.g}</span>
                {(isWrong || isEmpty) && (
                  <sup style={{ fontSize: 10, color: "#c33b3b", marginLeft: 2, fontWeight: 800 }}>{correct}</sup>
                )}
              </span>
            );
          })}
        </div>
      </div>

      {/* Pista de regla */}
      <div style={{
        background: "rgba(10,6,35,0.65)",
        border: "1px solid rgba(252,233,168,0.5)",
        borderRadius: 999,
        padding: "6px 20px",
        fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 12, color: "#fce9a8",
        letterSpacing: "0.02em",
        maxWidth: 460, textAlign: "center",
      }}>
        {pick.regla}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ResultsScreen + PrintableReport (compartido)
// ─────────────────────────────────────────────────────────────
function formatOp(e) {
  return `${e.op || ""} ${e.a}`;
}

const printStyles = {
  doc: { padding: 0, margin: 0, color: "#111", background: "#fff" },
  head: { display: "flex", alignItems: "center", gap: 14, borderBottom: "2px solid #d9a441", paddingBottom: 10, marginBottom: 14 },
  logo: { width: 56, height: 56, objectFit: "contain" },
  title: { flex: 1, minWidth: 0 },
  org: { fontFamily: "'Fredoka','Baloo 2','Nunito',sans-serif", fontWeight: 700, fontSize: "16pt", letterSpacing: "0.03em", lineHeight: 1.1, margin: 0 },
  sub: { fontSize: "9pt", color: "#555", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 4 },
  date: { fontFamily: "ui-monospace,Consolas,monospace", fontSize: "10pt", color: "#555", textAlign: "right", whiteSpace: "nowrap" },
  fields: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 },
  field: { padding: "8px 10px", borderRadius: 6, border: "1px solid #ddd" },
  fieldL: { fontSize: "8pt", textTransform: "uppercase", letterSpacing: "0.08em", color: "#666" },
  fieldV: { fontSize: "12pt", fontWeight: 700, marginTop: 2 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "11pt" },
  thHead: { borderBottom: "2px solid #111" },
  th: { padding: 8, textAlign: "left", fontSize: "9pt", textTransform: "uppercase", letterSpacing: "0.08em", color: "#555", fontWeight: 700 },
  thR: { textAlign: "right" },
  thC: { textAlign: "center" },
  tr: { borderBottom: "1px solid #ccc" },
  td: { padding: "9px 8px", fontFamily: "ui-monospace,Consolas,monospace" },
  tdNum: { color: "#888", width: 36 },
  tdOp: { fontWeight: 700 },
  tdR: { textAlign: "right" },
  tdC: { textAlign: "center", fontFamily: "'Nunito',sans-serif", fontWeight: 700 },
  tdDim: { color: "#888" },
  tdOk: { color: "#1e8a5d" },
  tdErr: { color: "#c33b3b" },
  tdEmpty: { padding: 24, textAlign: "center", color: "#888", fontStyle: "italic" },
  summary: { marginTop: 16, borderTop: "2px solid #d9a441", paddingTop: 12, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 },
  cell: { padding: 10, borderRadius: 6, border: "1px solid #ddd", textAlign: "center" },
  cellEmp: { background: "#faf3df", borderColor: "#d9a441" },
  cellL: { fontSize: "8pt", textTransform: "uppercase", letterSpacing: "0.08em", color: "#666" },
  cellV: { fontSize: "18pt", fontWeight: 800, marginTop: 4 },
  foot: { marginTop: 16, fontSize: "9pt", color: "#888", textAlign: "center" },
};

function PrintableReport({ studentName, res, dateStr, m, s, attemptedCount, totalEx, accuracy }) {
  const log = res.log || [];
  return (
    <PortalToBody>
      <div className="ed-print-doc" style={printStyles.doc} aria-hidden="true">
        <div style={printStyles.head}>
          <img src="assets/edinun-logo.png" alt="" style={printStyles.logo} />
          <div style={printStyles.title}>
            <h1 style={printStyles.org}>EDINUN — Ediciones Nacionales Unidas</h1>
            <div style={printStyles.sub}>Reporte académico · Juegos de Lenguaje</div>
          </div>
          <div style={printStyles.date}>{dateStr}</div>
        </div>
        <div style={printStyles.fields}>
          <div style={printStyles.field}>
            <div style={printStyles.fieldL}>Estudiante</div>
            <div style={printStyles.fieldV}>{studentName || "—"}</div>
          </div>
          <div style={printStyles.field}>
            <div style={printStyles.fieldL}>Categoría</div>
            <div style={printStyles.fieldV}>{res.category || "—"}</div>
          </div>
          <div style={printStyles.field}>
            <div style={printStyles.fieldL}>Tiempo total</div>
            <div style={printStyles.fieldV}>{String(m).padStart(2,"0")}:{String(s).padStart(2,"0")}</div>
          </div>
        </div>
        <table style={printStyles.table}>
          <thead>
            <tr style={printStyles.thHead}>
              <th style={printStyles.th}>#</th>
              <th style={printStyles.th}>Reto</th>
              <th style={{ ...printStyles.th, ...printStyles.thR }}>Respuesta del estudiante</th>
              <th style={{ ...printStyles.th, ...printStyles.thR }}>Respuesta correcta</th>
              <th style={{ ...printStyles.th, ...printStyles.thC }}>Estado</th>
              <th style={{ ...printStyles.th, ...printStyles.thR }}>Tiempo</th>
            </tr>
          </thead>
          <tbody>
            {log.map((e) => (
              <tr key={e.idx} style={printStyles.tr}>
                <td style={{ ...printStyles.td, ...printStyles.tdNum }}>{e.idx}</td>
                <td style={{ ...printStyles.td, ...printStyles.tdOp }}>{e.op || ""} {e.a}</td>
                <td style={{ ...printStyles.td, ...printStyles.tdR }}>{String(e.userAnswer).slice(0, 40)}</td>
                <td style={{ ...printStyles.td, ...printStyles.tdR }}>{String(e.correctAnswer).slice(0, 40)}</td>
                <td style={{ ...printStyles.td, ...printStyles.tdC, ...(e.isCorrect ? printStyles.tdOk : printStyles.tdErr) }}>
                  {e.isCorrect ? "Correcto" : "Incorrecto"}
                </td>
                <td style={{ ...printStyles.td, ...printStyles.tdR, ...printStyles.tdDim }}>{e.time}s</td>
              </tr>
            ))}
            {log.length === 0 && (
              <tr><td colSpan={6} style={printStyles.tdEmpty}>No se registraron ejercicios en esta sesión.</td></tr>
            )}
          </tbody>
        </table>
        <div style={printStyles.summary}>
          <div style={printStyles.cell}><div style={printStyles.cellL}>Ejercicios</div><div style={printStyles.cellV}>{attemptedCount} / {totalEx}</div></div>
          <div style={printStyles.cell}><div style={printStyles.cellL}>Correctos</div><div style={printStyles.cellV}>{res.solved}</div></div>
          <div style={printStyles.cell}><div style={printStyles.cellL}>Estrellas</div><div style={printStyles.cellV}>{res.starsEarned}</div></div>
          <div style={{ ...printStyles.cell, ...printStyles.cellEmp }}><div style={printStyles.cellL}>Precisión total</div><div style={printStyles.cellV}>{accuracy}%</div></div>
        </div>
        <div style={printStyles.foot}>EDINUN GAMES · Reporte generado automáticamente</div>
      </div>
    </PortalToBody>
  );
}

function ResultsScreen({ app, setApp, go }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const res = app.lastResult || { category: "—", solved: 0, total: 3, time: 0, starsEarned: 0, log: [] };
  const m = Math.floor(res.time / 60), s = res.time % 60;
  const totalEx = res.total || 3;
  const attemptedCount = (res.log || []).length;
  const accuracy = attemptedCount > 0 ? Math.round((res.solved / attemptedCount) * 100) : 0;
  const dateStr = new Date().toLocaleDateString("es-EC", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 14, left: 24, right: 24, display: "flex", justifyContent: "flex-start", alignItems: "center" }}>
        <button className="ed-btn ed-btn-ghost" onClick={() => go("home")} style={{ padding: "8px 14px", fontWeight: 800, letterSpacing: "0.04em" }}>← VOLVER AL INICIO</button>
      </div>
      <div style={{
        position: "absolute", inset: "70px 32px 20px 32px",
        display: "grid", gridTemplateColumns: "0.85fr 1.4fr", gap: 24, alignItems: "stretch",
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <div style={{
            fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 32,
            background: "linear-gradient(180deg, #fce9a8, #d9a441)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            lineHeight: 1, marginBottom: 4, textAlign: "center",
          }}>¡Ronda completa!</div>
          <char.Component size={190} />
          <div className="ed-body" style={{ fontStyle: "italic", textAlign: "center", maxWidth: 240, fontSize: 13 }}>
            "{app.studentName}, completaste {res.solved} de {totalEx} retos."
            <div style={{ marginTop: 4, color: "var(--ed-ink-soft)", fontSize: 12 }}>— {char.name}</div>
          </div>
        </div>
        <div className="ed-card" style={{ padding: 16, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, borderBottom: "2px solid rgba(242,194,96,0.45)", paddingBottom: 10, marginBottom: 12 }}>
            <EdinunLogoMini size={56} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 18, letterSpacing: "0.04em", lineHeight: 1.1 }}>
                EDINUN — Ediciones Nacionales Unidas
              </div>
              <div style={{ fontFamily: "var(--ed-font-ui)", fontSize: 11, color: "var(--ed-ink-soft)", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 2 }}>
                Reporte académico · Juegos de Lenguaje
              </div>
            </div>
            <div style={{ fontFamily: "var(--ed-font-mono)", fontSize: 11, color: "var(--ed-ink-dim)", textAlign: "right" }}>{dateStr}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontFamily: "var(--ed-font-ui)", fontSize: 12, marginBottom: 10 }}>
            <ReportField label="Estudiante" value={app.studentName || "—"} />
            <ReportField label="Categoría" value={res.category} />
            <ReportField label="Tiempo total" value={`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`} />
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: "auto", marginBottom: 10 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--ed-font-ui)", fontSize: 12 }}>
              <thead>
                <tr style={{
                  fontFamily: "var(--ed-font-ui)", fontWeight: 700, fontSize: 10,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  color: "var(--ed-ink-dim)",
                  borderBottom: "1px solid rgba(148,120,255,0.3)",
                }}>
                  <th style={{ textAlign: "left", padding: "6px 8px", width: 36 }}>#</th>
                  <th style={{ textAlign: "left", padding: "6px 8px" }}>Reto</th>
                  <th style={{ textAlign: "right", padding: "6px 8px" }}>Tu respuesta</th>
                  <th style={{ textAlign: "right", padding: "6px 8px" }}>Respuesta correcta</th>
                  <th style={{ textAlign: "center", padding: "6px 8px" }}>Estado</th>
                  <th style={{ textAlign: "right", padding: "6px 8px" }}>Tiempo</th>
                </tr>
              </thead>
              <tbody style={{ fontFamily: "var(--ed-font-mono)" }}>
                {(res.log || []).map((e) => (
                  <tr key={e.idx} style={{ borderBottom: "1px solid rgba(148,120,255,0.18)" }}>
                    <td style={{ padding: "8px 8px", color: "var(--ed-ink-soft)" }}>{e.idx}</td>
                    <td style={{ padding: "8px 8px", fontWeight: 600 }}>{formatOp(e)}</td>
                    <td style={{ padding: "8px 8px", textAlign: "right", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }}>{String(e.userAnswer).slice(0, 28)}</td>
                    <td style={{ padding: "8px 8px", textAlign: "right", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }}>{String(e.correctAnswer).slice(0, 28)}</td>
                    <td style={{ padding: "8px 8px", textAlign: "center", fontFamily: "var(--ed-font-display)", fontWeight: 700, color: e.isCorrect ? "#2ecc8f" : "#ff6b6b" }}>
                      {e.isCorrect ? "Correcto" : "Incorrecto"}
                    </td>
                    <td style={{ padding: "8px 8px", textAlign: "right", color: "var(--ed-ink-dim)" }}>{e.time}s</td>
                  </tr>
                ))}
                {(res.log || []).length === 0 && (
                  <tr><td colSpan={6} style={{ padding: "16px 8px", textAlign: "center", color: "var(--ed-ink-soft)", fontStyle: "italic" }}>
                    No se registraron ejercicios en esta sesión.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ borderTop: "2px solid rgba(242,194,96,0.45)", paddingTop: 10, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, fontFamily: "var(--ed-font-ui)", fontSize: 11 }}>
            <SummaryCell label="Ejercicios" value={`${attemptedCount} / ${totalEx}`} />
            <SummaryCell label="Correctos" value={`${res.solved}`} tone="#2ecc8f" />
            <SummaryCell label="Estrellas" value={`${res.starsEarned}`} tone="#fce9a8" />
            <SummaryCell label="Precisión total" value={`${accuracy}%`} tone="#fce9a8" emphasis />
          </div>
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button className="ed-btn ed-btn-ghost" onClick={() => window.print()}
              style={{ padding: "0 10px", fontSize: 13, height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>IMPRIMIR REPORTE</button>
            <button className="ed-btn ed-btn-primary" onClick={() => go("game")}
              style={{ padding: "0 10px", fontSize: 13, height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>JUGAR OTRA RONDA</button>
          </div>
        </div>
      </div>
      <PrintableReport
        studentName={app.studentName}
        res={res} dateStr={dateStr} m={m} s={s}
        attemptedCount={attemptedCount} totalEx={totalEx} accuracy={accuracy}
      />
    </div>
  );
}

function ReportField({ label, value }) {
  return (
    <div style={{ padding: "8px 10px", borderRadius: 10, background: "rgba(10,6,35,0.45)", border: "1px solid rgba(148,120,255,0.25)" }}>
      <div className="ed-label" style={{ fontSize: 9, color: "var(--ed-ink-soft)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 14, color: "var(--ed-ink)" }}>{value}</div>
    </div>
  );
}

function SummaryCell({ label, value, tone = "var(--ed-ink)", emphasis = false }) {
  return (
    <div style={{
      padding: "8px 10px", borderRadius: 10,
      background: emphasis ? "rgba(242,194,96,0.12)" : "rgba(10,6,35,0.4)",
      border: `1px solid ${emphasis ? "rgba(242,194,96,0.5)" : "rgba(148,120,255,0.25)"}`,
      textAlign: "center",
    }}>
      <div className="ed-label" style={{ fontSize: 9, color: "var(--ed-ink-soft)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: emphasis ? 22 : 18, color: tone, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

Object.assign(window, { GameScreen, ResultsScreen });
