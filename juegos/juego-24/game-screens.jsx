// game-screens.jsx — GameScreen + ResultsScreen para JUEGO-24
// "De tantas formas se habla en Ecuador" (TEMA 3 del libro EDINUN, 14 años). 1 nivel,
// 3 rondas con mecánicas DISTINTAS (estándar 7+ años):
//   R0 — Une la nacionalidad con su lengua: EMPAREJAR. Toca una nacionalidad
//        indígena y luego la lengua que habla (tabla del libro). VERIFICAR
//        manual con feedback verde/rojo.
//   R1 — ¿De dónde viene la palabra?: SELECTOR rápido. Aparece una palabra
//        del libro y se toca su origen (préstamo del kichwa · extranjerismo ·
//        coloquial ecuatoriano). Auto-evaluado (§13), avanza al fallar.
//   R2 — Cada tecnicismo a su mundo: CLASIFICAR (arrastre). Lleva cada palabra
//        a la materia donde es un tecnicismo (Economía · Informática ·
//        Matemáticas · Lengua). VERIFICAR manual.
//
// Contenido apoyado en el TEMA 3 del libro (tabla de lenguas y nacionalidades,
// préstamos del kichwa, extranjerismos, sociolecto, tecnicismos y metalenguaje).
// Vocabulario ecuatoriano del propio libro. El shell (HUD, personaje, enunciado,
// action rail, modales, feedback, reporte, scoring por tiempo) se hereda del
// estándar. NO repite mecánicas ni contenido de juego-22 (mismo TEMA 3).

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
  "Cada palabra cuenta una historia.",
];

// ─────────────────────────────────────────────────────────────
// FIFO anti-repetición por categoría en un solo key de localStorage.
// Ventana ≈ floor(N/2) por categoría.
// ─────────────────────────────────────────────────────────────
const RECENT_KEY = "edinun_juego24_recientes_v1";
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
// Clave de la VARIEDAD: el pool debe quedar SIEMPRE con al menos un ítem
// extra por encima de N; si no, shuffle solo reordena y el CONJUNTO mostrado
// es siempre el mismo (o alterna entre 2 fijos). Por eso la ventana de bloqueo
// se limita a `bank.length - n - 1` además del clásico floor(N/2).
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
// BANCOS DE DATOS — TEMA 3 (Ecuador plurilingüe · sociolecto · tecnicismos).
// Tomados del libro EDINUN, TEMA 3. Vocabulario ecuatoriano del propio texto.
// ═════════════════════════════════════════════════════════════

// R0 — EMPAREJAR. Pares nacionalidad ↔ lengua tal como aparecen en la tabla
// del libro ("La riqueza lingüística del Ecuador"). Se excluyen los pares cuya
// nacionalidad y lengua se escriben igual (p.ej. achuar→achuar chicham comparte
// raíz) y los de lengua repetida o difícil verificación (andoa→shimingae se
// omite por recortar a 9 pares), para que el emparejamiento no sea trivial.
const R0_PAIRS = [
  { id: "awa",      nac: "awa",      lang: "awapit" },
  { id: "chachi",   nac: "chachi",   lang: "cha'palaa" },
  { id: "tsachila", nac: "tsáchila", lang: "tsafiki" },
  { id: "epera",    nac: "épera",    lang: "sia pedee" },
  { id: "cofan",    nac: "cofán",    lang: "a'ingae" },
  { id: "secoya",   nac: "secoya",   lang: "paicoca" },
  { id: "zaparo",   nac: "záparo",   lang: "sápara" },
  { id: "waorani",  nac: "waorani",  lang: "wao terero" },
  { id: "shiwiar",  nac: "shiwiar",  lang: "shiwiar chicham" },
];

// R1 — SELECTOR. Cada palabra del libro se clasifica por su ORIGEN:
//   · préstamo del kichwa  → ñaño, chapak, rucu (libro: "préstamos lingüísticos")
//   · extranjerismo        → streaming, gamer, hardware, software (libro)
//   · coloquial ecuatoriano→ formas de saludar y jerga del sociolecto juvenil.
const R1_CATS = [
  { id: "kichwa", label: "Préstamo del kichwa", emoji: "🌽", color: "#3fae6a" },
  { id: "extr",   label: "Extranjerismo",       emoji: "🌐", color: "#4fa0ff" },
  { id: "coloq",  label: "Coloquial",           emoji: "🗣️", color: "#f2a73b" },
];
const R1_BANK = {
  kichwa: ["ñaño", "taita", "rucu", "guagua", "mote", "choclo", "minga"],
  extr:   ["streaming", "gamer", "hardware", "software", "wifi", "selfie", "online", "mouse", "full"],
  coloq:  ["¿Qué más?", "¿Quiubo?", "Habla y te salvas", "bacán", "chévere", "pana", "de una"],
};

