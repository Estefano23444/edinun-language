// game-screens.jsx — GameScreen + ResultsScreen para JUEGO-25
// "Otras palabras, otros mundos" (TEMA 2 del libro EDINUN, 14 años):
// ¿Por qué el mundo se ve diferente según la lengua? ¿Realmente se ve
// diferente? 1 nivel, 3 rondas con mecánicas DISTINTAS (estándar 7+):
//   R1 — Detector de estereotipos: DESLIZAR cartas. Aparece un mensaje
//        publicitario; el estudiante lo desliza a la izquierda (ESTEREOTIPO)
//        o a la derecha (INCLUSIVO). Auto-evaluado (§13), sin VERIFICAR.
//   R2 — Rescata la lengua: TOCAR acciones. Un tablero de acciones; toca
//        las que mantienen viva la lengua y evita las que la debilitan.
//        Barra de vitalidad. Auto-evaluado (§13), sin VERIFICAR.
//   R3 — El medidor: ¿mito o verdad? DESLIZAR el marcador. Una afirmación
//        sobre la lengua y el pensamiento; arrastra el marcador a "Es un
//        mito · A medias · Es verdad". VERIFICAR manual (3 afirmaciones).
//
// Contenido basado SOLO en las capturas del libro (hipótesis de Sapir-Whorf,
// relatividad lingüística, estereotipos en la publicidad y desaparición de
// las lenguas). Vocabulario ecuatoriano neutro. El shell (HUD, personaje,
// enunciado, action rail, modales, feedback, reporte, scoring por tiempo) se
// hereda del estándar. Personaje por defecto: Rolli (escritor).

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
  "Cada lengua es una forma de ver el mundo 🌎",
  "Equivocarse también es aprender.",
  "Respira y vuelve a intentarlo.",
  "Mira bien las palabras: ahí está la pista.",
  "¡La próxima es tuya!",
  "Piensa qué dice de verdad el mensaje.",
];

// ─────────────────────────────────────────────────────────────
// FIFO anti-repetición por categoría en un solo key de localStorage.
// Ventana ≈ floor(N/2) por categoría.
// ─────────────────────────────────────────────────────────────
const RECENT_KEY = "edinun_juego25_recientes_v1";
const RECENT_LIMIT = 40;

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
// Elige N ítems frescos distintos bloqueando los ~floor(N/2) más recientes de
// su categoría; nunca vacía el pool y procura no repetir lo último jugado.
function pickFreshN(bank, prefix, idOf, n) {
  const out = [];
  const used = new Set();
  const pre = prefix + ":";
  for (let k = 0; k < n; k++) {
    const recentIds = getRecent().filter((x) => x.startsWith(pre)).map((x) => x.slice(pre.length));
    const windowN = Math.floor(bank.length / 2);
    const blocked = new Set(recentIds.slice(0, windowN));
    let pool = bank.filter((b) => !blocked.has(idOf(b)) && !used.has(idOf(b)));
    if (pool.length === 0) pool = bank.filter((b) => !used.has(idOf(b)));
    if (pool.length === 0) pool = bank;
    const p = pool[Math.floor(Math.random() * pool.length)];
    used.add(idOf(p));
    pushRecent(pre + idOf(p));
    out.push(p);
  }
  return out;
}

// ═════════════════════════════════════════════════════════════
// BANCOS DE DATOS — TEMA 2 (la lengua y la percepción · estereotipos ·
// desaparición de las lenguas). Tomado de las capturas del libro.
// ═════════════════════════════════════════════════════════════

