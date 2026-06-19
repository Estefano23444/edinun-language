// game-screens.jsx — GameScreen + ResultsScreen para JUEGO-13
// "De oruga a mariposa" (TEMA 3 del libro EDINUN, 8 años). 1 nivel, 3 rondas
// con mecánicas DISTINTAS (estándar 7+ años):
//   R1 — Laboratorio del reportero: base + sufijo → adjetivo (formar palabra).
//   R2 — La cámara del reportero: elegir el verbo con el sufijo correcto.
//   R3 — Clasifica la metamorfosis: arrastrar verbos al frasco de su prefijo.
//
// El shell (HUD, personaje, enunciado, action rail, modales, feedback,
// reporte académico, scoring por tiempo) se hereda del estándar (igual que
// juego-11). Solo cambian los bancos de datos y las 3 Cards de mecánica.

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
  "¡Casi! Sigue investigando.",
  "Los sufijos tienen su truco 🦋",
  "¡La próxima foto es perfecta!",
  "Equivocarse también es aprender.",
  "Las palabras se transforman, ¡como la oruga!",
  "¡Vamos a la siguiente!",
  "Cada error te acerca al acierto.",
];

// ─────────────────────────────────────────────────────────────
// FIFO anti-repetición por categoría (lab / cam / clas) en un solo
// key de localStorage. Cada sesión empuja 3 entradas; límite alto
// para retener varias sesiones y no repetir consecutivo.
// ─────────────────────────────────────────────────────────────
const RECENT_KEY = "edinun_juego13_recientes_v1";
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
// BANCOS DE DATOS — TEMA 3 (sufijos y prefijos). Todo en minúsculas.
// ═════════════════════════════════════════════════════════════

// R1 — Laboratorio: formar ADJETIVOS. El niño elige el SUFIJO correcto
// para la palabra base. Validamos solo el sufijo y al acertar la probeta
// lee la palabra real: aquí SOLO van formaciones regulares (base + sufijo =
// adjetivo exacto), para que el niño nunca lea una palabra inventada.
// Palabras conocidas para 8 años.
const SUFFIX_POOL = ["ado", "oso", "al", "ar", "áceo", "uzco"];
const R1_BANK = [
  { base: "azul",  suffix: "ado",  adj: "azulado",   hint: "Algo de color azul es…" },
  { base: "sal",   suffix: "ado",  adj: "salado",    hint: "Una comida con mucha sal es…" },
  { base: "color", suffix: "ado",  adj: "colorado",  hint: "Algo muy rojo está…" },
  { base: "amor",  suffix: "oso",  adj: "amoroso",   hint: "Alguien que da mucho amor es…" },
  { base: "olor",  suffix: "oso",  adj: "oloroso",   hint: "Una flor con mucho olor es…" },
  { base: "fin",   suffix: "al",   adj: "final",     hint: "Lo que llega al fin es lo…" },
  { base: "sol",   suffix: "ar",   adj: "solar",     hint: "La energía que da el sol es…" },
  { base: "gris",  suffix: "áceo", adj: "grisáceo",  hint: "Un color que tira a gris es…" },
];

// R2 — MEMORIA de parejas: base ↔ verbo formado con sufijo. El niño destapa
// cartas de a 2 buscando el par (el verbo "contiene" la base, así es reconocible).
// Verbos y bases conocidos para 8 años.
const R2_BANK = [
  { base: "flor",    verb: "florecer" },
  { base: "color",   verb: "colorear" },
  { base: "oscuro",  verb: "oscurecer" },
  { base: "cepillo", verb: "cepillar" },
  { base: "gota",    verb: "gotear" },
  { base: "golpe",   verb: "golpear" },
  { base: "pata",    verb: "patear" },
  { base: "sal",     verb: "salar" },
  { base: "salto",   verb: "saltar" },
  { base: "grito",   verb: "gritar" },
  { base: "baile",   verb: "bailar" },
  { base: "abrazo",  verb: "abrazar" },
  { base: "saludo",  verb: "saludar" },
  { base: "dibujo",  verb: "dibujar" },
];

// R3 — Clasificar: verbos formados con prefijo a- o en-. Cada verbo
// empieza claramente con su prefijo → validación sin ambigüedad.
// Verbos conocidos para 8 años (amanecer, ensuciar, enfriar…).
const R3_PREFIX = {
  "a":  ["amanecer", "anochecer", "atardecer", "aclarar", "agrandar", "acercar"],
  "en": ["endulzar", "ensuciar", "enfriar", "entristecer", "enrojecer", "engordar"],
};
const BIN_COLOR = { "a": "#4fa0ff", "en": "#2ecc8f" };

