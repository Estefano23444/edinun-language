// game-screens.jsx — GameScreen + ResultsScreen para JUEGO-11
// "Mi refrán refranero" (TEMA 3 del libro EDINUN, 7 años). 1 nivel, 3 rondas
// con mecánicas DISTINTAS (estándar 7+ años):
//   R1 — Laboratorio de palabras: combinar 2 sílabas en la probeta.
//   R2 — Atrapa y clasifica: arrastrar palabras al frasco de su grupo.
//   R3 — Detective de refranes: marcar con la lupa las palabras con grupo.
//
// El shell (HUD, personaje, enunciado, action rail, modales, feedback,
// reporte académico, scoring por tiempo) se hereda del estándar (igual que
// juego-8). Solo cambian los bancos de datos y las 3 Cards de mecánica.

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
  "¡Casi! Sigue intentándolo.",
  "Los refranes tienen su truco 📖",
  "¡La próxima es tuya!",
  "Equivocarse también es aprender.",
  "Las palabras son una aventura.",
  "¡Vamos a la siguiente!",
  "Cada error te acerca al acierto.",
];

// ─────────────────────────────────────────────────────────────
// FIFO anti-repetición por categoría (lab / clas / det) en un solo
// key de localStorage. Cada sesión empuja 3 entradas; límite alto
// para retener varias sesiones y no repetir consecutivo.
// ─────────────────────────────────────────────────────────────
const RECENT_KEY = "edinun_juego11_recientes_v1";
const RECENT_LIMIT = 24;

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

// ═════════════════════════════════════════════════════════════
// BANCOS DE DATOS
// ═════════════════════════════════════════════════════════════

// R1 — Laboratorio: palabras con grupo consonántico en la 1ª sílaba.
// Mezcla de 2 y 3 sílabas (la probeta muestra tantas casillas como sílabas).
// Todo en minúsculas y sin tildes (regla de "completar palabra").
const R1_BANK = [
  // 2 sílabas
  { word: "plato",  syll: ["pla", "to"],  emoji: "🍽️", hint: "Donde te sirven la comida." },
  { word: "prado",  syll: ["pra", "do"],  emoji: "🌳", hint: "Campo verde lleno de hierba." },
  { word: "fresa",  syll: ["fre", "sa"],  emoji: "🍓", hint: "Fruta roja y dulce." },
  { word: "grano",  syll: ["gra", "no"],  emoji: "🌾", hint: "Semillita del trigo o el maíz." },
  { word: "brazo",  syll: ["bra", "zo"],  emoji: "💪", hint: "Con él das un abrazo." },
  { word: "globo",  syll: ["glo", "bo"],  emoji: "🎈", hint: "Se infla y sale volando." },
  { word: "blusa",  syll: ["blu", "sa"],  emoji: "👚", hint: "Prenda para la parte de arriba." },
  { word: "bloque", syll: ["blo", "que"], emoji: "🧱", hint: "Pieza grande para construir o armar." },
  { word: "flecha", syll: ["fle", "cha"], emoji: "🏹", hint: "La disparas con el arco." },
  { word: "fruta",  syll: ["fru", "ta"],  emoji: "🍎", hint: "Alimento dulce que da el árbol.", avoid: ["to"] }, // "to" formaría "fruto" (también válido)
  { word: "trono",  syll: ["tro", "no"],  emoji: "🪑", hint: "La silla del rey." },
  { word: "pluma",  syll: ["plu", "ma"],  emoji: "🪶", hint: "Cae suave del ave." },
  { word: "crema",  syll: ["cre", "ma"],  emoji: "🍦", hint: "Suave y dulce para el postre." },
  { word: "grillo", syll: ["gri", "llo"], emoji: "🦗", hint: "Insecto que canta de noche." },
  { word: "broche", syll: ["bro", "che"], emoji: "🧷", hint: "Sujeta o adorna la ropa." },
  { word: "plaza",  syll: ["pla", "za"],  emoji: "🏛️", hint: "Lugar abierto del pueblo." },
  // 3 sílabas
  { word: "trompeta", syll: ["trom", "pe", "ta"], emoji: "🎺", hint: "Instrumento dorado que suena fuerte." },
  { word: "princesa", syll: ["prin", "ce", "sa"], emoji: "👸", hint: "La hija de un rey." },
  { word: "profesor", syll: ["pro", "fe", "sor"], emoji: "👨‍🏫", hint: "Enseña en la escuela." },
  { word: "planeta",  syll: ["pla", "ne", "ta"],  emoji: "🪐", hint: "Mundo que gira en el espacio." },
  { word: "granjero", syll: ["gran", "je", "ro"], emoji: "👨‍🌾", hint: "Cuida los animales de la granja." },
  { word: "granizo",  syll: ["gra", "ni", "zo"],  emoji: "🌨️", hint: "Bolitas de hielo que caen del cielo." },
  { word: "crayones", syll: ["cra", "yo", "nes"], emoji: "🖍️", hint: "Sirven para pintar y colorear." },
  { word: "frutilla", syll: ["fru", "ti", "lla"], emoji: "🍓", hint: "Fruta roja, dulce y pequeña." },
];
const R1_SYLL_POOL = (() => {
  const s = new Set();
  for (const w of R1_BANK) { for (const x of w.syll) s.add(x); }
  return [...s];
})();

