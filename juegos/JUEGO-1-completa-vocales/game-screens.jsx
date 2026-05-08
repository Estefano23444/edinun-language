// game-screens.jsx — JUEGO-1 Completa con vocales.
// Mecánica: el estudiante ve una palabra con consonantes intactas y huecos
// donde van las vocales. Toca las vocales del teclado inferior (A E I O U)
// para llenar los huecos en orden. VERIFICAR valida; las vocales se pueden
// reutilizar (dos slots pueden llevar la misma vocal).

const { useState: useStateG, useEffect: useEffectG, useRef: useRefG, useMemo: useMemoG } = React;

function PortalToBody({ children }) {
  return ReactDOM.createPortal(children, document.body);
}

// ─────────────────────────────────────────────────────────────
// Banco de palabras por nivel.
// Reglas:
//   - Mayúsculas, sin tildes (la mecánica no espera acentos).
//   - "Ñ" se trata como consonante fija (queda visible).
//   - basic: palabras 3-4 letras, se oculta 1 vocal.
//   - medium: palabras 4-5 letras, se ocultan 2 vocales.
//   - advanced: palabras 5-7 letras, se ocultan 2-3 vocales (random).
// Cada item lleva pista corta + emoji para audiencia 6-8 años.
// ─────────────────────────────────────────────────────────────
const WORD_BANK = {
  basic: [
    { word: "SOL",  hint: "Brilla en el cielo de día", emoji: "☀️" },
    { word: "MAR",  hint: "Mucha agua azul",            emoji: "🌊" },
    { word: "PAN",  hint: "Lo comemos con leche",       emoji: "🍞" },
    { word: "PEZ",  hint: "Vive en el agua",            emoji: "🐟" },
    { word: "LUZ",  hint: "Se enciende en la lámpara",  emoji: "💡" },
    { word: "GATO", hint: "Animal que dice miau",       emoji: "🐱" },
    { word: "PATO", hint: "Hace cuac cuac",             emoji: "🦆" },
    { word: "FLOR", hint: "Crece en el jardín",         emoji: "🌸" },
    { word: "OSO",  hint: "Animal grande y peludo",     emoji: "🐻" },
    { word: "PIE",  hint: "Lo usamos para caminar",     emoji: "🦶" },
  ],
  medium: [
    { word: "MESA",  hint: "Donde comemos",         emoji: "🍽️" },
    { word: "CASA",  hint: "Donde vivimos",         emoji: "🏠" },
    { word: "LUNA",  hint: "Brilla en la noche",    emoji: "🌙" },
    { word: "PERRO", hint: "Animal que ladra",      emoji: "🐶" },
    { word: "NIÑO",  hint: "Persona pequeña",       emoji: "🧒" },
    { word: "TREN",  hint: "Va por las vías",       emoji: "🚂" },
    { word: "RANA",  hint: "Salta y croa",          emoji: "🐸" },
    { word: "DEDO",  hint: "Hay diez en las manos", emoji: "✋" },
    { word: "PALO",  hint: "Trozo de madera largo", emoji: "🪵" },
    { word: "LECHE", hint: "Sale de la vaca",       emoji: "🥛" },
  ],
  advanced: [
    { word: "ESCUELA",  hint: "Donde aprendemos",            emoji: "🏫" },
    { word: "AMIGO",    hint: "Te acompaña a jugar",         emoji: "🤝" },
    { word: "PLATANO",  hint: "Fruta amarilla larga",        emoji: "🍌" },
    { word: "CABALLO",  hint: "Animal que galopa",           emoji: "🐎" },
    { word: "BOMBERO",  hint: "Apaga incendios",             emoji: "🚒" },
    { word: "MARIPOSA", hint: "Insecto de alas de colores",  emoji: "🦋" },
    { word: "JUGUETE",  hint: "Sirve para divertirse",       emoji: "🧸" },
    { word: "LIBRO",    hint: "Lo leemos cada día",          emoji: "📖" },
    { word: "ZAPATO",   hint: "Va en el pie",                emoji: "👟" },
    { word: "PELOTA",   hint: "Rebota y rueda",              emoji: "⚽" },
  ],
};

