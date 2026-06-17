// game-screens.jsx — GameScreen + ResultsScreen para JUEGO-22
// "Un diálogo para conocernos" (TEMA 3 del libro EDINUN, 13 años). 1 nivel,
// 3 rondas con mecánicas DISTINTAS (estándar 7+ años):
//   R1 — Atrapa las lenguas del Ecuador: SHOOTER. Caen nombres de lenguas;
//        atrapa las originarias del Ecuador y deja caer las de otros países.
//        Auto-evaluado (§13), sin VERIFICAR.
//   R2 — El coloquio en vivo: SIMULADOR. El estudiante modera un coloquio y
//        decide en cada fase (Presentación · Desarrollo · Cierre). Enseña la
//        estructura del coloquio y su diferencia con el debate.
//   R3 — Memoria de las lenguas: MEMORIA. Tablero de 8 cartas boca abajo
//        (4 parejas CAUSA ↔ EJEMPLO: globalización · falta de registros ·
//        pocos hablantes · diglosia). Voltea dos para emparejar; auto-evaluado.
//
// Contenido ORIGINAL apoyado en el TEMA 3 del libro. Vocabulario ecuatoriano
// neutro. El shell (HUD, personaje, enunciado, action rail, modales, feedback,
// reporte, scoring por tiempo) se hereda del estándar. Personaje por defecto:
// Verne (explorador).

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
  "¡Casi! Vuelve a leer con calma.",
  "Cada lengua guarda una cultura 🌎",
  "Equivocarse también es aprender.",
  "Respira y vuelve a intentarlo.",
  "Un buen lector mira los detalles.",
  "¡La próxima es tuya!",
  "Dialogar también es escuchar.",
];

// ─────────────────────────────────────────────────────────────
// FIFO anti-repetición por categoría en un solo key de localStorage.
// Ventana ≈ floor(N/2) por categoría.
// ─────────────────────────────────────────────────────────────
const RECENT_KEY = "edinun_juego22_recientes_v1";
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
// Elige un ítem fresco bloqueando los ~floor(N/2) más recientes de su
// categoría; nunca vacía el pool y no repite la última jugada.
function pickFresh(bank, prefix, idOf) {
  const pre = prefix + ":";
  const recentIds = getRecent().filter((k) => k.startsWith(pre)).map((k) => k.slice(pre.length));
  const windowN = Math.floor(bank.length / 2);
  const blocked = new Set(recentIds.slice(0, windowN));
  let pool = bank.filter((b) => !blocked.has(idOf(b)));
  if (pool.length === 0) pool = bank;
  const p = pool[Math.floor(Math.random() * pool.length)];
  pushRecent(pre + idOf(p));
  return p;
}

// ═════════════════════════════════════════════════════════════
// BANCOS DE DATOS — TEMA 3 (Ecuador plurilingüe · coloquio · causas).
// Apoyado en el libro; redacción propia. Vocabulario ecuatoriano neutro.
// ═════════════════════════════════════════════════════════════

// R1 — SHOOTER. SÍ = 14 lenguas originarias del Ecuador (fuente del libro:
// Confederación de Nacionalidades Indígenas del Ecuador). NO = lenguas
// indígenas de OTROS países de América (distractoras). Se evita "Quechua"
// para no confundir con el Kichwa ecuatoriano.
const R1_ECUADOR = [
  "Kichwa Sierra", "Kichwa Amazónico", "Shuar Chicham", "Achuar Chicham",
  "Shiwiar Chicham", "A'ingae", "Tsafiki", "Cha'palaa", "Awapit",
  "Sia Pedee", "Paicoca", "Wao Terero", "Sápara", "Shimingae",
];
const R1_OTROS = [
  "Náhuatl", "Maya", "Guaraní", "Aimara", "Mapudungun",
  "Wayúu", "Zapoteco", "Rapa Nui", "Tupí", "Muisca",
];