// R2 — CLASIFICAR. 4 materias (cajas) y palabras que son TECNICISMOS en ellas
// (libro: "Tecnicismos y metalenguaje"). El libro da bolsa→economía,
// RAM/hardware/software→informática, ecuación→matemáticas y analiza "comer"
// como palabra de la lengua (metalenguaje). Se añaden tecnicismos del mismo
// tipo —palabras de uso común que cambian de sentido según la materia— en el
// espíritu de la actividad del libro.
const R2_BINS = [
  { id: "eco", label: "Economía",    emoji: "💰", color: "#f2a73b", hint: "dinero y valores" },
  { id: "inf", label: "Informática", emoji: "💻", color: "#4fa0ff", hint: "computadoras" },
  { id: "mat", label: "Matemáticas", emoji: "➗", color: "#a78bfa", hint: "números" },
  { id: "len", label: "Lengua",      emoji: "📖", color: "#5fe0b0", hint: "lenguaje" },
];
const R2_BANK = {
  eco: ["bolsa", "interés", "mercado", "inflación", "déficit", "deuda"],
  inf: ["RAM", "hardware", "software", "byte", "píxel", "archivo"],
  mat: ["ecuación", "potencia", "ángulo", "fracción", "vértice", "decimal"],
  len: ["sujeto", "sílaba", "acento", "verbo", "tilde", "predicado"],
};
// Palabras comunes que NO son tecnicismo de ninguna de las 4 materias. El niño
// debe reconocer que no encajan y dejarlas en la bandeja (no toda palabra es un
// tecnicismo). Llevan tipo "none" → su respuesta correcta es quedar SIN ubicar.
const R2_DISTRACTORS = ["mariposa", "bicicleta", "montaña", "naranja", "ventana", "guitarra", "elefante", "almohada"];

// Colores de enlace para los pares de R0 (uno por fila de nacionalidad).
const LINK_COLORS = ["#4fd8ff", "#ffb454", "#a78bfa", "#2ecc8f", "#ff6b9d"];

// ─────────────────────────────────────────────────────────────
// makeProblem por ronda
// ─────────────────────────────────────────────────────────────
function makeProblemR0() {
  const chosen = pickFreshSet(R0_PAIRS, "par", (x) => x.id, 5);
  const pairs = chosen.map((p) => ({ ...p }));
  const langs = shuffle(pairs.map((p) => p.lang));
  return { pairs, langs };
}

function makeProblemR1() {
  const cards = [];
  for (const cat of R1_CATS) {
    const picked = pickFreshSet(R1_BANK[cat.id], "orig-" + cat.id, (x) => x, 2);
    picked.forEach((w) => cards.push({ id: cat.id + ":" + w, word: w, cat: cat.id }));
  }
  return { cards: shuffle(cards), cats: R1_CATS };
}

