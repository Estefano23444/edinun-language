// game-screens.jsx — GameScreen + ResultsScreen para
// "Escritores del mundo real". Juego de 2 niveles por edad:
//   • NIVEL 1 (11 años) — EscrituraGame: "Escritura y tecnología".
//       R1 La máquina del tiempo (ORDENAR la evolución de la escritura)
//       R2 Atrapa lo digital (SHOOTER, tocar lo digital, dejar el papel)
//       R3 El asistente misterioso (ACERTIJO, pistas → herramienta digital)
//   • NIVEL 2 (12 años) — NoticiaGame: "Textos periodísticos: la noticia".
//       R1 Arma la noticia (ORDENAR la pirámide invertida)
//       R2 Caza la opinión (DETECTIVE, tocar la frase que opina)
//       R3 ¿Confiable o trampa? (ACERTIJO binario, detector de fake news)
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
  "Escribir y leer es practicar.",
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
  const currentId = (app && (app.currentCategory || app.level)) || "escritura";
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

// ─── FIFO anti-repetición (compartido, prefijo por ronda) ───────
const RECENT_KEY = "edinun_escritura_noticia_recientes_v1";
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
function OptionButton({ label, locked, isCorrect, isPicked, onClick, color }) {
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

// ─── OrderRound — ordenar N tarjetas en casillas numeradas 1..N ──
// Drag + re-arrastre + bandeja para devolver. items: [{id,n,label,cue}].
// slots/setSlots viven en el padre (para validar). zona/tray ids únicos
// por prefijo para no chocar si hubiera dos en pantalla.
function OrderRound({ items, byId, slots, setSlots, locked, accent = "#a78bfa", ink = "#1a0a3a", slotW = 250, prefix = "o" }) {
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
          ghostHtml: `<div style="background:linear-gradient(180deg,#fce9a8,#e9c45a);color:#3a2608;padding:8px 14px;border-radius:10px;font-family:Fredoka,Nunito,sans-serif;font-weight:800;font-size:15px;border:2px solid #4fd8ff;box-shadow:0 8px 20px rgba(0,0,0,0.5);white-space:nowrap;">${c.label}</div>`,
          onTap: tapCard, onDrop: placeZone,
        })}
        style={{
          padding: c.cue ? "6px 12px" : "9px 14px", borderRadius: 10, textAlign: "center", minWidth: 150, maxWidth: 200,
          background: locked ? (ok ? "linear-gradient(180deg,#2ecc8f,#22a06c)" : "linear-gradient(180deg,#ff6b6b,#dc5050)") : "rgba(255,255,255,0.95)",
          color: locked ? "#fff" : "#3a2608", boxShadow: "0 3px 8px rgba(0,0,0,0.28)",
        }}>
        <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 15, lineHeight: 1.12 }}>
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
        minHeight: 50, minWidth: 340, maxWidth: 430, borderRadius: 12, padding: "4px 8px",
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
              <div style={{
                width: 30, height: 30, flexShrink: 0, borderRadius: 8,
                background: accent, color: ink, fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 16,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{i + 1}</div>
              <div data-dropzone={`slot-${prefix}-${i}`}
                style={{
                  width: slotW, minHeight: 44, borderRadius: 12, padding: "4px 8px",
                  background: "rgba(10,6,35,0.4)",
                  border: `2px dashed ${id ? "rgba(167,139,250,0.25)" : "rgba(167,139,250,0.6)"}`,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
                }}>
                {id ? card(id, ok) : (
                  <span style={{ fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 12, color: "rgba(252,233,168,0.4)", pointerEvents: "none" }}>
                    Suelta aquí el {i + 1}
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
// NIVEL 1 — ESCRITURA Y TECNOLOGÍA (11 años): 3 rondas distintas
// ═════════════════════════════════════════════════════════════

// R1 — La máquina del tiempo de la escritura (ordenar 5 hitos, 1=más
// antiguo → 5=más nuevo). Varios sets rotan con FIFO.
const E1_TIMELINES = [
  { id: "herramientas", items: [
    { id: "h1", n: 1, label: "Tablilla de arcilla" },
    { id: "h2", n: 2, label: "Pergamino" },
    { id: "h3", n: 3, label: "Imprenta" },
    { id: "h4", n: 4, label: "Máquina de escribir" },
    { id: "h5", n: 5, label: "Teclado digital" },
  ] },
  { id: "mensajes", items: [
    { id: "m1", n: 1, label: "Carta a mano" },
    { id: "m2", n: 2, label: "Telégrafo" },
    { id: "m3", n: 3, label: "Correo electrónico" },
    { id: "m4", n: 4, label: "Mensaje de chat" },
    { id: "m5", n: 5, label: "Videollamada" },
  ] },
  { id: "instrumentos", items: [
    { id: "i1", n: 1, label: "Cincel en piedra" },
    { id: "i2", n: 2, label: "Pluma de ave" },
    { id: "i3", n: 3, label: "Lápiz" },
    { id: "i4", n: 4, label: "Bolígrafo" },
    { id: "i5", n: 5, label: "Pantalla táctil" },
  ] },
  { id: "lectura", items: [
    { id: "l1", n: 1, label: "Papiro enrollado" },
    { id: "l2", n: 2, label: "Libro de pergamino" },
    { id: "l3", n: 3, label: "Libro impreso" },
    { id: "l4", n: 4, label: "Libro digital" },
    { id: "l5", n: 5, label: "Audiolibro" },
  ] },
  { id: "guardar", items: [
    { id: "g1", n: 1, label: "Rollos en un ánfora" },
    { id: "g2", n: 2, label: "Fichas de cartón" },
    { id: "g3", n: 3, label: "Disquete" },
    { id: "g4", n: 4, label: "Memoria USB" },
    { id: "g5", n: 5, label: "Nube de internet" },
  ] },
];

// R2 — Atrapa lo digital (shooter). Frases cortas: digitales = atrapar;
// de papel = dejar pasar.
const E2_DIGITAL = [
  "Enviar al instante", "Corregir en un toque", "Corrector de errores",
  "Agregar emojis", "Escribir a la vez", "Buscar en segundos", "Guardar en la nube",
];
const E2_PAPEL = [
  "Borrar con goma", "Guardar en sobre", "La tinta se mancha",
  "Tachar y reescribir", "Pegar una estampilla", "Pasar la hoja",
];

// R3 — El asistente misterioso (acertijo: pistas → herramienta digital).
const E3_ACERTIJOS = [
  { id: "pred", clues: ["Te ayudo mientras escribes en el teléfono.", "Adivino la palabra que vas a poner.", "Completo la frase antes de que termines."],
    answer: "Escritura predictiva", options: ["Escritura predictiva", "Traducción instantánea", "Corrección automática"] },
  { id: "trad", clues: ["Trabajo con muchos idiomas.", "Tomo tu texto y lo cambio de lengua.", "Con un toque lo lees en inglés o kichwa."],
    answer: "Traducción instantánea", options: ["Traducción instantánea", "Escritura predictiva", "Creación con IA"] },
  { id: "corr", clues: ["Reviso lo que ya escribiste.", "Subrayo los errores en rojo.", "Te sugiero cómo mejorar la frase."],
    answer: "Corrección automática", options: ["Corrección automática", "Escritura predictiva", "Colaboración en línea"] },
  { id: "colab", clues: ["Conecto a varias personas a la vez.", "Todos escriben el mismo documento.", "Cada quien ve los cambios al momento."],
    answer: "Colaboración en línea", options: ["Colaboración en línea", "Corrección automática", "Traducción instantánea"] },
  { id: "ia", clues: ["Con pocas palabras creo un texto entero.", "Puedo inventar un cuento o un correo.", "Genero ideas a partir de tu pedido."],
    answer: "Creación con IA", options: ["Creación con IA", "Escritura predictiva", "Colaboración en línea"] },
];

// Shooter "Atrapa lo digital" — frases flotan hacia abajo; tocar las
// digitales (acierto), dejar caer las de papel. Auto-evaluado (§13).
function DigitalShooter({ onFinish }) {
  const DURATION = 8;
  const [bubbles, setBubbles] = useStateG([]);
  const [stats, setStats] = useStateG({ aciertos: 0, errores: 0, perdidas: 0 });
  const [timeLeft, setTimeLeft] = useStateG(DURATION);
  const nextIdRef = useRefG(0);
  const finishedRef = useRefG(false);
  const containerRef = useRefG(null);
  const usedDigRef = useRefG(new Set());
  const usedPapRef = useRefG(new Set());
  const doneRef = useRefG(false);

  // Box 480×300. Velocidad CONSTANTE (sin random) + soltar una burbuja nueva
  // solo cuando la anterior bajó SPAWN_GAP: como todas caen al mismo ritmo,
  // las separaciones verticales se conservan → NUNCA se superponen.
  const BOX_W = 480, BOX_H = 300;
  const SPEED = 2.4;        // px por tick de 40ms → 60px/s (~1.6× más rápido)
  const SPAWN_GAP = 26;     // separación vertical mínima entre burbujas
  const FLOOR = BOX_H - 8;  // y a la que la burbuja sale por abajo

  function estW(t) { return Math.ceil(t.length * 8.2) + 36; }
  function pickPhrase(useDig) {
    const pool = useDig ? E2_DIGITAL : E2_PAPEL;
    const used = useDig ? usedDigRef.current : usedPapRef.current;
    let avail = pool.filter((w) => !used.has(w));
    if (avail.length === 0) { used.clear(); avail = pool; }
    const w = avail[Math.floor(Math.random() * avail.length)];
    used.add(w);
    return w;
  }
  function newBubble() {
    const useDig = Math.random() < 0.6;
    const text = pickPhrase(useDig);
    const id = nextIdRef.current++;
    const w = estW(text);
    const margin = 10;
    const maxX = Math.max(margin, BOX_W - w - margin);
    const x = margin + Math.random() * (maxX - margin);
    return { id, text, isDig: useDig, x, y: -38 };
  }

  useEffectG(() => {
    const tick = setInterval(() => {
      if (finishedRef.current) return;
      setBubbles((bs) => {
        // mover todas al mismo ritmo
        const next = [];
        let perdidasDelta = 0;
        for (const b of bs) {
          const ny = b.y + SPEED;
          if (ny > FLOOR) { if (b.isDig) perdidasDelta++; }
          else next.push({ ...b, y: ny });
        }
        if (perdidasDelta > 0) setStats((s) => ({ ...s, perdidas: s.perdidas + perdidasDelta }));
        // soltar una nueva solo si la más alta ya bajó lo suficiente
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
      const t = setTimeout(() => onFinish(stats), 500);
      return () => clearTimeout(t);
    }
  }, [timeLeft, stats]);

  function handleTap(b) {
    if (finishedRef.current) return;
    setBubbles((bs) => bs.filter((x) => x.id !== b.id));
    if (b.isDig) setStats((s) => ({ ...s, aciertos: s.aciertos + 1 }));
    else setStats((s) => ({ ...s, errores: s.errores + 1 }));
  }

  return (
    <div ref={containerRef} style={{
      position: "relative", width: BOX_W, height: BOX_H, overflow: "hidden",
      borderRadius: 16, background: "rgba(11,58,45,0.45)",
      border: "2px solid rgba(242,194,96,0.4)",
    }}>
      <div style={{
        position: "absolute", top: 8, left: 12, right: 12, zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontFamily: "var(--ed-font-display)", color: "#fce9a8", fontSize: 13, fontWeight: 700,
        pointerEvents: "none",
      }}>
        <div>💻 {stats.aciertos} &nbsp; ✖ {stats.errores}</div>
        <div style={{ color: timeLeft <= 5 ? "#ff8b8b" : "#fce9a8" }}>⏱ {timeLeft}s</div>
      </div>

      {bubbles.map((b) => (
        <button key={b.id} onClick={() => handleTap(b)}
          style={{
            position: "absolute", left: b.x, top: 0,
            // Posición vía transform + transition: la GPU interpola entre los
            // pasos del timer (cada 40ms) → caída fluida, no a saltitos.
            transform: `translateY(${b.y}px)`,
            transition: "transform 0.12s linear",
            willChange: "transform",
            padding: "9px 14px", borderRadius: 999,
            background: "rgba(255,255,255,0.96)", border: "2px solid #f2c260",
            fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 15,
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

function EscrituraGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "Escritura y tecnología · 11 años";

  const [ronda, setRonda] = useStateG(0);
  const [r1Set] = useStateG(() => pickFresh(E1_TIMELINES, "e1"));
  const r1Items = r1Set.items;
  const r1ById = useMemoG(() => { const m = {}; r1Items.forEach((c) => { m[c.id] = c; }); return m; }, [r1Set]);
  const [r1Slots, setR1Slots] = useStateG(() => r1Items.map(() => null));
  const [r1Locked, setR1Locked] = useStateG(false);

  // R2 shooter — auto-evaluado
  const r2DoneRef = useRefG(false);

  // R3 acertijo
  const [r3Pick] = useStateG(() => pickFresh(E3_ACERTIJOS, "e3"));
  const [r3Revealed, setR3Revealed] = useStateG(1);
  const [r3Choice, setR3Choice] = useStateG(null);
  const [r3Locked, setR3Locked] = useStateG(false);
  const [r3Opts] = useStateG(() => shuffle(r3Pick.options));

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

  const canVerify =
    feedback ? false :
    ronda === 0 ? (r1Slots.every(Boolean) && !r1Locked) :
    ronda === 2 ? (r3Choice !== null && !r3Locked) : false;

  function handleVerify() {
    if (!canVerify) return;
    if (ronda === 0) {
      setR1Locked(true);
      const correct = r1Slots.every((id, i) => r1ById[id] && r1ById[id].n === i + 1);
      const u = r1Slots.map((id, i) => `${i + 1}. ${r1ById[id] ? r1ById[id].label : "?"}`).join(" · ");
      const c = r1Items.slice().sort((a, b) => a.n - b.n).map((it) => `${it.n}. ${it.label}`).join(" · ");
      setTimeout(() => answer(correct, u, c, "⏳", "La máquina del tiempo"), correct ? 450 : 1500);
    } else if (ronda === 2) {
      setR3Locked(true);
      const correct = r3Choice === r3Pick.answer;
      setTimeout(() => answer(correct, r3Choice, r3Pick.answer, "🔎", "El asistente misterioso"), correct ? 450 : 1500);
    }
  }

  function handleShooterFinish(s) {
    if (r2DoneRef.current) return;
    r2DoneRef.current = true;
    const correct = s.aciertos >= 4 && s.errores <= 2;
    const u = `${s.aciertos} atrapadas, ${s.errores} fallos`;
    answer(correct, u, "Atrapar solo lo digital", "🎯", "Atrapa lo digital");
  }

  function handleErase() {
    if (ronda === 0 && !r1Locked) setR1Slots(r1Items.map(() => null));
    else if (ronda === 2 && !r3Locked) setR3Choice(null);
  }

  const enunciado =
    ronda === 0 ? "Ordena los inventos de la escritura, del más antiguo al más nuevo." :
    ronda === 1 ? "Atrapa las frases de la escritura digital." :
    "Adivina qué herramienta digital se describe.";
  const bocadillo =
    ronda === 0 ? "Arrastra cada ficha\na su casilla, del 1 al 5." :
    ronda === 1 ? "¡Rápido! Toca\nsolo lo digital." :
    "Toca «Otra pista» si la\nnecesitas y elige la herramienta.";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <GameHUD elapsed={elapsed} stars={stars} attempted={attempted} solved={solved} total={3} app={app} setApp={setApp} />
      <CharacterCorner char={char} message={bocadillo} />

      {/* R1 — La máquina del tiempo (ordenar) */}
      {ronda === 0 && (
        <div data-qa="zona-central" style={{
          position: "absolute", top: 74, bottom: 14, left: "50%", transform: "translateX(-50%)",
          width: 560, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
        }}>
          <EnunciadoInline text={enunciado} />
          <OrderRound items={r1Items} byId={r1ById} slots={r1Slots} setSlots={setR1Slots}
            locked={r1Locked} accent="#4fa0ff" ink="#08264d" slotW={250} prefix="e1" />
        </div>
      )}

      {/* R2 — Atrapa lo digital (shooter) */}
      {ronda === 1 && (
        <div data-qa="zona-central" style={{
          position: "absolute", top: 74, bottom: 14, left: "50%", transform: "translateX(-50%)",
          width: 560, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
        }}>
          <EnunciadoInline text={enunciado} />
          <div style={{ width: "100%", display: "flex", justifyContent: "flex-end" }}>
            <DigitalShooter onFinish={handleShooterFinish} />
          </div>
        </div>
      )}

      {/* R3 — El asistente misterioso (acertijo) */}
      {ronda === 2 && (
        <div data-qa="zona-central" style={{
          position: "absolute", top: 74, bottom: 14, left: "50%", transform: "translateX(-50%)",
          width: 560, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
        }}>
          <EnunciadoInline text={enunciado} />
          <div style={{
            width: "fit-content", maxWidth: 460, padding: "14px 22px", borderRadius: 16,
            background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(244,238,228,0.92))",
            border: "3px solid #f2c260", boxShadow: "0 12px 28px rgba(0,0,0,0.4), inset 0 -4px 0 rgba(0,0,0,0.06)",
            color: "#3a2608",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 22 }}>💬</span>
              <span style={{ fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 16 }}>¿Qué herramienta soy?</span>
            </div>
            {r3Pick.clues.slice(0, r3Revealed).map((c, i) => (
              <div key={i} style={{
                display: "flex", gap: 8, alignItems: "flex-start",
                fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 15, lineHeight: 1.3, marginTop: i ? 6 : 0,
              }}>
                <span style={{ color: "#d9a441", fontWeight: 800 }}>•</span>
                <span style={{ textAlign: "left" }}>{c}</span>
              </div>
            ))}
          </div>
          {r3Revealed < r3Pick.clues.length && !r3Locked ? (
            <button onClick={() => setR3Revealed((n) => Math.min(r3Pick.clues.length, n + 1))}
              style={{
                padding: "8px 18px", borderRadius: 999, border: "2px solid rgba(242,194,96,0.6)",
                background: "rgba(10,6,35,0.5)", color: "#fce9a8",
                fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 13, cursor: "pointer",
              }}>
              🔎 Otra pista ({r3Revealed}/{r3Pick.clues.length})
            </button>
          ) : (
            <div style={{ height: 16 }} />
          )}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", maxWidth: 520 }}>
            {r3Opts.map((opt, i) => (
              <OptionButton key={opt} label={opt} locked={r3Locked}
                isCorrect={opt === r3Pick.answer} isPicked={r3Choice === opt}
                onClick={() => setR3Choice((c) => (c === opt ? null : opt))}
                color={["#4fa0ff", "#e0a23a", "#2ecc8f"][i % 3]} />
            ))}
          </div>
        </div>
      )}

      <ActionRail
        canVerify={canVerify} onVerify={handleVerify}
        hideVerify={ronda === 1}
        showErase={ronda === 0 || ronda === 2} onErase={handleErase}
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
// NIVEL 2 — LA NOTICIA (12 años): 3 rondas distintas
// ═════════════════════════════════════════════════════════════

// R1 — Arma la noticia (ordenar la pirámide invertida: Titular →
// Entrada → Cuerpo → Cierre). Noticias originales rotan con FIFO.
const N1_NEWS = [
  { id: "feria", parts: [
    { id: "fe1", n: 1, label: "Titular", cue: "“La feria del libro abrió sus puertas”" },
    { id: "fe2", n: 2, label: "Entrada", cue: "Ayer empezó la feria con cientos de visitantes." },
    { id: "fe3", n: 3, label: "Cuerpo",  cue: "Hubo cuentacuentos, firmas y talleres para niños." },
    { id: "fe4", n: 4, label: "Cierre",  cue: "La feria seguirá abierta toda la semana." },
  ] },
  { id: "parque", parts: [
    { id: "pa1", n: 1, label: "Titular", cue: "“El parque del barrio estrena juegos”" },
    { id: "pa2", n: 2, label: "Entrada", cue: "Hoy se inauguraron columpios y rampas nuevas." },
    { id: "pa3", n: 3, label: "Cuerpo",  cue: "Los vecinos ayudaron a pintar y sembrar árboles." },
    { id: "pa4", n: 4, label: "Cierre",  cue: "Invitaron a cuidar el lugar entre todos." },
  ] },
  { id: "robot", parts: [
    { id: "ro1", n: 1, label: "Titular", cue: "“Estudiantes ganan un concurso de robótica”" },
    { id: "ro2", n: 2, label: "Entrada", cue: "Un equipo de la escuela ganó el primer lugar." },
    { id: "ro3", n: 3, label: "Cuerpo",  cue: "Los chicos crearon un robot que separa la basura." },
    { id: "ro4", n: 4, label: "Cierre",  cue: "El próximo reto será una competencia nacional." },
  ] },
  { id: "huerto", parts: [
    { id: "hu1", n: 1, label: "Titular", cue: "“La escuela estrena su huerto”" },
    { id: "hu2", n: 2, label: "Entrada", cue: "Hoy los estudiantes cosecharon sus primeras verduras." },
    { id: "hu3", n: 3, label: "Cuerpo",  cue: "Cuidaron lechugas y tomates durante tres meses." },
    { id: "hu4", n: 4, label: "Cierre",  cue: "Las verduras se servirán en el comedor escolar." },
  ] },
  { id: "rescate", parts: [
    { id: "re1", n: 1, label: "Titular", cue: "“Bomberos rescatan a un gato del tejado”" },
    { id: "re2", n: 2, label: "Entrada", cue: "Ayer un gato quedó atrapado en un techo muy alto." },
    { id: "re3", n: 3, label: "Cuerpo",  cue: "Los bomberos usaron una escalera larga para bajarlo." },
    { id: "re4", n: 4, label: "Cierre",  cue: "El gato volvió sano y salvo con su familia." },
  ] },
];

// R2 — Caza la opinión (detective: una frase opina y rompe la
// objetividad). opinionIdx en índice variable. Noticias originales.
const N2_TEXTS = [
  { id: "puente", lines: [
    "El nuevo puente se abrió ayer por la mañana.",
    "La obra tomó dos años de trabajo.",
    "Lamentablemente quedó feo y a nadie le gustó.",
    "Cientos de autos ya cruzan por él cada día.",
  ], opinionIdx: 2 },
  { id: "biblio", lines: [
    "La biblioteca recibió quinientos libros nuevos.",
    "En mi opinión, es la mejor noticia del año.",
    "Los estantes se llenaron en una semana.",
    "El préstamo empieza el próximo lunes.",
  ], opinionIdx: 1 },
  { id: "equipo", lines: [
    "El equipo del colegio ganó el partido el viernes.",
    "El marcador final fue de tres a uno.",
    "Sin duda son los mejores jugadores del planeta.",
    "La final se jugará el sábado que viene.",
  ], opinionIdx: 2 },
  { id: "lluvia", lines: [
    "Una lluvia fuerte cayó sobre la ciudad anoche.",
    "Varias calles del centro se inundaron.",
    "Hoy el agua ya bajó por completo.",
    "Qué descuido tan grande el de las autoridades.",
  ], opinionIdx: 3 },
  { id: "museo", lines: [
    "El museo abrió una sala de dinosaurios.",
    "La entrada será gratis para los estudiantes.",
    "Es la exposición más aburrida de la historia.",
    "Se puede visitar de martes a domingo.",
  ], opinionIdx: 2 },
  { id: "feria2", lines: [
    "Los robots de la feria son lo más genial del mundo.",
    "La feria de ciencias abrió el lunes.",
    "Participaron veinte escuelas de la ciudad.",
    "Los premios se entregarán el viernes.",
  ], opinionIdx: 0 },
];

// R3 — ¿Confiable o trampa? (acertijo binario, detector de fake news).
const N3_HEADLINES = [
  { id: "c1", text: "Un estudio de la universidad muestra que dormir bien mejora la memoria.", confiable: true },
  { id: "c2", text: "El municipio informó que el agua volverá a las 3 de la tarde.", confiable: true },
  { id: "c3", text: "Científicos hallaron una nueva especie de rana en el bosque.", confiable: true },
  { id: "c4", text: "La biblioteca abrirá también los sábados a partir de junio.", confiable: true },
  { id: "t1", text: "¡Increíble! Este truco te hará millonario en un solo día.", confiable: false },
  { id: "t2", text: "Los médicos odian esta fruta que cura todas las enfermedades.", confiable: false },
  { id: "t3", text: "¡Comparte ya o algo malo te pasará esta noche!", confiable: false },
  { id: "t4", text: "Un niño construye una máquina del tiempo en su cuarto, ¡real!", confiable: false },
];

function NoticiaGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "Textos periodísticos: la noticia · 12 años";

  const [ronda, setRonda] = useStateG(0);
  // R1 — ordenar la pirámide
  const [r1Set] = useStateG(() => pickFresh(N1_NEWS, "n1"));
  const r1Items = r1Set.parts;
  const r1ById = useMemoG(() => { const m = {}; r1Items.forEach((c) => { m[c.id] = c; }); return m; }, [r1Set]);
  const [r1Slots, setR1Slots] = useStateG(() => r1Items.map(() => null));
  const [r1Locked, setR1Locked] = useStateG(false);
  // R2 — detective
  const [r2Pick] = useStateG(() => pickFresh(N2_TEXTS, "n2"));
  const [r2Choice, setR2Choice] = useStateG(null);
  const [r2Locked, setR2Locked] = useStateG(false);
  // R3 — confiable o trampa
  const [r3Pick] = useStateG(() => pickFresh(N3_HEADLINES, "n3"));
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

  const canVerify =
    feedback ? false :
    ronda === 0 ? (r1Slots.every(Boolean) && !r1Locked) :
    ronda === 1 ? (r2Choice !== null && !r2Locked) :
    ronda === 2 ? (r3Choice !== null && !r3Locked) : false;

  function handleVerify() {
    if (!canVerify) return;
    if (ronda === 0) {
      setR1Locked(true);
      const correct = r1Slots.every((id, i) => r1ById[id] && r1ById[id].n === i + 1);
      const u = r1Slots.map((id, i) => `${i + 1}. ${r1ById[id] ? r1ById[id].label : "?"}`).join(" · ");
      const c = r1Items.slice().sort((a, b) => a.n - b.n).map((it) => `${it.n}. ${it.label}`).join(" · ");
      setTimeout(() => answer(correct, u, c, "📰", "Arma la noticia"), correct ? 450 : 1500);
    } else if (ronda === 1) {
      setR2Locked(true);
      const correct = r2Choice === r2Pick.opinionIdx;
      setTimeout(() => answer(correct, r2Pick.lines[r2Choice], r2Pick.lines[r2Pick.opinionIdx], "🔍", "Caza la opinión"), correct ? 450 : 1500);
    } else if (ronda === 2) {
      setR3Locked(true);
      const correct = (r3Choice === "CONFIABLE") === r3Pick.confiable;
      setTimeout(() => answer(correct, r3Choice, r3Pick.confiable ? "CONFIABLE" : "TRAMPA", "🛡️", "¿Confiable o trampa?"), correct ? 450 : 1500);
    }
  }

  function handleErase() {
    if (ronda === 0 && !r1Locked) setR1Slots(r1Items.map(() => null));
    else if (ronda === 1 && !r2Locked) setR2Choice(null);
    else if (ronda === 2 && !r3Locked) setR3Choice(null);
  }

  const enunciado =
    ronda === 0 ? "Arma la noticia ordenando sus partes de la más a la menos importante." :
    ronda === 1 ? "Encuentra la frase que opina y rompe la objetividad." :
    "Decide si el titular es confiable o una trampa.";
  const bocadillo =
    ronda === 0 ? "Arrastra cada parte.\nEmpieza por lo más importante." :
    ronda === 1 ? "Toca la parte del texto\nque opina, no informa." :
    "Lee el titular y toca\nconfiable o trampa.";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <GameHUD elapsed={elapsed} stars={stars} attempted={attempted} solved={solved} total={3} app={app} setApp={setApp} />
      <CharacterCorner char={char} message={bocadillo} />

      {/* R1 — Arma la noticia (ordenar) */}
      {ronda === 0 && (
        <div data-qa="zona-central" style={{
          position: "absolute", top: 74, bottom: 14, left: "50%", transform: "translateX(-50%)",
          width: 560, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
        }}>
          <EnunciadoInline text={enunciado} />
          <OrderRound items={r1Items} byId={r1ById} slots={r1Slots} setSlots={setR1Slots}
            locked={r1Locked} accent="#e0a23a" ink="#3a2608" slotW={290} prefix="n1" />
        </div>
      )}

      {/* R2 — Caza la opinión (detective: tocar la frase subjetiva).
          La noticia va en una HOJITA de papel rayado (renglones azules +
          margen rojo + pin), angosta y centrada; cada frase es clicable. */}
      {ronda === 1 && (
        <div data-qa="zona-central" style={{
          position: "absolute", top: 74, bottom: 14, left: "50%", transform: "translateX(-50%)",
          width: 560, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 22,
        }}>
          <EnunciadoInline text={enunciado} />
          <div data-qa="bandeja" style={{
            position: "relative", width: 358, boxSizing: "border-box",
            padding: "30px 22px 22px 46px", borderRadius: 6,
            background: "#fbf7ec",
            backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 31px, rgba(86,120,194,0.28) 31px, rgba(86,120,194,0.28) 32px)",
            backgroundPosition: "0 34px",
            border: "1px solid rgba(0,0,0,0.12)",
            boxShadow: "0 16px 32px rgba(0,0,0,0.45)",
            transform: "rotate(-1.2deg)",
            fontFamily: "var(--ed-font-display)", fontWeight: 400, fontSize: 17,
            color: "#3a3a4a", lineHeight: "32px", textAlign: "left",
          }}>
            {/* Pin de la hojita */}
            <div style={{
              position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)",
              width: 16, height: 16, borderRadius: "50%",
              background: "radial-gradient(circle at 35% 30%, #ff8f8f, #d6463f)",
              boxShadow: "0 3px 6px rgba(0,0,0,0.4)", border: "1px solid rgba(0,0,0,0.15)",
            }} />
            {/* Margen rojo */}
            <div style={{ position: "absolute", top: 0, bottom: 0, left: 34, width: 2, background: "rgba(214,93,77,0.45)" }} />
            {r2Pick.lines.map((line, i) => {
              const sel = r2Choice === i;
              const isOpinion = i === r2Pick.opinionIdx;
              const showCorrect = r2Locked && isOpinion;
              const showWrong = r2Locked && sel && !isOpinion;
              let bg = "transparent", ink = "#3a3a4a";
              if (showCorrect) { bg = "rgba(46,204,143,0.85)"; ink = "#0a3a25"; }
              else if (showWrong) { bg = "rgba(255,120,120,0.85)"; ink = "#5a0a0a"; }
              else if (sel) { bg = "rgba(255,221,120,0.92)"; ink = "#3a3a4a"; }
              return (
                <React.Fragment key={i}>
                  <span onClick={() => { if (!r2Locked) setR2Choice((c) => (c === i ? null : i)); }}
                    style={{
                      cursor: r2Locked ? "default" : "pointer",
                      background: bg, color: ink, borderRadius: 4, padding: "1px 3px",
                      boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone",
                      transition: "background 0.15s ease, color 0.15s ease",
                    }}>{line}</span>{i < r2Pick.lines.length - 1 ? " " : ""}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* R3 — ¿Confiable o trampa? (acertijo binario) */}
      {ronda === 2 && (
        <div data-qa="zona-central" style={{
          position: "absolute", top: 74, bottom: 14, left: "50%", transform: "translateX(-50%)",
          width: 560, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
        }}>
          <EnunciadoInline text={enunciado} />
          <div style={{ position: "relative", width: "fit-content", maxWidth: 360 }}>
            <div style={{ position: "absolute", top: -16, left: -6, fontSize: 28, transform: "rotate(-8deg)", filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.4))" }}>📰</div>
            <Cartel maxWidth={360} fontSize={18} pad="16px 22px">{`“${r3Pick.text}”`}</Cartel>
          </div>
          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            <OptionButton label="CONFIABLE" locked={r3Locked} isCorrect={r3Pick.confiable} isPicked={r3Choice === "CONFIABLE"}
              onClick={() => setR3Choice((c) => (c === "CONFIABLE" ? null : "CONFIABLE"))} color="#2ecc8f" />
            <OptionButton label="TRAMPA" locked={r3Locked} isCorrect={!r3Pick.confiable} isPicked={r3Choice === "TRAMPA"}
              onClick={() => setR3Choice((c) => (c === "TRAMPA" ? null : "TRAMPA"))} color="#ef5a5a" />
          </div>
        </div>
      )}

      <ActionRail
        canVerify={canVerify} onVerify={handleVerify}
        showErase={ronda === 0 || ronda === 2} onErase={handleErase}
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
  if (app.level === "noticia") return <NoticiaGame key={`n-${tick}`} app={app} setApp={setApp} go={go} onRestart={restart} />;
  return <EscrituraGame key={`e-${tick}`} app={app} setApp={setApp} go={go} onRestart={restart} />;
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
  const res = app.lastResult || { category: "Escritura y tecnología", solved: 0, total: 3, time: 0, starsEarned: 0, log: [] };
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