// R2 — SIMULADOR del coloquio. 3 fases (Presentación · Desarrollo · Cierre).
// En cada fase, la opción correcta es propia del COLOQUIO; las incorrectas
// imitan al DEBATE (convencer, ganar, imponer) o rompen la estructura.
const R2_COLOQUIOS = [
  {
    id: "lenguas",
    title: "¿Cómo salvamos las lenguas del Ecuador?",
    participants: ["👩‍🏫", "🧑‍🌾", "🧑‍🎓"],
    phases: [
      {
        fase: "Presentación",
        narr: "Abres el evento y todos te observan. ¿Qué haces primero?",
        options: [
          { t: "Presento el tema y a cada participante.", ok: true },
          { t: "Doy mi opinión para convencer a todos.", ok: false },
          { t: "Pido que cada quien defienda su postura y gane el mejor.", ok: false },
        ],
        explica: "El coloquio inicia con una introducción del tema y la presentación de los participantes. No busca convencer ni que alguien gane: eso es propio del debate.",
      },
      {
        fase: "Desarrollo",
        narr: "Una experta en lenguas ancestrales pide la palabra. ¿Qué haces?",
        options: [
          { t: "Le doy la palabra para que comparta sus conocimientos.", ok: true },
          { t: "La interrumpo para imponer mi punto de vista.", ok: false },
          { t: "Le pido que rebata a otro para generar polémica.", ok: false },
        ],
        explica: "En el desarrollo, los expertos comparten ideas e intercambian puntos de vista con el público. Prima la función informativa, no la polémica.",
      },
      {
        fase: "Cierre",
        narr: "El tiempo se acaba. Es hora de cerrar el coloquio. ¿Cómo lo haces?",
        options: [
          { t: "Reformulo las ideas principales y dejo una pregunta para reflexionar.", ok: true },
          { t: "Declaro un ganador del debate.", ok: false },
          { t: "Corto y me voy sin decir nada.", ok: false },
        ],
        explica: "El cierre reformula las ideas más destacadas y se sugiere terminar con una pregunta que motive la reflexión.",
      },
    ],
  },
  {
    id: "materna",
    title: "¿Por qué hablar nuestra lengua materna?",
    participants: ["🧑‍🏫", "👵", "🧑‍🎓"],
    phases: [
      {
        fase: "Presentación",
        narr: "Comienza el coloquio en tu colegio. ¿Cómo lo abres?",
        options: [
          { t: "Introduzco el tema y presento a los invitados.", ok: true },
          { t: "Empiezo a debatir para imponer mi opinión.", ok: false },
          { t: "Reto a los invitados a ver quién convence al público.", ok: false },
        ],
        explica: "Todo coloquio abre con una introducción del tema y la presentación de los participantes; no se busca ganar.",
      },
      {
        fase: "Desarrollo",
        narr: "Una abuela hablante de kichwa quiere compartir su experiencia. ¿Qué haces?",
        options: [
          { t: "La invito a compartir su experiencia con todos.", ok: true },
          { t: "La interrumpo porque tengo prisa.", ok: false },
          { t: "Le pido que discuta con el otro invitado.", ok: false },
        ],
        explica: "En el desarrollo se da la palabra a los participantes para intercambiar ideas y conocimientos.",
      },
      {
        fase: "Cierre",
        narr: "Llega el final del coloquio. ¿Cómo cierras?",
        options: [
          { t: "Resumo las ideas clave y dejo una pregunta para pensar.", ok: true },
          { t: "Anuncio quién ganó la discusión.", ok: false },
          { t: "Termino de golpe, sin conclusiones.", ok: false },
        ],
        explica: "El cierre retoma las ideas destacadas y propone una pregunta de reflexión.",
      },
    ],
  },
  {
    id: "escuela",
    title: "¿Cómo llevar nuestras lenguas a la escuela?",
    participants: ["🧑‍🏫", "🧑‍🎓", "👩‍🌾"],
    phases: [
      {
        fase: "Presentación",
        narr: "Inauguras un coloquio en la feria cultural. ¿Cómo empiezas?",
        options: [
          { t: "Presento el tema y doy la bienvenida a cada invitado.", ok: true },
          { t: "Anuncio que al final habrá un ganador.", ok: false },
          { t: "Empiezo defendiendo mi postura para convencer.", ok: false },
        ],
        explica: "El coloquio abre con la introducción del tema y la presentación de los invitados; no se busca ganar como en el debate.",
      },
      {
        fase: "Desarrollo",
        narr: "Un joven que aprende kichwa quiere contar su experiencia. ¿Qué haces?",
        options: [
          { t: "Le doy la palabra para que comparta su experiencia.", ok: true },
          { t: "Lo reto a discutir con otro invitado.", ok: false },
          { t: "Lo interrumpo para dar mi propia conclusión.", ok: false },
        ],
        explica: "En el desarrollo se da la palabra a los participantes para que compartan e intercambien ideas, no para polemizar.",
      },
      {
        fase: "Cierre",
        narr: "Se acaba el tiempo del coloquio. ¿Cómo lo cierras?",
        options: [
          { t: "Recojo las ideas principales y propongo una pregunta para reflexionar.", ok: true },
          { t: "Declaro quién ganó la discusión.", ok: false },
          { t: "Corto sin dar ninguna conclusión.", ok: false },
        ],
        explica: "El cierre reformula las ideas destacadas y sugiere terminar con una pregunta que invite a reflexionar.",
      },
    ],
  },
];