// R1 — DESLIZAR. ESTEREOTIPOS: los 8 mensajes listados textualmente en la
// página "Los estereotipos en la publicidad". INCLUSIVOS: su versión justa
// (aplicar el concepto del libro, sin inventar datos nuevos).
const R1_ESTEREOTIPOS = [
  { id: "e1", text: "La mujer es la encargada de la limpieza y las tareas del hogar." },
  { id: "e2", text: "Solo los hombres disfrutan los deportes." },
  { id: "e3", text: "A los niños les gusta el celeste y a las niñas el rosado." },
  { id: "e4", text: "La mujer siempre debe ser guapa y lucir bien." },
  { id: "e5", text: "Los hombres manejan autos grandes y las mujeres no." },
  { id: "e6", text: "Los hombres saben de tecnología y pueden arreglarlo todo." },
  { id: "e7", text: "El hombre es fuerte y exitoso." },
  { id: "e8", text: "El jefe es malvado y siempre grita a los trabajadores." },
];
const R1_INCLUSIVOS = [
  { id: "i1", text: "En casa, las tareas del hogar se reparten entre todos." },
  { id: "i2", text: "Tanto mujeres como hombres disfrutan los deportes." },
  { id: "i3", text: "Cada niña o niño elige los colores y juegos que prefiere." },
  { id: "i4", text: "Una persona vale por quién es, no por su apariencia." },
  { id: "i5", text: "Cualquier persona puede conducir cualquier auto." },
  { id: "i6", text: "Cualquier persona puede aprender de tecnología." },
  { id: "i7", text: "La fuerza y el éxito no dependen del género." },
  { id: "i8", text: "Un buen jefe escucha y respeta a su equipo." },
];

// R2 — TOCAR. Acciones que MANTIENEN viva una lengua vs acciones que la
// DEBILITAN, ligadas a lo que dice el libro: la transmisión de tradiciones y
// costumbres sostiene las lenguas; la urbanización, la asimilación cultural y
// el reemplazo por un idioma dominante las hacen desaparecer.
const R2_BUENAS = [
  { id: "b1", text: "Enseñarla a los niños y jóvenes" },
  { id: "b2", text: "Hablarla en casa y en la comunidad" },
  { id: "b3", text: "Mantener vivas sus tradiciones y costumbres" },
  { id: "b4", text: "Compartir sus cuentos y canciones" },
  { id: "b5", text: "Sentir orgullo por la lengua propia" },
  { id: "b6", text: "Celebrar sus fiestas y relatos en familia" },
];
const R2_MALAS = [
  { id: "m1", text: "Dejar de hablarla por la asimilación cultural" },
  { id: "m2", text: "Reemplazarla por un solo idioma dominante" },
  { id: "m3", text: "Abandonar sus tradiciones y costumbres" },
  { id: "m4", text: "No transmitirla a las nuevas generaciones" },
  { id: "m5", text: "Avergonzarse de hablar la lengua propia" },
  { id: "m6", text: "Usarla cada vez menos hasta olvidarla" },
];

// R3 — DESLIZAR marcador. Afirmaciones sobre la lengua y el pensamiento,
// tomadas de la página de la hipótesis de Sapir-Whorf. zone: 0 = "Es un mito",
// 1 = "A medias", 2 = "Es verdad", según lo que aclara el propio libro
// (la lengua influye, pero no determina ni impide comprender).
const R3_MEDIDOR = [
  { id: "s1", text: "Si tu idioma no tiene una palabra para algo, no puedes pensar en ello.", zone: 0,
    explica: "Es un mito: aunque falte la palabra exacta, cualquier idea puede expresarse con una explicación. No hay nada que un idioma no pueda decir." },
  { id: "s2", text: "Dos personas que hablan idiomas distintos nunca logran entenderse.", zone: 0,
    explica: "Es un mito: las diferencias entre lenguas no son tan grandes como para impedir la comunicación; los significados se pueden explicar." },
  { id: "s3", text: "El número 92 se piensa exactamente igual en todos los idiomas.", zone: 0,
    explica: "Es un mito: el francés y el español arman el 92 de maneras distintas. Cada lengua organiza los números a su modo." },
  { id: "s4", text: "La lengua que hablas controla por completo todo lo que puedes pensar.", zone: 0,
    explica: "Es un mito: el lenguaje influye en cómo percibimos, pero no determina por completo nuestro pensamiento." },
  { id: "s5", text: "El idioma que hablas dirige aquello en lo que te fijas.", zone: 2,
    explica: "Es verdad: la lengua orienta nuestra atención y nuestro pensamiento hacia ciertos aspectos del mundo." },
  { id: "s6", text: "Hay palabras, como el japonés «amaoto», sin una sola palabra equivalente en español.", zone: 2,
    explica: "Es verdad: amaoto nombra el sonido relajante de la lluvia; en español lo decimos con varias palabras." },
  { id: "s7", text: "Hablar varios idiomas aporta más perspectivas y ayuda a la memoria.", zone: 2,
    explica: "Es verdad: conocer varias lenguas ofrece distintas perspectivas y beneficia la memoria y el pensamiento." },
  { id: "s8", text: "Es más fácil recordar algo cuando tu lengua tiene una palabra para eso.", zone: 2,
    explica: "Es verdad: recordamos mejor lo que podemos nombrar con una palabra específica." },
  { id: "s9", text: "La lengua influye en cómo percibimos el mundo, pero no nos impide entenderlo.", zone: 1,
    explica: "Va a medias, y es la idea más equilibrada: la lengua influye en la percepción, aunque no determina ni limita lo que podemos comprender." },
  { id: "s10", text: "Quien solo nombra colores «claros» y «oscuros» percibe los colores de otra manera.", zone: 1,
    explica: "Va a medias: cambia en qué se fija y cómo los clasifica, pero su vista percibe los mismos colores." },
];