// ─────────────────────────────────────────────────────────────
// makeProblem por ronda
// ─────────────────────────────────────────────────────────────
function pickFresh(bank, prefix, idOf) {
  // Bloqueamos solo los ~floor(N/2) más recientes de ESTA categoría
  // (estándar 12), no toda la lista recent: así el pool nunca se vacía
  // mientras queden opciones frescas y no se repite la última jugada.
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

function makeProblemR1() {
  const pick = pickFresh(R1_BANK, "lab", (w) => w.base);
  const distract = shuffle(SUFFIX_POOL.filter((s) => s !== pick.suffix)).slice(0, 3);
  const tray = shuffle([pick.suffix, ...distract]);
  return { ...pick, tray };
}

function makeProblemR2() {
  // 3 parejas frescas (FIFO por verbo, ventana floor(N/2) como R3) → 6 cartas
  // (base + verbo), tablero 3×2. Con 14 parejas bloquea las ~7 más recientes,
  // dejando pool fresco amplio para que recargar varíe las parejas.
  const recentW = getRecent().filter((k) => k.startsWith("mem:")).map((k) => k.slice("mem:".length));
  const blocked = new Set(recentW.slice(0, Math.floor(R2_BANK.length / 2)));
  let pool = R2_BANK.filter((p) => !blocked.has(p.verb));
  if (pool.length < 3) pool = R2_BANK;
  const picks = shuffle(pool).slice(0, 3);
  for (const p of picks) pushRecent("mem:" + p.verb);
  const cards = [];
  picks.forEach((p, i) => {
    cards.push({ pairId: i, kind: "base", content: p.base, verb: p.verb });
    cards.push({ pairId: i, kind: "verbo", content: p.verb, verb: p.verb });
  });
  return { pairs: picks.length, cards: shuffle(cards) };
}

function makeProblemR3() {
  // 3 verbos de cada prefijo → 6 chips, 2 frascos.
  const bins = ["a", "en"];
  const chosen = [];
  const wordGroup = {};
  for (const b of bins) {
    // Ventana floor(N/2) por bin (estándar 12): bloqueamos solo los más
    // recientes de "clas:", así el pool nunca se vacía y la selección cambia.
    const recentW = getRecent().filter((k) => k.startsWith("clas:")).map((k) => k.slice("clas:".length));
    const blocked = new Set(recentW.slice(0, Math.floor(R3_PREFIX[b].length / 2)));
    let pool = R3_PREFIX[b].filter((w) => !blocked.has(w));
    if (pool.length < 3) pool = R3_PREFIX[b];
    const picks = shuffle(pool).slice(0, 3);
    for (const w of picks) { chosen.push(w); wordGroup[w] = b; pushRecent("clas:" + w); }
  }
  return { bins, words: shuffle(chosen), wordGroup };
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
      <ReportajeGame key={`rep-${restartTick}`} app={app} setApp={setApp} go={go} onRestart={restart} />
    </>
  );
}

function ReportajeGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "Sufijos y prefijos";

  const [ronda, setRonda] = useStateG(0);

  // Picks por ronda (una sola vez por montaje).
  const [r1Pick] = useStateG(() => makeProblemR1());
  const [r2Pick] = useStateG(() => makeProblemR2());
  const [r3Pick] = useStateG(() => makeProblemR3());

  // R1 — sufijo elegido | null
  const [r1Suffix, setR1Suffix] = useStateG(null);
  const [r1Locked, setR1Locked] = useStateG(false);

  // R2 — Memoria: el tablero se autogestiona; r2Done al emparejar todo.
  const [r2Done, setR2Done] = useStateG(false);
  const [r2Errors, setR2Errors] = useStateG(0);
  const [r2Locked, setR2Locked] = useStateG(false);

  // R3 — placed = { word: binGroup }, selected = word|null
  const [r3Placed, setR3Placed] = useStateG({});
  const [r3Selected, setR3Selected] = useStateG(null);
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
  const r3AllPlaced = r3Pick.words.every((w) => r3Placed[w]);

  const canVerify =
    ronda === 0 ? (r1Suffix !== null && !r1Locked) :
    ronda === 1 ? (r2Done && !r2Locked) :
    ronda === 2 ? (r3AllPlaced && !r3Locked) :
    false;

  function handleVerify() {
    if (!canVerify) return;
    if (ronda === 0) {
      setR1Locked(true);
      const correct = r1Suffix === r1Pick.suffix;
      const userText = `${r1Pick.base} ${r1Suffix}`;
      const correctText = `${r1Pick.suffix} → ${r1Pick.adj}`;
      setTimeout(() => answer(correct, userText, correctText, "🔬", `${r1Pick.base} + sufijo`), 380);
    } else if (ronda === 1) {
      setR2Locked(true);
      // Memoria: emparejar todo = ronda lograda. Las estrellas bajan con el
      // tiempo (más fallos → más tiempo → menos estrellas).
      const userText = `${r2Pick.pairs} parejas · ${r2Errors} ${r2Errors === 1 ? "fallo" : "fallos"}`;
      setTimeout(() => answer(true, userText, `${r2Pick.pairs} parejas base↔verbo`, "🧠", "parejas base ↔ verbo"), 380);
    } else if (ronda === 2) {
      setR3Locked(true);
      let correct = true;
      for (const w of r3Pick.words) {
        if (r3Placed[w] !== r3Pick.wordGroup[w]) { correct = false; break; }
      }
      const userText = r3Pick.words.map((w) => `${w}→${r3Placed[w] || "?"}`).join(" · ");
      const correctText = r3Pick.words.map((w) => `${w}→${r3Pick.wordGroup[w]}`).join(" · ");
      // Al fallar, tablero visible más tiempo (con "→ caja correcta") antes del "¡UPS!".
      setTimeout(() => answer(correct, userText, correctText, "🫙", "prefijo a / en"), correct ? 380 : 2200);
    }
  }

  function handleErase() {
    if (ronda === 0) { if (r1Locked) return; setR1Suffix(null); }
    // R2 (memoria) no tiene BORRAR.
    else if (ronda === 2) { if (r3Locked) return; setR3Placed({}); setR3Selected(null); }
  }

  function answer(isCorrect, userText, correctText, opIcon, reto) {
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

    const wait = isCorrect ? 1000 : 1100;
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
  // Sin repetir términos entre enunciado y bocadillo.
  const enunciado =
    ronda === 0 ? "Forma el adjetivo que falta." :
    ronda === 1 ? "Une cada palabra con su verbo." :
    "Clasifica cada verbo por su prefijo.";
  const bocadillo =
    ronda === 0 ? "Toca o arrastra\nel sufijo." :
    ronda === 1 ? "Voltea dos cartas\ny halla la pareja." :
    "Arrástralo a su\ngrupo: a o en.";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <GameHUD elapsed={elapsed} stars={stars} attempted={attempted} solved={solved} total={3} />
      <CharacterCorner char={char} message={bocadillo} />

      {ronda === 0 && (
        <SufijoLabCard
          enunciado={enunciado}
          pick={r1Pick}
          chosen={r1Suffix}
          locked={r1Locked}
          onPick={(sfx) => { if (!r1Locked) setR1Suffix((s) => (s === sfx ? null : sfx)); }}
        />
      )}

      {ronda === 1 && (
        <MemoriaCard
          enunciado={enunciado}
          pick={r2Pick}
          locked={r2Locked}
          onComplete={(errors) => { setR2Errors(errors); setR2Done(true); }}
        />
      )}

      {ronda === 2 && (
        <ClasificaCard
          enunciado={enunciado}
          pick={r3Pick}
          placed={r3Placed}
          selected={r3Selected}
          locked={r3Locked}
          onSelect={(w) => { if (!r3Locked) setR3Selected((s) => (s === w ? null : w)); }}
          onPlace={(group, w) => {
            if (r3Locked) return;
            setR3Placed((p) => ({ ...p, [w]: group }));
            setR3Selected(null);
          }}
          onUnplace={(w) => {
            if (r3Locked) return;
            setR3Placed((p) => { const n = { ...p }; delete n[w]; return n; });
          }}
        />
      )}

      <ActionRail
        canVerify={canVerify}
        onVerify={handleVerify}
        showErase={ronda !== 1}
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
// R1 · Laboratorio del reportero — cartel con la palabra base + pista,
// probeta [base] + [sufijo], y bandeja de sufijos. Tap un sufijo →
// llena la probeta. Al verificar revela el adjetivo real.
// ─────────────────────────────────────────────────────────────
function SufijoLabCard({ enunciado, pick, chosen, locked, onPick }) {
  const correct = locked && chosen === pick.suffix;
  const slotBorder = !locked ? "rgba(242,194,96,0.5)" : (correct ? "#2ecc8f" : "#ff6b6b");

  // Enunciado + cartel + probeta + bandeja repartidos con space-evenly:
  // espacios iguales en toda la altura, sin huecos.
  return (
    <div data-qa="zona-central" style={{
      position: "absolute", top: 68, bottom: 18, left: "50%", transform: "translateX(-50%)",
      width: 540, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
    }}>
      <EnunciadoInline text={enunciado} />

      {/* Cartel de pista: palabra base + frase */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        width: "fit-content", maxWidth: 470,
        padding: "12px 18px", borderRadius: 18,
        background: "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(240,235,225,0.9))",
        border: "3px solid #f2c260",
        boxShadow: "0 12px 28px rgba(0,0,0,0.4), inset 0 -4px 0 rgba(0,0,0,0.06)",
      }}>
        <div style={{
          fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 26,
          color: "#fff", background: "linear-gradient(180deg,#4fa0ff,#2f7fe0)",
          borderRadius: 12, padding: "8px 16px", lineHeight: 1,
          boxShadow: "0 3px 8px rgba(0,0,0,0.25)", whiteSpace: "nowrap",
        }}>{pick.base}</div>
        <div style={{
          fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 16,
          color: "#3a2608", maxWidth: 260, lineHeight: 1.25,
        }}>{pick.hint}</div>
      </div>

      {/* Probeta: [base] + [slot sufijo] (= adjetivo al acertar) */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          minWidth: 92, height: 72, padding: "0 14px", borderRadius: 14,
          border: "2.5px solid rgba(242,194,96,0.5)",
          background: "rgba(10,6,35,0.5)", color: "#fce9a8",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 24, letterSpacing: "0.02em",
        }}>{pick.base}</div>

        <div style={{ fontSize: 28, color: "#fce9a8", fontWeight: 800 }}>+</div>

        <div data-dropzone="slot" style={{
          minWidth: 92, height: 72, borderRadius: 14,
          border: `2.5px ${chosen !== null ? "solid" : "dashed"} ${slotBorder}`,
          background: chosen !== null
            ? "linear-gradient(180deg, rgba(252,233,168,0.95), rgba(217,164,65,0.85))"
            : "rgba(10,6,35,0.5)",
          color: chosen !== null ? "#3a2608" : "rgba(252,233,168,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 24,
          boxShadow: chosen !== null ? "0 4px 10px rgba(0,0,0,0.3)" : "inset 0 1px 0 rgba(255,255,255,0.08)",
          transition: "all 0.15s ease",
        }}>{chosen !== null ? chosen : "—"}</div>

        {locked && correct && (
          <>
            <div style={{ fontSize: 28, color: "#2ecc8f", fontWeight: 800 }}>=</div>
            <div style={{
              minWidth: 92, height: 72, padding: "0 14px", borderRadius: 14,
              border: "2.5px solid #2ecc8f",
              background: "linear-gradient(180deg, rgba(46,204,143,0.95), rgba(34,160,108,0.92))",
              color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 22, whiteSpace: "nowrap",
            }}>{pick.adj}</div>
          </>
        )}
      </div>

      {/* Bandeja de sufijos */}
      <div data-qa="bandeja" style={{
        display: "flex", gap: 14, flexWrap: "wrap", maxWidth: 520, justifyContent: "center",
      }}>
        {pick.tray.map((sfx, idx) => {
          const isChosen = chosen === sfx;
          const isAnswer = locked && sfx === pick.suffix;
          const color = ["#ef5a5a", "#4fa0ff", "#2ecc8f", "#f2a73b", "#a78bfa", "#ff8a3a"][idx % 6];
          // Al fallar, el sufijo correcto se marca en verde (feedback estándar).
          const bg = isAnswer && locked
            ? "linear-gradient(180deg,#2ecc8f,#22a06c)"
            : isChosen
              ? "linear-gradient(180deg,#fce9a8,#e9c45a)"
              : undefined;
          // Toca o arrastra el sufijo hasta la probeta.
          const handler = locked ? undefined : makeDragHandler({
            item: sfx,
            ghostHtml: `<div style="background:#fce9a8;color:#3a2608;padding:10px 18px;border-radius:12px;font-family:Fredoka,Nunito,sans-serif;font-weight:800;font-size:24px;border:2px solid #4fd8ff;box-shadow:0 6px 18px rgba(0,0,0,0.5);">${sfx}</div>`,
            onTap: (it) => onPick(it),
            onDrop: (zone, it) => { if (zone === "slot") onPick(it); },
          });
          return (
            <button key={idx}
              className="ed-numpad-key ed-draggable"
              onPointerDown={handler}
              disabled={locked}
              style={{
                width: 100, height: 64, fontSize: 24, position: "relative",
                borderColor: isAnswer && locked ? "#2ecc8f" : color, borderWidth: 2, borderStyle: "solid",
                cursor: locked ? "default" : "grab",
                fontWeight: 800, letterSpacing: "0.02em",
                color: (bg ? "#3a2608" : undefined),
                background: bg,
                transition: "all 0.15s ease",
                touchAction: "none",
              }}>
              {sfx}
              {isAnswer && locked && !isChosen && (
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
// R2 · Memoria de parejas — tablero de cartas base ↔ verbo (flor↔florecer).
// El niño destapa de a 2 buscando el par; al emparejar todo avisa onComplete
// con el nº de fallos. Cartas de base en azul, verbos en crema; pareja = verde.
// ─────────────────────────────────────────────────────────────
function MemoriaCard({ enunciado, pick, locked, onComplete }) {
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
        }, 380);
      } else {
        errorsRef.current += 1;
        setBusy(true);
        setTimeout(() => { setFlipped([]); setBusy(false); }, 800);
      }
    }
  }

  const matchedPairs = matched.size / 2;

  // Enunciado + contador + tablero repartidos con space-evenly (sin huecos).
  return (
    <div data-qa="zona-central" style={{
      position: "absolute", top: 68, bottom: 18, left: "50%", transform: "translateX(-50%)",
      width: 520, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
    }}>
      <EnunciadoInline text={enunciado} />

      {/* Contador de parejas */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        background: "rgba(0,0,0,0.3)", border: "1px solid rgba(242,194,96,0.45)",
        borderRadius: 999, padding: "4px 14px",
        fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 14, color: "#fce9a8",
      }}>
        🧠 Parejas: {matchedPairs} / {pick.pairs}
      </div>

      {/* Tablero 3 columnas × 2 filas */}
      <div data-qa="bandeja" style={{
        display: "grid", gridTemplateColumns: "repeat(3, 150px)", gap: 16, justifyContent: "center",
      }}>
        {pick.cards.map((c, i) => {
          const isMatched = matched.has(i);
          const isUp = isMatched || flipped.includes(i);
          const isBase = c.kind === "base";
          let bg, ink, border;
          if (isUp) {
            if (isMatched) { bg = "linear-gradient(180deg, rgba(46,204,143,0.95), rgba(34,160,108,0.92))"; ink = "#fff"; border = "#2ecc8f"; }
            else if (isBase) { bg = "linear-gradient(180deg,#eaf3ff,#cfe2ff)"; ink = "#2f5fa0"; border = "#4fa0ff"; }
            else { bg = "linear-gradient(180deg, rgba(255,250,235,0.97), rgba(244,232,205,0.95))"; ink = "#3a2608"; border = "#f2c260"; }
          } else { bg = "linear-gradient(180deg, rgba(20,12,55,0.92), rgba(10,6,35,0.92))"; ink = "rgba(242,194,96,0.7)"; border = "rgba(242,194,96,0.6)"; }
          return (
            <button key={i}
              onClick={() => click(i)}
              disabled={locked || isMatched}
              style={{
                width: 150, height: 92, borderRadius: 16, padding: 6,
                border: `2.5px solid ${border}`, background: bg, color: ink,
                display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center",
                cursor: (locked || isMatched) ? "default" : "pointer",
                boxShadow: "0 4px 10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
                fontFamily: "var(--ed-font-display)", fontWeight: 800,
                fontSize: isUp ? 18 : 32, lineHeight: 1.1, transition: "all 0.15s ease",
                wordBreak: "break-word",
              }}>
              {isUp ? c.content : "?"}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// R3 · Clasifica la metamorfosis — chips de verbos arriba + 2 frascos
// (a- / en-). Drag (con fallback tap-tap) a cada frasco. Lock colorea
// aciertos (verde ✓) y fallos (rojo ✗).
// ─────────────────────────────────────────────────────────────
function ClasificaCard({ enunciado, pick, placed, selected, locked, onSelect, onPlace, onUnplace }) {
  const unplaced = pick.words.filter((w) => !placed[w]);
  const binWidth = pick.bins.length <= 2 ? 170 : 100;

  const chipBase = {
    padding: "9px 14px", borderRadius: 12,
    fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 17,
    letterSpacing: "0.02em", cursor: locked ? "default" : "grab",
    border: "2px solid", lineHeight: 1, whiteSpace: "nowrap",
  };

  // Enunciado + chips + frascos repartidos con space-evenly (sin huecos).
  return (
    <div style={{
      position: "absolute", top: 68, bottom: 18, left: "50%", transform: "translateX(-50%)",
      width: 540, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
    }}>
      <EnunciadoInline text={enunciado} />

      {/* Chips por colocar */}
      <div data-qa="zona-central" style={{
        width: 490, minHeight: 56,
        display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", alignItems: "center",
      }}>
        {unplaced.length === 0 && (
          <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 15, color: "rgba(255,255,255,0.7)" }}>
            ¡Todos guardados! Pulsa VERIFICAR.
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

      {/* Frascos de prefijo */}
      <div data-qa="bandeja" style={{
        display: "flex", gap: 28, justifyContent: "center",
      }}>
        {pick.bins.map((g) => {
          const color = BIN_COLOR[g] || "#4fa0ff";
          const inside = pick.words.filter((w) => placed[w] === g);
          return (
            <div key={g}
              data-dropzone={g}
              onClick={() => { if (!locked && selected) onPlace(g, selected); }}
              style={{
                width: binWidth, minHeight: 188,
                borderRadius: 14, padding: "10px 8px 12px",
                background: "rgba(10,6,35,0.5)",
                border: `2.5px dashed ${color}`,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                cursor: selected && !locked ? "pointer" : "default",
              }}>
              <div style={{
                fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 20,
                color: "#fff", background: color, borderRadius: 8, padding: "2px 16px",
                letterSpacing: "0.05em", boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
              }}>{g}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, width: "100%", alignItems: "center" }}>
                {inside.map((w) => {
                  const ok = locked ? pick.wordGroup[w] === g : null;
                  // Al fallar, revelamos a qué caja pertenecía realmente.
                  const correctBin = (locked && ok === false) ? pick.wordGroup[w] : null;
                  // Ficha ya colocada: arrástrala a la otra caja para corregir,
                  // o tócala para devolverla a la bandeja.
                  const handler = locked ? undefined : makeDragHandler({
                    item: w,
                    ghostHtml: `<div style="background:#fce9a8;color:#3a2608;padding:7px 13px;border-radius:10px;font-family:Fredoka,Nunito,sans-serif;font-weight:800;font-size:15px;border:2px solid #4fd8ff;box-shadow:0 6px 18px rgba(0,0,0,0.5);">${w}</div>`,
                    onTap: (it) => onUnplace(it),
                    onDrop: (zone, it) => onPlace(zone, it),
                  });
                  return (
                    <div key={w}
                      className="ed-draggable"
                      onPointerDown={handler ? (e) => { e.stopPropagation(); handler(e); } : undefined}
                      style={{
                        fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 15,
                        padding: "5px 10px", borderRadius: 8, lineHeight: 1,
                        background: locked
                          ? (ok ? "linear-gradient(180deg,#2ecc8f,#22a06c)" : "linear-gradient(180deg,#ff6b6b,#dc5050)")
                          : "rgba(255,255,255,0.92)",
                        color: locked ? "#fff" : "#3a2608",
                        cursor: locked ? "default" : "grab",
                        boxShadow: "0 2px 5px rgba(0,0,0,0.25)",
                        whiteSpace: "nowrap", touchAction: "none",
                      }}
                      title={locked ? "" : "Arrástralo a la otra caja o tócalo para sacarlo"}>
                      {locked ? (ok ? "✓ " : "✗ ") : ""}{w}
                      {correctBin && (
                        <span style={{ display: "block", marginTop: 2, fontSize: 11, fontWeight: 800, color: "#eafff4" }}>→ {correctBin}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
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
  const res = app.lastResult || { category: "Sufijos y prefijos", solved: 0, total: 3, time: 0, starsEarned: 0, log: [] };
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
