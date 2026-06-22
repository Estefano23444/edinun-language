// game-screens.jsx — GameScreen + ResultsScreen para JUEGO-15
// "El cuaderno de mis memorias" (TEMA 1 del libro EDINUN, 10 años). 1 nivel,
// 3 rondas con mecánicas DISTINTAS (estándar 7+ años):
//   R1 — El camino de los recuerdos: tablero; el personaje avanza al acertar.
//   R2 — La línea del tiempo: ordenar los momentos de una memoria (antes→ahora).
//   R3 — El tono justo: elegir la palabra evocadora en vez de la fría.
//
// El shell (HUD, personaje, enunciado, action rail, modales, feedback, reporte
// académico, scoring por tiempo) se hereda del estándar (igual que juego-13).
// Solo cambian los bancos de datos y las 3 Cards de mecánica.

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
  "¡Casi! Sigue recordando.",
  "Cada recuerdo cuenta una historia.",
  "¡La próxima la sientes mejor!",
  "Equivocarse también deja recuerdos.",
  "Las memorias se escriben con calma.",
  "¡Vamos por la siguiente!",
  "Lee con el corazón.",
];

// ─────────────────────────────────────────────────────────────
// FIFO anti-repetición por categoría (cam / tl / tono) en un solo
// key de localStorage. Ventana floor(N/2) por categoría (estándar 12),
// así el pool nunca se vacía y no se repite la última jugada.
// ─────────────────────────────────────────────────────────────
const RECENT_KEY = "edinun_juego15_recientes_v1";
const RECENT_LIMIT = 30;

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
// BANCOS DE DATOS — TEMA 1 (memorias como género literario).
// Vocabulario y ejemplos ecuatorianos. Sin jerga técnica.
// ═════════════════════════════════════════════════════════════

// R1 — El camino de los recuerdos: mini-retos de opción sobre el género.
// Cada paso tiene 2-3 opciones; una sola correcta (ok:true).
const R1_BANK = [
  { id: "narr1", q: "“Cuando yo era niño, aprendí a nadar en el río.” ¿Quién narra?",
    options: [{ t: "El protagonista", ok: true }, { t: "Un testigo", ok: false }] },
  { id: "narr2", q: "“Vi a mi hermano ganar la carrera del colegio.” ¿Quién narra?",
    options: [{ t: "Un testigo", ok: true }, { t: "El protagonista", ok: false }] },
  { id: "cuando", q: "¿Cuándo se escribe una memoria?",
    options: [{ t: "Después de vivir lo que cuenta", ok: true }, { t: "Justo mientras sucede", ok: false }, { t: "Antes de que ocurra", ok: false }] },
  { id: "persona", q: "¿En qué persona se escribe una memoria?",
    options: [{ t: "En primera persona (yo)", ok: true }, { t: "En tercera persona (él)", ok: false }] },
  { id: "busca", q: "¿Qué busca transmitir una memoria?",
    options: [{ t: "Emociones y recuerdos", ok: true }, { t: "Solo fechas y datos", ok: false }, { t: "Reglas y fórmulas", ok: false }] },
  { id: "nolleva", q: "¿Qué NO es propio de una memoria?",
    options: [{ t: "El lenguaje frío y técnico", ok: true }, { t: "El lenguaje personal", ok: false }] },
  { id: "exacta", q: "¿Una memoria debe ser exacta palabra por palabra?",
    options: [{ t: "No, puede llenar los vacíos", ok: true }, { t: "Sí, todo debe ser exacto", ok: false }] },
  { id: "mezcla", q: "¿Qué mezcla una memoria?",
    options: [{ t: "El pasado con el presente", ok: true }, { t: "Solo el futuro", ok: false }] },
  { id: "diario", q: "¿En qué se diferencia una memoria de un diario?",
    options: [{ t: "La memoria reflexiona sobre lo que ya pasó", ok: true }, { t: "La memoria se escribe cada día sin pensar", ok: false }] },
  { id: "tono", q: "¿Cómo es el tono de una memoria?",
    options: [{ t: "Íntimo y cercano", ok: true }, { t: "Serio y de manual", ok: false }] },
  { id: "lugar", q: "“Aún recuerdo el olor de la cocina de mi abuela.” ¿Qué evoca?",
    options: [{ t: "Un recuerdo con los sentidos", ok: true }, { t: "Una receta de cocina", ok: false }] },
  { id: "sentir", q: "¿Qué hace especial a una memoria?",
    options: [{ t: "Que cuenta lo vivido con emoción", ok: true }, { t: "Que enumera datos exactos", ok: false }] },
  { id: "final", q: "¿Cómo suele cerrar una memoria?",
    options: [{ t: "Con una reflexión sobre lo vivido", ok: true }, { t: "Con una lista de tareas", ok: false }] },
  { id: "voz", q: "¿Con qué voz se cuenta una memoria?",
    options: [{ t: "Con la voz de quien lo vivió", ok: true }, { t: "Con la voz de un narrador ajeno", ok: false }] },
];

