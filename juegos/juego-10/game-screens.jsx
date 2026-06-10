// game-screens.jsx — GameScreen + ResultsScreen para JUEGO-10
// "Mi fabulosa fábula" (TEMA 3 del libro EDINUN, 7 años, 1 nivel).
//
// 3 rondas con mecánicas DISTINTAS (obligatorio a 7+):
//   R1 — Arma la fábula:  ordenar 3 partes en Inicio · Nudo · Desenlace.
//   R2 — La moraleja:     leer una fábula y elegir su moraleja (multi-choice).
//   R3 — Acertijo:        adivinar el personaje y formar su nombre con sílabas.
//
// Hereda el shell canónico (shell-standards.md): CharacterCorner, GameEnunciado,
// HUD con "Ronda" + bolitas, botones VERIFICAR/BORRAR/REINICIAR/SALIR manuales,
// feedback al fallar con la opción correcta en verde + ✓, FIFO anti-repetición.

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

// makeDragHandler — pointer-events drag con fallback tap.
// Drops sobre el primer ancestor con data-dropzone="<id>".
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
      return under.closest("[data-dropzone]") || null;
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
        else currentZoneId = null;
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
  "Las fábulas tienen su truco 📖",
  "¡La próxima es tuya!",
  "Equivocarse también es aprender.",
  "Cada cuento es una aventura.",
  "¡Vamos a la siguiente!",
  "Cada error te acerca al acierto.",
];

