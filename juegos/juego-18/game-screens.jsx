// game-screens.jsx — GameScreen + ResultsScreen para BAÚL-DE-ESCRITURA
// "El baúl de las herramientas de escritura" (TEMA 5 del libro EDINUN, 11 años).
// 1 nivel, 3 rondas con mecánicas DISTINTAS (estándar 7+ años):
//   R1 — Ruleta de los deseos: la rueda sortea un deseo con "si…" y el niño
//        elige el verbo que está en MODO CONDICIONAL (vs pasado/futuro).
//   R2 — El taller de palabras: dado un significado, el niño toca la pieza
//        (PREFIJO o SUFIJO) que se une a la raíz para formar la palabra.
//   R3 — El detective de desinencias: el niño guarda cada verbo conjugado en
//        el grupo de su PERSONA (Yo / Tú / Nosotros) leyendo la terminación.
//
// El shell (HUD, personaje, enunciado, action rail, modales, feedback, reporte
// académico, scoring por tiempo) se hereda del estándar (igual que juego-12).
// Solo cambian los bancos de datos y las 3 Cards de mecánica.

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
  "¡Casi! Sigue intentándolo.",
  "Las palabras son herramientas, ¡ánimo! 🪶",
  "¡La próxima es tuya!",
  "Equivocarse también es aprender.",
  "Escribir bien es un superpoder.",
  "¡Vamos a la siguiente!",
  "Cada error te acerca al acierto.",
];

// Etiquetas legibles de las personas gramaticales (R3).
const PERSON_LABEL = { yo: "Yo", tu: "Tú", nos: "Nosotros" };

// ─────────────────────────────────────────────────────────────
// FIFO anti-repetición por categoría (deseo / taller / desin) en un solo
// key de localStorage. Cada sesión empuja varias entradas; límite alto para
// retener varias sesiones y no repetir consecutivo.
// ─────────────────────────────────────────────────────────────
const RECENT_KEY = "edinun_juego18_recientes_v1";
const RECENT_LIMIT = 24;

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

// Toma n elementos frescos de un banco con FIFO POR CATEGORÍA: bloquea la
// última mitad del banco (los ~floor(N/2) ids más recientes de ESTE prefijo)
// y elige el resto al azar. El pool nunca se vacía.
function pickFreshN(bank, prefix, idOf, n) {
  const pre = prefix + ":";
  const recentIds = getRecent()
    .filter((k) => k.startsWith(pre))
    .map((k) => k.slice(pre.length));
  const blocked = new Set(recentIds.slice(0, Math.floor(bank.length / 2)));
  let pool = bank.filter((b) => !blocked.has(idOf(b)));
  if (pool.length < n) pool = bank;
  const chosen = shuffle(pool).slice(0, n);
  for (const c of chosen) pushRecent(pre + idOf(c));
  return chosen;
}

// ═════════════════════════════════════════════════════════════
// BANCOS DE DATOS — contenido ORIGINAL (no copiado del libro), vocabulario
// ecuatoriano, edad 11 años.
// ═════════════════════════════════════════════════════════════

// R1 — Ruleta de los deseos (MODO CONDICIONAL). Cada deseo tiene una situación
// "si…" con un hueco y un verbo. El niño elige la forma en condicional (-aría)
// frente al imperfecto (-aba) y el futuro (-aré). Verbos -ar para que las tres
// terminaciones sean claramente distintas. `frase` = [antes, después] del hueco.
const R1_DESEOS = [
  { id: "tesoro",  frase: ["Si encontrara un tesoro, yo lo ", " en un cofre."],        correct: "guardaría",      dist: ["guardaba", "guardaré"] },
  { id: "noche",   frase: ["Si fuera de noche, nosotros ", " las estrellas."],          correct: "miraríamos",     dist: ["mirábamos", "miraremos"] },
  { id: "nave",    frase: ["Si tuvieras una nave, ¿a qué planeta ", "?"],               correct: "viajarías",      dist: ["viajabas", "viajarás"] },
  { id: "tiempo",  frase: ["Con más tiempo libre, yo ", " la guitarra."],               correct: "tocaría",        dist: ["tocaba", "tocaré"] },
  { id: "lluvia",  frase: ["Si lloviera todo el día, nosotros ", " en casa."],          correct: "jugaríamos",     dist: ["jugábamos", "jugaremos"] },
  { id: "robot",   frase: ["Si hablaras con un robot, ¿qué le ", "?"],                  correct: "preguntarías",   dist: ["preguntabas", "preguntarás"] },
  { id: "premio",  frase: ["Si ganáramos un premio, nosotros ", " una fiesta."],        correct: "organizaríamos", dist: ["organizábamos", "organizaremos"] },
  { id: "meta",    frase: ["Con un poco más de esfuerzo, tú ", " la meta."],            correct: "alcanzarías",    dist: ["alcanzabas", "alcanzarás"] },
  { id: "escalera",frase: ["Si tuviera una escalera mágica, yo ", " hasta las nubes."], correct: "treparía",       dist: ["trepaba", "treparé"] },
  { id: "sorpresa",frase: ["Si fuera tu cumpleaños, nosotros te ", " una sorpresa."],   correct: "prepararíamos",  dist: ["preparábamos", "prepararemos"] },
];