// R2 — La línea del tiempo: 3 momentos de una memoria, en orden
// (0 = más antiguo, 1 = después, 2 = ahora/reflexión). Frases cortas.
const R2_BANK = [
  { id: "playa", frags: [
    "De niño jugaba descalzo en la playa de Manabí.",
    "Después me mudé a Quito y extrañaba el mar.",
    "Hoy, al oír las olas, vuelvo a sentirme niño.",
  ] },
  { id: "pan", frags: [
    "Mi abuela me enseñó a hacer pan de pequeña.",
    "Con los años aprendí muchas recetas más.",
    "Ahora su olor a pan me trae su recuerdo.",
  ] },
  { id: "leer", frags: [
    "En la escuela me costaba leer en voz alta.",
    "Practiqué mucho con los cuentos de mi tío.",
    "Hoy leer es lo que más me gusta.",
  ] },
  { id: "noche", frags: [
    "De pequeño le tenía miedo a la oscuridad.",
    "Mi papá me regaló un mapa de estrellas.",
    "Ahora la noche es mi momento favorito.",
  ] },
  { id: "bici", frags: [
    "De pequeño me caía mucho aprendiendo a montar bicicleta.",
    "Con práctica logré dar mi primera vuelta al patio.",
    "Hoy le enseño a mi hermana a no rendirse.",
  ] },
  { id: "banos", frags: [
    "Cada año viajábamos a Baños de vacaciones.",
    "Crecimos y dejamos de ir todos juntos.",
    "Ahora guardo esas fotos como un tesoro.",
  ] },
  { id: "rio", frags: [
    "De niño nadaba en el río con mis primos.",
    "Luego nos mudamos lejos del agua.",
    "Hoy, al ver un río, sonrío sin querer.",
  ] },
  { id: "perro", frags: [
    "Cuando cumplí ocho años me regalaron un perro.",
    "Crecimos juntos por muchos años.",
    "Ahora su collar guarda todos sus juegos.",
  ] },
  { id: "feria", frags: [
    "De pequeña iba a la feria con mi abuelo.",
    "Después él ya no pudo caminar tanto.",
    "Hoy llevo a mi prima y lo recuerdo a él.",
  ] },
  { id: "colegio", frags: [
    "El primer día de clases lloré en la puerta.",
    "Con el tiempo hice amigos para siempre.",
    "Ahora extraño esas aulas con cariño.",
  ] },
];

// R3 — El tono justo: una memoria con un hueco; el niño elige el final
// EVOCADOR (ok) frente a uno plano y otro frío/de manual.
const R3_BANK = [
  { id: "casa", stem: "Cuando volví a mi antigua casa, al abrir la puerta…", options: [
    { t: "se me hizo un nudo en la garganta.", ok: true },
    { t: "entré y miré las paredes.", ok: false },
    { t: "comprobé que todo siguiera en su sitio.", ok: false },
  ] },
  { id: "abuela", stem: "El día que mi abuela se fue, yo…", options: [
    { t: "sentí que el mundo se quedaba en silencio.", ok: true },
    { t: "me puse algo triste ese rato.", ok: false },
    { t: "anoté la fecha en mi cuaderno.", ok: false },
  ] },
  { id: "mar", stem: "La primera vez que vi el mar,…", options: [
    { t: "el corazón me latió como un tambor.", ok: true },
    { t: "vi mucha agua de color azul.", ok: false },
    { t: "medí la temperatura del agua.", ok: false },
  ] },
  { id: "escuela", stem: "Al recordar mi escuela,…", options: [
    { t: "vuelvo a oler la tiza y oír las risas.", ok: true },
    { t: "pienso en el edificio grande.", ok: false },
    { t: "reviso los datos de la matrícula.", ok: false },
  ] },
  { id: "partido", stem: "Cuando ganamos el partido,…", options: [
    { t: "salté de alegría hasta quedarme sin voz.", ok: true },
    { t: "el marcador quedó a favor.", ok: false },
    { t: "anoté el resultado final.", ok: false },
  ] },
  { id: "lluvia", stem: "Aquella tarde de lluvia, mi mamá y yo…", options: [
    { t: "nos abrazamos viendo caer las gotas.", ok: true },
    { t: "nos quedamos dentro de casa.", ok: false },
    { t: "consultamos el pronóstico del clima.", ok: false },
  ] },
  { id: "cumple", stem: "El día de mi cumpleaños número diez,…", options: [
    { t: "sentí que todos cabían en mi pecho.", ok: true },
    { t: "soplé las velas del pastel.", ok: false },
    { t: "conté cuántos invitados llegaron.", ok: false },
  ] },
  { id: "abuelo", stem: "Cuando mi abuelo me contaba cuentos,…", options: [
    { t: "el tiempo se detenía a escucharlo.", ok: true },
    { t: "yo me sentaba en su silla.", ok: false },
    { t: "miraba la hora en el reloj.", ok: false },
  ] },
  { id: "avion", stem: "La primera vez que subí a un avión,…", options: [
    { t: "el corazón me voló antes que yo.", ok: true },
    { t: "me abroché el cinturón.", ok: false },
    { t: "revisé el número de mi asiento.", ok: false },
  ] },
  { id: "nieve", stem: "Cuando vi la nieve en el volcán,…", options: [
    { t: "me quedé sin palabras de asombro.", ok: true },
    { t: "toqué el suelo frío.", ok: false },
    { t: "medí cuánta nieve había.", ok: false },
  ] },
];

