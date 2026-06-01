// game-screens.jsx — GameScreen + ResultsScreen para el juego
// "Completa la palabra". Hereda HUD, modales, scoring y ResultsScreen
// del shell matemático; reescribe la zona central con un emoji grande +
// casillas de palabra y la bandeja con fichas de letras.

const { useState: useStateG, useEffect: useEffectG, useRef: useRefG, useMemo: useMemoG } = React;

function PortalToBody({ children }) {
  return ReactDOM.createPortal(children, document.body);
}

// ─────────────────────────────────────────────────────────────
// Banco de palabras del nivel VOCALES. Todas en MINÚSCULAS y SIN
// TILDES en la forma correcta del español (NO se incluyen palabras
// como sandía, limón, maíz, brócoli, león, árbol — su grafía
// correcta lleva tilde y no podemos enseñar la versión sin tilde).
// La Ñ puede aparecer pero nunca se oculta — solo vocales se ocultan,
// y se ocultan TODAS.
//
// Campo opcional `alts`: lista de variantes aceptadas como respuesta
// válida (misma cantidad de letras y consonantes en las mismas
// posiciones — solo cambian las vocales). Se usa cuando un animal/
// fruta tiene masculino+femenino o variantes regionales naturales:
//   - banana / banano (regional)
//   - gato / gata, pato / pata, oso / osa, mono / mona, conejo / coneja
// Las palabras SIN `alts` solo aceptan la grafía exacta.
// ─────────────────────────────────────────────────────────────
const WORD_BANK_VOCALES = [
  // Frutas (sin tilde natural)
  { emoji: "🍎", word: "manzana" },
  { emoji: "🍌", word: "banana", alts: ["banano"] },
  { emoji: "🍓", word: "fresa" },
  { emoji: "🍇", word: "uvas" },
  { emoji: "🍐", word: "pera" },
  { emoji: "🍍", word: "piña" },
  { emoji: "🍊", word: "naranja" },
  { emoji: "🍒", word: "cerezas" },
  // Verduras (sin tilde natural)
  { emoji: "🥕", word: "zanahoria" },
  { emoji: "🍅", word: "tomate" },
  { emoji: "🥔", word: "papa" },
  { emoji: "🥬", word: "lechuga" },
  { emoji: "🥒", word: "pepino" },
  // Animales (sin tilde natural)
  { emoji: "🐱", word: "gato", alts: ["gata"] },
  { emoji: "🐶", word: "perro" },
  { emoji: "🐻", word: "oso", alts: ["osa"] },
  { emoji: "🐰", word: "conejo", alts: ["coneja"] },
  { emoji: "🐸", word: "rana" },
  { emoji: "🐮", word: "vaca" },
  { emoji: "🐟", word: "pez" },
  { emoji: "🦋", word: "mariposa" },
  { emoji: "🐯", word: "tigre" },
  { emoji: "🐵", word: "mono", alts: ["mona"] },
  { emoji: "🦒", word: "jirafa" },
  { emoji: "🐔", word: "pollo" },
  { emoji: "🐝", word: "abeja" },
  { emoji: "🦆", word: "pato", alts: ["pata"] },
  // Objetos y cosas (sin tilde natural)
  { emoji: "🏠", word: "casa" },
  { emoji: "📚", word: "libros" },
  { emoji: "⭐", word: "estrella" },
  { emoji: "🌙", word: "luna" },
  { emoji: "☀️", word: "sol" },
  { emoji: "🌸", word: "flor" },
  { emoji: "☁️", word: "nube" },
  { emoji: "🍞", word: "pan" },
  { emoji: "🧀", word: "queso" },
  { emoji: "🥛", word: "leche" },
  { emoji: "🪑", word: "silla" },
  { emoji: "🛏️", word: "cama" },
  { emoji: "🍰", word: "torta" },
];

// Bandeja del nivel VOCALES: las 5 vocales en minúsculas. Cada ficha es
// reutilizable infinitas veces (sin estado "consumida"). Decisión
// pedagógica: el niño elige solo entre vocales y la misma vocal puede
// servir para varias casillas.
const VOWEL_TRAY = ["a", "e", "i", "o", "u"];

function isVowel(ch) {
  return "aeiou".includes(ch);
}