const ZONE_LABELS = ["Es un mito", "A medias", "Es verdad"];

// ─────────────────────────────────────────────────────────────
// makeProblem por ronda (una sola vez por montaje del juego)
// ─────────────────────────────────────────────────────────────
function makeProblemR1() {
  const est = pickFreshN(R1_ESTEREOTIPOS, "est", (x) => x.id, 4);
  const inc = pickFreshN(R1_INCLUSIVOS, "inc", (x) => x.id, 4);
  const deck = shuffle([
    ...est.map((c) => ({ ...c, isEstereotipo: true })),
    ...inc.map((c) => ({ ...c, isEstereotipo: false })),
  ]);
  return { deck };
}
function makeProblemR2() {
  const buenas = pickFreshN(R2_BUENAS, "buena", (x) => x.id, 3).map((c) => ({ ...c, good: true }));
  const malas = pickFreshN(R2_MALAS, "mala", (x) => x.id, 3).map((c) => ({ ...c, good: false }));
  return { cards: shuffle([...buenas, ...malas]) };
}
function makeProblemR3() {
  return { stmts: pickFreshN(R3_MEDIDOR, "med", (x) => x.id, 3) };
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
        .ed-draggable { touch-action: none; user-select: none; -webkit-user-select: none; }
        @keyframes ed-shake-x {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
      <LenguaGame key={`lengua-${restartTick}`} app={app} setApp={setApp} go={go} onRestart={restart} />
    </>
  );
}

function LenguaGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "Otras palabras, otros mundos";

  const [ronda, setRonda] = useStateG(0);

  // Picks por ronda (una sola vez por montaje).
  const [r1Pick] = useStateG(() => makeProblemR1());
  const [r2Pick] = useStateG(() => makeProblemR2());
  const [r3Pick] = useStateG(() => makeProblemR3());

  // R1 — swipe (auto-evaluado)
  const r1DoneRef = useRefG(false);
  // R2 — rescate (auto-evaluado)
  const r2DoneRef = useRefG(false);
  // R3 — medidor: estado controlado por el padre; se califica con VERIFICAR.
  const [r3StmtIdx, setR3StmtIdx] = useStateG(0);
  const [r3Zone, setR3Zone] = useStateG(null);
  const [r3Locked, setR3Locked] = useStateG(false);
  const r3CorrectRef = useRefG(0);
  const r3AutoRef = useRefG(null);
  const r3ZoneRef = useRefG(null);

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
  useEffectG(() => () => clearTimeout(r3AutoRef.current), []);

  // Las 3 rondas se AUTO-EVALÚAN (R1 deslizar, R2 rescate, R3 medidor al soltar),
  // así que no hay VERIFICAR manual en ninguna.
  const canVerify = false;

  function handleSwipeFinish(s) {
    if (r1DoneRef.current) return;
    r1DoneRef.current = true;
    const correct = s.aciertos >= 6;
    const u = `${s.aciertos}/${s.total} bien clasificadas`;
    answer(correct, u, "Distinguir estereotipo vs inclusión", "📺", "Detector de estereotipos", null);
  }

  function handleRescateFinish(res) {
    if (r2DoneRef.current) return;
    r2DoneRef.current = true;
    const correct = res.errores <= 1;
    const u = `${res.salvadas}/${res.total} acciones que la salvan`;
    answer(correct, u, "Elegir solo acciones que la mantienen viva", "🪶", "Rescata la lengua", null);
  }

  // R3 (medidor) AUTO: tras soltar el marcador y una breve pausa, se califica
  // sola (con ventana para recolocarlo). Muestra feedback, revela la zona
  // correcta y avanza (o termina la ronda).
  function gradeR3() {
    if (r3Locked) return;
    const stmt = r3Pick.stmts[r3StmtIdx];
    const zone = r3ZoneRef.current;
    if (zone === null) return;
    const ok = zone === stmt.zone;
    if (ok) r3CorrectRef.current += 1;
    setR3Locked(true);
    const last = r3StmtIdx + 1 >= r3Pick.stmts.length;
    setTimeout(() => {
      if (last) {
        const correct = r3CorrectRef.current >= 2;
        const u = `${r3CorrectRef.current}/${r3Pick.stmts.length} afirmaciones ubicadas`;
        answer(correct, u, "Ubicar bien al menos 2 de 3 afirmaciones", "🌎", "El medidor: ¿mito o verdad?", null);
      } else {
        setR3StmtIdx((p) => p + 1);
        setR3Zone(null);
        r3ZoneRef.current = null;
        setR3Locked(false);
      }
    }, ok ? 1900 : 4400);
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
    ronda === 0 ? "Decide si cada mensaje refuerza un estereotipo o es inclusivo." :
    ronda === 1 ? "Elige las acciones que mantienen viva la lengua." :
    "Ubica cuánta razón tiene cada afirmación.";
  const bocadillo =
    ronda === 0 ? "Desliza la carta:\nizquierda si es estereotipo,\nderecha si es inclusiva." :
    ronda === 1 ? "Toca solo las acciones\nque ayudan a que la\nlengua siga viva." :
    "Arrastra el marcador:\n¿es un mito, va a medias\no es verdad?";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <GameHUD elapsed={elapsed} stars={stars} attempted={attempted} solved={solved} total={3} />
      <CharacterCorner char={char} message={bocadillo} />
      <GameEnunciado text={enunciado} top={ronda === 0 ? 100 : 108} />

      {ronda === 0 && (
        <EstereotipoSwipe deck={r1Pick.deck} onFinish={handleSwipeFinish} />
      )}

      {ronda === 1 && (
        <RescateLengua cards={r2Pick.cards} onFinish={handleRescateFinish} />
      )}

      {ronda === 2 && (
        <MedidorLengua
          key={`med-${r3StmtIdx}`}
          stmt={r3Pick.stmts[r3StmtIdx]}
          idx={r3StmtIdx}
          total={r3Pick.stmts.length}
          locked={r3Locked}
          chosenZone={r3Zone}
          onPick={(z) => { if (!r3Locked) { setR3Zone(z); r3ZoneRef.current = z; } }}
          onSettle={() => {
            if (r3Locked) return;
            clearTimeout(r3AutoRef.current);
            r3AutoRef.current = setTimeout(() => gradeR3(), 900);
          }}
        />
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
// R1 · Detector de estereotipos (DESLIZAR, §13). Aparece un mensaje
// publicitario; el estudiante lo desliza a la izquierda (ESTEREOTIPO) o a la
// derecha (INCLUSIVO). También hay dos botones para tocar. Auto-evaluado:
// se logra con aciertos ≥ 6 de 8.
// ─────────────────────────────────────────────────────────────
function EstereotipoSwipe({ deck, onFinish }) {
  const [idx, setIdx] = useStateG(0);
  const [drag, setDrag] = useStateG(0);
  const [flyOut, setFlyOut] = useStateG(null); // { dir }
  const [result, setResult] = useStateG(null); // { correct, real } — feedback por carta
  const aciertosRef = useRefG(0);
  const erroresRef = useRefG(0);
  const lockRef = useRefG(false);
  const draggingRef = useRefG(false);
  const startXRef = useRefG(0);
  const THRESH = 80;

  const card = deck[idx];

  function decide(dir) {
    if (lockRef.current || !card) return;
    lockRef.current = true;
    draggingRef.current = false;
    const chosenEstereotipo = dir < 0;
    const correct = chosenEstereotipo === card.isEstereotipo;
    if (correct) aciertosRef.current += 1; else erroresRef.current += 1;
    // 1) Feedback con la carta centrada (✓/✗ + la respuesta correcta).
    setResult({ correct, real: card.isEstereotipo });
    setDrag(0);
    setTimeout(() => {
      // 2) La carta sale volando hacia el lado elegido.
      setFlyOut({ dir });
      setDrag(dir * 520);
      setTimeout(() => {
        const next = idx + 1;
        setFlyOut(null);
        setResult(null);
        lockRef.current = false;
        if (next >= deck.length) {
          onFinish({ aciertos: aciertosRef.current, errores: erroresRef.current, total: deck.length });
        } else {
          setIdx(next);
          setDrag(0);
        }
      }, 420);
    }, 1300);
  }

  function onPointerDown(e) {
    if (lockRef.current) return;
    draggingRef.current = true;
    startXRef.current = e.clientX;
    if (e.currentTarget.setPointerCapture) {
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    }
  }
  function onPointerMove(e) {
    if (!draggingRef.current) return;
    setDrag(e.clientX - startXRef.current);
  }
  function onPointerUp() {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    // Decidir según la posición ACTUAL de la carta (drag), no recalcular con
    // e.clientX: en un pointercancel ese dato llega inválido y mandaba la carta
    // siempre a la izquierda. Así cuenta el lado real al que la arrastraste.
    if (drag > THRESH) decide(1);
    else if (drag < -THRESH) decide(-1);
    else setDrag(0);
  }
  function onPointerCancel() {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (!lockRef.current) setDrag(0);
  }

  const tilt = Math.max(-14, Math.min(14, drag / 12));
  const leftHint = Math.max(0, Math.min(1, -drag / THRESH));
  const rightHint = Math.max(0, Math.min(1, drag / THRESH));

  return (
    <div data-qa="zona-central" style={{
      position: "absolute", top: 122, bottom: 14, left: "50%", transform: "translateX(-50%)",
      width: 460, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-evenly", gap: 8,
    }}>
      <div style={{
        fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 12,
        color: "#fce9a8", letterSpacing: "0.04em",
      }}>
        Carta {Math.min(idx + 1, deck.length)} de {deck.length}
      </div>

      {/* Carta deslizable */}
      <div style={{ position: "relative", width: 320, height: 156 }}>
        {card && (
          <div
            className="ed-draggable"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            style={{
              position: "absolute", inset: 0,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              textAlign: "center", padding: "12px 18px",
              borderRadius: 18,
              background: "linear-gradient(180deg, #ffffff, #eef2ff)",
              border: result
                ? `3px solid ${result.correct ? "#2ecc8f" : "#ff6b6b"}`
                : "3px solid #f2c260",
              boxShadow: "0 14px 30px rgba(0,0,0,0.45)",
              color: "#1c2440",
              cursor: lockRef.current ? "default" : "grab",
              transform: `translateX(${drag}px) rotate(${tilt}deg)`,
              transition: draggingRef.current ? "none" : "transform 0.45s cubic-bezier(0.2,0.8,0.2,1), opacity 0.45s",
              opacity: flyOut ? 0 : 1,
              touchAction: "none",
            }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>📺</div>
            <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 15, lineHeight: 1.22 }}>
              “{card.text}”
            </div>

            {/* Feedback: etiqueta limpia DEBAJO del texto (no lo tapa) */}
            {result && (
              <div style={{
                marginTop: 9, fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 13.5,
                color: result.correct ? "#1e8a5d" : "#c33b3b",
              }}>
                {result.correct ? "¡Correcto!" : `Era ${result.real ? "estereotipo" : "inclusivo"}`}
              </div>
            )}

            {/* Insignia ✓/✗ en la esquina de la carta */}
            {result && (
              <span style={{
                position: "absolute", top: -13, right: -13, width: 32, height: 32, borderRadius: "50%",
                background: result.correct ? "#2ecc8f" : "#ff6b6b", color: "#fff", fontSize: 18, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "3px solid #fff", boxShadow: "0 3px 10px rgba(0,0,0,0.4)",
                animation: "ed-pop-in 0.3s",
              }}>{result.correct ? "✓" : "✗"}</span>
            )}

            {/* Pistas que aparecen al arrastrar */}
            <div style={{
              position: "absolute", top: 12, left: 12, opacity: leftHint,
              background: "#ff6b6b", color: "#fff", borderRadius: 8, padding: "3px 9px",
              fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 12, letterSpacing: "0.04em",
              transform: "rotate(-10deg)",
            }}>ESTEREOTIPO</div>
            <div style={{
              position: "absolute", top: 12, right: 12, opacity: rightHint,
              background: "#2ecc8f", color: "#fff", borderRadius: 8, padding: "3px 9px",
              fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 12, letterSpacing: "0.04em",
              transform: "rotate(10deg)",
            }}>INCLUSIVO</div>
          </div>
        )}
      </div>

      {/* Botones de decisión (alternativa al deslizar) */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button onClick={() => decide(-1)} disabled={lockRef.current}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 16px", borderRadius: 12,
            border: "2px solid #ff6b6b", background: "rgba(255,107,107,0.16)",
            color: "#ffd9d9", fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 13,
            cursor: "pointer", letterSpacing: "0.03em",
          }}>
          ⬅️ ESTEREOTIPO
        </button>
        <button onClick={() => decide(1)} disabled={lockRef.current}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 16px", borderRadius: 12,
            border: "2px solid #2ecc8f", background: "rgba(46,204,143,0.16)",
            color: "#d4ffe9", fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 13,
            cursor: "pointer", letterSpacing: "0.03em",
          }}>
          INCLUSIVO ➡️
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// R2 · Rescata la lengua (TOCAR, §13). Tablero de 6 acciones (3 que la
// salvan, 3 que la debilitan). Toca las buenas: la barra de vitalidad sube;
// si tocas una mala, baja y cuenta error. Auto-evaluado: se logra encontrando
// las 3 buenas con ≤ 1 error.
// ─────────────────────────────────────────────────────────────
function RescateLengua({ cards, onFinish }) {
  const goodTotal = cards.filter((c) => c.good).length;
  const [picked, setPicked] = useStateG({}); // id -> "ok" | "bad"
  const [vit, setVit] = useStateG(0);
  const erroresRef = useRefG(0);
  const foundRef = useRefG(0);
  const doneRef = useRefG(false);
  const timerRef = useRefG(null);

  useEffectG(() => () => clearTimeout(timerRef.current), []);

  function tap(c) {
    if (doneRef.current || picked[c.id]) return;
    if (c.good) {
      foundRef.current += 1;
      setPicked((p) => ({ ...p, [c.id]: "ok" }));
      setVit((v) => Math.min(100, v + Math.ceil(100 / goodTotal)));
      if (foundRef.current >= goodTotal && !doneRef.current) {
        doneRef.current = true;
        timerRef.current = setTimeout(
          () => onFinish({ salvadas: foundRef.current, errores: erroresRef.current, total: goodTotal }), 750
        );
      }
    } else {
      erroresRef.current += 1;
      setPicked((p) => ({ ...p, [c.id]: "bad" }));
      // Una acción incorrecta NO baja la barra; simplemente no la sube.
    }
  }

  const vitColor = vit >= 66 ? "#2ecc8f" : vit >= 33 ? "#f2c260" : "#ff6b6b";

  return (
    <div data-qa="zona-central" style={{
      position: "absolute", top: 120, bottom: 14, left: "50%", transform: "translateX(-50%)",
      width: 460, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14,
    }}>
      {/* Barra de vitalidad */}
      <div style={{ width: 360 }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4,
          fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 12, color: "#fce9a8",
        }}>
          <span>🪶 Vitalidad de la lengua</span>
          <span>{foundRef.current}/{goodTotal}</span>
        </div>
        <div style={{
          width: "100%", height: 16, borderRadius: 999, overflow: "hidden",
          background: "rgba(0,0,0,0.35)", border: "1.5px solid rgba(242,194,96,0.45)",
        }}>
          <div style={{
            width: `${vit}%`, height: "100%", background: vitColor,
            transition: "width 0.35s ease, background 0.35s ease",
            boxShadow: "0 0 12px currentColor",
          }} />
        </div>
      </div>

      {/* Tablero de acciones */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: 420 }}>
        {cards.map((c) => {
          const state = picked[c.id];
          let bg = "linear-gradient(180deg, #ffffff, #eef2ff)", border = "rgba(242,194,96,0.5)", ink = "#1c2440";
          if (state === "ok") { bg = "linear-gradient(180deg,#eafff5,#c6efda)"; border = "#2ecc8f"; }
          else if (state === "bad") { bg = "linear-gradient(180deg,#ffe3e3,#ffc4c4)"; border = "#ff6b6b"; }
          return (
            <button key={c.id}
              onClick={() => tap(c)}
              disabled={!!state || doneRef.current}
              style={{
                position: "relative", minHeight: 64, borderRadius: 14, padding: "10px 12px",
                border: `2px solid ${border}`, background: bg, color: ink,
                fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 13, lineHeight: 1.2,
                textAlign: "center", cursor: state ? "default" : "pointer",
                boxShadow: state ? "0 0 14px rgba(0,0,0,0.25)" : "0 4px 10px rgba(0,0,0,0.3)",
                animation: state === "bad" ? "ed-shake-x 0.4s" : "none",
                transition: "all 0.15s ease",
              }}>
              {c.text}
              {state && (
                <span style={{
                  position: "absolute", top: -8, right: -8, width: 22, height: 22, borderRadius: "50%",
                  background: state === "ok" ? "#2ecc8f" : "#ff6b6b", color: "#fff", fontSize: 13, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "2px solid #fff", boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                }}>{state === "ok" ? "✓" : "✗"}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// R3 · El medidor: ¿mito o verdad? (DESLIZAR marcador). Aparece una
// afirmación sobre la lengua y el pensamiento; el estudiante arrastra el
// marcador sobre una barra de 3 zonas (Es un mito · A medias · Es verdad).
// Componente CONTROLADO: el padre maneja la afirmación, el bloqueo y dispara
// la calificación desde VERIFICAR.
// ─────────────────────────────────────────────────────────────
function MedidorLengua({ stmt, idx, total, locked, chosenZone, onPick, onSettle }) {
  const [frac, setFrac] = useStateG(0.5);
  const trackRef = useRefG(null);
  const draggingRef = useRefG(false);
  const settleTimer = useRefG(null);
  const zone = Math.min(2, Math.floor(frac * 3));
  const chosenOk = chosenZone === stmt.zone;

  // Reporta al padre la zona elegida cada vez que cambia.
  useEffectG(() => { onPick(zone); }, [zone]);
  useEffectG(() => () => { if (settleTimer.current) clearTimeout(settleTimer.current); }, []);

  function setFromClientX(cx) {
    const el = trackRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let f = (cx - r.left) / r.width;
    f = Math.max(0, Math.min(0.999, f));
    setFrac(f);
  }
  function onPointerDown(e) {
    if (locked) return;
    if (settleTimer.current) { clearTimeout(settleTimer.current); settleTimer.current = null; }
    draggingRef.current = true;
    setFromClientX(e.clientX);
    if (e.currentTarget.setPointerCapture) {
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    }
  }
  function onPointerMove(e) {
    if (!draggingRef.current || locked) return;
    setFromClientX(e.clientX);
  }
  function onPointerUp() {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (locked) return;
    // No calificar de inmediato: ventana para recolocar el marcador. Si el
    // estudiante vuelve a tocar la barra antes, el timer se cancela y sigue.
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => { if (onSettle) onSettle(); }, 1200);
  }

  const ZONE_BG = ["#ff6b6b", "#f2c260", "#2ecc8f"];

  return (
    <div data-qa="zona-central" style={{
      position: "absolute", top: 116, bottom: 12, left: "50%", transform: "translateX(-50%)",
      width: 452, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 26,
    }}>
      {/* Afirmación */}
      <div style={{
        width: "fit-content", maxWidth: 440, borderRadius: 16, padding: "18px 22px",
        background: "linear-gradient(180deg, rgba(255,255,255,0.97), rgba(238,242,255,0.93))",
        border: "3px solid #f2c260", boxShadow: "0 10px 24px rgba(0,0,0,0.38)",
        textAlign: "center", color: "#1c2440",
      }}>
        <div style={{
          display: "inline-block", marginBottom: 6,
          background: "#7b5cff", color: "#fff", borderRadius: 8, padding: "2px 12px",
          fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 11, letterSpacing: "0.05em",
        }}>
          Afirmación {idx + 1}/{total}
        </div>
        <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 18, lineHeight: 1.32 }}>
          “{stmt.text}”
        </div>
      </div>

      {/* Medidor de 3 zonas */}
      <div style={{ width: 440 }}>
        <div
          ref={trackRef}
          className="ed-draggable"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            position: "relative", width: "100%", height: 58, borderRadius: 12,
            display: "flex", overflow: "hidden",
            border: "2px solid rgba(242,194,96,0.55)",
            cursor: locked ? "default" : "pointer", touchAction: "none",
          }}>
          {ZONE_LABELS.map((lab, i) => {
            const isTarget = locked && i === stmt.zone;
            const isWrong = locked && i === chosenZone && chosenZone !== stmt.zone;
            let bg = "rgba(255,255,255,0.08)";
            if (isTarget) bg = "rgba(46,204,143,0.5)";
            else if (isWrong) bg = "rgba(255,107,107,0.5)";
            else if (!locked && i === zone) bg = "rgba(79,216,255,0.22)";
            return (
              <div key={i} style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                borderRight: i < 2 ? "2px solid rgba(242,194,96,0.35)" : "none",
                background: bg,
                fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 14,
                color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.6)",
                position: "relative",
              }}>
                <span style={{ pointerEvents: "none" }}>
                  {isTarget ? "✓ " : isWrong ? "✗ " : ""}{lab}
                </span>
                <span style={{
                  position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)",
                  width: 8, height: 4, borderRadius: 2, background: ZONE_BG[i], opacity: 0.85,
                }} />
              </div>
            );
          })}
          {/* Marcador */}
          <div style={{
            position: "absolute", top: -6, bottom: -6, left: `calc(${frac * 100}% - 11px)`,
            width: 22, pointerEvents: "none",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              width: 22, height: 72, borderRadius: 8,
              background: locked ? (chosenOk ? "#2ecc8f" : "#ff6b6b") : "#4fd8ff",
              border: "2px solid #fff",
              boxShadow: "0 3px 10px rgba(0,0,0,0.55), 0 0 14px rgba(79,216,255,0.6)",
            }} />
          </div>
        </div>
      </div>

      {!locked && (
        <div style={{
          fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 12.5,
          color: "rgba(252,233,168,0.85)", textAlign: "center", maxWidth: 400, lineHeight: 1.3,
        }}>
          Arrastra el marcador y suéltalo donde creas; se califica solo.
        </div>
      )}

      {/* Explicación (tras VERIFICAR). El avance lo dispara el padre. */}
      {locked && (
        <div style={{
          width: "fit-content", maxWidth: 440, borderRadius: 12, padding: "9px 14px",
          background: chosenOk ? "rgba(46,204,143,0.16)" : "rgba(255,107,107,0.14)",
          border: `1.5px solid ${chosenOk ? "rgba(46,204,143,0.6)" : "rgba(255,107,107,0.55)"}`,
          fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 12.5, lineHeight: 1.3,
          color: "#fce9a8", textAlign: "center",
        }}>
          <span style={{ color: chosenOk ? "#7dffc4" : "#ffb3b3" }}>{chosenOk ? "¡Bien! " : "Recuerda: "}</span>
          {stmt.explica}
        </div>
      )}
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
  const res = app.lastResult || { category: "Otras palabras, otros mundos", solved: 0, total: 3, time: 0, starsEarned: 0, log: [] };
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