// R3 — MEMORIA. Tablero de cartas boca abajo. El niño voltea dos y busca
// emparejar cada CAUSA con un EJEMPLO suyo (4 parejas = 8 cartas). Auto-evaluado.
const R3_BINS = [
  { id: "glob", label: "Globalización", emoji: "🌐", color: "#f2a73b" },
  { id: "reg",  label: "Falta de registros", emoji: "📜", color: "#4fa0ff" },
  { id: "hab",  label: "Pocos hablantes", emoji: "👥", color: "#a78bfa" },
  { id: "dig",  label: "Diglosia", emoji: "⚖️", color: "#ef6f6f" },
];
// Ejemplos breves por causa (caben en una carta). 2 por causa → varía al repetir.
const R3_MEMORIA = {
  glob: [
    { id: "glob1", text: "Todos eligen un solo idioma común" },
    { id: "glob2", text: "En internet se usa un idioma global" },
    { id: "glob3", text: "Las películas llegan en un idioma dominante" },
    { id: "glob4", text: "El comercio exige un idioma mundial" },
  ],
  reg: [
    { id: "reg1", text: "No hay alfabeto ni libros" },
    { id: "reg2", text: "Los relatos solo pasan de voz en voz" },
    { id: "reg3", text: "Nadie ha escrito su gramática" },
    { id: "reg4", text: "No quedan grabaciones de la lengua" },
  ],
  hab: [
    { id: "hab1", text: "Solo unos ancianos la hablan" },
    { id: "hab2", text: "Cada año quedan menos hablantes" },
    { id: "hab3", text: "Los niños ya no la aprenden" },
    { id: "hab4", text: "Quedan muy pocas familias que la usan" },
  ],
  dig: [
    { id: "dig1", text: "Creen que su lengua vale menos" },
    { id: "dig2", text: "La esconden por miedo a las burlas" },
    { id: "dig3", text: "Solo usan el español en público" },
    { id: "dig4", text: "Piensan que no sirve para estudiar" },
  ],
};

// ─────────────────────────────────────────────────────────────
// makeProblem por ronda
// ─────────────────────────────────────────────────────────────
function makeProblemR2() {
  const pick = pickFresh(R2_COLOQUIOS, "coloquio", (c) => c.id);
  return { ...pick };
}

function makeProblemR3() {
  // Una pareja por causa: carta CAUSA (emoji+label) + carta EJEMPLO (texto).
  const cards = [];
  R3_BINS.forEach((bin) => {
    const ex = pickFresh(R3_MEMORIA[bin.id], "mem-" + bin.id, (x) => x.id);
    cards.push({ key: bin.id + "-c", pairId: bin.id, kind: "causa", bin });
    cards.push({ key: bin.id + "-e", pairId: bin.id, kind: "ejemplo", bin, text: ex.text });
  });
  return { cards: shuffle(cards), pairs: R3_BINS.length };
}

