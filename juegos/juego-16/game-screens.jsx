// game-screens.jsx — GameScreen + ResultsScreen para "Historias y misterios".
// Juego de 3 niveles por tema/edad, cada uno con 3 rondas DISTINTAS (estándar 7+):
//   • RELATOS (10 años) — el relato histórico.
//       R1 Verdadero o falso · R2 Laboratorio del relato · R3 Une causa y efecto.
//   • HERRAMIENTAS (10 años) — herramientas del escritor.
//       R1 Atrapa la interjección (shooter) · R2 Ruleta de conectores · R3 El deseo (subjuntivo).
//   • DETECTIVES (13 años) — la narrativa policial.
//       R1 Resuelve el enigma (inferencias) · R2 El expediente del caso · R3 La lupa del detective.
//
// GameScreen enruta por app.level. El shell (HUD, personaje §1, enunciado,
// action rail, modales, feedback, reporte, scoring por tiempo) se hereda del
// estándar. ResultsScreen es genérica (Reto / Tu respuesta / Correcta).

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

// Drag+tap con PointerEvents (funciona en táctil; mismo patrón que juego-14).
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
  "¡Casi! Sigue investigando.",
  "Cada pista cuenta 🔍",
  "¡La próxima la resuelves!",
  "Equivocarse también es aprender.",
  "Un buen detective insiste.",
  "¡Vamos a la siguiente!",
  "Cada intento te acerca a la verdad.",
];

// ═════════════════════════════════════════════════════════════
// SHELL COMPARTIDO
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
  const currentId = (app && (app.currentCategory || app.level)) || "relatos";
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

      {/* Pestañas de tema: tema actual resaltado, tocar otro pide confirmación. */}
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
        position: "absolute", top: 84, left: "50%", transform: "translateX(-50%)",
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

