// game-screens.jsx — GameScreen + ResultsScreen para JUEGO-12
// "Te invito a mi fiesta" (TEMA 2 del libro EDINUN, 7 años). 1 nivel, 3 rondas
// con mecánicas DISTINTAS (estándar 7+ años):
//   R1 — Shooter "cazapalabras": caza las palabras bien escritas con m antes
//        de p/b (campana, tambor…) y deja caer las trampas con n (canpana).
//   R2 — Lectura con homófonas: una oración con contexto y un selector inline
//        para elegir la homófona correcta (casa/caza, tubo/tuvo…).
//   R3 — Ruleta de la fiesta: la rueda sortea una frase y el niño dice si es
//        de lenguaje formal o coloquial.
//
// El shell (HUD, personaje, enunciado, action rail, modales, feedback,
// reporte académico, scoring por tiempo) se hereda del estándar (igual que
// juego-11). Solo cambian los bancos de datos y las 3 Cards de mecánica.

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
  "La fiesta sigue, ¡ánimo! 🎉",
  "¡La próxima es tuya!",
  "Equivocarse también es aprender.",
  "Las palabras son una aventura.",
  "¡Vamos a la siguiente!",
  "Cada error te acerca al acierto.",
];

// Etiquetas legibles del tipo de lenguaje (R3).
const TYPE_LABEL = { formal: "Formal", coloquial: "Coloquial" };

// ─────────────────────────────────────────────────────────────
// FIFO anti-repetición por categoría (lab / acer / ruleta) en un solo
// key de localStorage. Cada sesión empuja varias entradas; límite alto
// para retener varias sesiones y no repetir consecutivo.
// ─────────────────────────────────────────────────────────────
const RECENT_KEY = "edinun_juego12_recientes_v1";
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

// ═════════════════════════════════════════════════════════════
// BANCOS DE DATOS
// ═════════════════════════════════════════════════════════════

// R1 — Shooter "cazapalabras": caen palabras y el niño caza solo las BIEN
// escritas (m antes de p/b). Las trampas cambian la m por n (campana→canpana)
// y el niño debe dejarlas caer. Refuerza la discriminación de la regla.
// Todo en minúsculas, sin tildes.
const R1_SHOOTER = [
  // mp
  { ok: "campana",    bad: "canpana" },
  { ok: "campo",      bad: "canpo" },
  { ok: "trompeta",   bad: "tronpeta" },
  { ok: "trompo",     bad: "tronpo" },
  { ok: "limpio",     bad: "linpio" },
  { ok: "empanada",   bad: "enpanada" },
  { ok: "comprar",    bad: "conprar" },
  { ok: "tiempo",     bad: "tienpo" },
  { ok: "rampa",      bad: "ranpa" },
  { ok: "trampa",     bad: "tranpa" },
  { ok: "campamento", bad: "canpamento" },
  { ok: "estampilla", bad: "estanpilla" },
  { ok: "romper",     bad: "ronper" },
  { ok: "pompa",      bad: "ponpa" },
  // mb
  { ok: "tambor",     bad: "tanbor" },
  { ok: "sombrero",   bad: "sonbrero" },
  { ok: "sombra",     bad: "sonbra" },
  { ok: "hombre",     bad: "honbre" },
  { ok: "hombro",     bad: "honbro" },
  { ok: "nombre",     bad: "nonbre" },
  { ok: "alfombra",   bad: "alfonbra" },
  { ok: "cambio",     bad: "canbio" },
  { ok: "bombero",    bad: "bonbero" },
  { ok: "bombilla",   bad: "bonbilla" },
  { ok: "bomba",      bad: "bonba" },
  { ok: "tumba",      bad: "tunba" },
  { ok: "embudo",     bad: "enbudo" },
  { ok: "alambre",    bad: "alanbre" },
  { ok: "hambre",     bad: "hanbre" },
  { ok: "sombrilla",  bad: "sonbrilla" },
  { ok: "temblor",    bad: "tenblor" },
  { ok: "zumbido",    bad: "zunbido" },
];
// (sin meta fija: el puntaje es cuántas palabras correctas atrapas en el tiempo)

