// game-screens.jsx — GameScreen + ResultsScreen para "Cuéntalo al mundo".
// Juego de 2 niveles por edad:
//   • NIVEL 1 (11 años) — BlogGame: "El blog".
//       R1 Arma tu blog (ORDENAR: lleva cada parte a su zona)
//       R2 Detective de blogs (IDENTIFICAR el tema desde una entrada)
//       R3 Taller de títulos (ELEGIR el título más llamativo)
//   • NIVEL 2 (14 años) — EntrevistaGame: "La entrevista".
//       R1 ¿Abierta o cerrada? (CLASIFICAR el tipo de pregunta)
//       R2 Detective de entrevistas (IDENTIFICAR perfil / noticias / opinión)
//       R3 Arma la entrevista (ORDENAR los 5 momentos)
//
// GameScreen enruta por app.level. El shell (HUD, personaje §1, enunciado,
// action rail, modales, feedback, reporte académico, scoring por tiempo) se
// hereda del estándar. ResultsScreen es genérica (Reto / Tu respuesta /
// Respuesta correcta) y sirve para ambos niveles. Contenido ORIGINAL (no
// reproduce los ejemplos del libro).

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
  "¡Casi! Vuelve a intentarlo.",
  "Cada error enseña algo nuevo.",
  "¡La próxima es tuya!",
  "Sigue, lo estás logrando.",
  "Leer y observar es practicar.",
  "¡Vamos a la siguiente!",
  "Equivocarse también es aprender.",
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
  const currentId = (app && (app.currentCategory || app.level)) || "blog";
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

      {/* Pestañas de tema (estilo juego-14): tema actual resaltado, tocar
          otro pide confirmación antes de cambiar. */}
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

// CharacterCorner canónico (shell-standards.md §1).
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

// answer() compartido: registra el log y avanza/termina.
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

// ─── FIFO anti-repetición (compartido, prefijo por ronda) ───────
const RECENT_KEY = "edinun_blog_entrevista_recientes_v1";
const RECENT_LIMIT = 60;
function getRecent() {
  try { const r = localStorage.getItem(RECENT_KEY); const a = r ? JSON.parse(r) : []; return Array.isArray(a) ? a : []; }
  catch { return []; }
}
function pushRecent(key) {
  const a = getRecent().filter((k) => k !== key);
  a.unshift(key);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(a.slice(0, RECENT_LIMIT))); } catch {}
}
function pickFresh(bank, prefix) {
  const pre = prefix + ":";
  const recentIds = getRecent().filter((k) => k.startsWith(pre)).map((k) => k.slice(pre.length));
  const windowN = Math.floor(bank.length / 2);
  const blocked = new Set(recentIds.slice(0, windowN));
  let pool = bank.filter((b) => !blocked.has(b.id));
  if (pool.length === 0) pool = bank;
  const p = pool[Math.floor(Math.random() * pool.length)];
  pushRecent(pre + p.id);
  return p;
}

// Cartel blanco genérico (texto variable, width fit-content §8).
function Cartel({ children, maxWidth = 460, fontSize = 16, pad = "14px 22px" }) {
  return (
    <div style={{
      width: "fit-content", maxWidth, padding: pad, borderRadius: 16,
      background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(244,238,228,0.92))",
      border: "3px solid #f2c260", boxShadow: "0 12px 28px rgba(0,0,0,0.4), inset 0 -4px 0 rgba(0,0,0,0.06)",
      fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize, lineHeight: 1.35,
      color: "#3a2608", textAlign: "center", whiteSpace: "pre-line",
    }}>{children}</div>
  );
}