// Cartel del ejercicio (texto variable, §8 fit-content).
function Cartel({ text, maxWidth = 460, fontSize = 16 }) {
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

// Cartel con hueco inline (para conectores y subjuntivo).
function BlankCartel({ before, value, after, fontSize = 17, maxWidth = 412 }) {
  return (
    <div style={{
      width: "fit-content", maxWidth, padding: "14px 22px", borderRadius: 16,
      background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(244,238,228,0.92))",
      border: "3px solid #f2c260", boxShadow: "0 12px 28px rgba(0,0,0,0.4), inset 0 -4px 0 rgba(0,0,0,0.06)",
      fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize, lineHeight: 1.5,
      color: "#3a2608", textAlign: "center",
    }}>
      <span>{before} </span>
      <span style={{
        display: "inline-block", minWidth: 92, padding: "2px 12px", borderRadius: 10,
        verticalAlign: "middle",
        borderBottom: value ? "none" : "3px solid #d9a441",
        background: value ? "linear-gradient(180deg,#fce9a8,#e9c45a)" : "transparent",
        color: "#3a2608", fontWeight: 800,
        boxShadow: value ? "0 3px 8px rgba(0,0,0,0.2)" : "none",
      }}>{value || "______"}</span>
      <span> {after}</span>
    </div>
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
        fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 17, letterSpacing: "0.02em",
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

// Ruleta animada — gira y se detiene (teatral).
function Ruleta({ rotation, spinning, sectors }) {
  const segs = sectors || ["⏱", "➡", "↔", "🔗", "✦", "↺"];
  const n = segs.length, seg = 360 / n;
  const cols = ["#6a4fc0", "#3a2a78"];
  const stops = segs.map((_, i) => `${cols[i % 2]} ${i * seg}deg ${(i + 1) * seg}deg`).join(", ");
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
        {segs.map((s, i) => (
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

// ─────────────────────────────────────────────────────────────
// FIFO anti-repetición (compartido, prefijo por ronda).
// ─────────────────────────────────────────────────────────────
const RECENT_KEY = "edinun_hym_recientes_v1";
const RECENT_LIMIT = 90;
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

// ═════════════════════════════════════════════════════════════
// NIVEL 1 — RELATOS HISTÓRICOS (10 años): 3 rondas distintas
//   R1 verdadero/falso · R2 laboratorio del relato · R3 une causa-efecto
// ═════════════════════════════════════════════════════════════
const R1_VF = [
  { id: "v1", text: "El relato histórico cuenta hechos que pasaron de verdad.", verdadero: true },
  { id: "v2", text: "El historiador puede inventar los hechos que cuenta.", verdadero: false },
  { id: "v3", text: "Un relato histórico se escribe en prosa.", verdadero: true },
  { id: "v4", text: "El relato histórico ordena los sucesos en el tiempo.", verdadero: true },
  { id: "v5", text: "Un cuento de hadas es un relato histórico.", verdadero: false },
  { id: "v6", text: "El relato histórico habla del pasado.", verdadero: true },
  { id: "v7", text: "Un relato histórico no necesita ninguna fuente.", verdadero: false },
  { id: "v8", text: "El historiador investiga en archivos y libros.", verdadero: true },
  { id: "v9", text: "El relato histórico puede explicar la causa de un suceso.", verdadero: true },
  { id: "v10", text: "En un relato histórico todo es pura imaginación.", verdadero: false },
  { id: "v11", text: "El relato histórico se apoya en documentos y testimonios.", verdadero: true },
  { id: "v12", text: "Los versos que riman son relatos históricos.", verdadero: false },
];

// R2 — Laboratorio: ¿Quién? + ¿Qué hizo? + ¿Cuándo? = relato histórico real.
// Cada caso trae 3 piezas reales + 2 fantasiosas (trampa) que NO deben usarse.
const R2_LAB_SLOTCAT = ["quien", "quehizo", "cuando"];
const R2_LAB_LABEL = { quien: "¿QUIÉN?", quehizo: "¿QUÉ HIZO?", cuando: "¿CUÁNDO?" };
const R2_LAB = [
  { id: "lab1", quien: "Los primeros navegantes", quehizo: "llegaron a estas costas", cuando: "hace muchos siglos", traps: ["en una nave espacial", "en el año 3000"] },
  { id: "lab2", quien: "Un grupo de patriotas", quehizo: "luchó por la independencia", cuando: "en el siglo XIX", traps: ["volando con alas mágicas", "dentro de mil años"] },
  { id: "lab3", quien: "Una sabia investigadora", quehizo: "estudió las estrellas", cuando: "hace mucho tiempo", traps: ["con una varita mágica", "el próximo verano"] },
  { id: "lab4", quien: "Un antiguo pueblo", quehizo: "construyó grandes templos", cuando: "en épocas remotas", traps: ["con ayuda de gigantes", "mañana por la tarde"] },
  { id: "lab5", quien: "Una valiente exploradora", quehizo: "cruzó montañas y ríos", cuando: "siglos atrás", traps: ["montada en un dinosaurio", "en el futuro lejano"] },
  { id: "lab6", quien: "Un músico talentoso", quehizo: "compuso bellas melodías", cuando: "hace doscientos años", traps: ["con poderes secretos", "el siglo que viene"] },
];

// R3 — Une causa y efecto: cada set tiene 3 pares INDEPENDIENTES (temas
// distintos dentro de la ronda). Cada efecto se ata a una sola causa por un
// pronombre o referencia ("lo", "ella", "ese...") para que no haya ambigüedad:
// una causa NO debe pegar lógicamente con varios efectos del tablero.
const R3_SETS = [
  { id: "viaje", pairs: [
    { c: "Un mapa mostraba una isla lejana", e: "zarparon a explorarla" },
    { c: "El casco del barco se rompió", e: "lo repararon en el puerto" },
    { c: "Hallaron oro en la orilla", e: "volvieron a casa muy ricos" },
  ] },
  { id: "ciudad", pairs: [
    { c: "La ciudad creció muy rápido", e: "construyeron casas más altas" },
    { c: "Un incendio quemó el mercado", e: "lo levantaron de nuevo" },
    { c: "Llegó un sabio extranjero", e: "enseñó cosas nuevas a todos" },
  ] },
  { id: "saber", pairs: [
    { c: "Los libros eran muy caros", e: "inventaron la imprenta" },
    { c: "Casi nadie sabía leer", e: "abrieron escuelas para niños" },
    { c: "Las cartas tardaban meses", e: "crearon el correo a caballo" },
  ] },
  { id: "civismo", pairs: [
    { c: "El rey cobraba muchos impuestos", e: "el pueblo se rebeló contra él" },
    { c: "Los soldados ganaron la batalla", e: "celebraron la victoria en la plaza" },
    { c: "Firmaron una nueva constitución", e: "todos obedecieron sus leyes" },
  ] },
  { id: "clima", pairs: [
    { c: "Una sequía secó los pozos", e: "cavaron canales hasta el lago" },
    { c: "El volcán cubrió todo de ceniza", e: "el pueblo huyó de la montaña" },
    { c: "Llegó un invierno muy frío", e: "guardaron leña para calentarse" },
  ] },
];

function RelatosGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "Relatos históricos · 10 años";

  const [ronda, setRonda] = useStateG(0);

  // R1 — verdadero/falso
  const [r1Pick] = useStateG(() => pickFresh(R1_VF, "vf"));
  const [r1Choice, setR1Choice] = useStateG(null); // "VERDADERO" | "FALSO"
  const [r1Locked, setR1Locked] = useStateG(false);

  // R2 — laboratorio
  const [r2Caso] = useStateG(() => pickFresh(R2_LAB, "lab"));
  const r2Fichas = useMemoG(() => shuffle([
    { id: "q", cat: "quien", text: r2Caso.quien },
    { id: "a", cat: "quehizo", text: r2Caso.quehizo },
    { id: "c", cat: "cuando", text: r2Caso.cuando },
    { id: "t1", cat: "trap", text: r2Caso.traps[0] },
    { id: "t2", cat: "trap", text: r2Caso.traps[1] },
  ]), [r2Caso]);
  const r2ById = useMemoG(() => { const m = {}; r2Fichas.forEach((f) => { m[f.id] = f; }); return m; }, [r2Fichas]);
  const [r2Slots, setR2Slots] = useStateG(() => [null, null, null]);
  const [r2Locked, setR2Locked] = useStateG(false);

  // R3 — une causa y efecto
  const [r3Set] = useStateG(() => pickFresh(R3_SETS, "ce"));
  const r3Pairs = r3Set.pairs; // index 0..2 = pairId
  const [r3CausaOrder] = useStateG(() => shuffle([0, 1, 2]));
  const [r3EfectoOrder] = useStateG(() => shuffle([0, 1, 2]));
  const [r3Links, setR3Links] = useStateG({}); // causaPid -> efectoPid
  const [r3Sel, setR3Sel] = useStateG(null);   // causaPid seleccionada
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

  useEffectG(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started.current) / 1000)), 500);
    return () => clearInterval(id);
  }, []);

  const answer = makeAnswer({
    attempted, solved, stars, starsSession, log, elapsed, catLabel,
    exerciseStart, setApp, go,
    setFeedback, setFeedbackMsg, setAttempted, setSolved, setStars, setStarsSession, setLog,
    onNextRound: () => setRonda((r) => r + 1),
  });

  const r2AllPlaced = r2Slots.every(Boolean);
  const r3AllLinked = Object.keys(r3Links).length === 3;
  const canVerify =
    feedback ? false :
    ronda === 0 ? (r1Choice !== null && !r1Locked) :
    ronda === 1 ? (r2AllPlaced && !r2Locked) :
    ronda === 2 ? (r3AllLinked && !r3Locked) : false;

  function handleVerify() {
    if (!canVerify) return;
    if (ronda === 0) {
      setR1Locked(true);
      const correct = (r1Choice === "VERDADERO") === r1Pick.verdadero;
      setTimeout(() => answer(correct, r1Choice, r1Pick.verdadero ? "VERDADERO" : "FALSO", "⚖️", "Verdadero o falso"), correct ? 450 : 1500);
    } else if (ronda === 1) {
      setR2Locked(true);
      const correct = r2Slots.every((id, i) => id && r2ById[id].cat === R2_LAB_SLOTCAT[i]);
      const u = r2Slots.map((id, i) => `${R2_LAB_LABEL[R2_LAB_SLOTCAT[i]]} ${id ? r2ById[id].text : "?"}`).join(" · ");
      const c = R2_LAB_SLOTCAT.map((cat) => `${R2_LAB_LABEL[cat]} ${r2Caso[cat]}`).join(" · ");
      setTimeout(() => answer(correct, u, c, "🧪", "Laboratorio del relato"), correct ? 450 : 1500);
    } else if (ronda === 2) {
      setR3Locked(true);
      const correct = [0, 1, 2].every((p) => r3Links[p] === p);
      const u = [0, 1, 2].map((p) => `${r3Pairs[p].c} → ${r3Links[p] != null ? r3Pairs[r3Links[p]].e : "?"}`).join(" · ");
      const c = [0, 1, 2].map((p) => `${r3Pairs[p].c} → ${r3Pairs[p].e}`).join(" · ");
      setTimeout(() => answer(correct, u, c, "🔗", "Causa y efecto"), correct ? 450 : 1500);
    }
  }

  function handleErase() {
    if (ronda === 0 && !r1Locked) setR1Choice(null);
    else if (ronda === 1 && !r2Locked) setR2Slots([null, null, null]);
    else if (ronda === 2 && !r3Locked) { setR3Links({}); setR3Sel(null); }
  }

  // R2 drag+tap
  function r2PlaceZone(zoneId, fichaId) {
    if (r2Locked) return;
    setR2Slots((prev) => {
      const slots = prev.slice();
      const cur = slots.indexOf(fichaId);
      if (cur !== -1) slots[cur] = null;
      if (zoneId === "__tray2") return slots;
      const m = /^slot2-(\d)$/.exec(zoneId);
      if (!m) return slots;
      slots[parseInt(m[1], 10)] = fichaId;
      return slots;
    });
  }
  function r2TapFicha(fichaId) {
    if (r2Locked) return;
    setR2Slots((prev) => {
      const slots = prev.slice();
      const cur = slots.indexOf(fichaId);
      if (cur !== -1) { slots[cur] = null; return slots; }
      const empty = slots.indexOf(null);
      if (empty !== -1) slots[empty] = fichaId;
      return slots;
    });
  }

  // R3 conectar
  function r3TapCausa(pid) {
    if (r3Locked) return;
    setR3Sel((s) => (s === pid ? null : pid));
  }
  function r3TapEfecto(pid) {
    if (r3Locked || r3Sel == null) return;
    setR3Links((prev) => {
      const n = {};
      for (const k of Object.keys(prev)) {
        const kp = parseInt(k, 10);
        if (kp === r3Sel) continue;
        if (prev[kp] === pid) continue;
        n[kp] = prev[kp];
      }
      n[r3Sel] = pid;
      return n;
    });
    setR3Sel(null);
  }

  const enunciado =
    ronda === 0 ? "Decide si la frase es verdadera o falsa." :
    ronda === 1 ? "Completa un relato histórico con datos reales." :
    "Une cada causa con su efecto.";
  const bocadillo =
    ronda === 0 ? "Toca verdadero o falso." :
    ronda === 1 ? "No uses los datos falsos." :
    "Toca una causa y\nluego su efecto.";

  // Geometría de R3 (conexión por filas fijas). Cajas angostas (183) para
  // no mezclarse con el bocadillo del personaje; el texto wrapea a 2 renglones.
  const R3_BOXH = 70, R3_GAP = 16, R3_W = 430, R3_MIDL = 183, R3_MIDR = 247;
  const r3RowTop = (i) => i * (R3_BOXH + R3_GAP);
  const r3RowCY = (i) => r3RowTop(i) + R3_BOXH / 2;
  const r3H = 3 * R3_BOXH + 2 * R3_GAP;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <GameHUD elapsed={elapsed} stars={stars} attempted={attempted} solved={solved} total={3} app={app} setApp={setApp} />
      <CharacterCorner char={char} message={bocadillo} />

      {/* R1 — verdadero o falso */}
      {ronda === 0 && (
        <div data-qa="zona-central" style={{
          position: "absolute", top: 74, bottom: 14, left: "50%", transform: "translateX(-50%)",
          width: 540, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
        }}>
          <EnunciadoInline text={enunciado} />
          <Cartel text={`"${r1Pick.text}"`} fontSize={17} maxWidth={372} />
          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            <OptionButton label="VERDADERO" locked={r1Locked} isCorrect={r1Pick.verdadero} isPicked={r1Choice === "VERDADERO"}
              onClick={() => setR1Choice((c) => (c === "VERDADERO" ? null : "VERDADERO"))} color="#2ecc8f" minWidth={132} />
            <OptionButton label="FALSO" locked={r1Locked} isCorrect={!r1Pick.verdadero} isPicked={r1Choice === "FALSO"}
              onClick={() => setR1Choice((c) => (c === "FALSO" ? null : "FALSO"))} color="#ef5a5a" minWidth={132} />
          </div>
        </div>
      )}

      {/* R2 — laboratorio del relato */}
      {ronda === 1 && (() => {
        const labCard = (id, ok) => {
          const f = r2ById[id];
          if (!f) return null;
          // ok=null → ficha aún en la bandeja (no colocada): NO se marca rojo;
          // dejar fuera las fantasiosas es correcto, solo se atenúa al verificar.
          const marked = ok !== null;
          return (
            <div key={id}
              className={r2Locked ? "" : "ed-draggable"}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={r2Locked ? undefined : makeDragHandler({
                item: id, disabled: r2Locked,
                ghostHtml: `<div style="background:linear-gradient(180deg,#fce9a8,#e9c45a);color:#3a2608;padding:8px 14px;border-radius:10px;font-family:Fredoka,Nunito,sans-serif;font-weight:800;font-size:14px;border:2px solid #4fd8ff;box-shadow:0 8px 20px rgba(0,0,0,0.5);white-space:nowrap;">${f.text}</div>`,
                onTap: r2TapFicha, onDrop: r2PlaceZone,
              })}
              style={{
                padding: "8px 12px", borderRadius: 10, textAlign: "center",
                background: marked ? (ok ? "linear-gradient(180deg,#2ecc8f,#22a06c)" : "linear-gradient(180deg,#ff6b6b,#dc5050)") : "rgba(255,255,255,0.95)",
                color: marked ? "#fff" : "#3a2608",
                opacity: (r2Locked && !marked) ? 0.5 : 1,
                boxShadow: "0 3px 8px rgba(0,0,0,0.28)",
                fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 14, lineHeight: 1.1, whiteSpace: "nowrap",
              }}>
              {marked ? (ok ? "✓ " : "✗ ") : ""}{f.text}
            </div>
          );
        };
        return (
          <div data-qa="zona-central" style={{
            position: "absolute", top: 74, bottom: 14, left: "50%", transform: "translateX(-50%)",
            width: 560, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
          }}>
            <EnunciadoInline text={enunciado} />
            {/* Bandeja de piezas */}
            <div data-dropzone="__tray2" data-qa="bandeja" style={{
              display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", alignItems: "center",
              minHeight: 50, maxWidth: 430, borderRadius: 12, padding: "4px 8px",
            }}>
              {r2Fichas.filter((f) => !r2Slots.includes(f.id)).map((f) => labCard(f.id, null))}
              {r2AllPlaced && (
                <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 14, color: "rgba(255,255,255,0.7)", pointerEvents: "none" }}>
                  ¡Listo! Pulsa VERIFICAR.
                </div>
              )}
            </div>
            {/* Ranuras etiquetadas */}
            <div style={{ display: "flex", flexDirection: "column", gap: 9, alignItems: "center" }}>
              {[0, 1, 2].map((i) => {
                const id = r2Slots[i];
                const cat = R2_LAB_SLOTCAT[i];
                const ok = (r2Locked && id) ? (r2ById[id].cat === cat) : null;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 116, flexShrink: 0, borderRadius: 8, textAlign: "center",
                      background: "#e8b765", color: "#3a2608", fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 13,
                      padding: "8px 6px", letterSpacing: "0.02em",
                    }}>{R2_LAB_LABEL[cat]}</div>
                    <div data-dropzone={`slot2-${i}`}
                      style={{
                        width: 300, minHeight: 46, borderRadius: 12, padding: "4px 8px",
                        background: "rgba(10,6,35,0.4)",
                        border: `2px dashed ${id ? "rgba(242,194,96,0.25)" : "rgba(242,194,96,0.6)"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                      {id ? labCard(id, ok) : (
                        <span style={{ fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 12, color: "rgba(252,233,168,0.4)", pointerEvents: "none" }}>
                          Suelta aquí el dato
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

      {/* R3 — une causa y efecto */}
      {ronda === 2 && (
        <div data-qa="zona-central" style={{
          position: "absolute", top: 74, bottom: 14, left: "50%", transform: "translateX(-50%)",
          width: 560, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
        }}>
          <EnunciadoInline text={enunciado} />
          <div style={{ width: R3_W, display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            {["CAUSAS", "EFECTOS"].map((h, i) => (
              <div key={h} style={{ width: R3_MIDL, textAlign: "center" }}>
                <span style={{
                  display: "inline-block",
                  background: i === 0 ? "rgba(79,160,255,0.22)" : "rgba(167,139,250,0.22)",
                  border: `1.5px solid ${i === 0 ? "#4fa0ff" : "#a78bfa"}`,
                  borderRadius: 999, padding: "4px 18px",
                  fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 13,
                  letterSpacing: "0.12em", color: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                }}>{h}</span>
              </div>
            ))}
          </div>
          <div style={{ position: "relative", width: R3_W, height: r3H }}>
            {/* líneas de conexión */}
            <svg width={R3_W} height={r3H} style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}>
              {Object.keys(r3Links).map((k) => {
                const cPid = parseInt(k, 10);
                const ePid = r3Links[cPid];
                const cy = r3RowCY(r3CausaOrder.indexOf(cPid));
                const ey = r3RowCY(r3EfectoOrder.indexOf(ePid));
                const stroke = r3Locked ? (cPid === ePid ? "#2ecc8f" : "#ff6b6b") : "#4fd8ff";
                return <line key={k} x1={R3_MIDL} y1={cy} x2={R3_MIDR} y2={ey} stroke={stroke} strokeWidth={4} strokeLinecap="round" />;
              })}
            </svg>
            {/* columna causas */}
            {r3CausaOrder.map((pid, row) => {
              const linked = r3Links[pid] != null;
              const sel = r3Sel === pid;
              return (
                <button key={pid} onClick={() => r3TapCausa(pid)}
                  style={{
                    position: "absolute", left: 0, top: r3RowTop(row), width: R3_MIDL, height: R3_BOXH,
                    borderRadius: 12, padding: "5px 14px", textAlign: "center", cursor: r3Locked ? "default" : "pointer",
                    background: sel ? "linear-gradient(180deg,#fce9a8,#e9c45a)" : "rgba(255,255,255,0.93)",
                    color: "#3a2608", border: `2px solid ${sel ? "#4fd8ff" : (linked ? "#a78bfa" : "rgba(116,72,32,0.25)")}`,
                    boxShadow: sel ? "0 0 16px rgba(79,216,255,0.6)" : "0 3px 8px rgba(0,0,0,0.25)",
                    fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 13, lineHeight: 1.12,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                  {r3Pairs[pid].c}
                  <span style={{
                    position: "absolute", right: -6, top: "50%", transform: "translateY(-50%)",
                    width: 12, height: 12, borderRadius: "50%", background: linked ? "#a78bfa" : "#cbb27a",
                    border: "2px solid #fff",
                  }} />
                </button>
              );
            })}
            {/* columna efectos */}
            {r3EfectoOrder.map((pid, row) => {
              const linkedFrom = Object.keys(r3Links).find((k) => r3Links[parseInt(k, 10)] === pid);
              const isLinked = linkedFrom != null;
              return (
                <button key={pid} onClick={() => r3TapEfecto(pid)}
                  style={{
                    position: "absolute", right: 0, top: r3RowTop(row), width: R3_MIDL, height: R3_BOXH,
                    borderRadius: 12, padding: "5px 14px", textAlign: "center", cursor: (r3Locked || r3Sel == null) ? "default" : "pointer",
                    background: "rgba(255,255,255,0.93)",
                    color: "#3a2608", border: `2px solid ${isLinked ? "#a78bfa" : "rgba(116,72,32,0.25)"}`,
                    boxShadow: "0 3px 8px rgba(0,0,0,0.25)",
                    fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 13, lineHeight: 1.12,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                  <span style={{
                    position: "absolute", left: -6, top: "50%", transform: "translateY(-50%)",
                    width: 12, height: 12, borderRadius: "50%", background: isLinked ? "#a78bfa" : "#cbb27a",
                    border: "2px solid #fff",
                  }} />
                  {r3Pairs[pid].e}
                </button>
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
// NIVEL 2 — HERRAMIENTAS DEL ESCRITOR (10 años): 3 rondas distintas
//   R1 atrapa la interjección (shooter) · R2 ruleta de conectores · R3 el deseo (subjuntivo)
// ═════════════════════════════════════════════════════════════
const INTERJ_BANK = ["ay", "uf", "huy", "bah", "epa", "ojalá", "caramba", "achachay", "ananay", "guácala", "ayayay", "arrarray"]
  .map((w, i) => ({ id: "i" + i, w }));
const NORMAL_BANK = ["mesa", "correr", "azul", "perro", "casa", "verde", "libro", "nube", "comer", "flor", "lápiz", "río", "saltar", "camino", "reloj", "puente"]
  .map((w, i) => ({ id: "n" + i, w }));
// Dos columnas parejas en 3 filas (izquierda ~6-12%, derecha ~55-61%), con
// ligero escalonado vertical para que se vea orgánico SIN dejar huecos.
const BUBBLE_SLOTS = [
  { l: "10%", t: "4%" }, { l: "57%", t: "7%" },
  { l: "6%", t: "39%" }, { l: "61%", t: "41%" },
  { l: "12%", t: "72%" }, { l: "55%", t: "70%" },
];
function cap(w) { return w.charAt(0).toUpperCase() + w.slice(1); }

const R2_CONECT = [
  { id: "co1", before: "Quería salir a jugar,", after: "estaba lloviendo.", answer: "pero", options: ["pero", "porque", "luego"] },
  { id: "co2", before: "Llegué tarde", after: "el bus se dañó.", answer: "porque", options: ["porque", "aunque", "después"] },
  { id: "co3", before: "Primero hago la tarea y", after: "salgo a jugar.", answer: "luego", options: ["luego", "porque", "pero"] },
  { id: "co4", before: "Estudié mucho,", after: "aprobé el examen.", answer: "por eso", options: ["por eso", "sin embargo", "mientras"] },
  { id: "co5", before: "Mi hermano es alto; yo,", after: ", soy bajito.", answer: "en cambio", options: ["en cambio", "porque", "luego"] },
  { id: "co6", before: "", after: "terminó la lluvia, salió el sol.", answer: "Cuando", options: ["Cuando", "Aunque", "Por eso"] },
  { id: "co7", before: "Practicamos mucho;", after: ", ganamos el concurso.", answer: "finalmente", options: ["finalmente", "sin embargo", "porque"] },
  { id: "co8", before: "", after: ", quiero darles una buena noticia.", answer: "Para empezar", options: ["Para empezar", "En cambio", "Porque"] },
];

const R3_SUBJ = [
  { id: "su1", before: "Espero que mañana", after: "sol.", answer: "haga", options: ["haga", "hace", "hará"] },
  { id: "su2", before: "Quiero que", after: "a mi fiesta.", answer: "vengas", options: ["vengas", "vienes", "vendrás"] },
  { id: "su3", before: "Ojalá", after: "pronto a casa.", answer: "llegues", options: ["llegues", "llegas", "llegarás"] },
  { id: "su4", before: "Dudo que él", after: "la verdad.", answer: "diga", options: ["diga", "dice", "dirá"] },
  { id: "su5", before: "Me alegra que", after: "feliz.", answer: "estés", options: ["estés", "estás", "estarás"] },
  { id: "su6", before: "Deseo que", after: "mucho para el examen.", answer: "estudies", options: ["estudies", "estudias", "estudiarás"] },
  { id: "su7", before: "Te aviso cuando", after: "listo.", answer: "estés", options: ["estés", "estás", "estarás"] },
  { id: "su8", before: "Aunque", after: "difícil, lo intentaré.", answer: "sea", options: ["sea", "es", "será"] },
];

function HerramientasGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "Herramientas del escritor · 10 años";

  const [ronda, setRonda] = useStateG(0);

  // R1 — shooter de interjecciones
  const [wave] = useStateG(() => {
    const ints = [];
    while (ints.length < 3) { const p = pickFresh(INTERJ_BANK, "itj"); if (!ints.find((x) => x.id === p.id)) ints.push(p); }
    const nors = [];
    while (nors.length < 3) { const p = pickFresh(NORMAL_BANK, "nor"); if (!nors.find((x) => x.id === p.id)) nors.push(p); }
    const items = shuffle([
      ...ints.map((x) => ({ ...x, isInterj: true })),
      ...nors.map((x) => ({ ...x, isInterj: false })),
    ]);
    return { items, interjIds: ints.map((x) => x.id), interjWords: ints.map((x) => cap(x.w)) };
  });
  const [picked, setPicked] = useStateG(() => new Set()); // burbujas marcadas
  const pickedRef = useRefG(new Set());
  const [shotLocked, setShotLocked] = useStateG(false);
  const shotDone = useRefG(false);
  const [shotTime, setShotTime] = useStateG(8); // cuenta regresiva del shooter (8 s)
  const shotTimeRef = useRefG(8);

  // R2 — ruleta de conectores
  const [r2Pick] = useStateG(() => pickFresh(R2_CONECT, "con"));
  const r2Opts = useMemoG(() => shuffle(r2Pick.options), [r2Pick]);
  const [r2Spun, setR2Spun] = useStateG(false);
  const [r2Spinning, setR2Spinning] = useStateG(false);
  const [r2Rot, setR2Rot] = useStateG(0);
  const [r2Choice, setR2Choice] = useStateG(null);
  const [r2Locked, setR2Locked] = useStateG(false);

  // R3 — subjuntivo
  const [r3Pick] = useStateG(() => pickFresh(R3_SUBJ, "sub"));
  const r3Opts = useMemoG(() => shuffle(r3Pick.options), [r3Pick]);
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

  useEffectG(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started.current) / 1000)), 500);
    return () => clearInterval(id);
  }, []);

  const answer = makeAnswer({
    attempted, solved, stars, starsSession, log, elapsed, catLabel,
    exerciseStart, setApp, go,
    setFeedback, setFeedbackMsg, setAttempted, setSolved, setStars, setStarsSession, setLog,
    onNextRound: () => setRonda((r) => r + 1),
  });

  // R1 — shooter: marcar las interjecciones y verificar (manual o por tiempo).
  function verifyShot() {
    if (shotDone.current) return;
    shotDone.current = true;
    setShotLocked(true);
    const sel = pickedRef.current;
    const allInt = wave.interjIds.every((id) => sel.has(id));
    const noWrong = [...sel].every((id) => wave.interjIds.includes(id));
    const correct = allInt && noWrong;
    const u = wave.items.filter((b) => sel.has(b.id)).map((b) => cap(b.w)).join(", ") || "(ninguna)";
    setTimeout(() => answer(correct, u, wave.interjWords.join(", "), "💥", "Interjecciones"), correct ? 450 : 1200);
  }
  function tapBubble(b) {
    if (shotLocked) return;
    const sel = pickedRef.current;
    if (sel.has(b.id)) sel.delete(b.id); else sel.add(b.id);
    setPicked(new Set(sel));
  }
  // Cuenta regresiva de 10 s del shooter: al llegar a 0 verifica solo
  // (pedido de la autora 2026-06-12: si se acaba el tiempo, autoverifica).
  useEffectG(() => {
    if (ronda !== 0) return;
    const id = setInterval(() => {
      if (shotDone.current) { clearInterval(id); return; }
      shotTimeRef.current -= 1;
      setShotTime(Math.max(0, shotTimeRef.current));
      if (shotTimeRef.current <= 0) { clearInterval(id); verifyShot(); }
    }, 1000);
    return () => clearInterval(id);
  }, [ronda]);

  function spinRuleta() {
    if (r2Spinning || r2Spun) return;
    setR2Spinning(true);
    setR2Rot((r) => r + 4 * 360 + Math.floor(Math.random() * 360));
    setTimeout(() => { setR2Spinning(false); setR2Spun(true); exerciseStart.current = Date.now(); }, 1750);
  }

  const canVerify =
    feedback ? false :
    ronda === 0 ? (!shotLocked && picked.size >= 1) :
    ronda === 1 ? (r2Spun && r2Choice !== null && !r2Locked) :
    ronda === 2 ? (r3Choice !== null && !r3Locked) : false;

  function handleVerify() {
    if (!canVerify) return;
    if (ronda === 0) { verifyShot(); return; }
    if (ronda === 1) {
      setR2Locked(true);
      const correct = r2Choice === r2Pick.answer;
      setTimeout(() => answer(correct, r2Choice, r2Pick.answer, "🎡", "Conector lógico"), correct ? 450 : 1500);
    } else if (ronda === 2) {
      setR3Locked(true);
      const correct = r3Choice === r3Pick.answer;
      setTimeout(() => answer(correct, r3Choice, r3Pick.answer, "✨", "Verbo en subjuntivo"), correct ? 450 : 1500);
    }
  }
  function handleErase() {
    if (ronda === 0 && !shotLocked) { pickedRef.current = new Set(); setPicked(new Set()); }
    else if (ronda === 1 && !r2Locked) setR2Choice(null);
    else if (ronda === 2 && !r3Locked) setR3Choice(null);
  }

  const enunciado =
    ronda === 0 ? "Atrapa solo las interjecciones." :
    ronda === 1 ? "Completa la oración con el conector correcto." :
    "Completa la oración con el verbo en modo subjuntivo.";
  const bocadillo =
    ronda === 0 ? "Toca las palabras que\nexpresan una emoción." :
    ronda === 1 ? "Gira la ruleta y toca\nel conector que une las ideas." :
    "Elige el verbo que\nexpresa deseo o duda.";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <GameHUD elapsed={elapsed} stars={stars} attempted={attempted} solved={solved} total={3} app={app} setApp={setApp} />
      <CharacterCorner char={char} message={bocadillo} />

      {/* R1 — shooter: marca las interjecciones (timer 10 s + VERIFICAR) */}
      {ronda === 0 && (
        <>
          <style>{`@keyframes ed-bubble-drift {
            0% { transform: translate(0,0); }
            25% { transform: translate(12px,-14px); }
            50% { transform: translate(-10px,10px); }
            75% { transform: translate(14px,8px); }
            100% { transform: translate(0,0); }
          }`}</style>
          <div style={{
            position: "absolute", top: 106, left: "50%", transform: "translateX(-50%)", width: 488,
            textAlign: "center", fontFamily: "var(--ed-font-display)", fontWeight: 700,
            fontSize: 17, lineHeight: 1.2, color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,0.6)",
            pointerEvents: "none", zIndex: 5,
          }}>{enunciado}</div>
          {/* Temporizador de 10 s — barra (no un círculo, para que no se
              confunda con una palabra atrapable del campo) */}
          <div style={{
            position: "absolute", top: 136, left: "50%", transform: "translateX(-50%)", zIndex: 6,
            width: 300, display: "flex", alignItems: "center", gap: 8, pointerEvents: "none",
          }}>
            <span style={{ fontSize: 17, lineHeight: 1 }}>⏱️</span>
            <div style={{
              flex: 1, height: 12, borderRadius: 6, overflow: "hidden",
              background: "rgba(0,0,0,0.28)", border: "1px solid rgba(255,255,255,0.28)",
            }}>
              <div style={{
                width: `${(shotTime / 8) * 100}%`, height: "100%", borderRadius: 6,
                background: shotTime <= 3 ? "linear-gradient(90deg,#ff9a9a,#d83a3a)" : "linear-gradient(90deg,#ffe9a8,#d9a441)",
                transition: "width 1s linear",
              }} />
            </div>
            <span style={{
              minWidth: 18, textAlign: "right", fontFamily: "var(--ed-font-display)", fontWeight: 900,
              fontSize: 15, color: shotTime <= 3 ? "#ff9a9a" : "#ffe9a8",
            }}>{shotTime}</span>
          </div>
          <div data-qa="zona-central" style={{ position: "absolute", top: 168, left: 232, right: 168, bottom: 28 }}>
            {wave.items.map((b, i) => {
              const slot = BUBBLE_SLOTS[i];
              const sel = picked.has(b.id);
              const reveal = shotLocked;
              let bg = "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(240,235,225,0.92))";
              let border = "3px solid #f2c260", ink = "#3a2608";
              if (reveal && b.isInterj) { bg = "linear-gradient(180deg,#2ecc8f,#22a06c)"; border = "3px solid #2ecc8f"; ink = "#fff"; }
              else if (reveal && sel && !b.isInterj) { bg = "linear-gradient(180deg,#ff6b6b,#dc5050)"; border = "3px solid #ff6b6b"; ink = "#fff"; }
              else if (sel) { bg = "linear-gradient(180deg,#fce9a8,#e9c45a)"; border = "3px solid #4fd8ff"; }
              return (
                <button key={b.id} onClick={() => tapBubble(b)}
                  disabled={shotLocked}
                  style={{
                    position: "absolute", left: slot.l, top: slot.t,
                    padding: "12px 20px", borderRadius: 999, background: bg, border, color: ink,
                    fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 21,
                    boxShadow: "0 8px 18px rgba(0,0,0,0.4)", cursor: shotLocked ? "default" : "pointer",
                    animation: shotLocked ? "none" : `ed-bubble-drift ${(4.2 + (i % 3) * 0.9).toFixed(1)}s ease-in-out ${((i % 4) * 0.4).toFixed(1)}s infinite`,
                    transition: "background 0.15s ease, border 0.15s ease",
                  }}>
                  {cap(b.w)}
                  {reveal && b.isInterj && (
                    <span style={{
                      position: "absolute", top: -8, right: -8, width: 20, height: 20, borderRadius: "50%",
                      background: "#2ecc8f", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 900, border: "2px solid #fff",
                    }}>✓</span>
                  )}
                </button>
              );
            })}
            <div style={{
              position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
              fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.75)", whiteSpace: "nowrap",
            }}>Marcadas: {picked.size}</div>
          </div>
        </>
      )}

      {/* R2 — ruleta de conectores */}
      {ronda === 1 && (
        <div data-qa="zona-central" style={{
          position: "absolute", top: 74, bottom: 14, left: "50%", transform: "translateX(-50%)",
          width: 540, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
        }}>
          <EnunciadoInline text={enunciado} />
          <Ruleta rotation={r2Rot} spinning={r2Spinning} sectors={["⏱", "➡", "↔", "🔗", "✦", "↺"]} />
          {!r2Spun ? (
            <button className="ed-btn ed-btn-primary" onClick={spinRuleta} disabled={r2Spinning}
              style={{ height: 52, padding: "0 32px", fontSize: 17, fontWeight: 800, letterSpacing: "0.04em", opacity: r2Spinning ? 0.6 : 1 }}>
              {r2Spinning ? "GIRANDO…" : "GIRAR 🎡"}
            </button>
          ) : (
            <>
              <BlankCartel before={r2Pick.before} value={r2Choice} after={r2Pick.after} />
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
                {r2Opts.map((opt, i) => (
                  <OptionButton key={opt} label={opt} locked={r2Locked}
                    isCorrect={opt === r2Pick.answer} isPicked={r2Choice === opt}
                    onClick={() => setR2Choice((c) => (c === opt ? null : opt))}
                    color={["#ef5a5a", "#4fa0ff", "#2ecc8f"][i % 3]} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* R3 — el deseo (subjuntivo) */}
      {ronda === 2 && (
        <div data-qa="zona-central" style={{
          position: "absolute", top: 74, bottom: 14, left: "50%", transform: "translateX(-50%)",
          width: 540, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
        }}>
          <EnunciadoInline text={enunciado} />
          <BlankCartel before={r3Pick.before} value={r3Choice} after={r3Pick.after} />
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            {r3Opts.map((opt, i) => (
              <OptionButton key={opt} label={opt} locked={r3Locked}
                isCorrect={opt === r3Pick.answer} isPicked={r3Choice === opt}
                onClick={() => setR3Choice((c) => (c === opt ? null : opt))}
                color={["#ef5a5a", "#4fa0ff", "#2ecc8f"][i % 3]} />
            ))}
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
// NIVEL 3 — DETECTIVES DE LA PALABRA (13 años): 3 rondas distintas
//   R1 resuelve el enigma (inferencias) · R2 el expediente del caso · R3 la lupa
// ═════════════════════════════════════════════════════════════
const R1_INFER = [
  { id: "in1", scene: "Suena la sirena de los bomberos y los ves pasar muy rápido por la calle.", answer: "Hay un incendio cerca.", options: ["Hay un incendio cerca.", "Es un día de fiesta.", "Va a salir el sol."] },
  { id: "in2", scene: "Mucha gente camina con camisetas amarillas rumbo al estadio.", answer: "Hoy juega la selección.", options: ["Hoy juega la selección.", "Empezó a nevar.", "Cerraron el estadio."] },
  { id: "in3", scene: "Las entradas del concierto se agotaron en una hora.", answer: "El concierto estará lleno.", options: ["El concierto estará lleno.", "Nadie irá al concierto.", "El concierto se canceló."] },
  { id: "in4", scene: "La calle está mojada y el cielo todavía se ve gris.", answer: "Acaba de llover.", options: ["Acaba de llover.", "Hace mucho calor.", "Es de madrugada."] },
  { id: "in5", scene: "Tu vecino sale con maleta, gorra y bloqueador solar.", answer: "Se va de viaje a la playa.", options: ["Se va de viaje a la playa.", "Se va a dormir.", "Está cocinando."] },
  { id: "in6", scene: "Sale humo por la ventana de la cocina y huele a quemado.", answer: "Algo se está quemando.", options: ["Algo se está quemando.", "Están barriendo.", "Hace frío."] },
  { id: "in7", scene: "El cielo se llenó de nubes negras y empezó a soplar viento fuerte.", answer: "Pronto va a llover.", options: ["Pronto va a llover.", "Saldrá el arcoíris.", "Hará mucho sol."] },
  { id: "in8", scene: "La maestra reparte hojas en silencio y pide guardar los libros.", answer: "Habrá una prueba.", options: ["Habrá una prueba.", "Es hora del recreo.", "Van a cantar."] },
];

const ELEM_LABEL = { detective: "DETECTIVE", victimario: "VICTIMARIO", pista: "PISTA" };
const ELEM_COLOR = { detective: "#4fa0ff", victimario: "#e0a23a", pista: "#2ecc8f" };
const R2_ELEM = {
  detective: [
    { id: "d1", text: "Une las pistas con su razonamiento." },
    { id: "d2", text: "Observa todo y no es policía." },
    { id: "d3", text: "Resuelve el caso usando la lógica." },
    { id: "d4", text: "Analiza cada detalle de la escena." },
    { id: "d5", text: "Sigue cada rastro hasta el final." },
  ],
  victimario: [
    { id: "vc1", text: "Cometió el crimen sin que se note." },
    { id: "vc2", text: "Parece inocente hasta el final." },
    { id: "vc3", text: "Es astuto y pasa inadvertido." },
    { id: "vc4", text: "Esconde la verdad del caso." },
    { id: "vc5", text: "Engaña a todos con su calma." },
  ],
  pista: [
    { id: "p1", text: "Un objeto que parece sin importancia." },
    { id: "p2", text: "Un detalle pequeño que revela la verdad." },
    { id: "p3", text: "Una huella olvidada en la escena." },
    { id: "p4", text: "Algo que solo el detective sabe leer." },
    { id: "p5", text: "Una marca que delata al culpable." },
  ],
};
const ELEM_BINS = ["detective", "victimario", "pista"];

// La escena es UN SOLO texto corrido (prosa). Los tokens con `id` son frases
// marcables (la lupa resalta solo esa frase, no la oración entera); `pista:true`
// son las verdaderas pistas. Los tokens sin `id` son texto de enlace, no tocable.
const R3_ESCENAS = [
  { id: "e1", titulo: "La sala del caso", tokens: [
    { t: "El detective recorrió la sala en silencio. Sobre la mesa quedaba " },
    { id: "a", t: "un vaso a medio beber", pista: true },
    { t: ". " },
    { id: "b", t: "Las cortinas eran de color azul", pista: false },
    { t: " y combinaban con " },
    { id: "c", t: "un cuadro colgado en la pared", pista: false },
    { t: ". Sin embargo, " },
    { id: "d", t: "la ventana estaba abierta de par en par", pista: true },
    { t: " y " },
    { id: "e", t: "el reloj se había detenido a las tres", pista: true },
    { t: ". " },
    { id: "f", t: "La alfombra se veía suave y nueva", pista: false },
    { t: "." },
  ] },
  { id: "e2", titulo: "El patio del caso", tokens: [
    { t: "En el patio, el detective se agachó con su lupa. Descubrió " },
    { id: "a", t: "unas huellas de zapato en la tierra húmeda", pista: true },
    { t: " y, más allá, " },
    { id: "b", t: "una llave que brillaba junto a la reja", pista: true },
    { t: ". " },
    { id: "c", t: "Las flores eran rojas y amarillas", pista: false },
    { t: ", muy alegres, y " },
    { id: "d", t: "el césped estaba recién cortado", pista: false },
    { t: ". Junto al muro vio " },
    { id: "e", t: "una rama rota a su misma altura", pista: true },
    { t: ", aunque " },
    { id: "f", t: "el banco de madera lucía pintado de verde", pista: false },
    { t: "." },
  ] },
  { id: "e3", titulo: "El estudio del caso", tokens: [
    { t: "El estudio estaba en penumbra. El detective notó " },
    { id: "a", t: "un cajón abierto y revuelto", pista: true },
    { t: " y, en el suelo, " },
    { id: "b", t: "barro fresco sobre la madera", pista: true },
    { t: ". En el estante, " },
    { id: "c", t: "los libros tenían tapas de colores", pista: false },
    { t: " y al centro descansaba " },
    { id: "d", t: "un florero con margaritas", pista: false },
    { t: ". De pronto halló " },
    { id: "e", t: "una carta rasgada en el basurero", pista: true },
    { t: ", mientras " },
    { id: "f", t: "las paredes pintadas de color crema", pista: false },
    { t: " seguían intactas." },
  ] },
  { id: "e4", titulo: "La cocina del caso", tokens: [
    { t: "En la cocina, todo parecía normal a primera vista. Sobre la mesa humeaba " },
    { id: "a", t: "una taza caliente", pista: true },
    { t: " y " },
    { id: "b", t: "el mantel tenía cuadros blancos", pista: false },
    { t: ". El detective observó que " },
    { id: "c", t: "la puerta trasera estaba sin seguro", pista: true },
    { t: ", aunque " },
    { id: "d", t: "había frutas frescas en un tazón", pista: false },
    { t: ". Cerca del fregadero descubrió " },
    { id: "e", t: "una pisada de barro", pista: true },
    { t: ", mientras " },
    { id: "f", t: "unas tazas decoradas con flores", pista: false },
    { t: " colgaban del estante." },
  ] },
  { id: "e5", titulo: "El comedor del caso", tokens: [
    { t: "El detective entró al comedor en penumbra. Encontró " },
    { id: "a", t: "una silla volcada en el suelo", pista: true },
    { t: " y, sobre la mesa, " },
    { id: "b", t: "un plato con comida a medio terminar", pista: true },
    { t: ". " },
    { id: "c", t: "El cuadro de la pared mostraba un paisaje", pista: false },
    { t: " y " },
    { id: "d", t: "las servilletas eran de tela blanca", pista: false },
    { t: ". Junto a la puerta vio " },
    { id: "e", t: "un manojo de llaves olvidado", pista: true },
    { t: ", mientras " },
    { id: "f", t: "el florero del centro tenía rosas frescas", pista: false },
    { t: "." },
  ] },
];

function DetectivesGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "Detectives de la palabra · 13 años";

  const [ronda, setRonda] = useStateG(0);

  // R1 — inferencias
  const [r1Pick] = useStateG(() => pickFresh(R1_INFER, "inf"));
  const r1Opts = useMemoG(() => shuffle(r1Pick.options), [r1Pick]);
  const [r1Choice, setR1Choice] = useStateG(null);
  const [r1Locked, setR1Locked] = useStateG(false);

  // R2 — expediente del caso (clasificar a carpetas)
  const [r2Pick] = useStateG(() => ({
    fichas: shuffle([
      { ...pickFresh(R2_ELEM.detective, "ed"), tipo: "detective" },
      { ...pickFresh(R2_ELEM.victimario, "ev"), tipo: "victimario" },
      { ...pickFresh(R2_ELEM.pista, "ep"), tipo: "pista" },
    ]),
    bins: ELEM_BINS,
  }));
  const [r2Placed, setR2Placed] = useStateG({});
  const [r2Selected, setR2Selected] = useStateG(null);
  const [r2Locked, setR2Locked] = useStateG(false);

  // R3 — la lupa del detective (marcar pistas)
  const [r3Esc] = useStateG(() => pickFresh(R3_ESCENAS, "esc"));
  const [r3Marked, setR3Marked] = useStateG(() => new Set());
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

  useEffectG(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started.current) / 1000)), 500);
    return () => clearInterval(id);
  }, []);

  const answer = makeAnswer({
    attempted, solved, stars, starsSession, log, elapsed, catLabel,
    exerciseStart, setApp, go,
    setFeedback, setFeedbackMsg, setAttempted, setSolved, setStars, setStarsSession, setLog,
    onNextRound: () => setRonda((r) => r + 1),
  });

  const r2AllPlaced = r2Pick.fichas.every((f) => r2Placed[f.id]);
  const canVerify =
    feedback ? false :
    ronda === 0 ? (r1Choice !== null && !r1Locked) :
    ronda === 1 ? (r2AllPlaced && !r2Locked) :
    ronda === 2 ? (r3Marked.size >= 1 && !r3Locked) : false;

  function handleVerify() {
    if (!canVerify) return;
    if (ronda === 0) {
      setR1Locked(true);
      const correct = r1Choice === r1Pick.answer;
      setTimeout(() => answer(correct, r1Choice, r1Pick.answer, "🕵️", "Inferencia"), correct ? 450 : 1500);
    } else if (ronda === 1) {
      setR2Locked(true);
      const correct = r2Pick.fichas.every((f) => r2Placed[f.id] === f.tipo);
      const u = r2Pick.fichas.map((f) => `${f.text}→${ELEM_LABEL[r2Placed[f.id]] || "?"}`).join(" · ");
      const c = r2Pick.fichas.map((f) => `${f.text}→${ELEM_LABEL[f.tipo]}`).join(" · ");
      setTimeout(() => answer(correct, u, c, "📁", "Elementos del relato"), correct ? 450 : 1500);
    } else if (ronda === 2) {
      setR3Locked(true);
      const dets = r3Esc.tokens.filter((d) => d.id);
      const correct = dets.every((d) => r3Marked.has(d.id) === d.pista);
      const u = dets.filter((d) => r3Marked.has(d.id)).map((d) => d.t).join(" · ") || "(ninguna)";
      const c = dets.filter((d) => d.pista).map((d) => d.t).join(" · ");
      setTimeout(() => answer(correct, u, c, "🔍", "La lupa del detective"), correct ? 450 : 1500);
    }
  }
  function handleErase() {
    if (ronda === 0 && !r1Locked) setR1Choice(null);
    else if (ronda === 1 && !r2Locked) { setR2Placed({}); setR2Selected(null); }
    else if (ronda === 2 && !r3Locked) setR3Marked(new Set());
  }

  // R2 drag+tap
  function r2PlaceZone(zoneId, fichaId) {
    if (r2Locked) return;
    setR2Selected(null);
    if (zoneId === "__trayE") {
      setR2Placed((p) => { const n = { ...p }; delete n[fichaId]; return n; });
    } else if (ELEM_BINS.includes(zoneId)) {
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

  function r3Toggle(id) {
    if (r3Locked) return;
    setR3Marked((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  const enunciado =
    ronda === 0 ? "Lee las pistas y deduce qué ocurrió." :
    ronda === 1 ? "Archiva cada dato en la carpeta correcta." :
    "Marca las pistas que un detective notaría.";
  const bocadillo =
    ronda === 0 ? "Toca lo que deduciría\nun detective." :
    ronda === 1 ? "Arrastra cada dato a su\nelemento del relato." :
    "Toca solo los detalles\nque dan una pista.";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <GameHUD elapsed={elapsed} stars={stars} attempted={attempted} solved={solved} total={3} app={app} setApp={setApp} />
      <CharacterCorner char={char} message={bocadillo} />

      {/* R1 — inferencias */}
      {ronda === 0 && (
        <div data-qa="zona-central" style={{
          position: "absolute", top: 74, bottom: 14, left: "50%", transform: "translateX(-50%)",
          width: 560, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
        }}>
          <EnunciadoInline text={enunciado} />
          <div style={{ position: "relative", width: "fit-content", maxWidth: 470 }}>
            <div style={{ position: "absolute", top: -16, right: -12, fontSize: 32, transform: "rotate(8deg)", filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.4))" }}>🔎</div>
            <Cartel text={r1Pick.scene} fontSize={17} maxWidth={418} />
          </div>
          <div style={{ display: "flex", gap: 10, flexDirection: "column", alignItems: "stretch", width: "fit-content", maxWidth: 480 }}>
            {r1Opts.map((opt, i) => (
              <OptionButton key={opt} label={opt} locked={r1Locked}
                isCorrect={opt === r1Pick.answer} isPicked={r1Choice === opt}
                onClick={() => setR1Choice((c) => (c === opt ? null : opt))}
                color={["#ef5a5a", "#4fa0ff", "#2ecc8f"][i % 3]} minWidth={420} />
            ))}
          </div>
        </div>
      )}

      {/* R2 — el expediente del caso (clasificar a carpetas) */}
      {ronda === 1 && (
        <div data-qa="zona-central" style={{
          position: "absolute", top: 74, bottom: 14, left: "50%", transform: "translateX(-50%)",
          width: 600, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
        }}>
          <EnunciadoInline text={enunciado} />
          <div data-dropzone="__trayE" data-qa="bandeja" style={{
            display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", alignItems: "center",
            minHeight: 52, maxWidth: 430, borderRadius: 12, padding: "4px 8px",
          }}>
            {r2Pick.fichas.filter((f) => !r2Placed[f.id]).map((f) => {
              const sel = r2Selected === f.id;
              return (
                <div key={f.id}
                  className={r2Locked ? "" : "ed-draggable"}
                  onPointerDown={r2Locked ? undefined : makeDragHandler({
                    item: f.id, disabled: r2Locked,
                    ghostHtml: `<div style="background:linear-gradient(180deg,#fce9a8,#e9c45a);color:#3a2608;padding:10px 16px;border-radius:12px;font-family:Fredoka,Nunito,sans-serif;font-weight:800;font-size:15px;border:2px solid #4fd8ff;box-shadow:0 8px 20px rgba(0,0,0,0.5);max-width:260px;text-align:center;">${f.text}</div>`,
                    onTap: r2TapFicha, onDrop: r2PlaceZone,
                  })}
                  style={{
                    padding: "9px 14px", borderRadius: 12, maxWidth: 200, textAlign: "center",
                    background: sel ? "linear-gradient(180deg,#fce9a8,#e9c45a)" : "rgba(255,255,255,0.92)",
                    color: "#3a2608", border: `2px solid ${sel ? "#4fd8ff" : "rgba(116,72,32,0.25)"}`,
                    boxShadow: sel ? "0 0 16px rgba(79,216,255,0.6)" : "0 3px 8px rgba(0,0,0,0.25)",
                    transform: sel ? "translateY(-2px)" : "none",
                    fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 14, lineHeight: 1.15,
                    transition: "all 0.15s ease",
                  }}>
                  {f.text}
                </div>
              );
            })}
            {r2AllPlaced && (
              <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 15, color: "rgba(255,255,255,0.7)", pointerEvents: "none" }}>
                ¡Listo! Pulsa VERIFICAR.
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
            {r2Pick.bins.map((bin) => {
              const color = ELEM_COLOR[bin];
              const inside = r2Pick.fichas.filter((f) => r2Placed[f.id] === bin);
              return (
                <div key={bin} data-dropzone={bin}
                  onClick={() => { if (!r2Locked && r2Selected) r2PlaceZone(bin, r2Selected); }}
                  style={{
                    width: 166, minHeight: 158, borderRadius: 14, padding: "10px 7px 12px",
                    background: "rgba(10,6,35,0.5)", border: `2.5px dashed ${color}`,
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    cursor: (r2Selected && !r2Locked) ? "pointer" : "default",
                  }}>
                  <div style={{ fontSize: 22, lineHeight: 1, pointerEvents: "none" }}>{bin === "detective" ? "🕵️" : bin === "victimario" ? "🎭" : "🔍"}</div>
                  <div style={{
                    fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 12,
                    color: "#fff", background: color, borderRadius: 8, padding: "3px 10px",
                    letterSpacing: "0.03em", boxShadow: "0 2px 6px rgba(0,0,0,0.3)", pointerEvents: "none",
                  }}>{ELEM_LABEL[bin]}</div>
                  {inside.map((f) => {
                    const ok = r2Locked ? f.tipo === bin : null;
                    return (
                      <div key={f.id}
                        className={r2Locked ? "" : "ed-draggable"}
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={r2Locked ? undefined : makeDragHandler({
                          item: f.id, disabled: r2Locked,
                          ghostHtml: `<div style="background:linear-gradient(180deg,#fce9a8,#e9c45a);color:#3a2608;padding:8px 12px;border-radius:10px;font-family:Fredoka,Nunito,sans-serif;font-weight:800;font-size:13px;border:2px solid #4fd8ff;box-shadow:0 8px 20px rgba(0,0,0,0.5);max-width:150px;text-align:center;">${f.text}</div>`,
                          onTap: r2TapFicha, onDrop: r2PlaceZone,
                        })}
                        style={{
                          fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 12,
                          padding: "6px 8px", borderRadius: 8, lineHeight: 1.15, textAlign: "center",
                          background: r2Locked ? (ok ? "linear-gradient(180deg,#2ecc8f,#22a06c)" : "linear-gradient(180deg,#ff6b6b,#dc5050)") : "rgba(255,255,255,0.92)",
                          color: r2Locked ? "#fff" : "#3a2608",
                          boxShadow: "0 2px 5px rgba(0,0,0,0.25)",
                        }}
                        title={r2Locked ? "" : "Arrástralo a otra carpeta (o a la bandeja para sacarlo)"}>
                        {r2Locked ? (ok ? "✓ " : "✗ ") : ""}{f.text}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* R3 — la lupa del detective (marcar pistas) */}
      {ronda === 2 && (
        <div data-qa="zona-central" style={{
          position: "absolute", top: 74, bottom: 14, left: "50%", transform: "translateX(-50%)",
          width: 560, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
        }}>
          <EnunciadoInline text={enunciado} />
          <div style={{ position: "relative", width: "fit-content", maxWidth: 470 }}>
            <div style={{ position: "absolute", top: -16, right: -14, fontSize: 32, transform: "rotate(8deg)", filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.4))", zIndex: 2 }}>🔍</div>
            <div style={{
              padding: "16px 20px", borderRadius: 16, maxWidth: 440,
              background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(244,238,228,0.92))",
              border: "3px solid #f2c260", boxShadow: "0 12px 28px rgba(0,0,0,0.4), inset 0 -4px 0 rgba(0,0,0,0.06)",
            }}>
              <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 13, color: "#a06a28", textAlign: "center", marginBottom: 8, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                {r3Esc.titulo}
              </div>
              {/* Un solo texto corrido; solo las frases marcables se resaltan */}
              <div style={{
                fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 15, lineHeight: 1.85,
                color: "#3a2608", textAlign: "left",
              }}>
                {r3Esc.tokens.map((d, i) => {
                  if (!d.id) return <span key={i}>{d.t}</span>;
                  const marked = r3Marked.has(d.id);
                  const showCorrect = r3Locked && d.pista;
                  const showWrong = r3Locked && marked && !d.pista;
                  let st = {
                    cursor: r3Locked ? "default" : "pointer", padding: "1px 4px", borderRadius: 5,
                    borderBottom: "2px dotted rgba(116,72,32,0.45)", transition: "all 0.15s ease",
                    whiteSpace: "normal", boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone",
                  };
                  if (showCorrect) st = { ...st, background: "rgba(46,204,143,0.92)", color: "#fff", borderBottom: "2px solid #22a06c", fontWeight: 800 };
                  else if (showWrong) st = { ...st, background: "rgba(255,107,107,0.92)", color: "#fff", borderBottom: "2px solid #dc5050", fontWeight: 800, textDecoration: "line-through" };
                  else if (marked) st = { ...st, background: "linear-gradient(180deg,#ffe9a8,#f3d676)", borderBottom: "2px solid #d9a441", fontWeight: 800 };
                  return (
                    <span key={i} role="button" onClick={() => r3Toggle(d.id)} style={st}>
                      {d.t}{showCorrect && " ✓"}
                    </span>
                  );
                })}
              </div>
            </div>
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
  if (app.level === "detectives") return <DetectivesGame key={`d-${tick}`} app={app} setApp={setApp} go={go} onRestart={restart} />;
  if (app.level === "herramientas") return <HerramientasGame key={`h-${tick}`} app={app} setApp={setApp} go={go} onRestart={restart} />;
  return <RelatosGame key={`r-${tick}`} app={app} setApp={setApp} go={go} onRestart={restart} />;
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
  const res = app.lastResult || { category: "Historias y misterios", solved: 0, total: 3, time: 0, starsEarned: 0, log: [] };
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