// R2 — Lectura con homófonas: un párrafo corto con VARIOS huecos (3). Según
// el CONTEXTO, el niño elige cada homófona en un selector inline. Opciones en
// minúsculas; los huecos caen a mitad de oración (sin mayúscula inicial).
// Cada `parts` mezcla strings (texto) y objetos {options, answer} (huecos).
const R2_BANK = [
  { id: "fiesta", parts: [
    "Te invito a mi ", { options: ["casa", "caza"], answer: "casa" },
    " el sábado. En la fiesta ", { options: ["hay", "ay"], answer: "hay" },
    " globos y pastel; cuando llegues, salúdame con un ", { options: ["hola", "ola"], answer: "hola" },
    " grande. Mi mamá ", { options: ["tuvo", "tubo"], answer: "tuvo" },
    " una linda idea: cada niño ", { options: ["vota", "bota"], answer: "vota" },
    " por el juego que más le gusta.",
  ] },
  { id: "playa", parts: [
    "Fuimos a la playa y me ", { options: ["siento", "ciento"], answer: "siento" },
    " muy feliz. Vimos una ", { options: ["ola", "hola"], answer: "ola" },
    " enorme y juntamos casi un ", { options: ["ciento", "siento"], answer: "ciento" },
    " de conchitas. Papá llenó de agua un ", { options: ["tubo", "tuvo"], answer: "tubo" },
    " y todos gritamos ¡", { options: ["ay", "hay"], answer: "ay" },
    "! cuando salió un cangrejo.",
  ] },
  { id: "parque", parts: [
    "En el parque ", { options: ["hay", "ay"], answer: "hay" },
    " una fuente y el agua baja por un ", { options: ["tubo", "tuvo"], answer: "tubo" },
    " largo. Como llovía llevaba botas y, al saltar un charco, se me salió una ", { options: ["bota", "vota"], answer: "bota" },
    "; grité ¡", { options: ["ay", "hay"], answer: "ay" },
    "! y mi tía ", { options: ["tuvo", "tubo"], answer: "tuvo" },
    " que ayudarme.",
  ] },
  { id: "domingo", parts: [
    "El domingo ", { options: ["hay", "ay"], answer: "hay" },
    " elecciones y mi papá ", { options: ["vota", "bota"], answer: "vota" },
    " temprano. Después volvemos a ", { options: ["casa", "caza"], answer: "casa" },
    " a almorzar. Mi abuela ", { options: ["tuvo", "tubo"], answer: "tuvo" },
    " que cocinar mucho y yo le dije ", { options: ["hola", "ola"], answer: "hola" },
    " a cada invitado.",
  ] },
  { id: "cuento", parts: [
    "Mi maestra leyó un cuento donde un león salió de ", { options: ["caza", "casa"], answer: "caza" },
    ". Llovía y el agua corría por un ", { options: ["tubo", "tuvo"], answer: "tubo" },
    "; el león ", { options: ["tuvo", "tubo"], answer: "tuvo" },
    " miedo y gritó ¡", { options: ["ay", "hay"], answer: "ay" },
    "!, pero al final volvió feliz a su ", { options: ["casa", "caza"], answer: "casa" },
    ".",
  ] },
  { id: "amiga", parts: [
    "Le dije ", { options: ["hola", "ola"], answer: "hola" },
    " a mi amiga en la entrada. Ella ", { options: ["tuvo", "tubo"], answer: "tuvo" },
    " que correr por la lluvia y se le quedó una ", { options: ["bota", "vota"], answer: "bota" },
    " en el lodo. En el salón ", { options: ["hay", "ay"], answer: "hay" },
    " jugo y, cuando tropecé, solté un ¡", { options: ["ay", "hay"], answer: "ay" },
    "! bajito.",
  ] },
];