// R2 — Clasificar: dos juegos de 4 frascos (grupos con R y grupos con L).
// Cada palabra contiene SOLO uno de los grupos de su set → validación limpia.
const R2_SETS = [
  {
    id: "setR",
    bins: ["tr", "pr", "br", "fr"],
    words: {
      tr: ["tractor", "letra", "potro", "cuatro"],
      pr: ["primo", "premio", "prado", "aprender"],
      br: ["brazo", "cabra", "libro", "sombra"],
      fr: ["fresa", "frente", "cofre", "fruta"],
    },
  },
  {
    id: "setL",
    bins: ["pl", "bl", "cl", "fl"],
    words: {
      pl: ["plato", "pluma", "playa", "plaza"],
      bl: ["blusa", "bloque", "tabla", "blanco"],
      cl: ["clavo", "clase", "tecla", "chicle"],
      fl: ["flor", "flecha", "flan", "flauta"],
    },
  },
];
const BIN_COLOR = {
  tr: "#ef5a5a", pr: "#4fa0ff", br: "#2ecc8f", fr: "#f2a73b",
  pl: "#ef5a5a", bl: "#4fa0ff", cl: "#2ecc8f", fl: "#f2a73b",
};

// R3 — Memoria de parejas: imagen (emoji) ↔ palabra con grupo consonántico.
// Emojis claros y distintos; palabras conocidas por un niño de 7 años.
const MEMORY_BANK = [
  { word: "globo",    emoji: "🎈" },
  { word: "flecha",   emoji: "🏹" },
  { word: "fresa",    emoji: "🍓" },
  { word: "plato",    emoji: "🍽️" },
  { word: "pluma",    emoji: "🪶" },
  { word: "brazo",    emoji: "💪" },
  { word: "grillo",   emoji: "🦗" },
  { word: "trompeta", emoji: "🎺" },
  { word: "tractor",  emoji: "🚜" },
  { word: "regla",    emoji: "📏" },
  { word: "flan",     emoji: "🍮" },
  { word: "flor",     emoji: "🌻" },
  { word: "bloque",   emoji: "🧱" },
  { word: "princesa", emoji: "👸" },
];

// ─────────────────────────────────────────────────────────────
// makeProblem por ronda
// ─────────────────────────────────────────────────────────────
function pickFresh(bank, prefix, idOf) {
  const recent = new Set(getRecent());
  let pool = bank.filter((b) => !recent.has(prefix + ":" + idOf(b)));
  if (pool.length === 0) pool = bank;
  const p = pool[Math.floor(Math.random() * pool.length)];
  pushRecent(prefix + ":" + idOf(p));
  return p;
}

function makeProblemR1() {
  const pick = pickFresh(R1_BANK, "lab", (w) => w.word);
  const n = pick.syll.length;
  // Excluye las propias sílabas y las del `avoid` (sílabas que formarían otra
  // palabra válida con el mismo prefijo, p. ej. "to" → fru+to = "fruto").
  const avoid = pick.avoid || [];
  const distract = shuffle(R1_SYLL_POOL.filter((s) => !pick.syll.includes(s) && !avoid.includes(s))).slice(0, Math.max(2, 6 - n));
  const tray = shuffle([...pick.syll, ...distract]);
  return { word: pick.word, emoji: pick.emoji, hint: pick.hint, syll: pick.syll, tray };
}