// ─────────────────────────────────────────────────────────────
// makeProblem por ronda — selección fresca con FIFO por categoría.
// ─────────────────────────────────────────────────────────────
function pickFresh(bank, prefix, idOf) {
  const pre = prefix + ":";
  const recentIds = getRecent().filter((k) => k.startsWith(pre)).map((k) => k.slice(pre.length));
  const windowN = Math.floor(bank.length / 2);
  const blocked = new Set(recentIds.slice(0, windowN));
  let pool = bank.filter((b) => !blocked.has(idOf(b)));
  if (pool.length === 0) pool = bank;
  const p = pool[Math.floor(Math.random() * pool.length)];
  return p;
}

function pickFreshN(bank, prefix, n, idOf) {
  const pre = prefix + ":";
  const recentIds = getRecent().filter((k) => k.startsWith(pre)).map((k) => k.slice(pre.length));
  const windowN = Math.floor(bank.length / 2);
  const blocked = new Set(recentIds.slice(0, windowN));
  let pool = bank.filter((b) => !blocked.has(idOf(b)));
  if (pool.length < n) pool = bank.slice();
  const picks = shuffle(pool).slice(0, n);
  return picks;
}

function makeProblemR1() {
  const picks = pickFreshN(R1_BANK, "cam", 4, (q) => q.id);
  const steps = picks.map((q) => ({ q: q.q, options: shuffle(q.options) }));
  return { steps, total: steps.length, ids: picks.map((q) => q.id) };
}

function makeProblemR2() {
  const mem = pickFresh(R2_BANK, "tl", (m) => m.id);
  // id de cada fragmento = su orden correcto (0..2). La bandeja se baraja
  // (forzamos que no quede ya ordenada para que siempre haya tarea).
  const frags = mem.frags.map((text, order) => ({ id: order, text, order }));
  let tray = shuffle(frags.map((f) => f.id));
  if (tray.join() === "0,1,2") tray = [tray[1], tray[0], tray[2]];
  return { memId: mem.id, frags, tray };
}