// ═════════════════════════════════════════════════════════════
// Shell común: HUD, modales, action rail, feedback, personaje
// ═════════════════════════════════════════════════════════════
function GameEnunciado({ text, top = 82 }) {
  if (!text) return null;
  return (
    <div data-qa="enunciado" style={{
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
      `}</style>
      <DialogoGame key={`dialogo-${restartTick}`} app={app} setApp={setApp} go={go} onRestart={restart} />
    </>
  );
}

function DialogoGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "Un diálogo para conocernos";

  const [ronda, setRonda] = useStateG(0);

  // Picks por ronda (una sola vez por montaje).
  const [r2Pick] = useStateG(() => makeProblemR2());
  const [r3Pick] = useStateG(() => makeProblemR3());

  // R1 — shooter (auto-evaluado)
  const r1DoneRef = useRefG(false);
  // R2 — coloquio: estado controlado por el padre; se AUTO-EVALÚA al elegir
  // (con ventana para recapacitar), sin VERIFICAR manual.
  const [r2PhaseIdx, setR2PhaseIdx] = useStateG(0);
  const [r2Chosen, setR2Chosen] = useStateG(null);
  const [r2Locked, setR2Locked] = useStateG(false);
  const r2CorrectRef = useRefG(0);
  const r2AutoRef = useRefG(null);
  // R3 — plan de rescate: componente autónomo y auto-evaluado (sin VERIFICAR).
  const r3DoneRef = useRefG(false);

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
  useEffectG(() => () => clearTimeout(r2AutoRef.current), []);

  // Las 3 rondas se auto-evalúan (R1 shooter, R2 coloquio al elegir, R3 memoria),
  // así que no hay VERIFICAR manual en ninguna.
  const canVerify = false;

  function handleShooterFinish(s) {
    if (r1DoneRef.current) return;
    r1DoneRef.current = true;
    const correct = s.aciertos >= 6 && s.errores <= 2;
    const u = `${s.aciertos} atrapadas · ${s.errores} fallos`;
    answer(correct, u, "Atrapar solo lenguas del Ecuador", "🦜", "Atrapa las lenguas del Ecuador", null);
  }

  function handleSimFinish(res) {
    const correct = res.correct >= res.total; // moderar bien las 3 fases
    const u = `${res.correct}/${res.total} decisiones correctas`;
    answer(correct, u, "Moderar bien las 3 fases", "🗣️", `Coloquio: ${r2Pick.title}`, null);
  }

  // R2 AUTO: al elegir una opción se califica la fase (tras una breve ventana
  // para recapacitar), muestra feedback, revela la correcta y, tras un momento
  // para leer la explicación, avanza de fase (o termina la ronda).
  function gradeR2Phase(i) {
    if (r2Locked) return;
    const phase = r2Pick.phases[r2PhaseIdx];
    const ok = phase.options[i].ok;
    if (ok) r2CorrectRef.current += 1;
    setR2Locked(true);
    const last = r2PhaseIdx + 1 >= r2Pick.phases.length;
    // Al fallar, más tiempo para leer la opción correcta y la explicación.
    setTimeout(() => {
      if (last) {
        handleSimFinish({ correct: r2CorrectRef.current, total: r2Pick.phases.length });
      } else {
        setR2PhaseIdx((p) => p + 1);
        setR2Chosen(null);
        setR2Locked(false);
      }
    }, ok ? 1800 : 5000);
  }

  function handleMemoriaFinish(res) {
    if (r3DoneRef.current) return;
    r3DoneRef.current = true;
    // En memoria los volteos fallidos son parte del juego: completar el
    // tablero (juntar TODAS las parejas) ya cuenta como logrado.
    const correct = res.matched >= res.pairs;
    const u = `${res.matched}/${res.pairs} parejas`;
    answer(correct, u, "Emparejar cada causa con su ejemplo", "🧠", "Memoria de las lenguas", null);
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
    ronda === 0 ? "Atrapa solo las lenguas originarias del Ecuador." :
    ronda === 1 ? "Modera el coloquio eligiendo bien en cada fase." :
    "Encuentra las parejas de causa y ejemplo.";
  const bocadillo =
    ronda === 0 ? "¡Rápido! Toca las lenguas\ndel Ecuador y deja caer\nlas de otros países." :
    ronda === 1 ? "El coloquio comparte ideas,\nno busca ganar como\nel debate." :
    "Voltea dos cartas y une\ncada causa con un\nejemplo suyo.";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <GameHUD elapsed={elapsed} stars={stars} attempted={attempted} solved={solved} total={3} />
      <CharacterCorner char={char} message={bocadillo} />
      <GameEnunciado text={enunciado} top={ronda === 2 ? 121 : ronda === 1 ? 118 : 100} />

      {ronda === 0 && (
        <div data-qa="zona-central" style={{
          position: "absolute", top: 112, bottom: 14, left: "50%", transform: "translateX(-50%)",
          width: 470, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-end",
        }}>
          <LenguasShooter onFinish={handleShooterFinish} />
        </div>
      )}

      {ronda === 1 && (
        <ColoquioSim
          pick={r2Pick}
          phaseIdx={r2PhaseIdx}
          chosen={r2Chosen}
          locked={r2Locked}
          onChoose={(i) => {
            if (r2Locked) return;
            setR2Chosen(i);
            // Resalta y, si no cambia de idea en ~700 ms, califica la fase sola.
            clearTimeout(r2AutoRef.current);
            r2AutoRef.current = setTimeout(() => gradeR2Phase(i), 700);
          }}
        />
      )}

      {ronda === 2 && (
        <MemoriaLenguas pick={r3Pick} onFinish={handleMemoriaFinish} />
      )}

      <ActionRail
        canVerify={canVerify}
        onVerify={() => {}}
        hideVerify={true}
        showErase={false}
        onErase={() => {}}
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
// R1 · Atrapa las lenguas del Ecuador (SHOOTER, §13). Caen nombres de
// lenguas; tocar las del Ecuador (acierto), dejar caer las de otros
// países. Auto-evaluado: gana con aciertos ≥ 6 y errores ≤ 2.
// ─────────────────────────────────────────────────────────────
function LenguasShooter({ onFinish }) {
  const DURATION = 16;
  const [bubbles, setBubbles] = useStateG([]);
  const [stats, setStats] = useStateG({ aciertos: 0, errores: 0, perdidas: 0 });
  const [timeLeft, setTimeLeft] = useStateG(DURATION);
  const nextIdRef = useRefG(0);
  const finishedRef = useRefG(false);
  const usedSiRef = useRefG(new Set());
  const usedNoRef = useRefG(new Set());
  const doneRef = useRefG(false);

  const BOX_W = 452, BOX_H = 304;
  const SPEED = 2.2;
  const SPAWN_GAP = 30;
  const FLOOR = BOX_H - 8;

  function estW(t) { return Math.ceil(t.length * 8.4) + 40; }
  function pickPhrase(useSi) {
    const pool = useSi ? R1_ECUADOR : R1_OTROS;
    const used = useSi ? usedSiRef.current : usedNoRef.current;
    let avail = pool.filter((w) => !used.has(w));
    if (avail.length === 0) { used.clear(); avail = pool; }
    const w = avail[Math.floor(Math.random() * avail.length)];
    used.add(w);
    return w;
  }
  function newBubble() {
    const useSi = Math.random() < 0.58;
    const text = pickPhrase(useSi);
    const id = nextIdRef.current++;
    const w = estW(text);
    const margin = 10;
    const maxX = Math.max(margin, BOX_W - w - margin);
    const x = margin + Math.random() * (maxX - margin);
    return { id, text, isSi: useSi, x, y: -38 };
  }

  useEffectG(() => {
    const tick = setInterval(() => {
      if (finishedRef.current) return;
      setBubbles((bs) => {
        const next = [];
        let perdidasDelta = 0;
        for (const b of bs) {
          const ny = b.y + SPEED;
          if (ny > FLOOR) { if (b.isSi) perdidasDelta++; }
          else next.push({ ...b, y: ny });
        }
        if (perdidasDelta > 0) setStats((s) => ({ ...s, perdidas: s.perdidas + perdidasDelta }));
        const minY = next.length ? Math.min(...next.map((b) => b.y)) : Infinity;
        if (next.length === 0 || minY >= SPAWN_GAP) next.push(newBubble());
        return next;
      });
    }, 40);

    const countdown = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(countdown); clearInterval(tick); finishedRef.current = true; return 0; }
        return t - 1;
      });
    }, 1000);

    return () => { clearInterval(tick); clearInterval(countdown); };
  }, []);

  useEffectG(() => {
    if (timeLeft === 0 && finishedRef.current && !doneRef.current) {
      doneRef.current = true;
      const t = setTimeout(() => onFinish(stats), 600);
      return () => clearTimeout(t);
    }
  }, [timeLeft, stats]);

  function handleTap(b) {
    if (finishedRef.current) return;
    setBubbles((bs) => bs.filter((x) => x.id !== b.id));
    if (b.isSi) setStats((s) => ({ ...s, aciertos: s.aciertos + 1 }));
    else setStats((s) => ({ ...s, errores: s.errores + 1 }));
  }

  return (
    <div style={{
      position: "relative", width: BOX_W, height: BOX_H, overflow: "hidden",
      borderRadius: 16, background: "rgba(8,40,38,0.45)",
      border: "2px solid rgba(242,194,96,0.4)",
    }}>
      <div style={{
        position: "absolute", top: 8, left: 12, right: 12, zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontFamily: "var(--ed-font-display)", color: "#fce9a8", fontSize: 13, fontWeight: 700,
        pointerEvents: "none",
      }}>
        <div>🦜 {stats.aciertos} &nbsp; ✖ {stats.errores}</div>
        <div style={{ color: timeLeft <= 5 ? "#ff8b8b" : "#fce9a8" }}>⏱ {timeLeft}s</div>
      </div>

      {bubbles.map((b) => (
        <button key={b.id} onClick={() => handleTap(b)}
          style={{
            position: "absolute", left: b.x, top: 0,
            transform: `translateY(${b.y}px)`,
            transition: "transform 0.12s linear",
            willChange: "transform",
            padding: "8px 13px", borderRadius: 999,
            background: "rgba(255,255,255,0.96)", border: "2px solid #f2c260",
            fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 14,
            color: "#1a1a1a", cursor: "pointer", whiteSpace: "nowrap",
            boxShadow: "0 4px 10px rgba(0,0,0,0.45)",
          }}>{b.text}</button>
      ))}

      {timeLeft === 0 && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.55)", color: "#fce9a8",
          fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 22,
        }}>¡Tiempo!</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// R2 · El coloquio en vivo (SIMULADOR). El estudiante modera un coloquio
// y decide en cada fase. Tocar una opción la fija con feedback (verde/rojo),
// revela la correcta y explica el porqué; "Continuar" avanza de fase. Al
// terminar las 3 fases, llama onFinish({correct, total}).
// ─────────────────────────────────────────────────────────────
// Componente CONTROLADO: el padre maneja la fase, la selección y el bloqueo.
// Tocar una opción solo la SELECCIONA; el niño califica con VERIFICAR (rail).
function ColoquioSim({ pick, phaseIdx, chosen, locked, onChoose }) {
  const phases = pick.phases;
  const phase = phases[phaseIdx];
  const chosenOk = chosen !== null && phase.options[chosen].ok;

  return (
    <div data-qa="zona-central" style={{
      position: "absolute", top: 106, bottom: 10, left: "50%", transform: "translateX(-50%)",
      width: 392, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
    }}>
      {/* Escenario del coloquio (título + participantes + fase + narración) */}
      <div style={{
        width: "100%", borderRadius: 16, padding: "8px 14px",
        background: "linear-gradient(180deg, rgba(255,255,255,0.97), rgba(238,246,244,0.93))",
        border: "3px solid #f2c260",
        boxShadow: "0 10px 24px rgba(0,0,0,0.38)",
        textAlign: "center", color: "#15303a",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 14.5, lineHeight: 1.1 }}>
            {pick.title}
          </span>
        </div>
        <div style={{ fontSize: 22, letterSpacing: 4, lineHeight: 1 }}>{pick.participants.join(" ")}</div>
        <div style={{
          display: "inline-block", marginTop: 6, marginBottom: 4,
          background: "#2a8fb0", color: "#fff", borderRadius: 8, padding: "2px 12px",
          fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 12, letterSpacing: "0.05em",
        }}>
          Fase {phaseIdx + 1}/3 · {phase.fase}
        </div>
        <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 14, lineHeight: 1.25, marginTop: 2 }}>
          {phase.narr}
        </div>
      </div>

      {/* Opciones */}
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 6 }}>
        {phase.options.map((op, i) => {
          const isChosen = chosen === i;
          const isAnswer = locked && op.ok;
          const isWrongPick = locked && isChosen && !op.ok;
          const isSelected = !locked && isChosen;
          let bg, ink, border;
          if (isAnswer) { bg = "linear-gradient(180deg,#2ecc8f,#22a06c)"; ink = "#fff"; border = "#2ecc8f"; }
          else if (isWrongPick) { bg = "linear-gradient(180deg,#ff6b6b,#dc5050)"; ink = "#fff"; border = "#ff6b6b"; }
          else if (isSelected) { bg = "linear-gradient(180deg,#fff7e0,#ffe6a6)"; ink = "#3a2608"; border = "#4fd8ff"; }
          else { bg = "rgba(255,255,255,0.95)"; ink = "#15303a"; border = "rgba(116,72,32,0.25)"; }
          return (
            <button key={i}
              onClick={() => { if (!locked) onChoose(i); }}
              disabled={locked}
              style={{
                position: "relative", width: "100%", textAlign: "left",
                padding: "9px 12px", borderRadius: 12,
                border: `2px solid ${border}`, background: bg, color: ink,
                cursor: locked ? "default" : "pointer",
                fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 13.5, lineHeight: 1.22,
                boxShadow: isSelected ? "0 0 14px rgba(79,216,255,0.55)" : "0 3px 8px rgba(0,0,0,0.25)",
                transform: isSelected ? "translateY(-1px)" : "none",
                transition: "all 0.14s ease",
              }}>
              {op.t}
              {isAnswer && !isChosen && (
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

      {/* Explicación (tras VERIFICAR). El avance lo dispara el padre. */}
      {locked && (
        <div style={{
          width: "100%", borderRadius: 12, padding: "8px 12px",
          background: chosenOk ? "rgba(46,204,143,0.16)" : "rgba(255,107,107,0.14)",
          border: `1.5px solid ${chosenOk ? "rgba(46,204,143,0.6)" : "rgba(255,107,107,0.55)"}`,
          fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 12.5, lineHeight: 1.25,
          color: "#fce9a8", textAlign: "center",
        }}>
          <span style={{ color: chosenOk ? "#7dffc4" : "#ffb3b3" }}>{chosenOk ? "¡Bien! " : "Recuerda: "}</span>
          {phase.explica}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// R3 · Memoria de las lenguas (MEMORIA). Tablero de 8 cartas boca abajo
// (4 parejas CAUSA ↔ EJEMPLO). El niño voltea dos: si coinciden quedan a la
// vista; si no, se ocultan. Auto-evaluado: al emparejar las 4, llama
// onFinish({errores, pairs}).
// ─────────────────────────────────────────────────────────────
function MemoriaLenguas({ pick, onFinish }) {
  const cards = pick.cards;
  const totalPairs = pick.pairs;
  const [flipped, setFlipped] = useStateG([]);   // índices boca arriba sin resolver
  const [matched, setMatched] = useStateG([]);    // pairIds ya emparejados
  const [lock, setLock] = useStateG(false);
  const errorsRef = useRefG(0);
  const timerRef = useRefG(null);
  const doneRef = useRefG(false);

  useEffectG(() => () => clearTimeout(timerRef.current), []);

  function flip(i) {
    if (lock) return;
    const card = cards[i];
    if (matched.includes(card.pairId) || flipped.includes(i) || flipped.length >= 2) return;
    const nf = [...flipped, i];
    setFlipped(nf);
    if (nf.length === 2) {
      const [a, b] = nf;
      if (cards[a].pairId === cards[b].pairId) {
        const nm = [...matched, cards[a].pairId];
        setMatched(nm);
        setFlipped([]);
        if (nm.length === totalPairs && !doneRef.current) {
          doneRef.current = true;
          timerRef.current = setTimeout(
            () => onFinish({ matched: nm.length, errores: errorsRef.current, pairs: totalPairs }), 750
          );
        }
      } else {
        errorsRef.current += 1;
        setLock(true);
        timerRef.current = setTimeout(() => { setFlipped([]); setLock(false); }, 950);
      }
    }
  }

  const isUp = (i) => flipped.includes(i) || matched.includes(cards[i].pairId);

  return (
    <div data-qa="zona-central" style={{
      position: "absolute", top: 106, bottom: 10, left: "50%", transform: "translateX(-50%)",
      width: 452, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, width: 452 }}>
        {cards.map((c, i) => {
          const up = isUp(i);
          const isMatched = matched.includes(c.pairId);
          return (
            <button key={c.key}
              data-qa="memo-card" data-pair={c.pairId} data-kind={c.kind}
              onClick={() => flip(i)}
              disabled={lock || up}
              style={{
                position: "relative", height: 96, borderRadius: 12, padding: "6px 6px",
                border: up ? `2.5px solid ${c.bin.color}` : "2px solid rgba(242,194,96,0.35)",
                background: up
                  ? (isMatched ? "linear-gradient(180deg,#eafff5,#cdeede)" : "linear-gradient(180deg,#ffffff,#eef6f4)")
                  : "linear-gradient(180deg, rgba(20,52,62,0.96), rgba(10,30,36,0.96))",
                color: up ? "#15303a" : "#fce9a8",
                cursor: (lock || up) ? "default" : "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
                boxShadow: isMatched ? "0 0 14px rgba(46,204,143,0.5)" : "0 3px 8px rgba(0,0,0,0.3)",
                opacity: isMatched ? 0.95 : 1,
                fontFamily: "var(--ed-font-display)", transition: "all 0.15s ease",
              }}>
              {!up && <span style={{ fontSize: 28, opacity: 0.85 }}>❔</span>}
              {up && c.kind === "causa" && (
                <>
                  <span style={{ fontSize: 24, lineHeight: 1 }}>{c.bin.emoji}</span>
                  <span style={{ fontWeight: 800, fontSize: 10.5, lineHeight: 1.1, textAlign: "center" }}>{c.bin.label}</span>
                </>
              )}
              {up && c.kind === "ejemplo" && (
                <span style={{ fontWeight: 700, fontSize: 10, lineHeight: 1.18, textAlign: "center", padding: "0 2px" }}>{c.text}</span>
              )}
              {isMatched && (
                <span style={{
                  position: "absolute", top: -7, right: -7, width: 20, height: 20, borderRadius: "50%",
                  background: "#2ecc8f", color: "#fff", fontSize: 12, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "2px solid #fff", boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                }}>✓</span>
              )}
            </button>
          );
        })}
      </div>

      <div style={{
        marginTop: 24,
        fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 13,
        color: "#fce9a8", letterSpacing: "0.03em",
      }}>
        Parejas: {matched.length}/{totalPairs}
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
  const res = app.lastResult || { category: "Un diálogo para conocernos", solved: 0, total: 3, time: 0, starsEarned: 0, log: [] };
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
