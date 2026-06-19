// game-screens.jsx — GameScreen + ResultsScreen para JUEGO-9
// "Chistes para los tristes" (6 años, 1 nivel, 3 rondas).
//
// Mecánica: completar la palabra eligiendo la sílaba trabada correcta
// (pr / pl / bl / br / fl / fr). El motor selecciona una palabra del banco
// por ronda, oculta su cluster inicial (2 letras), muestra el emoji del
// objeto y una bandeja con 3 sílabas (1 correcta + 2 distractoras).
//
// Cada ronda enfoca un par de grupos consonánticos:
//   R1 — PR / PL
//   R2 — BL / BR
//   R3 — FL / FR

const { useState: useStateG, useEffect: useEffectG, useRef: useRefG, useMemo: useMemoG } = React;

function PortalToBody({ children }) {
  return ReactDOM.createPortal(children, document.body);
}

// ─────────────────────────────────────────────────────────────
// BANCO DE PALABRAS — agrupadas por sílaba trabada inicial. Todas en
// MINÚSCULAS y SIN TILDES (igual criterio que juego-1 con las vocales):
// si la grafía correcta del español lleva tilde, la palabra se descarta
// para no enseñar una forma incorrecta.
//
// Para cada palabra:
//   cluster:  las 2 letras de la sílaba trabada (siempre las INICIALES).
//   word:     la palabra completa en minúsculas.
//   emoji:    icono evocador para que el niño identifique sin leer.
// ─────────────────────────────────────────────────────────────
const WORD_BANK = [
  // pr
  { word: "primo",    cluster: "pr", emoji: "👦" },
  { word: "premio",   cluster: "pr", emoji: "🏆" },
  { word: "prima",    cluster: "pr", emoji: "👧" },
  // pl
  { word: "plato",    cluster: "pl", emoji: "🍽️" },
  { word: "pluma",    cluster: "pl", emoji: "🪶" },
  { word: "playa",    cluster: "pl", emoji: "🏝️" },
  // bl
  { word: "blusa",    cluster: "bl", emoji: "👚" },
  { word: "bloque",   cluster: "bl", emoji: "🧱" },
  // br
  { word: "brazo",    cluster: "br", emoji: "💪" },
  { word: "brocha",   cluster: "br", emoji: "🖌️" },
  { word: "bruja",    cluster: "br", emoji: "🧙" },
  // fl
  { word: "flor",     cluster: "fl", emoji: "🌻" },
  { word: "flecha",   cluster: "fl", emoji: "🏹" },
  { word: "flan",     cluster: "fl", emoji: "🍮" },
  { word: "flauta",   cluster: "fl", emoji: "🪈" },
  // fr
  { word: "fresa",    cluster: "fr", emoji: "🍓" },
  { word: "fruta",    cluster: "fr", emoji: "🍇" },
  { word: "frasco",   cluster: "fr", emoji: "🫙" },
];

// Por ronda — los grupos consonánticos en foco. R1 pr/pl, R2 bl/br, R3 fl/fr.
// Esto da una progresión clara y permite que el motor saque siempre 1
// palabra del par objetivo de la ronda.
const ROUNDS_CFG = [
  { idx: 0, focus: ["pr", "pl"], label: "pr · pl" },
  { idx: 1, focus: ["bl", "br"], label: "bl · br" },
  { idx: 2, focus: ["fl", "fr"], label: "fl · fr" },
];

const ALL_CLUSTERS = ["pr", "pl", "bl", "br", "fl", "fr"];

// Palabras reales que pueden formarse al combinar un cluster con el resto
// visible de OTRA palabra del banco. Se usan para que ninguna ficha distractora
// forme una palabra real (evita ambigüedad: flato, bruma, plazo, brecha, plan,
// presa, bruta…). Incluye las del banco + las colisiones detectadas.
const REAL_WORDS = new Set([
  "primo", "premio", "prima", "plato", "flato", "pluma", "bruma", "playa",
  "blusa", "bloque", "brazo", "plazo", "brocha", "bruja", "flor", "flecha",
  "brecha", "flan", "plan", "flauta", "fresa", "presa", "fruta", "bruta", "frasco",
]);

// Frases motivadoras para feedback de error.
const ENCOURAGEMENTS = [
  "¡Casi! Sigue intentándolo.",
  "Las palabras tienen su truco 📖",
  "¡La próxima es tuya!",
  "Equivocarse también es aprender.",
  "Las letras son una aventura.",
  "¡Vamos a la siguiente!",
  "Cada error te acerca al acierto.",
];

