// game-screens.jsx — GameScreen + ResultsScreen para JUEGO-23
// "Buscando la palabra adecuada" (TEMA 3 del libro EDINUN, 13 años). 1 nivel,
// 3 rondas con mecánicas DISTINTAS (estándar 7+ años):
//   R1 — Sintoniza el mensaje: DIAL. Aparece un mensaje y se gira un dial de
//        3 posiciones para clasificar su registro (coloquial · estándar ·
//        culto). Auto-evaluado (§13): avanza al fallar revelando la correcta.
//   R2 — Chat correcto: SIMULADOR de chat (ronda estrella). Chateas con un
//        receptor distinto (abuela · rector · pana) y eliges el mensaje cuyo
//        registro le queda bien. Auto-evaluado, feedback verde/rojo por turno.
//   R3 — Reparador de mensajes: ARRASTRE. Cambias las palabras fuera de
//        registro por la forma adecuada arrastrándolas al hueco. VERIFICAR
//        manual con feedback verde/rojo (§11).
//
// Tema: ADECUACIÓN — niveles del lenguaje, situación comunicativa y receptor.
// Contenido con redacción propia, vocabulario ecuatoriano neutro. El shell
// (HUD, personaje, enunciado, action rail, modales, feedback, reporte, scoring)
// se hereda del estándar (juego-24/21). NO repite las mecánicas de juego-22 ni
// juego-24 (shooter · simulador de coloquio · memoria · emparejar · clasificar
// tecnicismos): aquí son DIAL · CHAT · REPARAR.

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

// Drag con fallback tap. Usa data-dropzone para detectar destinos.
function makeDragHandler({ item, ghostHtml, onTap, onDrop, disabled }) {
  return function onPointerDown(e) {
    if (disabled) return;
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    let started = false;
    let ghost = null;
    let currentZoneId = null;
    let lastX = startX, lastY = startY;
    const highlights = new Set();

    function clearHighlights() {
      for (const el of highlights) el.classList.remove("ed-drop-hover");
      highlights.clear();
    }
    function findZoneAt(x, y) {
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
        ghost.innerHTML = ghostHtml || `<div style="background:#fce9a8;color:#3a2608;padding:6px 12px;border-radius:10px;font-family:Fredoka,Nunito,sans-serif;font-weight:800;font-size:13px;border:2px solid #4fd8ff;box-shadow:0 6px 18px rgba(0,0,0,0.5);">${String(item).slice(0,60)}</div>`;
        document.body.appendChild(ghost);
        document.body.style.cursor = "grabbing";
      }
      if (started && ghost) {
        ghost.style.left = x + "px";
        ghost.style.top = y + "px";
        clearHighlights();
        const zone = findZoneAt(x, y);
        if (zone) { zone.classList.add("ed-drop-hover"); highlights.add(zone); currentZoneId = zone.dataset.dropzone; }
        else { currentZoneId = null; }
      }
    }
    function onUp(ev) {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onCancel);
      let finalZone = currentZoneId;
      if (started && !finalZone) {
        const x = (ev && ev.clientX != null) ? ev.clientX : lastX;
        const y = (ev && ev.clientY != null) ? ev.clientY : lastY;
        const zone = findZoneAt(x, y);
        if (zone) finalZone = zone.dataset.dropzone;
      }
      if (ghost) { ghost.remove(); ghost = null; }
      document.body.style.cursor = "";
      clearHighlights();
      if (!started) { if (onTap) onTap(item); }
      else if (finalZone && onDrop) { onDrop(finalZone, item); }
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
  "¡Casi! Piensa con quién hablas.",
  "Cada situación pide su registro 💬",
  "Equivocarse también es aprender.",
  "Respira y vuelve a intentarlo.",
  "Fíjate bien en el receptor del mensaje.",
  "¡La próxima es tuya!",
  "Las palabras adecuadas abren puertas.",
];

// ─────────────────────────────────────────────────────────────
// FIFO anti-repetición por categoría en un solo key de localStorage.
// Ventana ≈ floor(N/2) por categoría, con margen para conservar variedad.
// ─────────────────────────────────────────────────────────────
const RECENT_KEY = "edinun_juego23_recientes_v1";
const RECENT_LIMIT = 28;

function getRecent() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function pushRecent(key) {
  const arr = getRecent().filter((k) => k !== key);
  arr.unshift(key);
  const trimmed = arr.slice(0, RECENT_LIMIT);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(trimmed)); } catch {}
}
// Elige N ítems frescos bloqueando los más recientes de su categoría.
// El pool debe quedar SIEMPRE con al menos un ítem extra por encima de N;
// si no, shuffle solo reordena y el CONJUNTO mostrado es siempre el mismo.
function pickFreshSet(bank, prefix, idOf, n) {
  const pre = prefix + ":";
  const recentIds = getRecent().filter((k) => k.startsWith(pre)).map((k) => k.slice(pre.length));
  const maxBlock = Math.max(0, bank.length - n - 1);
  const windowN = Math.min(Math.floor(bank.length / 2), maxBlock);
  const blocked = new Set(recentIds.slice(0, windowN));
  let pool = bank.filter((b) => !blocked.has(idOf(b)));
  if (pool.length < n) pool = bank.slice();
  const sh = shuffle(pool).slice(0, n);
  sh.forEach((b) => pushRecent(pre + idOf(b)));
  return sh;
}

// ═════════════════════════════════════════════════════════════
// BANCOS DE DATOS — TEMA 3 (adecuación · niveles del lenguaje · receptor).
// Redacción propia inspirada en el libro EDINUN. Vocabulario ecuatoriano.
// ═════════════════════════════════════════════════════════════