// Botón de opción con feedback §11 (verde correcto / rojo error al fallar).
function OptionButton({ label, locked, isCorrect, isPicked, onClick, color, minWidth = 96 }) {
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
        position: "relative", minWidth, height: 56, padding: "0 16px",
        borderColor, borderWidth: (isPicked || showCorrect || showWrong) ? 3 : 2, borderStyle: "solid",
        borderRadius: 12, cursor: locked ? "default" : "pointer",
        fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 16, letterSpacing: "0.02em",
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

// ─── OrderRound — ordenar N tarjetas en casillas numeradas 1..N ──
// Drag + re-arrastre + bandeja para devolver. items: [{id,n,label,cue}].
// slots/setSlots viven en el padre (para validar). slotLabels opcional
// rotula cada casilla (ej. Cabecera / Fecha / Entrada / Comentarios).
function OrderRound({ items, byId, slots, setSlots, locked, accent = "#a78bfa", ink = "#1a0a3a", slotW = 250, prefix = "o", slotLabels = null, slotPlaceholders = null }) {
  const TRAY = "__tray-" + prefix;
  const SLOT_PRE = "slot-" + prefix + "-";
  const [shuffled] = useStateG(() => shuffle(items.map((c) => c.id)));

  function placeZone(zoneId, cardId) {
    if (locked) return;
    setSlots((prev) => {
      const s = prev.slice();
      const cur = s.indexOf(cardId);
      if (cur !== -1) s[cur] = null;
      if (zoneId === TRAY) return s;
      if (zoneId.indexOf(SLOT_PRE) !== 0) return s;
      const idx = parseInt(zoneId.slice(SLOT_PRE.length), 10);
      if (isNaN(idx)) return s;
      s[idx] = cardId;
      return s;
    });
  }
  function tapCard(cardId) {
    if (locked) return;
    setSlots((prev) => {
      const s = prev.slice();
      const cur = s.indexOf(cardId);
      if (cur !== -1) { s[cur] = null; return s; }
      const empty = s.indexOf(null);
      if (empty !== -1) s[empty] = cardId;
      return s;
    });
  }
  const card = (id, ok) => {
    const c = byId[id];
    if (!c) return null;
    return (
      <div key={id}
        className={locked ? "" : "ed-draggable"}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={locked ? undefined : makeDragHandler({
          item: id, disabled: locked,
          ghostHtml: `<div style="background:linear-gradient(180deg,#fce9a8,#e9c45a);color:#3a2608;padding:8px 14px;border-radius:10px;font-family:Fredoka,Nunito,sans-serif;font-weight:800;font-size:14px;border:2px solid #4fd8ff;box-shadow:0 8px 20px rgba(0,0,0,0.5);max-width:230px;text-align:center;">${c.label}</div>`,
          onTap: tapCard, onDrop: placeZone,
        })}
        style={{
          padding: c.cue ? "6px 12px" : "8px 13px", borderRadius: 10, textAlign: "center", minWidth: 150, maxWidth: 215,
          background: locked ? (ok ? "linear-gradient(180deg,#2ecc8f,#22a06c)" : "linear-gradient(180deg,#ff6b6b,#dc5050)") : "rgba(255,255,255,0.95)",
          color: locked ? "#fff" : "#3a2608", boxShadow: "0 3px 8px rgba(0,0,0,0.28)",
        }}>
        <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 13.5, lineHeight: 1.2 }}>
          {locked ? (ok ? "✓ " : "✗ ") : ""}{c.label}
        </div>
        {c.cue && (
          <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 11, opacity: 0.72, lineHeight: 1.15, marginTop: 1 }}>{c.cue}</div>
        )}
      </div>
    );
  };
  return (
    <>
      {/* Bandeja: tarjetas por colocar (también zona para devolver) */}
      <div data-dropzone={TRAY} data-qa="bandeja" style={{
        display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", alignItems: "center",
        minHeight: 50, minWidth: 340, maxWidth: 470, borderRadius: 12, padding: "4px 8px",
      }}>
        {shuffled.filter((id) => !slots.includes(id)).map((id) => card(id, null))}
        {slots.every(Boolean) && (
          <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 14, color: "rgba(255,255,255,0.7)", pointerEvents: "none" }}>
            ¡Listo! Pulsa VERIFICAR.
          </div>
        )}
      </div>
      {/* Casillas numeradas 1..N */}
      <div style={{ display: "flex", flexDirection: "column", gap: 7, alignItems: "center" }}>
        {slots.map((id, i) => {
          const ok = (locked && id) ? (byId[id].n === i + 1) : null;
          const correcta = (locked && !ok) ? items.find((c) => c.n === i + 1) : null;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: slotLabels ? 100 : 30, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: accent, color: ink, fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 16,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{i + 1}</div>
                {slotLabels && slotLabels[i] && (
                  <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 11, color: "#fce9a8", textAlign: "center", lineHeight: 1.05, letterSpacing: "0.01em" }}>{slotLabels[i]}</div>
                )}
              </div>
              <div data-dropzone={`slot-${prefix}-${i}`}
                style={{
                  width: slotW, minHeight: 44, borderRadius: 12, padding: "4px 8px",
                  background: "rgba(10,6,35,0.4)",
                  border: `2px dashed ${id ? "rgba(167,139,250,0.25)" : "rgba(167,139,250,0.6)"}`,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
                }}>
                {id ? card(id, ok) : (
                  <span style={{ fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 12, color: "rgba(252,233,168,0.45)", pointerEvents: "none" }}>
                    {slotPlaceholders && slotPlaceholders[i] ? slotPlaceholders[i] : `Suelta aquí el ${i + 1}`}
                  </span>
                )}
                {correcta && (
                  <div style={{
                    fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 11.5,
                    color: "#7dffc4", lineHeight: 1.15, textAlign: "center", pointerEvents: "none",
                  }}>
                    ✓ Aquí va: {correcta.label}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ═════════════════════════════════════════════════════════════
// NIVEL 1 — EL BLOG (11 años): 3 rondas distintas
// ═════════════════════════════════════════════════════════════

// R1 — Arma tu blog (ordenar cada parte a su zona: Cabecera / Fecha /
// Entrada / Comentarios). Banco de blogs originales (FIFO).
const BLOG_PARTES = [
  { id: "cocina", parts: [
    { id: "co1", n: 1, label: "Cocina con Ana 🍳 — recetas fáciles para la familia" },
    { id: "co2", n: 2, label: "Publicado el 12 de junio" },
    { id: "co3", n: 3, label: "Hoy preparamos empanadas de viento, crujientes y doradas." },
    { id: "co4", n: 4, label: "Sofía: ¡Me quedaron riquísimas, gracias!" },
  ] },
  { id: "viajes", parts: [
    { id: "vi1", n: 1, label: "Mochila al hombro ⛰️ — aventuras por el Ecuador" },
    { id: "vi2", n: 2, label: "Publicado el 3 de mayo" },
    { id: "vi3", n: 3, label: "Subimos al Quilotoa y la laguna nos dejó sin aliento." },
    { id: "vi4", n: 4, label: "Mateo: ¡Quiero ir! ¿Cómo llego?" },
  ] },
  { id: "mascotas", parts: [
    { id: "ma1", n: 1, label: "Patitas felices 🐶 — consejos para tu mascota" },
    { id: "ma2", n: 2, label: "Publicado el 20 de abril" },
    { id: "ma3", n: 3, label: "Cepillar a tu perro cada semana evita los nudos en su pelo." },
    { id: "ma4", n: 4, label: "Lucía: Mi gato también lo necesita 😺" },
  ] },
  { id: "tecno", parts: [
    { id: "te1", n: 1, label: "Clic y listo 💻 — la tecnología en palabras simples" },
    { id: "te2", n: 2, label: "Publicado el 8 de marzo" },
    { id: "te3", n: 3, label: "Te enseño tres trucos para que tu celular dure más batería." },
    { id: "te4", n: 4, label: "Diego: El segundo truco me salvó, ¡gracias!" },
  ] },
  { id: "deportes", parts: [
    { id: "de1", n: 1, label: "En la cancha ⚽ — todo sobre el fútbol ecuatoriano" },
    { id: "de2", n: 2, label: "Publicado el 15 de julio" },
    { id: "de3", n: 3, label: "Analizamos el último partido de la Tri y sus mejores jugadas." },
    { id: "de4", n: 4, label: "Carla: ¡Qué golazo el del segundo tiempo!" },
  ] },
];
const BLOG_SLOT_LABELS = ["Cabecera", "Fecha", "Entrada", "Comentarios"];
const BLOG_SLOT_PLACEHOLDERS = [
  "Suelta aquí la cabecera",
  "Suelta aquí la fecha",
  "Suelta aquí la entrada",
  "Suelta aquí los comentarios",
];

// R2 — Detective de blogs (leer una entrada y descubrir el tema).
const TEMA_COCINA = "🍳 Cocina";
const TEMA_AVENTURAS = "⛰️ Aventuras";
const TEMA_MASCOTAS = "🐶 Mascotas";
const TEMA_TECNO = "💻 Tecnología";
const TEMA_DEPORTES = "⚽ Deportes";
const BLOG_TEMAS = [
  { id: "bt1", frag: "Hoy batimos las claras hasta que quedaron como nubes. El secreto: no apurarse.", answer: TEMA_COCINA, options: [TEMA_COCINA, TEMA_DEPORTES, TEMA_TECNO] },
  { id: "bt2", frag: "Caminamos seis horas hasta la cima y acampamos bajo un cielo lleno de estrellas.", answer: TEMA_AVENTURAS, options: [TEMA_AVENTURAS, TEMA_COCINA, TEMA_MASCOTAS] },
  { id: "bt3", frag: "Si tu perro esconde la cabeza, está asustado: háblale bajito y con calma.", answer: TEMA_MASCOTAS, options: [TEMA_MASCOTAS, TEMA_TECNO, TEMA_DEPORTES] },
  { id: "bt4", frag: "Con tres clics puedes guardar tus fotos en la nube y no perder ninguna jamás.", answer: TEMA_TECNO, options: [TEMA_TECNO, TEMA_COCINA, TEMA_AVENTURAS] },
  { id: "bt5", frag: "El equipo entrenó penales toda la semana para llegar listo a la gran final.", answer: TEMA_DEPORTES, options: [TEMA_DEPORTES, TEMA_MASCOTAS, TEMA_COCINA] },
  { id: "bt6", frag: "Hoy horneamos galletas y les pusimos una pizca de sal: hace que el chocolate sepa más dulce.", answer: TEMA_COCINA, options: [TEMA_COCINA, TEMA_AVENTURAS, TEMA_TECNO] },
  { id: "bt7", frag: "Llevé brújula, linterna y mapa: en la selva es muy fácil perder el camino.", answer: TEMA_AVENTURAS, options: [TEMA_AVENTURAS, TEMA_DEPORTES, TEMA_MASCOTAS] },
  { id: "bt8", frag: "Si tu gato duerme casi todo el día, es normal: descansa hasta 16 horas y busca rincones calientes.", answer: TEMA_MASCOTAS, options: [TEMA_MASCOTAS, TEMA_COCINA, TEMA_TECNO] },
  { id: "bt9", frag: "Apaga el wifi por la noche y tu celular gastará mucha menos batería.", answer: TEMA_TECNO, options: [TEMA_TECNO, TEMA_DEPORTES, TEMA_AVENTURAS] },
  { id: "bt10", frag: "Estirar antes de correr evita molestias y te ayuda a rendir mucho mejor.", answer: TEMA_DEPORTES, options: [TEMA_DEPORTES, TEMA_COCINA, TEMA_MASCOTAS] },
];

// R3 — Construye el título (laboratorio): unir un GANCHO llamativo con el
// TEMA que combina con el blog. El gancho correcto engancha; el tema
// correcto coincide con el asunto del blog. Título = gancho + " " + tema.
const BLOG_LAB = [
  { id: "lab1", sujeto: "cuidar el planeta 🌍",
    ganchos: [{ id: "g", t: "¡Trucos fáciles para", ok: true }, { id: "x1", t: "Cosas sobre", ok: false }, { id: "x2", t: "Apuntes de", ok: false }],
    temas: [{ id: "t", t: "salvar el planeta!", ok: true }, { id: "y1", t: "hacer galletas!", ok: false }, { id: "y2", t: "entrenar perros!", ok: false }] },
  { id: "lab2", sujeto: "recetas de cocina 🍳",
    ganchos: [{ id: "g", t: "¡Aprende a", ok: true }, { id: "x1", t: "Información de", ok: false }, { id: "x2", t: "Datos sobre", ok: false }],
    temas: [{ id: "t", t: "cocinar como chef!", ok: true }, { id: "y1", t: "viajar barato!", ok: false }, { id: "y2", t: "cuidar plantas!", ok: false }] },
  { id: "lab3", sujeto: "aventuras de viaje ⛰️",
    ganchos: [{ id: "g", t: "¡Vive la aventura de", ok: true }, { id: "x1", t: "Texto sobre", ok: false }, { id: "x2", t: "Resumen de", ok: false }],
    temas: [{ id: "t", t: "explorar montañas!", ok: true }, { id: "y1", t: "tejer bufandas!", ok: false }, { id: "y2", t: "armar robots!", ok: false }] },
  { id: "lab4", sujeto: "cuidado de mascotas 🐶",
    ganchos: [{ id: "g", t: "¡Todo para consentir a", ok: true }, { id: "x1", t: "Cosas de", ok: false }, { id: "x2", t: "Notas sobre", ok: false }],
    temas: [{ id: "t", t: "tu mascota feliz!", ok: true }, { id: "y1", t: "tu auto nuevo!", ok: false }, { id: "y2", t: "tus tareas!", ok: false }] },
  { id: "lab5", sujeto: "tecnología 💻",
    ganchos: [{ id: "g", t: "¡Descubre cómo usar", ok: true }, { id: "x1", t: "Documento de", ok: false }, { id: "x2", t: "Lista de", ok: false }],
    temas: [{ id: "t", t: "la tecnología sin miedo!", ok: true }, { id: "y1", t: "las plantas del jardín!", ok: false }, { id: "y2", t: "los postres caseros!", ok: false }] },
  { id: "lab6", sujeto: "deportes ⚽",
    ganchos: [{ id: "g", t: "¡Ponte en forma con", ok: true }, { id: "x1", t: "Reporte de", ok: false }, { id: "x2", t: "Archivo de", ok: false }],
    temas: [{ id: "t", t: "los mejores deportes!", ok: true }, { id: "y1", t: "las recetas dulces!", ok: false }, { id: "y2", t: "los cuentos de hadas!", ok: false }] },
];

// TitleLab — laboratorio de títulos con ARRASTRE: dos ranuras (comienzo +
// tema) donde se sueltan las piezas; también funciona con toque. Al
// verificar marca cada ranura verde/roja (§11) y muestra la correcta.
function TitleLab({ set, ganchoOpts, temaOpts, gancho, tema, setGancho, setTema, locked }) {
  const ghost = (txt) => `<div style="background:linear-gradient(180deg,#fce9a8,#e9c45a);color:#3a2608;padding:9px 14px;border-radius:12px;font-family:Fredoka,Nunito,sans-serif;font-weight:800;font-size:14px;border:2px solid #4fd8ff;box-shadow:0 8px 20px rgba(0,0,0,0.5);max-width:230px;text-align:center;">${txt}</div>`;

  // Soltar en una ranura coloca/reemplaza; soltar en la bandeja quita la
  // pieza (solo si estaba colocada). Funciona también con toque.
  function place(zoneId, item) {
    if (locked) return;
    if (zoneId === "z-gancho" && item.kind === "g") setGancho(item.opt);
    else if (zoneId === "z-tema" && item.kind === "t") setTema(item.opt);
    else if (zoneId === "z-tray") {
      if (item.kind === "g" && gancho === item.opt) setGancho(null);
      else if (item.kind === "t" && tema === item.opt) setTema(null);
    }
  }
  function tap(item) {
    if (locked) return;
    if (item.kind === "g") setGancho((c) => (c === item.opt ? null : item.opt));
    else setTema((c) => (c === item.opt ? null : item.opt));
  }

  // Pieza arrastrable (sirve igual en la bandeja o dentro de una ranura).
  const chipNode = (kind, opt, inSlot) => {
    const col = kind === "g" ? "#e0a23a" : "#e4881a";
    let bg = "rgba(255,255,255,0.95)", border = col, ink = "#3a2608", mark = "";
    if (locked && inSlot && opt.ok) { bg = "linear-gradient(180deg,#2ecc8f,#22a06c)"; border = "#2ecc8f"; ink = "#fff"; mark = "✓ "; }
    else if (locked && inSlot && !opt.ok) { bg = "linear-gradient(180deg,#ff6b6b,#dc5050)"; border = "#ff6b6b"; ink = "#fff"; mark = "✗ "; }
    return (
      <div key={kind + opt.id + (inSlot ? "-s" : "")}
        className={locked ? "" : "ed-draggable"}
        onPointerDown={locked ? undefined : makeDragHandler({
          item: { kind, opt }, disabled: locked, ghostHtml: ghost(opt.t),
          onTap: tap, onDrop: place,
        })}
        style={{
          padding: "9px 13px", borderRadius: 12, maxWidth: 220, textAlign: "center",
          background: bg, color: ink, border: `2px solid ${border}`, boxShadow: "0 3px 8px rgba(0,0,0,0.25)",
          fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 14.5, lineHeight: 1.15,
          userSelect: "none", WebkitUserSelect: "none", cursor: locked ? "default" : "grab",
        }}>
        {mark}{opt.t}
      </div>
    );
  };

  const slot = (kind) => {
    const sel = kind === "g" ? gancho : tema;
    const baseBorder = kind === "g" ? "#e0a23a" : "#e4881a";
    const correct = locked && (!sel || !sel.ok) ? (kind === "g" ? set.ganchos : set.temas).find((o) => o.ok) : null;
    return (
      <div data-dropzone={kind === "g" ? "z-gancho" : "z-tema"}
        style={{
          minWidth: 185, maxWidth: 240, minHeight: 58, padding: "6px 10px", borderRadius: 12,
          border: `2.5px dashed ${baseBorder}`, background: "rgba(10,6,35,0.35)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
        }}>
        {sel ? chipNode(kind, sel, true) : (
          <span style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 13.5, color: "rgba(252,233,168,0.5)", textAlign: "center", pointerEvents: "none", userSelect: "none" }}>
            {kind === "g" ? "arrastra el comienzo" : "arrastra el tema"}
          </span>
        )}
        {correct && (
          <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 11, color: "#7dffc4", lineHeight: 1.1, textAlign: "center", pointerEvents: "none" }}>✓ {correct.t}</div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Título en construcción: 2 ranuras (se sueltan aquí las piezas) */}
      <div style={{ display: "flex", gap: 10, justifyContent: "center", alignItems: "stretch", flexWrap: "wrap" }}>
        {slot("g")}
        {slot("t")}
      </div>
      {/* Bandeja de piezas — soltar aquí una pieza colocada la devuelve */}
      <div data-dropzone="z-tray" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, width: "100%" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div className="ed-label" style={{ color: "rgba(255,255,255,0.7)" }}>Elige el comienzo</div>
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap", justifyContent: "center", maxWidth: 540, minHeight: 50, alignItems: "center" }}>
            {ganchoOpts.map((opt) => (gancho === opt ? null : chipNode("g", opt, false)))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div className="ed-label" style={{ color: "rgba(255,255,255,0.7)" }}>Elige el tema</div>
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap", justifyContent: "center", maxWidth: 540, minHeight: 50, alignItems: "center" }}>
            {temaOpts.map((opt) => (tema === opt ? null : chipNode("t", opt, false)))}
          </div>
        </div>
      </div>
    </>
  );
}

function BlogGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "El blog";

  const [ronda, setRonda] = useStateG(0);
  // R1 — ordenar partes del blog
  const [r1Set] = useStateG(() => pickFresh(BLOG_PARTES, "b1"));
  const r1Items = r1Set.parts;
  const r1ById = useMemoG(() => { const m = {}; r1Items.forEach((c) => { m[c.id] = c; }); return m; }, [r1Set]);
  const [r1Slots, setR1Slots] = useStateG(() => r1Items.map(() => null));
  const [r1Locked, setR1Locked] = useStateG(false);
  // R2 — detective de blogs (tema)
  const [r2Pick] = useStateG(() => pickFresh(BLOG_TEMAS, "b2"));
  const [r2Opts] = useStateG(() => shuffle(r2Pick.options));
  const [r2Choice, setR2Choice] = useStateG(null);
  const [r2Locked, setR2Locked] = useStateG(false);
  // R3 — construye el título (gancho + tema)
  const [r3Set] = useStateG(() => pickFresh(BLOG_LAB, "b3"));
  const [r3GanchoOpts] = useStateG(() => shuffle(r3Set.ganchos));
  const [r3TemaOpts] = useStateG(() => shuffle(r3Set.temas));
  const [r3Gancho, setR3Gancho] = useStateG(null);
  const [r3Tema, setR3Tema] = useStateG(null);
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
  // consultan y abortan al desmontar (SALIR/REINICIAR/cambio de tema) para no
  // disparar navegación/estado sobre una sesión que ya no existe.
  const aliveRef = useRefG(true);

  useEffectG(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started.current) / 1000)), 500);
    return () => { clearInterval(id); aliveRef.current = false; };
  }, []);

  // R2 (identificar el tema del blog) se AUTO-EVALÚA: al tocar una opción se
  // resalta y, tras una breve ventana para recapacitar (~700 ms), se califica
  // sola. Por eso su VERIFICAR se oculta y su canVerify queda en false.
  const r2AutoRef = useRefG(null);
  useEffectG(() => () => clearTimeout(r2AutoRef.current), []);

  const answer = makeAnswer({
    attempted, solved, stars, starsSession, log, elapsed, catLabel,
    exerciseStart, setApp, go, aliveRef,
    setFeedback, setFeedbackMsg, setAttempted, setSolved, setStars, setStarsSession, setLog,
    onNextRound: () => setRonda((r) => r + 1),
  });

  const canVerify =
    feedback ? false :
    ronda === 0 ? (r1Slots.every(Boolean) && !r1Locked) :
    ronda === 1 ? false :
    ronda === 2 ? (r3Gancho !== null && r3Tema !== null && !r3Locked) : false;

  // Califica la R2 con la opción tocada (misma rama que tenía VERIFICAR).
  function gradeR2(choice) {
    if (r2Locked) return;
    setR2Locked(true);
    const correct = choice === r2Pick.answer;
    setTimeout(() => answer(correct, choice, r2Pick.answer, "🕵️", "Detective de blogs"), correct ? 450 : 1500);
  }

  function handleVerify() {
    if (!canVerify) return;
    if (ronda === 0) {
      setR1Locked(true);
      const correct = r1Slots.every((id, i) => r1ById[id] && r1ById[id].n === i + 1);
      const u = r1Slots.map((id, i) => `${BLOG_SLOT_LABELS[i]}: ${r1ById[id] ? r1ById[id].label : "?"}`).join(" · ");
      const c = r1Items.slice().sort((a, b) => a.n - b.n).map((it, i) => `${BLOG_SLOT_LABELS[i]}: ${it.label}`).join(" · ");
      setTimeout(() => answer(correct, u, c, "🧩", "Arma tu blog"), correct ? 450 : 1500);
    } else if (ronda === 2) {
      setR3Locked(true);
      const correct = !!(r3Gancho && r3Gancho.ok && r3Tema && r3Tema.ok);
      const u = `${r3Gancho ? r3Gancho.t : "?"} ${r3Tema ? r3Tema.t : "?"}`;
      const okG = r3Set.ganchos.find((g) => g.ok), okT = r3Set.temas.find((t) => t.ok);
      const c = `${okG.t} ${okT.t}`;
      setTimeout(() => answer(correct, u, c, "✨", "Construye el título"), correct ? 450 : 1500);
    }
  }

  function handleErase() {
    if (ronda === 0 && !r1Locked) setR1Slots(r1Items.map(() => null));
    else if (ronda === 2 && !r3Locked) { setR3Gancho(null); setR3Tema(null); }
  }

  const enunciado =
    ronda === 0 ? "Arrastra cada parte a su lugar en el blog." :
    ronda === 1 ? "Lee la entrada y descubre el tema del blog." :
    "Arma un título llamativo para el blog.";
  const bocadillo =
    ronda === 0 ? "Arma el blog de arriba\nhacia abajo, en orden." :
    ronda === 1 ? "Busca las pistas en lo\nque cuenta el autor." :
    "Une un comienzo llamativo\ncon el tema del blog.";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <GameHUD elapsed={elapsed} stars={stars} attempted={attempted} solved={solved} total={3} app={app} setApp={setApp} />
      <CharacterCorner char={char} message={bocadillo} />

      {/* R1 — Arma tu blog (ordenar) */}
      {ronda === 0 && (
        <div data-qa="zona-central" style={{
          position: "absolute", top: 74, bottom: 14, left: "50%", transform: "translateX(-50%)",
          width: 580, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
        }}>
          <EnunciadoInline text={enunciado} />
          <OrderRound items={r1Items} byId={r1ById} slots={r1Slots} setSlots={setR1Slots}
            locked={r1Locked} accent="#e0a23a" ink="#3a2608" slotW={300} prefix="b1"
            slotLabels={BLOG_SLOT_LABELS} slotPlaceholders={BLOG_SLOT_PLACEHOLDERS} />
        </div>
      )}

      {/* R2 — Detective de blogs (identificar tema) */}
      {ronda === 1 && (
        <div data-qa="zona-central" style={{
          position: "absolute", top: 74, bottom: 14, left: "50%", transform: "translateX(-50%)",
          width: 560, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
        }}>
          <EnunciadoInline text={enunciado} />
          <div style={{ position: "relative", width: "fit-content", maxWidth: 460 }}>
            <div style={{ position: "absolute", top: -16, right: -12, fontSize: 30, transform: "rotate(8deg)", filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.4))" }}>🔍</div>
            <Cartel maxWidth={430} fontSize={16} pad="14px 22px">{r2Pick.frag}</Cartel>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", maxWidth: 520 }}>
            {r2Opts.map((opt, i) => (
              <OptionButton key={opt} label={opt} locked={r2Locked}
                isCorrect={opt === r2Pick.answer} isPicked={r2Choice === opt}
                onClick={() => {
                  if (r2Locked) return;
                  setR2Choice(opt);
                  // Resalta y, si no cambia de idea en ~700 ms, califica sola.
                  clearTimeout(r2AutoRef.current);
                  r2AutoRef.current = setTimeout(() => gradeR2(opt), 700);
                }}
                minWidth={150} color={["#4fa0ff", "#e0a23a", "#2ecc8f"][i % 3]} />
            ))}
          </div>
        </div>
      )}

      {/* R3 — Construye el título (arrastra comienzo + tema) */}
      {ronda === 2 && (
        <div data-qa="zona-central" style={{
          position: "absolute", top: 74, bottom: 14, left: "50%", transform: "translateX(-50%)",
          width: 580, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
        }}>
          <EnunciadoInline text={enunciado} />

          {/* Asunto del blog */}
          <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 14, color: "#fce9a8", textShadow: "0 2px 6px rgba(0,0,0,0.6)" }}>
            Este blog trata sobre: <span style={{ color: "#fff" }}>{r3Set.sujeto}</span>
          </div>

          <TitleLab set={r3Set} ganchoOpts={r3GanchoOpts} temaOpts={r3TemaOpts}
            gancho={r3Gancho} tema={r3Tema} setGancho={setR3Gancho} setTema={setR3Tema} locked={r3Locked} />
        </div>
      )}

      <ActionRail
        canVerify={canVerify} onVerify={handleVerify}
        hideVerify={ronda === 1}
        showErase={ronda !== 1} onErase={handleErase}
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
// NIVEL 2 — LA ENTREVISTA (14 años): 3 rondas distintas
// ═════════════════════════════════════════════════════════════