function makeProblemR2() {
  // 4 tecnicismos (uno por materia) + 1 palabra común que NO es tecnicismo de
  // ninguna (tipo "none"): el niño debe dejarla en la bandeja, sin ubicarla.
  const fichas = R2_BINS.map((bin) => {
    const picked = pickFreshSet(R2_BANK[bin.id], "tec-" + bin.id, (x) => x, 1)[0];
    return { id: bin.id + ":" + picked, text: picked, tipo: bin.id };
  });
  const distractor = pickFreshSet(R2_DISTRACTORS, "tec-none", (x) => x, 1)[0];
  fichas.push({ id: "none:" + distractor, text: distractor, tipo: "none" });
  return { fichas: shuffle(fichas), bins: R2_BINS };
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

function GameHUD({ elapsed, stars, attempted, solved, total = 3, roundResults = [] }) {
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
        {Array.from({ length: total }).map((_, i) => {
          // Color por RESULTADO REAL de cada ronda (roundResults[i]), no por
          // conteo acumulado: si la ronda 1 falla y la 2 acierta, el punto 1
          // debe quedar rojo y el 2 dorado (no al revés).
          const played = i < attempted;
          const ok = roundResults[i];
          return (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: "50%",
              background: played ? (ok ? "#fce9a8" : "#ff6b6b") : "rgba(255,255,255,0.2)",
              boxShadow: played ? "0 0 10px currentColor" : "none",
              color: ok ? "#fce9a8" : "#ff6b6b",
            }} />
          );
        })}
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
      `}</style>
      <VocesGame key={`voces-${restartTick}`} app={app} setApp={setApp} go={go} onRestart={restart} />
    </>
  );
}

function VocesGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "De tantas formas se habla en Ecuador";

  const [ronda, setRonda] = useStateG(0);

  // Picks por ronda (una sola vez por montaje).
  const [r0Pick] = useStateG(() => makeProblemR0());
  const [r1Pick] = useStateG(() => makeProblemR1());
  const [r2Pick] = useStateG(() => makeProblemR2());

  // R0 — emparejar: {nacId: lengua}
  const [r0Links, setR0Links] = useStateG({});
  const [r0Selected, setR0Selected] = useStateG(null);
  const [r0Locked, setR0Locked] = useStateG(false);

  // R2 — clasificar: {fichaId: binId}
  const [r2Placed, setR2Placed] = useStateG({});
  const [r2Locked, setR2Locked] = useStateG(false);

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
  // REINICIAR remonta VocesGame con key nueva; aliveRef evita que los timers
  // de revelado/avance pendientes disparen setState/navegación sobre el árbol
  // muerto (warning de React + navegación fantasma a results).
  const aliveRef = useRefG(true);

  useEffectG(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started.current) / 1000)), 500);
    return () => { aliveRef.current = false; clearInterval(id); };
  }, []);

  // ── Estados de completitud por ronda
  const r0AllLinked = r0Pick.pairs.every((p) => r0Links[p.id]);
  // R2: el niño deja 1 palabra en la bandeja (la que cree que NO es tecnicismo)
  // y ubica las otras 4. VERIFICAR se habilita cuando queda como máximo 1 ficha
  // sin ubicar, sea cual sea — puede equivocarse de cuál dejar y se le marcará.
  const r2PlacedCount = r2Pick.fichas.filter((f) => r2Placed[f.id]).length;
  const r2EnoughPlaced = r2PlacedCount >= r2Pick.fichas.length - 1;

  // R0 y R2 usan VERIFICAR manual. R1 (selector) se auto-evalúa.
  const canVerify =
    ronda === 0 ? (r0AllLinked && !r0Locked) :
    ronda === 2 ? (r2EnoughPlaced && !r2Locked) :
    false;

  function handleVerifyR0() {
    if (!r0AllLinked || r0Locked) return;
    setR0Locked(true);
    const pairs = r0Pick.pairs;
    const okCount = pairs.filter((p) => r0Links[p.id] === p.lang).length;
    const correct = okCount === pairs.length;
    const wrong = pairs.filter((p) => r0Links[p.id] !== p.lang);
    // Reporte reconstruible: al fallar, lista qué enlazó el niño vs lo correcto.
    const u = correct ? `${okCount}/${pairs.length} ✓` : wrong.map((p) => `${p.nac}→${r0Links[p.id] || "—"}`).join(" · ");
    const c = correct ? "Cada nacionalidad con su lengua" : wrong.map((p) => `${p.nac}→${p.lang}`).join(" · ");
    const reto = "Empareja: " + pairs.map((p) => p.nac).join(", ");
    setTimeout(() => answer(correct, u, c, "🗣️", reto, null), correct ? 500 : 5000);
  }

  function handleVerifyR2() {
    if (!r2EnoughPlaced || r2Locked) return;
    setR2Locked(true);
    const fichas = r2Pick.fichas;
    const blbl = {}; r2Pick.bins.forEach((b) => { blbl[b.id] = b.label; });
    // El distractor (tipo "none") acierta si quedó SIN ubicar; los tecnicismos
    // aciertan si están en su materia.
    const isOk = (f) => f.tipo === "none" ? !r2Placed[f.id] : r2Placed[f.id] === f.tipo;
    const okCount = fichas.filter(isOk).length;
    const correct = okCount === fichas.length;
    const wrong = fichas.filter((f) => !isOk(f));
    // Reporte reconstruible: ficha→materia elegida (o "(sin ubicar)") vs la correcta.
    const u = correct ? `${okCount}/${fichas.length} ✓` : wrong.map((f) => `${f.text}→${blbl[r2Placed[f.id]] || "(sin ubicar)"}`).join(" · ");
    const c = correct ? "Cada palabra en su lugar" : wrong.map((f) => `${f.text}→${f.tipo === "none" ? "ninguna" : blbl[f.tipo]}`).join(" · ");
    const reto = "Clasifica: " + fichas.map((f) => f.text).join(", ");
    setTimeout(() => answer(correct, u, c, "🧩", reto, null), correct ? 500 : 5000);
  }

  function handleVerify() {
    if (ronda === 0) handleVerifyR0();
    else if (ronda === 2) handleVerifyR2();
  }

  function handleR1Finish(res) {
    const correct = res.correct >= res.total - 1; // permite 1 fallo entre las 6
    const misses = res.misses || [];
    const LBL = { kichwa: "Kichwa", extr: "Extranjerismo", coloq: "Coloquial" };
    // Reporte reconstruible: si hubo fallo(s), lista palabra→origen elegido vs
    // correcto (visible incluso cuando la ronda se cuenta "Correcto" con 1 error).
    const u = misses.length === 0 ? `${res.correct}/${res.total} ✓` : misses.map((m) => `${m.word}→${LBL[m.picked] || m.picked}`).join(" · ");
    const c = misses.length === 0 ? "Cada palabra en su origen" : misses.map((m) => `${m.word}→${LBL[m.correct] || m.correct}`).join(" · ");
    const reto = "Origen de: " + r1Pick.cards.map((cd) => cd.word).join(", ");
    answer(correct, u, c, "🔤", reto, null);
  }

  function handleErase() {
    if (ronda === 0 && !r0Locked) { setR0Links({}); setR0Selected(null); }
    else if (ronda === 2 && !r2Locked) setR2Placed({});
  }

  function answer(isCorrect, userText, correctText, opIcon, reto, note) {
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
    setFeedbackMsg(isCorrect ? `+${earned} ⭐` : ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]);
    setAttempted(newAttempted);
    setSolved(newSolved);
    setStars(newStarsTotal);
    setStarsSession(newStarsSession);
    setLog(newLog);

    const wait = isCorrect ? 1100 : 1600;
    setTimeout(() => {
      if (!aliveRef.current) return;
      setFeedback(null);
      setFeedbackMsg("");
      if (newAttempted >= 3) {
        setApp((s) => ({
          ...s, stars: newStarsTotal,
          lastResult: { category: catLabel, solved: newSolved, total: 3, time: Math.floor((Date.now() - started.current) / 1000), starsEarned: newStarsSession, log: newLog },
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
    ronda === 0 ? "Une cada nacionalidad con la lengua que habla." :
    ronda === 1 ? "Clasifica cada palabra según su origen." :
    "Arrástrala a su materia.";
  const bocadillo =
    ronda === 0 ? "Toca una nacionalidad\ny luego su lengua\npara enlazarlas." :
    ronda === 1 ? "Toca el origen: kichwa,\nextranjerismo o\ncoloquial ecuatoriano." :
    "Arrástrala a su materia.\nUna no es tecnicismo:\ndéjala en la bandeja.";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <GameHUD elapsed={elapsed} stars={stars} attempted={attempted} solved={solved} total={3} roundResults={log.map((e) => e.isCorrect)} />
      <CharacterCorner char={char} message={bocadillo} />
      <GameEnunciado text={enunciado} top={104} />

      {ronda === 0 && (
        <EmparejaCard
          pick={r0Pick}
          links={r0Links}
          setLinks={setR0Links}
          selected={r0Selected}
          setSelected={setR0Selected}
          locked={r0Locked}
        />
      )}

      {ronda === 1 && (
        <OrigenSelector pick={r1Pick} onFinish={handleR1Finish} />
      )}

      {ronda === 2 && (
        <TecnicismoBins
          pick={r2Pick}
          placed={r2Placed}
          setPlaced={setR2Placed}
          locked={r2Locked}
        />
      )}

      <ActionRail
        canVerify={canVerify}
        onVerify={handleVerify}
        hideVerify={ronda === 1}
        showErase={ronda === 0 || ronda === 2}
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
// R0 · Une la nacionalidad con su lengua (EMPAREJAR). Dos columnas:
// nacionalidades (izq) y lenguas (der). Toca una nacionalidad para
// seleccionarla y luego una lengua para enlazarlas; cada par toma un
// color. Tocar una nacionalidad enlazada la desconecta. Al VERIFICAR
// (locked) cada enlace se marca verde (correcto) o rojo (incorrecto) y
// se revela la lengua correcta de los fallos (§11).
// ─────────────────────────────────────────────────────────────
function EmparejaCard({ pick, links, setLinks, selected, setSelected, locked }) {
  const pairs = pick.pairs;
  const langs = pick.langs;
  const wrapRef = useRefG(null);
  const nacRefs = useRefG({});
  const langRefs = useRefG({});
  const [lines, setLines] = useStateG([]);

  const colorOf = (nacId) => {
    const i = pairs.findIndex((p) => p.id === nacId);
    return LINK_COLORS[i % LINK_COLORS.length];
  };
  // lengua -> nacId que la eligió
  const langToNac = {};
  Object.keys(links).forEach((nacId) => { const l = links[nacId]; if (l) langToNac[l] = nacId; });

  // Mide las posiciones de los botones enlazados y arma los segmentos SVG
  // (de borde derecho de la nacionalidad → borde izquierdo de la lengua).
  useEffectG(() => {
    function measure() {
      const wrap = wrapRef.current;
      if (!wrap) { setLines([]); return; }
      const w = wrap.getBoundingClientRect();
      // El stage se escala con transform: scale(); getBoundingClientRect()
      // devuelve px ya escalados, pero el espacio interno del SVG es sin
      // escalar. Dividimos por el factor de escala (ancho real / ancho layout).
      const scale = wrap.offsetWidth ? w.width / wrap.offsetWidth : 1;
      const next = [];
      Object.keys(links).forEach((nacId) => {
        const lang = links[nacId];
        const ne = nacRefs.current[nacId];
        const le = langRefs.current[lang];
        if (!ne || !le) return;
        const a = ne.getBoundingClientRect();
        const b = le.getBoundingClientRect();
        const pair = pairs.find((p) => p.id === nacId);
        const wrongLink = !!(locked && pair && pair.lang !== lang);
        let color = colorOf(nacId);
        if (locked && pair) color = pair.lang === lang ? "#2ecc8f" : "#ff6b6b";
        next.push({
          key: nacId, color, wrong: wrongLink, correctLang: pair ? pair.lang : "",
          x1: (a.right - w.left) / scale, y1: (a.top - w.top + a.height / 2) / scale,
          x2: (b.left - w.left) / scale, y2: (b.top - w.top + b.height / 2) / scale,
        });
      });
      setLines(next);
    }
    measure();
    const t = setTimeout(measure, 60);
    window.addEventListener("resize", measure);
    return () => { clearTimeout(t); window.removeEventListener("resize", measure); };
  }, [links, locked]);

  function tapNac(nacId) {
    if (locked) return;
    if (links[nacId]) {
      setLinks((prev) => { const n = { ...prev }; delete n[nacId]; return n; });
      setSelected(null);
      return;
    }
    setSelected((s) => (s === nacId ? null : nacId));
  }
  function tapLang(lang) {
    if (locked || !selected) return;
    setLinks((prev) => {
      const n = { ...prev };
      for (const k of Object.keys(n)) { if (n[k] === lang) delete n[k]; }
      n[selected] = lang;
      return n;
    });
    setSelected(null);
  }

  const BOX_W = 150;
  // La columna LENGUA es más ancha: algunas lenguas son de dos palabras
  // ("shiwiar chicham") y se recortaban en 150px de ancho fijo.
  const LANG_W = 168;

  return (
    <div data-qa="zona-central" style={{
      position: "absolute", top: 150, bottom: 18, left: "50%", transform: "translateX(-50%)",
      width: 470, display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <div ref={wrapRef} style={{ position: "relative", display: "flex", gap: 78, justifyContent: "center", flex: 1, width: "100%", alignItems: "stretch" }}>
        {/* Líneas de enlace */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible", zIndex: 1 }}>
          {lines.map((ln) => (
            <g key={ln.key}>
              <line x1={ln.x1} y1={ln.y1} x2={ln.x2} y2={ln.y2}
                stroke={ln.color} strokeWidth={3.5} strokeLinecap="round"
                style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.35))" }} />
              <circle cx={ln.x1} cy={ln.y1} r={4.5} fill={ln.color} stroke="#fff" strokeWidth={1.5} />
              <circle cx={ln.x2} cy={ln.y2} r={4.5} fill={ln.color} stroke="#fff" strokeWidth={1.5} />
            </g>
          ))}
        </svg>

        {/* Etiqueta de corrección SOBRE el enlace: la lengua correcta del fallo,
            centrada en el espacio entre columnas, a la altura de su nacionalidad
            (una por fila → no se solapan). No añade altura a las columnas. */}
        {lines.filter((ln) => ln.wrong).map((ln) => (
          <div key={"fix-" + ln.key} style={{
            position: "absolute", left: (ln.x1 + ln.x2) / 2, top: ln.y1, transform: "translate(-50%,-50%)",
            zIndex: 4, pointerEvents: "none", whiteSpace: "nowrap",
            background: "rgba(8,28,26,0.94)", border: "1.5px solid #2ecc8f", borderRadius: 9,
            padding: "2px 9px", boxShadow: "0 3px 10px rgba(0,0,0,0.5)",
            fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 11.5, lineHeight: 1.15,
            color: "#7dffc4",
          }}>✓ {ln.correctLang}</div>
        ))}

        {/* Columna NACIONALIDAD */}
        <div style={{ display: "flex", flexDirection: "column", width: BOX_W, position: "relative", zIndex: 2 }}>
          <div style={{
            fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 11,
            letterSpacing: "0.08em", color: "rgba(252,233,168,0.85)", textAlign: "center",
            textTransform: "uppercase", marginBottom: 4,
          }}>Nacionalidad</div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 8 }}>
          {pairs.map((p) => {
            const linked = !!links[p.id];
            const sel = selected === p.id;
            const col = colorOf(p.id);
            const ok = locked && links[p.id] === p.lang;
            const wrong = locked && linked && links[p.id] !== p.lang;
            let bg = "rgba(255,255,255,0.94)", ink = "#15303a", border = "rgba(116,72,32,0.25)";
            if (ok) { bg = "linear-gradient(180deg,#2ecc8f,#22a06c)"; ink = "#fff"; border = "#2ecc8f"; }
            else if (wrong) { bg = "linear-gradient(180deg,#ff6b6b,#dc5050)"; ink = "#fff"; border = "#ff6b6b"; }
            else if (sel) { border = "#4fd8ff"; }
            else if (linked) { border = col; }
            return (
              <div key={p.id}>
                <button ref={(el) => { nacRefs.current[p.id] = el; }} onClick={() => tapNac(p.id)} disabled={locked}
                  style={{
                    position: "relative", width: "100%", height: 44, borderRadius: 11,
                    border: `2.5px solid ${border}`, background: bg, color: ink,
                    cursor: locked ? "default" : "pointer",
                    fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 15,
                    boxShadow: sel ? "0 0 16px rgba(79,216,255,0.6)" : "0 3px 8px rgba(0,0,0,0.22)",
                    transform: sel ? "translateY(-1px)" : "none",
                    transition: "all 0.14s ease", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}>
                  <span>{p.nac}</span>
                  {ok && (
                    <span style={{
                      position: "absolute", top: -8, right: -8, width: 20, height: 20, borderRadius: "50%",
                      background: "#2ecc8f", color: "#fff", fontSize: 12, fontWeight: 800,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: "2px solid #fff", boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                    }}>✓</span>
                  )}
                </button>
              </div>
            );
          })}
          </div>
        </div>

        {/* Columna LENGUA */}
        <div style={{ display: "flex", flexDirection: "column", width: LANG_W, position: "relative", zIndex: 2 }}>
          <div style={{
            fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 11,
            letterSpacing: "0.08em", color: "rgba(252,233,168,0.85)", textAlign: "center",
            textTransform: "uppercase", marginBottom: 4,
          }}>Lengua</div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 8 }}>
          {langs.map((lang) => {
            const nacId = langToNac[lang];
            const linked = !!nacId;
            const col = linked ? colorOf(nacId) : null;
            const partnerLang = linked ? pairs.find((p) => p.id === nacId).lang : null;
            const ok = locked && linked && partnerLang === lang;
            const wrong = locked && linked && partnerLang !== lang;
            let bg = "rgba(255,255,255,0.94)", ink = "#15303a", border = "rgba(116,72,32,0.25)";
            if (ok) { bg = "linear-gradient(180deg,#2ecc8f,#22a06c)"; ink = "#fff"; border = "#2ecc8f"; }
            else if (wrong) { bg = "linear-gradient(180deg,#ff6b6b,#dc5050)"; ink = "#fff"; border = "#ff6b6b"; }
            else if (linked) { border = col; }
            const clickable = !locked && !!selected;
            return (
              <button key={lang} ref={(el) => { langRefs.current[lang] = el; }} onClick={() => tapLang(lang)} disabled={locked}
                style={{
                  position: "relative", width: "100%", minHeight: 44, borderRadius: 11,
                  border: `2.5px solid ${border}`, background: bg, color: ink,
                  cursor: clickable ? "pointer" : "default",
                  fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 13.5, lineHeight: 1.12,
                  boxShadow: "0 3px 8px rgba(0,0,0,0.22)", padding: "4px 8px",
                  transition: "all 0.14s ease", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}>
                <span>{lang}</span>
              </button>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// R1 · ¿De dónde viene la palabra? (SELECTOR, §13). Aparece una palabra
// del libro y se toca su origen entre 3 chips. Al acertar: breve verde y
// avanza. Al fallar: marca la opción elegida en rojo, revela la correcta
// en verde y AVANZA automáticamente (no deja atascado al estudiante).
// Auto-evaluado: al terminar las 6 tarjetas llama onFinish({correct,total}).
// ─────────────────────────────────────────────────────────────
function OrigenSelector({ pick, onFinish }) {
  const cards = pick.cards;
  const cats = pick.cats;
  const [idx, setIdx] = useStateG(0);
  const [chosen, setChosen] = useStateG(null);
  const [locked, setLocked] = useStateG(false);
  const correctRef = useRefG(0);
  const doneRef = useRefG(false);
  // Acumula los fallos por carta {word, picked, correct} para el reporte
  // reconstruible; aliveRef evita onFinish/setState tras desmontar (REINICIAR).
  const missesRef = useRefG([]);
  const aliveRef = useRefG(true);
  useEffectG(() => () => { aliveRef.current = false; }, []);

  const card = cards[idx];

  function choose(catId) {
    if (locked) return;
    setChosen(catId);
    setLocked(true);
    const ok = catId === card.cat;
    if (ok) correctRef.current += 1;
    else missesRef.current.push({ word: card.word, picked: catId, correct: card.cat });
    const wait = ok ? 650 : 1250;
    setTimeout(() => {
      if (!aliveRef.current) return;
      if (idx + 1 >= cards.length) {
        if (doneRef.current) return;
        doneRef.current = true;
        onFinish({ correct: correctRef.current, total: cards.length, misses: missesRef.current });
      } else {
        setIdx((i) => i + 1);
        setChosen(null);
        setLocked(false);
      }
    }, wait);
  }

  return (
    <div data-qa="zona-central" style={{
      position: "absolute", top: 150, bottom: 18, left: "50%", transform: "translateX(-50%)",
      width: 470, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", gap: 26,
    }}>
      {/* Progreso */}
      <div style={{
        fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 13,
        color: "rgba(252,233,168,0.85)", letterSpacing: "0.04em",
      }}>
        Palabra {idx + 1} de {cards.length}
      </div>

      {/* Carta con la palabra */}
      <div key={card.id} style={{
        width: "fit-content", maxWidth: 360, padding: "16px 26px", borderRadius: 16,
        background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(238,246,244,0.94))",
        border: "3px solid #f2c260",
        boxShadow: "0 10px 24px rgba(0,0,0,0.4)",
        textAlign: "center",
        animation: "ed-pop-in 0.25s",
      }}>
        <div style={{
          fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 26, lineHeight: 1.15,
          color: "#15303a", fontStyle: "italic",
        }}>
          «{card.word}»
        </div>
      </div>

      {/* Chips de origen */}
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", width: "100%" }}>
        {cats.map((c) => {
          const isChosen = chosen === c.id;
          const isAnswer = locked && c.id === card.cat;
          const isWrongPick = locked && isChosen && c.id !== card.cat;
          let bg, ink, border, shake = false;
          if (isAnswer) { bg = "linear-gradient(180deg,#2ecc8f,#22a06c)"; ink = "#fff"; border = "#2ecc8f"; }
          else if (isWrongPick) { bg = "linear-gradient(180deg,#ff6b6b,#dc5050)"; ink = "#fff"; border = "#ff6b6b"; shake = true; }
          else { bg = "rgba(255,255,255,0.95)"; ink = "#15303a"; border = "rgba(116,72,32,0.25)"; }
          return (
            <button key={c.id} onClick={() => choose(c.id)} disabled={locked}
              style={{
                position: "relative", flex: "1 1 140px", maxWidth: 156, minHeight: 96,
                padding: "14px 10px", borderRadius: 16,
                border: `2.5px solid ${border}`, background: bg, color: ink,
                cursor: locked ? "default" : "pointer",
                fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 14, lineHeight: 1.18,
                boxShadow: "0 4px 10px rgba(0,0,0,0.28)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 7,
                transition: "all 0.14s ease",
                animation: shake ? "ed-shake-x 0.4s" : "none",
              }}>
              <span style={{ fontSize: 26, lineHeight: 1 }}>{c.emoji}</span>
              <span>{c.label}</span>
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
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// R2 · Cada tecnicismo a su mundo (CLASIFICAR). Bandeja de palabras + 4
// cajas (materias) en cuadrícula 2×2. Drag + tap-seleccionar + tap-caja.
// Al verificar (locked): cada palabra se marca verde (materia correcta) o
// roja (materia incorrecta).
// ─────────────────────────────────────────────────────────────
function TecnicismoBins({ pick, placed, setPlaced, locked }) {
  const fichas = pick.fichas;
  const bins = pick.bins;
  const [selected, setSelected] = useStateG(null);
  const TRAY = "__trayTecnicismos";

  function placeZone(zoneId, fichaId) {
    if (locked) return;
    setSelected(null);
    setPlaced((prev) => {
      const next = { ...prev };
      if (zoneId === TRAY) { delete next[fichaId]; return next; }
      if (!bins.some((b) => b.id === zoneId)) return next;
      next[fichaId] = zoneId;
      return next;
    });
  }
  function tapFicha(fichaId) {
    if (locked) return;
    if (placed[fichaId]) { setPlaced((prev) => { const n = { ...prev }; delete n[fichaId]; return n; }); setSelected(null); return; }
    setSelected((s) => (s === fichaId ? null : fichaId));
  }
  function tapBin(binId) {
    if (locked || !selected) return;
    placeZone(binId, selected);
  }

  const trayFichas = fichas.filter((f) => !placed[f.id]);
  // El niño deja 1 palabra en la bandeja (la que cree que no es tecnicismo);
  // el hint aparece cuando ya solo queda esa por decidir.
  const oneLeft = !locked && trayFichas.length === 1 && fichas.filter((f) => placed[f.id]).length >= fichas.length - 1;

  const ghost = (text) => `<div style="background:linear-gradient(180deg,#fce9a8,#e9c45a);color:#3a2608;padding:8px 14px;border-radius:12px;font-family:Fredoka,Nunito,sans-serif;font-weight:800;font-size:15px;border:2px solid #4fd8ff;box-shadow:0 8px 20px rgba(0,0,0,0.5);text-align:center;">${text}</div>`;

  return (
    <div data-qa="zona-central" style={{
      position: "absolute", top: 150, bottom: 12, left: "50%", transform: "translateX(-50%)",
      width: 390, display: "flex", flexDirection: "column", justifyContent: "flex-start", alignItems: "center", gap: 12,
    }}>
      {/* Bandeja de palabras por clasificar */}
      <div data-dropzone={TRAY} data-qa="bandeja" style={{
        display: "flex", gap: 9, flexWrap: "wrap", justifyContent: "center", alignItems: "center",
        minHeight: 48, width: 386, borderRadius: 12, padding: "8px 6px",
        background: "rgba(8,40,38,0.3)", border: "1.5px dashed rgba(95,224,208,0.4)",
      }}>
        {trayFichas.map((f) => {
          const sel = selected === f.id;
          // Al verificar, el distractor que quedó en la bandeja es ACIERTO:
          // se marca verde con "✓ no es tecnicismo".
          const okLeft = locked && f.tipo === "none";
          return (
            <div key={f.id}
              className={locked ? "" : "ed-draggable"}
              onPointerDown={locked ? undefined : makeDragHandler({
                item: f.id, disabled: locked, ghostHtml: ghost(f.text),
                onTap: tapFicha, onDrop: placeZone,
              })}
              style={{
                padding: "8px 16px", borderRadius: 11, textAlign: "center",
                background: okLeft ? "linear-gradient(180deg,#2ecc8f,#22a06c)" : sel ? "linear-gradient(180deg,#fce9a8,#e9c45a)" : "rgba(255,255,255,0.94)",
                color: okLeft ? "#fff" : "#3a2608", border: `2px solid ${okLeft ? "#2ecc8f" : sel ? "#4fd8ff" : "rgba(116,72,32,0.25)"}`,
                boxShadow: sel ? "0 0 16px rgba(79,216,255,0.6)" : "0 3px 8px rgba(0,0,0,0.25)",
                transform: sel ? "translateY(-2px)" : "none",
                fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 16, lineHeight: 1.2,
                cursor: locked ? "default" : "grab", touchAction: "none",
                transition: "all 0.15s ease",
              }}>
              {okLeft ? "✓ " : ""}{f.text}
              {okLeft && (
                <span style={{ display: "block", marginTop: 2, fontSize: 11, fontWeight: 800, color: "#eafff4", letterSpacing: "0.02em" }}>no es tecnicismo</span>
              )}
            </div>
          );
        })}
        {oneLeft && (
          <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 12.5, color: "rgba(255,255,255,0.75)", pointerEvents: "none", maxWidth: 150, lineHeight: 1.2 }}>
            ¿No es tecnicismo? Déjala aquí y pulsa VERIFICAR.
          </div>
        )}
      </div>

      {/* Cajas (materias) — cuadrícula 2×2 */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", width: 386 }}>
        {bins.map((bin) => {
          const inside = fichas.filter((f) => placed[f.id] === bin.id);
          return (
            <div key={bin.id} data-dropzone={bin.id}
              onClick={() => tapBin(bin.id)}
              style={{
                width: 186, minHeight: 92, borderRadius: 13, padding: "8px 7px 10px",
                background: "rgba(8,40,38,0.5)", border: `2.5px dashed ${bin.color}`,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                cursor: (selected && !locked) ? "pointer" : "default",
              }}>
              <div style={{ display: "flex", justifyContent: "center", width: "100%", pointerEvents: "none" }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                  fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 13,
                  color: "#fff", background: bin.color, borderRadius: 8, padding: "3px 12px",
                  letterSpacing: "0.02em", boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                }}>
                  <span style={{ fontSize: 15, lineHeight: 1 }}>{bin.emoji}</span>
                  <span>{bin.label}</span>
                </span>
              </div>
              {bin.hint && inside.length === 0 && (
                <div style={{
                  fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 10.5,
                  color: "rgba(252,233,168,0.7)", fontStyle: "italic", pointerEvents: "none",
                }}>{bin.hint}</div>
              )}
              {inside.map((f) => {
                const isDistractor = f.tipo === "none";
                const ok = locked ? f.tipo === bin.id : null; // el distractor nunca es correcto en una caja
                // Al fallar, revelamos a qué materia pertenecía realmente la
                // ficha ("→ Matemática"); si es el distractor, "→ no es tecnicismo".
                const correctBin = (locked && ok === false && !isDistractor) ? bins.find((b) => b.id === f.tipo) : null;
                return (
                  <div key={f.id}
                    className={locked ? "" : "ed-draggable"}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={locked ? undefined : makeDragHandler({
                      item: f.id, disabled: locked, ghostHtml: ghost(f.text),
                      onTap: tapFicha, onDrop: placeZone,
                    })}
                    style={{
                      fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 15,
                      padding: "6px 12px", borderRadius: 9, lineHeight: 1.2, textAlign: "center",
                      background: locked ? (ok ? "linear-gradient(180deg,#2ecc8f,#22a06c)" : "linear-gradient(180deg,#ff6b6b,#dc5050)") : "rgba(255,255,255,0.94)",
                      color: locked ? "#fff" : "#3a2608", boxShadow: "0 2px 5px rgba(0,0,0,0.25)",
                      cursor: locked ? "default" : "grab", touchAction: "none",
                    }}
                    title={locked ? "" : "Arrástralo a otra caja o a la bandeja"}>
                    {locked ? (ok ? "✓ " : "✗ ") : ""}{f.text}
                    {correctBin && (
                      <span style={{
                        display: "block", marginTop: 3,
                        fontSize: 11, fontWeight: 800, color: "#eafff4", letterSpacing: "0.02em",
                      }}>→ {correctBin.emoji} {correctBin.label}</span>
                    )}
                    {locked && isDistractor && (
                      <span style={{
                        display: "block", marginTop: 3,
                        fontSize: 11, fontWeight: 800, color: "#eafff4", letterSpacing: "0.02em",
                      }}>→ no es tecnicismo</span>
                    )}
                  </div>
                );
              })}
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
  return `${e.op || "·"}  ${String(e.a).slice(0, 60)}`;
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
                <td style={{ ...printStyles.td, ...printStyles.tdOp }}>{e.op || ""} {String(e.a).slice(0, 60)}</td>
                <td style={{ ...printStyles.td, ...printStyles.tdR }}>{String(e.userAnswer).slice(0, 90)}</td>
                <td style={{ ...printStyles.td, ...printStyles.tdR }}>{String(e.correctAnswer).slice(0, 90)}</td>
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
  const res = app.lastResult || { category: "De tantas formas se habla en Ecuador", solved: 0, total: 3, time: 0, starsEarned: 0, log: [] };
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
                    <td style={{ padding: "8px 8px", textAlign: "right", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{String(e.userAnswer).slice(0, 60)}</td>
                    <td style={{ padding: "8px 8px", textAlign: "right", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{String(e.correctAnswer).slice(0, 60)}</td>
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