// ─────────────────────────────────────────────────────────────
// Banco de palabras del nivel LETRA V. Todas las palabras contienen
// al menos una "v" minúscula (puede haber 2, como en "vivienda").
// Las tildes y la Ñ permanecen visibles — solo las V's son slot.
// Selección guiada por el libro escolar de 6 años (ejercicio 3 y
// tabla de sílabas de la letra V) + palabras frecuentes con V interior.
// ─────────────────────────────────────────────────────────────
const WORD_BANK_LETRA_V = [
  // V inicial — palabras del libro
  { emoji: "🐄", word: "vaca" },
  { emoji: "🕯️", word: "vela" },
  { emoji: "🥛", word: "vaso" },
  { emoji: "🪟", word: "ventana" },
  { emoji: "🌋", word: "volcán" },
  { emoji: "👗", word: "vestido" },
  { emoji: "💨", word: "viento" },
  { emoji: "⛵", word: "velero" },
  // V interior — palabras del libro
  { emoji: "🍇", word: "uva" },
  { emoji: "✈️", word: "avión" },
  { emoji: "❄️", word: "nieve" },
  { emoji: "🌴", word: "selva" },
  // V interior — palabras frecuentes para 6 años
  { emoji: "🥚", word: "huevo" },
  { emoji: "🐦", word: "ave" },
  { emoji: "🚀", word: "nave" },
  { emoji: "🦃", word: "pavo" },
  // V doble — reto extra (palabra del libro)
  { emoji: "🏠", word: "vivienda" },
];

// Bandeja del nivel LETRA V: V (correcta) + 4 distractores fijos.
// B suena parecido (/b/ ≡ /v/ en español); F, N, U son confundibles
// visualmente para un niño de 6 años. La V está reutilizable porque
// algunas palabras (vivienda) tienen 2 slots.
const LETTER_V_TRAY = ["v", "b", "f", "n", "u"];

function isLetterV(ch) {
  return ch === "v";
}

// ─────────────────────────────────────────────────────────────
// Configuración por categoría. Cada nivel define su banco, bandeja,
// función que decide qué letras son slot, clave de localStorage para
// la memoria de palabras recientes, y los textos (instrucción y pista)
// que se muestran en GameScreen.
// El catId viene de `app.currentCategory`, seteado por CharacterScreen
// desde el LEVELS_CFG de screens.jsx.
// ─────────────────────────────────────────────────────────────
const CATEGORIES = {
  vocales: {
    bank: WORD_BANK_VOCALES,
    tray: VOWEL_TRAY,
    isSlot: isVowel,
    recentKey: "edinun_completa_palabras_vocales_recientes_v1",
    instruction: "Completa la palabra usando las vocales.",
    hint: "Toca cada vocal en su lugar.",
  },
  letraV: {
    bank: WORD_BANK_LETRA_V,
    tray: LETTER_V_TRAY,
    isSlot: isLetterV,
    recentKey: "edinun_completa_palabras_letra_v_recientes_v1",
    instruction: "Completa la palabra con la letra V.",
    hint: "Toca la V donde corresponde.",
  },
};

// ─────────────────────────────────────────────────────────────
// Memoria de palabras vistas recientemente — persistida en localStorage
// para que las rondas consecutivas no repitan palabras (antes el set se
// reiniciaba cada vez que GameScreen se remontaba). Mantiene una cola
// FIFO de las últimas RECENT_LIMIT palabras POR CATEGORÍA (clave en
// cfg.recentKey). Vocales y Letra V tienen buffers independientes.
// ─────────────────────────────────────────────────────────────
const RECENT_LIMIT = 10;