const VOWEL_SET = new Set(["A", "E", "I", "O", "U"]);

// ─────────────────────────────────────────────────────────────
// Generador de problemas por nivel.
// ─────────────────────────────────────────────────────────────
function makeProblem(cat) {
  const pool = WORD_BANK[cat] || WORD_BANK.basic;
  const item = pool[Math.floor(Math.random() * pool.length)];
  const word = item.word;

  const allVowelIndices = [];
  for (let i = 0; i < word.length; i++) {
    if (VOWEL_SET.has(word[i])) allVowelIndices.push(i);
  }

  let hideCount;
  if (cat === "basic") hideCount = 1;
  else if (cat === "medium") hideCount = Math.min(2, allVowelIndices.length);
  else hideCount = Math.min(3, Math.max(2, allVowelIndices.length - 1));

  const shuffled = [...allVowelIndices].sort(() => Math.random() - 0.5);
  const hideIndices = shuffled.slice(0, hideCount).sort((a, b) => a - b);
  const correctVowels = hideIndices.map((i) => word[i]);
  const pattern = word.split("").map((ch, i) =>
    hideIndices.includes(i) ? "_" : ch
  ).join("");

  return {
    word,
    hint: item.hint,
    emoji: item.emoji,
    pattern,
    hideIndices,
    correctVowels,
    op: "vocales",
  };
}

// Frases motivadoras para cuando el estudiante se equivoca.
const ENCOURAGEMENTS = [
  "¡Casi! Sigue intentándolo.",
  "Las palabras se aprenden jugando.",
  "¡La próxima es tuya!",
  "Equivocarse también es aprender.",
  "Las vocales son cinco amiguitas.",
  "¡Vamos al siguiente reto!",
  "Cada error te acerca al acierto.",
];

