// game-screens.jsx — Juego 8. Dos niveles de lenguaje con mecánicas distintas:
//   1. El escritor  (9 años)  — caza S/P · pintor de modificadores · sastre de citas
//   2. El narrador  (10 años) — palabras mágicas · partes del cuento · ordena el cuento
//
// GameScreen delega al sub-componente según app.currentCategory.

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
        ghost.innerHTML = ghostHtml || `<div style="background:#fce9a8;color:#3a2608;padding:6px 12px;border-radius:10px;font-family:Fredoka,Nunito,sans-serif;font-weight:800;font-size:12px;border:2px solid #4fd8ff;box-shadow:0 6px 18px rgba(0,0,0,0.5);">${String(item).slice(0,60)}</div>`;
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
  "¡La próxima es tuya!",
  "Equivocarse también es aprender.",
  "¡Vamos a la siguiente!",
  "Cada error te acerca al acierto.",
];

const RECENT_KEYS = {
  escritor: "edinun_juego8_escritor_recientes_v1",
  narrador: "edinun_juego8_narrador_recientes_v1",
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
// BANCOS — N1 · El escritor (9 años)
// ─────────────────────────────────────────────────────────────

// R1 — Sujeto / Predicado: 1 oración + 1 sola decisión: dónde cortar.
//   splitIdx = índice del corte después de la palabra (0-based).
//   Ej: "Cecilia y Miguel | picaron los tomates" → palabras 0..5, corte después de la 2.
const SP_BANK = [
  { id: "tomates",   palabras: ["Cecilia", "y", "Miguel", "picaron", "los", "tomates"],       splitIdx: 2 },
  { id: "alpinista", palabras: ["El", "alpinista", "escaló", "una", "montaña", "imponente"],   splitIdx: 1 },
  { id: "basquet",   palabras: ["Maximiliano", "y", "yo", "jugamos", "básquet", "en", "la", "escuela"], splitIdx: 2 },
  { id: "mariposa",  palabras: ["La", "pequeña", "mariposa", "voló", "lejos"],                 splitIdx: 2 },
  { id: "ajedrez",   palabras: ["El", "ajedrez", "es", "mi", "deporte", "preferido"],          splitIdx: 1 },
];

// R2 — Pintor de modificadores: 1 frase con núcleo prefijado en rojo.
//   md = modificador directo (artículo/adjetivo, palabra suelta)
//   n  = núcleo (sustantivo, fijo en rojo, no se toca)
//   mi = modificador indirecto (bloque con preposición)
const MOD_BANK = [
  {
    id: "restaurante",
    tokens: [
      { w: "El",                 tipo: "md" },
      { w: "pequeño",            tipo: "md" },
      { w: "restaurante",        tipo: "n"  },
      { w: "de la otra calle",   tipo: "mi" },
    ],
  },
  {
    id: "mariposa",
    tokens: [
      { w: "La",            tipo: "md" },
      { w: "pequeña",       tipo: "md" },
      { w: "mariposa",      tipo: "n"  },
      { w: "del jardín",    tipo: "mi" },
    ],
  },
  {
    id: "perro",
    tokens: [
      { w: "Ese",           tipo: "md" },
      { w: "perro",         tipo: "n"  },
      { w: "de mi vecino",  tipo: "mi" },
    ],
  },
  {
    id: "libros",
    tokens: [
      { w: "Esos",            tipo: "md" },
      { w: "libros",          tipo: "n"  },
      { w: "de aventuras",    tipo: "mi" },
    ],
  },
];

// R3 — Sastre de citas: frase con huecos para dos puntos + comillas + punto.
//   Estructura: partes[] alterna entre texto fijo (t) y slot (s).
//   Para slot, "correcto" indica qué símbolo va y el banco tiene los 4 disponibles.
const CITAS_BANK = [
  {
    id: "profesor",
    partes: [
      { t: "Entonces el profesor dijo" },
      { s: ":" },
      { s: '"' },
      { t: "Para mañana la lección siguiente" },
      { s: '"' },
      { s: "." },
    ],
    bandeja: [":", '"', '"', "."],
  },
  {
    id: "presidente",
    partes: [
      { t: "El presidente aseguró" },
      { s: ":" },
      { s: '"' },
      { t: "Arranca una nueva etapa mejor" },
      { s: '"' },
      { s: "." },
    ],
    bandeja: [":", '"', '"', "."],
  },
  {
    id: "novio",
    partes: [
      { t: "Cuando el novio dijo" },
      { s: ":" },
      { s: '"' },
      { t: "Sí, acepto" },
      { s: '"' },
      { s: "." },
    ],
    bandeja: [":", '"', '"', "."],
  },
];

// ─────────────────────────────────────────────────────────────
// BANCOS — N2 · El narrador (10 años)
// ─────────────────────────────────────────────────────────────

// R1 — Palabras mágicas: frase con 1 hueco, 4 opciones.
const MAGICAS_BANK = [
  {
    id: "bosque",
    titulo: "En el bosque",
    huecos: [
      { id: "h1", frase: "El bosque parecía  ___  y silencioso.",   correcta: "misterioso",  opciones: ["misterioso", "ruidoso", "rápido", "alegre"] },
      { id: "h2", frase: " ___ , se escuchó un crujido entre las hojas.", correcta: "De repente", opciones: ["Más tarde", "De repente", "Despacio", "Siempre"] },
      { id: "h3", frase: "Una voz  ___  algo, pero nadie pudo entenderlo.", correcta: "susurró",   opciones: ["gritó", "cantó", "susurró", "olvidó"] },
    ],
  },
  {
    id: "cabana",
    titulo: "La cabaña oculta",
    huecos: [
      { id: "h1", frase: "Al mirar bien, María  ___  una pequeña cabaña.", correcta: "descubrió", opciones: ["perdió", "descubrió", "rompió", "lavó"] },
      { id: "h2", frase: "La cabaña estaba  ___  de árboles altísimos.",   correcta: "rodeada",  opciones: ["rodeada", "vacía", "sucia", "abierta"] },
      { id: "h3", frase: "Una luz  ___  salió desde la ventana.",          correcta: "misteriosa", opciones: ["aburrida", "lenta", "misteriosa", "rota"] },
    ],
  },
  {
    id: "barco",
    titulo: "El barco escondido",
    huecos: [
      { id: "h1", frase: "El capitán  ___  un viejo mapa en el cajón.", correcta: "descubrió", opciones: ["olvidó", "descubrió", "rompió", "ignoró"] },
      { id: "h2", frase: "El mar estaba  ___  de niebla espesa.",        correcta: "rodeado",  opciones: ["lleno", "vacío", "rodeado", "alegre"] },
      { id: "h3", frase: " ___ , una ola enorme golpeó el barco.",       correcta: "De repente", opciones: ["Despacio", "De repente", "Suavemente", "Luego"] },
    ],
  },
];

// R2 — Partes de la narración: 5 etiquetas, 5 fragmentos para clasificar
const PARTES_BANK = [
  {
    id: "alicia",
    titulo: "El bosque sin nombre",
    fragmentos: [
      { id: "f1", texto: "En un bosque mágico, oscuro y silencioso.",                     parte: "lugar" },
      { id: "f2", texto: "Alicia y un pequeño cervato caminaban juntos.",                  parte: "personajes" },
      { id: "f3", texto: "El cervato no podía recordar su nombre.",                        parte: "conflicto" },
      { id: "f4", texto: "Caminaron hasta el final del bosque, hablando en voz baja.",     parte: "acciones" },
      { id: "f5", texto: "Al salir del bosque, el cervato recordó: ¡soy un cervato!",      parte: "resolucion" },
    ],
  },
  {
    id: "gatitos",
    titulo: "Niños salvan a gatitos",
    fragmentos: [
      { id: "f1", texto: "En el patio del Centro Educativo Las Cimas.",                    parte: "lugar" },
      { id: "f2", texto: "María Elena, Camilo y otros niños de 5to de básica.",            parte: "personajes" },
      { id: "f3", texto: "Encontraron una camada de gatitos abandonados.",                 parte: "conflicto" },
      { id: "f4", texto: "Envolvieron a cada gatito en su uniforme con cuidado.",          parte: "acciones" },
      { id: "f5", texto: "Los padres adoptaron a los ocho gatitos en sus casas.",          parte: "resolucion" },
    ],
  },
  {
    id: "tesoro",
    titulo: "El tesoro del abuelo",
    fragmentos: [
      { id: "f1", texto: "En la casa antigua junto al río.",                              parte: "lugar" },
      { id: "f2", texto: "Lucía y su abuelo Aníbal, gran cuentacuentos.",                  parte: "personajes" },
      { id: "f3", texto: "El abuelo no recordaba dónde había guardado un tesoro.",         parte: "conflicto" },
      { id: "f4", texto: "Buscaron juntos por el jardín, el desván y la cocina.",          parte: "acciones" },
      { id: "f5", texto: "Encontraron una caja con fotos viejas: el verdadero tesoro.",    parte: "resolucion" },
    ],
  },
];

// R3 — Ordena el cuento: 5 escenas con emoji + texto, hay que ordenarlas tap-tap
const ORDEN_BANK = [
  {
    id: "alicia",
    titulo: "Alicia y el cervato",
    escenas: [
      { n: 1, emoji: "🌲", texto: "Alicia entró a un bosque silencioso." },
      { n: 2, emoji: "🦌", texto: "Encontró a un pequeño cervato perdido." },
      { n: 3, emoji: "❓", texto: "Ninguno recordaba su propio nombre." },
      { n: 4, emoji: "🚶", texto: "Caminaron juntos buscando la salida." },
      { n: 5, emoji: "✨", texto: "Al salir, recordaron quiénes eran." },
    ],
  },
  {
    id: "gatitos",
    titulo: "El rescate de los gatitos",
    escenas: [
      { n: 1, emoji: "🏫", texto: "Era un día normal en la escuela." },
      { n: 2, emoji: "🐱", texto: "Los niños encontraron gatitos abandonados." },
      { n: 3, emoji: "🤔", texto: "Pensaron qué hacer para ayudarlos." },
      { n: 4, emoji: "🧥", texto: "Los envolvieron en sus uniformes." },
      { n: 5, emoji: "🏠", texto: "Cada familia adoptó un gatito." },
    ],
  },
  {
    id: "abuelo",
    titulo: "El tesoro del abuelo",
    escenas: [
      { n: 1, emoji: "🏚️", texto: "Lucía visitó la casa antigua del abuelo." },
      { n: 2, emoji: "💭", texto: "El abuelo le contó de un tesoro perdido." },
      { n: 3, emoji: "🔎", texto: "Buscaron por toda la casa." },
      { n: 4, emoji: "📦", texto: "Hallaron una caja vieja en el desván." },
      { n: 5, emoji: "📷", texto: "Adentro había fotos: el verdadero tesoro." },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// GameScreen — delega al sub-componente según el nivel elegido
// ─────────────────────────────────────────────────────────────
function GameScreen({ app, setApp, go }) {
  const cat = app.currentCategory || "escritor";
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
      {cat === "narrador"
        ? <NarradorGame key={`nar-${restartTick}`} app={app} setApp={setApp} go={go} onRestart={restart} />
        : <EscritorGame key={`esc-${restartTick}`} app={app} setApp={setApp} go={go} onRestart={restart} />}
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
  const currentId = app && app.currentCategory ? app.currentCategory : "escritor";
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
        position: "absolute", top: 52, left: "50%", transform: "translateX(-50%)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
      }}>
        <span className="ed-label" style={{ color: "rgba(255,255,255,0.7)", letterSpacing: "0.14em" }}>RONDA</span>
        <div style={{ display: "flex", gap: 6 }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: "50%",
              background: i < attempted ? (i < solved ? "#fce9a8" : "#ff6b6b") : "rgba(255,255,255,0.2)",
              boxShadow: i < attempted ? "0 0 10px currentColor" : "none",
              color: i < solved ? "#fce9a8" : "#ff6b6b",
            }} />
          ))}
        </div>
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
// N1 · El escritor — 3 rondas distintas
// ─────────────────────────────────────────────────────────────
function EscritorGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "El escritor";

  const [ronda, setRonda] = useStateG(0);

  // R1 state — Ruleta del escritor: girando, revelada, corte elegido.
  const [r1Spinning, setR1Spinning] = useStateG(false);
  const [r1Revealed, setR1Revealed] = useStateG(false);
  const [r1Split, setR1Split] = useStateG(null);
  const [r1Locked, setR1Locked] = useStateG(false);

  // R2 state — Detective literario: lupa activa (md/mi/null) + marcas por palabra.
  const [r2Lupa, setR2Lupa] = useStateG(null);
  const [r2Marks, setR2Marks] = useStateG({});
  const [r2Locked, setR2Locked] = useStateG(false);

  // R3 state — sastre de citas: { slotIdx: signo }
  const [r3Placed, setR3Placed] = useStateG({});
  const [r3Picked, setR3Picked] = useStateG(null);
  const [r3Locked, setR3Locked] = useStateG(false);

  // Picks
  const [r1Pick] = useStateG(() => {
    const recent = new Set(getRecent("escritor"));
    let pool = SP_BANK.filter((p) => !recent.has("sp:" + p.id));
    if (pool.length === 0) pool = SP_BANK;
    const p = pool[Math.floor(Math.random() * pool.length)];
    pushRecent("escritor", "sp:" + p.id);
    return p;
  });

  const [r2Pick] = useStateG(() => {
    const recent = new Set(getRecent("escritor"));
    let pool = MOD_BANK.filter((p) => !recent.has("mod:" + p.id));
    if (pool.length === 0) pool = MOD_BANK;
    const p = pool[Math.floor(Math.random() * pool.length)];
    pushRecent("escritor", "mod:" + p.id);
    return p;
  });

  const [r3Pick] = useStateG(() => {
    const recent = new Set(getRecent("escritor"));
    let pool = CITAS_BANK.filter((p) => !recent.has("cit:" + p.id));
    if (pool.length === 0) pool = CITAS_BANK;
    const p = pool[Math.floor(Math.random() * pool.length)];
    pushRecent("escritor", "cit:" + p.id);
    return p;
  });

  // Lista plana de slots para R3 (con su signo correcto e índice)
  const r3Slots = r3Pick.partes.map((pt, i) => pt.s != null ? { idx: i, signo: pt.s } : null).filter(Boolean);

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
    window.__currentChalkGlyphs = [
      { c: "✍",  l: "6%",  t: "12%", r: "-8deg" },
      { c: "S",  l: "82%", t: "16%", r: "6deg",  s: "0.6em" },
      { c: "P",  l: "10%", t: "78%", r: "12deg", s: "0.6em" },
      { c: "MD", l: "88%", t: "72%", r: "-10deg", s: "0.5em" },
      { c: ":",  l: "45%", t: "8%",  r: "4deg",  s: "0.6em" },
      { c: '"',  l: "3%",  t: "45%", r: "-4deg", s: "0.65em" },
      { c: ",",  l: "92%", t: "45%", r: "8deg",  s: "0.7em" },
      { c: "MI", l: "30%", t: "55%", r: "-6deg", s: "0.5em" },
      { c: "📖", l: "70%", t: "62%", r: "8deg",  s: "0.55em" },
      { c: "✨", l: "55%", t: "30%", r: "-4deg", s: "0.45em" },
    ];
    return () => { window.__currentChalkGlyphs = null; };
  }, []);

  // Verificación
  // R1: para verificar se necesita haber revelado la oración (girado) y elegido un corte.
  const r1Done = r1Revealed && r1Split !== null;
  // R2: cada token md/mi debe estar marcado con la lupa correcta; el núcleo no se toca.
  const r2Targets = r2Pick.tokens.map((t, i) => ({ ...t, idx: i })).filter((t) => t.tipo !== "n");
  const r2AllMarked = r2Targets.every((t) => r2Marks[t.idx]);
  // R3: todos los slots llenos
  const r3AllPlaced = r3Slots.every((s) => r3Placed[s.idx]);

  const canVerify =
    ronda === 0 ? (r1Done && !r1Locked) :
    ronda === 1 ? (r2AllMarked && !r2Locked) :
    ronda === 2 ? (r3AllPlaced && !r3Locked) :
    false;
  const showErase = true;

  function handleVerify() {
    if (!canVerify) return;
    if (ronda === 0) {
      setR1Locked(true);
      const correct = r1Split === r1Pick.splitIdx;
      const sujeto = r1Pick.palabras.slice(0, r1Split + 1).join(" ");
      const predicado = r1Pick.palabras.slice(r1Split + 1).join(" ");
      const sujetoOk = r1Pick.palabras.slice(0, r1Pick.splitIdx + 1).join(" ");
      const predicadoOk = r1Pick.palabras.slice(r1Pick.splitIdx + 1).join(" ");
      const userText = `S: ${sujeto} | P: ${predicado}`;
      const correctText = `S: ${sujetoOk} | P: ${predicadoOk}`;
      setTimeout(() => answer(correct, userText, correctText, "🎡"), 350);
    } else if (ronda === 1) {
      setR2Locked(true);
      let correct = true;
      for (const t of r2Targets) {
        if (r2Marks[t.idx] !== t.tipo) { correct = false; break; }
      }
      const userText = r2Targets.map((t) => `${t.w}=${r2Marks[t.idx] || "?"}`).join(" ");
      const correctText = r2Targets.map((t) => `${t.w}=${t.tipo}`).join(" ");
      setTimeout(() => answer(correct, userText, correctText, "🔍"), 350);
    } else if (ronda === 2) {
      setR3Locked(true);
      let correct = true;
      for (const s of r3Slots) {
        if (r3Placed[s.idx] !== s.signo) { correct = false; break; }
      }
      const userText = r3Slots.map((s) => `${r3Placed[s.idx] || "?"}`).join(" ");
      const correctText = r3Slots.map((s) => s.signo).join(" ");
      setTimeout(() => answer(correct, userText, correctText, "🧪"), 350);
    }
  }

  function handleErase() {
    if (ronda === 0) { if (r1Locked) return; setR1Split(null); }
    else if (ronda === 1) { if (r2Locked) return; setR2Marks({}); setR2Lupa(null); }
    else if (ronda === 2) { if (r3Locked) return; setR3Placed({}); setR3Picked(null); }
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

    const wait = isCorrect ? 950 : 1400;
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

  const enunciado =
    ronda === 0 ? "Gira la ruleta y divide la oración." :
    ronda === 1 ? "Marca con la lupa los modificadores." :
    "Mezcla los signos en el orden correcto.";

  // Bocadillo dinámico: en R2 cambia según qué lupa esté activa para
  // explicar qué significa Modificador Directo / Indirecto.
  const bocadillo =
    ronda === 0
      ? (r1Spinning ? "¡Girando…!"
        : !r1Revealed ? "Toca el botón GIRAR."
        : "Toca entre dos palabras donde se divide.")
      :
    ronda === 1
      ? (r2Lupa === "md" ? "MD = Modificador Directo. Es un artículo (el, la) o adjetivo (pequeño)."
        : r2Lupa === "mi" ? "MI = Modificador Indirecto. Es un grupo con preposición (de, con, para)."
        : "Toma una lupa y marca las palabras.")
      :
    "Toma un signo y suéltalo en el hueco.";

  // El enunciado vive sobre la zona central. Cada ronda lo baja un poco distinto
  // según cuánto aire tenga su mecánica entre el HUD y el cartel principal.
  const enunciadoTop =
    ronda === 0 ? 90 :   // R1 ruleta — la rueda ocupa el centro, el enunciado queda cómodo arriba
    ronda === 1 ? 150 :  // R2 detective — bajamos cerca del expediente para que respire mejor
    100;                 // R3 laboratorio — apenas pegado a la probeta

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <GameHUD elapsed={elapsed} stars={stars} attempted={attempted} solved={solved} total={3} app={app} setApp={setApp} />
      <CharacterCorner char={char} message={bocadillo} />
      <GameEnunciado text={enunciado} top={enunciadoTop} />

      <div data-qa="zona-central" style={{
        position: "absolute", top: 116, left: 244, width: 488, bottom: 14,
      }}>
        {ronda === 0 && (
          <RuletaEscritorCard
            pick={r1Pick}
            spinning={r1Spinning}
            revealed={r1Revealed}
            split={r1Split}
            locked={r1Locked}
            onSpin={() => {
              if (r1Spinning || r1Revealed) return;
              setR1Spinning(true);
              setTimeout(() => { setR1Spinning(false); setR1Revealed(true); }, 1800);
            }}
            onChooseSplit={(idx) => { if (r1Locked) return; setR1Split(idx); }}
          />
        )}
        {ronda === 1 && (
          <DetectiveModCard
            pick={r2Pick}
            marks={r2Marks}
            lupa={r2Lupa}
            locked={r2Locked}
            onChooseLupa={(l) => { if (r2Locked) return; setR2Lupa(r2Lupa === l ? null : l); }}
            onMarkWord={(idx) => {
              if (r2Locked || !r2Lupa) return;
              const next = { ...r2Marks };
              if (next[idx] === r2Lupa) delete next[idx];
              else next[idx] = r2Lupa;
              setR2Marks(next);
            }}
          />
        )}
        {ronda === 2 && (
          <LabCitasCard
            pick={r3Pick}
            placed={r3Placed}
            picked={r3Picked}
            locked={r3Locked}
            onPickLabel={(s) => { if (r3Locked) return; setR3Picked(r3Picked === s ? null : s); }}
            onPlaceIn={(slotIdx) => {
              if (r3Locked) return;
              if (r3Picked === null) {
                if (r3Placed[slotIdx]) {
                  const next = { ...r3Placed }; delete next[slotIdx];
                  setR3Placed(next);
                }
                return;
              }
              const next = { ...r3Placed };
              next[slotIdx] = r3Picked;
              setR3Placed(next);
              setR3Picked(null);
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
// N1 · R1 — Ruleta del escritor: gira la rueda para revelar la
// oración del libro y corta entre sujeto y predicado.
// ─────────────────────────────────────────────────────────────
function RuletaEscritorCard({ pick, spinning, revealed, split, locked, onSpin, onChooseSplit }) {
  const palabras = pick.palabras;
  const splitOk = pick.splitIdx;
  const chosen = split;
  const isCorrect = locked && chosen === splitOk;
  const isWrong = locked && chosen !== splitOk;
  // Iconos de los 5 sectores (corresponden a SP_BANK)
  const SECTORS = ["🍅", "🏔", "🏀", "🦋", "♟"];
  const SECTOR_COLORS = ["#ff9a9a", "#b9e3ff", "#ffe97a", "#c39cff", "#9ee0a3"];
  // Vista no revelada: ruleta grande + botón GIRAR. Vista revelada: oración con tijeras.
  if (!revealed) {
    return (
      <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
        <div style={{ position: "relative", width: 220, height: 220 }}>
          {/* Flecha indicadora arriba */}
          <div style={{
            position: "absolute", top: -6, left: "50%", transform: "translateX(-50%)",
            width: 0, height: 0, zIndex: 3,
            borderLeft: "13px solid transparent", borderRight: "13px solid transparent",
            borderTop: "22px solid #fce9a8",
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
          }} />
          {/* Ruleta SVG */}
          <svg width="220" height="220" viewBox="-110 -110 220 220" style={{
            transition: spinning ? "transform 1.8s cubic-bezier(0.2,0.7,0.3,1)" : "none",
            transform: spinning ? "rotate(1440deg)" : "rotate(0deg)",
            filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.5))",
          }}>
            <circle r="100" fill="#0a0626" stroke="#fce9a8" strokeWidth="4" />
            {SECTORS.map((emoji, i) => {
              const a0 = (i * 360 / 5) - 90;
              const a1 = a0 + 72;
              const rad = (a) => (a * Math.PI) / 180;
              const x0 = 100 * Math.cos(rad(a0)), y0 = 100 * Math.sin(rad(a0));
              const x1 = 100 * Math.cos(rad(a1)), y1 = 100 * Math.sin(rad(a1));
              const aMid = a0 + 36;
              const tx = 62 * Math.cos(rad(aMid)), ty = 62 * Math.sin(rad(aMid));
              return (
                <g key={i}>
                  <path d={`M 0 0 L ${x0} ${y0} A 100 100 0 0 1 ${x1} ${y1} Z`}
                    fill={SECTOR_COLORS[i]} stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" />
                  <text x={tx} y={ty + 12} textAnchor="middle"
                    fontSize="32" style={{ pointerEvents: "none", userSelect: "none" }}>
                    {emoji}
                  </text>
                </g>
              );
            })}
            {/* Centro */}
            <circle r="14" fill="#fce9a8" stroke="#d9a441" strokeWidth="2" />
          </svg>
        </div>
        <button
          onClick={onSpin}
          disabled={spinning}
          style={{
            padding: "10px 28px", borderRadius: 14,
            background: spinning ? "rgba(120,120,120,0.5)" : "linear-gradient(180deg, #fce9a8, #d9a441)",
            color: "#3a2608",
            border: "2px solid #b48817",
            fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 17,
            letterSpacing: "0.06em",
            cursor: spinning ? "default" : "pointer",
            boxShadow: spinning ? "none" : "0 6px 14px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.4)",
            transition: "all 0.18s",
          }}>
          {spinning ? "🎡 GIRANDO..." : "🎡 GIRAR"}
        </button>
      </div>
    );
  }
  // Vista revelada: cartel con palabras + tijeras tocables
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
      <div style={{
        width: "fit-content", maxWidth: 480,
        background: "linear-gradient(180deg, rgba(255,253,245,0.97), rgba(245,238,225,0.92))",
        border: "3px solid #f2c260",
        borderRadius: 18, padding: "16px 18px",
        boxShadow: "0 10px 22px rgba(0,0,0,0.45)",
      }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center", alignItems: "center" }}>
          {palabras.map((p, i) => {
            const beforeSplit = chosen !== null && i <= chosen;
            const afterSplit  = chosen !== null && i >  chosen;
            let bg = "rgba(252,233,168,0.55)";
            let border = "2px solid rgba(217,164,65,0.4)";
            let color = "#3a2608";
            if (beforeSplit) { bg = "linear-gradient(180deg, #ffe97a, #d7b12a)"; border = "2px solid #b48817"; }
            if (afterSplit)  { bg = "linear-gradient(180deg, #ff9a9a, #d94a4a)"; border = "2px solid #a31818"; color = "#fff"; }
            return (
              <React.Fragment key={i}>
                <span style={{
                  display: "inline-block",
                  padding: "7px 13px",
                  borderRadius: 10,
                  background: bg, border, color,
                  fontFamily: "var(--ed-font-display)", fontWeight: 700,
                  fontSize: 17, lineHeight: 1.2,
                  userSelect: "none",
                  boxShadow: chosen !== null ? "0 2px 4px rgba(0,0,0,0.2)" : "none",
                  transition: "all 0.2s",
                }}>{p}</span>
                {i < palabras.length - 1 && (
                  <button
                    onClick={() => !locked && onChooseSplit(i)}
                    disabled={locked}
                    style={{
                      width: chosen === i ? 6 : 26, height: 38,
                      padding: 0,
                      background: chosen === i
                        ? (isCorrect ? "#2ecc8f" : isWrong ? "#ff6b6b" : "#4fd8ff")
                        : "transparent",
                      border: chosen === i ? "none" : "2px dashed rgba(252,233,168,0.55)",
                      borderRadius: chosen === i ? 3 : 8,
                      color: "#fce9a8",
                      cursor: locked ? "default" : "pointer",
                      fontSize: 16, fontWeight: 800,
                      lineHeight: 1,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.2s",
                      boxShadow: chosen === i ? "0 0 14px currentColor" : "none",
                    }}
                    title={chosen === i ? "Corte aquí" : "Toca para cortar aquí"}
                  >
                    {chosen === i ? "" : "✂"}
                  </button>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "center" }}>
        <div style={{
          background: "linear-gradient(180deg, #ffe97a, #d7b12a)", color: "#3a2608",
          padding: "6px 16px", borderRadius: 999,
          fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 12,
          border: "2px solid #b48817", letterSpacing: "0.06em",
          boxShadow: "0 3px 7px rgba(0,0,0,0.3)",
        }}>SUJETO ←</div>
        <div style={{ color: "#fce9a8", fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 20 }}>✂</div>
        <div style={{
          background: "linear-gradient(180deg, #ff9a9a, #d94a4a)", color: "#fff",
          padding: "6px 16px", borderRadius: 999,
          fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 12,
          border: "2px solid #a31818", letterSpacing: "0.06em",
          boxShadow: "0 3px 7px rgba(0,0,0,0.3)",
        }}>→ PREDICADO</div>
      </div>
    </div>
  );
}

// (Sin uso — sustituido por RuletaEscritorCard, se mantiene comentado por si vuelve)
function _SujetoPredicadoCard_DEPRECATED({ pick, split, locked, onChooseSplit }) {
  const palabras = pick.palabras;
  const splitOk = pick.splitIdx;
  const chosen = split;
  const isCorrect = locked && chosen === splitOk;
  const isWrong = locked && chosen !== splitOk;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
      {/* Cartel con la oración como fichas + tijeras entre cada par de palabras */}
      <div style={{
        width: "fit-content", maxWidth: 480,
        background: "linear-gradient(180deg, rgba(255,253,245,0.97), rgba(245,238,225,0.92))",
        border: "3px solid #f2c260",
        borderRadius: 18, padding: "16px 18px",
        boxShadow: "0 10px 22px rgba(0,0,0,0.45)",
      }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center", alignItems: "center" }}>
          {palabras.map((p, i) => {
            const beforeSplit = chosen !== null && i <= chosen;
            const afterSplit  = chosen !== null && i >  chosen;
            let bg = "rgba(252,233,168,0.55)";
            let border = "2px solid rgba(217,164,65,0.4)";
            let color = "#3a2608";
            if (beforeSplit) { bg = "linear-gradient(180deg, #ffe97a, #d7b12a)"; border = "2px solid #b48817"; }
            if (afterSplit)  { bg = "linear-gradient(180deg, #ff9a9a, #d94a4a)"; border = "2px solid #a31818"; color = "#fff"; }
            return (
              <React.Fragment key={i}>
                <span style={{
                  display: "inline-block",
                  padding: "7px 13px",
                  borderRadius: 10,
                  background: bg, border, color,
                  fontFamily: "var(--ed-font-display)", fontWeight: 700,
                  fontSize: 17, lineHeight: 1.2,
                  userSelect: "none",
                  boxShadow: chosen !== null ? "0 2px 4px rgba(0,0,0,0.2)" : "none",
                  transition: "all 0.2s",
                }}>{p}</span>
                {i < palabras.length - 1 && (
                  <button
                    onClick={() => !locked && onChooseSplit(i)}
                    disabled={locked}
                    style={{
                      width: chosen === i ? 6 : 26, height: 38,
                      padding: 0,
                      background: chosen === i
                        ? (isCorrect ? "#2ecc8f" : isWrong ? "#ff6b6b" : "#4fd8ff")
                        : "transparent",
                      border: chosen === i ? "none" : "2px dashed rgba(252,233,168,0.55)",
                      borderRadius: chosen === i ? 3 : 8,
                      color: "#fce9a8",
                      cursor: locked ? "default" : "pointer",
                      fontSize: 16, fontWeight: 800,
                      lineHeight: 1,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.2s",
                      boxShadow: chosen === i ? "0 0 14px currentColor" : "none",
                    }}
                    title={chosen === i ? "Corte aquí" : "Toca para cortar aquí"}
                  >
                    {chosen === i ? "" : "✂"}
                  </button>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Etiquetas SUJETO / PREDICADO con flechas — solo decorativas, no interactivas */}
      <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "center" }}>
        <div style={{
          background: "linear-gradient(180deg, #ffe97a, #d7b12a)",
          color: "#3a2608",
          padding: "6px 16px", borderRadius: 999,
          fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 12,
          border: "2px solid #b48817",
          letterSpacing: "0.06em",
          boxShadow: "0 3px 7px rgba(0,0,0,0.3)",
        }}>SUJETO ←</div>
        <div style={{
          color: "#fce9a8", fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 20,
        }}>✂</div>
        <div style={{
          background: "linear-gradient(180deg, #ff9a9a, #d94a4a)",
          color: "#fff",
          padding: "6px 16px", borderRadius: 999,
          fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 12,
          border: "2px solid #a31818",
          letterSpacing: "0.06em",
          boxShadow: "0 3px 7px rgba(0,0,0,0.3)",
        }}>→ PREDICADO</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// N1 · R2 — Detective literario: el niño toma una lupa (MD o MI)
// y marca las palabras del expediente. El núcleo ya está marcado
// en rojo como "víctima del caso".
// ─────────────────────────────────────────────────────────────
function DetectiveModCard({ pick, marks, lupa, locked, onChooseLupa, onMarkWord }) {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
      {/* Expediente (cartel principal) */}
      <div style={{
        width: "fit-content", maxWidth: 480,
        background: "linear-gradient(180deg, rgba(255,253,245,0.97), rgba(245,238,225,0.92))",
        border: "3px solid #f2c260",
        borderRadius: 18, padding: "14px 18px 16px 18px",
        boxShadow: "0 12px 26px rgba(0,0,0,0.5)",
        color: "#3a2608",
      }}>
        <div style={{
          fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 11,
          color: "#7a4a0e", letterSpacing: "0.1em",
          textAlign: "center", marginBottom: 10,
          textTransform: "uppercase",
        }}>
          📓 Expediente del caso
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 6 }}>
          {pick.tokens.map((t, i) => {
            if (t.tipo === "n") {
              return (
                <span key={i} style={{
                  display: "inline-block",
                  padding: "6px 14px", borderRadius: 10,
                  background: "linear-gradient(180deg, #ff9a9a, #d94a4a)",
                  color: "#fff", fontWeight: 800,
                  fontFamily: "var(--ed-font-display)", fontSize: 17,
                  border: "2px solid #a31818",
                  boxShadow: "0 3px 7px rgba(0,0,0,0.3)",
                }}>
                  {t.w}
                  <span style={{ fontSize: 8.5, opacity: 0.9, marginLeft: 4, letterSpacing: "0.06em" }}>· NÚCLEO</span>
                </span>
              );
            }
            const choice = marks[i];
            const expected = t.tipo;
            const isCorrect = locked && choice === expected;
            const isWrong = locked && choice && choice !== expected;
            const isEmpty = locked && !choice;

            let bg = "rgba(252,233,168,0.55)";
            let border = "2px dashed rgba(217,164,65,0.6)";
            let color = "#3a2608";
            if (choice === "md") { bg = "linear-gradient(180deg, #b9e3ff, #4f9ee0)"; border = "2px solid #1466a6"; color = "#0a2540"; }
            if (choice === "mi") { bg = "linear-gradient(180deg, #b8efc4, #5fb878)"; border = "2px solid #1e6e2e"; color = "#0a3a18"; }
            if (isCorrect) { border = "2px solid #2ecc8f"; }
            if (isWrong)   { bg = "rgba(255,107,107,0.4)"; border = "2px solid #ff6b6b"; }
            return (
              <span key={i}
                onClick={() => !locked && lupa && onMarkWord(i)}
                style={{
                  display: "inline-block",
                  padding: "6px 14px", borderRadius: 10,
                  background: bg, border, color,
                  fontWeight: 700, fontFamily: "var(--ed-font-display)", fontSize: 17,
                  cursor: locked ? "default" : (lupa ? "pointer" : "not-allowed"),
                  boxShadow: choice ? "0 3px 7px rgba(0,0,0,0.3)" : "none",
                  userSelect: "none",
                  opacity: !locked && !lupa ? 0.85 : 1,
                  transition: "all 0.15s",
                }}>
                {t.w}
                {(isWrong || isEmpty) && (
                  <sup style={{ fontSize: 9, color: "#1e8a5d", marginLeft: 3, fontWeight: 800, letterSpacing: "0.04em" }}>
                    ✓{expected === "md" ? "DIRECTO" : "INDIRECTO"}
                  </sup>
                )}
              </span>
            );
          })}
        </div>
      </div>

      {/* Selector de lupas — texto completo para que el niño no tenga que adivinar siglas */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "center" }}>
        <span style={{
          fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 11,
          color: "#fce9a8", letterSpacing: "0.06em",
        }}>TU LUPA:</span>
        <button
          onClick={() => !locked && onChooseLupa("md")}
          disabled={locked}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 16px", borderRadius: 999,
            background: lupa === "md" ? "linear-gradient(180deg, #b9e3ff, #4f9ee0)" : "rgba(10,6,35,0.55)",
            color: lupa === "md" ? "#0a2540" : "#b9e3ff",
            border: `2px solid ${lupa === "md" ? "#fce9a8" : "#1466a6"}`,
            fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 12,
            letterSpacing: "0.06em",
            cursor: locked ? "default" : "pointer",
            boxShadow: lupa === "md" ? "0 0 14px rgba(79,158,224,0.65)" : "0 3px 6px rgba(0,0,0,0.3)",
            transform: lupa === "md" ? "translateY(-2px)" : "none",
            transition: "all 0.18s",
          }}>
          🔍 DIRECTO
        </button>
        <button
          onClick={() => !locked && onChooseLupa("mi")}
          disabled={locked}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 16px", borderRadius: 999,
            background: lupa === "mi" ? "linear-gradient(180deg, #b8efc4, #5fb878)" : "rgba(10,6,35,0.55)",
            color: lupa === "mi" ? "#0a3a18" : "#b8efc4",
            border: `2px solid ${lupa === "mi" ? "#fce9a8" : "#1e6e2e"}`,
            fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 12,
            letterSpacing: "0.06em",
            cursor: locked ? "default" : "pointer",
            boxShadow: lupa === "mi" ? "0 0 14px rgba(95,184,120,0.65)" : "0 3px 6px rgba(0,0,0,0.3)",
            transform: lupa === "mi" ? "translateY(-2px)" : "none",
            transition: "all 0.18s",
          }}>
          🔍 INDIRECTO
        </button>
      </div>
    </div>
  );
}

// (Sin uso — sustituido por DetectiveModCard, se mantiene como referencia)
function _PintorModCard_DEPRECATED({ pick, colors, locked, onCycle }) {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22 }}>
      {/* Cartel con la frase nominal — fit-content para que se adapte al texto. */}
      <div style={{
        width: "fit-content", maxWidth: 470,
        background: "linear-gradient(180deg, rgba(255,253,245,0.97), rgba(245,238,225,0.92))",
        border: "3px solid #f2c260",
        borderRadius: 18,
        padding: "20px 22px",
        boxShadow: "0 12px 26px rgba(0,0,0,0.5)",
        color: "#3a2608",
        display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 8,
      }}>
        {pick.tokens.map((t, i) => {
          if (t.tipo === "n") {
            // núcleo fijo en rojo (libro EDINUN: el núcleo del sujeto = sustantivo)
            return (
              <span key={i} style={{
                display: "inline-block",
                padding: "5px 12px", borderRadius: 10,
                background: "linear-gradient(180deg, #ff9a9a, #d94a4a)",
                color: "#fff", fontWeight: 800,
                fontFamily: "var(--ed-font-display)", fontSize: 17,
                border: "2px solid #a31818",
                boxShadow: "0 3px 7px rgba(0,0,0,0.3)",
              }}>
                {t.w}
                <span style={{ fontSize: 8.5, opacity: 0.9, marginLeft: 4, letterSpacing: "0.06em" }}>· NÚCLEO</span>
              </span>
            );
          }
          // md o mi → tocable
          const choice = colors[i]; // "md" | "mi" | undefined
          const expected = t.tipo;
          const isCorrect = locked && choice === expected;
          const isWrong = locked && choice && choice !== expected;
          const isEmpty = locked && !choice;

          let bg = "rgba(252,233,168,0.55)";
          let border = "2px dashed rgba(217,164,65,0.6)";
          let color = "#3a2608";
          if (choice === "md") { bg = "linear-gradient(180deg, #b9e3ff, #4f9ee0)"; border = "2px solid #1466a6"; color = "#0a2540"; }
          if (choice === "mi") { bg = "linear-gradient(180deg, #b8efc4, #5fb878)"; border = "2px solid #1e6e2e"; color = "#0a3a18"; }
          if (isCorrect) { border = "2px solid #2ecc8f"; }
          if (isWrong)   { bg = "rgba(255,107,107,0.4)"; border = "2px solid #ff6b6b"; }

          return (
            <span key={i}
              onClick={() => !locked && onCycle(i)}
              style={{
                display: "inline-block",
                padding: "5px 12px", borderRadius: 10,
                background: bg, border,
                color, fontWeight: 700,
                fontFamily: "var(--ed-font-display)", fontSize: 16,
                cursor: locked ? "default" : "pointer",
                boxShadow: choice ? "0 3px 7px rgba(0,0,0,0.3)" : "none",
                userSelect: "none",
                transition: "all 0.15s",
              }}>
              {t.w}
              {(isWrong || isEmpty) && (
                <sup style={{ fontSize: 9, color: "#1e8a5d", marginLeft: 3, fontWeight: 800, letterSpacing: "0.04em" }}>
                  ✓{expected.toUpperCase()}
                </sup>
              )}
            </span>
          );
        })}
      </div>

      {/* Leyenda compacta MD/MI — chips finos, sin texto explicativo extra */}
      <div style={{ display: "flex", gap: 10 }}>
        <span style={{
          background: "linear-gradient(180deg, #b9e3ff, #4f9ee0)",
          color: "#0a2540",
          padding: "4px 16px", borderRadius: 999,
          fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 12,
          border: "1.5px solid #1466a6",
          letterSpacing: "0.06em",
          boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
        }}>MD</span>
        <span style={{
          background: "linear-gradient(180deg, #b8efc4, #5fb878)",
          color: "#0a3a18",
          padding: "4px 16px", borderRadius: 999,
          fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 12,
          border: "1.5px solid #1e6e2e",
          letterSpacing: "0.06em",
          boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
        }}>MI</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// N1 · R3 — Laboratorio de citas: una "probeta" con la frase del
// narrador y los signos como reactivos en la estantería inferior.
// ─────────────────────────────────────────────────────────────
function LabCitasCard({ pick, placed, picked, locked, onPickLabel, onPlaceIn, onSetPlaced }) {
  const usadosPorSigno = {};
  for (const v of Object.values(placed)) {
    usadosPorSigno[v] = (usadosPorSigno[v] || 0) + 1;
  }
  const disponiblesPorSigno = {};
  for (const s of pick.bandeja) {
    disponiblesPorSigno[s] = (disponiblesPorSigno[s] || 0) + 1;
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
      {/* Probeta = cartel verde de "tubo de ensayo" con la cita */}
      <div style={{
        width: "fit-content", maxWidth: 480,
        background: "linear-gradient(180deg, rgba(229,252,239,0.97), rgba(200,238,220,0.92))",
        border: "3px solid #5fb878",
        borderRadius: 22,
        padding: "12px 20px 14px 20px",
        boxShadow: "0 12px 26px rgba(0,0,0,0.5), inset 0 -6px 0 rgba(95,184,120,0.25)",
        color: "#0a3a18",
        position: "relative",
      }}>
        <div style={{
          fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 11,
          color: "#1e6e2e", letterSpacing: "0.1em",
          textAlign: "center", marginBottom: 8,
          textTransform: "uppercase",
        }}>🧪 Probeta — cita en proceso</div>
        <div style={{
          display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 4,
          fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 16, lineHeight: 1.6,
        }}>
          {pick.partes.map((p, i) => {
            if (p.t) {
              return <span key={i} style={{ padding: "0 4px" }}>{p.t}</span>;
            }
            const val = placed[i];
            const expected = p.s;
            const isCorrect = locked && val === expected;
            const isWrong = locked && val && val !== expected;
            const isEmpty = locked && !val;

            let bg = "rgba(255,255,255,0.85)";
            let border = "2px dashed rgba(30,110,46,0.6)";
            let color = "#0a3a18";
            if (val) {
              bg = "linear-gradient(180deg, #fce9a8, #d9a441)";
              border = "2px solid #b48817";
              color = "#3a2608";
            }
            if (isCorrect) { bg = "rgba(46,204,143,0.55)"; border = "2px solid #2ecc8f"; }
            if (isWrong)   { bg = "rgba(255,107,107,0.5)"; border = "2px solid #ff6b6b"; }

            return (
              <span key={i}
                data-dropzone={`citaslot:${i}`}
                onClick={() => onPlaceIn(i)}
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  minWidth: 28, minHeight: 32,
                  padding: "0 6px", margin: "0 1px",
                  borderRadius: 8,
                  background: bg, border, color,
                  fontWeight: 800,
                  fontFamily: "var(--ed-font-display)", fontSize: 18,
                  cursor: locked ? "default" : "pointer",
                  userSelect: "none",
                  boxShadow: val ? "0 2px 5px rgba(0,0,0,0.25)" : "none",
                  transition: "all 0.15s",
                }}>
                {val || "▢"}
                {(isWrong || isEmpty) && (
                  <sup style={{ fontSize: 9, color: "#1e8a5d", marginLeft: 2, fontWeight: 800 }}>
                    ✓{expected === '"' ? "”" : expected}
                  </sup>
                )}
              </span>
            );
          })}
        </div>
      </div>

      {/* Estantería de reactivos */}
      <div data-qa="bandeja" style={{
        width: "fit-content",
        background: "rgba(10,6,35,0.55)",
        border: "1.5px solid rgba(95,184,120,0.45)",
        borderRadius: 16,
        padding: "8px 14px",
        display: "flex", gap: 10, justifyContent: "center", alignItems: "center",
        position: "relative",
      }}>
        <div style={{
          position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
          background: "rgba(10,6,35,0.85)",
          color: "#b8efc4", padding: "2px 10px", borderRadius: 999,
          fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 9.5,
          letterSpacing: "0.1em",
          border: "1px solid rgba(95,184,120,0.5)",
        }}>REACTIVOS</div>
        {Object.keys(disponiblesPorSigno).map((signo) => {
          const restante = disponiblesPorSigno[signo] - (usadosPorSigno[signo] || 0);
          const isPicked = picked === signo;
          if (restante <= 0) return (
            <div key={signo} style={{
              padding: "8px 14px", borderRadius: 10,
              background: "rgba(255,255,255,0.05)",
              border: "2px dashed rgba(252,233,168,0.2)",
              color: "rgba(252,233,168,0.3)",
              fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 20,
              minWidth: 50, textAlign: "center",
            }}>
              {signo === '"' ? "”" : signo}
            </div>
          );
          return (
            <div key={signo}
              className="ed-draggable"
              onPointerDown={makeDragHandler({
                item: signo,
                ghostHtml: `<div style="background:#fce9a8;color:#3a2608;padding:8px 18px;border-radius:10px;font-family:Fredoka,Nunito,sans-serif;font-weight:800;font-size:20px;border:2px solid #4fd8ff;box-shadow:0 8px 22px rgba(0,0,0,0.5);">${signo === '"' ? '&quot;' : signo}</div>`,
                onTap: () => onPickLabel(signo),
                onDrop: (zoneId, item) => {
                  if (zoneId && zoneId.startsWith("citaslot:") && onSetPlaced) {
                    const slotIdx = parseInt(zoneId.slice("citaslot:".length), 10);
                    const next = { ...placed };
                    next[slotIdx] = item;
                    onSetPlaced(next);
                  }
                },
                disabled: locked,
              })}
              style={{
                padding: "8px 14px", borderRadius: 10,
                background: isPicked ? "linear-gradient(180deg,#fce9a8,#d9a441)" : "rgba(255,255,255,0.94)",
                color: "#3a2608",
                border: `2px solid ${isPicked ? "#4fd8ff" : "rgba(242,194,96,0.6)"}`,
                fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 22,
                cursor: locked ? "default" : "grab",
                boxShadow: isPicked ? "0 0 16px rgba(79,216,255,0.65)" : "0 3px 7px rgba(0,0,0,0.3)",
                transform: isPicked ? "translateY(-2px)" : "none",
                transition: "all 0.15s",
                minWidth: 50, textAlign: "center",
                userSelect: "none",
                position: "relative",
              }}>
              {signo === '"' ? "”" : signo}
              {restante > 1 && (
                <span style={{
                  position: "absolute", top: -8, right: -8,
                  width: 22, height: 22, borderRadius: "50%",
                  background: "#4fd8ff", color: "#0a2540",
                  fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 12,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "2px solid #fff",
                  boxShadow: "0 2px 5px rgba(0,0,0,0.4)",
                }}>×{restante}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// (Sin uso — sustituido por LabCitasCard, se mantiene como referencia)
function _SastreCitasCard_DEPRECATED({ pick, placed, picked, locked, onPickLabel, onPlaceIn, onSetPlaced }) {
  // Construye banda: cada signo por separado, sin duplicados removidos al usarlos (porque hay dos `"`)
  // Cuento qué slots tienen cada signo, y la bandeja muestra el restante.
  const usadosPorSigno = {};
  for (const v of Object.values(placed)) {
    usadosPorSigno[v] = (usadosPorSigno[v] || 0) + 1;
  }
  const disponiblesPorSigno = {};
  for (const s of pick.bandeja) {
    disponiblesPorSigno[s] = (disponiblesPorSigno[s] || 0) + 1;
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22 }}>
      {/* Cartel con la frase — fit-content para que se adapte al texto. */}
      <div style={{
        width: "fit-content", maxWidth: 470,
        background: "linear-gradient(180deg, rgba(255,253,245,0.97), rgba(245,238,225,0.92))",
        border: "3px solid #f2c260",
        borderRadius: 18,
        padding: "18px 22px",
        boxShadow: "0 12px 26px rgba(0,0,0,0.5)",
        color: "#3a2608",
        display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 4,
        fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 16, lineHeight: 1.6,
      }}>
        {pick.partes.map((p, i) => {
          if (p.t) {
            return <span key={i} style={{ padding: "0 4px" }}>{p.t}</span>;
          }
          // slot
          const val = placed[i];
          const expected = p.s;
          const isCorrect = locked && val === expected;
          const isWrong = locked && val && val !== expected;
          const isEmpty = locked && !val;

          let bg = "rgba(252,233,168,0.5)";
          let border = "2px dashed rgba(217,164,65,0.6)";
          let color = "#3a2608";
          if (val) {
            bg = "linear-gradient(180deg, #fce9a8, #d9a441)";
            border = "2px solid #b48817";
          }
          if (isCorrect) { bg = "rgba(46,204,143,0.5)"; border = "2px solid #2ecc8f"; }
          if (isWrong)   { bg = "rgba(255,107,107,0.5)"; border = "2px solid #ff6b6b"; }

          return (
            <span key={i}
              data-dropzone={`citaslot:${i}`}
              onClick={() => onPlaceIn(i)}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                minWidth: 26, minHeight: 30,
                padding: "0 6px", margin: "0 1px",
                borderRadius: 8,
                background: bg, border,
                color, fontWeight: 800,
                fontFamily: "var(--ed-font-display)", fontSize: 18,
                cursor: locked ? "default" : "pointer",
                userSelect: "none",
                boxShadow: val ? "0 2px 5px rgba(0,0,0,0.25)" : "none",
                transition: "all 0.15s",
              }}>
              {val || "▢"}
              {(isWrong || isEmpty) && (
                <sup style={{ fontSize: 9, color: "#1e8a5d", marginLeft: 2, fontWeight: 800 }}>
                  ✓{expected === '"' ? "”" : expected}
                </sup>
              )}
            </span>
          );
        })}
      </div>

      {/* Bandeja con los 4 signos */}
      <div data-qa="bandeja" style={{
        width: "100%", maxWidth: 380,
        background: "rgba(10,6,35,0.55)",
        border: "1px dashed rgba(252,233,168,0.4)",
        borderRadius: 14,
        padding: "10px 12px",
        display: "flex", gap: 10, justifyContent: "center", alignItems: "center",
      }}>
        {Object.keys(disponiblesPorSigno).map((signo) => {
          const restante = disponiblesPorSigno[signo] - (usadosPorSigno[signo] || 0);
          const isPicked = picked === signo;
          if (restante <= 0) return (
            <div key={signo} style={{
              padding: "8px 14px", borderRadius: 10,
              background: "rgba(255,255,255,0.05)",
              border: "2px dashed rgba(252,233,168,0.2)",
              color: "rgba(252,233,168,0.3)",
              fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 20,
              minWidth: 50, textAlign: "center",
            }}>
              {signo === '"' ? "”" : signo}
            </div>
          );
          return (
            <div key={signo}
              className="ed-draggable"
              onPointerDown={makeDragHandler({
                item: signo,
                ghostHtml: `<div style="background:#fce9a8;color:#3a2608;padding:8px 18px;border-radius:10px;font-family:Fredoka,Nunito,sans-serif;font-weight:800;font-size:20px;border:2px solid #4fd8ff;box-shadow:0 8px 22px rgba(0,0,0,0.5);">${signo === '"' ? '&quot;' : signo}</div>`,
                onTap: () => onPickLabel(signo),
                onDrop: (zoneId, item) => {
                  if (zoneId && zoneId.startsWith("citaslot:") && onSetPlaced) {
                    const slotIdx = parseInt(zoneId.slice("citaslot:".length), 10);
                    const next = { ...placed };
                    next[slotIdx] = item;
                    onSetPlaced(next);
                  }
                },
                disabled: locked,
              })}
              style={{
                padding: "8px 14px", borderRadius: 10,
                background: isPicked ? "linear-gradient(180deg,#fce9a8,#d9a441)" : "rgba(255,255,255,0.94)",
                color: "#3a2608",
                border: `2px solid ${isPicked ? "#4fd8ff" : "rgba(242,194,96,0.6)"}`,
                fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 22,
                cursor: locked ? "default" : "grab",
                boxShadow: isPicked ? "0 0 16px rgba(79,216,255,0.65)" : "0 3px 7px rgba(0,0,0,0.3)",
                transform: isPicked ? "translateY(-2px)" : "none",
                transition: "all 0.15s",
                minWidth: 50, textAlign: "center",
                userSelect: "none",
                position: "relative",
              }}>
              {signo === '"' ? "”" : signo}
              {restante > 1 && (
                <span style={{
                  position: "absolute", top: -8, right: -8,
                  width: 22, height: 22, borderRadius: "50%",
                  background: "#4fd8ff", color: "#0a2540",
                  fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 12,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "2px solid #fff",
                  boxShadow: "0 2px 5px rgba(0,0,0,0.4)",
                }}>×{restante}</span>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// N2 · El narrador — 3 rondas distintas
// ─────────────────────────────────────────────────────────────
function NarradorGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "El narrador";

  const [ronda, setRonda] = useStateG(0);

  // R1 — Palabras mágicas: { huecoId: opcionElegida }
  const [r1Selections, setR1Selections] = useStateG({});
  const [r1Locked, setR1Locked] = useStateG(false);

  // R2 — Partes del cuento: { fragmentoId: parteAsignada }
  const [r2Assigned, setR2Assigned] = useStateG({});
  const [r2SelectedPart, setR2SelectedPart] = useStateG(null);
  const [r2Locked, setR2Locked] = useStateG(false);

  // R3 — Ordena el cuento: array de orden (escenas)
  const [r3Pick] = useStateG(() => {
    const recent = new Set(getRecent("narrador"));
    let pool = ORDEN_BANK.filter((p) => !recent.has("ord:" + p.id));
    if (pool.length === 0) pool = ORDEN_BANK;
    const p = pool[Math.floor(Math.random() * pool.length)];
    pushRecent("narrador", "ord:" + p.id);
    return p;
  });
  const [r3Order, setR3Order] = useStateG(() => {
    // mezclar pero asegurando no quedar ya ordenado
    let mixed = shuffle(r3Pick.escenas);
    let safety = 0;
    while (mixed.every((e, i) => e.n === i + 1) && safety < 5) {
      mixed = shuffle(r3Pick.escenas);
      safety++;
    }
    return mixed;
  });
  const [r3Selected, setR3Selected] = useStateG(null);
  const [r3Locked, setR3Locked] = useStateG(false);

  // Picks R1/R2
  const [r1Pick] = useStateG(() => {
    const recent = new Set(getRecent("narrador"));
    let pool = MAGICAS_BANK.filter((p) => !recent.has("mag:" + p.id));
    if (pool.length === 0) pool = MAGICAS_BANK;
    const p = pool[Math.floor(Math.random() * pool.length)];
    pushRecent("narrador", "mag:" + p.id);
    return p;
  });

  const [r2Pick] = useStateG(() => {
    const recent = new Set(getRecent("narrador"));
    let pool = PARTES_BANK.filter((p) => !recent.has("part:" + p.id));
    if (pool.length === 0) pool = PARTES_BANK;
    const p = pool[Math.floor(Math.random() * pool.length)];
    pushRecent("narrador", "part:" + p.id);
    return p;
  });
  // Fragmentos en orden mezclado para que no aparezcan ya bien
  const [r2Fragmentos] = useStateG(() => shuffle(r2Pick.fragmentos));

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
    window.__currentChalkGlyphs = [
      { c: "📖", l: "6%",  t: "12%", r: "-8deg" },
      { c: "🗣", l: "82%", t: "16%", r: "6deg",  s: "0.6em" },
      { c: "💬", l: "10%", t: "78%", r: "12deg", s: "0.65em" },
      { c: "✨", l: "88%", t: "72%", r: "-10deg", s: "0.55em" },
      { c: "👤", l: "45%", t: "8%",  r: "4deg",  s: "0.55em" },
      { c: "📍", l: "3%",  t: "45%", r: "-4deg", s: "0.55em" },
      { c: "🎭", l: "92%", t: "45%", r: "8deg",  s: "0.5em" },
      { c: "?",  l: "30%", t: "55%", r: "-6deg", s: "0.6em" },
      { c: "→",  l: "70%", t: "62%", r: "8deg",  s: "0.6em" },
      { c: "★",  l: "55%", t: "30%", r: "-4deg", s: "0.5em" },
    ];
    return () => { window.__currentChalkGlyphs = null; };
  }, []);

  const r1AllSelected = r1Pick.huecos.every((h) => r1Selections[h.id]);
  const r2AllAssigned = r2Fragmentos.every((f) => r2Assigned[f.id]);
  const r3InOrder = true; // R3 siempre puede verificar; el chequeo es contra el orden actual

  const canVerify =
    ronda === 0 ? (r1AllSelected && !r1Locked) :
    ronda === 1 ? (r2AllAssigned && !r2Locked) :
    ronda === 2 ? (!r3Locked) :
    false;
  const showErase = true;

  function handleVerify() {
    if (!canVerify) return;
    if (ronda === 0) {
      setR1Locked(true);
      let correct = true;
      for (const h of r1Pick.huecos) {
        if (r1Selections[h.id] !== h.correcta) { correct = false; break; }
      }
      const userText = r1Pick.huecos.map((h) => `${r1Selections[h.id] || "?"}`).join(" / ");
      const correctText = r1Pick.huecos.map((h) => h.correcta).join(" / ");
      setTimeout(() => answer(correct, userText, correctText, "🪄"), 350);
    } else if (ronda === 1) {
      setR2Locked(true);
      let correct = true;
      for (const f of r2Fragmentos) {
        if (r2Assigned[f.id] !== f.parte) { correct = false; break; }
      }
      const userText = r2Fragmentos.map((f) => `${f.id}=${r2Assigned[f.id] || "?"}`).join(", ");
      const correctText = r2Fragmentos.map((f) => `${f.id}=${f.parte}`).join(", ");
      setTimeout(() => answer(correct, userText, correctText, "🗂"), 350);
    } else if (ronda === 2) {
      setR3Locked(true);
      let correct = true;
      for (let i = 0; i < r3Order.length; i++) {
        if (r3Order[i].n !== i + 1) { correct = false; break; }
      }
      const userText = r3Order.map((e) => `${e.n}`).join(" → ");
      const correctText = r3Order.map((_, i) => `${i + 1}`).join(" → ");
      setTimeout(() => answer(correct, userText, correctText, "📚"), 350);
    }
  }

  function handleErase() {
    if (ronda === 0) { if (r1Locked) return; setR1Selections({}); }
    else if (ronda === 1) { if (r2Locked) return; setR2Assigned({}); setR2SelectedPart(null); }
    else if (ronda === 2) {
      if (r3Locked) return;
      let mixed = shuffle(r3Pick.escenas);
      let safety = 0;
      while (mixed.every((e, i) => e.n === i + 1) && safety < 5) { mixed = shuffle(r3Pick.escenas); safety++; }
      setR3Order(mixed); setR3Selected(null);
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

    setFeedback(isCorrect ? "ok" : "err");
    setFeedbackMsg(isCorrect ? `+${earned} ⭐` : ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]);
    setAttempted(newAttempted);
    setSolved(newSolved);
    setStars(newStarsTotal);
    setStarsSession(newStarsSession);
    setLog(newLog);

    const wait = isCorrect ? 950 : 1400;
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

  const enunciado =
    ronda === 0 ? `Completa con la palabra mágica — ${r1Pick.titulo}.` :
    ronda === 1 ? `Clasifica cada parte del cuento — ${r2Pick.titulo}.` :
    `Ordena las escenas del cuento — ${r3Pick.titulo}.`;

  const bocadillo =
    ronda === 0 ? "Toca la palabra que encaja en cada frase." :
    ronda === 1 ? "Toca una etiqueta y luego una frase." :
    "Toca dos escenas para intercambiarlas.";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <GameHUD elapsed={elapsed} stars={stars} attempted={attempted} solved={solved} total={3} app={app} setApp={setApp} />
      <CharacterCorner char={char} message={bocadillo} />
      <GameEnunciado text={enunciado} />

      <div data-qa="zona-central" style={{
        position: "absolute", top: 116, left: 244, width: 488, bottom: 14,
      }}>
        {ronda === 0 && (
          <PalabrasMagicasCard
            pick={r1Pick}
            selections={r1Selections}
            locked={r1Locked}
            onChoose={(huecoId, op) => {
              if (r1Locked) return;
              setR1Selections({ ...r1Selections, [huecoId]: op });
            }}
          />
        )}
        {ronda === 1 && (
          <PartesCuentoCard
            pick={r2Pick}
            fragmentos={r2Fragmentos}
            assigned={r2Assigned}
            selectedPart={r2SelectedPart}
            locked={r2Locked}
            onSelectPart={(p) => { if (r2Locked) return; setR2SelectedPart(r2SelectedPart === p ? null : p); }}
            onAssign={(fid, parte) => {
              if (r2Locked) return;
              const next = { ...r2Assigned };
              if (parte) next[fid] = parte;
              else delete next[fid];
              setR2Assigned(next);
            }}
          />
        )}
        {ronda === 2 && (
          <OrdenaCuentoCard
            cuento={r3Pick}
            order={r3Order}
            selected={r3Selected}
            locked={r3Locked}
            onTap={(i) => {
              if (r3Locked) return;
              if (r3Selected === null) { setR3Selected(i); return; }
              if (r3Selected === i) { setR3Selected(null); return; }
              const next = [...r3Order];
              [next[r3Selected], next[i]] = [next[i], next[r3Selected]];
              setR3Order(next);
              setR3Selected(null);
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
// N2 · R1 — Palabras mágicas (multi-choice por hueco)
// ─────────────────────────────────────────────────────────────
function PalabrasMagicasCard({ pick, selections, locked, onChoose }) {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
      <div style={{
        width: "fit-content", maxWidth: 470,
        background: "linear-gradient(180deg, rgba(255,253,245,0.97), rgba(245,238,225,0.92))",
        border: "3px solid #f2c260",
        borderRadius: 16, padding: "12px 14px",
        boxShadow: "0 10px 22px rgba(0,0,0,0.45)",
        color: "#3a2608",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {pick.huecos.map((h, i) => {
            const userPick = selections[h.id];
            const isCorrect = locked && userPick === h.correcta;
            const isWrong = locked && userPick && userPick !== h.correcta;
            return (
              <div key={h.id} style={{
                display: "flex", flexDirection: "column", gap: 5,
                padding: "6px 8px",
                background: isCorrect ? "rgba(46,204,143,0.18)" : isWrong ? "rgba(255,107,107,0.18)" : "rgba(252,233,168,0.18)",
                borderRadius: 10,
                border: isCorrect ? "1.5px solid #2ecc8f" : isWrong ? "1.5px solid #ff6b6b" : "1.5px solid rgba(217,164,65,0.35)",
              }}>
                <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 12.5, lineHeight: 1.3, textAlign: "center" }}>
                  <span style={{ color: "#999", fontWeight: 600, marginRight: 4 }}>{i + 1}.</span>
                  {h.frase.split("___").map((segment, idx, arr) => (
                    <React.Fragment key={idx}>
                      <span>{segment}</span>
                      {idx < arr.length - 1 && (
                        <span style={{
                          display: "inline-block",
                          minWidth: 90, padding: "1px 6px",
                          background: userPick ? "rgba(252,233,168,0.85)" : "rgba(0,0,0,0.08)",
                          border: "1.5px dashed rgba(217,164,65,0.6)",
                          borderRadius: 6,
                          fontWeight: 800, color: userPick ? "#3a2608" : "rgba(58,38,8,0.4)",
                        }}>
                          {userPick || "___"}
                        </span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 5, justifyContent: "center", flexWrap: "wrap" }}>
                  {h.opciones.map((op) => {
                    const isPicked = userPick === op;
                    const isCorrectAns = op === h.correcta;
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
                          padding: "5px 12px", borderRadius: 9,
                          background: bg,
                          color: col,
                          border: bd,
                          fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 11.5,
                          cursor: locked ? "default" : "pointer",
                          boxShadow: shadow,
                          transform: (isPicked && !locked) || showCorrect ? "translateY(-1.5px)" : "none",
                          transition: "all 0.15s",
                          minWidth: 80,
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
// N2 · R2 — Partes del cuento: 5 etiquetas + 5 fragmentos
// ─────────────────────────────────────────────────────────────
function PartesCuentoCard({ pick, fragmentos, assigned, selectedPart, locked, onSelectPart, onAssign }) {
  const PARTES = [
    { id: "lugar",      label: "LUGAR",      emoji: "📍", color: "#7ab8ff", ink: "#08264d" },
    { id: "personajes", label: "PERSONAJES", emoji: "👤", color: "#ffb87a", ink: "#3a2608" },
    { id: "conflicto",  label: "CONFLICTO",  emoji: "❗",  color: "#ff8ab4", ink: "#5c1f3a" },
    { id: "acciones",   label: "ACCIONES",   emoji: "🏃", color: "#c39cff", ink: "#2a0a4a" },
    { id: "resolucion", label: "FINAL",      emoji: "✨", color: "#9ee0a3", ink: "#0a3a18" },
  ];

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
      {/* Fila de 5 etiquetas selectoras */}
      <div style={{
        width: "100%", maxWidth: 470,
        display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4,
      }}>
        {PARTES.map((p) => {
          const isSel = selectedPart === p.id;
          return (
            <button key={p.id}
              onClick={() => !locked && onSelectPart(p.id)}
              disabled={locked}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
                background: isSel ? "linear-gradient(180deg,#fce9a8,#d9a441)" : p.color,
                color: isSel ? "#3a2608" : p.ink,
                padding: "5px 4px", borderRadius: 9,
                border: `2px solid ${isSel ? "#4fd8ff" : "rgba(255,255,255,0.6)"}`,
                fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 10,
                letterSpacing: "0.03em",
                boxShadow: isSel ? "0 0 12px rgba(79,216,255,0.6)" : "0 3px 6px rgba(0,0,0,0.3)",
                cursor: locked ? "default" : "pointer",
                transform: isSel ? "translateY(-2px)" : "none",
                transition: "all 0.15s",
              }}>
              <span style={{ fontSize: 14 }}>{p.emoji}</span>
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>

      {/* Lista de fragmentos — fit-content para que se adapte al texto. */}
      <div style={{
        width: "fit-content", maxWidth: 470,
        display: "flex", flexDirection: "column", gap: 4,
      }}>
        {fragmentos.map((f) => {
          const a = assigned[f.id];
          const isCorrect = locked && a === f.parte;
          const isWrong = locked && a && a !== f.parte;
          const isEmpty = locked && !a;
          const partInfo = PARTES.find((p) => p.id === a);
          const correctPart = PARTES.find((p) => p.id === f.parte);
          return (
            <div key={f.id}
              onClick={() => {
                if (locked) return;
                if (a) { onAssign(f.id, null); return; } // 2do click = quitar
                if (selectedPart) { onAssign(f.id, selectedPart); }
              }}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: isCorrect
                  ? "linear-gradient(180deg, rgba(46,204,143,0.32), rgba(255,255,255,0.95))"
                  : isWrong
                  ? "linear-gradient(180deg, rgba(255,107,107,0.28), rgba(255,255,255,0.95))"
                  : a ? `linear-gradient(180deg, ${partInfo.color}44, rgba(255,255,255,0.95))`
                      : "rgba(255,255,255,0.94)",
                color: "#3a2608",
                border: `2px solid ${isCorrect ? "#2ecc8f" : isWrong ? "#ff6b6b" : a ? partInfo.color : "rgba(242,194,96,0.6)"}`,
                borderRadius: 10, padding: "6px 10px",
                cursor: locked ? "default" : "pointer",
                fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 11.5, lineHeight: 1.25,
                boxShadow: "0 2px 5px rgba(0,0,0,0.25)",
                transition: "all 0.15s",
              }}>
              <div style={{ flex: 1, minWidth: 0 }}>{f.texto}</div>
              {a && !isWrong && (
                <div style={{
                  flexShrink: 0,
                  background: partInfo.color, color: partInfo.ink,
                  padding: "2px 8px", borderRadius: 999,
                  fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 9.5,
                  border: "1.5px solid rgba(255,255,255,0.7)",
                  letterSpacing: "0.04em",
                }}>
                  {partInfo.emoji} {partInfo.label}
                </div>
              )}
              {isWrong && correctPart && (
                <div style={{
                  flexShrink: 0,
                  background: "#2ecc8f", color: "#fff",
                  padding: "2px 8px", borderRadius: 999,
                  fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 9.5,
                  letterSpacing: "0.04em",
                }}>
                  ✓ {correctPart.label}
                </div>
              )}
              {isEmpty && correctPart && (
                <div style={{
                  flexShrink: 0,
                  background: "rgba(46,204,143,0.2)", color: "#1e8a5d",
                  border: "1px solid rgba(46,204,143,0.6)",
                  padding: "2px 8px", borderRadius: 999,
                  fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 9.5,
                }}>
                  ✓ {correctPart.label}
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
// N2 · R3 — Ordena el cuento (tap-tap intercambia)
// ─────────────────────────────────────────────────────────────
function OrdenaCuentoCard({ cuento, order, selected, locked, onTap }) {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
      <div style={{
        fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 13.5, color: "#fce9a8", textAlign: "center",
        background: "rgba(10,6,35,0.55)",
        border: "1px solid rgba(242,194,96,0.45)",
        borderRadius: 999,
        padding: "5px 18px",
      }}>
        📖 {cuento.titulo}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, width: "fit-content", maxWidth: 480 }}>
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
                borderRadius: 12, padding: "6px 10px",
                cursor: locked ? "default" : "pointer",
                boxShadow: isSelected ? "0 0 18px rgba(79,216,255,0.65)" : "0 3px 8px rgba(0,0,0,0.35)",
                transform: isSelected ? "translateX(5px)" : "none",
                transition: "all 0.18s",
              }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%",
                background: "linear-gradient(180deg, #f2c260, #d9a441)",
                color: "#3a2608", fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 13,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                border: "2px solid rgba(255,255,255,0.9)",
                boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
              }}>
                {i + 1}
              </div>
              <div style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{escena.emoji}</div>
              <div style={{ flex: 1, minWidth: 0, fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 11.5, lineHeight: 1.25 }}>
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