function makeProblemR2() {
  const set = pickFresh(R2_SETS, "clas", (s) => s.id);
  const bins = set.bins;
  // 1 palabra por frasco (garantiza cobertura) + 2 extra → 6 chips.
  const chosen = [];
  const wordGroup = {};
  for (const b of bins) {
    const w = shuffle(set.words[b])[0];
    chosen.push(w); wordGroup[w] = b;
  }
  let extras = 0;
  const allPairs = shuffle(bins.flatMap((b) => set.words[b].map((w) => ({ w, b }))));
  for (const { w, b } of allPairs) {
    if (extras >= 2) break;
    if (!wordGroup[w]) { chosen.push(w); wordGroup[w] = b; extras++; }
  }
  return { bins, words: shuffle(chosen), wordGroup };
}

function makeProblemR3() {
  // 4 parejas frescas (FIFO por palabra) → 8 cartas (imagen + palabra).
  // 4 parejas es lo apropiado para 7 años; 6 saturaba el tablero.
  const recent = new Set(getRecent());
  let pool = MEMORY_BANK.filter((w) => !recent.has("mem:" + w.word));
  if (pool.length < 4) pool = MEMORY_BANK;
  const picks = shuffle(pool).slice(0, 4);
  for (const p of picks) pushRecent("mem:" + p.word);
  const cards = [];
  picks.forEach((p, i) => {
    cards.push({ pairId: i, kind: "emoji", content: p.emoji, word: p.word });
    cards.push({ pairId: i, kind: "word", content: p.word, word: p.word });
  });
  return { pairs: picks.length, cards: shuffle(cards) };
}

// ═════════════════════════════════════════════════════════════
// Shell común: HUD, modales, action rail, feedback, personaje
// ═════════════════════════════════════════════════════════════
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