// ─────────────────────────────────────────────────────────────
// FIFO anti-repetición por categoría (shell-standards.md §12).
// Bancos: orden=6, moraleja=6, acertijo=6 → FIFO≈Math.floor(N/2)=3.
// ─────────────────────────────────────────────────────────────
const RECENT_KEYS = {
  orden:    "edinun_juego10_orden_recientes_v1",
  moraleja: "edinun_juego10_moraleja_recientes_v1",
  acertijo: "edinun_juego10_acertijo_recientes_v1",
};
const RECENT_LIMITS = { orden: 3, moraleja: 3, acertijo: 3 };
function getRecentLimit(cat) { return RECENT_LIMITS[cat] ?? 3; }
function getRecent(cat) {
  try {
    const raw = localStorage.getItem(RECENT_KEYS[cat]);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function pushRecent(cat, key) {
  const arr = getRecent(cat).filter((k) => k !== key);
  arr.unshift(key);
  const trimmed = arr.slice(0, getRecentLimit(cat));
  try { localStorage.setItem(RECENT_KEYS[cat], JSON.stringify(trimmed)); } catch {}
}
function pickFromBank(cat, bank) {
  // Bloquea solo la ventana de los más recientes ≈ Math.floor(N/2) de ESTA
  // categoría (N = tamaño del banco), no todos los recientes. Así el pool
  // nunca se vacía mientras queden opciones frescas y el nuevo pick siempre
  // difiere de las últimas ~floor(N/2) jugadas (shell-standards.md §12).
  const windowN = Math.floor(bank.length / 2);
  const blocked = new Set(getRecent(cat).slice(0, windowN));
  let pool = bank.filter((b) => !blocked.has(b.id));
  if (pool.length < 1) pool = bank;
  const p = pool[Math.floor(Math.random() * pool.length)];
  pushRecent(cat, p.id);
  return p;
}

// ─────────────────────────────────────────────────────────────
// BANCO R1 — Arma la fábula. Cada fábula tiene 3 partes con su tipo.
// Textos cortos y claros para 7 años, con animales de fábula.
// ─────────────────────────────────────────────────────────────
const FABULAS_ORDEN = [
  {
    id: "liebre-tortuga", titulo: "La liebre y la tortuga",
    partes: [
      { id: "i", tipo: "inicio",    emoji: "🐢", texto: "Una liebre presumida se reía de la tortuga por ser lenta." },
      { id: "n", tipo: "nudo",      emoji: "😴", texto: "Hicieron una carrera y la liebre se durmió confiada." },
      { id: "d", tipo: "desenlace", emoji: "🏆", texto: "La tortuga siguió sin parar y ganó la carrera." },
    ],
  },
  {
    id: "hormiga-cigarra", titulo: "La hormiga y la cigarra",
    partes: [
      { id: "i", tipo: "inicio",    emoji: "🐜", texto: "En verano, la hormiga guardaba comida mientras la cigarra cantaba." },
      { id: "n", tipo: "nudo",      emoji: "❄️", texto: "Llegó el invierno y la cigarra no tenía nada que comer." },
      { id: "d", tipo: "desenlace", emoji: "🍞", texto: "La hormiga compartió y la cigarra aprendió a guardar comida a tiempo." },
    ],
  },
  {
    id: "leon-raton", titulo: "El león y el ratón",
    partes: [
      { id: "i", tipo: "inicio",    emoji: "🦁", texto: "Un ratón despertó sin querer a un león dormido." },
      { id: "n", tipo: "nudo",      emoji: "🐭", texto: "El león lo atrapó, pero el ratón prometió ayudarlo algún día." },
      { id: "d", tipo: "desenlace", emoji: "🪢", texto: "Más tarde el ratón cortó la red con sus dientes y soltó al león." },
    ],
  },
  {
    id: "pastor-lobo", titulo: "El pastor mentiroso",
    partes: [
      { id: "i", tipo: "inicio",    emoji: "🐑", texto: "Un pastor aburrido gritó “¡el lobo!” solo para jugar." },
      { id: "n", tipo: "nudo",      emoji: "🏃", texto: "La gente corrió a ayudar, pero no había ningún lobo." },
      { id: "d", tipo: "desenlace", emoji: "🐺", texto: "Cuando el lobo llegó de verdad, ya nadie le creyó." },
    ],
  },
  {
    id: "zorro-uvas", titulo: "El zorro y las uvas",
    partes: [
      { id: "i", tipo: "inicio",    emoji: "🦊", texto: "Un zorro vio unas uvas muy altas y quiso comerlas." },
      { id: "n", tipo: "nudo",      emoji: "🍇", texto: "Saltó muchas veces, pero no alcanzaba el racimo." },
      { id: "d", tipo: "desenlace", emoji: "🚶", texto: "Cansado, se fue diciendo que las uvas estaban verdes." },
    ],
  },
  {
    id: "patito-cisne", titulo: "El patito diferente",
    partes: [
      { id: "i", tipo: "inicio",    emoji: "🐤", texto: "Un patito se sentía solo porque todos lo miraban raro." },
      { id: "n", tipo: "nudo",      emoji: "🕊️", texto: "Pasó el tiempo buscando un lugar donde lo quisieran." },
      { id: "d", tipo: "desenlace", emoji: "🦢", texto: "Creció y descubrió que era un hermoso cisne." },
    ],
  },
];

const PARTES_CFG = [
  { id: "inicio",    label: "INICIO",    hint: "cómo empieza",     color: "#4fa0ff" },
  { id: "nudo",      label: "NUDO",      hint: "el problema",      color: "#ff9a3a" },
  { id: "desenlace", label: "DESENLACE", hint: "cómo se resuelve", color: "#2ecc8f" },
];

// ─────────────────────────────────────────────────────────────
// BANCO R2 — La moraleja. Texto corto + 3 moralejas (1 correcta).
// ─────────────────────────────────────────────────────────────
const MORALEJAS = [
  {
    id: "tortuga", titulo: "La liebre y la tortuga", emoji: "🐢",
    texto: "La liebre se burlaba de la tortuga por lenta. En la carrera, la liebre se durmió y la tortuga siguió paso a paso hasta ganar.",
    opciones: [
      "Con esfuerzo y sin rendirte llegas más lejos que presumiendo.",
      "Lo único importante es ser el más rápido.",
      "No vale la pena hacer carreras.",
    ],
    correcta: 0,
  },
  {
    id: "hormiga", titulo: "La hormiga y la cigarra", emoji: "🐜",
    texto: "Mientras la cigarra cantaba todo el verano, la hormiga guardaba comida. En invierno, la cigarra no tenía qué comer.",
    opciones: [
      "Hay que guardar y trabajar a tiempo.",
      "Cantar siempre es una pérdida de tiempo.",
      "Nunca debes compartir lo que tienes.",
    ],
    correcta: 0,
  },
  {
    id: "leon", titulo: "El león y el ratón", emoji: "🦁",
    texto: "Un león atrapó a un ratoncito, pero lo dejó ir. Días después, el ratón cortó con sus dientes la red que atrapaba al león y lo salvó.",
    opciones: [
      "Hasta el más pequeño puede ayudar al más grande.",
      "Los pequeños nunca sirven para nada.",
      "Hay que dormir todo el día.",
    ],
    correcta: 0,
  },
  {
    id: "pastor", titulo: "El pastor mentiroso", emoji: "🐑",
    texto: "Un pastor gritaba “¡el lobo!” para divertirse, y todos venían sin que pasara nada. Cuando el lobo llegó de verdad, nadie le creyó.",
    opciones: [
      "Si mientes, después nadie te creerá.",
      "Gritar es la mejor diversión.",
      "Los lobos siempre tienen razón.",
    ],
    correcta: 0,
  },
  {
    id: "zorro", titulo: "El zorro y las uvas", emoji: "🦊",
    texto: "Un zorro quería unas uvas muy altas. Saltó y saltó sin alcanzarlas, y al final se fue diciendo que estaban verdes.",
    opciones: [
      "A veces decimos que no nos gusta lo que no podemos tener.",
      "Las uvas siempre están verdes.",
      "Saltar alto es muy fácil.",
    ],
    correcta: 0,
  },
  {
    id: "patito", titulo: "El patito diferente", emoji: "🦢",
    texto: "Un patito se sentía feo y solo porque era distinto. Al crecer, descubrió que en realidad era un hermoso cisne.",
    opciones: [
      "Todos somos valiosos aunque seamos diferentes.",
      "Hay que parecerse siempre a los demás.",
      "Estar solo es lo mejor de todo.",
    ],
    correcta: 0,
  },
];

// ─────────────────────────────────────────────────────────────
// BANCO R3 — Acertijo de personajes. El niño forma el nombre del
// animal con sílabas (MINÚSCULAS, sin tildes; shell-standards.md §4).
// distractores: sílabas señuelo que NO están en la palabra.
// ─────────────────────────────────────────────────────────────
const ACERTIJOS = [
  { id: "zorro",   emoji: "🦊", pista: "Soy astuto y de cola peluda. En los cuentos hago muchas travesuras.", word: "zorro",   silabas: ["zo", "rro"],       distractores: ["lo", "ga", "mi"] },
  { id: "tortuga", emoji: "🐢", pista: "Llevo mi casa a la espalda y camino muy, muy despacio.",            word: "tortuga", silabas: ["tor", "tu", "ga"], distractores: ["zo", "ne"] },
  { id: "hormiga", emoji: "🐜", pista: "Soy pequeñita y trabajadora; guardo comida para el invierno.",       word: "hormiga", silabas: ["hor", "mi", "ga"], distractores: ["lo", "rro"] },
  { id: "conejo",  emoji: "🐰", pista: "Tengo orejas largas y salto muy rápido por el campo.",               word: "conejo",  silabas: ["co", "ne", "jo"],  distractores: ["ga", "tor"] },
  { id: "lobo",    emoji: "🐺", pista: "Aúllo en la noche y vivo en el bosque junto a mi manada.",           word: "lobo",    silabas: ["lo", "bo"],        distractores: ["zo", "ja", "ne"] },
  { id: "oveja",   emoji: "🐑", pista: "Tengo lana suave y blandita, y siempre digo “beee”.",                word: "oveja",   silabas: ["o", "ve", "ja"],   distractores: ["bo", "mi"] },
];

// ═════════════════════════════════════════════════════════════
// SHELL COMÚN — GameEnunciado, HUD, modales, ActionRail, feedback,
// CharacterCorner. Todos siguen shell-standards.md al pie de la letra.
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

// HUD de 1 nivel: logo + tiempo + estrellas + "Ronda" con bolitas.
// SIN tabs de nivel (juego de 1 solo tema).
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

function RestartModal({ open, onCancel, attempted, total, onRestart }) {
  if (!open) return null;
  return (
    <PortalToBody>
      <div onClick={onCancel} style={{
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
            <button className="ed-btn ed-btn-ghost" onClick={onCancel} style={{ height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
              SEGUIR JUGANDO
            </button>
            <button className="ed-btn ed-btn-primary" onClick={onRestart} style={{ height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
              SÍ, REINICIAR
            </button>
          </div>
        </div>
      </div>
    </PortalToBody>
  );
}

function ExitModal({ open, onCancel, attempted, total, onExit }) {
  if (!open) return null;
  return (
    <PortalToBody>
      <div onClick={onCancel} style={{
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
            <button className="ed-btn ed-btn-ghost" onClick={onCancel} style={{ height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
              SEGUIR JUGANDO
            </button>
            <button className="ed-btn ed-btn-primary" onClick={onExit} style={{ height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
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

// ═════════════════════════════════════════════════════════════
// GameScreen — 3 rondas, una mecánica distinta por ronda.
// ═════════════════════════════════════════════════════════════
function GameScreen({ app, setApp, go }) {
  const [restartTick, setRestartTick] = useStateG(0);
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
      <FabulaGame key={restartTick} app={app} setApp={setApp} go={go} onRestart={() => setRestartTick((t) => t + 1)} />
    </>
  );
}

function FabulaGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "Mi fabulosa fábula";

  const [ronda, setRonda] = useStateG(0);

  // ── Picks de cada ronda (estables durante la sesión, con FIFO) ──
  const [r1Pick] = useStateG(() => pickFromBank("orden", FABULAS_ORDEN));
  const [r1Tray] = useStateG(() => shuffle(r1Pick.partes));   // orden mezclado de las partes
  const [r2Pick] = useStateG(() => pickFromBank("moraleja", MORALEJAS));
  const [r3Pick] = useStateG(() => pickFromBank("acertijo", ACERTIJOS));
  const [r3Tray] = useStateG(() => shuffle([
    ...r3Pick.silabas.map((s, i) => ({ tid: `c${i}`, syl: s })),
    ...r3Pick.distractores.map((s, i) => ({ tid: `d${i}`, syl: s })),
  ]));

  // ── Estado por ronda ──
  // R1: { binId: partId } — cada cajón guarda una parte. + parte seleccionada.
  const [r1Bins, setR1Bins] = useStateG({ inicio: null, nudo: null, desenlace: null });
  const [r1Sel, setR1Sel] = useStateG(null);
  const [r1Locked, setR1Locked] = useStateG(false);
  // R2: la ruleta primero sortea la fábula (r2Spun), luego se elige la moraleja.
  const [r2Spun, setR2Spun] = useStateG(false);
  const [r2Sel, setR2Sel] = useStateG(null);
  const [r2Locked, setR2Locked] = useStateG(false);
  // R3: secuencia de tray-ids colocados en orden.
  const [r3Seq, setR3Seq] = useStateG([]);
  const [r3Locked, setR3Locked] = useStateG(false);

  // ── Estado del shell ──
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

  // Hook de QA — permite avanzar de ronda sin resolver (solo screenshots).
  useEffectG(() => {
    window.__qa_skip = () => { setRonda((r) => Math.min(2, r + 1)); exerciseStart.current = Date.now(); };
    return () => { delete window.__qa_skip; };
  }, []);

  // ── R1 helpers ──
  const r1Assigned = new Set(Object.values(r1Bins).filter(Boolean));
  const r1TrayParts = r1Tray.filter((p) => !r1Assigned.has(p.id));
  const r1AllPlaced = PARTES_CFG.every((b) => r1Bins[b.id]);

  // Soltar una parte (drag) directamente en un cajón. Sirve para
  // tray→cajón y cajón→cajón (mover si te equivocaste).
  function r1DropOn(binId, partId) {
    if (r1Locked) return;
    setR1Bins((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) if (next[k] === partId) next[k] = null;
      next[binId] = partId;
      return next;
    });
    setR1Sel(null);
  }
  // Tap en una tarjeta de la bandeja: alterna selección.
  function r1TapTray(partId) {
    if (r1Locked) return;
    setR1Sel((cur) => (cur === partId ? null : partId));
  }
  // Tap en una parte ya colocada: la "levanta" (sale del cajón → bandeja, seleccionada).
  function r1PickUp(partId) {
    if (r1Locked) return;
    setR1Bins((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) if (next[k] === partId) next[k] = null;
      return next;
    });
    setR1Sel(partId);
  }
  // Tap en un cajón: coloca la parte seleccionada (si hay una).
  function r1PlaceSelected(binId) {
    if (r1Locked || !r1Sel) return;
    setR1Bins((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) if (next[k] === r1Sel) next[k] = null;
      next[binId] = r1Sel;
      return next;
    });
    setR1Sel(null);
  }

  // ── R3 helpers ──
  const r3Used = new Set(r3Seq);
  const r3Slots = r3Pick.silabas.length;
  const r3Assembled = r3Seq.map((tid) => { const t = r3Tray.find((x) => x.tid === tid); return t ? t.syl : ""; }).join("");
  function r3TapTile(tid) {
    if (r3Locked) return;
    if (r3Used.has(tid)) return;
    if (r3Seq.length >= r3Slots) return;
    setR3Seq((s) => [...s, tid]);
  }
  function r3RemoveAt(i) {
    if (r3Locked) return;
    setR3Seq((s) => s.filter((_, idx) => idx !== i));
  }

  // ── canVerify / borrar según ronda ──
  const canVerify =
    ronda === 0 ? (r1AllPlaced && !r1Locked) :
    ronda === 1 ? (r2Spun && r2Sel !== null && !r2Locked) :
    (r3Seq.length === r3Slots && !r3Locked);

  function handleErase() {
    if (ronda === 0) { if (!r1Locked) { setR1Bins({ inicio: null, nudo: null, desenlace: null }); setR1Sel(null); } }
    else if (ronda === 1) { if (!r2Locked) setR2Sel(null); }
    else { if (!r3Locked) setR3Seq([]); }
  }

  function handleVerify() {
    if (!canVerify) return;
    if (ronda === 0) {
      setR1Locked(true);
      const correct = PARTES_CFG.every((b) => {
        const part = r1Pick.partes.find((p) => p.id === r1Bins[b.id]);
        return part && part.tipo === b.id;
      });
      const userText = PARTES_CFG.map((b) => {
        const part = r1Pick.partes.find((p) => p.id === r1Bins[b.id]);
        return `${b.id}=${part ? part.tipo : "?"}`;
      }).join(", ");
      const correctText = "inicio=inicio, nudo=nudo, desenlace=desenlace";
      setTimeout(() => answer(correct, `Ordena: ${r1Pick.titulo}`, "📖", userText, correctText), 350);
    } else if (ronda === 1) {
      setR2Locked(true);
      const correct = r2Sel === r2Pick.correcta;
      setTimeout(() => answer(correct, `Moraleja: ${r2Pick.titulo}`, "💡",
        r2Pick.opciones[r2Sel], r2Pick.opciones[r2Pick.correcta]), 350);
    } else {
      setR3Locked(true);
      const correct = r3Assembled === r3Pick.word;
      setTimeout(() => answer(correct, `Acertijo: ${r3Pick.word}`, "🦊", r3Assembled, r3Pick.word), 350);
    }
  }

  function answer(isCorrect, reto, opIcon, userAnswer, correctAnswer) {
    if (typeof window.markFirstAttempt === "function") window.markFirstAttempt();
    const exerciseSec = Math.max(0, Math.floor((Date.now() - exerciseStart.current) / 1000));
    const earned = calcStars(isCorrect, exerciseSec);
    const newAttempted = attempted + 1;
    const newSolved = solved + (isCorrect ? 1 : 0);
    const newStarsTotal = stars + earned;
    const newStarsSession = starsSession + earned;

    const entry = {
      idx: newAttempted, reto, op: opIcon,
      a: correctAnswer, b: userAnswer,
      correctAnswer, userAnswer,
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
    const revealDelay = isCorrect ? 0 : 1500;   // tiempo para ver marcas verdes/rojas al fallar
    const overlayTime = isCorrect ? 950 : 1300;

    setTimeout(() => { setFeedback(isCorrect ? "ok" : "err"); setFeedbackMsg(isCorrect ? okMsg : errMsg); }, revealDelay);
    setTimeout(() => {
      setFeedback(null); setFeedbackMsg("");
      if (newAttempted >= 3) {
        setApp((s) => ({
          ...s, stars: newStarsTotal,
          lastResult: { category: catLabel, solved: newSolved, total: 3, time: elapsed, starsEarned: newStarsSession, log: newLog },
        }));
        if (typeof window.incrementGamesCompleted === "function") window.incrementGamesCompleted();
        go("results");
      } else {
        setRonda((r) => r + 1);
        exerciseStart.current = Date.now();
      }
    }, revealDelay + overlayTime);
  }

  // ── Enunciado (QUÉ) y bocadillo (CÓMO) por ronda ──
  const enunciado =
    ronda === 0 ? "Ordena las partes de la fábula." :
    ronda === 1 ? (r2Spun ? "Lee la fábula y elige su moraleja." : "Gira la ruleta para conocer tu fábula.") :
    "Adivina el personaje y escribe su nombre.";
  const bocadillo =
    ronda === 0 ? "Toca una parte y luego\nsu lugar." :
    ronda === 1 ? (r2Spun ? "Toca la moraleja correcta." : "Toca GIRAR para sacar\ntu fábula.") :
    "Toca las sílabas en orden\npara formar el nombre.";
  const showErase = true;
  // El enunciado baja para repartir mejor el espacio (no dejar un hueco
  // grande arriba). En R1 el contenido es alto (6 filas) y debe caber
  // entero en el lienzo, así que su enunciado va menos abajo que en R2/R3,
  // donde el contenido (ruleta / cartel) está centrado y deja aire arriba.
  const enunTop = ronda === 0 ? 88 : 132;
  const zonaTop = ronda === 0 ? 142 : 116;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <GameHUD elapsed={elapsed} stars={stars} attempted={attempted} solved={solved} total={3} />
      <CharacterCorner char={char} message={bocadillo} />
      <GameEnunciado text={enunciado} top={enunTop} />

      <div data-qa="zona-central" style={{
        position: "absolute", top: zonaTop, left: "50%", transform: "translateX(-50%)", width: 452, bottom: 14,
      }}>
        {ronda === 0 && (
          <OrdenaFabulaCard
            pick={r1Pick} trayParts={r1TrayParts} bins={r1Bins} selected={r1Sel} locked={r1Locked}
            onTapTray={r1TapTray} onPickUp={r1PickUp} onPlaceSelected={r1PlaceSelected} onDrop={r1DropOn}
          />
        )}
        {ronda === 1 && (
          <RuletaMoralejaCard pick={r2Pick} bank={MORALEJAS} spun={r2Spun} onLanded={() => setR2Spun(true)}
            selected={r2Sel} locked={r2Locked}
            onChoose={(i) => { if (!r2Locked) setR2Sel(i); }} />
        )}
        {ronda === 2 && (
          <AcertijoCard pick={r3Pick} tray={r3Tray} seq={r3Seq} used={r3Used} slots={r3Slots}
            assembled={r3Assembled} locked={r3Locked}
            onTapTile={r3TapTile} onRemoveAt={r3RemoveAt} />
        )}
      </div>

      <ActionRail canVerify={canVerify} onVerify={handleVerify}
        showErase={showErase} onErase={handleErase}
        onRestart={() => setConfirmingRestart(true)} onExit={() => setConfirmingExit(true)} />

      <FeedbackOverlay feedback={feedback} feedbackMsg={feedbackMsg} charName={char.name} />
      <RestartModal open={confirmingRestart} onCancel={() => setConfirmingRestart(false)} attempted={attempted} total={3}
        onRestart={() => { setConfirmingRestart(false); onRestart && onRestart(); }} />
      <ExitModal open={confirmingExit} onCancel={() => setConfirmingExit(false)} attempted={attempted} total={3}
        onExit={() => { setConfirmingExit(false); go("home"); }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// R1 · OrdenaFabulaCard — 3 cajones (Inicio/Nudo/Desenlace) + bandeja.
//   - Arrastrar una parte de la bandeja a un cajón.
//   - Arrastrar de un cajón a otro (mover si te equivocaste).
//   - Tap como alternativa: toca una parte y luego el cajón.
//   - Tap en una parte ya puesta = la devuelve a la bandeja.
// Las fichas usan SOLO onPointerDown (drag+tap); los cajones SOLO onClick
// (colocar la seleccionada). Así no hay doble-disparo de eventos.
// ─────────────────────────────────────────────────────────────
function partGhost(p) {
  return `<div style="max-width:300px;background:#fff;color:#3a2608;padding:7px 11px;border-radius:11px;font-family:Fredoka,Nunito,sans-serif;font-weight:700;font-size:11.5px;border:2.5px solid #4fd8ff;box-shadow:0 8px 20px rgba(0,0,0,0.55);">${p.emoji} ${p.texto}</div>`;
}

function OrdenaFabulaCard({ pick, trayParts, bins, selected, locked, onTapTray, onPickUp, onPlaceSelected, onDrop }) {
  function partById(id) { return pick.partes.find((p) => p.id === id); }
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", gap: 9 }}>
      <div style={{
        fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 13, color: "#fce9a8", textAlign: "center",
        background: "rgba(10,6,35,0.55)", border: "1px solid rgba(242,194,96,0.45)",
        borderRadius: 999, padding: "4px 16px", flexShrink: 0,
      }}>
        📖 {pick.titulo}
      </div>

      {/* Cajones */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
        {PARTES_CFG.map((b) => {
          const part = partById(bins[b.id]);
          const isCorrect = locked && part && part.tipo === b.id;
          const isWrong = locked && part && part.tipo !== b.id;
          const correctPart = pick.partes.find((p) => p.tipo === b.id);
          return (
            <div key={b.id}
              data-dropzone={b.id}
              onClick={() => { if (!locked) onPlaceSelected(b.id); }}
              style={{
                display: "flex", alignItems: "stretch", gap: 8,
                minHeight: 50, borderRadius: 12, padding: 5,
                background: "rgba(255,255,255,0.06)",
                border: `2px dashed ${isCorrect ? "#2ecc8f" : isWrong ? "#ff6b6b" : "rgba(242,194,96,0.45)"}`,
                cursor: !locked && selected ? "pointer" : "default",
              }}>
              {/* Etiqueta del cajón */}
              <div style={{
                flexShrink: 0, width: 96, borderRadius: 9,
                background: b.color, color: "#08203a",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 12,
                border: "2px solid rgba(255,255,255,0.8)", boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                lineHeight: 1.1, textAlign: "center",
              }}>
                <span>{b.label}</span>
                <span style={{ fontSize: 8.5, opacity: 0.85, fontWeight: 700, fontStyle: "italic" }}>{b.hint}</span>
              </div>
              {/* Contenido del cajón */}
              <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center" }}>
                {part ? (
                  <div
                    className={locked ? "" : "ed-draggable"}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={makeDragHandler({
                      item: part.id, disabled: locked, ghostHtml: partGhost(part),
                      onTap: () => onPickUp(part.id),
                      onDrop: (zoneId) => onDrop(zoneId, part.id),
                    })}
                    title={locked ? "" : "Tócala para moverla"}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, width: "100%",
                      background: isCorrect ? "rgba(46,204,143,0.22)" : isWrong ? "rgba(255,107,107,0.18)" : "rgba(255,255,255,0.95)",
                      color: "#3a2608", borderRadius: 9, padding: "6px 9px",
                      border: `2px solid ${isCorrect ? "#2ecc8f" : isWrong ? "#ff6b6b" : "#f2c260"}`,
                      cursor: locked ? "default" : "grab",
                    }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{part.emoji}</span>
                    <span style={{ flex: 1, minWidth: 0, fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 11.5, lineHeight: 1.2 }}>
                      {part.texto}
                    </span>
                    {isWrong && correctPart && (
                      <span style={{
                        flexShrink: 0, fontFamily: "var(--ed-font-display)", fontWeight: 900, fontSize: 18, color: "#c33b3b",
                      }} title={`Aquí va: ${correctPart.texto}`}>✗</span>
                    )}
                  </div>
                ) : (
                  <span style={{ fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 11, color: "rgba(252,233,168,0.5)", paddingLeft: 6 }}>
                    {selected ? "Suelta o toca aquí" : "Arrastra una parte aquí"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bandeja de partes sueltas */}
      <div data-qa="bandeja" style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", minHeight: 4 }}>
        {trayParts.map((p) => {
          const isSel = selected === p.id;
          return (
            <div key={p.id}
              className={locked ? "" : "ed-draggable"}
              onPointerDown={makeDragHandler({
                item: p.id, disabled: locked, ghostHtml: partGhost(p),
                onTap: () => onTapTray(p.id),
                onDrop: (zoneId) => onDrop(zoneId, p.id),
              })}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: isSel ? "linear-gradient(180deg, rgba(79,216,255,0.5), rgba(252,233,168,0.92))" : "rgba(255,255,255,0.95)",
                color: "#3a2608",
                border: `2.5px solid ${isSel ? "#4fd8ff" : "#f2c260"}`,
                borderRadius: 11, padding: "6px 10px",
                cursor: locked ? "default" : "grab",
                boxShadow: isSel ? "0 0 18px rgba(79,216,255,0.6)" : "0 3px 8px rgba(0,0,0,0.3)",
                transform: isSel ? "translateX(4px)" : "none",
                transition: "all 0.16s",
              }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{p.emoji}</span>
              <span style={{ flex: 1, minWidth: 0, fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 11.5, lineHeight: 1.2 }}>
                {p.texto}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// R2 · RuletaMoralejaCard — primero GIRAR la ruleta (sortea la fábula),
//      luego elegir su moraleja. Feedback al fallar: correcta en verde
//      con ✓ (shell-standards §11). Mecánica canónica "ruleta".
// ─────────────────────────────────────────────────────────────
const WHEEL_COLORS = ["#ff9a3a", "#4fa0ff", "#2ecc8f", "#ef6f6f", "#a78bfa", "#ffd76e"];
function wheelPolar(cx, cy, r, deg) { const t = deg * Math.PI / 180; return { x: cx + r * Math.sin(t), y: cy - r * Math.cos(t) }; }
function wheelSector(cx, cy, r, a0, a1) {
  const p0 = wheelPolar(cx, cy, r, a0), p1 = wheelPolar(cx, cy, r, a1);
  const large = (a1 - a0) > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} Z`;
}

function RuletaMoralejaCard({ pick, bank, spun, onLanded, selected, locked, onChoose }) {
  const [angle, setAngle] = useStateG(0);
  const [spinning, setSpinning] = useStateG(false);
  const n = bank.length;
  const seg = 360 / n;
  const idx = Math.max(0, bank.findIndex((x) => x.id === pick.id));

  function spin() {
    if (spinning || spun || locked) return;
    setSpinning(true);
    // Llevar el centro del sector idx arriba (al puntero) + varias vueltas.
    const target = 360 * 6 - (idx * seg + seg / 2);
    setAngle(target);
    setTimeout(() => { setSpinning(false); onLanded && onLanded(); }, 2300);
  }

  // ── FASE 1: la ruleta + botón GIRAR ──
  if (!spun) {
    return (
      <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
        <div style={{ position: "relative", width: 224, height: 224 }}>
          {/* Puntero */}
          <div style={{
            position: "absolute", top: -4, left: "50%", transform: "translateX(-50%)", zIndex: 3,
            width: 0, height: 0, borderLeft: "13px solid transparent", borderRight: "13px solid transparent",
            borderTop: "22px solid #fce9a8", filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.5))",
          }} />
          {/* Rueda giratoria */}
          <div style={{
            width: "100%", height: "100%", borderRadius: "50%",
            transform: `rotate(${angle}deg)`,
            transition: "transform 2.2s cubic-bezier(0.15,0.85,0.2,1)",
            boxShadow: "0 0 0 6px rgba(242,194,96,0.85), 0 10px 28px rgba(0,0,0,0.5)",
            borderRadius: "50%",
          }}>
            <svg viewBox="0 0 200 200" style={{ width: "100%", height: "100%", display: "block", borderRadius: "50%" }}>
              {bank.map((x, i) => {
                const a0 = i * seg, a1 = (i + 1) * seg;
                const ep = wheelPolar(100, 100, 62, i * seg + seg / 2);
                return (
                  <g key={x.id}>
                    <path d={wheelSector(100, 100, 98, a0, a1)} fill={WHEEL_COLORS[i % WHEEL_COLORS.length]} stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" />
                    <text x={ep.x} y={ep.y} fontSize="26" textAnchor="middle" dominantBaseline="central">{x.emoji}</text>
                  </g>
                );
              })}
              <circle cx="100" cy="100" r="16" fill="#0a0623" stroke="#fce9a8" strokeWidth="3" />
            </svg>
          </div>
        </div>
        <button
          onClick={spin} disabled={spinning || locked}
          className="ed-btn ed-btn-primary"
          style={{
            height: 52, padding: "0 34px", fontSize: 18, fontWeight: 800, letterSpacing: "0.06em",
            opacity: spinning ? 0.6 : 1, cursor: spinning ? "default" : "pointer",
          }}>
          {spinning ? "GIRANDO…" : "GIRAR 🎡"}
        </button>
      </div>
    );
  }

  // ── FASE 2: fábula sorteada + elegir moraleja ──
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
      {/* Cartel de la fábula (la que salió en la ruleta) — angosto a propósito
          para que el texto use más renglones y se distribuya mejor. */}
      <div style={{
        width: "fit-content", maxWidth: 330,
        background: "linear-gradient(180deg, rgba(255,253,245,0.97), rgba(245,238,225,0.92))",
        border: "3px solid #f2c260", borderRadius: 16,
        padding: "12px 18px", boxShadow: "0 10px 22px rgba(0,0,0,0.45)", color: "#3a2608",
      }}>
        <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 13, marginBottom: 6, textAlign: "center", color: "#7a4a0e" }}>
          🎡 {pick.emoji} {pick.titulo}
        </div>
        <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 13, lineHeight: 1.4, textAlign: "center" }}>
          {pick.texto}
        </div>
      </div>

      {/* Opciones de moraleja */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 430 }}>
        {pick.opciones.map((op, i) => {
          const isPicked = selected === i;
          const isCorrectAns = i === pick.correcta;
          const showCorrect = locked && isCorrectAns;
          const showWrong = locked && isPicked && !isCorrectAns;
          let bg, bd, col, shadow;
          if (showCorrect) {
            bg = "linear-gradient(180deg, rgba(46,204,143,0.95), rgba(34,160,108,0.95))";
            bd = "2px solid #2ecc8f"; col = "#fff"; shadow = "0 0 14px rgba(46,204,143,0.55)";
          } else if (showWrong) {
            bg = "linear-gradient(180deg, rgba(255,107,107,0.95), rgba(220,80,80,0.95))";
            bd = "2px solid #ff6b6b"; col = "#fff"; shadow = "0 0 12px rgba(255,107,107,0.5)";
          } else if (isPicked) {
            bg = "linear-gradient(180deg,#fce9a8,#d9a441)";
            bd = "1.5px solid #4fd8ff"; col = "#3a2608"; shadow = "0 0 12px rgba(79,216,255,0.55)";
          } else {
            bg = "rgba(255,255,255,0.95)";
            bd = "1.5px solid rgba(242,194,96,0.55)"; col = "#3a2608"; shadow = "0 2px 5px rgba(0,0,0,0.25)";
          }
          return (
            <button key={i}
              onClick={() => onChoose(i)} disabled={locked}
              style={{
                position: "relative", textAlign: "left",
                padding: "9px 14px", borderRadius: 11,
                background: bg, color: col, border: bd,
                fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 12.5, lineHeight: 1.25,
                cursor: locked ? "default" : "pointer", boxShadow: shadow,
                transform: (isPicked && !locked) || showCorrect ? "translateY(-1.5px)" : "none",
                transition: "all 0.15s",
              }}>
              {op}
              {showCorrect && !isPicked && (
                <span style={{
                  position: "absolute", top: -8, right: -8,
                  background: "#2ecc8f", color: "#fff", borderRadius: "50%", width: 20, height: 20,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 900, border: "2px solid #fff", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
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
// R3 · AcertijoCard — pista + slots para formar el nombre con sílabas.
//      Sílabas en MINÚSCULAS (shell-standards §4).
// ─────────────────────────────────────────────────────────────
function AcertijoCard({ pick, tray, seq, used, slots, assembled, locked, onTapTile, onRemoveAt }) {
  const isCorrect = locked && assembled === pick.word;
  const isWrong = locked && assembled !== pick.word;
  const SLOT_W = slots <= 2 ? 76 : slots <= 3 ? 66 : 56;
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
      {/* Tarjeta del acertijo */}
      <div style={{
        width: "fit-content", maxWidth: 420,
        background: "linear-gradient(180deg, rgba(255,253,245,0.97), rgba(245,238,225,0.92))",
        border: "3px solid #f2c260", borderRadius: 18,
        padding: "14px 20px", boxShadow: "0 12px 26px rgba(0,0,0,0.5)", color: "#3a2608",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
      }}>
        <div style={{ fontSize: 64, lineHeight: 1 }}>{pick.emoji}</div>
        <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 13.5, lineHeight: 1.35, textAlign: "center", fontStyle: "italic" }}>
          “{pick.pista}”
        </div>
      </div>

      {/* Slots del nombre */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
        {Array.from({ length: slots }).map((_, i) => {
          const tid = seq[i];
          const t = tid ? tray.find((x) => x.tid === tid) : null;
          const syl = t ? t.syl : "";
          const filled = !!tid;
          return (
            <button key={i}
              onClick={() => filled && onRemoveAt(i)}
              title={filled ? "Toca para quitar" : ""}
              style={{
                width: SLOT_W, height: 64, borderRadius: 12,
                border: `2.5px solid ${isCorrect ? "#2ecc8f" : isWrong ? "#ff6b6b" : filled ? "#fce9a8" : "rgba(242,194,96,0.55)"}`,
                background: filled
                  ? (isCorrect ? "linear-gradient(180deg, rgba(46,204,143,0.9), rgba(34,160,108,0.9))"
                     : isWrong ? "linear-gradient(180deg, rgba(255,107,107,0.9), rgba(220,80,80,0.9))"
                     : "linear-gradient(180deg, rgba(252,233,168,0.95), rgba(217,164,65,0.85))")
                  : "rgba(10,6,35,0.55)",
                color: filled ? (isCorrect || isWrong ? "#fff" : "#3a2608") : "rgba(252,233,168,0.4)",
                fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 26,
                cursor: filled && !locked ? "pointer" : "default",
                boxShadow: filled ? "0 4px 10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.4)" : "inset 0 1px 0 rgba(255,255,255,0.08)",
                transition: "all 0.15s",
              }}>
              {syl || "__"}
            </button>
          );
        })}
      </div>

      {/* Bandeja de sílabas */}
      <div data-qa="bandeja" style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", maxWidth: 460 }}>
        {tray.map((t, idx) => {
          const isUsed = used.has(t.tid);
          const color = ["#ef5a5a", "#4fa0ff", "#2ecc8f", "#ff9a3a", "#a78bfa"][idx % 5];
          return (
            <button key={t.tid}
              className="ed-numpad-key"
              onClick={() => onTapTile(t.tid)}
              disabled={isUsed || locked}
              style={{
                width: 80, height: 64, fontSize: 24, fontWeight: 800, letterSpacing: "0.03em",
                borderColor: color, borderWidth: 2, borderStyle: "solid",
                cursor: isUsed || locked ? "default" : "pointer",
                opacity: isUsed ? 0.28 : 1,
                transition: "all 0.15s",
              }}>
              {t.syl}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// RESULTS — Reporte académico imprimible (modelo juego-1).
// Columnas genéricas porque las 3 rondas tienen mecánicas distintas.
// ═════════════════════════════════════════════════════════════
function formatOp(e) {
  return `${e.op || "📖"}  ${e.reto || ""}`;
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
                <td style={{ ...printStyles.td, ...printStyles.tdOp }}>{e.op || ""} {e.reto}</td>
                <td style={{ ...printStyles.td, ...printStyles.tdR }}>{e.userAnswer}</td>
                <td style={{ ...printStyles.td, ...printStyles.tdR }}>{e.correctAnswer}</td>
                <td style={{ ...printStyles.td, ...printStyles.tdC, ...(e.isCorrect ? printStyles.tdOk : printStyles.tdErr) }}>{e.isCorrect ? "Correcto" : "Incorrecto"}</td>
                <td style={{ ...printStyles.td, ...printStyles.tdR, ...printStyles.tdDim }}>{e.time}s</td>
              </tr>
            ))}
            {log.length === 0 && (<tr><td colSpan={6} style={printStyles.tdEmpty}>No se registraron ejercicios en esta sesión.</td></tr>)}
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
  const res = app.lastResult || { category: "Mi fabulosa fábula", solved: 0, total: 3, time: 0, starsEarned: 0, log: [] };
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

      <div style={{ position: "absolute", inset: "70px 32px 20px 32px", display: "grid", gridTemplateColumns: "0.85fr 1.4fr", gap: 24, alignItems: "stretch" }}>
        {/* Izq: personaje + saludo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <div style={{
            fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 36,
            background: "linear-gradient(180deg, #fce9a8, #d9a441)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            lineHeight: 1, marginBottom: 4,
          }}>
            {res.surrendered ? "Sesión terminada" : "¡Ronda completa!"}
          </div>
          <char.Component size={180} />
          <div className="ed-body" style={{ fontStyle: "italic", textAlign: "center", maxWidth: 240, fontSize: 13 }}>
            "{app.studentName}, acertaste {res.solved} de {totalEx} retos."
            <div style={{ marginTop: 4, color: "var(--ed-ink-soft)", fontSize: 12 }}>— {char.name}</div>
          </div>
        </div>

        {/* Der: reporte académico */}
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
                <tr style={{ fontFamily: "var(--ed-font-ui)", fontWeight: 700, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ed-ink-dim)", borderBottom: "1px solid rgba(148,120,255,0.3)" }}>
                  <th style={{ textAlign: "left", padding: "6px 8px", width: 36 }}>#</th>
                  <th style={{ textAlign: "left", padding: "6px 8px" }}>Reto</th>
                  <th style={{ textAlign: "right", padding: "6px 8px" }}>Tu respuesta</th>
                  <th style={{ textAlign: "right", padding: "6px 8px" }}>Correcta</th>
                  <th style={{ textAlign: "center", padding: "6px 8px" }}>Estado</th>
                  <th style={{ textAlign: "right", padding: "6px 8px" }}>Tiempo</th>
                </tr>
              </thead>
              <tbody style={{ fontFamily: "var(--ed-font-mono)" }}>
                {(res.log || []).map((e) => (
                  <tr key={e.idx} style={{ borderBottom: "1px solid rgba(148,120,255,0.18)" }}>
                    <td style={{ padding: "8px 8px", color: "var(--ed-ink-soft)" }}>{e.idx}</td>
                    <td style={{ padding: "8px 8px", fontWeight: 600 }}>{formatOp(e)}</td>
                    <td style={{ padding: "8px 8px", textAlign: "right" }}>{e.userAnswer}</td>
                    <td style={{ padding: "8px 8px", textAlign: "right" }}>{e.correctAnswer}</td>
                    <td style={{ padding: "8px 8px", textAlign: "center", fontFamily: "var(--ed-font-display)", fontWeight: 700, color: e.isCorrect ? "#2ecc8f" : "#ff6b6b" }}>
                      {e.isCorrect ? "Correcto" : "Incorrecto"}
                    </td>
                    <td style={{ padding: "8px 8px", textAlign: "right", color: "var(--ed-ink-dim)" }}>{e.time}s</td>
                  </tr>
                ))}
                {(res.log || []).length === 0 && (
                  <tr><td colSpan={6} style={{ padding: "16px 8px", textAlign: "center", color: "var(--ed-ink-soft)", fontStyle: "italic" }}>No se registraron ejercicios en esta sesión.</td></tr>
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
            <button className="ed-btn ed-btn-ghost" onClick={() => window.print()} style={{ padding: "0 10px", fontSize: 13, height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
              IMPRIMIR REPORTE
            </button>
            <button className="ed-btn ed-btn-primary" onClick={() => go("game")} style={{ padding: "0 10px", fontSize: 13, height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
              JUGAR OTRA RONDA
            </button>
          </div>
        </div>
      </div>

      <PrintableReport studentName={app.studentName} res={res} dateStr={dateStr} m={m} s={s} attemptedCount={attemptedCount} totalEx={totalEx} accuracy={accuracy} />
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