// R1 — DIAL. Cada mensaje pertenece a un NIVEL del lenguaje:
//   · coloquial → jerga, apócopes, diminutivos, marca de identidad juvenil.
//   · estándar  → correcto y neutral, respeta las normas, uso cotidiano.
//   · culto     → vocabulario elaborado, figuras o tecnicismos, propio de
//                 la escritura académica o poética.
const R1_NIVELES = [
  { id: "coloq",    label: "Coloquial", emoji: "😎", color: "#f2a73b", needle: -58 },
  { id: "estandar", label: "Estándar",  emoji: "💬", color: "#4fa0ff", needle: 0 },
  { id: "culto",    label: "Culto",     emoji: "🎓", color: "#a78bfa", needle: 58 },
];
const R1_BANK = {
  coloq: [
    "¿Qué más, bro? Asoma al party.",
    "Todo piola, ¿cachas?",
    "Ese man es full bacán.",
    "Ñaño, préstame un toque.",
    "Nos pillamos al rato, chao.",
    "Qué chévere el plan, de una.",
    "Estoy full cansado, mejor mañana.",
    "Pana, pásame el dato, porfa.",
  ],
  estandar: [
    "Buenos días, ¿cómo está usted?",
    "¿Me indica el horario, por favor?",
    "Gracias por tu ayuda, te lo agradezco.",
    "Nos vemos mañana en la tarde.",
    "Con gusto, ¿en qué le ayudo?",
    "Disculpe, ¿podría repetirlo, por favor?",
    "Le escribo para confirmar la reunión.",
    "Muchas gracias por su tiempo.",
  ],
  culto: [
    "La poesía transforma al lector.",
    "Su discurso reveló una notable elocuencia.",
    "El conocimiento nos dota de recursos.",
    "La melancolía habita en sus versos.",
    "La palabra precisa ennoblece la idea.",
    "La lectura ensancha los horizontes del alma.",
    "Su prosa destila una sutil ironía.",
    "El saber florece en la mente curiosa.",
  ],
};

// R2 — CHAT. Cada conversación tiene un RECEPTOR distinto; en cada turno el
// estudiante elige el mensaje cuyo registro es ADECUADO para esa persona. Las
// opciones incorrectas son graciosas pero inadecuadas (demasiado informales con
// la abuela o el rector; raramente formales con un amigo).
const R2_CHATS = [
  {
    id: "abuela",
    name: "Abuelita Rosa",
    emoji: "👵",
    hint: "Háblale con respeto y cariño.",
    accent: "#ef6f9a",
    turns: [
      { incoming: "¿Cómo estás, mijito?",
        options: [
          { text: "Muy bien, abuelita. ¿Y usted? 🥰", ok: true },
          { text: "Todo piola, wey 😎", ok: false },
        ] },
      { incoming: "Ven a almorzar el domingo.",
        options: [
          { text: "Dale, ahí caigo.", ok: false },
          { text: "Claro que sí, abuelita, ahí estaré.", ok: true },
        ] },
      { incoming: "Te quiero mucho. ❤️",
        options: [
          { text: "Yo también la quiero, abue.", ok: true },
          { text: "Igual full, vieja.", ok: false },
        ] },
    ],
  },
  {
    id: "rector",
    name: "Rector Andrade",
    emoji: "🎓",
    hint: "Usa un registro formal y respetuoso.",
    accent: "#4fa0ff",
    turns: [
      { incoming: "Buenos días, ¿en qué puedo ayudarle?",
        options: [
          { text: "Buenos días. Quisiera solicitar una reunión, por favor.", ok: true },
          { text: "Qué más, profe, ¿todo bien?", ok: false },
        ] },
      { incoming: "¿Cuál es el motivo de su solicitud?",
        options: [
          { text: "Es un bla bla del cole, nada grave.", ok: false },
          { text: "Deseo presentar el proyecto de mi curso.", ok: true },
        ] },
      { incoming: "De acuerdo, le confirmo la cita.",
        options: [
          { text: "Muchas gracias, le agradezco su tiempo.", ok: true },
          { text: "Bacán, gracias causa.", ok: false },
        ] },
    ],
  },
  {
    id: "pana",
    name: "Mateo (tu pana)",
    emoji: "😎",
    hint: "Con un amigo lo natural es un tono cercano.",
    accent: "#f2a73b",
    turns: [
      { incoming: "¡Eeey! ¿Vamos al partido hoy?",
        options: [
          { text: "¡De una! ¿A qué hora caemos?", ok: true },
          { text: "Estimado amigo, acepto su cordial invitación.", ok: false },
        ] },
      { incoming: "Tipo 4, en la cancha.",
        options: [
          { text: "Confirmo mi asistencia a las 16:00 horas.", ok: false },
          { text: "Ahí nos vemos, pana.", ok: true },
        ] },
      { incoming: "Avisa a los demás.",
        options: [
          { text: "Procederé a notificar al resto del grupo.", ok: false },
          { text: "Yo les escribo al toque.", ok: true },
        ] },
    ],
  },
  {
    id: "doctora",
    name: "Dra. Cevallos",
    emoji: "🩺",
    hint: "Con la doctora, sé formal y explícate claro.",
    accent: "#36c2b4",
    turns: [
      { incoming: "Buenas tardes, ¿qué la trae por aquí?",
        options: [
          { text: "Buenas tardes, doctora. Me duele la garganta desde ayer.", ok: true },
          { text: "Hola, me siento full mal, doc.", ok: false },
        ] },
      { incoming: "¿Ha tenido fiebre?",
        options: [
          { text: "Sí pe, un montón anoche.", ok: false },
          { text: "Sí, anoche tuve fiebre alta.", ok: true },
        ] },
      { incoming: "Le voy a recetar un medicamento.",
        options: [
          { text: "Muchas gracias, doctora.", ok: true },
          { text: "Bacán, gracias mismo.", ok: false },
        ] },
    ],
  },
  {
    id: "hermano",
    name: "Dani (tu ñaño)",
    emoji: "🎮",
    hint: "Con tu hermano, un tono cercano y relajado.",
    accent: "#9b8cff",
    turns: [
      { incoming: "¿Jugamos en la tarde?",
        options: [
          { text: "¡De una! Yo pongo la consola.", ok: true },
          { text: "Estimado, acepto su invitación a jugar.", ok: false },
        ] },
      { incoming: "Trae algo de comer.",
        options: [
          { text: "Procederé a adquirir provisiones.", ok: false },
          { text: "Listo, llevo papas.", ok: true },
        ] },
      { incoming: "No le digas a mamá.",
        options: [
          { text: "Tranqui, no digo nada.", ok: true },
          { text: "Mantendré la confidencialidad del asunto.", ok: false },
        ] },
    ],
  },
  {
    id: "vecina",
    name: "Doña Carmen (vecina)",
    emoji: "🧶",
    hint: "Con la vecina mayor, respeto y amabilidad.",
    accent: "#7bbf5a",
    turns: [
      { incoming: "Buenos días, ¿me ayudas con las bolsas?",
        options: [
          { text: "Claro, doña Carmen, yo le ayudo.", ok: true },
          { text: "Ash, ya voy, espérese.", ok: false },
        ] },
      { incoming: "Gracias, eres muy amable.",
        options: [
          { text: "Con gusto, para eso estamos.", ok: true },
          { text: "Full nada, vecina.", ok: false },
        ] },
      { incoming: "Salúdame a tu mamá.",
        options: [
          { text: "Ya pe, le aviso.", ok: false },
          { text: "Le doy su saludo, que esté bien.", ok: true },
        ] },
    ],
  },
  {
    id: "jefa",
    name: "Lic. Torres (jefa)",
    emoji: "💼",
    hint: "Con tu jefa, registro formal y profesional.",
    accent: "#c06bd6",
    turns: [
      { incoming: "¿Terminó el informe?",
        options: [
          { text: "Sí, licenciada, se lo envío enseguida.", ok: true },
          { text: "Ya casi, deme un toque.", ok: false },
        ] },
      { incoming: "Necesito la presentación para mañana.",
        options: [
          { text: "Uf, mañana es full, pero ya veo.", ok: false },
          { text: "De acuerdo, la tendré lista mañana.", ok: true },
        ] },
      { incoming: "Buen trabajo, gracias.",
        options: [
          { text: "Gracias a usted, quedo a sus órdenes.", ok: true },
          { text: "Bacán, jefa, nos vemos.", ok: false },
        ] },
    ],
  },
];