// R2 — El taller de palabras (PREFIJOS y SUFIJOS). Dado un significado y una
// raíz, el niño une la pieza correcta. `pos` indica si la pieza va al INICIO
// (prefijo) o al FINAL (sufijo) — la posición del hueco enseña la diferencia.
// Piezas sin guion (estándar juego-13). Concatenaciones limpias.
const R2_TALLER = [
  { id: "releer",       sig: "volver a leer un libro",        base: "leer",      pos: "pre", answer: "re",    res: "releer" },
  { id: "deshacer",     sig: "lo contrario de hacer",         base: "hacer",     pos: "pre", answer: "des",   res: "deshacer" },
  { id: "inutil",       sig: "que no es útil",                base: "útil",      pos: "pre", answer: "in",    res: "inútil" },
  { id: "prehistoria",  sig: "antes de la historia escrita",  base: "historia",  pos: "pre", answer: "pre",   res: "prehistoria" },
  { id: "recargar",     sig: "volver a cargar la batería",    base: "cargar",    pos: "pre", answer: "re",    res: "recargar" },
  { id: "incompleto",   sig: "que no está completo",          base: "completo",  pos: "pre", answer: "in",    res: "incompleto" },
  { id: "desatar",      sig: "lo contrario de atar",          base: "atar",      pos: "pre", answer: "des",   res: "desatar" },
  { id: "felizmente",   sig: "de manera feliz",               base: "feliz",     pos: "suf", answer: "mente", res: "felizmente" },
  { id: "rapidamente",  sig: "de manera rápida",              base: "rápida",    pos: "suf", answer: "mente", res: "rápidamente" },
  { id: "papelito",     sig: "un papel pequeño",              base: "papel",     pos: "suf", answer: "ito",   res: "papelito" },
];
const R2_AFIJOS = ["re", "des", "in", "pre", "mente", "ito"];

// R3 — El detective de desinencias. Verbos en presente; la TERMINACIÓN indica
// la persona: -o (yo), -as/-es (tú), -amos/-emos/-imos (nosotros). Se conjuga
// cada raíz en la persona asignada para que el niño lea la desinencia.
const R3_VERBS = [
  { id: "cantar",  stem: "cant",   t: "ar" },
  { id: "saltar",  stem: "salt",   t: "ar" },
  { id: "dibujar", stem: "dibuj",  t: "ar" },
  { id: "caminar", stem: "camin",  t: "ar" },
  { id: "nadar",   stem: "nad",    t: "ar" },
  { id: "bailar",  stem: "bail",   t: "ar" },
  { id: "correr",  stem: "corr",   t: "er" },
  { id: "comer",   stem: "com",    t: "er" },
  { id: "leer",    stem: "le",     t: "er" },
  { id: "escribir",stem: "escrib", t: "ir" },
  { id: "vivir",   stem: "viv",    t: "ir" },
  { id: "partir",  stem: "part",   t: "ir" },
];
const PERSON_ENDINGS = {
  ar: { yo: "o", tu: "as", nos: "amos" },
  er: { yo: "o", tu: "es", nos: "emos" },
  ir: { yo: "o", tu: "es", nos: "imos" },
};

// ─────────────────────────────────────────────────────────────
// makeProblem por ronda
// ─────────────────────────────────────────────────────────────
function makeProblemR1() {
  const deseos = pickFreshN(R1_DESEOS, "deseo", (d) => d.id, 6).map((d) => ({
    ...d,
    options: shuffle([d.correct, ...d.dist]),
  }));
  return { deseos };
}

function makeProblemR2() {
  const pick = pickFreshN(R2_TALLER, "taller", (r) => r.id, 1)[0];
  // Bandeja: pieza correcta + 3 distractoras del set de afijos.
  const others = shuffle(R2_AFIJOS.filter((a) => a !== pick.answer)).slice(0, 3);
  const tray = shuffle([pick.answer, ...others]);
  return { ...pick, tray };
}

function makeProblemR3() {
  const verbs = pickFreshN(R3_VERBS, "desin", (v) => v.id, 6);
  // 2 verbos por persona, repartidos y luego barajados para mostrar.
  const persons = ["yo", "yo", "tu", "tu", "nos", "nos"];
  const tokens = verbs.map((v, i) => {
    const person = persons[i];
    const end = PERSON_ENDINGS[v.t][person];
    return { id: v.id, stem: v.stem, end, word: v.stem + end, person };
  });
  return { tokens: shuffle(tokens) };
}