function GameHUD({ elapsed, stars, attempted, solved, total = 3 }) {
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
          fontSize: 14, padding: "0 8px", height: 52, fontWeight: 800, letterSpacing: "0.04em",
          opacity: canVerify ? 1 : 0.45, cursor: canVerify ? "pointer" : "not-allowed",
        }}>
        ¡VERIFICAR!
      </button>
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
    <div data-qa="personaje" className="ed-float-soft" style={{
      position: "absolute", left: 8, bottom: 90, width: 220,
      pointerEvents: "none", textAlign: "center",
    }}>
      <div data-qa="bocadillo" style={{
        position: "absolute", left: 0, right: 0, bottom: "100%",
        display: "flex", justifyContent: "center",
        pointerEvents: "none",
      }}>
        <div style={{
          position: "relative",
          width: "fit-content",
          maxWidth: 200,
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
        <char.Component size={190} floating={false} />
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
      `}</style>
      <RefranesGame key={`ref-${restartTick}`} app={app} setApp={setApp} go={go} onRestart={restart} />
    </>
  );
}

function RefranesGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "Grupos consonánticos";

  const [ronda, setRonda] = useStateG(0);

  // Picks por ronda (una sola vez por montaje).
  const [r1Pick] = useStateG(() => makeProblemR1());
  const [r2Pick] = useStateG(() => makeProblemR2());
  const [r3Pick] = useStateG(() => makeProblemR3());

  // R1 — slots = un trayIdx|null por cada sílaba de la palabra (2 o 3).
  const [r1Slots, setR1Slots] = useStateG(() => r1Pick.syll.map(() => null));
  const [r1Locked, setR1Locked] = useStateG(false);

  // R2 — placed = { word: binGroup }, selected = word|null
  const [r2Placed, setR2Placed] = useStateG({});
  const [r2Selected, setR2Selected] = useStateG(null);
  const [r2Locked, setR2Locked] = useStateG(false);

  // R3 — Memoria: el tablero se autogestiona; r3Done al completar las parejas.
  const [r3Done, setR3Done] = useStateG(false);
  const [r3Errors, setR3Errors] = useStateG(0);
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
  const r1Filled = r1Slots.length > 0 && r1Slots.every((s) => s !== null);
  const r2AllPlaced = r2Pick.words.every((w) => r2Placed[w]);

  const canVerify =
    ronda === 0 ? (r1Filled && !r1Locked) :
    ronda === 1 ? (r2AllPlaced && !r2Locked) :
    ronda === 2 ? (r3Done && !r3Locked) :
    false;

  function handleVerify() {
    if (!canVerify) return;
    if (ronda === 0) {
      setR1Locked(true);
      const formed = r1Slots.map((i) => r1Pick.tray[i]).join("");
      const correct = formed === r1Pick.word;
      setTimeout(() => answer(correct, formed, r1Pick.word, "🧪"), 380);
    } else if (ronda === 1) {
      setR2Locked(true);
      let correct = true;
      for (const w of r2Pick.words) {
        if (r2Placed[w] !== r2Pick.wordGroup[w]) { correct = false; break; }
      }
      const userText = r2Pick.words.map((w) => `${w}→${r2Placed[w] || "?"}`).join(" · ");
      const correctText = r2Pick.words.map((w) => `${w}→${r2Pick.wordGroup[w]}`).join(" · ");
      setTimeout(() => answer(correct, userText, correctText, "🧴"), 380);
    } else if (ronda === 2) {
      setR3Locked(true);
      // Memoria: completar el tablero = ronda lograda. Las estrellas bajan con
      // el tiempo (más fallos → más tiempo → menos estrellas).
      const userText = `${r3Pick.pairs} parejas · ${r3Errors} ${r3Errors === 1 ? "fallo" : "fallos"}`;
      setTimeout(() => answer(true, userText, `${r3Pick.pairs} parejas`, "🧠"), 380);
    }
  }

  function handleErase() {
    if (ronda === 0) { if (r1Locked) return; setR1Slots(r1Pick.syll.map(() => null)); }
    else if (ronda === 1) { if (r2Locked) return; setR2Placed({}); setR2Selected(null); }
    else if (ronda === 2) { /* en memoria no hay BORRAR */ }
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

    setFeedback(isCorrect ? "ok" : "err");
    setFeedbackMsg(isCorrect ? `+${earned} ⭐` : ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]);
    setAttempted(newAttempted);
    setSolved(newSolved);
    setStars(newStarsTotal);
    setStarsSession(newStarsSession);
    setLog(newLog);

    const wait = isCorrect ? 1000 : 1450;
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
  // Enunciado = QUÉ hacer (la tarea). Bocadillo = CÓMO (la mecánica).
  // Sin repetir términos entre enunciado y bocadillo.
  const enunciado =
    ronda === 0 ? "Forma la palabra del dibujo." :
    ronda === 1 ? "Guarda cada palabra en su grupo." :
    "Encuentra las parejas.";
  const bocadillo =
    ronda === 0 ? "Toca y une\nlas sílabas." :
    ronda === 1 ? "Arrástrala hasta\nla casilla correcta." :
    "Destapa el dibujo\ny su palabra.";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <GameHUD elapsed={elapsed} stars={stars} attempted={attempted} solved={solved} total={3} />
      <CharacterCorner char={char} message={bocadillo} />
      <GameEnunciado text={enunciado} top={86} />

      {ronda === 0 && (
        <LaboratorioCard
          pick={r1Pick}
          slots={r1Slots}
          locked={r1Locked}
          onTapTile={(idx) => {
            if (r1Locked) return;
            if (r1Slots.includes(idx)) return;
            const next = [...r1Slots];
            const empty = next.indexOf(null);
            if (empty === -1) return;
            next[empty] = idx;
            setR1Slots(next);
          }}
          onClearSlot={(slot) => {
            if (r1Locked) return;
            const next = [...r1Slots];
            next[slot] = null;
            setR1Slots(next);
          }}
        />
      )}

      {ronda === 1 && (
        <ClasificaCard
          pick={r2Pick}
          placed={r2Placed}
          selected={r2Selected}
          locked={r2Locked}
          onSelect={(w) => { if (!r2Locked) setR2Selected((s) => (s === w ? null : w)); }}
          onPlace={(group, w) => {
            if (r2Locked) return;
            setR2Placed((p) => ({ ...p, [w]: group }));
            setR2Selected(null);
          }}
          onUnplace={(w) => {
            if (r2Locked) return;
            setR2Placed((p) => { const n = { ...p }; delete n[w]; return n; });
          }}
        />
      )}

      {ronda === 2 && (
        <MemoryCard
          pick={r3Pick}
          locked={r3Locked}
          onComplete={(errors) => { setR3Errors(errors); setR3Done(true); }}
        />
      )}

      <ActionRail
        canVerify={canVerify}
        onVerify={handleVerify}
        showErase={ronda !== 2}
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
// R1 · Laboratorio de palabras — clue + probeta de 2 slots + bandeja
// de 6 sílabas (minúsculas). Tap una sílaba → llena el siguiente slot.
// ─────────────────────────────────────────────────────────────
function LaboratorioCard({ pick, slots, locked, onTapTile, onClearSlot }) {
  const formed = slots.map((i) => (i === null ? null : pick.tray[i]));
  const correct = locked && formed.join("") === pick.word;
  const slotBorder = locked ? (correct ? "#2ecc8f" : "#ff6b6b") : "rgba(242,194,96,0.55)";

  return (
    <>
      {/* Clue + probeta */}
      <div data-qa="zona-central" style={{
        position: "absolute", top: 132, left: "50%", transform: "translateX(-50%)",
        width: 440, display: "flex", flexDirection: "column", alignItems: "center", gap: 18,
      }}>
        {/* Cartel de pista: emoji + texto */}
        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          width: "fit-content", maxWidth: 420,
          padding: "12px 18px", borderRadius: 18,
          background: "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(240,235,225,0.9))",
          border: "3px solid #f2c260",
          boxShadow: "0 12px 28px rgba(0,0,0,0.4), inset 0 -4px 0 rgba(0,0,0,0.06)",
        }}>
          <div style={{ fontSize: 60, lineHeight: 1 }}>{pick.emoji}</div>
          <div style={{
            fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 16,
            color: "#3a2608", maxWidth: 230, lineHeight: 1.25,
          }}>{pick.hint}</div>
        </div>

        {/* Probeta: una casilla por sílaba (2 o 3) */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {slots.map((_, slot) => {
            const v = formed[slot];
            return (
              <button key={slot}
                onClick={() => { if (v !== null) onClearSlot(slot); }}
                style={{
                  width: 96, height: 76, borderRadius: 14,
                  border: `2.5px solid ${v !== null ? slotBorder : "rgba(242,194,96,0.5)"}`,
                  background: v !== null
                    ? "linear-gradient(180deg, rgba(252,233,168,0.95), rgba(217,164,65,0.85))"
                    : "rgba(10,6,35,0.5)",
                  color: v !== null ? "#3a2608" : "rgba(252,233,168,0.45)",
                  fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 30,
                  cursor: v !== null && !locked ? "pointer" : "default",
                  boxShadow: v !== null ? "0 4px 10px rgba(0,0,0,0.3)" : "inset 0 1px 0 rgba(255,255,255,0.08)",
                  transition: "all 0.15s ease", letterSpacing: "0.03em",
                }}
                title={v !== null ? "Toca para quitar" : "Toca una sílaba de abajo"}>
                {v !== null ? v : "—"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bandeja de sílabas */}
      <div data-qa="bandeja" style={{
        position: "absolute", bottom: 30, left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: 12, flexWrap: "wrap", maxWidth: 560, justifyContent: "center",
      }}>
        {pick.tray.map((syll, idx) => {
          const used = slots.includes(idx);
          const color = ["#ef5a5a", "#4fa0ff", "#2ecc8f", "#f2a73b", "#a78bfa", "#ff8a3a"][idx % 6];
          return (
            <button key={idx}
              className="ed-numpad-key"
              onClick={() => onTapTile(idx)}
              disabled={used || locked}
              style={{
                width: 86, height: 64, fontSize: 26,
                borderColor: color, borderWidth: 2, borderStyle: "solid",
                cursor: used || locked ? "default" : "pointer",
                fontWeight: 800, letterSpacing: "0.03em",
                opacity: used ? 0.28 : 1,
                transition: "all 0.15s ease",
              }}
              title={used ? "Ya está en la probeta" : "Toca para usar"}>
              {syll}
            </button>
          );
        })}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// R2 · Atrapa y clasifica — chips arriba (sin colocar) + 4 frascos.
// Drag (con fallback tap-tap) a cada frasco. Lock colorea aciertos.
// ─────────────────────────────────────────────────────────────
function ClasificaCard({ pick, placed, selected, locked, onSelect, onPlace, onUnplace }) {
  const unplaced = pick.words.filter((w) => !placed[w]);

  const chipBase = {
    padding: "9px 14px", borderRadius: 12,
    fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 17,
    letterSpacing: "0.02em", cursor: locked ? "default" : "grab",
    border: "2px solid", lineHeight: 1, whiteSpace: "nowrap",
  };

  return (
    <>
      {/* Chips por colocar (los que "caen" del refranero) */}
      <div data-qa="zona-central" style={{
        position: "absolute", top: 150, left: "50%", transform: "translateX(-50%)",
        width: 436, minHeight: 60,
        display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", alignItems: "center",
      }}>
        {unplaced.length === 0 && (
          <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 15, color: "rgba(255,255,255,0.7)" }}>
            ¡Todas guardadas! Pulsa VERIFICAR.
          </div>
        )}
        {unplaced.map((w) => {
          const sel = selected === w;
          const handler = locked ? undefined : makeDragHandler({
            item: w,
            ghostHtml: `<div style="background:#fce9a8;color:#3a2608;padding:8px 14px;border-radius:12px;font-family:Fredoka,Nunito,sans-serif;font-weight:800;font-size:17px;border:2px solid #4fd8ff;box-shadow:0 6px 18px rgba(0,0,0,0.5);">${w}</div>`,
            onTap: (it) => onSelect(it),
            onDrop: (zone, it) => onPlace(zone, it),
          });
          return (
            <div key={w}
              className="ed-draggable"
              onPointerDown={handler}
              style={{
                ...chipBase,
                background: sel ? "linear-gradient(180deg,#fce9a8,#e9c45a)" : "rgba(255,255,255,0.92)",
                color: "#3a2608",
                borderColor: sel ? "#4fd8ff" : "rgba(116,72,32,0.25)",
                boxShadow: sel ? "0 0 16px rgba(79,216,255,0.6)" : "0 3px 8px rgba(0,0,0,0.25)",
                transform: sel ? "translateY(-2px)" : "none",
              }}>
              {w}
            </div>
          );
        })}
      </div>

      {/* 4 casillas — altura justa para 2-3 palabras, sin desperdiciar espacio */}
      <div data-qa="bandeja" style={{
        position: "absolute", bottom: 82, left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: 10, justifyContent: "center",
      }}>
        {pick.bins.map((g) => {
          const color = BIN_COLOR[g] || "#4fa0ff";
          const inside = pick.words.filter((w) => placed[w] === g);
          return (
            <div key={g}
              data-dropzone={g}
              onClick={() => { if (!locked && selected) onPlace(g, selected); }}
              style={{
                width: 100, minHeight: 158,
                borderRadius: 14, padding: "10px 5px 12px",
                background: "rgba(10,6,35,0.5)",
                border: `2.5px dashed ${color}`,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                cursor: selected && !locked ? "pointer" : "default",
              }}>
              <div style={{
                fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 20,
                color: "#fff", background: color, borderRadius: 8, padding: "2px 12px",
                letterSpacing: "0.05em", boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
              }}>{g}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, width: "100%", alignItems: "center" }}>
                {inside.map((w) => {
                  const ok = locked ? pick.wordGroup[w] === g : null;
                  return (
                    <div key={w}
                      onClick={(e) => { e.stopPropagation(); if (!locked) onUnplace(w); }}
                      style={{
                        fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 14,
                        padding: "4px 8px", borderRadius: 8, lineHeight: 1,
                        background: locked
                          ? (ok ? "linear-gradient(180deg,#2ecc8f,#22a06c)" : "linear-gradient(180deg,#ff6b6b,#dc5050)")
                          : "rgba(255,255,255,0.92)",
                        color: locked ? "#fff" : "#3a2608",
                        cursor: locked ? "default" : "pointer",
                        boxShadow: "0 2px 5px rgba(0,0,0,0.25)",
                        whiteSpace: "nowrap",
                      }}
                      title={locked ? "" : "Toca para sacar"}>
                      {locked ? (ok ? "✓ " : "✗ ") : ""}{w}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// R3 · Memoria de parejas — 12 cartas (6 dibujos + 6 palabras). El niño
// destapa de a 2; si la imagen coincide con su palabra, quedan fijas.
// Al emparejar todas, avisa al padre (onComplete) con el nº de fallos.
// ─────────────────────────────────────────────────────────────
function MemoryCard({ pick, locked, onComplete }) {
  const [flipped, setFlipped] = useStateG([]);          // índices visibles sin emparejar (0..2)
  const [matched, setMatched] = useStateG(() => new Set());
  const [busy, setBusy] = useStateG(false);
  const errorsRef = useRefG(0);
  const doneRef = useRefG(false);

  function click(i) {
    if (locked || busy || doneRef.current) return;
    if (matched.has(i) || flipped.includes(i)) return;
    if (flipped.length >= 2) return;
    const next = [...flipped, i];
    setFlipped(next);
    if (next.length === 2) {
      const [a, b] = next;
      const ca = pick.cards[a], cb = pick.cards[b];
      const isMatch = ca.pairId === cb.pairId && ca.kind !== cb.kind;
      if (isMatch) {
        setTimeout(() => {
          setMatched((m) => {
            const nm = new Set(m); nm.add(a); nm.add(b);
            if (nm.size === pick.cards.length && !doneRef.current) {
              doneRef.current = true;
              onComplete && onComplete(errorsRef.current);
            }
            return nm;
          });
          setFlipped([]);
        }, 420);
      } else {
        errorsRef.current += 1;
        setBusy(true);
        setTimeout(() => { setFlipped([]); setBusy(false); }, 850);
      }
    }
  }

  const matchedPairs = matched.size / 2;

  return (
    <div data-qa="zona-central" style={{
      position: "absolute", top: 158, left: "50%", transform: "translateX(-50%)",
      width: 440, display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
    }}>
      {/* Contador de parejas */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        background: "rgba(0,0,0,0.3)", border: "1px solid rgba(242,194,96,0.45)",
        borderRadius: 999, padding: "4px 14px",
        fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 14, color: "#fce9a8",
      }}>
        🧠 Parejas: {matchedPairs} / {pick.pairs}
      </div>

      {/* Tablero 4 columnas × 3 filas */}
      <div data-qa="bandeja" style={{
        display: "grid", gridTemplateColumns: "repeat(4, 100px)", gap: 10, justifyContent: "center",
      }}>
        {pick.cards.map((c, i) => {
          const isMatched = matched.has(i);
          const isUp = isMatched || flipped.includes(i);
          return (
            <button key={i}
              onClick={() => click(i)}
              disabled={locked || isMatched}
              style={{
                width: 100, height: 104, borderRadius: 14, padding: 4,
                border: isMatched ? "2.5px solid #2ecc8f" : "2.5px solid rgba(242,194,96,0.6)",
                background: isUp
                  ? (isMatched
                      ? "linear-gradient(180deg, rgba(46,204,143,0.95), rgba(34,160,108,0.92))"
                      : "linear-gradient(180deg, rgba(255,250,235,0.97), rgba(244,232,205,0.95))")
                  : "linear-gradient(180deg, rgba(20,12,55,0.92), rgba(10,6,35,0.92))",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: (locked || isMatched) ? "default" : "pointer",
                boxShadow: "0 4px 10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
                fontFamily: "var(--ed-font-display)", fontWeight: 800,
                transition: "all 0.15s ease",
              }}>
              {isUp
                ? (c.kind === "emoji"
                    ? <span style={{ fontSize: 40, lineHeight: 1 }}>{c.content}</span>
                    : <span style={{ fontSize: 17, color: isMatched ? "#fff" : "#3a2608" }}>{c.content}</span>)
                : <span style={{ fontSize: 30, color: "rgba(242,194,96,0.7)" }}>?</span>}
            </button>
          );
        })}
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
  const res = app.lastResult || { category: "Grupos consonánticos", solved: 0, total: 3, time: 0, starsEarned: 0, log: [] };
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