// R1 — ¿Abierta o cerrada? (clasificar el tipo de pregunta).
const ENT_PREGUNTAS = [
  { id: "p1", frag: "¿Qué fue lo más difícil de prepararte para este viaje?", answer: "ABIERTA" },
  { id: "p2", frag: "¿Cómo te sentiste al ganar tu primera medalla?", answer: "ABIERTA" },
  { id: "p3", frag: "¿Qué consejo le darías a quien apenas empieza en esto?", answer: "ABIERTA" },
  { id: "p4", frag: "¿Por qué decidiste dedicarte a la música?", answer: "ABIERTA" },
  { id: "p5", frag: "¿Cómo era tu vida antes de volverte conocida?", answer: "ABIERTA" },
  { id: "p6", frag: "¿Qué significó para ti ese momento tan especial?", answer: "ABIERTA" },
  { id: "p7", frag: "¿Naciste en Quito?", answer: "CERRADA" },
  { id: "p8", frag: "¿Tienes hermanos?", answer: "CERRADA" },
  { id: "p9", frag: "¿Te gusta el chocolate?", answer: "CERRADA" },
  { id: "p10", frag: "¿Eres el campeón actual?", answer: "CERRADA" },
  { id: "p11", frag: "¿Vives en Ecuador?", answer: "CERRADA" },
  { id: "p12", frag: "¿Practicas todos los días?", answer: "CERRADA" },
];