// ═════════════════════════════════════════════════════════════
// Shell común: HUD, modales, action rail, feedback, personaje
// ═════════════════════════════════════════════════════════════
function GameEnunciado({ text, top = 84 }) {
  if (!text) return null;
  return (
    <div style={{
      position: "absolute", top, left: "50%", transform: "translateX(-50%)", width: 488,
      textAlign: "center",
      fontFamily: "var(--ed-font-display)", fontWeight: 700,
      fontSize: 17, lineHeight: 1.2,
      color: "#fff",
      textShadow: "0 2px 6px rgba(0,0,0,0.6)",
      pointerEvents: "none",
      zIndex: 5,
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
          // Cada punto se pinta por el resultado REAL de su ronda (roundResults[i]),
          // no por el conteo acumulado: ronda 1 fallada + ronda 2 acertada ya no
          // se muestra invertido. Gris si la ronda aún no se ha jugado.
          const done = i < attempted;
          const ok = roundResults[i];
          return (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: "50%",
              background: done ? (ok ? "#fce9a8" : "#ff6b6b") : "rgba(255,255,255,0.2)",
              boxShadow: done ? "0 0 10px currentColor" : "none",
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

function ActionRail({ canVerify, onVerify, showVerify = true, showErase, onErase, onRestart, onExit }) {
  return (
    <div data-qa="acciones" style={{
      position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
      display: "flex", flexDirection: "column", gap: 10, width: 148,
    }}>
      {showVerify && (
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
            fontWeight: 700, fontSize: "clamp(18px, 2.6vmin, 30px)",
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
    <div data-qa="personaje" className="ed-float-soft" style={{
      position: "absolute", left: 8, bottom: 90, width: 220,
      pointerEvents: "none", textAlign: "center",
    }}>
      <div data-qa="bocadillo" style={{
        position: "absolute", left: 0, right: 0, bottom: "100%",
        display: "flex", justifyContent: "center",
        pointerEvents: "none",
      }}>
        <div style={{
          position: "relative",
          width: "fit-content",
          maxWidth: 200,
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
        <char.Component size={190} floating={false} />
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
        @keyframes ed-shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-7px)} 40%,80%{transform:translateX(7px)} }
        @keyframes ed-pop { 0%{transform:scale(1)} 60%{transform:scale(1.25)} 100%{transform:scale(0.4);opacity:0} }
      `}</style>
      <BaulGame key={`baul-${restartTick}`} app={app} setApp={setApp} go={go} onRestart={restart} />
    </>
  );
}

function BaulGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "El baúl de las herramientas de escritura";

  const [ronda, setRonda] = useStateG(0);

  // Picks por ronda (una sola vez por montaje).
  const [r1Pick] = useStateG(() => makeProblemR1());
  const [r2Pick] = useStateG(() => makeProblemR2());
  const [r3Pick] = useStateG(() => makeProblemR3());

  // R1 — ruleta: landed = deseo sorteado | null; choice = verbo elegido | null
  const [r1Landed, setR1Landed] = useStateG(null);
  const [r1Choice, setR1Choice] = useStateG(null);
  const [r1Locked, setR1Locked] = useStateG(false);

  // R2 — taller: placed = afijo colocado en el hueco | null
  const [r2Placed, setR2Placed] = useStateG(null);
  const [r2Locked, setR2Locked] = useStateG(false);

  // R3 — desinencias: place = { tokenId: "yo"|"tu"|"nos"|null }; sel = id seleccionado
  const [r3Place, setR3Place] = useStateG(() => {
    const o = {}; r3Pick.tokens.forEach((t) => { o[t.id] = null; }); return o;
  });
  const [r3Sel, setR3Sel] = useStateG(null);
  const [r3Locked, setR3Locked] = useStateG(false);

  // Auto-evaluación (comportamiento B) de R1 y R2: al tocar una opción se
  // resalta y, tras ~700 ms para recapacitar, se califica sola y avanza.
  const r1AutoRef = useRefG(null);
  const r2AutoRef = useRefG(null);
  const verifyTimerRef = useRefG(null);
  const advanceTimerRef = useRefG(null);
  // Vivo mientras el componente esté montado; los timeouts pendientes lo
  // consultan y abortan al desmontar (REINICIAR remonta BaulGame con key nueva)
  // para no disparar setState/navegación sobre un árbol que ya no existe.
  const aliveRef = useRefG(true);
  useEffectG(() => () => {
    aliveRef.current = false;
    clearTimeout(r1AutoRef.current); clearTimeout(r2AutoRef.current);
    clearTimeout(verifyTimerRef.current); clearTimeout(advanceTimerRef.current);
  }, []);

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

  // ── Completitud por ronda. R1 (ruleta, tocar 1 verbo) y R2 (taller, tocar 1
  // afijo) se AUTO-EVALÚAN (comportamiento B): no muestran VERIFICAR y su
  // canVerify queda en false. Solo R3 (arrastrar/clasificar) usa VERIFICAR manual.
  const r3AllPlaced = r3Pick.tokens.every((t) => r3Place[t.id] !== null);
  const canVerify =
    ronda === 0 ? false :
    ronda === 1 ? false :
    ronda === 2 ? (r3AllPlaced && !r3Locked) :
    false;

  // R1 (ruleta): califica con el verbo tocado (mismo flujo que tenía VERIFICAR).
  function gradeR1(choice) {
    if (r1Locked) return;
    setR1Locked(true);
    const correct = choice === r1Landed.correct;
    const userText = choice;
    const correctText = r1Landed.correct;
    verifyTimerRef.current = setTimeout(() => answer(correct, userText, correctText, "🎡"), 380);
  }

  // R2 (taller): califica con el afijo tocado (mismo flujo que tenía VERIFICAR).
  function gradeR2(choice) {
    if (r2Locked) return;
    setR2Locked(true);
    const correct = choice === r2Pick.answer;
    const built = r2Pick.pos === "pre" ? (choice + r2Pick.base) : (r2Pick.base + choice);
    const userText = built;
    const correctText = r2Pick.res;
    verifyTimerRef.current = setTimeout(() => answer(correct, userText, correctText, "🔨"), 380);
  }

  function handleVerify() {
    if (!canVerify) return;
    if (ronda === 2) {
      setR3Locked(true);
      const okCount = r3Pick.tokens.filter((t) => r3Place[t.id] === t.person).length;
      const total = r3Pick.tokens.length;
      const correct = okCount === total;
      // Reporte reconstruible: en vez de "N/6 en su grupo", listar los verbos
      // MAL colocados con la persona donde los puso el niño (userText) frente a
      // su persona correcta (correctText), para que un docente vea qué falló.
      const PL = { yo: "Yo", tu: "Tú", nos: "Nos" };
      const wrong = r3Pick.tokens.filter((t) => r3Place[t.id] !== t.person);
      const userText = correct
        ? `Todos en su persona (${total}/${total})`
        : wrong.map((t) => `${t.word}→${PL[r3Place[t.id]] || "?"}`).join(", ");
      const correctText = correct
        ? "Cada verbo en su persona"
        : wrong.map((t) => `${t.word}→${PL[t.person]}`).join(", ");
      verifyTimerRef.current = setTimeout(() => answer(correct, userText, correctText, "🔎"), 380);
    }
  }

  function handleErase() {
    // Solo R3 usa BORRAR; R1 y R2 se auto-evalúan al tocar.
    if (ronda === 2 && !r3Locked) {
      setR3Place(() => { const o = {}; r3Pick.tokens.forEach((t) => { o[t.id] = null; }); return o; });
      setR3Sel(null);
    }
  }

  function answer(isCorrect, userText, correctText, opIcon, earnedOverride) {
    if (!aliveRef.current) return;
    if (typeof window.markFirstAttempt === "function") window.markFirstAttempt();
    const exerciseSec = Math.max(0, Math.floor((Date.now() - exerciseStart.current) / 1000));
    const earned = (earnedOverride != null) ? earnedOverride : calcStars(isCorrect, exerciseSec);
    const newAttempted = attempted + 1;
    const newSolved = solved + (isCorrect ? 1 : 0);
    const newStarsTotal = stars + earned;
    const newStarsSession = starsSession + earned;

    const entry = {
      idx: newAttempted,
      a: correctText, b: userText, op: opIcon || "·",
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

    const wait = isCorrect ? 1000 : 1500;
    advanceTimerRef.current = setTimeout(() => {
      if (!aliveRef.current) return;
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
    ronda === 0 ? "Elige el verbo en condicional para cada deseo." :
    ronda === 1 ? "Forma la palabra que tenga ese significado." :
    "Lleva cada verbo al grupo de su persona.";
  const bocadillo =
    ronda === 0 ? "Gira la ruleta y\ntoca el verbo\ncorrecto." :
    ronda === 1 ? "Elige el prefijo o sufijo\nque forma la palabra." :
    "Lee la terminación:\narrastra cada verbo\na su grupo.";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <GameHUD elapsed={elapsed} stars={stars} attempted={attempted} solved={solved} total={3} roundResults={log.map((e) => e.isCorrect)} />
      <CharacterCorner char={char} message={bocadillo} />
      <GameEnunciado text={enunciado} top={ronda === 2 ? 104 : 86} />

      {ronda === 0 && (
        <DeseoRuletaCard
          pick={r1Pick}
          landed={r1Landed}
          choice={r1Choice}
          locked={r1Locked}
          onLanded={(d) => setR1Landed(d)}
          onChoose={(opt) => {
            if (r1Locked || !r1Landed) return;
            // Comportamiento B: resalta y, tras ~700 ms para recapacitar, califica sola.
            setR1Choice(opt);
            clearTimeout(r1AutoRef.current);
            r1AutoRef.current = setTimeout(() => gradeR1(opt), 700);
          }}
        />
      )}

      {ronda === 1 && (
        <TallerCard
          pick={r2Pick}
          placed={r2Placed}
          locked={r2Locked}
          onPlace={(afijo) => {
            if (r2Locked) return;
            // Comportamiento B: resalta y, tras ~700 ms para recapacitar, califica sola.
            setR2Placed(afijo);
            clearTimeout(r2AutoRef.current);
            r2AutoRef.current = setTimeout(() => gradeR2(afijo), 700);
          }}
        />
      )}

      {ronda === 2 && (
        <DesinenciaCard
          pick={r3Pick}
          place={r3Place}
          sel={r3Sel}
          locked={r3Locked}
          onTapToken={(id) => {
            if (r3Locked) return;
            // tocar un verbo ya colocado lo devuelve a la bandeja; si no, lo selecciona.
            if (r3Place[id] !== null) {
              setR3Place((p) => ({ ...p, [id]: null }));
              setR3Sel(null);
            } else {
              setR3Sel((s) => (s === id ? null : id));
            }
          }}
          onDropZone={(zoneId, id) => {
            if (r3Locked) return;
            setR3Sel(null);
            if (zoneId === "__pool") setR3Place((p) => ({ ...p, [id]: null }));
            else if (R3_DRAWERS.some((d) => d.person === zoneId)) setR3Place((p) => ({ ...p, [id]: zoneId }));
          }}
          onDrawerClick={(person) => {
            if (r3Locked || r3Sel === null) return;
            setR3Place((p) => ({ ...p, [r3Sel]: person }));
            setR3Sel(null);
          }}
        />
      )}

      <ActionRail
        canVerify={canVerify}
        onVerify={handleVerify}
        showVerify={ronda === 2}
        showErase={ronda === 2}
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
// R1 · Ruleta de los deseos — la rueda gira y sortea un deseo con "si…". El
// niño elige el verbo que está en MODO CONDICIONAL entre 3 opciones (vs
// imperfecto y futuro). Al fallar, la correcta queda en verde con ✓ (§11).
// ─────────────────────────────────────────────────────────────
const SECTOR_COLORS = ["#ef5a5a", "#4fa0ff", "#2ecc8f", "#f2a73b", "#a78bfa", "#ff8a3a"];
const SECTOR_EMOJIS = ["✨", "💭", "🌟", "💡", "🔮", "⭐"];

function polarTop(cx, cy, r, deg) {
  const rad = (deg * Math.PI) / 180; // 0 = arriba, sentido horario
  return [cx + r * Math.sin(rad), cy - r * Math.cos(rad)];
}
function sectorPath(cx, cy, r, a0, a1) {
  const [x0, y0] = polarTop(cx, cy, r, a0);
  const [x1, y1] = polarTop(cx, cy, r, a1);
  return `M${cx},${cy} L${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 0 1 ${x1.toFixed(2)},${y1.toFixed(2)} Z`;
}

function DeseoRuletaCard({ pick, landed, choice, locked, onLanded, onChoose }) {
  const [rotation, setRotation] = useStateG(0);
  const [spinning, setSpinning] = useStateG(false);
  const spunRef = useRefG(false);
  const N = pick.deseos.length; // 6
  const seg = 360 / N;
  const R = 86, C = 96;

  function spin() {
    if (spinning || spunRef.current) return;
    spunRef.current = true;
    setSpinning(true);
    const targetIdx = Math.floor(Math.random() * N);
    const jitter = Math.random() * (seg - 24) - (seg - 24) / 2; // dentro del sector
    const newRot = 360 * 5 - targetIdx * seg + jitter;
    setRotation(newRot);
    setTimeout(() => {
      setSpinning(false);
      onLanded(pick.deseos[targetIdx]);
    }, 2350);
  }

  const optionChip = (opt) => {
    const isChoice = choice === opt;
    const isAnswer = landed && landed.correct === opt;
    let bg = "rgba(255,255,255,0.92)", border = "rgba(116,72,32,0.3)", color = "#3a2608", badge = null;
    if (locked) {
      if (isAnswer) {
        bg = "linear-gradient(180deg, rgba(46,204,143,0.95), rgba(34,160,108,0.95))";
        border = "#2ecc8f"; color = "#fff";
        badge = (
          <div style={{
            position: "absolute", top: -10, right: -10, width: 24, height: 24, borderRadius: "50%",
            background: "#2ecc8f", border: "2px solid #fff", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 900, boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
          }}>✓</div>
        );
      } else if (isChoice) {
        bg = "linear-gradient(180deg, rgba(255,107,107,0.95), rgba(220,80,80,0.95))";
        border = "#ff6b6b"; color = "#fff";
        // Revela TAMBIÉN lo que puso el niño con ✗ rojo (no solo color), junto al
        // ✓ verde del correcto: así se ven AMBAS y no es feedback solo cromático.
        badge = (
          <div style={{
            position: "absolute", top: -10, right: -10, width: 24, height: 24, borderRadius: "50%",
            background: "#ff6b6b", border: "2px solid #fff", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 900, boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
          }}>✗</div>
        );
      } else {
        bg = "rgba(255,255,255,0.5)"; color = "rgba(58,38,8,0.6)";
      }
    } else if (isChoice) {
      bg = "linear-gradient(180deg,#fce9a8,#e9c45a)"; border = "#4fd8ff";
    }
    return (
      <button key={opt}
        onClick={() => onChoose(opt)}
        disabled={locked}
        style={{
          position: "relative",
          padding: "10px 16px", borderRadius: 12,
          border: `2.5px solid ${border}`, background: bg, color,
          fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 17,
          letterSpacing: "0.02em",
          cursor: locked ? "default" : "pointer",
          boxShadow: isChoice && !locked ? "0 0 16px rgba(79,216,255,0.6)" : "0 4px 10px rgba(0,0,0,0.28)",
          transform: isChoice && !locked ? "translateY(-2px)" : "none",
          transition: "all 0.15s ease",
        }}>
        {opt}
        {badge}
      </button>
    );
  };

  return (
    <div data-qa="zona-central" style={{
      position: "absolute",
      // Pre-spin (ruleta + GIRAR) sube el contenedor para centrar la ruleta;
      // landed (ruleta + deseo + opciones) usa el encuadre balanceado completo
      // para repartir el espacio y no dejar hueco abajo.
      top: landed ? 116 : 96, bottom: landed ? 16 : 96,
      left: "50%", transform: "translateX(-50%)",
      width: 460, display: "flex", flexDirection: "column",
      justifyContent: landed ? "space-evenly" : "center", alignItems: "center", gap: 12,
    }}>
      {/* Ruleta + puntero */}
      <div data-qa="bandeja" style={{ position: "relative", width: 192, height: 200 }}>
        <div style={{
          position: "absolute", top: -2, left: "50%", transform: "translateX(-50%)",
          width: 0, height: 0,
          borderLeft: "12px solid transparent", borderRight: "12px solid transparent",
          borderTop: "20px solid #fce9a8",
          filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.5))", zIndex: 3,
        }} />
        <div style={{
          position: "absolute", top: 12, left: 0, width: 192, height: 192,
          transition: spinning ? "transform 2.3s cubic-bezier(0.17,0.67,0.21,1)" : "none",
          transform: `rotate(${rotation}deg)`,
        }}>
          <svg viewBox="0 0 192 192" width="192" height="192" style={{ display: "block" }}>
            <circle cx={C} cy={C} r={R + 4} fill="#0b3a2d" stroke="#fce9a8" strokeWidth="3" />
            {pick.deseos.map((_, i) => (
              <path key={i}
                d={sectorPath(C, C, R, i * seg - seg / 2, i * seg + seg / 2)}
                fill={SECTOR_COLORS[i % SECTOR_COLORS.length]}
                stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
            ))}
            {pick.deseos.map((_, i) => {
              const [ex, ey] = polarTop(C, C, R * 0.6, i * seg);
              return (
                <text key={`e${i}`} x={ex} y={ey + 7} textAnchor="middle"
                  style={{ fontSize: 22 }}>{SECTOR_EMOJIS[i % SECTOR_EMOJIS.length]}</text>
              );
            })}
            <circle cx={C} cy={C} r="14" fill="#fce9a8" stroke="#d9a441" strokeWidth="2" />
          </svg>
        </div>
      </div>

      {/* Antes de girar: botón GIRAR. Después: deseo + opciones. */}
      {!landed ? (
        <button
          onClick={spin}
          disabled={spinning}
          style={{
            marginTop: 4, padding: "12px 34px", borderRadius: 14,
            border: "2.5px solid #f2c260",
            background: spinning ? "rgba(255,255,255,0.4)" : "linear-gradient(180deg,#ffe97a,#d7b12a)",
            color: "#3a2608", fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 20,
            letterSpacing: "0.06em", cursor: spinning ? "default" : "pointer",
            boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
          }}>
          {spinning ? "GIRANDO…" : "🎡 GIRAR"}
        </button>
      ) : (
        <>
          {/* Deseo sorteado (con el hueco resaltado) */}
          <div style={{
            width: "fit-content", maxWidth: 446,
            padding: "10px 18px", borderRadius: 14,
            background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(240,235,225,0.92))",
            border: "3px solid #f2c260",
            fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 17,
            color: "#3a2608", textAlign: "center", lineHeight: 1.3,
            boxShadow: "0 10px 24px rgba(0,0,0,0.4)",
          }}>
            {landed.frase[0]}
            <span style={{
              display: "inline-block", minWidth: 56, padding: "0 8px",
              borderBottom: "3px solid #d9a441", color: "#b07d1d", fontWeight: 900,
            }}>{choice || "____"}</span>
            {landed.frase[1]}
          </div>
          {/* Opciones de verbo */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {landed.options.map((opt) => optionChip(opt))}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// R2 · El taller de palabras — dado un significado y una raíz, el niño toca
// la pieza (PREFIJO o SUFIJO) que se une a la raíz. El hueco va al inicio o al
// final según corresponda (enseña dónde va cada pieza). Al fallar, la pieza
// correcta de la bandeja queda en verde con ✓ (§11).
// ─────────────────────────────────────────────────────────────
function TallerCard({ pick, placed, locked, onPlace }) {
  const isPre = pick.pos === "pre";
  const correct = locked && placed === pick.answer;

  const Slot = () => (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      minWidth: 64, height: 46, padding: "0 12px", margin: "0 4px",
      borderRadius: 12,
      border: `2.5px dashed ${placed ? (locked ? (correct ? "#2ecc8f" : "#ff6b6b") : "#4fd8ff") : "rgba(255,255,255,0.6)"}`,
      background: placed
        ? (locked ? (correct ? "rgba(46,204,143,0.25)" : "rgba(255,107,107,0.25)") : "rgba(79,216,255,0.18)")
        : "rgba(255,255,255,0.08)",
      color: "#fff", fontFamily: "var(--ed-font-display)", fontWeight: 900, fontSize: 26,
      verticalAlign: "middle",
    }}>{placed || "?"}</span>
  );

  const Base = () => (
    <span style={{
      display: "inline-flex", alignItems: "center",
      height: 46, padding: "0 6px",
      fontFamily: "var(--ed-font-display)", fontWeight: 900, fontSize: 28,
      color: "#fce9a8", verticalAlign: "middle",
    }}>{pick.base}</span>
  );

  return (
    <div data-qa="zona-central" style={{
      position: "absolute", top: 112, bottom: 20, left: "50%", transform: "translateX(-50%)",
      width: 460, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center", gap: 16,
    }}>
      {/* Cartel del significado objetivo */}
      <div style={{
        width: "fit-content", maxWidth: 420,
        padding: "8px 18px", borderRadius: 999,
        background: "rgba(0,0,0,0.32)", border: "1.5px solid rgba(242,194,96,0.5)",
        fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 16,
        color: "#fff", textAlign: "center",
      }}>
        Significado: “{pick.sig}”
      </div>

      {/* Constructor: hueco + raíz (prefijo) o raíz + hueco (sufijo) */}
      <div data-qa="bandeja" style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minWidth: 240, padding: "10px 16px", borderRadius: 16,
        background: "rgba(8,40,30,0.4)", border: "1.5px solid rgba(242,194,96,0.3)",
      }}>
        {isPre ? (<><Slot /><Base /></>) : (<><Base /><Slot /></>)}
      </div>

      {/* Bandeja de piezas */}
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", maxWidth: 440 }}>
        {pick.tray.map((afijo) => {
          const isChoice = placed === afijo;
          const isAnswer = afijo === pick.answer;
          let bg = "linear-gradient(180deg, rgba(255,250,235,0.97), rgba(244,232,205,0.95))";
          let border = "rgba(116,72,32,0.3)", color = "#3a2608", badge = null;
          if (locked) {
            if (isAnswer) {
              bg = "linear-gradient(180deg, rgba(46,204,143,0.95), rgba(34,160,108,0.95))";
              border = "#2ecc8f"; color = "#fff";
              badge = (
                <div style={{
                  position: "absolute", top: -9, right: -9, width: 22, height: 22, borderRadius: "50%",
                  background: "#2ecc8f", border: "2px solid #fff", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 900,
                }}>✓</div>
              );
            } else if (isChoice) {
              bg = "linear-gradient(180deg, rgba(255,107,107,0.95), rgba(220,80,80,0.95))";
              border = "#ff6b6b"; color = "#fff";
              // Muestra TAMBIÉN la pieza que eligió el niño con ✗ rojo (no solo
              // color), junto al ✓ verde de la correcta: se ven AMBAS.
              badge = (
                <div style={{
                  position: "absolute", top: -9, right: -9, width: 22, height: 22, borderRadius: "50%",
                  background: "#ff6b6b", border: "2px solid #fff", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 900,
                }}>✗</div>
              );
            } else {
              bg = "rgba(255,255,255,0.45)"; color = "rgba(58,38,8,0.55)";
            }
          } else if (isChoice) {
            bg = "linear-gradient(180deg,#fce9a8,#e9c45a)"; border = "#4fd8ff";
          }
          return (
            <button key={afijo}
              onClick={() => { if (!locked) onPlace(afijo); }}
              disabled={locked}
              style={{
                position: "relative",
                minWidth: 66, padding: "12px 18px", borderRadius: 12,
                border: `2.5px solid ${border}`, background: bg, color,
                fontFamily: "var(--ed-font-display)", fontWeight: 900, fontSize: 22,
                cursor: locked ? "default" : "pointer",
                boxShadow: isChoice && !locked ? "0 0 16px rgba(79,216,255,0.6)" : "0 4px 10px rgba(0,0,0,0.3)",
                transform: isChoice && !locked ? "translateY(-2px)" : "none",
                transition: "all 0.15s ease",
              }}>
              {afijo}
              {badge}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Drag+tap con PointerEvents (funciona en táctil; mismo patrón que juego-14/16).
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

// ─────────────────────────────────────────────────────────────
// R3 · El detective de desinencias — verbos conjugados arriba; el niño ARRASTRA
// cada uno a su grupo (Yo / Tú / Nosotros) leyendo la terminación. También
// puede tocar (selecciona) y tocar el grupo. Re-arrastra un verbo ya colocado a
// otro grupo o de vuelta a la bandeja para corregirse. Al verificar, cada verbo
// bien colocado queda verde y los mal puestos rojos con la persona correcta (§11).
// ─────────────────────────────────────────────────────────────
const R3_DRAWERS = [
  { person: "yo",  label: "Yo",       color: "#4fa0ff" },
  { person: "tu",  label: "Tú",       color: "#f2a73b" },
  { person: "nos", label: "Nosotros", color: "#a78bfa" },
];

function verbTokenStyle(state, small) {
  // state: "pool" | "sel" | "ok" | "err" | "placed"
  let bg = "linear-gradient(180deg, rgba(255,250,235,0.97), rgba(244,232,205,0.95))";
  let border = "rgba(116,72,32,0.3)", color = "#3a2608";
  if (state === "sel") { bg = "linear-gradient(180deg,#fce9a8,#e9c45a)"; border = "#4fd8ff"; }
  else if (state === "ok") { bg = "linear-gradient(180deg, rgba(46,204,143,0.95), rgba(34,160,108,0.95))"; border = "#2ecc8f"; color = "#fff"; }
  else if (state === "err") { bg = "linear-gradient(180deg, rgba(255,107,107,0.95), rgba(220,80,80,0.95))"; border = "#ff6b6b"; color = "#fff"; }
  return { bg, border, color };
}

function VerbToken({ token, state, onClick, onPointerDown, small }) {
  const { bg, border, color } = verbTokenStyle(state, small);
  const locked = state === "ok" || state === "err";
  return (
    <div
      className={locked ? "" : "ed-draggable"}
      onClick={onClick}
      onPointerDown={onPointerDown}
      style={{
        position: "relative", display: "inline-flex", alignItems: "center",
        padding: small ? "6px 11px" : "9px 15px", borderRadius: 11,
        border: `2.5px solid ${border}`, background: bg, color,
        fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: small ? 16 : 19,
        boxShadow: state === "sel" ? "0 0 16px rgba(79,216,255,0.6)" : "0 3px 8px rgba(0,0,0,0.3)",
        transform: state === "sel" ? "translateY(-2px)" : "none",
        transition: "all 0.14s ease", whiteSpace: "nowrap",
      }}>
      {token.stem}
      <span style={{
        color: locked ? "#fff" : "#d6463f",
        textDecoration: "underline", textUnderlineOffset: 2,
      }}>{token.end}</span>
    </div>
  );
}

// Ghost que sigue al puntero al arrastrar un verbo.
function verbGhost(token, small) {
  const { bg, border, color } = verbTokenStyle("pool", small);
  return `<div style="display:inline-flex;align-items:center;padding:${small ? "6px 11px" : "9px 15px"};border-radius:11px;border:2.5px solid #4fd8ff;background:linear-gradient(180deg,#fce9a8,#e9c45a);color:#3a2608;font-family:Fredoka,Nunito,sans-serif;font-weight:800;font-size:${small ? 16 : 19}px;box-shadow:0 8px 20px rgba(0,0,0,0.5);white-space:nowrap;">${token.stem}<span style="color:#d6463f;text-decoration:underline;text-underline-offset:2px;">${token.end}</span></div>`;
}

function DesinenciaCard({ pick, place, sel, locked, onTapToken, onDropZone, onDrawerClick }) {
  const pool = pick.tokens.filter((t) => place[t.id] === null);
  const byId = {}; pick.tokens.forEach((t) => { byId[t.id] = t; });

  return (
    <div data-qa="zona-central" style={{
      position: "absolute", top: 116, bottom: 14, left: "50%", transform: "translateX(-50%)",
      width: 470, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 20,
    }}>
      {/* Bandeja de verbos por clasificar (también zona para devolver) */}
      <div data-qa="bandeja" data-dropzone="__pool" style={{
        width: 470, minHeight: 78, padding: "12px 12px", borderRadius: 14,
        background: "rgba(8,40,30,0.4)", border: "1.5px dashed rgba(242,194,96,0.3)",
        display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", alignItems: "center",
      }}>
        {pool.length === 0 && (
          <span style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 14, color: "rgba(255,255,255,0.5)", pointerEvents: "none" }}>
            ¡Todos en su grupo! Toca ¡VERIFICAR!
          </span>
        )}
        {pool.map((t) => (
          <VerbToken key={t.id} token={t}
            state={sel === t.id ? "sel" : "pool"}
            onPointerDown={locked ? undefined : makeDragHandler({
              item: t.id, disabled: locked, ghostHtml: verbGhost(t, false),
              onTap: onTapToken, onDrop: onDropZone,
            })} />
        ))}
      </div>

      {/* Grupos por persona */}
      <div style={{ display: "flex", gap: 10, justifyContent: "center", width: 470 }}>
        {R3_DRAWERS.map((d) => {
          const inDrawer = pick.tokens.filter((t) => place[t.id] === d.person);
          return (
            <div key={d.person}
              data-drawer={d.person} data-dropzone={d.person}
              onClick={() => onDrawerClick(d.person)}
              style={{
                flex: 1, minHeight: 184, borderRadius: 14, padding: "10px 8px 12px",
                background: `${d.color}22`, border: `2px solid ${d.color}`,
                cursor: locked ? "default" : (sel !== null ? "pointer" : "default"),
                display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                boxShadow: sel !== null && !locked ? `0 0 0 2px ${d.color}55` : "none",
                transition: "box-shadow 0.15s ease",
              }}>
              <div style={{
                fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 15,
                color: "#fff", letterSpacing: "0.04em", textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                pointerEvents: "none",
              }}>{d.label}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                {inDrawer.map((t) => {
                  const st = locked ? (t.person === d.person ? "ok" : "err") : "placed";
                  return (
                    <div key={t.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                      <VerbToken token={t} state={st} small
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={locked ? undefined : makeDragHandler({
                          item: t.id, disabled: locked, ghostHtml: verbGhost(t, true),
                          onTap: onTapToken, onDrop: onDropZone,
                        })} />
                      {locked && t.person !== d.person && (
                        <span style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 10, color: "#ffd2d2" }}>
                          → {PERSON_LABEL[t.person]}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
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
  const res = app.lastResult || { category: "El baúl de las herramientas de escritura", solved: 0, total: 3, time: 0, starsEarned: 0, log: [] };
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