function makeProblemR3() {
  const item = pickFresh(R3_BANK, "tono", (it) => it.id);
  return { id: item.id, stem: item.stem, options: shuffle(item.options) };
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

// Enunciado dentro de la columna de cada ronda (no absoluto), para que
// space-evenly lo reparta junto al ejercicio sin dejar huecos.
function EnunciadoInline({ text }) {
  if (!text) return null;
  return (
    <div style={{
      maxWidth: 500, textAlign: "center",
      fontFamily: "var(--ed-font-display)", fontWeight: 700,
      fontSize: 17, lineHeight: 1.2,
      color: "#fff",
      textShadow: "0 2px 6px rgba(0,0,0,0.6)",
      pointerEvents: "none",
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

function ActionRail({ canVerify, onVerify, showVerify = true, showErase, onErase, onRestart, onExit }) {
  return (
    <div data-qa="acciones" style={{
      position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
      display: "flex", flexDirection: "column", gap: 10, width: 148,
    }}>
      {showVerify && (
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
        @keyframes ed-hop { 0%{transform:translateY(0)} 40%{transform:translateY(-10px)} 100%{transform:translateY(0)} }
      `}</style>
      <MemoriasGame key={`mem-${restartTick}`} app={app} setApp={setApp} go={go} onRestart={restart} />
    </>
  );
}

function MemoriasGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "Memorias literarias";

  const [ronda, setRonda] = useStateG(0);

  // Picks por ronda (una sola vez por montaje).
  const [r1Pick] = useStateG(() => makeProblemR1());
  const [r2Pick] = useStateG(() => makeProblemR2());
  const [r3Pick] = useStateG(() => makeProblemR3());

  // R2 — la línea del tiempo: placed = { slotIndex: fragId }, selected = fragId|null
  const [r2Placed, setR2Placed] = useStateG({});
  const [r2Selected, setR2Selected] = useStateG(null);
  const [r2Locked, setR2Locked] = useStateG(false);

  // R1 — el camino: estado del tablero (elevado para usar VERIFICAR del rail)
  const [r1StepIdx, setR1StepIdx] = useStateG(0);
  const [r1Results, setR1Results] = useStateG([]); // bool por casilla resuelta (true=acierto)
  const [r1Chosen, setR1Chosen] = useStateG(null);
  const [r1Phase, setR1Phase] = useStateG("answering"); // answering | feedback

  // R3 — el tono justo: índice elegido | null
  const [r3Choice, setR3Choice] = useStateG(null);
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
  const r2AllPlaced = [0, 1, 2].every((s) => r2Placed[s] !== undefined && r2Placed[s] !== null);

  // R1 (camino, 1 toque por casilla) se AUTO-EVALÚA: al tocar una opción se
  // resalta y, tras una breve ventana para recapacitar (~700 ms), se califica
  // sola (excepción §10 aprobada por la autora solo para R1). R2 (ordenar) y
  // R3 (tono) conservan VERIFICAR manual: el niño elige y confirma con el botón.
  const canVerify =
    ronda === 1 ? (r2AllPlaced && !r2Locked) :
    ronda === 2 ? (r3Choice !== null && !r3Locked) :
    false;

  const r1AutoRef = useRefG(null);
  // Guard de montaje: evita que los timers diferidos hagan setState / naveguen
  // sobre una instancia ya desmontada (tras REINICIAR o SALIR durante el feedback).
  const aliveRef = useRefG(true);
  useEffectG(() => () => { clearTimeout(r1AutoRef.current); aliveRef.current = false; }, []);

  // Registrar en el FIFO los picks elegidos como EFECTO (no en el render):
  // evita escribir en localStorage durante la inicialización (pureza de render).
  useEffectG(() => {
    r1Pick.ids.forEach((id) => pushRecent("cam:" + id));
    pushRecent("tl:" + r2Pick.memId);
    pushRecent("tono:" + r3Pick.id);
  }, []);

  // Califica la casilla actual de la R1 con la opción tocada (mismo flujo que
  // tenía VERIFICAR: marca verde/rojo y SIEMPRE avanza al siguiente paso).
  function gradeR1(choiceIdx) {
    if (r1Phase !== "answering") return;
    const step = r1Pick.steps[r1StepIdx];
    const ok = !!(step.options[choiceIdx] && step.options[choiceIdx].ok);
    const willResults = r1Results.slice();
    willResults[r1StepIdx] = ok;
    setR1Phase("feedback");
    setR1Results(willResults);
    setTimeout(() => {
      if (!aliveRef.current) return;
      const next = r1StepIdx + 1;
      if (next >= r1Pick.total) {
        finishR1(willResults.filter(Boolean).length, r1Pick.total);
      } else {
        setR1StepIdx(next);
        setR1Chosen(null);
        setR1Phase("answering");
      }
    }, ok ? 760 : 2000);
  }

  // Califica la R3 con la opción elegida (se dispara desde VERIFICAR).
  function gradeR3(choiceIdx) {
    if (r3Locked) return;
    setR3Locked(true);
    const correct = r3Pick.options[choiceIdx] && r3Pick.options[choiceIdx].ok;
    const userText = r3Pick.options[choiceIdx] ? r3Pick.options[choiceIdx].t : "—";
    const okOpt = r3Pick.options.find((o) => o.ok);
    const correctText = okOpt ? okOpt.t : "—";
    // Al fallar, unos segundos para ver cuál era el final correcto (verde ✓).
    setTimeout(() => { if (!aliveRef.current) return; answer(correct, userText, correctText, "🎭", "El tono justo"); }, correct ? 420 : 2200);
  }

  function handleVerify() {
    if (!canVerify) return;
    if (ronda === 1) {
      setR2Locked(true);
      const correct = [0, 1, 2].every((s) => r2Placed[s] === s);
      const userText = [0, 1, 2].map((s) => (r2Placed[s] != null ? r2Placed[s] + 1 : "?")).join("-");
      const correctText = "1-2-3 (antes → ahora)";
      setTimeout(() => { if (!aliveRef.current) return; answer(correct, userText, correctText, "🕰️", "La línea del tiempo"); }, 420);
    } else if (ronda === 2) {
      gradeR3(r3Choice);
    }
  }

  // R1 — el tablero llama aquí al terminar las 4 casillas.
  function finishR1(correctCount, total) {
    const ok = correctCount === total;
    const userText = `${correctCount} de ${total} casillas`;
    const correctText = `${total} de ${total} casillas`;
    // Al no llegar a la meta, decirle al niño exactamente cuánto le faltó (en
    // vez del ánimo genérico) porque vio casi todo el camino en verde.
    const faltan = total - correctCount;
    const failMsg = `Te faltó ${faltan === 1 ? "1 casilla" : faltan + " casillas"} para llegar a la meta.`;
    answer(ok, userText, correctText, "🧭", "El camino de los recuerdos", failMsg);
  }

  function handleErase() {
    if (ronda === 1) { if (r2Locked) return; setR2Placed({}); setR2Selected(null); }
  }

  function answer(isCorrect, userText, correctText, opIcon, reto, failMsg) {
    if (!aliveRef.current) return;
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
    setFeedbackMsg(isCorrect ? `+${earned} ⭐` : (failMsg || ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]));
    setAttempted(newAttempted);
    setSolved(newSolved);
    setStars(newStarsTotal);
    setStarsSession(newStarsSession);
    setLog(newLog);

    const wait = isCorrect ? 1000 : 1450;
    setTimeout(() => {
      if (!aliveRef.current) return;
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
    ronda === 0 ? "Responde bien para llegar a la meta." :
    ronda === 1 ? "Ordena los momentos de la memoria." :
    "Elige el final que transmite emoción.";
  const bocadillo =
    ronda === 0 ? "Toca la opción correcta\npara avanzar." :
    ronda === 1 ? "Coloca cada parte:\nantes, después y ahora." :
    "Lee la frase y toca\nla opción más viva.";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <GameHUD elapsed={elapsed} stars={stars} attempted={attempted} solved={solved} total={3} />
      <CharacterCorner char={char} message={bocadillo} />

      {ronda === 0 && (
        <CaminoCard
          enunciado={enunciado}
          pick={r1Pick}
          stepIdx={r1StepIdx}
          results={r1Results}
          chosen={r1Chosen}
          phase={r1Phase}
          onPick={(i) => {
            if (r1Phase !== "answering") return;
            setR1Chosen(i);
            // Resalta y, si no cambia de idea en ~700 ms, califica sola.
            clearTimeout(r1AutoRef.current);
            r1AutoRef.current = setTimeout(() => gradeR1(i), 700);
          }}
        />
      )}

      {ronda === 1 && (
        <LineaTiempoCard
          enunciado={enunciado}
          pick={r2Pick}
          placed={r2Placed}
          selected={r2Selected}
          locked={r2Locked}
          onSelect={(id) => { if (!r2Locked) setR2Selected((s) => (s === id ? null : id)); }}
          onPlace={(slot, id) => {
            if (r2Locked) return;
            setR2Placed((p) => {
              const n = {};
              // un fragmento solo puede estar en un slot: lo quitamos de otros
              for (const k of Object.keys(p)) if (p[k] !== id) n[k] = p[k];
              n[slot] = id;
              return n;
            });
            setR2Selected(null);
          }}
          onUnplace={(id) => {
            if (r2Locked) return;
            setR2Placed((p) => {
              const n = { ...p };
              for (const k of Object.keys(n)) if (n[k] === id) delete n[k];
              return n;
            });
          }}
        />
      )}

      {ronda === 2 && (
        <TonoCard
          enunciado={enunciado}
          pick={r3Pick}
          chosen={r3Choice}
          locked={r3Locked}
          onPick={(i) => {
            // Solo selecciona/resalta; el niño confirma con VERIFICAR (§10).
            if (r3Locked) return;
            setR3Choice(i);
          }}
        />
      )}

      <ActionRail
        canVerify={canVerify}
        onVerify={handleVerify}
        showVerify={ronda === 1 || ronda === 2}
        showErase={ronda === 1}
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
// R1 · El camino de los recuerdos — tablero de casillas 1..N + meta 🏁.
// El niño responde un mini-reto por casilla y pulsa VERIFICAR: la casilla
// se pinta VERDE ✓ si acierta o ROJA ✗ si falla, y SIEMPRE avanza a la
// siguiente, recorriendo todo el camino hasta la meta.
// ─────────────────────────────────────────────────────────────
function CaminoCard({ enunciado, pick, stepIdx, results, chosen, phase, onPick }) {
  const total = pick.total;
  const step = pick.steps[stepIdx];
  const reveal = phase === "feedback";
  // casillas ya resueltas (en feedback, la actual ya cuenta como resuelta)
  const answered = results.length;
  const nodes = Array.from({ length: total + 1 }, (_, i) => i);

  return (
    <div data-qa="zona-central" style={{
      position: "absolute", top: 64, bottom: 16, left: "50%", transform: "translateX(-50%)",
      width: 560, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
    }}>
      <EnunciadoInline text={enunciado} />

      {/* Camino de casillas: 1..total y meta */}
      <div data-qa="bandeja" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        {nodes.map((i) => {
          const isMeta = i === total;
          const resolved = !isMeta && i < answered;       // ya respondida
          const here = !isMeta && i === stepIdx && !reveal; // casilla actual, contestando
          const good = resolved && results[i];
          const metaReached = isMeta && answered >= total;
          let bg, ink, border, content;
          if (metaReached) { bg = "linear-gradient(180deg,#fce9a8,#e9c45a)"; ink = "#3a2608"; border = "#fce9a8"; content = "🏁"; }
          else if (isMeta) { bg = "rgba(10,6,35,0.45)"; ink = "rgba(252,233,168,0.6)"; border = "rgba(242,194,96,0.45)"; content = "🏁"; }
          else if (resolved && good) { bg = "linear-gradient(180deg,#2ecc8f,#22a06c)"; ink = "#fff"; border = "#2ecc8f"; content = "✓"; }
          else if (resolved && !good) { bg = "linear-gradient(180deg,#ff6b6b,#dc5050)"; ink = "#fff"; border = "#ff6b6b"; content = "✗"; }
          else if (here) { bg = "linear-gradient(180deg,#fce9a8,#e9c45a)"; ink = "#3a2608"; border = "#fce9a8"; content = i + 1; }
          else { bg = "rgba(10,6,35,0.45)"; ink = "rgba(252,233,168,0.55)"; border = "rgba(242,194,96,0.4)"; content = i + 1; }
          return (
            <React.Fragment key={i}>
              {i > 0 && (
                <div style={{
                  width: 30, height: 5, borderRadius: 3,
                  background: i <= answered ? "#2ecc8f" : "rgba(242,194,96,0.3)",
                }} />
              )}
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: bg, color: ink, border: `2.5px solid ${border}`,
                fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: here ? 24 : 20,
                boxShadow: (here || metaReached) ? "0 0 16px rgba(252,233,168,0.6)" : "inset 0 1px 0 rgba(255,255,255,0.06)",
                animation: here ? "ed-hop 1.2s ease-in-out infinite" : "none",
                flexShrink: 0,
              }}>{content}</div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Progreso */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        background: "rgba(0,0,0,0.3)", border: "1px solid rgba(242,194,96,0.45)",
        borderRadius: 999, padding: "4px 14px",
        fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 13, color: "#fce9a8",
      }}>
        🧭 Casilla {Math.min(stepIdx + 1, total)} de {total}
      </div>

      {/* Pregunta de la casilla */}
      <div style={{
        width: "fit-content", maxWidth: 450,
        padding: "12px 18px", borderRadius: 16,
        background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(240,235,225,0.92))",
        border: "3px solid #f2c260",
        boxShadow: "0 12px 28px rgba(0,0,0,0.4), inset 0 -4px 0 rgba(0,0,0,0.06)",
        fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 16.5,
        color: "#3a2608", lineHeight: 1.3, textAlign: "center",
      }}>{step.q}</div>

      {/* Opciones */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: 430, maxWidth: 440 }}>
        {step.options.map((o, i) => {
          const isChosen = chosen === i;
          let bg = "rgba(255,255,255,0.92)", ink = "#3a2608", border = "rgba(116,72,32,0.25)";
          if (reveal && o.ok) { bg = "linear-gradient(180deg,#2ecc8f,#22a06c)"; ink = "#fff"; border = "#2ecc8f"; }
          else if (reveal && isChosen && !o.ok) { bg = "linear-gradient(180deg,#ff6b6b,#dc5050)"; ink = "#fff"; border = "#ff6b6b"; }
          else if (isChosen) { bg = "linear-gradient(180deg,#fce9a8,#e9c45a)"; ink = "#3a2608"; border = "#e9c45a"; }
          return (
            <button key={i}
              onClick={() => onPick(i)}
              disabled={phase !== "answering"}
              style={{
                position: "relative",
                padding: "12px 16px", borderRadius: 12,
                border: `2px solid ${border}`, background: bg, color: ink,
                fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 16,
                cursor: phase === "answering" ? "pointer" : "default",
                boxShadow: "0 3px 8px rgba(0,0,0,0.22)",
                transition: "all 0.15s ease", lineHeight: 1.25,
              }}>
              {o.t}
              {reveal && o.ok && !isChosen && (
                <span style={{
                  position: "absolute", top: -8, right: -8, width: 22, height: 22, borderRadius: "50%",
                  background: "#2ecc8f", color: "#fff", fontSize: 14, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "2px solid #fff", boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
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
// R2 · La línea del tiempo — bandeja de 3 fragmentos barajados + 3
// casilleros (Antes → Después → Ahora). Tap el fragmento, tap el
// casillero; o arrastra. VERIFICAR colorea cada casillero verde/rojo.
// ─────────────────────────────────────────────────────────────
const TL_SLOTS = [
  { i: 0, label: "Antes", color: "#4fa0ff" },
  { i: 1, label: "Después", color: "#a78bfa" },
  { i: 2, label: "Ahora", color: "#2ecc8f" },
];

function LineaTiempoCard({ enunciado, pick, placed, selected, locked, onSelect, onPlace, onUnplace }) {
  const placedIds = new Set(Object.values(placed));
  const trayIds = pick.tray.filter((id) => !placedIds.has(id));

  function fragText(id) {
    const f = pick.frags.find((x) => x.id === id);
    return f ? f.text : "";
  }

  const chipStyle = {
    padding: "9px 13px", borderRadius: 12,
    fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 14,
    lineHeight: 1.25, cursor: locked ? "default" : "grab",
    border: "2px solid", maxWidth: 430,
  };

  return (
    <div style={{
      position: "absolute", top: 64, bottom: 16, left: "50%", transform: "translateX(-50%)",
      width: 560, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
    }}>
      <EnunciadoInline text={enunciado} />

      {/* Bandeja de fragmentos por colocar */}
      <div data-qa="zona-central" style={{
        width: 450, minHeight: 50,
        display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", alignItems: "center",
      }}>
        {trayIds.length === 0 && (
          <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 14, color: "rgba(255,255,255,0.7)" }}>
            ¡Listo! Pulsa VERIFICAR.
          </div>
        )}
        {trayIds.map((id) => {
          const sel = selected === id;
          const handler = locked ? undefined : makeDragHandler({
            item: id,
            ghostHtml: `<div style="background:#fce9a8;color:#3a2608;padding:8px 12px;border-radius:10px;max-width:320px;font-family:Fredoka,Nunito,sans-serif;font-weight:700;font-size:14px;border:2px solid #4fd8ff;box-shadow:0 6px 18px rgba(0,0,0,0.5);">${fragText(id)}</div>`,
            onTap: (it) => onSelect(it),
            onDrop: (zone, it) => onPlace(parseInt(zone.replace("slot", ""), 10), it),
          });
          return (
            <div key={id}
              className="ed-draggable"
              onPointerDown={handler}
              style={{
                ...chipStyle,
                background: sel ? "linear-gradient(180deg,#fce9a8,#e9c45a)" : "rgba(255,255,255,0.94)",
                color: "#3a2608",
                borderColor: sel ? "#4fd8ff" : "rgba(116,72,32,0.25)",
                boxShadow: sel ? "0 0 16px rgba(79,216,255,0.6)" : "0 3px 8px rgba(0,0,0,0.25)",
                transform: sel ? "translateY(-2px)" : "none",
              }}>
              {fragText(id)}
            </div>
          );
        })}
      </div>

      {/* Línea del tiempo vertical: 3 casilleros con flechas */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, width: 450 }}>
        {TL_SLOTS.map((slot, si) => {
          const id = placed[slot.i];
          const filled = id !== undefined && id !== null;
          const ok = locked && filled ? (id === slot.i) : null;
          let zoneBg = "rgba(10,6,35,0.45)", zoneBorder = slot.color;
          if (locked && filled) {
            zoneBg = ok ? "linear-gradient(180deg, rgba(46,204,143,0.92), rgba(34,160,108,0.9))" : "linear-gradient(180deg, rgba(255,107,107,0.92), rgba(220,80,80,0.9))";
            zoneBorder = ok ? "#2ecc8f" : "#ff6b6b";
          }
          const placedHandler = (locked || !filled) ? undefined : makeDragHandler({
            item: id,
            ghostHtml: `<div style="background:#fce9a8;color:#3a2608;padding:8px 12px;border-radius:10px;max-width:320px;font-family:Fredoka,Nunito,sans-serif;font-weight:700;font-size:14px;border:2px solid #4fd8ff;box-shadow:0 6px 18px rgba(0,0,0,0.5);">${fragText(id)}</div>`,
            onTap: (it) => onUnplace(it),
            onDrop: (zone, it) => onPlace(parseInt(zone.replace("slot", ""), 10), it),
          });
          return (
            <React.Fragment key={slot.i}>
              <div style={{ display: "flex", alignItems: "stretch", gap: 10 }}>
                {/* etiqueta de tiempo */}
                <div style={{
                  width: 96, flexShrink: 0, borderRadius: 12,
                  background: slot.color, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 15,
                  letterSpacing: "0.03em", boxShadow: "0 3px 8px rgba(0,0,0,0.3)",
                }}>{slot.label}</div>
                {/* casillero (dropzone) */}
                <div
                  data-dropzone={`slot${slot.i}`}
                  onClick={() => { if (!locked && selected !== null && !filled) onPlace(slot.i, selected); }}
                  style={{
                    flex: 1, minHeight: 50, borderRadius: 12, padding: "8px 12px",
                    background: zoneBg, border: `2.5px dashed ${zoneBorder}`,
                    display: "flex", alignItems: "center",
                    cursor: (!locked && selected !== null && !filled) ? "pointer" : "default",
                  }}>
                  {filled ? (
                    <div
                      className="ed-draggable"
                      onPointerDown={placedHandler ? (e) => { e.stopPropagation(); placedHandler(e); } : undefined}
                      style={{
                        fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 14,
                        color: locked ? "#fff" : "#3a2608",
                        background: locked ? "transparent" : "rgba(255,255,255,0.94)",
                        padding: locked ? 0 : "6px 10px", borderRadius: 8,
                        lineHeight: 1.25, cursor: locked ? "default" : "grab",
                        boxShadow: locked ? "none" : "0 2px 5px rgba(0,0,0,0.2)", touchAction: "none",
                      }}>
                      {locked ? (ok ? "✓ " : "✗ ") : ""}{fragText(id)}
                    </div>
                  ) : (
                    <span style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 13, color: "rgba(252,233,168,0.5)" }}>
                      Coloca aquí…
                    </span>
                  )}
                </div>
              </div>
              {si < TL_SLOTS.length - 1 && (
                <div style={{ textAlign: "center", color: "rgba(252,233,168,0.55)", fontSize: 14, lineHeight: 0.6 }}>↓</div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// R3 · El tono justo — una memoria con un hueco y 3 finales. El niño
// elige el final evocador. VERIFICAR; al fallar se marca en verde ✓
// el final correcto (feedback estándar §11).
// ─────────────────────────────────────────────────────────────
function TonoCard({ enunciado, pick, chosen, locked, onPick }) {
  return (
    <div data-qa="zona-central" style={{
      position: "absolute", top: 64, bottom: 16, left: "50%", transform: "translateX(-50%)",
      width: 560, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
    }}>
      <EnunciadoInline text={enunciado} />

      {/* Memoria con el hueco */}
      <div style={{
        width: "fit-content", maxWidth: 450,
        padding: "16px 20px", borderRadius: 18,
        background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(240,235,225,0.92))",
        border: "3px solid #f2c260",
        boxShadow: "0 12px 28px rgba(0,0,0,0.4), inset 0 -4px 0 rgba(0,0,0,0.06)",
        fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 20,
        color: "#3a2608", lineHeight: 1.35, textAlign: "center", fontStyle: "italic",
      }}>“{pick.stem}”</div>

      {/* Finales posibles */}
      <div data-qa="bandeja" style={{ display: "flex", flexDirection: "column", gap: 10, width: 430, maxWidth: 440 }}>
        {pick.options.map((o, i) => {
          const isChosen = chosen === i;
          let bg = "rgba(255,255,255,0.92)", ink = "#3a2608", border = "rgba(116,72,32,0.25)";
          if (locked && o.ok) { bg = "linear-gradient(180deg,#2ecc8f,#22a06c)"; ink = "#fff"; border = "#2ecc8f"; }
          else if (locked && isChosen && !o.ok) { bg = "linear-gradient(180deg,#ff6b6b,#dc5050)"; ink = "#fff"; border = "#ff6b6b"; }
          else if (isChosen) { bg = "linear-gradient(180deg,#fce9a8,#e9c45a)"; ink = "#3a2608"; border = "#e9c45a"; }
          return (
            <button key={i}
              onClick={() => onPick(i)}
              disabled={locked}
              style={{
                position: "relative",
                padding: "12px 16px", borderRadius: 12,
                border: `2px solid ${border}`, background: bg, color: ink,
                fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 16,
                cursor: locked ? "default" : "pointer",
                boxShadow: "0 3px 8px rgba(0,0,0,0.22)",
                transition: "all 0.15s ease", lineHeight: 1.25, textAlign: "left",
              }}>
              {o.t}
              {locked && o.ok && !isChosen && (
                <span style={{
                  position: "absolute", top: -8, right: -8, width: 22, height: 22, borderRadius: "50%",
                  background: "#2ecc8f", color: "#fff", fontSize: 14, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "2px solid #fff", boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                }}>✓</span>
              )}
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
  const res = app.lastResult || { category: "Memorias literarias", solved: 0, total: 3, time: 0, starsEarned: 0, log: [] };
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