// R2 — Detective de entrevistas (perfil / noticias / opinión).
const TIPO_PERFIL = "👤 De perfil";
const TIPO_NOTICIAS = "📰 De noticias";
const TIPO_OPINION = "💭 De opinión";
const ENT_TIPOS = [
  { id: "e1", frag: "—¿Cómo era usted de niña?\n—Tímida, pero siempre con un cuaderno bajo el brazo.", answer: TIPO_PERFIL, options: [TIPO_PERFIL, TIPO_NOTICIAS, TIPO_OPINION] },
  { id: "e2", frag: "—¿Quién influyó en su carrera?\n—Mi abuela; ella me enseñó a contar historias.", answer: TIPO_PERFIL, options: [TIPO_PERFIL, TIPO_OPINION, TIPO_NOTICIAS] },
  { id: "e3", frag: "—¿Cómo empezó todo para usted?\n—De pequeño armaba radios con piezas viejas.", answer: TIPO_PERFIL, options: [TIPO_PERFIL, TIPO_NOTICIAS, TIPO_OPINION] },
  { id: "e4", frag: "—¿Qué ocurrió anoche en el estadio?\n—Ganamos en el último minuto, fue increíble.", answer: TIPO_NOTICIAS, options: [TIPO_NOTICIAS, TIPO_PERFIL, TIPO_OPINION] },
  { id: "e5", frag: "—¿Cuándo se inaugura el nuevo parque?\n—Este sábado, abierto para toda la ciudad.", answer: TIPO_NOTICIAS, options: [TIPO_NOTICIAS, TIPO_OPINION, TIPO_PERFIL] },
  { id: "e6", frag: "—¿Qué pasó tras el temblor de hoy?\n—Revisamos las casas; por suerte no hubo heridos.", answer: TIPO_NOTICIAS, options: [TIPO_NOTICIAS, TIPO_PERFIL, TIPO_OPINION] },
  { id: "e7", frag: "—¿Qué opina sobre leer en pantallas?\n—Creo que la pantalla cansa más que el papel.", answer: TIPO_OPINION, options: [TIPO_OPINION, TIPO_NOTICIAS, TIPO_PERFIL] },
  { id: "e8", frag: "—¿Le parece bien la nueva regla?\n—Pienso que ayuda, aunque todavía podría mejorar.", answer: TIPO_OPINION, options: [TIPO_OPINION, TIPO_PERFIL, TIPO_NOTICIAS] },
  { id: "e9", frag: "—¿Qué cree sobre estudiar a distancia?\n—Para mí, puede funcionar si hay disciplina.", answer: TIPO_OPINION, options: [TIPO_OPINION, TIPO_NOTICIAS, TIPO_PERFIL] },
];