// R3 — REPARAR. Frases con una palabra FUERA DE REGISTRO (coloquial) que debe
// cambiarse por su forma estándar/culta. El estudiante arrastra la palabra
// adecuada a cada hueco. Los señuelos son otras palabras coloquiales.
const R3_BANK = [
  { id: "chance",  wrong: "chance",  right: "posibilidad", pre: "No tengo ",              suf: " de salir hoy." },
  { id: "depre",   wrong: "depre",   right: "deprimido",   pre: "Hoy me siento un poco ", suf: "." },
  { id: "bacan",   wrong: "bacán",   right: "excelente",   pre: "El concierto estuvo ",   suf: "." },
  { id: "full",    wrong: "full",    right: "muy",         pre: "Estoy ",                 suf: " cansado." },
  { id: "pana",    wrong: "pana",    right: "amigo",       pre: "Te presento a mi ",      suf: "." },
  { id: "plata",   wrong: "plata",   right: "dinero",      pre: "Necesito ahorrar ",      suf: "." },
  { id: "man",     wrong: "man",     right: "señor",       pre: "Ese ",                   suf: " es el profesor." },
  { id: "chevere", wrong: "chévere", right: "agradable",   pre: "La reunión fue ",        suf: "." },
  { id: "porfa",   wrong: "porfa",   right: "por favor",   pre: "Ayúdame con esto, ",     suf: "." },
  { id: "finde",   wrong: "finde",   right: "fin de semana", pre: "Nos vemos el ",        suf: "." },
  { id: "depa",    wrong: "depa",    right: "departamento", pre: "Alquilé un ",           suf: " pequeño." },
];
const R3_DECOYS = ["piola", "causa", "ñaño", "vacilón", "bróder"];

// ─────────────────────────────────────────────────────────────
// makeProblem por ronda
// ─────────────────────────────────────────────────────────────
function makeProblemR1() {
  const cards = [];
  for (const niv of R1_NIVELES) {
    const picked = pickFreshSet(R1_BANK[niv.id], "msg-" + niv.id, (x) => x, 2);
    picked.forEach((m) => cards.push({ id: niv.id + ":" + m, text: m, nivel: niv.id }));
  }
  return { cards: shuffle(cards), niveles: R1_NIVELES };
}

function makeProblemR2() {
  const chat = pickFreshSet(R2_CHATS, "chat", (x) => x.id, 1)[0];
  return { chat };
}

function makeProblemR3() {
  const items = pickFreshSet(R3_BANK, "rep", (x) => x.id, 3);
  // Fichas: las 3 palabras correctas + 2 señuelos coloquiales.
  const tiles = items.map((it) => ({ id: "t:" + it.id, text: it.right, forId: it.id }));
  const decoyPool = R3_DECOYS.filter((d) => !items.some((it) => it.wrong === d || it.right === d));
  const decoys = shuffle(decoyPool).slice(0, 2);
  decoys.forEach((d, i) => tiles.push({ id: "d:" + i + ":" + d, text: d, forId: null }));
  return { items, tiles: shuffle(tiles) };
}

// ═════════════════════════════════════════════════════════════
// Shell común: HUD, modales, action rail, feedback, personaje
// ═════════════════════════════════════════════════════════════
function GameEnunciado({ text, top = 82 }) {
  if (!text) return null;
  return (
    <div style={{
      position: "absolute", top, left: "50%", transform: "translateX(-50%)", width: 470,
      textAlign: "center",
      fontFamily: "var(--ed-font-display)", fontWeight: 700,
      fontSize: 17, lineHeight: 1.2,
      color: "#fff",
      textShadow: "0 2px 6px rgba(0,0,0,0.6)",
      pointerEvents: "none", zIndex: 5,
    }}>
      {text}
    </div>
  );
}