// R3 — Ruleta: frases de invitación. La rueda sortea una y el niño la
// clasifica en formal o coloquial. Vocabulario ecuatoriano.
const R3_FORMAL = [
  "¿Me podría acompañar a mi fiesta?",
  "Será un honor recibirlos en casa.",
  "Quedan cordialmente invitados.",
  "Le esperamos con mucho gusto.",
  "Agradezco su gentil presencia.",
  "Por favor, confirme su asistencia.",
];
const R3_COLOQUIAL = [
  "¡Topamos en mi cumple!",
  "¡Qué chévere, ahí nos vemos!",
  "¡Ya quiero ir a tu fiesta!",
  "¡Cae a mi casa el sábado!",
  "¡Dale, no te pierdas la fiesta!",
  "¡Va a estar buenazo!",
];

// ─────────────────────────────────────────────────────────────
// makeProblem por ronda
// ─────────────────────────────────────────────────────────────
function pickFresh(bank, prefix, idOf) {
  // FIFO anti-repetición POR CATEGORÍA (estándar 12): se bloquea solo la última
  // mitad del banco (los ~floor(N/2) ids más recientes de ESTE prefijo), no
  // todos los vistos. Así el pool nunca se vacía y siempre se garantiza variar
  // respecto a las últimas jugadas (antes: al acumularse los 6 ids en la lista
  // compartida, el pool quedaba vacío → fallback a random total → repetía).
  const pre = prefix + ":";
  const recentIds = getRecent()
    .filter((k) => k.startsWith(pre))
    .map((k) => k.slice(pre.length));
  const windowN = Math.floor(bank.length / 2);
  const blocked = new Set(recentIds.slice(0, windowN));
  let pool = bank.filter((b) => !blocked.has(idOf(b)));
  if (pool.length === 0) pool = bank;
  const p = pool[Math.floor(Math.random() * pool.length)];
  pushRecent(pre + idOf(p));
  return p;
}

function makeProblemR1() {
  // El shooter gestiona su propio flujo de aparición; solo necesita el pool.
  return { pool: shuffle(R1_SHOOTER) };
}

function makeProblemR2() {
  const pick = pickFresh(R2_BANK, "lec", (r) => r.id);
  const parts = pick.parts.map((p) =>
    typeof p === "string" ? p : { options: shuffle([...p.options]), answer: p.answer }
  );
  return { id: pick.id, parts };
}