// ─────────────────────────────────────────────────────────────
// Memoria de palabras recientemente vistas — para no repetir entre
// rondas y entre sesiones dentro del mismo navegador. Persistida en
// localStorage. Misma idea que el RECENT_LIMIT del juego-1.
// ─────────────────────────────────────────────────────────────
const RECENT_KEY = "edinun_juego9_recientes_v1";
const RECENT_LIMIT = 8;

function getRecent() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function pushRecent(word) {
  const arr = getRecent().filter((w) => w !== word);
  arr.unshift(word);
  const trimmed = arr.slice(0, RECENT_LIMIT);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(trimmed)); } catch {}
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─────────────────────────────────────────────────────────────
// makeProblem — genera el ejercicio de la ronda actual.
//   1. Filtra el banco por los grupos en foco de la ronda.
//   2. Excluye palabras ya usadas en la sesión + recientes.
//   3. Elige una al azar y construye la bandeja de 3 sílabas:
//      - la correcta (cluster en minúscula)
//      - 2 distractoras seguras: ninguna forma palabra real con el resto
//        visible (#3), y la pareja del par mínimo entra solo a veces (#5).
// ─────────────────────────────────────────────────────────────
function makeProblem(roundIdx, usedKeys) {
  const cfg = ROUNDS_CFG[roundIdx] || ROUNDS_CFG[0];
  const recent = new Set(getRecent());
  const exclude = new Set([...usedKeys, ...recent]);

  let pool = WORD_BANK.filter((w) => cfg.focus.includes(w.cluster) && !exclude.has(w.word));
  if (pool.length === 0) {
    pool = WORD_BANK.filter((w) => cfg.focus.includes(w.cluster) && !usedKeys.has(w.word));
  }
  if (pool.length === 0) {
    pool = WORD_BANK.filter((w) => cfg.focus.includes(w.cluster));
  }
  const pick = pool[Math.floor(Math.random() * pool.length)];

  // Bandeja: cluster correcto + 2 distractoras. Reglas:
  //  · #3 ninguna distractora puede formar una palabra real con el resto
  //    visible (evita flato/plan/presa/brecha/bruma/plazo/bruta…).
  //  · #5 la pareja del par mínimo (pr↔pl, bl↔br, fl↔fr) entra solo "a veces",
  //    para no exigir siempre la discriminación fina a un niño de 6 años.
  //  Todo en minúsculas (regla de juegos de "completar palabra").
  const correct = pick.cluster;
  const rest = pick.word.slice(correct.length);
  const safe = (c) => c !== correct && !REAL_WORDS.has(c + rest);
  const otherInPair = cfg.focus.find((g) => g !== correct);
  const outside = ALL_CLUSTERS.filter((c) => !cfg.focus.includes(c));

  // includePair → prioriza la pareja del par (discriminación fina); si no,
  // prioriza clusters "lejanos" (más fáciles de descartar para 6 años).
  const includePair = Math.random() < 0.5;
  const candidates = includePair
    ? [otherInPair, ...shuffle(outside)]
    : [...shuffle(outside), otherInPair];

  const distractors = [];
  for (const c of candidates) {
    if (distractors.length >= 2) break;
    if (safe(c) && !distractors.includes(c)) distractors.push(c);
  }
  // Fallback defensivo: garantizar 2 distractoras aunque haya que aceptar la
  // pareja o, en última instancia, una colisión rara.
  if (distractors.length < 2) {
    for (const c of shuffle([otherInPair, ...outside])) {
      if (distractors.length >= 2) break;
      if (c !== correct && !distractors.includes(c)) distractors.push(c);
    }
  }
  const trayClusters = shuffle([correct, ...distractors]);

  return {
    word: pick.word,
    cluster: pick.cluster,       // minúsculas, lo que se inserta en el slot
    emoji: pick.emoji,
    trayClusters,                // 3 strings en minúsculas
    focusLabel: cfg.label,       // "pr · pl"
    roundIdx,
  };
}