function getRecentlySeen(recentKey) {
  try {
    const raw = localStorage.getItem(recentKey);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function pushRecentlySeen(recentKey, word) {
  const arr = getRecentlySeen(recentKey).filter((w) => w !== word);
  arr.unshift(word);
  const trimmed = arr.slice(0, RECENT_LIMIT);
  try { localStorage.setItem(recentKey, JSON.stringify(trimmed)); } catch {}
}

// ─────────────────────────────────────────────────────────────
// Generador de problemas. Recibe el id de categoría (vocales o letraV)
// y un set de palabras ya usadas en la ronda. Aplica el filtro de
// recientes (de localStorage) sobre el banco de esa categoría y oculta
// solo las letras que cumplan `cfg.isSlot` (vocales o V según el caso).
// ─────────────────────────────────────────────────────────────
function makeProblem(catId, usedKeys) {
  const cfg = CATEGORIES[catId] || CATEGORIES.vocales;

  // Doble filtro: palabras usadas EN ESTA RONDA (usedKeys, in-memory) +
  // las RECENT_LIMIT vistas recientemente entre rondas (localStorage,
  // namespaced por categoría). Así se evita repetición intra-ronda y
  // entre rondas/sesiones dentro del mismo nivel.
  const recent = new Set(getRecentlySeen(cfg.recentKey));
  const exclude = new Set([...usedKeys, ...recent]);
  let pool = cfg.bank.filter((w) => !exclude.has(w.word));
  // Si la exclusión deja poco margen (ej. tras varias rondas seguidas
  // sin recargar), relajar las recientes y conservar solo las de la
  // ronda actual.
  if (pool.length < 3) {
    pool = cfg.bank.filter((w) => !usedKeys.has(w.word));
  }
  if (pool.length === 0) pool = cfg.bank;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  const word = pick.word;
  const letters = word.split("");
  const n = letters.length;

  // Se ocultan TODAS las letras que cumplan `cfg.isSlot`. En vocales =
  // todas las vocales; en letraV = todas las V's (1 o 2 por palabra).
  const hiddenIdxArr = [];
  for (let i = 0; i < n; i++) {
    if (cfg.isSlot(letters[i])) hiddenIdxArr.push(i);
  }
  const correctLetters = hiddenIdxArr.map((i) => letters[i]);

  // Respuestas aceptadas: la palabra principal + sus alternativas
  // (masculino/femenino o regional). Todas comparten el mismo
  // esqueleto consonántico, así que las casillas mostradas son
  // idénticas — solo varía qué letra cuenta como correcta en cada
  // posición.
  const acceptedWords = [word, ...(pick.alts || [])];

  return {
    emoji: pick.emoji,
    word,                    // string base (la que se muestra)
    letters,                 // array de chars
    hiddenIdx: hiddenIdxArr, // índices que el usuario debe completar
    correctLetters,          // letras objetivo (en orden de hiddenIdx)
    acceptedWords,           // todas las grafías válidas
    tray: cfg.tray,          // bandeja específica de la categoría
  };
}

// ─────────────────────────────────────────────────────────────
// Frases motivadoras para feedback de error. Adaptadas a lenguaje.
// ─────────────────────────────────────────────────────────────
const ENCOURAGEMENTS = [
  "¡Casi! Sigue intentándolo.",
  "Las palabras no muerden 📖",
  "¡La próxima es tuya!",
  "Equivocarse también es aprender.",
  "Las letras son una aventura.",
  "¡Vamos a la siguiente!",
  "Cada error te acerca al acierto.",
];

function GameScreen({ app, setApp, go }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  // catId define banco/bandeja/copy. Si por alguna razón no llegó desde
  // CharacterScreen, asumimos vocales (juego original, retrocompatible).
  const catId = CATEGORIES[app.currentCategory] ? app.currentCategory : "vocales";
  const catCfg = CATEGORIES[catId];
  const catLabel = app.currentCatLabel || (catId === "letraV" ? "Letra V" : "Completa la palabra con vocales");

  // Llevar registro de palabras ya usadas en la sesión actual para no repetir.
  const usedRef = useRefG(new Set());
  const [problem, setProblem] = useStateG(() => {
    const p = makeProblem(catId, usedRef.current);
    usedRef.current.add(p.word);
    pushRecentlySeen(catCfg.recentKey, p.word);
    return p;
  });
  // `filled` es paralelo a `problem.hiddenIdx`: la letra que el usuario puso
  // en cada posición oculta (undefined = vacía). Las fichas de la bandeja
  // son reutilizables — la misma vocal puede colocarse varias veces.
  const [filled, setFilled] = useStateG([]);

  const [elapsed, setElapsed] = useStateG(0);
  const [stars, setStars] = useStateG(0);
  const [solved, setSolved] = useStateG(0);
  const [attempted, setAttempted] = useStateG(0);
  const [starsSession, setStarsSession] = useStateG(0);
  const [feedback, setFeedback] = useStateG(null);
  const [feedbackMsg, setFeedbackMsg] = useStateG("");
  const [confirmingExit, setConfirmingExit] = useStateG(false);
  const [confirmingRestart, setConfirmingRestart] = useStateG(false);
  // pendingLevel: id del nivel al que se quiere cambiar desde los chips
  // del HUD. Null = no hay cambio pendiente. La acción es destructiva
  // (pierde la ronda), por eso pasa por modal de confirmación.
  const [pendingLevel, setPendingLevel] = useStateG(null);
  const [log, setLog] = useStateG([]);

  // LEVELS_CFG vive en screens.jsx y se expone vía window. Lo leemos aquí
  // para renderizar los chips del HUD y mapear el cambio de nivel.
  const levels = (typeof LEVELS_CFG !== "undefined" && LEVELS_CFG) || (window.LEVELS_CFG || []);

  function requestSwitchLevel(lvId) {
    if (lvId === catId) return; // ya estás ahí
    setPendingLevel(lvId);
  }

  function confirmSwitchLevel() {
    if (!pendingLevel) return;
    const cfg = levels.find((l) => l.id === pendingLevel);
    if (!cfg) { setPendingLevel(null); return; }
    // Bump gameSeed para que App remonte GameScreen con la nueva categoría
    // (mismo patrón que `go("game")` en app.jsx). Reset de estrellas
    // porque cada partida arranca en 0.
    setApp((s) => ({
      ...s,
      level: cfg.id,
      currentCategory: cfg.id,
      currentCatLabel: cfg.catLabel,
      stars: 0,
      gameSeed: (s.gameSeed || 0) + 1,
    }));
    setPendingLevel(null);
  }

  // Reinicia la sesión manteniendo el nivel actual. Bump gameSeed para que
  // App remonte GameScreen con estado fresco (palabra nueva, 0/3 rondas).
  function confirmRestart() {
    setApp((s) => ({
      ...s,
      stars: 0,
      gameSeed: (s.gameSeed || 0) + 1,
    }));
    setConfirmingRestart(false);
  }

  const started = useRefG(Date.now());
  const exerciseStart = useRefG(Date.now());

  useEffectG(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - started.current) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, []);

  function pressLetter(letter) {
    // Calcular el siguiente slot vacío DENTRO del setter para que el state
    // sea consistente cuando el usuario toca varias vocales seguidas muy
    // rápido (palabras con 2-3 vocales ocultas). Antes había bug: dos
    // pressLetter consecutivos veían el mismo `filled` viejo y escribían
    // al mismo slot.
    setFilled((prev) => {
      const len = problem.hiddenIdx.length;
      const next = [...prev];
      while (next.length < len) next.push(undefined);
      for (let i = 0; i < len; i++) {
        if (next[i] === undefined) { next[i] = letter; return next; }
      }
      return prev; // todas llenas, no hacer nada
    });
  }

  function eraseSlot(slotIdx) {
    setFilled((prev) => {
      const next = [...prev];
      while (next.length < problem.hiddenIdx.length) next.push(undefined);
      next[slotIdx] = undefined;
      return next;
    });
  }

  function erase() {
    // Borra la última letra colocada (el primer slot lleno empezando por la derecha).
    for (let i = problem.hiddenIdx.length - 1; i >= 0; i--) {
      if (filled[i] !== undefined) {
        eraseSlot(i);
        return;
      }
    }
  }

  function verify() {
    const allFilled = problem.hiddenIdx.every((_, i) => filled[i] !== undefined);
    if (!allFilled) {
      setFeedback("err");
      setFeedbackMsg("Completa todas las letras");
      setTimeout(() => { setFeedback(null); setFeedbackMsg(""); }, 700);
      return;
    }
    if (typeof window.markFirstAttempt === "function") window.markFirstAttempt();

    // Reconstruir la palabra del usuario.
    const userLetters = problem.letters.slice();
    problem.hiddenIdx.forEach((wordPos, i) => {
      userLetters[wordPos] = filled[i];
    });
    const userWord = userLetters.join("");
    // Aceptar la palabra base O cualquiera de sus alternativas
    // (masculino/femenino, regionalismo). Ej: "pato" o "pata"; "banana"
    // o "banano".
    const accepted = problem.acceptedWords || [problem.word];
    const isCorrect = accepted.includes(userWord);
    const exerciseSec = Math.max(0, Math.floor((Date.now() - exerciseStart.current) / 1000));
    const earned = isCorrect ? Math.max(1, 10 - Math.floor(exerciseSec / 3)) : 0;

    const newAttempted = attempted + 1;
    const newSolved = solved + (isCorrect ? 1 : 0);
    const newStarsSession = starsSession + earned;
    const newStarsTotal = stars + earned;

    // Para el reporte: si la palabra acepta variantes, mostrar todas
    // separadas por " o " (ej. "banana o banano", "gato o gata"). Si solo
    // hay una grafía válida, mostrar esa.
    const displayCorrect = accepted.length > 1 ? accepted.join(" o ") : problem.word;
    const entry = {
      idx: newAttempted,
      a: displayCorrect,         // palabra(s) correcta(s) para el reporte
      b: userWord,               // palabra del estudiante
      op: "📝",
      correctAnswer: displayCorrect,
      userAnswer: userWord,
      isCorrect,
      time: exerciseSec,
      earned,
      emoji: problem.emoji,
    };
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

    const wait = isCorrect ? 950 : 1200;
    setTimeout(() => {
      setFeedback(null);
      setFeedbackMsg("");
      setFilled([]);
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
        window.incrementGamesCompleted && window.incrementGamesCompleted();
        go("results");
      } else {
        const p = makeProblem(catId, usedRef.current);
        usedRef.current.add(p.word);
        pushRecentlySeen(catCfg.recentKey, p.word);
        setProblem(p);
        exerciseStart.current = Date.now();
      }
    }, wait);
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }

  // Tamaño dinámico de las casillas según el largo de la palabra. Cabe en
  // ~430 px de ancho (zona-central interior). Tamaños generosos para tap.
  const wordLen = problem.letters.length;
  const SLOT_W = wordLen <= 4 ? 64 : wordLen <= 6 ? 56 : wordLen <= 8 ? 46 : 40;
  const SLOT_H = wordLen <= 4 ? 72 : wordLen <= 6 ? 66 : 58;
  const SLOT_GAP = wordLen <= 6 ? 8 : 6;

  // Mapeo letra-en-slot → índice del slot oculto.
  const slotOfHidden = (wordPos) => problem.hiddenIdx.indexOf(wordPos);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* HUD superior — logo izq, contador central (sin tabs de nivel,
          juego de 1 solo nivel), tiempo+estrellas der. */}
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

      {/* Chips de tema centrados — permiten cambiar de nivel sin volver al
          Home. La acción es destructiva (se pierde la ronda) así que pasa
          por SwitchLevelModal. */}
      <div style={{
        position: "absolute", top: 18, left: "50%", transform: "translateX(-50%)",
        display: "flex", alignItems: "center", gap: 6,
      }}>
        {levels.map((lv) => {
          const active = lv.id === catId;
          return (
            <button
              key={lv.id}
              onClick={() => requestSwitchLevel(lv.id)}
              title={active ? "Tema actual" : `Cambiar a "${lv.label}"`}
              style={{
                padding: "5px 12px",
                borderRadius: 999,
                background: active ? lv.grad : "rgba(0,0,0,0.35)",
                color: active ? lv.ink : "rgba(252,233,168,0.85)",
                fontFamily: "var(--ed-font-display)",
                fontWeight: 700, fontSize: 11, letterSpacing: "0.02em",
                border: active ? "1px solid rgba(255,255,255,0.55)" : "1px solid rgba(242,194,96,0.35)",
                boxShadow: active
                  ? "inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -2px 0 rgba(0,0,0,0.18), 0 0 12px rgba(255,255,255,0.18)"
                  : "none",
                cursor: active ? "default" : "pointer",
                transition: "all 0.18s ease",
                whiteSpace: "nowrap",
              }}
            >
              {lv.label}
            </button>
          );
        })}
      </div>

      {/* Indicador de ronda (3 dots) — debajo de los chips */}
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

      {/* Personaje compañero — columna izquierda, centrado verticalmente
          (no pegado al fondo). PNG 190 grande para destacar al personaje
          como guía pedagógico. El bocadillo se ancla aquí mismo (relativo)
          para que la cola del globo apunte directo a la cabeza. */}
      <div data-qa="personaje" style={{
        position: "absolute", left: 8, bottom: 90, width: 220,
        pointerEvents: "none", textAlign: "center",
      }}>
        {/* Bocadillo de pista — el padre flex centra al hijo inline-block que
            se ajusta al texto (sin width fijo). Así textos cortos no dejan
            espacio en blanco al lado. */}
        <div data-qa="bocadillo" className="ed-float-soft" style={{
          position: "absolute", left: 0, right: 0, bottom: "100%",
          display: "flex", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <div style={{
            position: "relative",
            display: "inline-block",
            maxWidth: 208,
            background: "linear-gradient(180deg, rgba(20,12,55,0.95), rgba(10,6,35,0.95))",
            border: "1.5px solid rgba(242,194,96,0.65)",
            borderRadius: 16,
            padding: "10px 14px",
            fontFamily: "var(--ed-font-display)",
            fontWeight: 700, fontSize: 14, lineHeight: 1.25,
            color: "#fce9a8", textAlign: "center",
            boxShadow: "0 10px 24px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}>
            {catCfg.hint}
            {/* Cola del bocadillo — centrada al cuadro. */}
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

      {/* Enunciado principal del ejercicio — texto blanco grande encima
          del cartel del emoji. Bajado a top:88 (era 76) para no chocar
          con los dots de Ronda (top:54..68). */}
      <div style={{
        position: "absolute", top: 88, left: 250, right: 250,
        textAlign: "center",
        fontFamily: "var(--ed-font-display)", fontWeight: 700,
        fontSize: 20, lineHeight: 1.15,
        color: "#fff",
        textShadow: "0 2px 6px rgba(0,0,0,0.55)",
        pointerEvents: "none",
      }}>
        {catCfg.instruction}
      </div>

      {/* ══════ ZONA CENTRAL: emoji + casillas de palabra ══════
          Distribución proporcional: gap enunciado↔cartel ≈ 32, gap interno
          cartel↔casillas ≈ 28, gap casillas↔bandeja ≈ 28 (la bandeja sube
          a bottom:30). El espacio vertical se reparte parejo. */}
      <div data-qa="zona-central" style={{
        position: "absolute", top: 128, left: "50%", transform: "translateX(-50%)",
        width: 460, textAlign: "center",
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 24,
      }}>
        {/* Cartel del emoji con marco dorado — achicado un poco (170×155
            vs 195×180 anterior) para liberar espacio vertical y dar
            respiración al enunciado/Ronda de arriba. */}
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

        {/* Palabra con casillas — letras visibles en blanco, casillas a llenar
            como slots vacíos con borde dorado. */}
        <div style={{
          display: "flex", justifyContent: "center", alignItems: "center",
          gap: SLOT_GAP,
          padding: "4px 6px",
        }}>
          {problem.letters.map((ch, wordPos) => {
            const hiddenSlot = slotOfHidden(wordPos);
            const isHidden = hiddenSlot >= 0;
            if (!isHidden) {
              // Letra visible (fija, en blanco).
              return (
                <div key={wordPos} style={{
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
              );
            }
            // Casilla por llenar.
            const f = filled[hiddenSlot];
            const isFilled = f !== undefined;
            // El slot "activo" = primer slot vacío empezando por la izquierda.
            let activeIdx = -1;
            for (let k = 0; k < problem.hiddenIdx.length; k++) {
              if (filled[k] === undefined) { activeIdx = k; break; }
            }
            const isActive = hiddenSlot === activeIdx;
            return (
              <button
                key={wordPos}
                onClick={() => { if (isFilled) eraseSlot(hiddenSlot); }}
                style={{
                  width: SLOT_W, height: SLOT_H,
                  borderRadius: 12,
                  border: `2.5px solid ${
                    feedback === "ok" ? "#2ecc8f" :
                    feedback === "err" ? "#ff6b6b" :
                    isActive ? "#fce9a8" : "rgba(242,194,96,0.55)"
                  }`,
                  background: isFilled
                    ? "linear-gradient(180deg, rgba(252,233,168,0.95), rgba(217,164,65,0.85))"
                    : "rgba(10,6,35,0.55)",
                  color: isFilled ? "#3a2608" : "rgba(252,233,168,0.5)",
                  fontFamily: "var(--ed-font-display)", fontWeight: 800,
                  fontSize: SLOT_H * 0.55,
                  cursor: isFilled ? "pointer" : "default",
                  boxShadow: isActive
                    ? "0 0 14px rgba(252,233,168,0.5), inset 0 1px 0 rgba(255,255,255,0.15)"
                    : isFilled
                      ? "0 4px 10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.4)"
                      : "inset 0 1px 0 rgba(255,255,255,0.08)",
                  transition: "all 0.15s ease",
                }}
                title={isFilled ? "Toca para borrar" : "Toca una letra de abajo"}
              >
                {isFilled ? f : "_"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bandeja de vocales — fila inferior centrada. 5 fichas fijas
          (a, e, i, o, u) en minúsculas, todas REUTILIZABLES (sin estado
          "consumida"). Subida a bottom:30 para que el espacio entre
          casillas y bandeja sea proporcional al espacio enunciado↔cartel. */}
      <div data-qa="bandeja" style={{
        position: "absolute", bottom: 30, left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: 12, flexWrap: "nowrap",
        maxWidth: 760, justifyContent: "center",
      }}>
        {problem.tray.map((letter, trayIdx) => {
          const color = ["#ef5a5a","#f5a623","#f5d84b","#4fa0ff","#2ecc8f"][trayIdx % 5];
          return (
            <button
              key={trayIdx}
              className="ed-numpad-key"
              onClick={() => pressLetter(letter)}
              style={{
                width: 64, height: 68, fontSize: 30,
                borderColor: color,
                borderWidth: 2, borderStyle: "solid",
                cursor: "pointer",
              }}
              title="Toca para colocar (puedes usarla varias veces)"
            >
              {letter}
            </button>
          );
        })}
      </div>

      {/* Acciones derecha — VERIFICAR · BORRAR · REINICIAR · SALIR.
          Total 4 botones × 56px + 3 gaps × 12px = 260px, centrados
          verticalmente en el canvas de 540px (sobra margen). */}
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

      {/* Modal de cambio de tema — destructivo: pierde la ronda en curso. */}
      {pendingLevel && (() => {
        const cfg = levels.find((l) => l.id === pendingLevel);
        if (!cfg) return null;
        return (
          <PortalToBody>
            <div
              onClick={() => setPendingLevel(null)}
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
                style={{ padding: 24, maxWidth: 460, textAlign: "center", boxShadow: "var(--ed-shadow-card), 0 0 40px rgba(148,120,255,0.3)" }}
              >
                <div className="ed-label" style={{ color: "#a78bfa", marginBottom: 6 }}>
                  Cambiar de tema
                </div>
                <h2 className="ed-h1" style={{ fontSize: 22, lineHeight: 1.15, marginBottom: 8 }}>
                  ¿Ir a "{cfg.label}"?
                </h2>
                <p className="ed-body" style={{ marginBottom: 16, fontSize: 14 }}>
                  Vas a perder el progreso de esta ronda ({attempted}/3 palabras). No habrá reporte de esta sesión.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <button className="ed-btn ed-btn-ghost" onClick={() => setPendingLevel(null)} style={{ height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
                    SEGUIR JUGANDO
                  </button>
                  <button className="ed-btn ed-btn-primary" onClick={confirmSwitchLevel} style={{ height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
                    SÍ, CAMBIAR
                  </button>
                </div>
              </div>
            </div>
          </PortalToBody>
        );
      })()}

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

      {/* Modal de reiniciar — confirma antes de descartar la sesión y empezar
          una palabra nueva en el mismo nivel. */}
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
// shell matemático. Solo cambia el contenido de `lastResult` y la
// columna "Operación" del reporte (acá: la palabra con emoji).
// ─────────────────────────────────────────────────────────────
function formatOp(e) {
  return `${e.emoji || "📝"}  ${e.a}`;
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
              <th style={{ ...printStyles.th, ...printStyles.thR }}>Respuesta del estudiante</th>
              <th style={{ ...printStyles.th, ...printStyles.thR }}>Palabra correcta</th>
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
  const res = app.lastResult || { category: "Completa la palabra", solved: 0, total: 3, time: 0, starsEarned: 0, log: [] };
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
                  <th style={{ textAlign: "right", padding: "6px 8px" }}>Respuesta del estudiante</th>
                  <th style={{ textAlign: "right", padding: "6px 8px" }}>Palabra correcta</th>
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
