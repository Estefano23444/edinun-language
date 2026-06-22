// game-screens.jsx — GameScreen + ResultsScreen para JUEGO-14
// "Explorando la biblioteca" (TEMA 1 del libro EDINUN). Juego de 4 niveles por
// edad (selector en Home):
//   • NIVEL 1 (6 años) — BibliotecaGame: completar palabra con la sílaba
//     inicial (letra y / letra f). 3 rondas, misma mecánica.
//   • NIVEL 2 (10 años) — PoemasGame: ruleta · completa la rima · detective.
//   • NIVEL 3 (12 años) — VocesGame: figura literaria · clasifica rima · 3ª ronda.
//   • NIVEL 4 (14 años) — OpinionGame: tipo de texto · hecho/opinión · oración sin verbo.
//
// GameScreen enruta por app.level. El shell (HUD, personaje §1, enunciado,
// action rail, modales, feedback, reporte académico, scoring por tiempo) se
// hereda del estándar. ResultsScreen es genérica (Reto / Tu respuesta /
// Respuesta correcta) y sirve para ambos niveles.

const { useState: useStateG, useEffect: useEffectG, useRef: useRefG, useMemo: useMemoG } = React;

function PortalToBody({ children }) {
  return ReactDOM.createPortal(children, document.body);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function calcStars(isCorrect, exerciseSec) {
  return isCorrect ? Math.max(1, 10 - Math.floor(exerciseSec / 3)) : 0;
}

// Drag+tap con PointerEvents (funciona en táctil; mismo patrón que juego-10).
// Las fichas usan onPointerDown; los cajones se marcan con [data-dropzone].
// onTap(item) si fue un toque; onDrop(zoneId, item) si se soltó sobre un cajón.
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
        ghost.innerHTML = ghostHtml || `<div style="background:#fce9a8;color:#3a2608;padding:6px 12px;border-radius:10px;font-family:Fredoka,Nunito,sans-serif;font-weight:800;font-size:14px;border:2px solid #4fd8ff;box-shadow:0 6px 18px rgba(0,0,0,0.5);">${String(item).slice(0,60)}</div>`;
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

const ENCOURAGEMENTS = [
  "¡Casi! Sigue intentándolo.",
  "Las palabras tienen su truco 📖",
  "¡La próxima es tuya!",
  "Equivocarse también es aprender.",
  "Las letras son una aventura.",
  "¡Vamos a la siguiente!",
  "Cada error te acerca al acierto.",
];

// ═════════════════════════════════════════════════════════════
// SHELL COMPARTIDO — usado por ambos niveles
// ═════════════════════════════════════════════════════════════
function EnunciadoInline({ text }) {
  if (!text) return null;
  return (
    <div style={{
      maxWidth: 500, textAlign: "center",
      fontFamily: "var(--ed-font-display)", fontWeight: 700,
      fontSize: 17, lineHeight: 1.2,
      color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,0.6)",
      pointerEvents: "none",
    }}>
      {text}
    </div>
  );
}