// ─────────────────────────────────────────────────────────────
// formatTime / calcStars — utilidades compartidas con el shell.
// ─────────────────────────────────────────────────────────────
function formatTime(s) {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function calcStars(isCorrect, exerciseSec) {
  return isCorrect ? Math.max(1, 10 - Math.floor(exerciseSec / 3)) : 0;
}

// ─────────────────────────────────────────────────────────────
// GameScreen
// ─────────────────────────────────────────────────────────────
function GameScreen({ app, setApp, go }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "Chistes para los tristes";

  // Set de palabras ya usadas en la sesión actual para no repetir.
  const usedRef = useRefG(new Set());
  const [problem, setProblem] = useStateG(() => {
    const p = makeProblem(0, usedRef.current);
    usedRef.current.add(p.word);
    pushRecent(p.word);
    return p;
  });
  // Sílaba que el niño eligió en la bandeja (string en minúsculas) o null.
  const [picked, setPicked] = useStateG(null);

  const [elapsed, setElapsed] = useStateG(0);
  const [stars, setStars] = useStateG(0);
  const [solved, setSolved] = useStateG(0);
  const [attempted, setAttempted] = useStateG(0);
  const [starsSession, setStarsSession] = useStateG(0);
  const [feedback, setFeedback] = useStateG(null);
  const [feedbackMsg, setFeedbackMsg] = useStateG("");
  // Fase "reveal": al fallar, ANTES del overlay "¡UPS!" se revela la sílaba
  // correcta — la bandeja la marca en verde con ✓, la ficha equivocada en
  // rojo, y aparece un cartel "Correcta: ✓ XX". Bloquea toda entrada.
  // `{ cluster: "pr" }`. Mismo mecanismo que juego-1.
  const [reveal, setReveal] = useStateG(null);
  const REVEAL_MS = 2800;
  const [confirmingExit, setConfirmingExit] = useStateG(false);
  const [confirmingRestart, setConfirmingRestart] = useStateG(false);
  const [log, setLog] = useStateG([]);

  const started = useRefG(Date.now());
  const exerciseStart = useRefG(Date.now());

  // Candado síncrono: evita que un doble-tap en ¡VERIFICAR! reentre y cuente
  // el intento dos veces / avance dos rondas. Se libera al terminar el overlay.
  const busyRef = useRefG(false);
  // Rastrea los setTimeout pendientes para limpiarlos si el componente se
  // desmonta (SALIR / REINICIAR) durante el revelado o el feedback, y no
  // disparar setApp/go sobre una sesión ya reiniciada.
  const timersRef = useRefG([]);
  const track = (id) => { timersRef.current.push(id); return id; };

  useEffectG(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - started.current) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, []);

  // Limpia cualquier timeout pendiente al desmontar.
  useEffectG(() => () => { timersRef.current.forEach(clearTimeout); timersRef.current = []; }, []);

  function pressCluster(cluster) {
    if (reveal) return;
    setPicked(cluster);
  }

  function erase() {
    if (reveal) return;
    setPicked(null);
  }

  function confirmRestart() {
    setApp((s) => ({
      ...s,
      stars: 0,
      gameSeed: (s.gameSeed || 0) + 1,
    }));
    setConfirmingRestart(false);
  }

  function verify() {
    if (reveal || busyRef.current) return;
    if (!picked) {
      setFeedback("err");
      setFeedbackMsg("Toca un sonido primero");
      track(setTimeout(() => { setFeedback(null); setFeedbackMsg(""); }, 700));
      return;
    }
    busyRef.current = true;
    if (typeof window.markFirstAttempt === "function") window.markFirstAttempt();

    const isCorrect = picked === problem.cluster;
    const exerciseSec = Math.max(0, Math.floor((Date.now() - exerciseStart.current) / 1000));
    const earned = calcStars(isCorrect, exerciseSec);

    const entry = {
      a: problem.word,                  // palabra completa
      b: picked,                        // sílaba elegida (minúsculas)
      op: "🃏",
      correctAnswer: problem.cluster,
      userAnswer: picked,
      time: exerciseSec,
      earned,
      emoji: problem.emoji,
    };

    if (!isCorrect) {
      // Revelar la sílaba correcta ANTES del overlay "¡UPS!": la bandeja la
      // marca en verde con ✓ y la ficha equivocada en rojo. Bloquea entradas.
      setReveal({ cluster: problem.cluster });
      track(setTimeout(() => { setReveal(null); finalize(false, entry); }, REVEAL_MS));
      return;
    }
    finalize(true, entry);
  }

  function finalize(isCorrect, partialEntry) {
    const earned = isCorrect ? partialEntry.earned : 0;
    const newAttempted = attempted + 1;
    const newSolved = solved + (isCorrect ? 1 : 0);
    const newStarsSession = starsSession + earned;
    const newStarsTotal = stars + earned;

    const entry = { idx: newAttempted, ...partialEntry, isCorrect };
    const newLog = [...log, entry];

    setFeedback(isCorrect ? "ok" : "err");
    setFeedbackMsg(isCorrect
      ? `+${earned} ⭐`
      : ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]
    );
    setAttempted(newAttempted);
    setSolved(newSolved);
    setStars(newStarsTotal);
    setStarsSession(newStarsSession);
    setLog(newLog);

    // El revelado ya cumplió el rol educativo del fallo → el overlay "¡UPS!"
    // va corto, igual que el de acierto.
    const wait = isCorrect ? 950 : 1100;
    track(setTimeout(() => {
      setFeedback(null);
      setFeedbackMsg("");
      setPicked(null);
      if (newAttempted >= 3) {
        setApp((s) => ({
          ...s,
          stars: newStarsTotal,
          lastResult: {
            category: catLabel,
            solved: newSolved,
            total: 3,
            time: elapsed,
            starsEarned: newStarsSession,
            log: newLog,
          },
        }));
        if (typeof window.incrementGamesCompleted === "function") window.incrementGamesCompleted();
        go("results");
      } else {
        const p = makeProblem(newAttempted, usedRef.current);
        usedRef.current.add(p.word);
        pushRecent(p.word);
        setProblem(p);
        exerciseStart.current = Date.now();
      }
      busyRef.current = false;
    }, wait));
  }

  // ── Cálculo de las "letras visibles" de la palabra: todo menos
  // las 2 primeras (el cluster). La palabra se renderiza como
  // [ slot ] · letras-restantes (cada una en su mini-caja blanca).
  const restLetters = problem.word.slice(problem.cluster.length).split("");

  // Tamaño dinámico de las casillas según la longitud total de la palabra.
  const wordLen = problem.word.length;
  const SLOT_W = wordLen <= 4 ? 64 : wordLen <= 6 ? 58 : 52;
  const SLOT_H = wordLen <= 4 ? 72 : wordLen <= 6 ? 66 : 60;
  const SLOT_GAP = wordLen <= 6 ? 8 : 6;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* HUD superior — logo izq, contador central (sin tabs de nivel
          porque es 1 solo nivel), tiempo+estrellas der. */}
      <div data-qa="hud" style={{ position: "absolute", top: 10, left: 16, right: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
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

      {/* Indicador de ronda — debajo del HUD, centrado.
          3 dots: dorado = correcto, rojo = fallado, gris = pendiente. */}
      <div style={{
        position: "absolute", top: 54, left: "50%", transform: "translateX(-50%)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span className="ed-label" style={{ color: "rgba(255,255,255,0.7)" }}>Ronda</span>
        {[0,1,2].map((i) => (
          <div key={i} style={{
            width: 10, height: 10, borderRadius: "50%",
            background: i < attempted ? (i < solved ? "#fce9a8" : "#ff6b6b") : "rgba(255,255,255,0.2)",
            boxShadow: i < attempted ? "0 0 10px currentColor" : "none",
            color: i < solved ? "#fce9a8" : "#ff6b6b",
          }} />
        ))}
      </div>

      {/* CharacterCorner canónico (shell-standards.md §1).
          Padre width 220, bocadillo bottom:100% + ed-float-soft,
          cuerpo maxWidth:208 + whiteSpace pre-line, cola centrada con
          translateX(-50%). El bbox del padre solapa 8px con zona-central
          pero el contenido visible está bien centrado y no choca. */}
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
            borderRadius: 16,
            padding: "10px 14px",
            fontFamily: "var(--ed-font-display)",
            fontWeight: 700, fontSize: 14, lineHeight: 1.25,
            color: "#fce9a8", textAlign: "center",
            whiteSpace: "pre-line",
            boxShadow: "0 10px 24px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}>
            ¿Cuál sonido falta? Tócalo.
            <div style={{
              position: "absolute", bottom: -10, left: "50%", transform: "translateX(-50%)",
              width: 0, height: 0,
              borderLeft: "9px solid transparent",
              borderRight: "9px solid transparent",
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

      {/* GameEnunciado canónico (shell-standards.md §2). Centrado con
          left:50% + translateX(-50%), width 488, fontSize 17. QUÉ hacer
          (la tarea), termina con punto. */}
      <div style={{
        position: "absolute", top: 84, left: "50%", transform: "translateX(-50%)", width: 488,
        textAlign: "center",
        fontFamily: "var(--ed-font-display)", fontWeight: 700,
        fontSize: 17, lineHeight: 1.2,
        color: "#fff",
        textShadow: "0 2px 6px rgba(0,0,0,0.6)",
        pointerEvents: "none",
        zIndex: 5,
      }}>
        Completa la palabra.
      </div>

      {/* ══════ ZONA CENTRAL: emoji + slot + resto de la palabra ══════ */}
      <div data-qa="zona-central" style={{
        position: "absolute", top: 128, left: "50%", transform: "translateX(-50%)",
        width: 460, textAlign: "center",
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 24,
      }}>
        {/* Cartel del emoji con marco dorado. */}
        <div style={{
          width: 170, height: 155,
          borderRadius: 20,
          background: "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(240,235,225,0.9))",
          border: "3px solid #f2c260",
          boxShadow: "0 12px 28px rgba(0,0,0,0.45), 0 0 0 1px rgba(242,194,96,0.35), inset 0 -4px 0 rgba(0,0,0,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 112, lineHeight: 1,
        }}>
          {problem.emoji}
        </div>

        {/* Palabra con UN slot ancho al inicio (la sílaba trabada) +
            letras restantes visibles en mini-cajas blancas. */}
        <div style={{
          display: "flex", justifyContent: "center", alignItems: "center",
          gap: SLOT_GAP,
          padding: "4px 6px",
        }}>
          {/* Slot del cluster — el doble de ancho que una letra normal */}
          <button
            onClick={() => { if (picked && !reveal) erase(); }}
            style={{
              width: SLOT_W * 1.6, height: SLOT_H,
              borderRadius: 12,
              border: `2.5px solid ${
                reveal ? "#2ecc8f" :
                feedback === "ok" ? "#2ecc8f" :
                feedback === "err" ? "#ff6b6b" :
                picked ? "#fce9a8" : "rgba(242,194,96,0.55)"
              }`,
              background: reveal
                ? "linear-gradient(180deg, rgba(46,204,143,0.95), rgba(34,160,108,0.9))"
                : picked
                ? "linear-gradient(180deg, rgba(252,233,168,0.95), rgba(217,164,65,0.85))"
                : "rgba(10,6,35,0.55)",
              color: reveal ? "#06381f" : picked ? "#3a2608" : "rgba(252,233,168,0.5)",
              fontFamily: "var(--ed-font-display)", fontWeight: 800,
              fontSize: SLOT_H * 0.55,
              cursor: picked && !reveal ? "pointer" : "default",
              boxShadow: reveal
                ? "0 0 16px rgba(46,204,143,0.6), inset 0 1px 0 rgba(255,255,255,0.3)"
                : picked
                ? "0 4px 10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.4)"
                : "0 0 14px rgba(252,233,168,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
              transition: "all 0.15s ease",
              letterSpacing: "0.04em",
            }}
            title={picked ? "Toca para borrar" : "Toca una sílaba de abajo"}
          >
            {reveal ? reveal.cluster : (picked || "__")}
          </button>

          {/* Letras restantes — fijas, visibles, en blanco. */}
          {restLetters.map((ch, i) => (
            <div key={i} style={{
              width: SLOT_W, height: SLOT_H,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--ed-font-display)", fontWeight: 700,
              fontSize: SLOT_H * 0.55,
              color: "#fff",
              textShadow: "0 2px 6px rgba(0,0,0,0.5)",
              borderBottom: "3px solid rgba(255,255,255,0.35)",
            }}>
              {ch}
            </div>
          ))}
        </div>
      </div>

      {/* Bandeja de 3 sílabas trabadas — fila inferior centrada.
          Cada ronda cambia los clusters (ver makeProblem). El elegido
          se marca con borde dorado y elevación. */}
      <div data-qa="bandeja" style={{
        position: "absolute", bottom: 30, left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: 14, flexWrap: "nowrap",
        maxWidth: 720, justifyContent: "center",
      }}>
        {problem.trayClusters.map((cluster, trayIdx) => {
          const color = ["#ef5a5a","#4fa0ff","#2ecc8f"][trayIdx % 3];
          const isPicked = picked === cluster;
          // Durante el revelado: la sílaba correcta se marca en verde con ✓,
          // la equivocada (la que tocó el niño) en rojo.
          const isRevealCorrect = reveal && cluster === reveal.cluster;
          const isRevealWrong = reveal && isPicked && cluster !== reveal.cluster;
          return (
            <button
              key={trayIdx}
              className="ed-numpad-key"
              onClick={() => pressCluster(cluster)}
              style={{
                position: "relative",
                width: 92, height: 72, fontSize: 28,
                borderColor: isRevealCorrect ? "#2ecc8f" : isRevealWrong ? "#ff6b6b" : isPicked ? "#fce9a8" : color,
                borderWidth: isPicked || isRevealCorrect ? 3 : 2,
                borderStyle: "solid",
                cursor: reveal ? "default" : "pointer",
                fontWeight: 800,
                letterSpacing: "0.04em",
                color: isRevealCorrect ? "#06381f" : undefined,
                background: isRevealCorrect
                  ? "linear-gradient(180deg, rgba(46,204,143,0.95), rgba(34,160,108,0.9))"
                  : isRevealWrong
                  ? "linear-gradient(180deg, rgba(255,107,107,0.25), rgba(220,80,80,0.18))"
                  : isPicked
                  ? "linear-gradient(180deg, rgba(252,233,168,0.25), rgba(217,164,65,0.18))"
                  : undefined,
                boxShadow: isRevealCorrect
                  ? "0 0 18px rgba(46,204,143,0.6), inset 0 1px 0 rgba(255,255,255,0.25)"
                  : isPicked
                  ? "0 0 18px rgba(252,233,168,0.55), inset 0 1px 0 rgba(255,255,255,0.2)"
                  : undefined,
                transform: isPicked || isRevealCorrect ? "translateY(-2px)" : "none",
                transition: "all 0.15s ease",
              }}
              title="Toca para elegir"
            >
              {cluster}
              {isRevealCorrect && (
                <span style={{
                  position: "absolute", top: -8, right: -8,
                  width: 24, height: 24, borderRadius: "50%",
                  background: "#2ecc8f", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 900,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                }}>✓</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Acciones derecha — VERIFICAR · BORRAR · REINICIAR · SALIR. */}
      <div data-qa="acciones" style={{
        position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)",
        display: "flex", flexDirection: "column", gap: 12, width: 150,
      }}>
        <button
          className="ed-btn ed-btn-verify"
          onClick={verify}
          style={{ fontSize: 15, padding: "0 10px", height: 56, fontWeight: 800, letterSpacing: "0.04em" }}
        >
          ¡VERIFICAR!
        </button>
        <button
          className="ed-btn ed-btn-erase"
          onClick={erase}
          style={{ fontSize: 15, padding: "0 10px", height: 56, fontWeight: 800, letterSpacing: "0.04em" }}
        >
          BORRAR
        </button>
        <button
          className="ed-btn ed-btn-restart"
          onClick={() => setConfirmingRestart(true)}
          title="Reiniciar la sesión"
          style={{ fontSize: 15, padding: "0 10px", height: 56, fontWeight: 800, letterSpacing: "0.04em" }}
        >
          REINICIAR
        </button>
        <button
          className="ed-btn ed-btn-ghost"
          onClick={() => setConfirmingExit(true)}
          title="Salir al inicio"
          style={{ fontSize: 15, padding: "0 10px", height: 56, fontWeight: 800, letterSpacing: "0.04em" }}
        >
          SALIR
        </button>
      </div>

      {/* Feedback overlay */}
      {feedback && (
        <PortalToBody>
          <div style={{
            position: "fixed", inset: 0, zIndex: 1000,
            pointerEvents: "none",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 14,
            background: "rgba(0,0,0,0.62)",
            backdropFilter: "blur(3px)",
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
                {feedback === "ok" ? feedbackMsg : `${feedbackMsg} — ${char.name}`}
              </div>
            )}
          </div>
        </PortalToBody>
      )}

      {/* Modal de salir */}
      {confirmingExit && (
        <PortalToBody>
          <div
            onClick={() => setConfirmingExit(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 1000,
              background: "rgba(0,0,0,0.62)",
              backdropFilter: "blur(4px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "ed-pop-in 0.18s",
              padding: 16,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="ed-card"
              style={{ padding: 24, maxWidth: 440, textAlign: "center", boxShadow: "var(--ed-shadow-card), 0 0 40px rgba(255,107,107,0.3)" }}
            >
              <div className="ed-label" style={{ color: "#ff8b8b", marginBottom: 6 }}>
                Salir del juego
              </div>
              <h2 className="ed-h1" style={{ fontSize: 22, lineHeight: 1.15, marginBottom: 8 }}>
                ¿Volver al inicio?
              </h2>
              <p className="ed-body" style={{ marginBottom: 16, fontSize: 14 }}>
                Vas a perder el progreso de esta ronda ({attempted}/3 palabras). No habrá reporte de esta sesión.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button className="ed-btn ed-btn-ghost" onClick={() => setConfirmingExit(false)} style={{ height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
                  SEGUIR JUGANDO
                </button>
                <button className="ed-btn ed-btn-primary" onClick={() => { setConfirmingExit(false); go("home"); }} style={{ height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
                  SÍ, SALIR
                </button>
              </div>
            </div>
          </div>
        </PortalToBody>
      )}

      {/* Modal de reiniciar — descartar sesión y empezar desde ronda 1. */}
      {confirmingRestart && (
        <PortalToBody>
          <div
            onClick={() => setConfirmingRestart(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 1000,
              background: "rgba(0,0,0,0.62)",
              backdropFilter: "blur(4px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "ed-pop-in 0.18s",
              padding: 16,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="ed-card"
              style={{ padding: 24, maxWidth: 440, textAlign: "center", boxShadow: "var(--ed-shadow-card), 0 0 40px rgba(255,107,107,0.3)" }}
            >
              <div className="ed-label" style={{ color: "#ff8b8b", marginBottom: 6 }}>
                Reiniciar juego
              </div>
              <h2 className="ed-h1" style={{ fontSize: 22, lineHeight: 1.15, marginBottom: 8 }}>
                ¿Empezar de nuevo?
              </h2>
              <p className="ed-body" style={{ marginBottom: 16, fontSize: 14 }}>
                Vas a perder el progreso de esta ronda ({attempted}/3 palabras) y volverás a la primera.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button className="ed-btn ed-btn-ghost" onClick={() => setConfirmingRestart(false)} style={{ height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
                  SEGUIR JUGANDO
                </button>
                <button className="ed-btn ed-btn-primary" onClick={confirmRestart} style={{ height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
                  SÍ, REINICIAR
                </button>
              </div>
            </div>
          </div>
        </PortalToBody>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// RESULTS — Reporte académico imprimible. Misma estructura que el
// shell. Solo cambia la columna "Palabra" del reporte (emoji + palabra
// completa) y la columna de respuestas (sílaba elegida vs correcta).
// ─────────────────────────────────────────────────────────────
function formatOp(e) {
  return `${e.emoji || "🃏"}  ${e.a}`;
}

const printStyles = {
  doc: { padding: 0, margin: 0, color: "#111", background: "#fff" },
  head: {
    display: "flex", alignItems: "center", gap: 14,
    borderBottom: "2px solid #d9a441",
    paddingBottom: 10, marginBottom: 14,
  },
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
  summary: { marginTop: 16, borderTop: "2px solid #d9a441", paddingTop: 12,
    display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 },
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
          <div style={printStyles.field}>
            <div style={printStyles.fieldL}>Estudiante</div>
            <div style={printStyles.fieldV}>{studentName || "—"}</div>
          </div>
          <div style={printStyles.field}>
            <div style={printStyles.fieldL}>Categoría</div>
            <div style={printStyles.fieldV}>{res.category || "—"}</div>
          </div>
          <div style={printStyles.field}>
            <div style={printStyles.fieldL}>Tiempo total</div>
            <div style={printStyles.fieldV}>{String(m).padStart(2,"0")}:{String(s).padStart(2,"0")}</div>
          </div>
        </div>

        <table style={printStyles.table}>
          <thead>
            <tr style={printStyles.thHead}>
              <th style={printStyles.th}>#</th>
              <th style={printStyles.th}>Palabra</th>
              <th style={{ ...printStyles.th, ...printStyles.thR }}>Sonido elegido</th>
              <th style={{ ...printStyles.th, ...printStyles.thR }}>Sonido correcto</th>
              <th style={{ ...printStyles.th, ...printStyles.thC }}>Estado</th>
              <th style={{ ...printStyles.th, ...printStyles.thR }}>Tiempo</th>
            </tr>
          </thead>
          <tbody>
            {log.map((e) => (
              <tr key={e.idx} style={printStyles.tr}>
                <td style={{ ...printStyles.td, ...printStyles.tdNum }}>{e.idx}</td>
                <td style={{ ...printStyles.td, ...printStyles.tdOp }}>{e.emoji || ""} {e.a}</td>
                <td style={{ ...printStyles.td, ...printStyles.tdR }}>{e.userAnswer}</td>
                <td style={{ ...printStyles.td, ...printStyles.tdR }}>{e.correctAnswer}</td>
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
          <div style={printStyles.cell}>
            <div style={printStyles.cellL}>Ejercicios</div>
            <div style={printStyles.cellV}>{attemptedCount} / {totalEx}</div>
          </div>
          <div style={printStyles.cell}>
            <div style={printStyles.cellL}>Correctos</div>
            <div style={printStyles.cellV}>{res.solved}</div>
          </div>
          <div style={printStyles.cell}>
            <div style={printStyles.cellL}>Estrellas</div>
            <div style={printStyles.cellV}>{res.starsEarned}</div>
          </div>
          <div style={{ ...printStyles.cell, ...printStyles.cellEmp }}>
            <div style={printStyles.cellL}>Precisión total</div>
            <div style={printStyles.cellV}>{accuracy}%</div>
          </div>
        </div>

        <div style={printStyles.foot}>EDINUN GAMES · Reporte generado automáticamente</div>
      </div>
    </PortalToBody>
  );
}

function ResultsScreen({ app, setApp, go }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const res = app.lastResult || { category: "Chistes para los tristes", solved: 0, total: 3, time: 0, starsEarned: 0, log: [] };
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
            "{app.studentName}, completaste {res.solved} de {totalEx} palabras."
            <div style={{ marginTop: 4, color: "var(--ed-ink-soft)", fontSize: 12 }}>— {char.name}</div>
          </div>
        </div>

        {/* Der: reporte académico */}
        <div className="ed-card" style={{ padding: 16, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 14,
            borderBottom: "2px solid rgba(242,194,96,0.45)",
            paddingBottom: 10, marginBottom: 12,
          }}>
            <EdinunLogoMini size={56} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 18, letterSpacing: "0.04em", lineHeight: 1.1 }}>
                EDINUN — Ediciones Nacionales Unidas
              </div>
              <div style={{ fontFamily: "var(--ed-font-ui)", fontSize: 11, color: "var(--ed-ink-soft)", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 2 }}>
                Reporte académico · Juegos de Lenguaje
              </div>
            </div>
            <div style={{ fontFamily: "var(--ed-font-mono)", fontSize: 11, color: "var(--ed-ink-dim)", textAlign: "right" }}>
              {dateStr}
            </div>
          </div>

          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8,
            fontFamily: "var(--ed-font-ui)", fontSize: 12, marginBottom: 10,
          }}>
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
                  color: "var(--ed-ink-dim)",
                  borderBottom: "1px solid rgba(148,120,255,0.3)",
                }}>
                  <th style={{ textAlign: "left", padding: "6px 8px", width: 36 }}>#</th>
                  <th style={{ textAlign: "left", padding: "6px 8px" }}>Palabra</th>
                  <th style={{ textAlign: "right", padding: "6px 8px" }}>Sonido elegido</th>
                  <th style={{ textAlign: "right", padding: "6px 8px" }}>Sonido correcto</th>
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
                    <td style={{
                      padding: "8px 8px", textAlign: "center", fontFamily: "var(--ed-font-display)",
                      fontWeight: 700, color: e.isCorrect ? "#2ecc8f" : "#ff6b6b",
                    }}>
                      {e.isCorrect ? "Correcto" : "Incorrecto"}
                    </td>
                    <td style={{ padding: "8px 8px", textAlign: "right", color: "var(--ed-ink-dim)" }}>{e.time}s</td>
                  </tr>
                ))}
                {(res.log || []).length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: "16px 8px", textAlign: "center", color: "var(--ed-ink-soft)", fontStyle: "italic" }}>
                      No se registraron ejercicios en esta sesión.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{
            borderTop: "2px solid rgba(242,194,96,0.45)",
            paddingTop: 10,
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10,
            fontFamily: "var(--ed-font-ui)", fontSize: 11,
          }}>
            <SummaryCell label="Ejercicios" value={`${attemptedCount} / ${totalEx}`} />
            <SummaryCell label="Correctos" value={`${res.solved}`} tone="#2ecc8f" />
            <SummaryCell label="Estrellas" value={`${res.starsEarned}`} tone="#fce9a8" />
            <SummaryCell label="Precisión total" value={`${accuracy}%`} tone="#fce9a8" emphasis />
          </div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button
              className="ed-btn ed-btn-ghost"
              onClick={() => window.print()}
              style={{ padding: "0 10px", fontSize: 13, height: 44, fontWeight: 800, letterSpacing: "0.04em" }}
            >
              IMPRIMIR REPORTE
            </button>
            <button className="ed-btn ed-btn-primary" onClick={() => go("game")} style={{ padding: "0 10px", fontSize: 13, height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
              JUGAR OTRA RONDA
            </button>
          </div>
        </div>
      </div>

      <PrintableReport
        studentName={app.studentName}
        res={res}
        dateStr={dateStr}
        m={m} s={s}
        attemptedCount={attemptedCount}
        totalEx={totalEx}
        accuracy={accuracy}
      />
    </div>
  );
}

function ReportField({ label, value }) {
  return (
    <div style={{
      padding: "8px 10px", borderRadius: 10,
      background: "rgba(10,6,35,0.45)",
      border: "1px solid rgba(148,120,255,0.25)",
    }}>
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