// R3 — Arma la entrevista (ordenar los 5 momentos). Banco de
// entrevistados originales (FIFO).
const ENT_MOMENTOS = [
  { id: "deportista", parts: [
    { id: "d1", n: 1, label: "Hola, gracias por recibirnos." },
    { id: "d2", n: 2, label: "Para empezar, ¿qué deporte haces?" },
    { id: "d3", n: 3, label: "¿Cómo es un día de entrenamiento?" },
    { id: "d4", n: 4, label: "Cuéntame más sobre tu mejor logro." },
    { id: "d5", n: 5, label: "¡Gracias y mucho éxito!" },
  ] },
  { id: "cientifica", parts: [
    { id: "c1", n: 1, label: "Buenos días, doctora." },
    { id: "c2", n: 2, label: "Para empezar, ¿qué estudia usted?" },
    { id: "c3", n: 3, label: "¿Cómo es su trabajo de campo?" },
    { id: "c4", n: 4, label: "Cuénteme más sobre un día difícil." },
    { id: "c5", n: 5, label: "Gracias por enseñarnos tanto." },
  ] },
  { id: "youtuber", parts: [
    { id: "y1", n: 1, label: "¡Hola! Qué gusto tenerte aquí." },
    { id: "y2", n: 2, label: "Para empezar, ¿cómo creaste tu canal?" },
    { id: "y3", n: 3, label: "¿Cómo preparas cada video?" },
    { id: "y4", n: 4, label: "Cuéntame más sobre tu mayor reto." },
    { id: "y5", n: 5, label: "¡Gracias y sigue creando!" },
  ] },
  { id: "musico", parts: [
    { id: "m1", n: 1, label: "Bienvenido, gracias por venir." },
    { id: "m2", n: 2, label: "Para empezar, ¿cómo iniciaste?" },
    { id: "m3", n: 3, label: "¿Cómo compones tus canciones?" },
    { id: "m4", n: 4, label: "Cuéntame más de tu mejor concierto." },
    { id: "m5", n: 5, label: "¡Gracias y éxito con tu disco!" },
  ] },
];
const ENT_SLOT_LABELS = ["Saludo", "Apertura", "Centrales", "Seguimiento", "Cierre"];
const ENT_SLOT_PLACEHOLDERS = [
  "Suelta aquí el saludo",
  "Suelta aquí la apertura",
  "Suelta aquí las preguntas centrales",
  "Suelta aquí el seguimiento",
  "Suelta aquí el cierre",
];

function EntrevistaGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "La entrevista";

  const [ronda, setRonda] = useStateG(0);
  // R1 — abierta o cerrada
  const [r1Pick] = useStateG(() => pickFresh(ENT_PREGUNTAS, "e1"));
  const [r1Choice, setR1Choice] = useStateG(null);
  const [r1Locked, setR1Locked] = useStateG(false);
  // R2 — tipo de entrevista
  const [r2Pick] = useStateG(() => pickFresh(ENT_TIPOS, "e2"));
  const [r2Opts] = useStateG(() => shuffle(r2Pick.options));
  const [r2Choice, setR2Choice] = useStateG(null);
  const [r2Locked, setR2Locked] = useStateG(false);
  // R3 — ordenar momentos
  const [r3Set] = useStateG(() => pickFresh(ENT_MOMENTOS, "e3"));
  const r3Items = r3Set.parts;
  const r3ById = useMemoG(() => { const m = {}; r3Items.forEach((c) => { m[c.id] = c; }); return m; }, [r3Set]);
  const [r3Slots, setR3Slots] = useStateG(() => r3Items.map(() => null));
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
  // consultan y abortan al desmontar (SALIR/REINICIAR/cambio de tema) para no
  // disparar navegación/estado sobre una sesión que ya no existe.
  const aliveRef = useRefG(true);

  useEffectG(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started.current) / 1000)), 500);
    return () => { clearInterval(id); aliveRef.current = false; };
  }, []);

  // R1 (clasificar abierta/cerrada) y R2 (identificar el tipo de entrevista)
  // se AUTO-EVALÚAN: al tocar una opción se resalta y, tras una breve ventana
  // (~700 ms), se califica sola. Por eso su VERIFICAR se oculta y canVerify
  // queda en false en esas rondas.
  const r1AutoRef = useRefG(null);
  const r2AutoRef = useRefG(null);
  useEffectG(() => () => { clearTimeout(r1AutoRef.current); clearTimeout(r2AutoRef.current); }, []);

  const answer = makeAnswer({
    attempted, solved, stars, starsSession, log, elapsed, catLabel,
    exerciseStart, setApp, go, aliveRef,
    setFeedback, setFeedbackMsg, setAttempted, setSolved, setStars, setStarsSession, setLog,
    onNextRound: () => setRonda((r) => r + 1),
  });

  const canVerify =
    feedback ? false :
    ronda === 0 ? false :
    ronda === 1 ? false :
    ronda === 2 ? (r3Slots.every(Boolean) && !r3Locked) : false;

  // Califican con la opción tocada (mismas ramas que tenía VERIFICAR).
  function gradeR1(choice) {
    if (r1Locked) return;
    setR1Locked(true);
    const correct = choice === r1Pick.answer;
    setTimeout(() => answer(correct, choice, r1Pick.answer, "🎤", "¿Abierta o cerrada?"), correct ? 450 : 1500);
  }
  function gradeR2(choice) {
    if (r2Locked) return;
    setR2Locked(true);
    const correct = choice === r2Pick.answer;
    setTimeout(() => answer(correct, choice, r2Pick.answer, "🕵️", "Detective de entrevistas"), correct ? 450 : 1500);
  }

  function handleVerify() {
    if (!canVerify) return;
    if (ronda === 2) {
      setR3Locked(true);
      const correct = r3Slots.every((id, i) => r3ById[id] && r3ById[id].n === i + 1);
      const u = r3Slots.map((id, i) => `${i + 1}. ${r3ById[id] ? r3ById[id].label : "?"}`).join(" · ");
      const c = r3Items.slice().sort((a, b) => a.n - b.n).map((it) => `${it.n}. ${it.label}`).join(" · ");
      setTimeout(() => answer(correct, u, c, "🧩", "Arma la entrevista"), correct ? 450 : 1500);
    }
  }

  function handleErase() {
    if (ronda === 2 && !r3Locked) setR3Slots(r3Items.map(() => null));
  }

  const enunciado =
    ronda === 0 ? "Decide si la pregunta es abierta o cerrada." :
    ronda === 1 ? "Lee el fragmento y descubre el tipo de entrevista." :
    "Ordena los momentos de la entrevista.";
  const bocadillo =
    ronda === 0 ? "Lee cada pregunta\ny toca su tipo." :
    ronda === 1 ? "Lee la respuesta y toca\nel tipo correcto." :
    "Empieza presentándote\ny termina agradeciendo.";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <GameHUD elapsed={elapsed} stars={stars} attempted={attempted} solved={solved} total={3} app={app} setApp={setApp} />
      <CharacterCorner char={char} message={bocadillo} />

      {/* R1 — ¿Abierta o cerrada? */}
      {ronda === 0 && (
        <div data-qa="zona-central" style={{
          position: "absolute", top: 74, bottom: 14, left: "50%", transform: "translateX(-50%)",
          width: 560, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
        }}>
          <EnunciadoInline text={enunciado} />
          <div style={{ position: "relative", width: "fit-content", maxWidth: 460 }}>
            <div style={{ position: "absolute", top: -16, right: -12, fontSize: 30, transform: "rotate(8deg)", filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.4))" }}>🎤</div>
            <Cartel maxWidth={430} fontSize={18} pad="16px 24px">{r1Pick.frag}</Cartel>
          </div>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", alignItems: "center" }}>
            <OptionButton label="ABIERTA" locked={r1Locked}
              isCorrect={r1Pick.answer === "ABIERTA"} isPicked={r1Choice === "ABIERTA"}
              onClick={() => {
                if (r1Locked) return;
                setR1Choice("ABIERTA");
                clearTimeout(r1AutoRef.current);
                r1AutoRef.current = setTimeout(() => gradeR1("ABIERTA"), 700);
              }} color="#2ecc8f" minWidth={150} />
            <OptionButton label="CERRADA" locked={r1Locked}
              isCorrect={r1Pick.answer === "CERRADA"} isPicked={r1Choice === "CERRADA"}
              onClick={() => {
                if (r1Locked) return;
                setR1Choice("CERRADA");
                clearTimeout(r1AutoRef.current);
                r1AutoRef.current = setTimeout(() => gradeR1("CERRADA"), 700);
              }} color="#ef5a5a" minWidth={150} />
          </div>
        </div>
      )}

      {/* R2 — Detective de entrevistas (identificar tipo) */}
      {ronda === 1 && (
        <div data-qa="zona-central" style={{
          position: "absolute", top: 74, bottom: 14, left: "50%", transform: "translateX(-50%)",
          width: 560, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
        }}>
          <EnunciadoInline text={enunciado} />
          <div style={{ position: "relative", width: "fit-content", maxWidth: 460 }}>
            <div style={{ position: "absolute", top: -16, right: -12, fontSize: 30, transform: "rotate(8deg)", filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.4))" }}>🔍</div>
            <Cartel maxWidth={430} fontSize={16} pad="14px 22px">{r2Pick.frag}</Cartel>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", maxWidth: 520 }}>
            {r2Opts.map((opt, i) => (
              <OptionButton key={opt} label={opt} locked={r2Locked}
                isCorrect={opt === r2Pick.answer} isPicked={r2Choice === opt}
                onClick={() => {
                  if (r2Locked) return;
                  setR2Choice(opt);
                  clearTimeout(r2AutoRef.current);
                  r2AutoRef.current = setTimeout(() => gradeR2(opt), 700);
                }}
                minWidth={150} color={["#4fa0ff", "#e0a23a", "#a78bfa"][i % 3]} />
            ))}
          </div>
        </div>
      )}

      {/* R3 — Arma la entrevista (ordenar) */}
      {ronda === 2 && (
        <div data-qa="zona-central" style={{
          position: "absolute", top: 74, bottom: 14, left: "50%", transform: "translateX(-50%)",
          width: 600, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
        }}>
          <EnunciadoInline text={enunciado} />
          <OrderRound items={r3Items} byId={r3ById} slots={r3Slots} setSlots={setR3Slots}
            locked={r3Locked} accent="#e4881a" ink="#3a2608" slotW={320} prefix="e3"
            slotLabels={ENT_SLOT_LABELS} slotPlaceholders={ENT_SLOT_PLACEHOLDERS} />
        </div>
      )}

      <ActionRail
        canVerify={canVerify} onVerify={handleVerify}
        hideVerify={ronda === 0 || ronda === 1}
        showErase={ronda === 2} onErase={handleErase}
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
  if (app.level === "entrevista") return <EntrevistaGame key={`e-${tick}`} app={app} setApp={setApp} go={go} onRestart={restart} />;
  return <BlogGame key={`b-${tick}`} app={app} setApp={setApp} go={go} onRestart={restart} />;
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
  const res = app.lastResult || { category: "El blog", solved: 0, total: 3, time: 0, starsEarned: 0, log: [] };
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