// ─────────────────────────────────────────────────────────────
// PANTALLA DE JUEGO
// ─────────────────────────────────────────────────────────────
function GameScreen({ app, setApp, go }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const cat = app.currentCategory || "basic";
  const catLabel = app.currentCatLabel || "Completa con vocales · Básico";

  const [problem, setProblem] = useStateG(() => makeProblem(cat));
  const [slots, setSlotsG] = useStateG([]);
  const [elapsed, setElapsed] = useStateG(0);
  const [stars, setStars] = useStateG(0);
  const [solved, setSolved] = useStateG(0);
  const [attempted, setAttempted] = useStateG(0);
  const [starsSession, setStarsSession] = useStateG(0);
  const [feedback, setFeedback] = useStateG(null);
  const [feedbackMsg, setFeedbackMsg] = useStateG("");
  const [pendingLevel, setPendingLevel] = useStateG(null);
  const [confirmingExit, setConfirmingExit] = useStateG(false);
  const [log, setLog] = useStateG([]);

  const slotCount = problem.hideIndices.length;
  const started = useRefG(Date.now());
  const exerciseStart = useRefG(Date.now());

  // Cronómetro total
  useEffectG(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - started.current) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, []);

  // press(v) — coloca la vocal v en el primer slot vacío.
  function press(v) {
    if (feedback) return;
    setSlotsG((prev) => {
      const next = [...prev];
      while (next.length < slotCount) next.push(undefined);
      for (let i = 0; i < slotCount; i++) {
        if (next[i] === undefined || next[i] === "") { next[i] = v; return next; }
      }
      return prev;
    });
  }

  // erase — vacía el último slot lleno.
  function erase() {
    if (feedback) return;
    setSlotsG((prev) => {
      const next = [...prev];
      while (next.length < slotCount) next.push(undefined);
      for (let i = slotCount - 1; i >= 0; i--) {
        if (next[i] !== undefined && next[i] !== "") { next[i] = undefined; return next; }
      }
      return next;
    });
  }

  // Toca un slot lleno → vacíarlo (igual que la mecánica CDU del repo hermano).
  function eraseAt(i) {
    if (feedback) return;
    setSlotsG((prev) => {
      const next = [...prev];
      while (next.length < slotCount) next.push(undefined);
      next[i] = undefined;
      return next;
    });
  }

  function verify() {
    const filled = Array.from({ length: slotCount }, (_, i) => slots[i]);
    if (filled.some((v) => v === undefined || v === "")) {
      setFeedback("err");
      setFeedbackMsg("Completa todos los huecos");
      setTimeout(() => { setFeedback(null); setFeedbackMsg(""); }, 700);
      return;
    }
    if (typeof window.markFirstAttempt === "function") window.markFirstAttempt();

    // Reconstruye la palabra del estudiante uniendo consonantes + slots.
    let userWord = "";
    let slotIdx = 0;
    for (let i = 0; i < problem.word.length; i++) {
      if (problem.hideIndices.includes(i)) {
        userWord += filled[slotIdx];
        slotIdx++;
      } else {
        userWord += problem.word[i];
      }
    }
    const isCorrect = userWord === problem.word;
    const exerciseSec = Math.max(0, Math.floor((Date.now() - exerciseStart.current) / 1000));
    const earned = isCorrect ? Math.max(1, 10 - Math.floor(exerciseSec / 3)) : 0;

    const newAttempted = attempted + 1;
    const newSolved = solved + (isCorrect ? 1 : 0);
    const newStarsSession = starsSession + earned;
    const newStarsTotal = stars + earned;

    const entry = {
      idx: newAttempted,
      prompt: `${problem.pattern} — ${problem.hint}`,
      op: problem.op,
      correctAnswer: problem.word,
      userAnswer: userWord,
      isCorrect,
      time: exerciseSec,
      earned,
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
      setSlotsG([]);
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
        setProblem(makeProblem(cat));
        exerciseStart.current = Date.now();
      }
    }, wait);
  }

  function applyLevelChange(newLevel) {
    const labels = { basic: "Básico", medium: "Medio", advanced: "Avanzado" };
    setApp((s) => ({
      ...s,
      level: newLevel,
      currentCategory: newLevel,
      currentCatLabel: `Completa con vocales · ${labels[newLevel]}`,
    }));
    setProblem(makeProblem(newLevel));
    setSlotsG([]);
    setSolved(0);
    setAttempted(0);
    setStarsSession(0);
    setLog([]);
    setFeedback(null);
    setFeedbackMsg("");
    started.current = Date.now();
    exerciseStart.current = Date.now();
    setElapsed(0);
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }

  const levelOfCat = app.level || "basic";

  // El slot "activo" es el primero vacío de izquierda a derecha.
  const activeSlotIdx = (() => {
    for (let k = 0; k < slotCount; k++) {
      if (slots[k] === undefined || slots[k] === "") return k;
    }
    return -1;
  })();

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>


      {/* Top HUD */}
      <div data-qa="hud" style={{ position: "absolute", top: 8, left: 16, right: 16, height: 44, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <EdinunLogoMini size={42} />
        </div>

        <div style={{
          position: "absolute", left: "50%", top: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          {[
            { id: "basic", label: "BÁSICO", c: "#f5a623" },
            { id: "medium", label: "MEDIO", c: "#f5d84b" },
            { id: "advanced", label: "AVANZADO", c: "#4fa0ff" },
          ].map((lv) => {
            const active = lv.id === levelOfCat;
            return (
              <button
                key={lv.id}
                onClick={() => { if (!active) setPendingLevel(lv.id); }}
                disabled={active}
                style={{
                  padding: "6px 14px", borderRadius: 999,
                  background: active ? lv.c : "rgba(255,255,255,0.15)",
                  color: active ? "#0b3a2d" : "rgba(255,255,255,0.85)",
                  fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 13,
                  border: active ? `2px solid ${lv.c}` : "2px solid transparent",
                  boxShadow: active ? `0 0 14px ${lv.c}88` : "none",
                  cursor: active ? "default" : "pointer",
                  transition: "background 0.15s ease, transform 0.1s ease",
                }}
              >
                {lv.label}
              </button>
            );
          })}
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

      {/* Bocadillo de pista — instrucción de CÓMO resolver. */}
      <div data-qa="bocadillo" style={{
        position: "absolute", left: 14, top: 130, width: 215,
        pointerEvents: "none",
      }}>
        <div style={{
          position: "relative",
          background: "linear-gradient(180deg, rgba(20,12,55,0.92), rgba(10,6,35,0.92))",
          border: "1.5px solid rgba(242,194,96,0.55)",
          borderRadius: 16,
          padding: "12px 14px",
          fontFamily: "var(--ed-font-display)",
          fontWeight: 700, fontSize: 16, lineHeight: 1.25,
          color: "#fce9a8", textAlign: "center",
          boxShadow: "0 8px 22px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}>
          Toca la vocal que falta en cada hueco.
          <div style={{
            position: "absolute", bottom: -8, left: "50%", marginLeft: -7,
            width: 0, height: 0,
            borderLeft: "7px solid transparent",
            borderRight: "7px solid transparent",
            borderTop: "8px solid rgba(20,12,55,0.92)",
            filter: "drop-shadow(0 1px 0 rgba(242,194,96,0.55))",
          }} />
        </div>
      </div>

      {/* Personaje compañero — esquina inferior izquierda, 100×100 según
          la zona declarada en layout-grid. */}
      <div data-qa="personaje" style={{
        position: "absolute", left: 0, bottom: 0, width: 100, height: 100,
        pointerEvents: "none", textAlign: "center",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end",
        paddingBottom: 4,
      }}>
        <div style={{ width: 76, height: 76, lineHeight: 0 }}>
          <char.Component size={76} floating />
        </div>
        <div style={{
          fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 11,
          color: "#fce9a8", letterSpacing: "0.04em",
          textShadow: "0 2px 6px rgba(0,0,0,0.6)",
          marginTop: 2,
        }}>{char.name}</div>
      </div>

      {/* Ronda dots */}
      <div style={{
        position: "absolute", top: 78, left: "50%", transform: "translateX(-50%)",
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

      {/* ZONA CENTRAL — emoji + pista + palabra con huecos.
          Posicionada absolutamente en x:260..720 (zona declarada en layout-grid),
          NO centrada con left:50%, para no chocar con el bocadillo (12..240). */}
      <div data-qa="zona-central" style={{
        position: "absolute", left: 260, top: 70,
        width: 460, height: 348,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", gap: 12,
        paddingTop: 4,
      }}>
        {/* Pista visual + textual */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        }}>
          <div style={{ fontSize: 56, lineHeight: 1, filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5))" }}>
            {problem.emoji}
          </div>
          <div style={{
            fontFamily: "var(--ed-font-display)", fontWeight: 700,
            fontSize: 18, lineHeight: 1.2,
            color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,0.6)",
            textAlign: "center", maxWidth: 420,
          }}>
            {problem.hint}
          </div>
        </div>

        {/* Palabra con huecos — fila de letras (consonantes) y slots (vocales). */}
        <div style={{
          display: "flex", gap: 8, alignItems: "center", justifyContent: "center",
          marginTop: 6,
        }}>
          {problem.word.split("").map((ch, i) => {
            const isHidden = problem.hideIndices.includes(i);
            if (isHidden) {
              const sIdx = problem.hideIndices.indexOf(i);
              const v = slots[sIdx];
              const filled = v !== undefined && v !== "";
              const isActive = sIdx === activeSlotIdx;
              return (
                <div
                  key={i}
                  onClick={() => { if (filled) eraseAt(sIdx); }}
                  className={`ed-answer-slot ${isActive ? "active" : ""} ${filled ? "filled" : ""}`}
                  title={filled ? "Toca para borrar" : "Te falta una vocal"}
                  style={{
                    width: 56, height: 76, fontSize: 42,
                    color: "#fff",
                    cursor: filled ? "pointer" : "default",
                    borderColor: feedback === "ok" ? "#2ecc8f" : feedback === "err" ? "#ff6b6b" : undefined,
                    boxShadow: feedback === "ok"
                      ? "0 0 18px rgba(46,204,143,0.65)"
                      : feedback === "err"
                        ? "0 0 18px rgba(255,107,107,0.65)"
                        : undefined,
                  }}
                >
                  {filled ? v : ""}
                </div>
              );
            }
            return (
              <div key={i} style={{
                fontFamily: "var(--ed-font-display)", fontWeight: 700,
                fontSize: 56, lineHeight: 1,
                color: "#fff",
                minWidth: 40, textAlign: "center",
                textShadow: "0 4px 0 rgba(0,0,0,0.35), 0 0 18px rgba(252,233,168,0.25)",
                padding: "0 4px",
              }}>
                {ch}
              </div>
            );
          })}
        </div>
      </div>

      {/* BANDEJA — teclado de vocales (las 5 siempre disponibles, reutilizables). */}
      <div data-qa="bandeja" style={{
        position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)",
        display: "grid", gridTemplateColumns: "repeat(5, 82px)", gap: 12,
      }}>
        {["A", "E", "I", "O", "U"].map((v, i) => {
          const color = ["#ef5a5a","#f5a623","#f5d84b","#4fa0ff","#2ecc8f"][i];
          return (
            <button
              key={v}
              className="ed-numpad-key"
              onClick={() => press(v)}
              disabled={feedback !== null}
              style={{
                height: 82, fontSize: 38,
                borderColor: color,
                borderWidth: 2, borderStyle: "solid",
                cursor: feedback ? "default" : "pointer",
                opacity: feedback ? 0.6 : 1,
              }}
              title={`Tocar para colocar la vocal ${v}`}
            >
              {v}
            </button>
          );
        })}
      </div>

      {/* Botones de acción — columna derecha (zona 740..888) */}
      <div data-qa="acciones" style={{
        position: "absolute", right: 12, top: 80,
        display: "flex", flexDirection: "column", gap: 10, width: 144,
      }}>
        <button
          className="ed-btn ed-btn-verify"
          onClick={verify}
          style={{ fontSize: 15, padding: "0 10px", height: 66, fontWeight: 800, letterSpacing: "0.04em" }}
        >
          ¡VERIFICAR!
        </button>
        <button
          className="ed-btn ed-btn-erase"
          onClick={erase}
          style={{ fontSize: 15, padding: "0 10px", height: 66, fontWeight: 800, letterSpacing: "0.04em" }}
        >
          BORRAR
        </button>
        <button
          className="ed-btn ed-btn-ghost"
          onClick={() => setConfirmingExit(true)}
          title="Salir al inicio"
          style={{ fontSize: 15, padding: "0 10px", height: 66, fontWeight: 800, letterSpacing: "0.04em" }}
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

      {/* Modal de SALIR */}
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
                Vas a perder el progreso de esta ronda ({attempted}/3 ejercicios). No habrá reporte de esta sesión.
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

      {/* Modal de cambio de nivel */}
      {pendingLevel && (() => {
        const labels = { basic: "Básico", medium: "Medio", advanced: "Avanzado" };
        const colors = { basic: "#f5a623", medium: "#f5d84b", advanced: "#4fa0ff" };
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
                style={{
                  padding: 24, maxWidth: 440, textAlign: "center",
                  boxShadow: "var(--ed-shadow-card), 0 0 40px rgba(242,194,96,0.35)",
                }}
              >
                <div className="ed-label" style={{ color: "#fce9a8", marginBottom: 6 }}>
                  Cambiar dificultad
                </div>
                <h2 className="ed-h1" style={{ fontSize: 22, lineHeight: 1.15, marginBottom: 8 }}>
                  ¿Cambiar a <span style={{ color: colors[pendingLevel] }}>{labels[pendingLevel]}</span>?
                </h2>
                <p className="ed-body" style={{ marginBottom: 16, fontSize: 14 }}>
                  Vas a reiniciar la ronda actual. Perderás el progreso de los
                  ejercicios resueltos hasta ahora en esta sesión.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <button
                    className="ed-btn ed-btn-ghost"
                    onClick={() => setPendingLevel(null)}
                    style={{ height: 44, fontWeight: 800, letterSpacing: "0.04em" }}
                  >
                    CANCELAR
                  </button>
                  <button
                    className="ed-btn ed-btn-primary"
                    onClick={() => { applyLevelChange(pendingLevel); setPendingLevel(null); }}
                    style={{ height: 44, fontWeight: 800, letterSpacing: "0.04em" }}
                  >
                    SÍ, CAMBIAR
                  </button>
                </div>
              </div>
            </div>
          </PortalToBody>
        );
      })()}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PANTALLA DE RESULTADOS
// ─────────────────────────────────────────────────────────────
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
            <div style={printStyles.sub}>Reporte académico · Juegos de Lenguaje y Literatura</div>
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
                <td style={{ ...printStyles.td, ...printStyles.tdOp }}>{e.prompt}</td>
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
  const res = app.lastResult || { category: "Completa con vocales", solved: 0, total: 3, time: 0, starsEarned: 0, log: [] };
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
            lineHeight: 1, marginBottom: 4,
          }}>
            {res.surrendered ? "Sesión terminada" : "¡Ronda completa!"}
          </div>
          <char.Component size={180} />
          <div className="ed-body" style={{ fontStyle: "italic", textAlign: "center", maxWidth: 240, fontSize: 13 }}>
            "{app.studentName}, lograste {res.solved} de {totalEx} palabras."
            <div style={{ marginTop: 4, color: "var(--ed-ink-soft)", fontSize: 12 }}>— {char.name}</div>
          </div>
        </div>

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
                Reporte académico · Juegos de Lenguaje y Literatura
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
            <table style={{
              width: "100%", borderCollapse: "collapse",
              fontFamily: "var(--ed-font-ui)", fontSize: 12,
            }}>
              <thead>
                <tr style={{
                  fontFamily: "var(--ed-font-ui)", fontWeight: 700, fontSize: 10,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  color: "var(--ed-ink-dim)",
                  borderBottom: "1px solid rgba(148,120,255,0.3)",
                }}>
                  <th style={{ textAlign: "left", padding: "6px 8px", width: 36 }}>#</th>
                  <th style={{ textAlign: "left", padding: "6px 8px" }}>Palabra</th>
                  <th style={{ textAlign: "right", padding: "6px 8px" }}>Respuesta</th>
                  <th style={{ textAlign: "right", padding: "6px 8px" }}>Correcta</th>
                  <th style={{ textAlign: "center", padding: "6px 8px" }}>Estado</th>
                  <th style={{ textAlign: "right", padding: "6px 8px" }}>Tiempo</th>
                </tr>
              </thead>
              <tbody style={{ fontFamily: "var(--ed-font-mono)" }}>
                {(res.log || []).map((e) => (
                  <tr key={e.idx} style={{ borderBottom: "1px solid rgba(148,120,255,0.18)" }}>
                    <td style={{ padding: "8px 8px", color: "var(--ed-ink-soft)" }}>{e.idx}</td>
                    <td style={{ padding: "8px 8px", fontWeight: 600, fontSize: 11 }}>{e.prompt}</td>
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