function GameHUD({ elapsed, stars, attempted, solved, total = 3, app, setApp }) {
  const levels = (typeof LEVELS_CFG !== "undefined" && LEVELS_CFG) || (window.LEVELS_CFG || []);
  const currentId = (app && (app.currentCategory || app.level)) || "biblioteca";
  const [pendingLevel, setPendingLevel] = useStateG(null);

  function requestSwitch(lvId) {
    if (lvId === currentId) return;
    setPendingLevel(lvId);
  }
  function confirmSwitch() {
    if (!pendingLevel) return;
    const cfg = levels.find((l) => l.id === pendingLevel);
    if (!cfg) { setPendingLevel(null); return; }
    setApp((s) => ({ ...s, level: cfg.id, currentCategory: cfg.id, currentCatLabel: cfg.catLabel }));
    setPendingLevel(null);
  }

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

      {/* Pestañas de nivel (estilo juego-8): tema actual resaltado, tocar
          otra pide confirmación antes de cambiar. */}
      {levels.length > 1 && (
        <div data-qa="hud-temas" style={{
          position: "absolute", top: 22, left: "50%", transform: "translateX(-50%)",
          display: "flex", alignItems: "center", gap: 5,
        }}>
          {levels.map((lv) => {
            const active = lv.id === currentId;
            return (
              <button key={lv.id} onClick={() => requestSwitch(lv.id)}
                title={active ? "Tema actual" : `Cambiar a "${lv.label}"`}
                style={{
                  padding: "4px 12px", borderRadius: 999,
                  background: active ? lv.grad : "rgba(0,0,0,0.35)",
                  color: active ? lv.ink : "rgba(252,233,168,0.85)",
                  fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 11, letterSpacing: "0.02em",
                  border: active ? "1px solid rgba(255,255,255,0.55)" : "1px solid rgba(242,194,96,0.35)",
                  boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -2px 0 rgba(0,0,0,0.18), 0 0 12px rgba(255,255,255,0.18)" : "none",
                  cursor: active ? "default" : "pointer", transition: "all 0.18s ease", whiteSpace: "nowrap",
                }}>
                {lv.label}
              </button>
            );
          })}
        </div>
      )}

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

      <SwitchLevelModal pendingLevel={pendingLevel} levels={levels}
        attempted={attempted} total={total}
        onCancel={() => setPendingLevel(null)} onConfirm={confirmSwitch} />
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
          <h2 className="ed-h1" style={{ fontSize: 22, lineHeight: 1.15, marginBottom: 8 }}>¿Ir a "{cfg.label}"?</h2>
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

// CharacterCorner canónico (shell-standards.md §1): bocadillo con
// ed-float-soft (flota en sincronía con el personaje), maxWidth 208 (se
// adapta al texto), char floating size 190, cola centrada.
function CharacterCorner({ char, message }) {
  return (
    <div data-qa="personaje" style={{
      position: "absolute", left: 8, bottom: 90, width: 220,
      pointerEvents: "none", textAlign: "center",
    }}>
      <div data-qa="bocadillo" className="ed-float-soft" style={{
        position: "absolute", left: 0, right: 0, bottom: "100%",
        display: "flex", justifyContent: "center", pointerEvents: "none",
      }}>
        <div style={{
          position: "relative", maxWidth: 208,
          background: "linear-gradient(180deg, rgba(20,12,55,0.95), rgba(10,6,35,0.95))",
          border: "1.5px solid rgba(242,194,96,0.65)",
          borderRadius: 16, padding: "10px 14px",
          fontFamily: "var(--ed-font-display)",
          fontWeight: 700, fontSize: 14, lineHeight: 1.25,
          color: "#fce9a8", textAlign: "center", whiteSpace: "pre-line",
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

function ActionRail({ canVerify, onVerify, showErase, onErase, onRestart, onExit, hideVerify }) {
  return (
    <div data-qa="acciones" style={{
      position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
      display: "flex", flexDirection: "column", gap: 12, width: 150,
    }}>
      {!hideVerify && (
        <button className="ed-btn ed-btn-verify"
          onClick={() => { if (canVerify && onVerify) onVerify(); }}
          disabled={!canVerify}
          style={{
            fontSize: 15, padding: "0 10px", height: 56, fontWeight: 800, letterSpacing: "0.04em",
            opacity: canVerify ? 1 : 0.45, cursor: canVerify ? "pointer" : "not-allowed",
          }}>
          ¡VERIFICAR!
        </button>
      )}
      {showErase && (
        <button className="ed-btn ed-btn-erase" onClick={onErase}
          style={{ fontSize: 15, padding: "0 10px", height: 56, fontWeight: 800, letterSpacing: "0.04em" }}>
          BORRAR
        </button>
      )}
      <button className="ed-btn ed-btn-restart" onClick={onRestart}
        style={{ fontSize: 15, padding: "0 10px", height: 56, fontWeight: 800, letterSpacing: "0.04em" }}>
        REINICIAR
      </button>
      <button className="ed-btn ed-btn-ghost" onClick={onExit}
        style={{ fontSize: 15, padding: "0 10px", height: 56, fontWeight: 800, letterSpacing: "0.04em" }}>
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
        position: "fixed", inset: 0, zIndex: 1000, pointerEvents: "none",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14,
        background: "rgba(0,0,0,0.62)", backdropFilter: "blur(3px)", animation: "ed-pop-in 0.3s",
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
            background: "rgba(0,0,0,0.55)", padding: "8px 26px", borderRadius: 999,
            textShadow: "0 2px 6px rgba(0,0,0,0.6)", textAlign: "center", maxWidth: "80vw",
          }}>
            {feedback === "ok" ? feedbackMsg : `${feedbackMsg} — ${charName}`}
          </div>
        )}
      </div>
    </PortalToBody>
  );
}

function ConfirmModal({ open, onClose, label, labelColor, title, body, confirmText, onConfirm, glow }) {
  if (!open) return null;
  return (
    <PortalToBody>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.62)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "ed-pop-in 0.18s", padding: 16,
      }}>
        <div onClick={(e) => e.stopPropagation()} className="ed-card"
          style={{ padding: 24, maxWidth: 440, textAlign: "center", boxShadow: `var(--ed-shadow-card), 0 0 40px ${glow || "rgba(255,107,107,0.3)"}` }}>
          <div className="ed-label" style={{ color: labelColor, marginBottom: 6 }}>{label}</div>
          <h2 className="ed-h1" style={{ fontSize: 22, lineHeight: 1.15, marginBottom: 8 }}>{title}</h2>
          <p className="ed-body" style={{ marginBottom: 16, fontSize: 14 }}>{body}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button className="ed-btn ed-btn-ghost" onClick={onClose} style={{ height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
              SEGUIR JUGANDO
            </button>
            <button className="ed-btn ed-btn-primary" onClick={onConfirm} style={{ height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </PortalToBody>
  );
}

// answer() compartido: registra el log y avanza/termina. Devuelve un
// closure ligado al estado del juego que lo llama.
function makeAnswer(ctx) {
  return function answer(isCorrect, userText, correctText, opIcon, reto) {
    if (ctx.aliveRef && !ctx.aliveRef.current) return;
    if (typeof window.markFirstAttempt === "function") window.markFirstAttempt();
    const exerciseSec = Math.max(0, Math.floor((Date.now() - ctx.exerciseStart.current) / 1000));
    const earned = calcStars(isCorrect, exerciseSec);
    const newAttempted = ctx.attempted + 1;
    const newSolved = ctx.solved + (isCorrect ? 1 : 0);
    const newStarsTotal = ctx.stars + earned;
    const newStarsSession = ctx.starsSession + earned;

    const entry = {
      idx: newAttempted, a: reto || correctText, b: userText, op: opIcon || "·",
      correctAnswer: correctText, userAnswer: userText,
      isCorrect, time: exerciseSec, earned,
    };
    const newLog = [...ctx.log, entry];

    ctx.setFeedback(isCorrect ? "ok" : "err");
    ctx.setFeedbackMsg(isCorrect ? `+${earned} ⭐` : ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]);
    ctx.setAttempted(newAttempted);
    ctx.setSolved(newSolved);
    ctx.setStars(newStarsTotal);
    ctx.setStarsSession(newStarsSession);
    ctx.setLog(newLog);

    const wait = isCorrect ? 1000 : 1450;
    setTimeout(() => {
      if (ctx.aliveRef && !ctx.aliveRef.current) return;
      ctx.setFeedback(null);
      ctx.setFeedbackMsg("");
      if (newAttempted >= 3) {
        ctx.setApp((s) => ({
          ...s, stars: newStarsTotal,
          lastResult: { category: ctx.catLabel, solved: newSolved, total: 3, time: ctx.elapsed, starsEarned: newStarsSession, log: newLog },
        }));
        window.incrementGamesCompleted && window.incrementGamesCompleted();
        ctx.go("results");
      } else {
        ctx.onNextRound && ctx.onNextRound();
        ctx.exerciseStart.current = Date.now();
      }
    }, wait);
  };
}

// ═════════════════════════════════════════════════════════════
// NIVEL 1 — BIBLIOTECA: completar palabra con la sílaba inicial
// ═════════════════════════════════════════════════════════════
const WORD_BANK = [
  { word: "yoyo",   syll: "yo", emoji: "🪀", set: "y" },
  { word: "yate",   syll: "ya", emoji: "⛵", set: "y" },
  { word: "yegua",  syll: "ye", emoji: "🐴", set: "y" },
  { word: "yoga",   syll: "yo", emoji: "🧘", set: "y" },
  { word: "yuca",   syll: "yu", emoji: "🥔", set: "y" },
  { word: "foca",    syll: "fo", emoji: "🦭", set: "f" },
  { word: "foco",    syll: "fo", emoji: "💡", set: "f" },
  { word: "foto",    syll: "fo", emoji: "📷", set: "f" },
  { word: "fideo",   syll: "fi", emoji: "🍜", set: "f" },
  { word: "fiesta",  syll: "fi", emoji: "🎉", set: "f" },
  { word: "familia", syll: "fa", emoji: "👪", set: "f" },
  { word: "fuego",   syll: "fu", emoji: "🔥", set: "f" },
];
const SYLL_SETS = {
  y: ["ya", "ye", "yi", "yo", "yu"],
  f: ["fa", "fe", "fi", "fo", "fu"],
};
const ROUNDS_CFG = [
  { idx: 0, sets: ["y"] },
  { idx: 1, sets: ["f"] },
  { idx: 2, sets: ["y", "f"] },
];
const RECENT_KEY_BIB = "edinun_juego14_recientes_v1";
const RECENT_LIMIT_BIB = 6;
function getRecentBib() {
  try { const r = localStorage.getItem(RECENT_KEY_BIB); const a = r ? JSON.parse(r) : []; return Array.isArray(a) ? a : []; }
  catch { return []; }
}
function pushRecentBib(word) {
  const a = getRecentBib().filter((w) => w !== word);
  a.unshift(word);
  try { localStorage.setItem(RECENT_KEY_BIB, JSON.stringify(a.slice(0, RECENT_LIMIT_BIB))); } catch {}
}
function makeProblemBib(roundIdx, usedKeys, avoidSyll) {
  const cfg = ROUNDS_CFG[roundIdx] || ROUNDS_CFG[0];
  const exclude = new Set([...usedKeys, ...getRecentBib()]);
  let pool = WORD_BANK.filter((w) => cfg.sets.includes(w.set) && !exclude.has(w.word));
  if (pool.length === 0) pool = WORD_BANK.filter((w) => cfg.sets.includes(w.set) && !usedKeys.has(w.word));
  if (pool.length === 0) pool = WORD_BANK.filter((w) => cfg.sets.includes(w.set));
  // Evita repetir la sílaba de la ronda anterior (ej. dos "fi" seguidas),
  // siempre que queden opciones con otra sílaba.
  if (avoidSyll) {
    const noSyll = pool.filter((w) => w.syll !== avoidSyll);
    if (noSyll.length > 0) pool = noSyll;
  }
  const pick = pool[Math.floor(Math.random() * pool.length)];
  const correct = pick.syll;
  const others = shuffle(SYLL_SETS[pick.set].filter((s) => s !== correct)).slice(0, 2);
  return { word: pick.word, syll: pick.syll, emoji: pick.emoji, traySylls: shuffle([correct, ...others]) };
}

function BibliotecaGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "Explorando la biblioteca";

  const usedRef = useRefG(new Set());
  const lastSyllRef = useRefG(null);
  const [problem, setProblem] = useStateG(() => {
    const p = makeProblemBib(0, usedRef.current, null);
    usedRef.current.add(p.word); pushRecentBib(p.word);
    lastSyllRef.current = p.syll;
    return p;
  });
  const [picked, setPicked] = useStateG(null);
  // Fase de revelado al fallar: muestra la sílaba correcta en verde ✓ SIN el
  // overlay "¡UPS!" durante REVEAL_MS, para dar tiempo a ver cuál era la
  // respuesta (mismo patrón que el juego-9; N3/N4 ya tienen retardo propio).
  const [reveal, setReveal] = useStateG(false);
  const REVEAL_MS = 1800;
  const [elapsed, setElapsed] = useStateG(0);
  const [stars, setStars] = useStateG(0);
  const [solved, setSolved] = useStateG(0);
  const [attempted, setAttempted] = useStateG(0);
  const [starsSession, setStarsSession] = useStateG(0);
  const [feedback, setFeedback] = useStateG(null);
  const [feedbackMsg, setFeedbackMsg] = useStateG("");
  const [confirmingExit, setConfirmingExit] = useStateG(false);
  const [confirmingRestart, setConfirmingRestart] = useStateG(false);
  const [log, setLog] = useStateG([]);
  const started = useRefG(Date.now());
  const exerciseStart = useRefG(Date.now());
  // Vivo mientras el componente esté montado; los timeouts pendientes lo
  // consultan y abortan al desmontar (SALIR/REINICIAR/cambio de nivel) para no
  // disparar navegación/estado sobre una sesión que ya no existe.
  const aliveRef = useRefG(true);

  useEffectG(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started.current) / 1000)), 500);
    return () => { clearInterval(id); aliveRef.current = false; };
  }, []);

  const answer = makeAnswer({
    attempted, solved, stars, starsSession, log, elapsed, catLabel,
    exerciseStart, setApp, go, aliveRef,
    setFeedback, setFeedbackMsg, setAttempted, setSolved, setStars, setStarsSession, setLog,
    onNextRound: () => {
      const p = makeProblemBib(attempted + 1, usedRef.current, lastSyllRef.current);
      usedRef.current.add(p.word); pushRecentBib(p.word);
      lastSyllRef.current = p.syll;
      setProblem(p); setPicked(null);
    },
  });

  function verify() {
    if (feedback || reveal) return;
    if (!picked) {
      setFeedback("err"); setFeedbackMsg("Toca una sílaba primero");
      setTimeout(() => { setFeedback(null); setFeedbackMsg(""); }, 700);
      return;
    }
    if (picked !== problem.syll) {
      // Revela la correcta en verde ✓ (sin overlay) y luego muestra "¡UPS!".
      setReveal(true);
      setTimeout(() => {
        if (!aliveRef.current) return;
        setReveal(false);
        answer(false, picked, problem.syll, problem.emoji, problem.word);
      }, REVEAL_MS);
      return;
    }
    answer(true, picked, problem.syll, problem.emoji, problem.word);
  }

  const restLetters = problem.word.slice(problem.syll.length).split("");
  const wordLen = problem.word.length;
  const SLOT_W = wordLen <= 4 ? 64 : wordLen <= 6 ? 58 : 52;
  const SLOT_H = wordLen <= 4 ? 72 : wordLen <= 6 ? 66 : 60;
  const SLOT_GAP = wordLen <= 6 ? 8 : 6;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <GameHUD elapsed={elapsed} stars={stars} attempted={attempted} solved={solved} total={3} app={app} setApp={setApp} />
      <CharacterCorner char={char} message={"Toca la sílaba que falta."} />
      <EnunciadoWrap text="Completa la palabra con la sílaba." />

      {/* ZONA CENTRAL: emoji + slot + resto de la palabra */}
      <div data-qa="zona-central" style={{
        position: "absolute", top: 128, left: "50%", transform: "translateX(-50%)",
        width: 460, textAlign: "center",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 24,
      }}>
        <div style={{
          width: 170, height: 155, borderRadius: 20,
          background: "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(240,235,225,0.9))",
          border: "3px solid #f2c260",
          boxShadow: "0 12px 28px rgba(0,0,0,0.45), 0 0 0 1px rgba(242,194,96,0.35), inset 0 -4px 0 rgba(0,0,0,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 112, lineHeight: 1,
        }}>{problem.emoji}</div>

        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: SLOT_GAP, padding: "4px 6px" }}>
          <button onClick={() => { if (picked && !feedback && !reveal) setPicked(null); }} style={{
            width: SLOT_W * 1.6, height: SLOT_H, borderRadius: 12,
            border: `2.5px solid ${feedback === "ok" ? "#2ecc8f" : (feedback === "err" || reveal) ? "#ff6b6b" : picked ? "#fce9a8" : "rgba(242,194,96,0.55)"}`,
            background: picked ? "linear-gradient(180deg, rgba(252,233,168,0.95), rgba(217,164,65,0.85))" : "rgba(10,6,35,0.55)",
            color: picked ? "#3a2608" : "rgba(252,233,168,0.5)",
            fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: SLOT_H * 0.55,
            cursor: picked ? "pointer" : "default",
            boxShadow: picked ? "0 4px 10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.4)" : "0 0 14px rgba(252,233,168,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
            transition: "all 0.15s ease", letterSpacing: "0.04em",
          }}>{picked || "__"}</button>

          {restLetters.map((ch, i) => (
            <div key={i} style={{
              width: SLOT_W, height: SLOT_H, display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: SLOT_H * 0.55,
              color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,0.5)", borderBottom: "3px solid rgba(255,255,255,0.35)",
            }}>{ch}</div>
          ))}
        </div>
      </div>

      {/* Bandeja de 3 sílabas — §11: al fallar marca la correcta en verde */}
      <div data-qa="bandeja" style={{
        position: "absolute", bottom: 30, left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: 14, flexWrap: "nowrap", maxWidth: 720, justifyContent: "center",
      }}>
        {problem.traySylls.map((syll, trayIdx) => {
          const color = ["#ef5a5a", "#4fa0ff", "#2ecc8f"][trayIdx % 3];
          const isPicked = picked === syll;
          const showCorrect = (feedback === "err" || reveal) && syll === problem.syll;
          const showWrong = (feedback === "err" || reveal) && isPicked && syll !== problem.syll;
          let borderColor = isPicked ? "#fce9a8" : color;
          let bg, boxShadow, transform = "none";
          if (showCorrect) { borderColor = "#2ecc8f"; bg = "linear-gradient(180deg, rgba(46,204,143,0.95), rgba(34,160,108,0.95))"; boxShadow = "0 0 18px rgba(46,204,143,0.6)"; }
          else if (showWrong) { borderColor = "#ff6b6b"; bg = "linear-gradient(180deg, rgba(255,107,107,0.95), rgba(220,80,80,0.95))"; boxShadow = "0 0 18px rgba(255,107,107,0.5)"; }
          else if (isPicked) { bg = "linear-gradient(180deg, rgba(252,233,168,0.25), rgba(217,164,65,0.18))"; boxShadow = "0 0 18px rgba(252,233,168,0.55), inset 0 1px 0 rgba(255,255,255,0.2)"; transform = "translateY(-2px)"; }
          return (
            <button key={trayIdx} className="ed-numpad-key"
              onClick={() => { if (!feedback && !reveal) setPicked(syll); }}
              style={{
                position: "relative", width: 92, height: 72, fontSize: 28,
                borderColor, borderWidth: (isPicked || showCorrect || showWrong) ? 3 : 2, borderStyle: "solid",
                cursor: (feedback || reveal) ? "default" : "pointer", fontWeight: 800, letterSpacing: "0.04em",
                color: (showCorrect || showWrong) ? "#fff" : undefined,
                background: bg, boxShadow, transform, transition: "all 0.15s ease",
              }}>
              {syll}
              {showCorrect && (
                <span style={{
                  position: "absolute", top: -8, right: -8, width: 22, height: 22, borderRadius: "50%",
                  background: "#2ecc8f", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 900, boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                }}>✓</span>
              )}
            </button>
          );
        })}
      </div>

      <ActionRail
        canVerify={!feedback && !reveal} onVerify={verify}
        showErase onErase={() => { if (!feedback && !reveal) setPicked(null); }}
        onRestart={() => setConfirmingRestart(true)} onExit={() => setConfirmingExit(true)}
      />
      <FeedbackOverlay feedback={feedback} feedbackMsg={feedbackMsg} charName={char.name} />
      <ConfirmModal open={confirmingRestart} onClose={() => setConfirmingRestart(false)}
        label="Reiniciar juego" labelColor="#ff8b8b" title="¿Empezar de nuevo?"
        body={`Vas a perder el progreso de esta ronda (${attempted}/3 palabras) y volverás a la primera.`}
        confirmText="SÍ, REINICIAR" onConfirm={() => { setConfirmingRestart(false); onRestart && onRestart(); }} />
      <ConfirmModal open={confirmingExit} onClose={() => setConfirmingExit(false)}
        label="Salir del juego" labelColor="#ff8b4c" title="¿Volver al inicio?" glow="rgba(255,138,76,0.3)"
        body={`Vas a perder el progreso de esta ronda (${attempted}/3 palabras). No habrá reporte de esta sesión.`}
        confirmText="SÍ, SALIR" onConfirm={() => { setConfirmingExit(false); go("home"); }} />
    </div>
  );
}