function GameHUD({ elapsed, stars, attempted, solved, total = 3 }) {
  return (
    <>
      <div data-qa="hud" style={{
        position: "absolute", top: 10, left: 16, right: 16,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <EdinunLogoMini size={64} />
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

      {/* Indicador de ronda — sin tabs de nivel (juego de 1 solo nivel). */}
      <div style={{
        position: "absolute", top: 54, left: "50%", transform: "translateX(-50%)",
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
    </>
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

function ActionRail({ canVerify, onVerify, hideVerify, showErase, onErase, onRestart, onExit }) {
  return (
    <div data-qa="acciones" style={{
      position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
      display: "flex", flexDirection: "column", gap: 10, width: 148,
    }}>
      {!hideVerify && (
        <button className="ed-btn ed-btn-verify"
          onClick={() => { if (canVerify && onVerify) onVerify(); }}
          disabled={!canVerify}
          style={{
            fontSize: 14, padding: "0 8px", height: 52, fontWeight: 800, letterSpacing: "0.04em",
            opacity: canVerify ? 1 : 0.45, cursor: canVerify ? "pointer" : "not-allowed",
          }}>
          ¡VERIFICAR!
        </button>
      )}
      {showErase && (
        <button className="ed-btn ed-btn-erase" onClick={onErase}
          style={{ fontSize: 14, padding: "0 8px", height: 52, fontWeight: 800, letterSpacing: "0.04em" }}>
          BORRAR
        </button>
      )}
      <button className="ed-btn ed-btn-restart" onClick={onRestart}
        style={{ fontSize: 14, padding: "0 8px", height: 52, fontWeight: 800, letterSpacing: "0.04em" }}>
        REINICIAR
      </button>
      <button className="ed-btn ed-btn-ghost" onClick={onExit}
        style={{ fontSize: 14, padding: "0 8px", height: 52, fontWeight: 800, letterSpacing: "0.04em" }}>
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
            fontWeight: 700, fontSize: "clamp(16px, 2.4vmin, 26px)",
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

// ═════════════════════════════════════════════════════════════
// GameScreen — wrapper que permite REINICIAR remontando el juego.
// ═════════════════════════════════════════════════════════════
function GameScreen({ app, setApp, go }) {
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
        .ed-draggable { touch-action: none; user-select: none; -webkit-user-select: none; }
        @keyframes ed-shake-x {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .ed-needle-g { transition: transform 0.55s cubic-bezier(0.2, 0.85, 0.2, 1); }
      `}</style>
      <RegistroGame key={`registro-${restartTick}`} app={app} setApp={setApp} go={go} onRestart={restart} />
    </>
  );
}

function RegistroGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "Buscando la palabra adecuada";

  const [ronda, setRonda] = useStateG(0);

  // Picks por ronda (una sola vez por montaje).
  const [r1Pick] = useStateG(() => makeProblemR1());
  const [r2Pick] = useStateG(() => makeProblemR2());
  const [r3Pick] = useStateG(() => makeProblemR3());

  // R3 — reparar: {blankId: tileId}
  const [r3Placed, setR3Placed] = useStateG({});
  const [r3Locked, setR3Locked] = useStateG(false);

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

  // ── Estados de completitud por ronda
  const r3AllPlaced = r3Pick.items.every((it) => r3Placed["blank:" + it.id]);

  // R1 (dial) y R2 (chat) se auto-evalúan. R3 (reparar) usa VERIFICAR manual.
  const canVerify = ronda === 2 ? (r3AllPlaced && !r3Locked) : false;

  function handleVerifyR3() {
    if (!r3AllPlaced || r3Locked) return;
    setR3Locked(true);
    const okCount = r3Pick.items.filter((it) => {
      const tid = r3Placed["blank:" + it.id];
      const tile = r3Pick.tiles.find((t) => t.id === tid);
      return tile && tile.forId === it.id;
    }).length;
    const correct = okCount === r3Pick.items.length;
    const u = `${okCount}/${r3Pick.items.length} bien reparadas`;
    setTimeout(() => answer(correct, u, "Cada palabra en su registro", "🔧", "Reparar las palabras fuera de registro", null), correct ? 500 : 4500);
  }

  function handleVerify() {
    if (ronda === 2) handleVerifyR3();
  }

  function handleR1Finish(res) {
    const correct = res.correct >= res.total - 1; // permite 1 fallo entre los 6
    const u = `${res.correct}/${res.total} aciertos`;
    answer(correct, u, "Clasificar el registro de cada mensaje", "🎚️", "Sintoniza el registro del mensaje", null);
  }

  function handleR2Finish(res) {
    const correct = res.correct >= res.total - 1; // permite 1 fallo entre los 3 turnos
    const u = `${res.correct}/${res.total} respuestas adecuadas`;
    answer(correct, u, "Registro adecuado al receptor", "📱", "Chat con la persona correcta", null);
  }

  function handleErase() {
    if (ronda === 2 && !r3Locked) setR3Placed({});
  }

  function answer(isCorrect, userText, correctText, opIcon, reto, note) {
    if (typeof window.markFirstAttempt === "function") window.markFirstAttempt();
    const exerciseSec = Math.max(0, Math.floor((Date.now() - exerciseStart.current) / 1000));
    const earned = calcStars(isCorrect, exerciseSec);
    const newAttempted = attempted + 1;
    const newSolved = solved + (isCorrect ? 1 : 0);
    const newStarsTotal = stars + earned;
    const newStarsSession = starsSession + earned;

    const entry = {
      idx: newAttempted,
      a: reto || correctText, b: userText, op: opIcon || "·",
      correctAnswer: correctText, userAnswer: userText,
      isCorrect, time: exerciseSec, earned,
    };
    const newLog = [...log, entry];

    setFeedback(isCorrect ? "ok" : "err");
    setFeedbackMsg(isCorrect ? `+${earned} ⭐` : ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]);
    setAttempted(newAttempted);
    setSolved(newSolved);
    setStars(newStarsTotal);
    setStarsSession(newStarsSession);
    setLog(newLog);

    const wait = isCorrect ? 1100 : 1600;
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
    }, wait);
  }

  // Enunciado = QUÉ hacer (la tarea). Bocadillo = CÓMO (la mecánica).
  const enunciado =
    ronda === 0 ? "Clasifica cada mensaje según su registro." :
    ronda === 1 ? "Responde a cada persona con el registro adecuado." :
    "Cambia las palabras fuera de lugar por la forma adecuada.";
  const bocadillo =
    ronda === 0 ? "Toca una opción\n(coloquial, estándar\no culto) y la aguja\nse moverá." :
    ronda === 1 ? "Piensa con quién\nhablas y toca la\nmejor respuesta." :
    "Arrastra cada palabra\nadecuada a su hueco.";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <GameHUD elapsed={elapsed} stars={stars} attempted={attempted} solved={solved} total={3} />
      <CharacterCorner char={char} message={bocadillo} />
      <GameEnunciado text={enunciado} top={104} />

      {ronda === 0 && (
        <RegistroDial pick={r1Pick} onFinish={handleR1Finish} />
      )}

      {ronda === 1 && (
        <ChatSim pick={r2Pick} onFinish={handleR2Finish} />
      )}

      {ronda === 2 && (
        <ReparadorBoard
          pick={r3Pick}
          placed={r3Placed}
          setPlaced={setR3Placed}
          locked={r3Locked}
        />
      )}

      <ActionRail
        canVerify={canVerify}
        onVerify={handleVerify}
        hideVerify={ronda !== 2}
        showErase={ronda === 2}
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
// R1 · Sintoniza el mensaje (DIAL, §13). Aparece un mensaje y el dial de 3
// posiciones (coloquial · estándar · culto). El estudiante toca una posición
// → la aguja gira hacia ella. Al acertar: breve verde y avanza. Al fallar:
// marca la elegida en rojo, revela la correcta en verde y AVANZA solo.
// Auto-evaluado: al terminar las 6 tarjetas llama onFinish({correct,total}).
// ─────────────────────────────────────────────────────────────
function RegistroDial({ pick, onFinish }) {
  const cards = pick.cards;
  const niveles = pick.niveles;
  const [idx, setIdx] = useStateG(0);
  const [chosen, setChosen] = useStateG(null);
  const [locked, setLocked] = useStateG(false);
  const correctRef = useRefG(0);
  const doneRef = useRefG(false);

  const card = cards[idx];
  const chosenNivel = niveles.find((n) => n.id === chosen);
  // La aguja apunta a lo elegido; si no hay elección aún, descansa en el centro.
  const needleAngle = chosenNivel ? chosenNivel.needle : 0;

  function choose(nivId) {
    if (locked) return;
    setChosen(nivId);
    setLocked(true);
    const ok = nivId === card.nivel;
    if (ok) correctRef.current += 1;
    const wait = ok ? 750 : 1350;
    setTimeout(() => {
      if (idx + 1 >= cards.length) {
        if (doneRef.current) return;
        doneRef.current = true;
        onFinish({ correct: correctRef.current, total: cards.length });
      } else {
        setIdx((i) => i + 1);
        setChosen(null);
        setLocked(false);
      }
    }, wait);
  }

  // Geometría del dial (pie de 3 sectores en semicírculo).
  const CX = 100, CY = 104, R = 82;
  const sectorPaths = [
    { id: "coloq",    d: `M${CX},${CY} L18,104 A${R},${R} 0 0,1 59,33 Z`,  lx: 55,  ly: 80 },
    { id: "estandar", d: `M${CX},${CY} L59,33 A${R},${R} 0 0,1 141,33 Z`,  lx: 100, ly: 56 },
    { id: "culto",    d: `M${CX},${CY} L141,33 A${R},${R} 0 0,1 182,104 Z`, lx: 145, ly: 80 },
  ];

  return (
    <div data-qa="zona-central" style={{
      position: "absolute", top: 148, bottom: 16, left: "50%", transform: "translateX(-50%)",
      width: 440, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", gap: 12,
    }}>
      {/* Progreso */}
      <div style={{
        fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 13,
        color: "rgba(252,233,168,0.85)", letterSpacing: "0.04em",
      }}>
        Mensaje {idx + 1} de {cards.length}
      </div>

      {/* Carta con el mensaje */}
      <div key={card.id} style={{
        width: "fit-content", maxWidth: 400, padding: "14px 24px", borderRadius: 16,
        background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(238,246,244,0.94))",
        border: "3px solid #f2c260",
        boxShadow: "0 10px 24px rgba(0,0,0,0.4)",
        textAlign: "center",
        animation: "ed-pop-in 0.25s",
      }}>
        <div style={{
          fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 21, lineHeight: 1.2,
          color: "#15303a", fontStyle: "italic",
        }}>
          «{card.text}»
        </div>
      </div>

      {/* Dial */}
      <svg viewBox="0 0 200 128" width={232} height={148} style={{ overflow: "visible" }}>
        {sectorPaths.map((sp) => {
          const niv = niveles.find((n) => n.id === sp.id);
          const isChosen = chosen === sp.id;
          const isAnswer = locked && sp.id === card.nivel;
          const isWrong = locked && isChosen && sp.id !== card.nivel;
          let fill = niv.color, op = 0.22, stroke = niv.color, sw = 1.5;
          if (isAnswer) { op = 0.92; sw = 2.5; }
          else if (isWrong) { fill = "#ff6b6b"; op = 0.85; stroke = "#ff6b6b"; sw = 2.5; }
          else if (isChosen) { op = 0.55; sw = 2.5; }
          return (
            <g key={sp.id}>
              <path d={sp.d} fill={fill} fillOpacity={op} stroke={stroke} strokeWidth={sw} strokeOpacity={0.9} />
              <text x={sp.lx} y={sp.ly} textAnchor="middle" fontSize="17"
                style={{ pointerEvents: "none" }}>{niv.emoji}</text>
            </g>
          );
        })}
        {/* Aguja */}
        <g className="ed-needle-g" style={{ transform: `rotate(${needleAngle}deg)`, transformOrigin: `${CX}px ${CY}px` }}>
          <line x1={CX} y1={CY} x2={CX} y2={CY - 72} stroke="#15303a" strokeWidth={4} strokeLinecap="round" />
          <polygon points={`${CX-5},${CY-66} ${CX+5},${CY-66} ${CX},${CY-80}`} fill="#15303a" />
        </g>
        <circle cx={CX} cy={CY} r={9} fill="#15303a" stroke="#fce9a8" strokeWidth={2.5} />
      </svg>

      {/* Botones de nivel (sintonizar) */}
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", width: "100%" }}>
        {niveles.map((n) => {
          const isChosen = chosen === n.id;
          const isAnswer = locked && n.id === card.nivel;
          const isWrongPick = locked && isChosen && n.id !== card.nivel;
          let bg, ink, border, shake = false;
          if (isAnswer) { bg = "linear-gradient(180deg,#2ecc8f,#22a06c)"; ink = "#fff"; border = "#2ecc8f"; }
          else if (isWrongPick) { bg = "linear-gradient(180deg,#ff6b6b,#dc5050)"; ink = "#fff"; border = "#ff6b6b"; shake = true; }
          else { bg = "rgba(255,255,255,0.95)"; ink = "#15303a"; border = "rgba(116,72,32,0.25)"; }
          return (
            <button key={n.id} onClick={() => choose(n.id)} disabled={locked}
              style={{
                position: "relative", flex: "1 1 120px", maxWidth: 140, minHeight: 52,
                padding: "8px 10px", borderRadius: 14,
                border: `2.5px solid ${border}`, background: bg, color: ink,
                cursor: locked ? "default" : "pointer",
                fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 15, lineHeight: 1.1,
                boxShadow: "0 4px 10px rgba(0,0,0,0.28)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                transition: "all 0.14s ease",
                animation: shake ? "ed-shake-x 0.4s" : "none",
              }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>{n.emoji}</span>
              <span>{n.label}</span>
              {isAnswer && (
                <span style={{
                  position: "absolute", top: -10, right: -10, width: 26, height: 26, borderRadius: "50%",
                  background: "#2ecc8f", color: "#fff", fontSize: 16, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "2.5px solid #fff", boxShadow: "0 2px 8px rgba(0,0,0,0.45)",
                  animation: "ed-pop-in 0.3s",
                }}>✓</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// R2 · Chat correcto (SIMULADOR, ronda estrella). Pantalla de celular: el
// receptor escribe (globo izquierdo) y el estudiante elige una de 2 respuestas
// (globos candidatos). La adecuada respeta el registro del receptor; la otra
// es graciosa pero inadecuada. Feedback verde/rojo por turno (§11): al fallar,
// se marca la elegida en rojo y la correcta en verde, y la conversación
// continúa con el mensaje adecuado. Auto-evaluado: al cerrar la conversación
// llama onFinish({correct,total}).
// ─────────────────────────────────────────────────────────────
function ChatSim({ pick, onFinish }) {
  const chat = pick.chat;
  const turns = chat.turns;
  const [turnIdx, setTurnIdx] = useStateG(0);
  const [chosen, setChosen] = useStateG(null);
  const [locked, setLocked] = useStateG(false);
  const [thread, setThread] = useStateG(() => [{ side: "in", text: turns[0].incoming }]);
  const correctRef = useRefG(0);
  const doneRef = useRefG(false);
  const bodyRef = useRefG(null);

  const turn = turns[turnIdx];

  useEffectG(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread, turnIdx, chosen]);

  function choose(optIdx) {
    if (locked) return;
    const opt = turn.options[optIdx];
    setChosen(optIdx);
    setLocked(true);
    if (opt.ok) correctRef.current += 1;
    const correctOpt = turn.options.find((o) => o.ok);
    const wait = opt.ok ? 850 : 1500;
    setTimeout(() => {
      // La conversación avanza con la respuesta ADECUADA (coherencia narrativa).
      setThread((t) => {
        const next = [...t, { side: "out", text: correctOpt.text }];
        if (turnIdx + 1 < turns.length) next.push({ side: "in", text: turns[turnIdx + 1].incoming });
        return next;
      });
      if (turnIdx + 1 >= turns.length) {
        if (doneRef.current) return;
        doneRef.current = true;
        onFinish({ correct: correctRef.current, total: turns.length });
      } else {
        setTurnIdx((i) => i + 1);
        setChosen(null);
        setLocked(false);
      }
    }, wait);
  }

  return (
    <div data-qa="zona-central" style={{
      position: "absolute", top: 146, bottom: 14, left: "50%", transform: "translateX(-50%)",
      width: 360, display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      {/* Marco de celular */}
      <div style={{
        width: 320, height: "100%", maxHeight: 372,
        background: "#0e2a24", borderRadius: 26, padding: 7,
        border: "3px solid #15403a", boxShadow: "0 14px 30px rgba(0,0,0,0.5)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Cabecera del chat */}
        <div style={{
          display: "flex", alignItems: "center", gap: 9, padding: "8px 12px",
          background: chat.accent, borderRadius: "20px 20px 8px 8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.85)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
            flexShrink: 0,
          }}>{chat.emoji}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 14, color: "#fff", lineHeight: 1.1 }}>
              {chat.name}
            </div>
            <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 10.5, color: "rgba(255,255,255,0.92)", lineHeight: 1.15 }}>
              {chat.hint}
            </div>
          </div>
        </div>

        {/* Cuerpo del chat */}
        <div ref={bodyRef} style={{
          flex: 1, overflowY: "auto", padding: "10px 10px 4px",
          display: "flex", flexDirection: "column", gap: 7,
          background: "linear-gradient(180deg, rgba(20,60,52,0.55), rgba(12,40,34,0.75))",
        }}>
          {thread.map((b, i) => (
            <div key={i} style={{
              alignSelf: b.side === "in" ? "flex-start" : "flex-end",
              maxWidth: "82%",
              background: b.side === "in" ? "rgba(255,255,255,0.95)" : "linear-gradient(180deg,#bdf5c8,#8fe6a6)",
              color: "#15303a",
              borderRadius: b.side === "in" ? "4px 14px 14px 14px" : "14px 4px 14px 14px",
              padding: "7px 11px",
              fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 13, lineHeight: 1.25,
              boxShadow: "0 2px 5px rgba(0,0,0,0.25)",
            }}>
              {b.text}
            </div>
          ))}
        </div>

        {/* Opciones candidatas */}
        <div style={{ padding: "8px 9px 9px", display: "flex", flexDirection: "column", gap: 7, background: "rgba(8,30,26,0.9)" }}>
          {turn.options.map((opt, i) => {
            const isChosen = chosen === i;
            const isAnswer = locked && opt.ok;
            const isWrongPick = locked && isChosen && !opt.ok;
            let bg, ink, border, shake = false;
            if (isAnswer) { bg = "linear-gradient(180deg,#2ecc8f,#22a06c)"; ink = "#fff"; border = "#2ecc8f"; }
            else if (isWrongPick) { bg = "linear-gradient(180deg,#ff6b6b,#dc5050)"; ink = "#fff"; border = "#ff6b6b"; shake = true; }
            else { bg = "rgba(255,255,255,0.95)"; ink = "#15303a"; border = "rgba(116,72,32,0.25)"; }
            return (
              <button key={i} onClick={() => choose(i)} disabled={locked}
                style={{
                  position: "relative", width: "100%", textAlign: "left",
                  padding: "8px 12px", borderRadius: 12,
                  border: `2px solid ${border}`, background: bg, color: ink,
                  cursor: locked ? "default" : "pointer",
                  fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 12.5, lineHeight: 1.25,
                  boxShadow: "0 3px 7px rgba(0,0,0,0.3)",
                  transition: "all 0.14s ease",
                  animation: shake ? "ed-shake-x 0.4s" : "none",
                }}>
                {opt.text}
                {isAnswer && (
                  <span style={{
                    position: "absolute", top: -9, right: -9, width: 24, height: 24, borderRadius: "50%",
                    background: "#2ecc8f", color: "#fff", fontSize: 14, fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: "2.5px solid #fff", boxShadow: "0 2px 8px rgba(0,0,0,0.45)",
                    animation: "ed-pop-in 0.3s",
                  }}>✓</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// R3 · Reparador de mensajes (ARRASTRE). 3 frases con una palabra coloquial
// (mostrada tachada) y un hueco. Bandeja con las 3 palabras adecuadas + 2
// señuelos coloquiales. El estudiante arrastra (o toca y suelta) la palabra
// correcta a cada hueco. VERIFICAR manual; al fallar, cada hueco se marca
// verde/rojo y se revela la palabra correcta (§11).
// ─────────────────────────────────────────────────────────────
function ReparadorBoard({ pick, placed, setPlaced, locked }) {
  const items = pick.items;
  const tiles = pick.tiles;
  const [selected, setSelected] = useStateG(null);
  const TRAY = "__trayReparador";

  const tileById = (id) => tiles.find((t) => t.id === id);

  function placeZone(zoneId, tileId) {
    if (locked) return;
    setSelected(null);
    setPlaced((prev) => {
      const next = { ...prev };
      // Quitar la ficha de cualquier hueco previo.
      for (const k of Object.keys(next)) { if (next[k] === tileId) delete next[k]; }
      if (zoneId === TRAY) return next;
      if (!zoneId.startsWith("blank:")) return next;
      next[zoneId] = tileId;
      return next;
    });
  }
  function tapTile(tileId) {
    if (locked) return;
    // Si está colocada, al tocarla vuelve a la bandeja.
    const inBlank = Object.keys(placed).find((k) => placed[k] === tileId);
    if (inBlank) { setPlaced((prev) => { const n = { ...prev }; delete n[inBlank]; return n; }); setSelected(null); return; }
    setSelected((s) => (s === tileId ? null : tileId));
  }
  function tapBlank(blankId) {
    if (locked || !selected) return;
    placeZone(blankId, selected);
  }

  const placedTileIds = new Set(Object.values(placed));
  const trayTiles = tiles.filter((t) => !placedTileIds.has(t.id));

  const ghost = (text) => `<div style="background:linear-gradient(180deg,#fce9a8,#e9c45a);color:#3a2608;padding:8px 14px;border-radius:12px;font-family:Fredoka,Nunito,sans-serif;font-weight:800;font-size:15px;border:2px solid #4fd8ff;box-shadow:0 8px 20px rgba(0,0,0,0.5);text-align:center;">${text}</div>`;

  return (
    <div data-qa="zona-central" style={{
      position: "absolute", top: 146, bottom: 12, left: "50%", transform: "translateX(-50%)",
      width: 440, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 22,
    }}>
      {/* Frases con hueco */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", alignItems: "center" }}>
        {items.map((it) => {
          const blankId = "blank:" + it.id;
          const tileId = placed[blankId];
          const tile = tileId ? tileById(tileId) : null;
          const ok = locked && tile && tile.forId === it.id;
          const wrong = locked && tile && tile.forId !== it.id;
          let blankBg = "rgba(255,255,255,0.16)", blankBorder = "rgba(252,233,168,0.6)";
          if (ok) { blankBg = "linear-gradient(180deg,#2ecc8f,#22a06c)"; blankBorder = "#2ecc8f"; }
          else if (wrong) { blankBg = "linear-gradient(180deg,#ff6b6b,#dc5050)"; blankBorder = "#ff6b6b"; }
          else if (tile) { blankBg = "rgba(255,255,255,0.95)"; blankBorder = "#4fd8ff"; }
          return (
            <div key={it.id} style={{
              width: "fit-content", maxWidth: 420, padding: "13px 16px", borderRadius: 13,
              background: "rgba(8,40,38,0.5)", border: "1.5px solid rgba(95,224,208,0.35)",
              display: "flex", alignItems: "center", flexWrap: "wrap", justifyContent: "center", gap: 4,
              fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 16, color: "#fff", lineHeight: 1.5,
            }}>
              <span>{it.pre}</span>
              <span data-dropzone={blankId} onClick={() => tapBlank(blankId)}
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  minWidth: 96, minHeight: 30, padding: "2px 10px", margin: "0 2px",
                  borderRadius: 9, border: `2px dashed ${blankBorder}`, background: blankBg,
                  color: tile ? (ok || wrong ? "#fff" : "#15303a") : "rgba(252,233,168,0.85)",
                  cursor: (selected && !locked) ? "pointer" : "default",
                  verticalAlign: "middle",
                }}>
                {tile ? (
                  <span
                    className={locked ? "" : "ed-draggable"}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={locked ? undefined : makeDragHandler({
                      item: tile.id, disabled: locked, ghostHtml: ghost(tile.text),
                      onTap: tapTile, onDrop: placeZone,
                    })}
                    style={{ fontWeight: 800, cursor: locked ? "default" : "grab", touchAction: "none" }}>
                    {locked ? (ok ? "✓ " : "✗ ") : ""}{tile.text}
                  </span>
                ) : (
                  <span style={{ fontSize: 12, fontStyle: "italic", opacity: 0.75 }}>
                    arrastra aquí
                  </span>
                )}
              </span>
              <span>{it.suf}</span>
              {/* Pista: palabra coloquial original tachada */}
              <span style={{
                marginLeft: 6, fontSize: 12, fontWeight: 700, color: "#ffb4b4",
                textDecoration: "line-through", opacity: 0.85,
              }}>{it.wrong}</span>
              {wrong && (
                <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 800, color: "#7dffc4" }}>
                  → {it.right}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Bandeja de palabras */}
      <div data-dropzone={TRAY} data-qa="bandeja" style={{
        display: "flex", gap: 9, flexWrap: "wrap", justifyContent: "center", alignItems: "center",
        minHeight: 60, width: 420, borderRadius: 12, padding: "13px 10px",
        background: "rgba(8,40,38,0.3)", border: "1.5px dashed rgba(95,224,208,0.4)",
      }}>
        {trayTiles.map((t) => {
          const sel = selected === t.id;
          return (
            <div key={t.id}
              className={locked ? "" : "ed-draggable"}
              onPointerDown={locked ? undefined : makeDragHandler({
                item: t.id, disabled: locked, ghostHtml: ghost(t.text),
                onTap: tapTile, onDrop: placeZone,
              })}
              style={{
                padding: "8px 16px", borderRadius: 11, textAlign: "center",
                background: sel ? "linear-gradient(180deg,#fce9a8,#e9c45a)" : "rgba(255,255,255,0.94)",
                color: "#3a2608", border: `2px solid ${sel ? "#4fd8ff" : "rgba(116,72,32,0.25)"}`,
                boxShadow: sel ? "0 0 16px rgba(79,216,255,0.6)" : "0 3px 8px rgba(0,0,0,0.25)",
                transform: sel ? "translateY(-2px)" : "none",
                fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 16, lineHeight: 1.2,
                cursor: "grab", touchAction: "none",
                transition: "all 0.15s ease",
              }}>
              {t.text}
            </div>
          );
        })}
        {trayTiles.length === 0 && (
          <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.7)", pointerEvents: "none" }}>
            ¡Listo! Pulsa VERIFICAR.
          </div>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// RESULTS — Reporte académico imprimible (estructura estándar).
// ═════════════════════════════════════════════════════════════
function formatOp(e) {
  return `${e.op || "·"}  ${String(e.a).slice(0, 30)}`;
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
          <div style={printStyles.field}><div style={printStyles.fieldL}>Estudiante</div><div style={printStyles.fieldV}>{studentName || "—"}</div></div>
          <div style={printStyles.field}><div style={printStyles.fieldL}>Categoría</div><div style={printStyles.fieldV}>{res.category || "—"}</div></div>
          <div style={printStyles.field}><div style={printStyles.fieldL}>Tiempo total</div><div style={printStyles.fieldV}>{String(m).padStart(2,"0")}:{String(s).padStart(2,"0")}</div></div>
        </div>
        <table style={printStyles.table}>
          <thead>
            <tr style={printStyles.thHead}>
              <th style={printStyles.th}>#</th>
              <th style={printStyles.th}>Reto</th>
              <th style={{ ...printStyles.th, ...printStyles.thR }}>Tu respuesta</th>
              <th style={{ ...printStyles.th, ...printStyles.thR }}>Respuesta correcta</th>
              <th style={{ ...printStyles.th, ...printStyles.thC }}>Estado</th>
              <th style={{ ...printStyles.th, ...printStyles.thR }}>Tiempo</th>
            </tr>
          </thead>
          <tbody>
            {log.map((e) => (
              <tr key={e.idx} style={printStyles.tr}>
                <td style={{ ...printStyles.td, ...printStyles.tdNum }}>{e.idx}</td>
                <td style={{ ...printStyles.td, ...printStyles.tdOp }}>{e.op || ""} {String(e.a).slice(0, 30)}</td>
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
  const res = app.lastResult || { category: "Buscando la palabra adecuada", solved: 0, total: 3, time: 0, starsEarned: 0, log: [] };
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
            fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 36,
            background: "linear-gradient(180deg, #fce9a8, #d9a441)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            lineHeight: 1, marginBottom: 4, textAlign: "center",
          }}>¡Ronda completa!</div>
          <char.Component size={180} />
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
                  color: "var(--ed-ink-dim)", borderBottom: "1px solid rgba(148,120,255,0.3)",
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
      <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: emphasis ? 22 : 18, color: tone, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}

Object.assign(window, { GameScreen, ResultsScreen });
