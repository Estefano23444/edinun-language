// game-screens.jsx — GameScreen + ResultsScreen para "Telón y galaxia".
// Juego de 2 niveles por edad:
//   • NIVEL 1 (11 años) — EntremesGame: "El entremés".
//       R1 La ruleta de los personajes (RULETA: gira → escena → ¿quién es?)
//       R2 Arma tu entremés (ORDENAR Introducción / Nudo / Desenlace)
//       R3 Atrapa la comedia (SHOOTER: entremés clásico sí, teatro moderno no)
//   • NIVEL 2 (13 años) — CienciaFiccionGame: "La ciencia ficción".
//       R1 ¿Utopía o distopía? (CLASIFICAR mundos a dos cajas)
//       R2 El analista narrativo (IDENTIFICAR el elemento narrativo)
//       R3 Detective de fuentes (investigar criterios → veredicto confiable)
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
  const currentId = (app && (app.currentCategory || app.level)) || "entremes";
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
        position: "absolute", top: 66, left: "50%", transform: "translateX(-50%)",
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
// Bloquea TODOS los ítems vistos menos los más antiguos: así un ejercicio
// no vuelve a salir hasta haber mostrado todos los demás del banco (sin
// repeticiones al recargar). El primer arranque sigue siendo aleatorio.
const RECENT_KEY = "edinun_telon_galaxia_recientes_v2";
const RECENT_LIMIT = 120;
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
  // Bloquea hasta N-1 recientes → solo deja libres los que llevan más
  // tiempo sin aparecer (ciclo completo antes de repetir).
  const windowN = Math.max(1, bank.length - 1);
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
// rotula cada casilla (ej. Introducción / Nudo / Desenlace).
function OrderRound({ items, byId, slots, setSlots, locked, accent = "#a78bfa", ink = "#1a0a3a", slotW = 250, prefix = "o", slotLabels = null }) {
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
              <div style={{ width: slotLabels ? 92 : 30, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
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

// ─── BinsRound — clasificar fichas en 2 (o más) cajas ───────────
// fichas: [{id,text,tipo}]. bins: [{id,label,emoji,color}]. placed:
// {fichaId: binId}. Drag + re-arrastre + tap-para-seleccionar.
function BinsRound({ fichas, bins, placed, setPlaced, locked }) {
  const [selected, setSelected] = useStateG(null);
  const TRAY = "__trayBins";

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
  const allPlaced = fichas.every((f) => placed[f.id]);

  const ghost = (text) => `<div style="background:linear-gradient(180deg,#fce9a8,#e9c45a);color:#3a2608;padding:9px 14px;border-radius:12px;font-family:Fredoka,Nunito,sans-serif;font-weight:700;font-size:14px;border:2px solid #4fd8ff;box-shadow:0 8px 20px rgba(0,0,0,0.5);max-width:230px;text-align:center;">${text}</div>`;

  return (
    <>
      {/* Bandeja de fichas por clasificar */}
      <div data-dropzone={TRAY} data-qa="bandeja" style={{
        display: "flex", gap: 9, flexWrap: "wrap", justifyContent: "center", alignItems: "center",
        minHeight: 52, maxWidth: 470, borderRadius: 12, padding: "4px 8px",
      }}>
        {trayFichas.map((f) => {
          const sel = selected === f.id;
          return (
            <div key={f.id}
              className={locked ? "" : "ed-draggable"}
              onPointerDown={locked ? undefined : makeDragHandler({
                item: f.id, disabled: locked, ghostHtml: ghost(f.text),
                onTap: tapFicha, onDrop: placeZone,
              })}
              style={{
                padding: "9px 13px", borderRadius: 12, maxWidth: 220, textAlign: "center",
                background: sel ? "linear-gradient(180deg,#fce9a8,#e9c45a)" : "rgba(255,255,255,0.93)",
                color: "#3a2608", border: `2px solid ${sel ? "#4fd8ff" : "rgba(116,72,32,0.25)"}`,
                boxShadow: sel ? "0 0 16px rgba(79,216,255,0.6)" : "0 3px 8px rgba(0,0,0,0.25)",
                transform: sel ? "translateY(-2px)" : "none",
                fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 13.5, lineHeight: 1.2,
                transition: "all 0.15s ease",
              }}>
              {f.text}
            </div>
          );
        })}
        {allPlaced && (
          <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 14, color: "rgba(255,255,255,0.7)", pointerEvents: "none" }}>
            ¡Listo! Pulsa VERIFICAR.
          </div>
        )}
      </div>
      {/* Cajas */}
      <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
        {bins.map((bin) => {
          const inside = fichas.filter((f) => placed[f.id] === bin.id);
          return (
            <div key={bin.id} data-dropzone={bin.id}
              onClick={() => tapBin(bin.id)}
              style={{
                width: 200, minHeight: 168, borderRadius: 14, padding: "10px 8px 12px",
                background: "rgba(10,6,35,0.5)", border: `2.5px dashed ${bin.color}`,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 7,
                cursor: (selected && !locked) ? "pointer" : "default",
              }}>
              <div style={{ fontSize: 24, lineHeight: 1, pointerEvents: "none" }}>{bin.emoji}</div>
              <div style={{
                fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 13,
                color: "#fff", background: bin.color, borderRadius: 8, padding: "3px 12px",
                letterSpacing: "0.03em", boxShadow: "0 2px 6px rgba(0,0,0,0.3)", pointerEvents: "none",
              }}>{bin.label}</div>
              {bin.hint && (
                <div style={{
                  fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 11,
                  color: "rgba(252,233,168,0.85)", marginTop: -2, fontStyle: "italic", pointerEvents: "none",
                }}>{bin.hint}</div>
              )}
              {inside.map((f) => {
                const ok = locked ? f.tipo === bin.id : null;
                return (
                  <div key={f.id}
                    className={locked ? "" : "ed-draggable"}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={locked ? undefined : makeDragHandler({
                      item: f.id, disabled: locked, ghostHtml: ghost(f.text),
                      onTap: tapFicha, onDrop: placeZone,
                    })}
                    style={{
                      fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 12.5,
                      padding: "6px 9px", borderRadius: 9, lineHeight: 1.2, textAlign: "center", width: "100%",
                      background: locked ? (ok ? "linear-gradient(180deg,#2ecc8f,#22a06c)" : "linear-gradient(180deg,#ff6b6b,#dc5050)") : "rgba(255,255,255,0.93)",
                      color: locked ? "#fff" : "#3a2608", boxShadow: "0 2px 5px rgba(0,0,0,0.25)",
                    }}
                    title={locked ? "" : "Arrástralo a la otra caja o a la bandeja"}>
                    {locked ? (ok ? "✓ " : "✗ ") : ""}{f.text}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Ruleta — rueda decorativa con sorteo animado ───────────────
const SECTOR_COLORS = ["#ef5a5a", "#4fa0ff", "#2ecc8f", "#f2a73b", "#a78bfa", "#ff8a3a"];
const RULETA_EMOJIS = ["🎭", "🤡", "🃏", "👑", "🎪", "🥸"];

function polarTop(cx, cy, r, deg) {
  const rad = (deg * Math.PI) / 180; // 0 = arriba, sentido horario
  return [cx + r * Math.sin(rad), cy - r * Math.cos(rad)];
}
function sectorPath(cx, cy, r, a0, a1) {
  const [x0, y0] = polarTop(cx, cy, r, a0);
  const [x1, y1] = polarTop(cx, cy, r, a1);
  return `M${cx},${cy} L${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 0 1 ${x1.toFixed(2)},${y1.toFixed(2)} Z`;
}

// RuletaPersonajes — gira la rueda (sorpresa teatral), revela la escena
// sorteada y deja elegir el personaje. Devuelve fragmentos flex.
function RuletaPersonajes({ pick, landed, choice, locked, onLanded, onChoose }) {
  const [rotation, setRotation] = useStateG(0);
  const [spinning, setSpinning] = useStateG(false);
  const spunRef = useRefG(false);
  const N = 6;
  const seg = 360 / N;
  const R = 74, C = 84;

  function spin() {
    if (spinning || spunRef.current) return;
    spunRef.current = true;
    setSpinning(true);
    const targetIdx = Math.floor(Math.random() * N);
    const jitter = Math.random() * (seg - 24) - (seg - 24) / 2;
    setRotation(360 * 5 - targetIdx * seg + jitter);
    setTimeout(() => { setSpinning(false); onLanded(true); }, 2350);
  }

  return (
    <>
      {/* Ruleta + puntero */}
      <div data-qa="bandeja" style={{ position: "relative", width: 168, height: 176 }}>
        <div style={{
          position: "absolute", top: -2, left: "50%", transform: "translateX(-50%)",
          width: 0, height: 0,
          borderLeft: "11px solid transparent", borderRight: "11px solid transparent",
          borderTop: "18px solid #fce9a8",
          filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.5))", zIndex: 3,
        }} />
        <div style={{
          position: "absolute", top: 10, left: 0, width: 168, height: 168,
          transition: spinning ? "transform 2.3s cubic-bezier(0.17,0.67,0.21,1)" : "none",
          transform: `rotate(${rotation}deg)`,
        }}>
          <svg viewBox="0 0 168 168" width="168" height="168" style={{ display: "block" }}>
            <circle cx={C} cy={C} r={R + 4} fill="#3a1608" stroke="#fce9a8" strokeWidth="3" />
            {RULETA_EMOJIS.map((_, i) => (
              <path key={i}
                d={sectorPath(C, C, R, i * seg - seg / 2, i * seg + seg / 2)}
                fill={SECTOR_COLORS[i % SECTOR_COLORS.length]}
                stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
            ))}
            {RULETA_EMOJIS.map((em, i) => {
              const [ex, ey] = polarTop(C, C, R * 0.62, i * seg);
              return (
                <text key={`e${i}`} x={ex} y={ey + 7} textAnchor="middle"
                  style={{ fontSize: 21 }}>{em}</text>
              );
            })}
            <circle cx={C} cy={C} r="13" fill="#fce9a8" stroke="#d9a441" strokeWidth="2" />
          </svg>
        </div>
      </div>

      {!landed ? (
        <button onClick={spin} disabled={spinning}
          style={{
            marginTop: 2, padding: "11px 32px", borderRadius: 14,
            border: "2.5px solid #f2c260",
            background: spinning ? "rgba(255,255,255,0.4)" : "linear-gradient(180deg,#ffe97a,#d7b12a)",
            color: "#3a2608", fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 19,
            letterSpacing: "0.06em", cursor: spinning ? "default" : "pointer",
            boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
          }}>
          {spinning ? "GIRANDO…" : "🎡 GIRAR"}
        </button>
      ) : (
        <>
          <Cartel maxWidth={430} fontSize={16} pad="11px 18px">{pick.text}</Cartel>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", maxWidth: 520 }}>
            {pick.options.map((opt, i) => (
              <OptionButton key={opt} label={opt} locked={locked}
                isCorrect={opt === pick.answer} isPicked={choice === opt}
                onClick={() => onChoose(opt)}
                color={["#ef5a5a", "#4fa0ff", "#2ecc8f"][i % 3]} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

// ═════════════════════════════════════════════════════════════
// NIVEL 1 — EL ENTREMÉS (11 años): 3 rondas distintas
// ═════════════════════════════════════════════════════════════

// Personajes típicos del entremés (etiquetas amables reutilizadas en
// opciones). Cada escena describe con claridad el rasgo del personaje.
const P_SACRISTAN = "El sacristán";
const P_DESPISTADO = "El despistado";
const P_SOLDADO = "El soldado presumido";
const P_ESTUDIANTE = "El estudiante";
const P_ANCIANO = "El anciano confiado";

// R1 — La ruleta de los personajes (escenas originales, FIFO).
const T1_ESCENAS = [
  { id: "e1", text: "Cuida la iglesia, toca las campanas para llamar a misa y guarda las llaves del templo.", answer: P_SACRISTAN, options: [P_SACRISTAN, P_DESPISTADO, P_SOLDADO] },
  { id: "e2", text: "Vive en la sacristía, entre velas y libros sagrados, y prepara todo para la ceremonia.", answer: P_SACRISTAN, options: [P_SACRISTAN, P_ANCIANO, P_ESTUDIANTE] },
  { id: "e3", text: "Es tan distraído que le piden traer pan y regresa con una piedra sin darse cuenta.", answer: P_DESPISTADO, options: [P_DESPISTADO, P_ANCIANO, P_ESTUDIANTE] },
  { id: "e4", text: "Se confunde con todo y a cada rato olvida lo que iba a hacer.", answer: P_DESPISTADO, options: [P_DESPISTADO, P_SOLDADO, P_SACRISTAN] },
  { id: "e5", text: "Lleva espada y uniforme y presume de mil batallas, aunque nunca peleó de verdad.", answer: P_SOLDADO, options: [P_SOLDADO, P_SACRISTAN, P_DESPISTADO] },
  { id: "e6", text: "Cuenta historias de gigantes que venció, pero se asusta apenas escucha un trueno.", answer: P_SOLDADO, options: [P_SOLDADO, P_ANCIANO, P_ESTUDIANTE] },
  { id: "e7", text: "Siempre carga sus libros y, como tiene poco dinero, es muy ingenioso para resolver sus apuros.", answer: P_ESTUDIANTE, options: [P_ESTUDIANTE, P_DESPISTADO, P_SOLDADO] },
  { id: "e8", text: "Estudia día y noche y usa su ingenio para salir de cualquier enredo.", answer: P_ESTUDIANTE, options: [P_ESTUDIANTE, P_ANCIANO, P_SACRISTAN] },
  { id: "e9", text: "Es un abuelo que cree todo lo que le cuentan y confía en cualquier persona.", answer: P_ANCIANO, options: [P_ANCIANO, P_DESPISTADO, P_ESTUDIANTE] },
  { id: "e10", text: "Le prometen venderle la luna y él, muy confiado, acepta el trato encantado.", answer: P_ANCIANO, options: [P_ANCIANO, P_SOLDADO, P_SACRISTAN] },
];

// R2 — Arma tu entremés (ordenar Introducción / Nudo / Desenlace).
const T2_OBRAS = [
  { id: "pan", parts: [
    { id: "pa1", n: 1, label: "El despistado entra a la plaza buscando trabajo de panadero." },
    { id: "pa2", n: 2, label: "Confunde la harina con el azúcar y el pan sale dulce y salado." },
    { id: "pa3", n: 3, label: "Todos ríen, prueban el pan raro y se lo compran igual." },
  ] },
  { id: "moneda", parts: [
    { id: "mo1", n: 1, label: "El sacristán encuentra una moneda en el suelo de la iglesia." },
    { id: "mo2", n: 2, label: "El abuelo y el estudiante conversan sobre quién la vio primero." },
    { id: "mo3", n: 3, label: "La moneda resulta de juguete y los tres terminan riéndose." },
  ] },
  { id: "soldado", parts: [
    { id: "so1", n: 1, label: "El soldado presumido llega al pueblo contando sus hazañas." },
    { id: "so2", n: 2, label: "Le piden que espante a un ratón y sale corriendo asustado." },
    { id: "so3", n: 3, label: "El pueblo descubre que exageraba y todos ríen con cariño." },
  ] },
  { id: "boda", parts: [
    { id: "bo1", n: 1, label: "Un abuelo quiere casarse con la joven más lista del pueblo." },
    { id: "bo2", n: 2, label: "Ella le propone adivinanzas divertidas que él no logra resolver." },
    { id: "bo3", n: 3, label: "El abuelo se rinde y la joven gana con su ingenio." },
  ] },
  { id: "remedio", parts: [
    { id: "re1", n: 1, label: "Un estudiante se hace pasar por médico en la feria." },
    { id: "re2", n: 2, label: "Receta cosquillas y saltos para curar el dolor de muelas." },
    { id: "re3", n: 3, label: "El enfermo ríe tanto que olvida el dolor y le paga feliz." },
  ] },
];

// R3 — Atrapa la comedia (shooter). Rasgos del entremés = atrapar;
// rasgos del teatro moderno = dejar pasar.
const T3_ENTREMES = [
  "Un solo acto", "Hace reír", "Lenguaje coloquial", "Gestos grotescos",
  "Personajes del pueblo", "Peleas y persecuciones", "Dura pocos minutos", "Final con moraleja",
];
const T3_MODERNO = [
  "Dura dos horas", "Efectos especiales", "Grandes decorados",
  "Pantallas gigantes", "Escenas de drama", "Música en vivo",
];

// Shooter "Atrapa la comedia" — tarjetas flotan hacia abajo; tocar las
// del entremés (acierto), dejar caer las del teatro moderno. (§13)
function ComediaShooter({ onFinish }) {
  const DURATION = 10;
  const [bubbles, setBubbles] = useStateG([]);
  const [stats, setStats] = useStateG({ aciertos: 0, errores: 0, perdidas: 0 });
  const [timeLeft, setTimeLeft] = useStateG(DURATION);
  const nextIdRef = useRefG(0);
  const finishedRef = useRefG(false);
  const usedSiRef = useRefG(new Set());
  const usedNoRef = useRefG(new Set());
  const doneRef = useRefG(false);

  const BOX_W = 480, BOX_H = 300;
  const SPEED = 2.4;
  const SPAWN_GAP = 26;
  const FLOOR = BOX_H - 8;

  function estW(t) { return Math.ceil(t.length * 8.2) + 36; }
  function pickPhrase(useSi) {
    const pool = useSi ? T3_ENTREMES : T3_MODERNO;
    const used = useSi ? usedSiRef.current : usedNoRef.current;
    let avail = pool.filter((w) => !used.has(w));
    if (avail.length === 0) { used.clear(); avail = pool; }
    const w = avail[Math.floor(Math.random() * avail.length)];
    used.add(w);
    return w;
  }
  function newBubble() {
    const useSi = Math.random() < 0.6;
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
      const t = setTimeout(() => onFinish(stats), 500);
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
      borderRadius: 16, background: "rgba(58,22,8,0.4)",
      border: "2px solid rgba(242,194,96,0.4)",
    }}>
      <div style={{
        position: "absolute", top: 8, left: 12, right: 12, zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontFamily: "var(--ed-font-display)", color: "#fce9a8", fontSize: 13, fontWeight: 700,
        pointerEvents: "none",
      }}>
        <div>🎭 {stats.aciertos} &nbsp; ✖ {stats.errores}</div>
        <div style={{ color: timeLeft <= 5 ? "#ff8b8b" : "#fce9a8" }}>⏱ {timeLeft}s</div>
      </div>

      {bubbles.map((b) => (
        <button key={b.id} onClick={() => handleTap(b)}
          style={{
            position: "absolute", left: b.x, top: 0,
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
        }}>¡Telón!</div>
      )}
    </div>
  );
}

function EntremesGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "El entremés · 11 años";

  const [ronda, setRonda] = useStateG(0);
  // R1 — ruleta
  const [r1Pick] = useStateG(() => pickFresh(T1_ESCENAS, "t1"));
  const [r1Opts] = useStateG(() => ({ ...r1Pick, options: shuffle(r1Pick.options) }));
  const [r1Landed, setR1Landed] = useStateG(false);
  const [r1Choice, setR1Choice] = useStateG(null);
  const [r1Locked, setR1Locked] = useStateG(false);
  // R2 — ordenar I/N/D
  const [r2Set] = useStateG(() => pickFresh(T2_OBRAS, "t2"));
  const r2Items = r2Set.parts;
  const r2ById = useMemoG(() => { const m = {}; r2Items.forEach((c) => { m[c.id] = c; }); return m; }, [r2Set]);
  const [r2Slots, setR2Slots] = useStateG(() => r2Items.map(() => null));
  const [r2Locked, setR2Locked] = useStateG(false);
  // R3 — shooter
  const r3DoneRef = useRefG(false);

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
    ronda === 0 ? (r1Landed && r1Choice !== null && !r1Locked) :
    ronda === 1 ? (r2Slots.every(Boolean) && !r2Locked) : false;

  function handleVerify() {
    if (!canVerify) return;
    if (ronda === 0) {
      setR1Locked(true);
      const correct = r1Choice === r1Pick.answer;
      setTimeout(() => answer(correct, r1Choice, r1Pick.answer, "🎭", "La ruleta de los personajes"), correct ? 450 : 1500);
    } else if (ronda === 1) {
      setR2Locked(true);
      const correct = r2Slots.every((id, i) => r2ById[id] && r2ById[id].n === i + 1);
      const u = r2Slots.map((id, i) => `${i + 1}. ${r2ById[id] ? r2ById[id].label : "?"}`).join(" · ");
      const c = r2Items.slice().sort((a, b) => a.n - b.n).map((it) => `${it.n}. ${it.label}`).join(" · ");
      setTimeout(() => answer(correct, u, c, "🎬", "Arma tu entremés"), correct ? 450 : 1500);
    }
  }

  function handleShooterFinish(s) {
    if (r3DoneRef.current) return;
    r3DoneRef.current = true;
    const correct = s.aciertos >= 4 && s.errores <= 2;
    const u = `${s.aciertos} atrapadas, ${s.errores} fallos`;
    answer(correct, u, "Atrapar solo lo del entremés", "🎯", "Atrapa la comedia");
  }

  function handleErase() {
    if (ronda === 0 && !r1Locked) setR1Choice(null);
    else if (ronda === 1 && !r2Locked) setR2Slots(r2Items.map(() => null));
  }

  const enunciado =
    ronda === 0 ? "Gira la ruleta y descubre qué personaje protagoniza la escena." :
    ronda === 1 ? "Ordena las escenas del entremés: Introducción, Nudo y Desenlace." :
    "Atrapa solo lo que pertenece al entremés clásico.";
  const bocadillo =
    ronda === 0 ? "Gira, lee la escena y\ntoca el personaje correcto." :
    ronda === 1 ? "Arrastra cada escena\na su casilla en orden." :
    "¡Rápido! Toca lo que\npertenece al entremés.";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <GameHUD elapsed={elapsed} stars={stars} attempted={attempted} solved={solved} total={3} app={app} setApp={setApp} />
      <CharacterCorner char={char} message={bocadillo} />

      {/* R1 — La ruleta de los personajes */}
      {ronda === 0 && (
        <div data-qa="zona-central" style={{
          position: "absolute", top: 74, bottom: 14, left: "50%", transform: "translateX(-50%)",
          width: 560, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
        }}>
          <EnunciadoInline text={enunciado} />
          <RuletaPersonajes pick={r1Opts} landed={r1Landed} choice={r1Choice} locked={r1Locked}
            onLanded={() => setR1Landed(true)} onChoose={(opt) => setR1Choice((c) => (c === opt ? null : opt))} />
        </div>
      )}

      {/* R2 — Arma tu entremés (ordenar) */}
      {ronda === 1 && (
        <div data-qa="zona-central" style={{
          position: "absolute", top: 74, bottom: 14, left: "50%", transform: "translateX(-50%)",
          width: 560, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
        }}>
          <EnunciadoInline text={enunciado} />
          <OrderRound items={r2Items} byId={r2ById} slots={r2Slots} setSlots={setR2Slots}
            locked={r2Locked} accent="#e0561a" ink="#3a1608" slotW={250} prefix="t2"
            slotLabels={["Introducción", "Nudo", "Desenlace"]} />
        </div>
      )}

      {/* R3 — Atrapa la comedia (shooter) */}
      {ronda === 2 && (
        <div data-qa="zona-central" style={{
          position: "absolute", top: 74, bottom: 14, left: "50%", transform: "translateX(-50%)",
          width: 560, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
        }}>
          <EnunciadoInline text={enunciado} />
          <div style={{ width: "100%", display: "flex", justifyContent: "flex-end" }}>
            <ComediaShooter onFinish={handleShooterFinish} />
          </div>
        </div>
      )}

      <ActionRail
        canVerify={canVerify} onVerify={handleVerify}
        hideVerify={ronda === 2}
        showErase={ronda === 0 || ronda === 1} onErase={handleErase}
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
// NIVEL 2 — LA CIENCIA FICCIÓN (13 años): 3 rondas distintas
// ═════════════════════════════════════════════════════════════

// R1 — ¿Utopía o distopía? (clasificar mundos a dos cajas, FIFO de sets).
const CF_MUNDOS = [
  { id: "setA", fichas: [
    { id: "a1", text: "La ciudad vive en armonía con la naturaleza.", tipo: "utopia" },
    { id: "a2", text: "Las máquinas ayudan y nadie pasa hambre.", tipo: "utopia" },
    { id: "a3", text: "Todos comparten el saber sin fronteras.", tipo: "utopia" },
    { id: "a4", text: "Las máquinas vigilan cada paso de la gente.", tipo: "distopia" },
    { id: "a5", text: "Nadie puede salir de las cúpulas grises.", tipo: "distopia" },
    { id: "a6", text: "Un solo jefe decide qué se puede pensar.", tipo: "distopia" },
  ] },
  { id: "setB", fichas: [
    { id: "b1", text: "El aire es limpio y los robots cuidan los bosques.", tipo: "utopia" },
    { id: "b2", text: "Cada persona recibe lo necesario para vivir bien.", tipo: "utopia" },
    { id: "b3", text: "Las ciudades flotantes conviven en paz.", tipo: "utopia" },
    { id: "b4", text: "Los humanos sirven a las máquinas sin descanso.", tipo: "distopia" },
    { id: "b5", text: "Una pantalla controla lo que todos sienten.", tipo: "distopia" },
    { id: "b6", text: "El agua se vende a precio de oro.", tipo: "distopia" },
  ] },
  { id: "setC", fichas: [
    { id: "c1", text: "La tecnología cura todas las enfermedades.", tipo: "utopia" },
    { id: "c2", text: "Los viajes a las estrellas son para todos.", tipo: "utopia" },
    { id: "c3", text: "Nadie teme al futuro porque todos colaboran.", tipo: "utopia" },
    { id: "c4", text: "Un virus convirtió la Tierra en un desierto.", tipo: "distopia" },
    { id: "c5", text: "Solo los poderosos respiran aire puro.", tipo: "distopia" },
    { id: "c6", text: "Los recuerdos se borran por orden del poder.", tipo: "distopia" },
  ] },
];
const CF_BINS = [
  { id: "utopia", label: "UTOPÍA", emoji: "🌅", color: "#2ecc8f", hint: "mundo ideal y feliz" },
  { id: "distopia", label: "DISTOPÍA", emoji: "🌑", color: "#a05ad8", hint: "mundo injusto y triste" },
];

// R2 — El analista narrativo (identificar el elemento narrativo).
const CF_FRAGMENTOS = [
  { id: "n1", frag: "Floté hacia la nave. Yo no sabía qué pensaban los demás, solo veía sus rostros asustados.", pregunta: "El narrador es:", answer: "Protagonista", options: ["Protagonista", "Omnisciente", "Observador"] },
  { id: "n2", frag: "El capitán ocultaba su miedo. La androide, en cambio, soñaba con ser libre, aunque nadie lo notara.", pregunta: "El narrador es:", answer: "Omnisciente", options: ["Omnisciente", "Testigo", "Protagonista"] },
  { id: "n3", frag: "El robot encendió sus luces y avanzó. Desde fuera, nada revelaba qué calculaba su mente.", pregunta: "El narrador es:", answer: "Observador", options: ["Observador", "Omnisciente", "Protagonista"] },
  { id: "n4", frag: "Vi cómo mi hermano subía a la cápsula. Él era el héroe; yo solo conté lo que pasó.", pregunta: "El narrador es:", answer: "Testigo", options: ["Testigo", "Protagonista", "Omnisciente"] },
  { id: "t1", frag: "Las alarmas ya sonaban y el meteoro caía cuando empezó nuestra historia.", pregunta: "El tiempo del relato es:", answer: "In media res", options: ["In media res", "Lineal", "Analepsis"] },
  { id: "t2", frag: "Mientras huía por el túnel, recordó el día en que la Tierra aún era azul.", pregunta: "El tiempo del relato es:", answer: "Analepsis", options: ["Analepsis", "Prolepsis", "Lineal"] },
  { id: "t3", frag: "Aún no lo sabía, pero años después comandaría la última nave de la humanidad.", pregunta: "El tiempo del relato es:", answer: "Prolepsis", options: ["Prolepsis", "Analepsis", "Lineal"] },
  { id: "t4", frag: "Primero despegamos, luego cruzamos el cinturón de asteroides y al fin llegamos a Marte.", pregunta: "El tiempo del relato es:", answer: "Lineal", options: ["Lineal", "In media res", "Prolepsis"] },
  { id: "a1", frag: "El comandante Vega hará todo lo posible para impedir que la nave despegue.", pregunta: "Vega es el/la:", answer: "Oponente", options: ["Oponente", "Ayudante", "Sujeto"] },
  { id: "a2", frag: "La vieja androide guía a la niña por los túneles y la protege del peligro.", pregunta: "La androide es el/la:", answer: "Ayudante", options: ["Ayudante", "Oponente", "Objeto"] },
  { id: "sp1", frag: "La aventura ocurre en la ciudad de Quito, que el lector puede reconocer en un mapa.", pregunta: "El espacio es:", answer: "Real", options: ["Real", "Imaginario", "Ficticio"] },
  { id: "sp2", frag: "La historia pasa en una Tierra del futuro, parecida a la nuestra pero cubierta de hielo.", pregunta: "El espacio es:", answer: "Imaginario", options: ["Imaginario", "Real", "Ficticio"] },
  { id: "sp3", frag: "Todo sucede en el planeta Zyrax, un mundo inventado que no aparece en ningún mapa.", pregunta: "El espacio es:", answer: "Ficticio", options: ["Ficticio", "Real", "Imaginario"] },
];

// Definición corta de cada opción (se muestra bajo el botón para que el
// niño sepa qué significa cada tipo de narrador, tiempo, espacio o actante).
const CF_DEFS = {
  // Narrador
  "Omnisciente": "lo sabe todo",
  "Observador": "solo mira desde fuera",
  "Protagonista": "cuenta su propia historia",
  "Testigo": "vio lo que le pasó a otro",
  // Tiempo
  "Lineal": "en orden, del inicio al fin",
  "In media res": "empieza en plena acción",
  "Analepsis": "recuerda algo del pasado",
  "Prolepsis": "adelanta algo del futuro",
  // Espacio
  "Real": "un lugar que existe de verdad",
  "Imaginario": "inventado a partir de uno real",
  "Ficticio": "inventado por completo",
  // Actantes
  "Sujeto": "quiere lograr algo",
  "Objeto": "lo que se desea",
  "Ayudante": "ayuda al protagonista",
  "Oponente": "pone obstáculos",
};

// R3 — Detective de fuentes (investigar criterios → veredicto).
const CF_CRITERIOS = [
  { key: "autor", label: "Tiene autor" },
  { key: "entidad", label: "Respaldo de una entidad" },
  { key: "actual", label: "Información actual" },
  { key: "ortografia", label: "Buena ortografía" },
];
const CF_FUENTES = [
  { id: "f1", titulo: "La clonación y la ética",
    meta: "Revista de Ciencias Médicas · 2023 · Universidad Central",
    met: { autor: true, entidad: true, actual: true, ortografia: true }, confiable: true },
  { id: "f2", titulo: "¡La cura secreta que nadie te dice!",
    meta: "Blog anónimo · sin fecha",
    met: { autor: false, entidad: false, actual: false, ortografia: false }, confiable: false },
  { id: "f3", titulo: "Viajes a Marte para todos",
    meta: "Autor: J. Ramos · 2009 · página personal",
    met: { autor: true, entidad: false, actual: false, ortografia: true }, confiable: false },
  { id: "f4", titulo: "Hallan una nueva especie de planta",
    meta: "Diario El Universo · 2024 · con expertos citados",
    met: { autor: true, entidad: true, actual: true, ortografia: true }, confiable: true },
  { id: "f5", titulo: "El clima del planeta cambia",
    meta: "Revista científica · 2015 · autores citados",
    met: { autor: true, entidad: true, actual: false, ortografia: true }, confiable: true },
  { id: "f6", titulo: "Comparte o algo malo pasará",
    meta: "Cadena de mensajes · sin autor",
    met: { autor: false, entidad: false, actual: false, ortografia: false }, confiable: false },
];

function FuenteDetective({ fuente, marks, toggleMark, choice, onChoose, locked }) {
  return (
    <>
      {/* Ficha de la fuente */}
      <div style={{ position: "relative", width: "fit-content", maxWidth: 430 }}>
        <div style={{ position: "absolute", top: -16, right: -12, fontSize: 30, transform: "rotate(8deg)", filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.4))", zIndex: 2 }}>🔍</div>
        <div style={{
          padding: "13px 20px", borderRadius: 16, maxWidth: 430,
          background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(244,238,228,0.92))",
          border: "3px solid #f2c260", boxShadow: "0 12px 28px rgba(0,0,0,0.4), inset 0 -4px 0 rgba(0,0,0,0.06)",
          textAlign: "center",
        }}>
          <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 17, color: "#3a2608", lineHeight: 1.2 }}>
            “{fuente.titulo}”
          </div>
          <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 12.5, color: "#8a6a3a", marginTop: 4 }}>
            {fuente.meta}
          </div>
        </div>
      </div>

      {/* Criterios marcables (la investigación) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: "fit-content" }}>
        {CF_CRITERIOS.map((cr) => {
          const marked = marks.has(cr.key);
          const met = fuente.met[cr.key];
          const showCorrect = locked && met;
          const showWrong = locked && marked && !met;
          let bg = "rgba(255,255,255,0.92)", border = "rgba(116,72,32,0.3)", ink = "#3a2608", icon = marked ? "☑" : "☐";
          if (showCorrect) { bg = "linear-gradient(180deg,#2ecc8f,#22a06c)"; border = "#2ecc8f"; ink = "#fff"; icon = "✓"; }
          else if (showWrong) { bg = "linear-gradient(180deg,#ff6b6b,#dc5050)"; border = "#ff6b6b"; ink = "#fff"; icon = "✗"; }
          else if (marked) { bg = "linear-gradient(180deg,#fce9a8,#e9c45a)"; border = "#4fd8ff"; }
          return (
            <button key={cr.key} onClick={() => { if (!locked) toggleMark(cr.key); }} disabled={locked}
              style={{
                display: "flex", alignItems: "center", gap: 7, minWidth: 188,
                padding: "8px 12px", borderRadius: 11, border: `2px solid ${border}`, background: bg, color: ink,
                fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 13, cursor: locked ? "default" : "pointer",
                boxShadow: marked && !locked ? "0 0 12px rgba(79,216,255,0.5)" : "0 2px 6px rgba(0,0,0,0.2)",
                transition: "all 0.15s ease",
              }}>
              <span style={{ fontSize: 16 }}>{icon}</span>{cr.label}
            </button>
          );
        })}
      </div>

      {/* Veredicto */}
      <div style={{ display: "flex", gap: 14, justifyContent: "center", alignItems: "center" }}>
        <span style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.85)" }}>Veredicto:</span>
        <OptionButton label="CONFIABLE" locked={locked} isCorrect={fuente.confiable} isPicked={choice === "CONFIABLE"}
          onClick={() => onChoose("CONFIABLE")} color="#2ecc8f" minWidth={132} />
        <OptionButton label="NO CONFIABLE" locked={locked} isCorrect={!fuente.confiable} isPicked={choice === "NO CONFIABLE"}
          onClick={() => onChoose("NO CONFIABLE")} color="#ef5a5a" minWidth={132} />
      </div>
    </>
  );
}

function CienciaFiccionGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "La ciencia ficción · 13 años";

  const [ronda, setRonda] = useStateG(0);
  // R1 — clasificar
  const [r1Set] = useStateG(() => pickFresh(CF_MUNDOS, "cf1"));
  const r1Fichas = r1Set.fichas;
  const [r1Placed, setR1Placed] = useStateG({});
  const [r1Locked, setR1Locked] = useStateG(false);
  // R2 — identificar
  const [r2Pick] = useStateG(() => pickFresh(CF_FRAGMENTOS, "cf2"));
  const [r2Opts] = useStateG(() => shuffle(r2Pick.options));
  const [r2Choice, setR2Choice] = useStateG(null);
  const [r2Locked, setR2Locked] = useStateG(false);
  // R3 — detective de fuentes
  const [r3Pick] = useStateG(() => pickFresh(CF_FUENTES, "cf3"));
  const [r3Marks, setR3Marks] = useStateG(() => new Set());
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

  const r1AllPlaced = r1Fichas.every((f) => r1Placed[f.id]);

  const canVerify =
    feedback ? false :
    ronda === 0 ? (r1AllPlaced && !r1Locked) :
    ronda === 1 ? (r2Choice !== null && !r2Locked) :
    ronda === 2 ? (r3Choice !== null && !r3Locked) : false;

  function handleVerify() {
    if (!canVerify) return;
    if (ronda === 0) {
      setR1Locked(true);
      const correct = r1Fichas.every((f) => r1Placed[f.id] === f.tipo);
      const u = `${r1Fichas.filter((f) => r1Placed[f.id] === f.tipo).length}/${r1Fichas.length} bien clasificados`;
      setTimeout(() => answer(correct, u, "Cada mundo en su caja", "🗂️", "¿Utopía o distopía?"), correct ? 450 : 1500);
    } else if (ronda === 1) {
      setR2Locked(true);
      const correct = r2Choice === r2Pick.answer;
      setTimeout(() => answer(correct, r2Choice, r2Pick.answer, "🔬", "El analista narrativo"), correct ? 450 : 1500);
    } else if (ronda === 2) {
      setR3Locked(true);
      const correct = (r3Choice === "CONFIABLE") === r3Pick.confiable;
      setTimeout(() => answer(correct, r3Choice, r3Pick.confiable ? "CONFIABLE" : "NO CONFIABLE", "🔍", "Detective de fuentes"), correct ? 450 : 1500);
    }
  }

  function handleErase() {
    if (ronda === 0 && !r1Locked) setR1Placed({});
    else if (ronda === 1 && !r2Locked) setR2Choice(null);
    else if (ronda === 2 && !r3Locked) { setR3Marks(new Set()); setR3Choice(null); }
  }

  function toggleMark(key) {
    setR3Marks((prev) => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  }

  const enunciado =
    ronda === 0 ? "Clasifica cada mundo según el futuro que imagina." :
    ronda === 1 ? "Descubre el elemento narrativo del fragmento." :
    "Investiga la fuente y decide si es confiable.";
  const bocadillo =
    ronda === 0 ? "Arrastra cada mundo\na utopía o distopía." :
    ronda === 1 ? "Lee el fragmento y toca\nla opción correcta." :
    "Marca los criterios que cumple\ny da tu veredicto.";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <GameHUD elapsed={elapsed} stars={stars} attempted={attempted} solved={solved} total={3} app={app} setApp={setApp} />
      <CharacterCorner char={char} message={bocadillo} />

      {/* R1 — ¿Utopía o distopía? (clasificar) */}
      {ronda === 0 && (
        <div data-qa="zona-central" style={{
          position: "absolute", top: 74, bottom: 14, left: "50%", transform: "translateX(-50%)",
          width: 600, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
        }}>
          <EnunciadoInline text={enunciado} />
          <BinsRound fichas={r1Fichas} bins={CF_BINS} placed={r1Placed} setPlaced={setR1Placed} locked={r1Locked} />
        </div>
      )}

      {/* R2 — El analista narrativo (identificar) */}
      {ronda === 1 && (
        <div data-qa="zona-central" style={{
          position: "absolute", top: 74, bottom: 14, left: "50%", transform: "translateX(-50%)",
          width: 560, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
        }}>
          <EnunciadoInline text={enunciado} />
          <div style={{ position: "relative", width: "fit-content", maxWidth: 460 }}>
            <div style={{ position: "absolute", top: -16, right: -12, fontSize: 30, transform: "rotate(8deg)", filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.4))" }}>🔬</div>
            <Cartel maxWidth={430} fontSize={16} pad="14px 22px">{r2Pick.frag}</Cartel>
          </div>
          <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 15, color: "#fce9a8", textShadow: "0 2px 6px rgba(0,0,0,0.6)" }}>
            {r2Pick.pregunta}
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", alignItems: "flex-start", maxWidth: 540 }}>
            {r2Opts.map((opt, i) => (
              <div key={opt} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, maxWidth: 168 }}>
                <OptionButton label={opt} locked={r2Locked}
                  isCorrect={opt === r2Pick.answer} isPicked={r2Choice === opt}
                  onClick={() => setR2Choice((c) => (c === opt ? null : opt))}
                  color={["#4fa0ff", "#e0a23a", "#2ecc8f"][i % 3]} />
                {CF_DEFS[opt] && (
                  <div style={{
                    fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 11.5,
                    color: "rgba(252,233,168,0.85)", fontStyle: "italic", textAlign: "center",
                    lineHeight: 1.2, maxWidth: 150, pointerEvents: "none",
                  }}>{CF_DEFS[opt]}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* R3 — Detective de fuentes */}
      {ronda === 2 && (
        <div data-qa="zona-central" style={{
          position: "absolute", top: 74, bottom: 14, left: "50%", transform: "translateX(-50%)",
          width: 560, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
        }}>
          <EnunciadoInline text={enunciado} />
          <FuenteDetective fuente={r3Pick} marks={r3Marks} toggleMark={toggleMark}
            choice={r3Choice} onChoose={(v) => setR3Choice((c) => (c === v ? null : v))} locked={r3Locked} />
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
  if (app.level === "cienciaficcion") return <CienciaFiccionGame key={`c-${tick}`} app={app} setApp={setApp} go={go} onRestart={restart} />;
  return <EntremesGame key={`e-${tick}`} app={app} setApp={setApp} go={go} onRestart={restart} />;
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
  const res = app.lastResult || { category: "El entremés", solved: 0, total: 3, time: 0, starsEarned: 0, log: [] };
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