// Enunciado absoluto (top 84) usado por BibliotecaGame (zona central fija).
function EnunciadoWrap({ text }) {
  return (
    <div style={{
      position: "absolute", top: 84, left: "50%", transform: "translateX(-50%)", width: 488,
      textAlign: "center", fontFamily: "var(--ed-font-display)", fontWeight: 700,
      fontSize: 17, lineHeight: 1.2, color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,0.6)",
      pointerEvents: "none", zIndex: 5,
    }}>{text}</div>
  );
}

// ═════════════════════════════════════════════════════════════
// NIVEL 2 — POEMAS POPULARES: 3 rondas distintas
// ═════════════════════════════════════════════════════════════

// R1 — Clasificar el tipo de poema (ruleta). Fragmentos cortos con marca
// clara: yaraví (triste, ¡ayayay!), amorfino (amor/humor del campo),
// copla (cortita, descriptiva). Vocabulario ecuatoriano.
const TIPOS = ["amorfino", "copla", "yaraví"];
const R1_POEMS = [
  { id: "p1", tipo: "amorfino", text: "Eres como la guayaba\nque madura en el portal:\ndulce para quien te quiere\ny al que no, le sabes mal." },
  { id: "p2", tipo: "amorfino", text: "Me dicen que soy feíto\ncomo el sapo del corral,\npero el sapo cuando canta\nenamora en el platanal." },
  { id: "p3", tipo: "copla", text: "Verde es el campo en enero,\nverde la mata de arroz,\nverde el loro de la rama\nque repite con su voz." },
  { id: "p4", tipo: "copla", text: "La luna sale despacio\ndetrás del cerro lejano,\nalumbra el río que canta\ny duerme todo el verano." },
  { id: "p5", tipo: "yaraví", text: "Lloran los cerros de noche,\nllora la sombra al pasar;\n¡ayayay!, me dejó sola,\nme dejó solo el penar." },
  { id: "p6", tipo: "yaraví", text: "Se nubló todo mi cielo\ncuando te vi partir;\n¡ayayay!, paloma mía,\nme dejaste aquí a sufrir." },
];

// R2 — Completar la rima. La palabra correcta rima con el final del 2º verso.
const R2_RIMA = [
  { id: "r2a", top: ["En la rama del guayabo", "canta un pájaro sombrío,", "le contesta desde el agua"], lastPrefix: "el sapo del", answer: "río", options: ["río", "estanque", "charco"] },
  { id: "r2b", top: ["Bajó la lluvia temprano,", "mojó todo mi maizal,", "y la tierra agradecida"], lastPrefix: "floreció en el", answer: "platanal", options: ["platanal", "huerto", "jardín"] },
  { id: "r2c", top: ["El viento mueve las cañas,", "susurra junto al camino,", "y entre las hojas se escucha"], lastPrefix: "girar el viejo", answer: "molino", options: ["molino", "trapiche", "reloj"] },
  { id: "r2d", top: ["Una vaquita pintada", "se fue a pasear al corral,", "comió hierba bien fresca"], lastPrefix: "y volvió para el", answer: "portal", options: ["portal", "establo", "campo"] },
  { id: "r2e", top: ["Naranja de mi conuco,", "fruta de mi corazón,", "cómeme de a poquitos"], lastPrefix: "que te doy mi", answer: "ilusión", options: ["ilusión", "cariño", "amor"] },
  { id: "r2f", top: ["En mi tierra manabita", "se canta con emoción,", "el amorfino del pueblo"], lastPrefix: "nace del", answer: "corazón", options: ["corazón", "alma", "pecho"] },
];

// R3 — Detective: 3 versos riman y uno no (el intruso). intruder = índice.
const R3_DET = [
  { id: "d1", lines: ["En el campo enamorado,", "el caballo va trotando,", "canta el gallo colorado,", "y el río baja apurado."], intruder: 1 },
  { id: "d2", lines: ["Salió la luna brillante,", "el lucero va delante,", "la noche se puso oscura,", "y el sapo sale cantante."], intruder: 2 },
  { id: "d3", lines: ["Una niña en el sembrío", "recoge el maíz con brío,", "el agua corre en el río,", "cruzando todo el camino."], intruder: 3 },
  { id: "d4", lines: ["Con un ritmo muy veloz,", "lo canta el pueblo costero,", "el amorfino sincero,", "con tono dulce y ligero."], intruder: 0 },
  { id: "d5", lines: ["La copla alegre y bonita", "se baila en la fiestecita,", "la gente aplaude contenta,", "y suena la guitarrita."], intruder: 2 },
  { id: "d6", lines: ["Subió la luna al cielo,", "brillando con anhelo,", "el campo se durmió,", "cubierto por un velo."], intruder: 2 },
];

const RECENT_KEY_P = "edinun_juego14poemas_recientes_v1";
// Historial FIFO compartido por niveles 2-4 (prefijo por ronda/categoría).
// Amplio para que cada prefijo conserve su ventana sin que otros lo desalojen.
const RECENT_LIMIT_P = 60;
function getRecentP() {
  try { const r = localStorage.getItem(RECENT_KEY_P); const a = r ? JSON.parse(r) : []; return Array.isArray(a) ? a : []; }
  catch { return []; }
}
function pushRecentP(key) {
  const a = getRecentP().filter((k) => k !== key);
  a.unshift(key);
  try { localStorage.setItem(RECENT_KEY_P, JSON.stringify(a.slice(0, RECENT_LIMIT_P))); } catch {}
}
function pickFreshP(bank, prefix) {
  const pre = prefix + ":";
  const recentIds = getRecentP().filter((k) => k.startsWith(pre)).map((k) => k.slice(pre.length));
  const windowN = Math.floor(bank.length / 2);
  const blocked = new Set(recentIds.slice(0, windowN));
  let pool = bank.filter((b) => !blocked.has(b.id));
  if (pool.length === 0) pool = bank;
  const p = pool[Math.floor(Math.random() * pool.length)];
  pushRecentP(pre + p.id);
  return p;
}

// Ruleta animada — gira y se detiene; teatral (el poema ya está fijado).
function Ruleta({ rotation, spinning }) {
  const sectors = ["✒", "❤", "♪", "📜", "★", "🎵"];
  const n = sectors.length, seg = 360 / n;
  const cols = ["#6a4fc0", "#3a2a78"];
  const stops = sectors.map((_, i) => `${cols[i % 2]} ${i * seg}deg ${(i + 1) * seg}deg`).join(", ");
  return (
    <div style={{ position: "relative", width: 146, height: 146 }}>
      <div style={{
        position: "absolute", top: -3, left: "50%", transform: "translateX(-50%)", zIndex: 3,
        width: 0, height: 0, borderLeft: "11px solid transparent", borderRight: "11px solid transparent",
        borderTop: "18px solid #ffd76e", filter: "drop-shadow(0 2px 3px rgba(0,0,0,.5))",
      }} />
      <div style={{
        width: 146, height: 146, borderRadius: "50%",
        background: `conic-gradient(${stops})`, border: "5px solid #f2c260",
        boxShadow: "0 10px 28px rgba(0,0,0,.5), inset 0 0 0 3px rgba(255,255,255,.08)",
        transform: `rotate(${rotation}deg)`,
        transition: spinning ? "transform 1.7s cubic-bezier(.15,.7,.2,1)" : "none",
        position: "relative",
      }}>
        {sectors.map((s, i) => (
          <span key={i} style={{
            position: "absolute", left: "50%", top: "50%",
            transform: `rotate(${i * seg + seg / 2}deg) translateY(-50px) rotate(${-(i * seg + seg / 2)}deg)`,
            transformOrigin: "0 0", marginLeft: -10, marginTop: -12, fontSize: 20,
          }}>{s}</span>
        ))}
      </div>
      <div style={{
        position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)",
        width: 32, height: 32, borderRadius: "50%",
        background: "radial-gradient(circle at 35% 30%, #fff6d8, #d9a441)",
        border: "3px solid #fff", boxShadow: "0 2px 6px rgba(0,0,0,.4)", zIndex: 2,
      }} />
    </div>
  );
}

function PoemCartel({ text, maxWidth = 430, fontSize = 15 }) {
  return (
    <div style={{
      width: "fit-content", maxWidth, padding: "12px 20px", borderRadius: 16,
      background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(244,238,228,0.92))",
      border: "3px solid #f2c260", boxShadow: "0 12px 28px rgba(0,0,0,0.4), inset 0 -4px 0 rgba(0,0,0,0.06)",
      fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize, lineHeight: 1.35,
      color: "#3a2608", textAlign: "center", whiteSpace: "pre-line",
    }}>{text}</div>
  );
}

// Botón de opción con feedback §11 (verde correcto / rojo error al fallar).
function OptionButton({ label, picked, locked, isCorrect, isPicked, onClick, color }) {
  const showCorrect = locked && isCorrect;
  const showWrong = locked && isPicked && !isCorrect;
  let borderColor = isPicked ? "#fce9a8" : (color || "#4fa0ff");
  let bg, boxShadow, transform = "none", ink;
  if (showCorrect) { borderColor = "#2ecc8f"; bg = "linear-gradient(180deg, rgba(46,204,143,0.95), rgba(34,160,108,0.95))"; boxShadow = "0 0 18px rgba(46,204,143,0.6)"; ink = "#fff"; }
  else if (showWrong) { borderColor = "#ff6b6b"; bg = "linear-gradient(180deg, rgba(255,107,107,0.95), rgba(220,80,80,0.95))"; boxShadow = "0 0 18px rgba(255,107,107,0.5)"; ink = "#fff"; }
  else if (isPicked) { bg = "linear-gradient(180deg,#fce9a8,#e9c45a)"; boxShadow = "0 0 16px rgba(252,233,168,0.6)"; transform = "translateY(-2px)"; ink = "#3a2608"; }
  else { bg = "rgba(255,255,255,0.92)"; ink = "#3a2608"; }
  return (
    <button className="ed-numpad-key" onClick={() => { if (!locked) onClick(); }}
      style={{
        position: "relative", minWidth: 96, height: 56, padding: "0 16px",
        borderColor, borderWidth: (isPicked || showCorrect || showWrong) ? 3 : 2, borderStyle: "solid",
        borderRadius: 12, cursor: locked ? "default" : "pointer",
        fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 19, letterSpacing: "0.02em",
        color: ink, background: bg, boxShadow, transform, transition: "all 0.15s ease",
      }}>
      {label}
      {showCorrect && (
        <span style={{
          position: "absolute", top: -8, right: -8, width: 22, height: 22, borderRadius: "50%",
          background: "#2ecc8f", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 900, border: "2px solid #fff", boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
        }}>✓</span>
      )}
    </button>
  );
}

function PoemasGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "Poemas populares · 10 años";

  const [ronda, setRonda] = useStateG(0);
  const [r1Pick] = useStateG(() => pickFreshP(R1_POEMS, "r1"));
  const [r2Pick] = useStateG(() => pickFreshP(R2_RIMA, "r2"));
  const [r3Pick] = useStateG(() => pickFreshP(R3_DET, "r3"));

  // R1 ruleta
  const [r1Spun, setR1Spun] = useStateG(false);
  const [r1Spinning, setR1Spinning] = useStateG(false);
  const [r1Rot, setR1Rot] = useStateG(0);
  const [r1Choice, setR1Choice] = useStateG(null);
  const [r1Locked, setR1Locked] = useStateG(false);
  // R2 rima
  const [r2Choice, setR2Choice] = useStateG(null);
  const [r2Locked, setR2Locked] = useStateG(false);
  // R3 detective
  const [r3Choice, setR3Choice] = useStateG(null);
  const [r3Locked, setR3Locked] = useStateG(false);

  const [elapsed, setElapsed] = useStateG(0);
  const [stars, setStars] = useStateG(0);
  const [solved, setSolved] = useStateG(0);
  const [attempted, setAttempted] = useStateG(0);
  const [starsSession, setStarsSession] = useStateG(0);
  const [feedback, setFeedback] = useStateG(null);
  const [feedbackMsg, setFeedbackMsg] = useStateG("");
  const [confirmingExit, setConfirmingExit] = useStateG(false);
  const [confirmingRestart, setConfirmingRestart] = useStateG(false);
  const [log, setLog] = useStateG([]);
  const started = useRefG(Date.now());
  const exerciseStart = useRefG(Date.now());
  // Vivo mientras el componente esté montado; los timeouts pendientes lo
  // consultan y abortan al desmontar (SALIR/REINICIAR/cambio de nivel) para no
  // disparar navegación/estado sobre una sesión que ya no existe.
  const aliveRef = useRefG(true);

  useEffectG(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started.current) / 1000)), 500);
    return () => { clearInterval(id); aliveRef.current = false; };
  }, []);

  // Comportamiento B (AUTO): las 3 rondas son de "1 toque = respuesta", así que
  // se auto-evalúan tras una breve ventana (~700 ms) para recapacitar. Cada
  // ronda lleva su timer para poder cancelarlo si el niño cambia de idea.
  const r1AutoRef = useRefG(null);
  const r2AutoRef = useRefG(null);
  const r3AutoRef = useRefG(null);
  useEffectG(() => () => {
    clearTimeout(r1AutoRef.current);
    clearTimeout(r2AutoRef.current);
    clearTimeout(r3AutoRef.current);
  }, []);

  const answer = makeAnswer({
    attempted, solved, stars, starsSession, log, elapsed, catLabel,
    exerciseStart, setApp, go, aliveRef,
    setFeedback, setFeedbackMsg, setAttempted, setSolved, setStars, setStarsSession, setLog,
    onNextRound: () => setRonda((r) => r + 1),
  });

  function spinRuleta() {
    if (r1Spinning || r1Spun) return;
    setR1Spinning(true);
    setR1Rot((r) => r + 4 * 360 + Math.floor(Math.random() * 360));
    setTimeout(() => { setR1Spinning(false); setR1Spun(true); exerciseStart.current = Date.now(); }, 1750);
  }

  // Califica la R1 (tipo de poema) con la opción tocada.
  function gradeR1(choice) {
    if (r1Locked) return;
    setR1Locked(true);
    const correct = choice === r1Pick.tipo;
    setTimeout(() => answer(correct, choice, r1Pick.tipo, "🎡", "Tipo de poema"), correct ? 450 : 1500);
  }
  // Califica la R2 (completa la rima) con la opción tocada.
  function gradeR2(choice) {
    if (r2Locked) return;
    setR2Locked(true);
    const correct = choice === r2Pick.answer;
    setTimeout(() => answer(correct, choice, r2Pick.answer, "✒️", "Completa la rima"), correct ? 450 : 1500);
  }
  // Califica la R3 (verso intruso) con el índice tocado.
  function gradeR3(choice) {
    if (r3Locked) return;
    setR3Locked(true);
    const correct = choice === r3Pick.intruder;
    setTimeout(() => answer(correct, r3Pick.lines[choice], r3Pick.lines[r3Pick.intruder], "🔍", "Verso intruso"), correct ? 450 : 1500);
  }

  // Las 3 rondas son AUTO → su VERIFICAR se oculta y canVerify queda en false.
  const canVerify = false;

  function handleErase() {
    if (ronda === 0 && !r1Locked) setR1Choice(null);
    else if (ronda === 1 && !r2Locked) setR2Choice(null);
  }

  // §3: enunciado = QUÉ hacer (la tarea); bocadillo = CÓMO (la acción concreta).
  const enunciado =
    ronda === 0 ? "Descubre qué tipo de poema es." :
    ronda === 1 ? "Completa el verso con la palabra que rima." :
    "Encuentra el verso que no rima.";
  const bocadillo =
    ronda === 0 ? "Gira la ruleta\ny elige su tipo." :
    ronda === 1 ? "Toca la palabra que\nsuena igual al final." :
    "Mira la última palabra\ny toca el verso raro.";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <GameHUD elapsed={elapsed} stars={stars} attempted={attempted} solved={solved} total={3} app={app} setApp={setApp} />
      <CharacterCorner char={char} message={bocadillo} />

      {ronda === 0 && (
        <div data-qa="zona-central" style={{
          position: "absolute", top: 74, bottom: 14, left: "50%", transform: "translateX(-50%)",
          width: 540, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
        }}>
          <EnunciadoInline text={enunciado} />
          <Ruleta rotation={r1Rot} spinning={r1Spinning} />
          {!r1Spun ? (
            <button className="ed-btn ed-btn-primary" onClick={spinRuleta} disabled={r1Spinning}
              style={{ height: 52, padding: "0 32px", fontSize: 17, fontWeight: 800, letterSpacing: "0.04em", opacity: r1Spinning ? 0.6 : 1 }}>
              {r1Spinning ? "GIRANDO…" : "GIRAR 🎡"}
            </button>
          ) : (
            <>
              <PoemCartel text={r1Pick.text} />
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
                {TIPOS.map((t) => (
                  <OptionButton key={t} label={t} locked={r1Locked}
                    isCorrect={t === r1Pick.tipo} isPicked={r1Choice === t}
                    onClick={() => {
                      if (r1Locked) return;
                      setR1Choice(t);
                      clearTimeout(r1AutoRef.current);
                      r1AutoRef.current = setTimeout(() => gradeR1(t), 700);
                    }}
                    color="#a78bfa" />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {ronda === 1 && (
        <div data-qa="zona-central" style={{
          position: "absolute", top: 74, bottom: 14, left: "50%", transform: "translateX(-50%)",
          width: 540, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
        }}>
          <EnunciadoInline text={enunciado} />
          <div style={{
            width: "fit-content", maxWidth: 440, padding: "14px 22px", borderRadius: 16,
            background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(244,238,228,0.92))",
            border: "3px solid #f2c260", boxShadow: "0 12px 28px rgba(0,0,0,0.4), inset 0 -4px 0 rgba(0,0,0,0.06)",
            fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 16, lineHeight: 1.4,
            color: "#3a2608", textAlign: "center",
          }}>
            {r2Pick.top.map((l, i) => (<div key={i}>{l}</div>))}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 2 }}>
              <span>{r2Pick.lastPrefix}</span>
              <span style={{
                minWidth: 96, padding: "2px 12px", borderRadius: 10,
                borderBottom: r2Choice ? "none" : "3px solid #d9a441",
                background: r2Choice ? "linear-gradient(180deg,#fce9a8,#e9c45a)" : "transparent",
                color: "#3a2608", fontWeight: 800,
                boxShadow: r2Choice ? "0 3px 8px rgba(0,0,0,0.2)" : "none",
              }}>{r2Choice || "______"}</span>
              <span>.</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            {r2Pick.options.map((opt, i) => (
              <OptionButton key={opt} label={opt} locked={r2Locked}
                isCorrect={opt === r2Pick.answer} isPicked={r2Choice === opt}
                onClick={() => {
                  if (r2Locked) return;
                  setR2Choice(opt);
                  clearTimeout(r2AutoRef.current);
                  r2AutoRef.current = setTimeout(() => gradeR2(opt), 700);
                }}
                color={["#ef5a5a", "#4fa0ff", "#2ecc8f"][i % 3]} />
            ))}
          </div>
        </div>
      )}

      {ronda === 2 && (
        <div data-qa="zona-central" style={{
          position: "absolute", top: 74, bottom: 14, left: "50%", transform: "translateX(-50%)",
          width: 540, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
        }}>
          <EnunciadoInline text={enunciado} />
          <div style={{ position: "relative", width: "fit-content", maxWidth: 460 }}>
            <div style={{ position: "absolute", top: -14, right: -10, fontSize: 34, transform: "rotate(8deg)", filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.4))" }}>🔍</div>
            <div style={{
              display: "flex", flexDirection: "column", gap: 8, padding: "16px 18px", borderRadius: 16,
              background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(244,238,228,0.92))",
              border: "3px solid #f2c260", boxShadow: "0 12px 28px rgba(0,0,0,0.4), inset 0 -4px 0 rgba(0,0,0,0.06)",
            }}>
              {r3Pick.lines.map((line, i) => {
                const sel = r3Choice === i;
                const isIntruder = i === r3Pick.intruder;
                const showCorrect = r3Locked && isIntruder;
                const showWrong = r3Locked && sel && !isIntruder;
                let bg = "rgba(0,0,0,0.04)", ink = "#3a2608", border = "2px solid transparent";
                if (showCorrect) { bg = "linear-gradient(180deg, rgba(46,204,143,0.95), rgba(34,160,108,0.95))"; ink = "#fff"; border = "2px solid #2ecc8f"; }
                else if (showWrong) { bg = "linear-gradient(180deg, rgba(255,107,107,0.95), rgba(220,80,80,0.95))"; ink = "#fff"; border = "2px solid #ff6b6b"; }
                else if (sel) { bg = "linear-gradient(180deg,#fce9a8,#e9c45a)"; border = "2px solid #4fd8ff"; }
                return (
                  <button key={i} onClick={() => {
                      if (r3Locked) return;
                      setR3Choice(i);
                      clearTimeout(r3AutoRef.current);
                      r3AutoRef.current = setTimeout(() => gradeR3(i), 700);
                    }}
                    style={{
                      position: "relative", textAlign: "left", padding: "8px 14px", borderRadius: 10,
                      background: bg, color: ink, border, cursor: r3Locked ? "default" : "pointer",
                      fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 16, lineHeight: 1.2,
                      transition: "all 0.15s ease",
                    }}>
                    {(() => {
                      const m = String(line).match(/^([\s\S]*?)([A-Za-zÁÉÍÓÚÑáéíóúñ]+)([.,;!?]*)$/);
                      if (!m) return line;
                      return (<>{m[1]}<span style={{ fontWeight: 900, textDecoration: "underline", textDecorationThickness: 2, textUnderlineOffset: 3 }}>{m[2]}</span>{m[3]}</>);
                    })()}
                    {showCorrect && (
                      <span style={{
                        position: "absolute", top: -8, right: -8, width: 22, height: 22, borderRadius: "50%",
                        background: "#2ecc8f", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, fontWeight: 900, border: "2px solid #fff", boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                      }}>✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <ActionRail
        canVerify={canVerify} hideVerify={true}
        showErase={false} onErase={handleErase}
        onRestart={() => setConfirmingRestart(true)} onExit={() => setConfirmingExit(true)}
      />
      <FeedbackOverlay feedback={feedback} feedbackMsg={feedbackMsg} charName={char.name} />
      <ConfirmModal open={confirmingRestart} onClose={() => setConfirmingRestart(false)}
        label="Reiniciar juego" labelColor="#ff8b8b" title="¿Empezar de nuevo?"
        body={`Vas a perder el progreso de esta ronda (${attempted}/3) y volverás a la primera.`}
        confirmText="SÍ, REINICIAR" onConfirm={() => { setConfirmingRestart(false); onRestart && onRestart(); }} />
      <ConfirmModal open={confirmingExit} onClose={() => setConfirmingExit(false)}
        label="Salir del juego" labelColor="#ff8b4c" title="¿Volver al inicio?" glow="rgba(255,138,76,0.3)"
        body={`Vas a perder el progreso de esta ronda (${attempted}/3). No habrá reporte de esta sesión.`}
        confirmText="SÍ, SALIR" onConfirm={() => { setConfirmingExit(false); go("home"); }} />
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// NIVEL 3 — EL POEMA Y SUS VOCES (12 años): 3 rondas distintas
//   R1 identifica la figura · R2 clasifica la rima · R3 laboratorio del verso
// ═════════════════════════════════════════════════════════════
const FIGURAS = ["metáfora", "hipérbole", "personificación", "onomatopeya", "hipérbaton", "paradoja"];
const R1_FIG = [
  { id: "f1", verse: "Sus ojos eran dos zafiros brillantes.", figura: "metáfora" },
  { id: "f2", verse: "Tus dientes son perlas blancas.", figura: "metáfora" },
  { id: "f3", verse: "Lloré ríos de lágrimas por ti.", figura: "hipérbole" },
  { id: "f4", verse: "Te quiero hasta el infinito y más allá.", figura: "hipérbole" },
  { id: "f5", verse: "El viento susurra entre los árboles.", figura: "personificación" },
  { id: "f6", verse: "La luna sonríe en el cielo oscuro.", figura: "personificación" },
  { id: "f7", verse: "El reloj hacía tic-tac, tic-tac.", figura: "onomatopeya" },
  { id: "f8", verse: "¡Plaf! cayó el plato en el suelo.", figura: "onomatopeya" },
  { id: "f9", verse: "El silencio era ensordecedor.", figura: "paradoja" },
  { id: "f10", verse: "Es tan pobre que solo tiene dinero.", figura: "paradoja" },
  { id: "f11", verse: "Del salón en el ángulo oscuro, la guitarra dormía.", figura: "hipérbaton" },
  { id: "f12", verse: "Era del año la estación florida.", figura: "hipérbaton" },
];
const TIPOS_RIMA = ["consonante", "asonante", "libre"];
const RIMA_LABEL = { consonante: "CONSONANTE", asonante: "ASONANTE", libre: "VERSO LIBRE" };
const RIMA_COLOR = { consonante: "#4fa0ff", asonante: "#2ecc8f", libre: "#a78bfa" };
const R2_PAIRS = {
  consonante: [
    { id: "c1", pair: "amor · dolor" }, { id: "c2", pair: "canción · corazón" },
    { id: "c3", pair: "luna · cuna" }, { id: "c4", pair: "flores · amores" },
    { id: "c5", pair: "viento · contento" },
  ],
  asonante: [
    { id: "a1", pair: "alma · casa" }, { id: "a2", pair: "sombra · rosa" },
    { id: "a3", pair: "noche · torre" }, { id: "a4", pair: "cielo · viejo" },
    { id: "a5", pair: "tierra · selva" },
  ],
  libre: [
    { id: "l1", pair: "árbol · montaña" }, { id: "l2", pair: "luna · camino" },
    { id: "l3", pair: "verso · palabra" }, { id: "l4", pair: "mar · sueño" },
    { id: "l5", pair: "flor · jardín" },
  ],
};
// R3 — Ordena las partes del discurso (estructura, en orden 1→5).
// Varios discursos temáticos rotan con FIFO. Las 5 partes son fijas por
// definición, pero el ejemplo de cada parte cambia para que la ronda no
// se repita al recargar.
const R3_DISCURSOS = [
  { id: "lectura", partes: [
    { id: "lec1", n: 1, parte: "El exordio",      cue: "“Amigos, hoy les hablo de un tesoro.”" },
    { id: "lec2", n: 2, parte: "La proposición",  cue: "“Leer cada día nos hace libres.”" },
    { id: "lec4", n: 3, parte: "La confirmación", cue: "“Quien lee en mi aula escribe mejor.”" },
    { id: "lec3", n: 4, parte: "La refutación",   cue: "“Dirán que aburre; aún no hallan su libro.”" },
    { id: "lec5", n: 5, parte: "El epílogo",      cue: "“Abramos un libro y un mundo.”" },
  ] },
  { id: "deporte", partes: [
    { id: "dep1", n: 1, parte: "El exordio",      cue: "“Compañeros, hablemos de movernos.”" },
    { id: "dep2", n: 2, parte: "La proposición",  cue: "“Hacer deporte nos da salud.”" },
    { id: "dep4", n: 3, parte: "La confirmación", cue: "“Bastan quince minutos al día.”" },
    { id: "dep3", n: 4, parte: "La refutación",   cue: "“Hay quien dice no tener tiempo.”" },
    { id: "dep5", n: 5, parte: "El epílogo",      cue: "“¡Salgamos hoy a jugar!”" },
  ] },
  { id: "ambiente", partes: [
    { id: "amb1", n: 1, parte: "El exordio",      cue: "“Vecinos, nuestro río nos llama.”" },
    { id: "amb2", n: 2, parte: "La proposición",  cue: "“Cuidar el agua es tarea de todos.”" },
    { id: "amb4", n: 3, parte: "La confirmación", cue: "“Mi barrio ya recicla y se nota.”" },
    { id: "amb3", n: 4, parte: "La refutación",   cue: "“Algunos creen que no sirve de nada.”" },
    { id: "amb5", n: 5, parte: "El epílogo",      cue: "“Empecemos por una sola acción.”" },
  ] },
  { id: "amistad", partes: [
    { id: "ami1", n: 1, parte: "El exordio",      cue: "“Quiero contarles algo del cariño.”" },
    { id: "ami2", n: 2, parte: "La proposición",  cue: "“Un buen amigo se cultiva.”" },
    { id: "ami4", n: 3, parte: "La confirmación", cue: "“Mi mejor amiga me escucha de verdad.”" },
    { id: "ami3", n: 4, parte: "La refutación",   cue: "“No todo es estar siempre de acuerdo.”" },
    { id: "ami5", n: 5, parte: "El epílogo",      cue: "“Cuidemos a quien nos acompaña.”" },
  ] },
];
function pickOne(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function VocesGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "El poema y sus voces · 12 años";

  const [ronda, setRonda] = useStateG(0);
  const [r1Pick] = useStateG(() => pickFreshP(R1_FIG, "vf"));
  const [r2Pick] = useStateG(() => ({
    fichas: shuffle([
      { ...pickFreshP(R2_PAIRS.consonante, "rc"), tipo: "consonante" },
      { ...pickFreshP(R2_PAIRS.asonante, "ra"), tipo: "asonante" },
      { ...pickFreshP(R2_PAIRS.libre, "rl"), tipo: "libre" },
    ]),
    bins: TIPOS_RIMA,
  }));
  const [r3Disc] = useStateG(() => pickFreshP(R3_DISCURSOS, "disc"));
  const r3Parts = r3Disc.partes;
  const r3ById = useMemoG(() => {
    const m = {}; r3Parts.forEach((c) => { m[c.id] = c; }); return m;
  }, [r3Disc]);
  const [r3Shuffle] = useStateG(() => shuffle(r3Parts.map((c) => c.id)));

  const r1Opts = useMemoG(() => {
    const others = shuffle(FIGURAS.filter((f) => f !== r1Pick.figura)).slice(0, 2);
    return shuffle([r1Pick.figura, ...others]);
  }, [r1Pick]);

  // R1
  const [r1Choice, setR1Choice] = useStateG(null);
  const [r1Locked, setR1Locked] = useStateG(false);
  // R2 — placed = { fichaId: bin }, selected = fichaId|null
  const [r2Placed, setR2Placed] = useStateG({});
  const [r2Selected, setR2Selected] = useStateG(null);
  const [r2Locked, setR2Locked] = useStateG(false);
  // R3 — ordenar las 5 partes del discurso en sus casillas 1-5
  const [r3Slots, setR3Slots] = useStateG(() => [null, null, null, null, null]);
  const [r3Locked, setR3Locked] = useStateG(false);

  const [elapsed, setElapsed] = useStateG(0);
  const [stars, setStars] = useStateG(0);
  const [solved, setSolved] = useStateG(0);
  const [attempted, setAttempted] = useStateG(0);
  const [starsSession, setStarsSession] = useStateG(0);
  const [feedback, setFeedback] = useStateG(null);
  const [feedbackMsg, setFeedbackMsg] = useStateG("");
  const [confirmingExit, setConfirmingExit] = useStateG(false);
  const [confirmingRestart, setConfirmingRestart] = useStateG(false);
  const [log, setLog] = useStateG([]);
  const started = useRefG(Date.now());
  const exerciseStart = useRefG(Date.now());
  // Vivo mientras el componente esté montado; los timeouts pendientes lo
  // consultan y abortan al desmontar (SALIR/REINICIAR/cambio de nivel) para no
  // disparar navegación/estado sobre una sesión que ya no existe.
  const aliveRef = useRefG(true);

  useEffectG(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started.current) / 1000)), 500);
    return () => { clearInterval(id); aliveRef.current = false; };
  }, []);

  const answer = makeAnswer({
    attempted, solved, stars, starsSession, log, elapsed, catLabel,
    exerciseStart, setApp, go, aliveRef,
    setFeedback, setFeedbackMsg, setAttempted, setSolved, setStars, setStarsSession, setLog,
    onNextRound: () => setRonda((r) => r + 1),
  });

  const r2AllPlaced = r2Pick.fichas.every((f) => r2Placed[f.id]);
  const canVerify =
    feedback ? false :
    ronda === 0 ? (r1Choice !== null && !r1Locked) :
    ronda === 1 ? (r2AllPlaced && !r2Locked) :
    ronda === 2 ? (r3Slots.every(Boolean) && !r3Locked) : false;

  function handleVerify() {
    if (!canVerify) return;
    if (ronda === 0) {
      setR1Locked(true);
      const correct = r1Choice === r1Pick.figura;
      setTimeout(() => answer(correct, r1Choice, r1Pick.figura, "🔎", "Figura literaria"), correct ? 450 : 1500);
    } else if (ronda === 1) {
      setR2Locked(true);
      const correct = r2Pick.fichas.every((f) => r2Placed[f.id] === f.tipo);
      const userText = r2Pick.fichas.map((f) => `${f.pair.split(" · ")[0]}→${RIMA_LABEL[r2Placed[f.id]] || "?"}`).join(" · ");
      const correctText = r2Pick.fichas.map((f) => `${f.pair.split(" · ")[0]}→${RIMA_LABEL[f.tipo]}`).join(" · ");
      setTimeout(() => answer(correct, userText, correctText, "🧲", "Clases de rima"), correct ? 450 : 1500);
    } else if (ronda === 2) {
      setR3Locked(true);
      const correct = r3Slots.every((id, i) => r3ById[id] && r3ById[id].n === i + 1);
      const userText = r3Slots.map((id, i) => `${i + 1}. ${r3ById[id] ? r3ById[id].parte : "?"}`).join(" · ");
      const correctText = r3Parts.map((c) => `${c.n}. ${c.parte}`).join(" · ");
      setTimeout(() => answer(correct, userText, correctText, "🗣️", "Estructura del discurso"), correct ? 450 : 1500);
    }
  }

  function handleErase() {
    if (ronda === 0 && !r1Locked) setR1Choice(null);
    else if (ronda === 1 && !r2Locked) { setR2Placed({}); setR2Selected(null); }
    else if (ronda === 2 && !r3Locked) setR3Slots([null, null, null, null, null]);
  }

  // R2 drag+tap: soltar en un cajón coloca; soltar en "__tray" devuelve.
  function r2PlaceZone(zoneId, fichaId) {
    if (r2Locked) return;
    setR2Selected(null);
    if (zoneId === "__tray") {
      setR2Placed((p) => { const n = { ...p }; delete n[fichaId]; return n; });
    } else if (TIPOS_RIMA.includes(zoneId)) {
      setR2Placed((p) => ({ ...p, [fichaId]: zoneId }));
    }
  }
  function r2TapFicha(fichaId) {
    if (r2Locked) return;
    if (r2Placed[fichaId]) {
      setR2Placed((p) => { const n = { ...p }; delete n[fichaId]; return n; });
      setR2Selected(null);
    } else {
      setR2Selected((s) => (s === fichaId ? null : fichaId));
    }
  }

  // R3 drag+tap: soltar en "slot-i" coloca/intercambia; "__tray3" devuelve.
  function r3PlaceZone(zoneId, cardId) {
    if (r3Locked) return;
    setR3Slots((prev) => {
      const slots = prev.slice();
      const cur = slots.indexOf(cardId);
      if (cur !== -1) slots[cur] = null;
      if (zoneId === "__tray3") return slots;
      const m = /^slot-(\d)$/.exec(zoneId);
      if (!m) return slots;
      const idx = parseInt(m[1], 10);
      slots[idx] = cardId; // si había otra, queda desplazada a la bandeja
      return slots;
    });
  }
  function r3TapCard(cardId) {
    if (r3Locked) return;
    setR3Slots((prev) => {
      const slots = prev.slice();
      const cur = slots.indexOf(cardId);
      if (cur !== -1) { slots[cur] = null; return slots; } // colocada → quitar
      const empty = slots.indexOf(null);
      if (empty !== -1) slots[empty] = cardId; // bandeja → primera casilla libre
      return slots;
    });
  }

  const enunciado =
    ronda === 0 ? "Descubre qué figura usa el verso." :
    ronda === 1 ? "Lleva cada rima a su tipo." :
    "Ordena las partes del discurso.";
  const bocadillo =
    ronda === 0 ? "Toca la figura\nque le corresponde." :
    ronda === 1 ? "Arrastra cada rima\na su cajón." :
    "Arrastra cada parte\na su número.";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <GameHUD elapsed={elapsed} stars={stars} attempted={attempted} solved={solved} total={3} app={app} setApp={setApp} />
      <CharacterCorner char={char} message={bocadillo} />

      {/* R1 — identifica la figura */}
      {ronda === 0 && (
        <div data-qa="zona-central" style={{
          position: "absolute", top: 74, bottom: 14, left: "50%", transform: "translateX(-50%)",
          width: 540, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
        }}>
          <EnunciadoInline text={enunciado} />
          <div style={{ position: "relative", width: "fit-content", maxWidth: 460 }}>
            <div style={{ position: "absolute", top: -14, right: -10, fontSize: 30, transform: "rotate(8deg)", filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.4))" }}>🔍</div>
            <PoemCartel text={`"${r1Pick.verse}"`} fontSize={18} />
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            {r1Opts.map((f, i) => (
              <OptionButton key={f} label={f} locked={r1Locked}
                isCorrect={f === r1Pick.figura} isPicked={r1Choice === f}
                onClick={() => setR1Choice((c) => (c === f ? null : f))}
                color={["#ef5a5a", "#4fa0ff", "#2ecc8f"][i % 3]} />
            ))}
          </div>
        </div>
      )}

      {/* R2 — clasifica la rima (arrastrar a su cajón; re-arrastrable entre cajones) */}
      {ronda === 1 && (
        <div data-qa="zona-central" style={{
          position: "absolute", top: 74, bottom: 14, left: "50%", transform: "translateX(-50%)",
          width: 600, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
        }}>
          <EnunciadoInline text={enunciado} />
          {/* Fichas por colocar (también es zona para devolver una ficha) */}
          <div data-dropzone="__tray" data-qa="bandeja" style={{
            display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", alignItems: "center",
            minHeight: 56, minWidth: 340, borderRadius: 12, padding: "4px 8px",
          }}>
            {r2Pick.fichas.filter((f) => !r2Placed[f.id]).map((f) => {
              const sel = r2Selected === f.id;
              return (
                <div key={f.id}
                  className={r2Locked ? "" : "ed-draggable"}
                  onPointerDown={r2Locked ? undefined : makeDragHandler({
                    item: f.id, disabled: r2Locked,
                    ghostHtml: `<div style="background:linear-gradient(180deg,#fce9a8,#e9c45a);color:#3a2608;padding:10px 16px;border-radius:12px;font-family:Fredoka,Nunito,sans-serif;font-weight:800;font-size:17px;border:2px solid #4fd8ff;box-shadow:0 8px 20px rgba(0,0,0,0.5);white-space:nowrap;">${f.pair}</div>`,
                    onTap: r2TapFicha, onDrop: r2PlaceZone,
                  })}
                  style={{
                    padding: "10px 16px", borderRadius: 12,
                    background: sel ? "linear-gradient(180deg,#fce9a8,#e9c45a)" : "rgba(255,255,255,0.92)",
                    color: "#3a2608", border: `2px solid ${sel ? "#4fd8ff" : "rgba(116,72,32,0.25)"}`,
                    boxShadow: sel ? "0 0 16px rgba(79,216,255,0.6)" : "0 3px 8px rgba(0,0,0,0.25)",
                    transform: sel ? "translateY(-2px)" : "none",
                    fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 17,
                    transition: "all 0.15s ease", whiteSpace: "nowrap",
                  }}>
                  {f.pair}
                </div>
              );
            })}
            {r2AllPlaced && (
              <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 15, color: "rgba(255,255,255,0.7)", pointerEvents: "none" }}>
                ¡Listo! Pulsa VERIFICAR.
              </div>
            )}
          </div>
          {/* Cajas (cajones) */}
          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            {r2Pick.bins.map((bin) => {
              const color = RIMA_COLOR[bin];
              const inside = r2Pick.fichas.filter((f) => r2Placed[f.id] === bin);
              return (
                <div key={bin} data-dropzone={bin}
                  onClick={() => { if (!r2Locked && r2Selected) r2PlaceZone(bin, r2Selected); }}
                  style={{
                    width: 150, minHeight: 150, borderRadius: 14, padding: "10px 7px 12px",
                    background: "rgba(10,6,35,0.5)", border: `2.5px dashed ${color}`,
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    cursor: (r2Selected && !r2Locked) ? "pointer" : "default",
                  }}>
                  <div style={{
                    fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 13,
                    color: "#fff", background: color, borderRadius: 8, padding: "3px 12px",
                    letterSpacing: "0.04em", boxShadow: "0 2px 6px rgba(0,0,0,0.3)", pointerEvents: "none",
                  }}>{RIMA_LABEL[bin]}</div>
                  {inside.map((f) => {
                    const ok = r2Locked ? f.tipo === bin : null;
                    return (
                      <div key={f.id}
                        className={r2Locked ? "" : "ed-draggable"}
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={r2Locked ? undefined : makeDragHandler({
                          item: f.id, disabled: r2Locked,
                          ghostHtml: `<div style="background:linear-gradient(180deg,#fce9a8,#e9c45a);color:#3a2608;padding:8px 12px;border-radius:10px;font-family:Fredoka,Nunito,sans-serif;font-weight:800;font-size:15px;border:2px solid #4fd8ff;box-shadow:0 8px 20px rgba(0,0,0,0.5);white-space:nowrap;">${f.pair}</div>`,
                          onTap: r2TapFicha, onDrop: r2PlaceZone,
                        })}
                        style={{
                          fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 14,
                          padding: "6px 10px", borderRadius: 8, lineHeight: 1,
                          background: r2Locked ? (ok ? "linear-gradient(180deg,#2ecc8f,#22a06c)" : "linear-gradient(180deg,#ff6b6b,#dc5050)") : "rgba(255,255,255,0.92)",
                          color: r2Locked ? "#fff" : "#3a2608",
                          whiteSpace: "nowrap", boxShadow: "0 2px 5px rgba(0,0,0,0.25)",
                        }}
                        title={r2Locked ? "" : "Arrástralo a otro cajón (o a la bandeja para sacarlo)"}>
                        {r2Locked ? (ok ? "✓ " : "✗ ") : ""}{f.pair}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* R3 — ordena las 5 partes del discurso (arrastrar a casillas 1-5) */}
      {ronda === 2 && (() => {
        const r3Card = (id, ok) => {
          const c = r3ById[id];
          if (!c) return null;
          return (
            <div key={id}
              className={r3Locked ? "" : "ed-draggable"}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={r3Locked ? undefined : makeDragHandler({
                item: id, disabled: r3Locked,
                ghostHtml: `<div style="background:linear-gradient(180deg,#fce9a8,#e9c45a);color:#3a2608;padding:8px 14px;border-radius:10px;font-family:Fredoka,Nunito,sans-serif;font-weight:800;font-size:15px;border:2px solid #4fd8ff;box-shadow:0 8px 20px rgba(0,0,0,0.5);white-space:nowrap;">${c.parte}</div>`,
                onTap: r3TapCard, onDrop: r3PlaceZone,
              })}
              style={{
                padding: "6px 12px", borderRadius: 10, textAlign: "center", minWidth: 150,
                background: r3Locked ? (ok ? "linear-gradient(180deg,#2ecc8f,#22a06c)" : "linear-gradient(180deg,#ff6b6b,#dc5050)") : "rgba(255,255,255,0.95)",
                color: r3Locked ? "#fff" : "#3a2608", boxShadow: "0 3px 8px rgba(0,0,0,0.28)",
              }}>
              <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 15, lineHeight: 1.1 }}>
                {r3Locked ? (ok ? "✓ " : "✗ ") : ""}{c.parte}
              </div>
              <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 11, opacity: 0.72, lineHeight: 1.15 }}>{c.cue}</div>
            </div>
          );
        };
        return (
        <div data-qa="zona-central" style={{
          position: "absolute", top: 74, bottom: 14, left: "50%", transform: "translateX(-50%)",
          width: 560, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
        }}>
          <EnunciadoInline text={enunciado} />
          {/* Bandeja: partes por colocar (también zona para devolver) */}
          <div data-dropzone="__tray3" data-qa="bandeja" style={{
            display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", alignItems: "center",
            minHeight: 54, minWidth: 360, maxWidth: 480, borderRadius: 12, padding: "4px 8px",
          }}>
            {r3Shuffle.filter((id) => !r3Slots.includes(id)).map((id) => r3Card(id, null))}
            {r3Slots.every(Boolean) && (
              <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 14, color: "rgba(255,255,255,0.7)", pointerEvents: "none" }}>
                ¡Listo! Pulsa VERIFICAR.
              </div>
            )}
          </div>
          {/* Casillas numeradas 1-5 (cajón angosto que abraza la tarjeta) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 7, alignItems: "center" }}>
            {[0, 1, 2, 3, 4].map((i) => {
              const id = r3Slots[i];
              const ok = (r3Locked && id) ? (r3ById[id].n === i + 1) : null;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 30, height: 30, flexShrink: 0, borderRadius: 8,
                    background: "#a78bfa", color: "#1a0a3a", fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 16,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{i + 1}</div>
                  <div data-dropzone={`slot-${i}`}
                    style={{
                      width: 250, minHeight: 46, borderRadius: 12, padding: "4px 8px",
                      background: "rgba(10,6,35,0.4)",
                      border: `2px dashed ${id ? "rgba(167,139,250,0.25)" : "rgba(167,139,250,0.6)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                    {id ? r3Card(id, ok) : (
                      <span style={{ fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 12, color: "rgba(252,233,168,0.4)", pointerEvents: "none" }}>
                        Suelta aquí la parte {i + 1}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        );
      })()}

      <ActionRail
        canVerify={canVerify} onVerify={handleVerify}
        showErase={true} onErase={handleErase}
        onRestart={() => setConfirmingRestart(true)} onExit={() => setConfirmingExit(true)}
      />
      <FeedbackOverlay feedback={feedback} feedbackMsg={feedbackMsg} charName={char.name} />
      <ConfirmModal open={confirmingRestart} onClose={() => setConfirmingRestart(false)}
        label="Reiniciar juego" labelColor="#ff8b8b" title="¿Empezar de nuevo?"
        body={`Vas a perder el progreso de esta ronda (${attempted}/3) y volverás a la primera.`}
        confirmText="SÍ, REINICIAR" onConfirm={() => { setConfirmingRestart(false); onRestart && onRestart(); }} />
      <ConfirmModal open={confirmingExit} onClose={() => setConfirmingExit(false)}
        label="Salir del juego" labelColor="#ff8b4c" title="¿Volver al inicio?" glow="rgba(255,138,76,0.3)"
        body={`Vas a perder el progreso de esta ronda (${attempted}/3). No habrá reporte de esta sesión.`}
        confirmText="SÍ, SALIR" onConfirm={() => { setConfirmingExit(false); go("home"); }} />
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// NIVEL 4 — EL GÉNERO DE OPINIÓN (14 años): 3 rondas distintas
//   R1 acertijo (adivina el tipo de texto) · R2 ¿hecho u opinión? · R3 clasifica oración
// ═════════════════════════════════════════════════════════════
// R1 — Acertijo del periodista: pistas en 1ª persona describen un tipo de
// texto y el joven adivina cuál es (informativo / de opinión / mixto).
const R1_ACERTIJOS = [
  { id: "ac1", cat: "informativo", clues: ["Cuento un hecho real tal como pasó.", "Respondo qué, quién, cuándo y dónde.", "No te doy mi opinión."] },
  { id: "ac2", cat: "informativo", clues: ["Solo presento los datos.", "No juzgo ni defiendo nada.", "Quien me lee se entera de lo que ocurrió."] },
  { id: "ac3", cat: "opinion", clues: ["Defiendo una postura.", "Uso expresiones como 'creo' o 'me parece'.", "Busco convencerte de algo."] },
  { id: "ac4", cat: "opinion", clues: ["No me importa solo el dato.", "Te doy mi juicio y mi punto de vista.", "Quiero que pienses como yo."] },
  { id: "ac5", cat: "mixto", clues: ["Mezclo el dato con el comentario.", "Informo y, de paso, opino.", "Tengo un poco de los otros dos."] },
  { id: "ac6", cat: "mixto", clues: ["Cuento lo que pasó.", "Pero también dejo ver lo que siento.", "Soy mitad información, mitad opinión."] },
];
const CAT_LABEL = { informativo: "INFORMATIVO", opinion: "DE OPINIÓN", mixto: "MIXTO" };
const CAT_OPT = { informativo: "Informativo", opinion: "De opinión", mixto: "Mixto" };
const CAT_COLOR = { informativo: "#4fa0ff", opinion: "#e0a23a", mixto: "#2ecc8f" };

const R2_FRASES = [
  { id: "h1", text: "El editorial no lleva firma.", hecho: true },
  { id: "h2", text: "La noticia responde qué, quién, cuándo y dónde.", hecho: true },
  { id: "h3", text: "La crónica combina información y opinión.", hecho: true },
  { id: "h4", text: "El reportaje profundiza en un hecho real.", hecho: true },
  { id: "o1", text: "Creo que el periódico digital es mejor que el de papel.", hecho: false },
  { id: "o2", text: "Me parece que las redes sociales mejoran el periodismo.", hecho: false },
  { id: "o3", text: "Pienso que leer en papel es más agradable.", hecho: false },
  { id: "o4", text: "En mi opinión, deberían escribirse más columnas.", hecho: false },
];

const TIPOS_ORA = ["modificador", "interjeccion", "nominal"];
const ORA_LABEL = { modificador: "SUST. + MODIFICADOR", interjeccion: "INTERJECCIÓN", nominal: "FRASE NOMINAL" };
const ORA_COLOR = { modificador: "#4fa0ff", interjeccion: "#e0a23a", nominal: "#2ecc8f" };
const R3_ORA = {
  modificador: [
    { id: "m1", text: "El cielo nublado." }, { id: "m2", text: "Una sopa caliente." },
    { id: "m3", text: "La calle ruidosa." }, { id: "m4", text: "Mis zapatos nuevos." },
  ],
  interjeccion: [
    { id: "i1", text: "¡Bravo!" }, { id: "i2", text: "¡Cuidado!" },
    { id: "i3", text: "¡Achachay!" }, { id: "i4", text: "¡Auxilio!" },
  ],
  nominal: [
    { id: "n1", text: "El partido del domingo." }, { id: "n2", text: "El tren de las seis." },
    { id: "n3", text: "La casa de la esquina." }, { id: "n4", text: "La película de anoche." },
  ],
};

function OpinionGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "El género de opinión · 14 años";

  const [ronda, setRonda] = useStateG(0);

  // R1 — acertijo del periodista: pistas → adivinar el tipo de texto.
  const [r1Pick] = useStateG(() => pickFreshP(R1_ACERTIJOS, "ac"));
  const [r1Revealed, setR1Revealed] = useStateG(1); // pistas visibles (1..3)
  const [r1Choice, setR1Choice] = useStateG(null);  // "informativo" | "opinion" | "mixto"
  const [r1Locked, setR1Locked] = useStateG(false);

  // R2 — hecho u opinión
  const [r2Pick] = useStateG(() => pickFreshP(R2_FRASES, "op"));
  const [r2Choice, setR2Choice] = useStateG(null); // "HECHO" | "OPINIÓN"
  const [r2Locked, setR2Locked] = useStateG(false);
  // R3 — clasifica oración
  const [r3Pick] = useStateG(() => ({
    fichas: shuffle([
      { ...pickFreshP(R3_ORA.modificador, "om"), tipo: "modificador" },
      { ...pickFreshP(R3_ORA.interjeccion, "oi"), tipo: "interjeccion" },
      { ...pickFreshP(R3_ORA.nominal, "on"), tipo: "nominal" },
    ]),
    bins: TIPOS_ORA,
  }));
  const [r3Placed, setR3Placed] = useStateG({});
  const [r3Selected, setR3Selected] = useStateG(null);
  const [r3Locked, setR3Locked] = useStateG(false);

  const [elapsed, setElapsed] = useStateG(0);
  const [stars, setStars] = useStateG(0);
  const [solved, setSolved] = useStateG(0);
  const [attempted, setAttempted] = useStateG(0);
  const [starsSession, setStarsSession] = useStateG(0);
  const [feedback, setFeedback] = useStateG(null);
  const [feedbackMsg, setFeedbackMsg] = useStateG("");
  const [confirmingExit, setConfirmingExit] = useStateG(false);
  const [confirmingRestart, setConfirmingRestart] = useStateG(false);
  const [log, setLog] = useStateG([]);
  const started = useRefG(Date.now());
  const exerciseStart = useRefG(Date.now());
  // Vivo mientras el componente esté montado; los timeouts pendientes lo
  // consultan y abortan al desmontar (SALIR/REINICIAR/cambio de nivel) para no
  // disparar navegación/estado sobre una sesión que ya no existe.
  const aliveRef = useRefG(true);

  useEffectG(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started.current) / 1000)), 500);
    return () => { clearInterval(id); aliveRef.current = false; };
  }, []);

  const answer = makeAnswer({
    attempted, solved, stars, starsSession, log, elapsed, catLabel,
    exerciseStart, setApp, go, aliveRef,
    setFeedback, setFeedbackMsg, setAttempted, setSolved, setStars, setStarsSession, setLog,
    onNextRound: () => setRonda((r) => r + 1),
  });

  const r3AllPlaced = r3Pick.fichas.every((f) => r3Placed[f.id]);
  const canVerify =
    feedback ? false :
    ronda === 0 ? (r1Choice !== null && !r1Locked) :
    ronda === 1 ? (r2Choice !== null && !r2Locked) :
    ronda === 2 ? (r3AllPlaced && !r3Locked) : false;

  function handleVerify() {
    if (!canVerify) return;
    if (ronda === 0) {
      setR1Locked(true);
      const correct = r1Choice === r1Pick.cat;
      setTimeout(() => answer(correct, CAT_OPT[r1Choice], CAT_OPT[r1Pick.cat], "🕵️", "Tipo de texto"), correct ? 450 : 1500);
    } else if (ronda === 1) {
      setR2Locked(true);
      const correct = (r2Choice === "HECHO") === r2Pick.hecho;
      setTimeout(() => answer(correct, r2Choice, r2Pick.hecho ? "HECHO" : "OPINIÓN", "⚖️", "Hecho u opinión"), correct ? 450 : 1500);
    } else if (ronda === 2) {
      setR3Locked(true);
      const correct = r3Pick.fichas.every((f) => r3Placed[f.id] === f.tipo);
      const u = r3Pick.fichas.map((f) => `${f.text}→${ORA_LABEL[r3Placed[f.id]] || "?"}`).join(" · ");
      const c = r3Pick.fichas.map((f) => `${f.text}→${ORA_LABEL[f.tipo]}`).join(" · ");
      setTimeout(() => answer(correct, u, c, "🧩", "Oraciones sin verbo"), correct ? 450 : 1500);
    }
  }
  function handleErase() {
    if (ronda === 0 && !r1Locked) setR1Choice(null);
    else if (ronda === 1 && !r2Locked) setR2Choice(null);
    else if (ronda === 2 && !r3Locked) { setR3Placed({}); setR3Selected(null); }
  }

  // R3 drag+tap: soltar en un cajón coloca; en "__tray4" devuelve a la bandeja.
  function r3PlaceO(zoneId, fichaId) {
    if (r3Locked) return;
    setR3Selected(null);
    if (zoneId === "__tray4") {
      setR3Placed((p) => { const n = { ...p }; delete n[fichaId]; return n; });
    } else if (TIPOS_ORA.includes(zoneId)) {
      setR3Placed((p) => ({ ...p, [fichaId]: zoneId }));
    }
  }
  function r3TapO(fichaId) {
    if (r3Locked) return;
    if (r3Placed[fichaId]) {
      setR3Placed((p) => { const n = { ...p }; delete n[fichaId]; return n; });
      setR3Selected(null);
    } else {
      setR3Selected((s) => (s === fichaId ? null : fichaId));
    }
  }

  const enunciado =
    ronda === 0 ? "Adivina qué tipo de texto es." :
    ronda === 1 ? "Decide si la frase es un hecho o una opinión." :
    "Clasifica cada oración sin verbo.";
  const bocadillo =
    ronda === 0 ? "Lee la pista y toca\n«Otra pista» por más." :
    ronda === 1 ? "Si se puede comprobar,\nes un hecho." :
    "Arrastra cada oración\na su cajón.";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <GameHUD elapsed={elapsed} stars={stars} attempted={attempted} solved={solved} total={3} app={app} setApp={setApp} />
      <CharacterCorner char={char} message={bocadillo} />

      {/* R1 — Acertijo del periodista: pistas → adivinar el tipo de texto */}
      {ronda === 0 && (
        <div data-qa="zona-central" style={{
          position: "absolute", top: 74, bottom: 14, left: "50%", transform: "translateX(-50%)",
          width: 560, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
        }}>
          <EnunciadoInline text={enunciado} />
          {/* Ficha de acertijo con pistas */}
          <div style={{
            width: "fit-content", maxWidth: 460, padding: "14px 22px", borderRadius: 16,
            background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(244,238,228,0.92))",
            border: "3px solid #f2c260", boxShadow: "0 12px 28px rgba(0,0,0,0.4), inset 0 -4px 0 rgba(0,0,0,0.06)",
            color: "#3a2608",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 22 }}>🕵️</span>
              <span style={{ fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 16 }}>¿Qué tipo de texto soy?</span>
            </div>
            {r1Pick.clues.slice(0, r1Revealed).map((c, i) => (
              <div key={i} style={{
                display: "flex", gap: 8, alignItems: "flex-start",
                fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 15, lineHeight: 1.3, marginTop: i ? 6 : 0,
              }}>
                <span style={{ color: "#d9a441", fontWeight: 800 }}>•</span>
                <span style={{ textAlign: "left" }}>{c}</span>
              </div>
            ))}
          </div>
          {/* Pedir otra pista */}
          {r1Revealed < r1Pick.clues.length && !r1Locked ? (
            <button onClick={() => setR1Revealed((n) => Math.min(r1Pick.clues.length, n + 1))}
              style={{
                padding: "8px 18px", borderRadius: 999, border: "2px solid rgba(242,194,96,0.6)",
                background: "rgba(10,6,35,0.5)", color: "#fce9a8",
                fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 13, cursor: "pointer",
              }}>
              🔎 Otra pista ({r1Revealed}/{r1Pick.clues.length})
            </button>
          ) : (
            <div style={{ height: 16 }} />
          )}
          {/* Opciones de tipo */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            {["informativo", "opinion", "mixto"].map((cat) => (
              <OptionButton key={cat} label={CAT_OPT[cat]} locked={r1Locked}
                isCorrect={cat === r1Pick.cat} isPicked={r1Choice === cat}
                onClick={() => setR1Choice((c) => (c === cat ? null : cat))}
                color={CAT_COLOR[cat]} />
            ))}
          </div>
        </div>
      )}

      {/* R2 — ¿hecho u opinión? */}
      {ronda === 1 && (
        <div data-qa="zona-central" style={{
          position: "absolute", top: 74, bottom: 14, left: "50%", transform: "translateX(-50%)",
          width: 540, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
        }}>
          <EnunciadoInline text={enunciado} />
          <PoemCartel text={`"${r2Pick.text}"`} fontSize={19} maxWidth={460} />
          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            <OptionButton label="HECHO" locked={r2Locked} isCorrect={r2Pick.hecho} isPicked={r2Choice === "HECHO"}
              onClick={() => setR2Choice((c) => (c === "HECHO" ? null : "HECHO"))} color="#4fa0ff" />
            <OptionButton label="OPINIÓN" locked={r2Locked} isCorrect={!r2Pick.hecho} isPicked={r2Choice === "OPINIÓN"}
              onClick={() => setR2Choice((c) => (c === "OPINIÓN" ? null : "OPINIÓN"))} color="#e0a23a" />
          </div>
        </div>
      )}

      {/* R3 — clasifica la oración sin verbo (arrastrar a cajones; re-arrastrable) */}
      {ronda === 2 && (
        <div data-qa="zona-central" style={{
          position: "absolute", top: 74, bottom: 14, left: "50%", transform: "translateX(-50%)",
          width: 600, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
        }}>
          <EnunciadoInline text={enunciado} />
          {/* Bandeja (arriba, sobre el personaje) — también zona para devolver */}
          <div data-dropzone="__tray4" data-qa="bandeja" style={{
            display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", alignItems: "center",
            minHeight: 52, maxWidth: 560, borderRadius: 12, padding: "4px 8px",
          }}>
            {r3Pick.fichas.filter((f) => !r3Placed[f.id]).map((f) => {
              const sel = r3Selected === f.id;
              return (
                <div key={f.id}
                  className={r3Locked ? "" : "ed-draggable"}
                  onPointerDown={r3Locked ? undefined : makeDragHandler({
                    item: f.id, disabled: r3Locked,
                    ghostHtml: `<div style="background:linear-gradient(180deg,#fce9a8,#e9c45a);color:#3a2608;padding:10px 16px;border-radius:12px;font-family:Fredoka,Nunito,sans-serif;font-weight:800;font-size:16px;border:2px solid #4fd8ff;box-shadow:0 8px 20px rgba(0,0,0,0.5);white-space:nowrap;">${f.text}</div>`,
                    onTap: r3TapO, onDrop: r3PlaceO,
                  })}
                  style={{
                    padding: "10px 16px", borderRadius: 12,
                    background: sel ? "linear-gradient(180deg,#fce9a8,#e9c45a)" : "rgba(255,255,255,0.92)",
                    color: "#3a2608", border: `2px solid ${sel ? "#4fd8ff" : "rgba(116,72,32,0.25)"}`,
                    boxShadow: sel ? "0 0 16px rgba(79,216,255,0.6)" : "0 3px 8px rgba(0,0,0,0.25)",
                    transform: sel ? "translateY(-2px)" : "none",
                    fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 16,
                    transition: "all 0.15s ease", whiteSpace: "nowrap",
                  }}>
                  {f.text}
                </div>
              );
            })}
            {r3AllPlaced && (
              <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 15, color: "rgba(255,255,255,0.7)", pointerEvents: "none" }}>
                ¡Listo! Pulsa VERIFICAR.
              </div>
            )}
          </div>
          {/* Cajones (abajo, empujados con marginTop:auto para no chocar con el personaje) */}
          <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
            {r3Pick.bins.map((bin) => {
              const color = ORA_COLOR[bin];
              const inside = r3Pick.fichas.filter((f) => r3Placed[f.id] === bin);
              return (
                <div key={bin} data-dropzone={bin}
                  onClick={() => { if (!r3Locked && r3Selected) r3PlaceO(bin, r3Selected); }}
                  style={{
                    width: 150, minHeight: 150, borderRadius: 14, padding: "10px 7px 12px",
                    background: "rgba(10,6,35,0.5)", border: `2.5px dashed ${color}`,
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    cursor: (r3Selected && !r3Locked) ? "pointer" : "default",
                  }}>
                  <div style={{
                    fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 12,
                    color: "#fff", background: color, borderRadius: 8, padding: "3px 10px",
                    letterSpacing: "0.03em", boxShadow: "0 2px 6px rgba(0,0,0,0.3)", textAlign: "center", lineHeight: 1.1, pointerEvents: "none",
                  }}>{ORA_LABEL[bin]}</div>
                  {inside.map((f) => {
                    const ok = r3Locked ? f.tipo === bin : null;
                    return (
                      <div key={f.id}
                        className={r3Locked ? "" : "ed-draggable"}
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={r3Locked ? undefined : makeDragHandler({
                          item: f.id, disabled: r3Locked,
                          ghostHtml: `<div style="background:linear-gradient(180deg,#fce9a8,#e9c45a);color:#3a2608;padding:8px 12px;border-radius:10px;font-family:Fredoka,Nunito,sans-serif;font-weight:800;font-size:14px;border:2px solid #4fd8ff;box-shadow:0 8px 20px rgba(0,0,0,0.5);text-align:center;">${f.text}</div>`,
                          onTap: r3TapO, onDrop: r3PlaceO,
                        })}
                        style={{
                          fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 13,
                          padding: "6px 9px", borderRadius: 8, lineHeight: 1.1, textAlign: "center",
                          background: r3Locked ? (ok ? "linear-gradient(180deg,#2ecc8f,#22a06c)" : "linear-gradient(180deg,#ff6b6b,#dc5050)") : "rgba(255,255,255,0.92)",
                          color: r3Locked ? "#fff" : "#3a2608",
                          boxShadow: "0 2px 5px rgba(0,0,0,0.25)",
                        }}
                        title={r3Locked ? "" : "Arrástralo a otro cajón (o a la bandeja para sacarlo)"}>
                        {r3Locked ? (ok ? "✓ " : "✗ ") : ""}{f.text}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ActionRail
        canVerify={canVerify} onVerify={handleVerify}
        showErase={true} onErase={handleErase}
        onRestart={() => setConfirmingRestart(true)} onExit={() => setConfirmingExit(true)}
      />
      <FeedbackOverlay feedback={feedback} feedbackMsg={feedbackMsg} charName={char.name} />
      <ConfirmModal open={confirmingRestart} onClose={() => setConfirmingRestart(false)}
        label="Reiniciar juego" labelColor="#ff8b8b" title="¿Empezar de nuevo?"
        body={`Vas a perder el progreso de esta ronda (${attempted}/3) y volverás a la primera.`}
        confirmText="SÍ, REINICIAR" onConfirm={() => { setConfirmingRestart(false); onRestart && onRestart(); }} />
      <ConfirmModal open={confirmingExit} onClose={() => setConfirmingExit(false)}
        label="Salir del juego" labelColor="#ff8b4c" title="¿Volver al inicio?" glow="rgba(255,138,76,0.3)"
        body={`Vas a perder el progreso de esta ronda (${attempted}/3). No habrá reporte de esta sesión.`}
        confirmText="SÍ, SALIR" onConfirm={() => { setConfirmingExit(false); go("home"); }} />
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// GameScreen — router por nivel (con REINICIAR que remonta el juego)
// ═════════════════════════════════════════════════════════════
function GameScreen({ app, setApp, go }) {
  const [tick, setTick] = useStateG(0);
  const restart = () => setTick((t) => t + 1);
  if (app.level === "opinion") return <OpinionGame key={`o-${tick}`} app={app} setApp={setApp} go={go} onRestart={restart} />;
  if (app.level === "voces") return <VocesGame key={`v-${tick}`} app={app} setApp={setApp} go={go} onRestart={restart} />;
  if (app.level === "poemas") return <PoemasGame key={`p-${tick}`} app={app} setApp={setApp} go={go} onRestart={restart} />;
  return <BibliotecaGame key={`b-${tick}`} app={app} setApp={setApp} go={go} onRestart={restart} />;
}

// ═════════════════════════════════════════════════════════════
// RESULTS — reporte académico genérico (Reto / Tu respuesta / Correcta)
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
  const res = app.lastResult || { category: "Explorando la biblioteca", solved: 0, total: 3, time: 0, starsEarned: 0, log: [] };
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
                    <td style={{ padding: "8px 8px", textAlign: "right", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis" }}>{String(e.userAnswer).slice(0, 30)}</td>
                    <td style={{ padding: "8px 8px", textAlign: "right", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis" }}>{String(e.correctAnswer).slice(0, 30)}</td>
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