function makeProblemR3() {
  const pickN = (bank, type, n) => {
    // Mismo FIFO por ventana que pickFresh: bloquea la última mitad del banco.
    const recentT = getRecent()
      .filter((k) => k.startsWith("ruleta:"))
      .map((k) => k.slice("ruleta:".length))
      .filter((t) => bank.includes(t));
    const blocked = new Set(recentT.slice(0, Math.floor(bank.length / 2)));
    let pool = bank.filter((t) => !blocked.has(t));
    if (pool.length < n) pool = bank;
    const ch = shuffle(pool).slice(0, n);
    for (const t of ch) pushRecent("ruleta:" + t);
    return ch.map((text) => ({ text, type }));
  };
  const phrases = shuffle([
    ...pickN(R3_FORMAL, "formal", 3),
    ...pickN(R3_COLOQUIAL, "coloquial", 3),
  ]);
  return { phrases };
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
        @keyframes ed-fall { from { top: -14%; } to { top: 114%; } }
        @keyframes ed-pop { 0%{transform:scale(1)} 60%{transform:scale(1.25)} 100%{transform:scale(0.4);opacity:0} }
      `}</style>
      <FiestaGame key={`fiesta-${restartTick}`} app={app} setApp={setApp} go={go} onRestart={restart} />
    </>
  );
}

function FiestaGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "Te invito a mi fiesta";

  const [ronda, setRonda] = useStateG(0);

  // Picks por ronda (una sola vez por montaje).
  const [r1Pick] = useStateG(() => makeProblemR1());
  const [r2Pick] = useStateG(() => makeProblemR2());
  const [r3Pick] = useStateG(() => makeProblemR3());

  // R1 — shooter: el ShooterCard gestiona el flujo de caída/captura.
  // r1Locked evita doble cierre cuando se alcanza la meta.
  const [r1Locked, setR1Locked] = useStateG(false);

  // R2 — una elección por hueco de la lectura (array de palabras | null).
  const r2Gaps = r2Pick.parts.filter((p) => typeof p === "object").length;
  const [r2Choices, setR2Choices] = useStateG(() => Array(r2Gaps).fill(null));
  const [r2Locked, setR2Locked] = useStateG(false);

  // R3 — landed = frase que sorteó la ruleta | null; choice = formal|coloquial
  const [r3Landed, setR3Landed] = useStateG(null);
  const [r3Choice, setR3Choice] = useStateG(null);
  const [r3Locked, setR3Locked] = useStateG(false);

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

  // ── Completitud por ronda. R1 (shooter) se auto-resuelve al cazar la meta,
  // por eso NO tiene VERIFICAR manual (estándar de mecánicas tipo shooter).
  const r2AllChosen = r2Choices.length > 0 && r2Choices.every((c) => c !== null);
  const canVerify =
    ronda === 1 ? (r2AllChosen && !r2Locked) :
    ronda === 2 ? (r3Choice !== null && !r3Locked) :
    false;

  // R1 — el shooter avisa cuando el niño cazó las palabras correctas.
  function handleShooterDone(caught, misses) {
    if (r1Locked) return;
    setR1Locked(true);
    // Puntaje = palabras correctas atrapadas (menos medio punto por cada error).
    const earned = Math.max(0, Math.min(10, caught - Math.floor(misses / 2)));
    const correct = caught > 0 && caught >= misses;
    const userText = `${caught} cazadas · ${misses} ${misses === 1 ? "fallo" : "fallos"}`;
    setTimeout(() => answer(correct, userText, "atrapar las mp/mb en 20 s", "🎯", earned), 380);
  }

  function handleVerify() {
    if (!canVerify) return;
    if (ronda === 1) {
      setR2Locked(true);
      const gaps = r2Pick.parts.filter((p) => typeof p === "object");
      const correct = gaps.every((g, i) => r2Choices[i] === g.answer);
      const userText = r2Choices.join(", ");
      const correctText = gaps.map((g) => g.answer).join(", ");
      setTimeout(() => answer(correct, userText, correctText, "📖"), 380);
    } else if (ronda === 2) {
      setR3Locked(true);
      const correct = r3Choice === r3Landed.type;
      const userText = TYPE_LABEL[r3Choice];
      const correctText = `${TYPE_LABEL[r3Landed.type]} — "${r3Landed.text.slice(0, 26)}"`;
      setTimeout(() => answer(correct, userText, correctText, "🎡"), 380);
    }
  }

  function handleErase() {
    // Ninguna ronda de este juego usa BORRAR (shooter / acertijo / ruleta).
  }

  function answer(isCorrect, userText, correctText, opIcon, earnedOverride) {
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

    const wait = isCorrect ? 1000 : 1450;
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
    ronda === 0 ? "Atrapa solo las palabras escritas correctamente." :
    ronda === 1 ? "Lee el texto y elige la palabra correcta en cada hueco." :
    "Descubre si la frase es formal o coloquial.";
  const bocadillo =
    ronda === 0 ? "Toca las palabras\ncon mp o mb." :
    ronda === 1 ? "Completa la lectura\ntocando la palabra\ncorrecta." :
    "Gira la ruleta y\nclasifica la frase.";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <GameHUD elapsed={elapsed} stars={stars} attempted={attempted} solved={solved} total={3} />
      <CharacterCorner char={char} message={bocadillo} />
      {/* En R2 (lectura) el enunciado baja para acercarse a la hojita y
          equilibrar el espacio (el hueco de ~84px arriba quedaba enorme).
          120 deja libre la lectura más alta (top ~160) con margen. */}
      <GameEnunciado text={enunciado} top={ronda === 1 ? 120 : 86} />

      {ronda === 0 && (
        <ShooterCard
          pick={r1Pick}
          locked={r1Locked}
          onComplete={handleShooterDone}
        />
      )}

      {ronda === 1 && (
        <LecturaCard
          pick={r2Pick}
          choices={r2Choices}
          locked={r2Locked}
          onChoose={(gi, opt) => {
            if (r2Locked) return;
            setR2Choices((cs) => { const n = [...cs]; n[gi] = n[gi] === opt ? null : opt; return n; });
          }}
        />
      )}

      {ronda === 2 && (
        <RuletaCard
          pick={r3Pick}
          landed={r3Landed}
          choice={r3Choice}
          locked={r3Locked}
          onLanded={(p) => setR3Landed(p)}
          onChoose={(t) => { if (!r3Locked && r3Landed) setR3Choice((c) => (c === t ? null : t)); }}
        />
      )}

      <ActionRail
        canVerify={canVerify}
        onVerify={handleVerify}
        showVerify={ronda !== 0}
        showErase={false}
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
// R1 · Shooter "cazapalabras" — caen palabras desde arriba. El niño toca
// las BIEN escritas (m antes de p/b) y deja caer las trampas con n. Al
// cazar la meta (R1_GOAL) la ronda se auto-resuelve (sin VERIFICAR, según
// el estándar de mecánicas tipo shooter).
// ─────────────────────────────────────────────────────────────
const R1_COLS = [18, 50, 82];   // centros de columna (% del carril) → sin overlap
const R1_TIME = 20;             // segundos: atrapas cuantas puedas en este tiempo

function ShooterCard({ pick, locked, onComplete }) {
  const [words, setWords] = useStateG([]);
  const [caught, setCaught] = useStateG(0);
  const [timeLeft, setTimeLeft] = useStateG(R1_TIME);
  const caughtRef = useRefG(0);
  const missRef = useRefG(0);
  const idRef = useRefG(0);
  const cursorRef = useRefG(0);   // recorre el pool barajado SIN repetir
  const doneRef = useRefG(false);

  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete && onComplete(caughtRef.current, missRef.current);
  }

  // Spawner: mantiene cada columna POBLADA de forma pareja (varias palabras
  // escalonadas por columna, nunca encimadas). Solo deja entrar una palabra
  // nueva a una columna cuando la palabra de más arriba de esa columna ya
  // descendió > 38% del carril → el carril queda lleno y bien distribuido de
  // arriba a abajo, sin huecos ni amontonamientos. Toma la siguiente del pool
  // barajado (sin repetir hasta agotarlo).
  useEffectG(() => {
    if (locked) return;
    function spawn() {
      if (doneRef.current) return;
      const now = Date.now();
      setWords((ws) => {
        // Fracción recorrida por la palabra MÁS NUEVA (la de más arriba) de
        // cada columna = la de menor fracción.
        const topFrac = {};
        for (const w of ws) {
          const frac = (now - w.born) / (w.dur * 1000);
          if (topFrac[w.col] === undefined || frac < topFrac[w.col]) topFrac[w.col] = frac;
        }
        const free = R1_COLS.map((_, i) => i).filter(
          (i) => topFrac[i] === undefined || topFrac[i] > 0.38
        );
        if (free.length === 0) return ws;
        const col = free[Math.floor(Math.random() * free.length)];
        const item = pick.pool[cursorRef.current % pick.pool.length];
        cursorRef.current += 1;
        const ok = Math.random() < 0.55;
        const id = ++idRef.current;
        return [...ws, {
          id, text: ok ? item.ok : item.bad, ok, col,
          dur: 5.6 + Math.random() * 0.8, born: now, flash: null,
        }];
      });
    }
    spawn();
    const iv = setInterval(spawn, 560);
    return () => clearInterval(iv);
  }, [locked]);

  // Temporizador de la ronda: al llegar a 0 se cierra con lo cazado.
  useEffectG(() => {
    if (locked) return;
    const iv = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(iv); finish(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [locked]);

  function remove(id) { setWords((ws) => ws.filter((w) => w.id !== id)); }

  function tap(w) {
    if (locked || doneRef.current || w.flash) return;
    if (w.ok) {
      caughtRef.current += 1;
      setCaught(caughtRef.current);
      setWords((ws) => ws.map((x) => (x.id === w.id ? { ...x, flash: "ok" } : x)));
      setTimeout(() => remove(w.id), 200);
    } else {
      missRef.current += 1;
      setWords((ws) => ws.map((x) => (x.id === w.id ? { ...x, flash: "bad" } : x)));
      setTimeout(() => remove(w.id), 300);
    }
  }

  const lowTime = timeLeft <= 8;

  return (
    <div data-qa="zona-central" style={{
      position: "absolute", top: 110, left: "50%", transform: "translateX(-50%)",
      width: 436, display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
    }}>
      {/* Contador de cazadas + temporizador */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "rgba(0,0,0,0.3)", border: "1px solid rgba(242,194,96,0.45)",
          borderRadius: 999, padding: "4px 14px",
          fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 14, color: "#fce9a8",
        }}>
          🎯 Cazadas: {caught}
        </div>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: lowTime ? "rgba(220,80,80,0.35)" : "rgba(0,0,0,0.3)",
          border: `1px solid ${lowTime ? "#ff6b6b" : "rgba(242,194,96,0.45)"}`,
          borderRadius: 999, padding: "4px 14px",
          fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 14,
          color: lowTime ? "#ffd2d2" : "#fce9a8",
        }}>
          ⏱ {timeLeft}s
        </div>
      </div>

      {/* Carril de caída (3 columnas pobladas de forma pareja) */}
      <div data-qa="bandeja" style={{
        position: "relative", width: 436, height: 348, overflow: "hidden",
        borderRadius: 16,
        background: "rgba(8,40,30,0.35)",
        border: "1.5px dashed rgba(242,194,96,0.25)",
      }}>
        {words.map((w) => {
          const flashOk = w.flash === "ok";
          const flashBad = w.flash === "bad";
          return (
            <button key={w.id}
              data-ok={w.ok ? "1" : "0"}
              onClick={() => tap(w)}
              onAnimationEnd={() => { if (!w.flash) remove(w.id); }}
              style={{
                position: "absolute", left: R1_COLS[w.col] + "%", top: "-14%",
                transform: "translateX(-50%)",
                animation: `ed-fall ${w.dur}s linear forwards`,
                padding: "7px 13px", borderRadius: 12,
                border: `2px solid ${flashBad ? "#ff6b6b" : flashOk ? "#2ecc8f" : "rgba(116,72,32,0.3)"}`,
                background: flashBad
                  ? "linear-gradient(180deg,#ff6b6b,#dc5050)"
                  : flashOk
                  ? "linear-gradient(180deg,#2ecc8f,#22a06c)"
                  : "linear-gradient(180deg, rgba(255,250,235,0.97), rgba(244,232,205,0.95))",
                color: (flashOk || flashBad) ? "#fff" : "#3a2608",
                fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 18,
                cursor: "pointer", whiteSpace: "nowrap",
                boxShadow: (flashOk || flashBad)
                  ? "0 0 16px currentColor"
                  : "0 4px 10px rgba(0,0,0,0.35)",
              }}>
              {w.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// R2 · Lectura con homófona — una oración (lectura) donde, según el
// contexto, el niño elige la palabra correcta de un par de homófonas
// que aparece INLINE como selector segmentado (estándar 6). Al fallar,
// la correcta queda en verde con ✓.
// ─────────────────────────────────────────────────────────────
function InlineHomofona({ options, choice, answer, locked, onChoose }) {
  const half = (opt) => {
    const isChoice = choice === opt;
    const isAnswer = opt === answer;
    let bg = "transparent", color = "rgba(116,72,32,0.6)";
    if (locked) {
      if (isAnswer) { bg = "#2ecc8f"; color = "#fff"; }
      else if (isChoice) { bg = "#ff6b6b"; color = "#fff"; }
    } else if (isChoice) { bg = "#4fa0ff"; color = "#fff"; }
    return (
      <span data-opt={opt}
        onClick={() => { if (!locked) onChoose(opt); }}
        style={{
          padding: "3px 13px", cursor: locked ? "default" : "pointer",
          background: bg, color, fontWeight: 800,
          display: "inline-flex", alignItems: "center", gap: 4,
          transition: "all 0.12s ease",
        }}>
        {opt}{locked && isAnswer ? " ✓" : ""}
      </span>
    );
  };
  return (
    <span style={{
      display: "inline-flex", alignItems: "stretch", margin: "0 5px",
      background: "rgba(255,255,255,0.95)",
      border: "2px solid #f2c260", borderRadius: 10, overflow: "hidden",
      verticalAlign: "middle", lineHeight: 1.1,
      boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
    }}>
      {half(options[0])}
      <span style={{ width: 2, background: "rgba(116,72,32,0.22)" }} />
      {half(options[1])}
    </span>
  );
}

function LecturaCard({ pick, choices, locked, onChoose }) {
  // La lectura se ve como una HOJITA de papel rayado (renglones azules + margen
  // rojo + pin), texto SIN negrita. Angosta y centrada en la zona segura para
  // no chocar con el personaje de la izquierda ni el rail de la derecha.
  let g = -1;
  const LINE = 34; // alto de renglón (px) = lineHeight, alineado con las rayas
  return (
    <div data-qa="zona-central" style={{
      position: "absolute", top: 322, left: "50%", transform: "translate(-50%, -50%)",
      width: 392, display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <div data-qa="bandeja" style={{
        position: "relative",
        width: 392, boxSizing: "border-box",
        padding: `26px 24px 24px 42px`,
        borderRadius: 6,
        background: "#fbf7ec",
        backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${LINE - 1}px, rgba(86,120,194,0.28) ${LINE - 1}px, rgba(86,120,194,0.28) ${LINE}px)`,
        backgroundPosition: "0 30px",
        border: "1px solid rgba(0,0,0,0.12)",
        boxShadow: "0 16px 32px rgba(0,0,0,0.45)",
        transform: "rotate(-1.2deg)",
        fontFamily: "var(--ed-font-display)", fontWeight: 400, fontSize: 18,
        color: "#3a3a4a", lineHeight: `${LINE}px`, textAlign: "left",
      }}>
        {/* Pin de la hojita */}
        <div style={{
          position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)",
          width: 16, height: 16, borderRadius: "50%",
          background: "radial-gradient(circle at 35% 30%, #ff8f8f, #d6463f)",
          boxShadow: "0 3px 6px rgba(0,0,0,0.4)", border: "1px solid rgba(0,0,0,0.15)",
        }} />
        {/* Margen rojo */}
        <div style={{
          position: "absolute", top: 0, bottom: 0, left: 30,
          width: 2, background: "rgba(214,93,77,0.45)",
        }} />
        {pick.parts.map((part, i) => {
          if (typeof part === "string") return <span key={i}>{part}</span>;
          g += 1;
          const gi = g;
          return (
            <InlineHomofona key={i}
              options={part.options}
              choice={choices[gi]}
              answer={part.answer}
              locked={locked}
              onChoose={(opt) => onChoose(gi, opt)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// R3 · Ruleta de la fiesta — la rueda gira y sortea una frase. El niño
// dice si la frase es de lenguaje FORMAL o COLOQUIAL. Al fallar, la
// opción correcta queda en verde con ✓.
// ─────────────────────────────────────────────────────────────
const SECTOR_COLORS = ["#ef5a5a", "#4fa0ff", "#2ecc8f", "#f2a73b", "#a78bfa", "#ff8a3a"];
const SECTOR_EMOJIS = ["🎈", "🎂", "🎉", "🎁", "📨", "🎺"];

function polarTop(cx, cy, r, deg) {
  const rad = (deg * Math.PI) / 180; // 0 = arriba, sentido horario
  return [cx + r * Math.sin(rad), cy - r * Math.cos(rad)];
}
function sectorPath(cx, cy, r, a0, a1) {
  const [x0, y0] = polarTop(cx, cy, r, a0);
  const [x1, y1] = polarTop(cx, cy, r, a1);
  return `M${cx},${cy} L${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 0 1 ${x1.toFixed(2)},${y1.toFixed(2)} Z`;
}

function RuletaCard({ pick, landed, choice, locked, onLanded, onChoose }) {
  const [rotation, setRotation] = useStateG(0);
  const [spinning, setSpinning] = useStateG(false);
  const spunRef = useRefG(false);
  const N = pick.phrases.length; // 6
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
      onLanded(pick.phrases[targetIdx]);
    }, 2350);
  }

  const classifyBtn = (type) => {
    const isChoice = choice === type;
    const isAnswer = landed && landed.type === type;
    let bg = "rgba(255,255,255,0.92)", border = "rgba(116,72,32,0.3)", color = "#3a2608", badge = null;
    if (locked) {
      if (isAnswer) {
        bg = "linear-gradient(180deg, rgba(46,204,143,0.95), rgba(34,160,108,0.95))";
        border = "#2ecc8f"; color = "#fff";
        badge = (
          <div style={{
            position: "absolute", top: -10, right: -10, width: 26, height: 26, borderRadius: "50%",
            background: "#2ecc8f", border: "2px solid #fff", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, fontWeight: 900, boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
          }}>✓</div>
        );
      } else if (isChoice) {
        bg = "linear-gradient(180deg, rgba(255,107,107,0.95), rgba(220,80,80,0.95))";
        border = "#ff6b6b"; color = "#fff";
      } else {
        bg = "rgba(255,255,255,0.5)"; color = "rgba(58,38,8,0.6)";
      }
    } else if (isChoice) {
      bg = "linear-gradient(180deg,#fce9a8,#e9c45a)"; border = "#4fd8ff";
    }
    return (
      <button key={type}
        onClick={() => onChoose(type)}
        disabled={locked}
        style={{
          position: "relative",
          minWidth: 150, padding: "13px 20px", borderRadius: 14,
          border: `2.5px solid ${border}`, background: bg, color,
          fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 20,
          letterSpacing: "0.03em",
          cursor: locked ? "default" : "pointer",
          boxShadow: isChoice && !locked ? "0 0 18px rgba(79,216,255,0.6)" : "0 4px 12px rgba(0,0,0,0.3)",
          transform: isChoice && !locked ? "translateY(-2px)" : "none",
          transition: "all 0.15s ease",
        }}>
        {TYPE_LABEL[type]}
        {badge}
      </button>
    );
  };

  return (
    <div data-qa="zona-central" style={{
      position: "absolute", top: 118, left: "50%", transform: "translateX(-50%)",
      width: 436, display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
    }}>
      {/* Ruleta + puntero */}
      <div data-qa="bandeja" style={{ position: "relative", width: 192, height: 200 }}>
        {/* Puntero */}
        <div style={{
          position: "absolute", top: -2, left: "50%", transform: "translateX(-50%)",
          width: 0, height: 0,
          borderLeft: "12px solid transparent", borderRight: "12px solid transparent",
          borderTop: "20px solid #fce9a8",
          filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.5))", zIndex: 3,
        }} />
        {/* Rueda */}
        <div style={{
          position: "absolute", top: 12, left: 0, width: 192, height: 192,
          transition: spinning ? "transform 2.3s cubic-bezier(0.17,0.67,0.21,1)" : "none",
          transform: `rotate(${rotation}deg)`,
        }}>
          <svg viewBox="0 0 192 192" width="192" height="192" style={{ display: "block" }}>
            <circle cx={C} cy={C} r={R + 4} fill="#0b3a2d" stroke="#fce9a8" strokeWidth="3" />
            {pick.phrases.map((_, i) => (
              <path key={i}
                d={sectorPath(C, C, R, i * seg - seg / 2, i * seg + seg / 2)}
                fill={SECTOR_COLORS[i % SECTOR_COLORS.length]}
                stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
            ))}
            {pick.phrases.map((_, i) => {
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

      {/* Antes de girar: botón GIRAR. Después: frase + clasificación. */}
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
          {/* Frase sorteada */}
          <div style={{
            width: "fit-content", maxWidth: 430,
            padding: "10px 18px", borderRadius: 14,
            background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(240,235,225,0.92))",
            border: "3px solid #f2c260",
            fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 17,
            color: "#3a2608", textAlign: "center", lineHeight: 1.25,
            boxShadow: "0 10px 24px rgba(0,0,0,0.4)",
          }}>
            {landed.text}
          </div>
          {/* Clasificación */}
          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            {classifyBtn("formal")}
            {classifyBtn("coloquial")}
          </div>
        </>
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
  const res = app.lastResult || { category: "Te invito a mi fiesta", solved: 0, total: 3, time: 0, starsEarned: 0, log: [] };
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
