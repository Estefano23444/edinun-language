// game-screens.jsx — Juego 3. Dos niveles con mecánicas diferentes:
//   1. La letra C y Q — completa la palabra con sílabas C+vocal o QU+vocal.
//      3 rondas con progresión: CA/CO/CU → CE/CI → QUE/QUI.
//   2. Elementos del texto — 3 mecánicas distintas (12 años):
//      R0 SpeedQuiz "¿Para qué?" (intencionalidad)
//      R1 DragMatch "El tono escondido" (tono del autor)
//      R2 ElijeElFinal "Detective de textos" (argumento implícito)
//
// GameScreen delega al sub-componente según app.currentCategory.
// ResultsScreen es compartido y se monta automáticamente al terminar.

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

// Anti-repetición persistente por nivel
const RECENT_KEYS = {
  letraCQ_r0:        "edinun_juego3_letraCQ_r0_recientes_v1",
  letraCQ_r1:        "edinun_juego3_letraCQ_r1_recientes_v1",
  letraCQ_r2:        "edinun_juego3_letraCQ_r2_recientes_v1",
  elementos_r1:      "edinun_juego3_elementos_r1_recientes_v1",
  elementos_r2:      "edinun_juego3_elementos_r2_recientes_v1",
  elementos_r3:      "edinun_juego3_elementos_r3_recientes_v1",
};
const RECENT_LIMIT = 6;

function getRecent(key) {
  try {
    const raw = localStorage.getItem(RECENT_KEYS[key] || key);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function pushRecent(key, item) {
  const arr = getRecent(key).filter((k) => k !== item);
  arr.unshift(item);
  const trimmed = arr.slice(0, RECENT_LIMIT);
  try { localStorage.setItem(RECENT_KEYS[key] || key, JSON.stringify(trimmed)); } catch {}
}

// Estrellas por tiempo (igual al shell): 0-2s → 10⭐, 27+s → 1⭐, fallo → 0.
function calcStars(isCorrect, exerciseSec) {
  return isCorrect ? Math.max(1, 10 - Math.floor(exerciseSec / 3)) : 0;
}

const ENCOURAGEMENTS = [
  "¡Casi! Sigue intentándolo.",
  "¡La próxima es tuya!",
  "Equivocarse también es aprender.",
  "¡Vamos a la siguiente!",
  "Cada error te acerca al acierto.",
];

// ─────────────────────────────────────────────────────────────
// DATA — NIVEL 1: La letra C y Q
// Cada palabra define sus segmentos: { h: "..." } oculto, { v: "..." } visible.
// Al renderizar, los huecos h se llenan con fichas de la bandeja.
// ─────────────────────────────────────────────────────────────
const LETRA_CQ_R0 = [
  { word: "CASA",    emoji: "🏠", segments: [{ h: "CA" }, { v: "SA" }] },
  { word: "COCO",    emoji: "🥥", segments: [{ h: "CO" }, { h: "CO" }] },
  { word: "CUCHARA", emoji: "🥄", segments: [{ h: "CU" }, { v: "CHARA" }] },
  { word: "CAMA",    emoji: "🛌", segments: [{ h: "CA" }, { v: "MA" }] },
  { word: "COCHE",   emoji: "🚗", segments: [{ h: "CO" }, { v: "CHE" }] },
  { word: "CABRA",   emoji: "🐐", segments: [{ h: "CA" }, { v: "BRA" }] },
  { word: "CASCO",   emoji: "🪖", segments: [{ h: "CA" }, { v: "S" }, { h: "CO" }] },
  { word: "CARACOL", emoji: "🐌", segments: [{ h: "CA" }, { v: "RA" }, { h: "CO" }, { v: "L" }] },
  { word: "CACAO",   emoji: "🍫", segments: [{ h: "CA" }, { h: "CA" }, { v: "O" }] },
];
const LETRA_CQ_R1 = [
  { word: "CEBRA",  emoji: "🦓", segments: [{ h: "CE" }, { v: "BRA" }] },
  { word: "CISNE",  emoji: "🦢", segments: [{ h: "CI" }, { v: "SNE" }] },
  { word: "CEREZA", emoji: "🍒", segments: [{ h: "CE" }, { v: "REZA" }] },
  { word: "CENA",   emoji: "🍽️", segments: [{ h: "CE" }, { v: "NA" }] },
  { word: "CINE",   emoji: "🎬", segments: [{ h: "CI" }, { v: "NE" }] },
  { word: "CINTA",  emoji: "🎀", segments: [{ h: "CI" }, { v: "NTA" }] },
  { word: "CIPRÉS", emoji: "🌲", segments: [{ h: "CI" }, { v: "PRÉS" }] },
];
const LETRA_CQ_R2 = [
  { word: "QUESO",     emoji: "🧀", segments: [{ h: "QUE" }, { v: "SO" }] },
  { word: "QUINCE",    emoji: "🎂", segments: [{ h: "QUI" }, { v: "NCE" }] },
  { word: "RAQUETA",   emoji: "🎾", segments: [{ v: "RA" }, { h: "QUE" }, { v: "TA" }] },
  { word: "MOSQUITO",  emoji: "🦟", segments: [{ v: "MOS" }, { h: "QUI" }, { v: "TO" }] },
  { word: "MÁQUINA",   emoji: "🚂", segments: [{ v: "MÁ" }, { h: "QUI" }, { v: "NA" }] },
  { word: "PARQUE",    emoji: "🌳", segments: [{ v: "PAR" }, { h: "QUE" }] },
  { word: "BUQUE",     emoji: "🚢", segments: [{ v: "BU" }, { h: "QUE" }] },
  { word: "PAQUETE",   emoji: "📦", segments: [{ v: "PA" }, { h: "QUE" }, { v: "TE" }] },
  { word: "BOSQUE",    emoji: "🌲", segments: [{ v: "BOS" }, { h: "QUE" }] },
  { word: "ESQUELETO", emoji: "💀", segments: [{ v: "ES" }, { h: "QUE" }, { v: "LETO" }] },
];
const TRAY_C = ["CA", "CE", "CI", "CO", "CU"];
const TRAY_Q = ["QUE", "QUI"];

// ─────────────────────────────────────────────────────────────
// DATA — NIVEL 2: Elementos del texto
// ─────────────────────────────────────────────────────────────
const INTENCIONALIDAD_POOL = [
  { id: "p1",  text: "¡COMPRA YA! Solo por hoy: 50% en golosinas. ¡No te lo pierdas!",                       correct: "PERSUADIR" },
  { id: "p2",  text: "La biblioteca abre lunes a viernes de 9:00 a 18:00.",                                  correct: "INFORMAR" },
  { id: "p3",  text: "Era una vez un dragón rosado que solo quería tomar té con galletas...",                correct: "ENTRETENER" },
  { id: "p4",  text: "Creo que las películas de hoy ya no tienen la magia de antes.",                        correct: "OPINAR" },
  { id: "p5",  text: "En 1822, Ecuador logró la independencia tras la Batalla de Pichincha.",                correct: "INFORMAR" },
  { id: "p6",  text: "Mi gato cree que es un emperador. Anda por la casa como si todo le perteneciera.",     correct: "ENTRETENER" },
  { id: "p7",  text: "Vota por mí: soy el candidato que sí va a cambiar la escuela.",                        correct: "PERSUADIR" },
  { id: "p8",  text: "Para mí, el verano es la mejor estación del año.",                                     correct: "OPINAR" },
  { id: "p9",  text: "El Ecuador tiene cuatro regiones naturales: Costa, Sierra, Oriente y Galápagos.",      correct: "INFORMAR" },
  { id: "p10", text: "El elefante miró su reloj y se quejó: '¡Otra vez tarde a la fiesta del té!'",          correct: "ENTRETENER" },
  { id: "p11", text: "Suscríbete YA al canal y gana premios increíbles cada semana.",                        correct: "PERSUADIR" },
  { id: "p12", text: "A mi parecer, la mejor música es la que te hace bailar sin pensar.",                   correct: "OPINAR" },
];
const INTENCIONALIDAD_CHIPS = ["INFORMAR", "PERSUADIR", "ENTRETENER", "OPINAR"];

const TONO_POOL = [
  { id: "t1",  text: "El atardecer pintó el cielo de naranja y violeta. Era imposible no contemplarlo.",       correct: "ADMIRA" },
  { id: "t2",  text: "Otra vez no funciona el internet. ¡Es la tercera semana seguida! Inaceptable.",          correct: "CRITICA" },
  { id: "t3",  text: "Mi perro Bobby cree que es el rey del barrio. Ladra a las palomas creyéndose gigante.",  correct: "SE BURLA" },
  { id: "t4",  text: "La temperatura en Cuenca es 14°C. Su altura es 2.560 m. Tiene 580.000 habitantes.",      correct: "INFORMA" },
  { id: "t5",  text: "Las pirámides de Egipto asombran: piedras de 2 toneladas movidas hace 4500 años.",       correct: "ADMIRA" },
  { id: "t6",  text: "El nuevo restaurante es un desastre: comida fría, mesero grosero y precios escandalosos.", correct: "CRITICA" },
  { id: "t7",  text: "Mi hermano se cree Messi porque metió un gol de chiripa. Insoportable hace tres días.",  correct: "SE BURLA" },
  { id: "t8",  text: "El concierto duró 3 horas. Tocaron 22 canciones. Asistieron 5000 personas.",             correct: "INFORMA" },
  { id: "t9",  text: "Su voz al cantar parecía un río de oro. Nunca había oído algo tan hermoso.",             correct: "ADMIRA" },
  { id: "t10", text: "El servicio fue lentísimo, la limpieza dejaba que desear y el precio era un robo.",      correct: "CRITICA" },
  { id: "t11", text: "Mi gato camina por la casa como si fuera el dueño y nosotros sus sirvientes.",           correct: "SE BURLA" },
  { id: "t12", text: "Las clases comienzan el 4 de septiembre. El uniforme es obligatorio.",                   correct: "INFORMA" },
];
const TONO_CHIPS = ["ADMIRA", "CRITICA", "SE BURLA", "INFORMA"];

const ARGUMENTO_POOL = [
  {
    id: "a1",
    story: "María miró el reloj y frunció el ceño. Suspiró y se levantó rápido. Corrió hasta la parada, vio que el bus partía. Se detuvo, desanimada.",
    question: "¿Qué le pasó a María?",
    options: [
      { text: "Tuvo un día agotador y estresante.", isCorrect: true },
      { text: "Quería visitar a un amigo.",         isCorrect: false },
      { text: "Odia su trabajo.",                   isCorrect: false },
      { text: "Era domingo en la mañana.",          isCorrect: false },
    ],
  },
  {
    id: "a2",
    story: "Carlos llegó a casa, prendió el horno y sacó la harina. Buscó velas, infló globos. Su perro Toby le movía la cola como si supiera algo...",
    question: "¿Qué pasaba?",
    options: [
      { text: "Era el cumpleaños de alguien especial.", isCorrect: true },
      { text: "Toby tenía hambre.",                     isCorrect: false },
      { text: "Carlos quería ordenar la casa.",         isCorrect: false },
      { text: "Era de noche.",                          isCorrect: false },
    ],
  },
  {
    id: "a3",
    story: "Andrea miró por la ventana y vio nubes oscuras. Cerró todas las ventanas, recogió la ropa tendida y prendió la luz del pasillo. Buscó velas en el cajón.",
    question: "¿Qué se acerca?",
    options: [
      { text: "Una tormenta fuerte con posible apagón.", isCorrect: true },
      { text: "El cumpleaños de un familiar.",            isCorrect: false },
      { text: "Una visita inesperada.",                   isCorrect: false },
      { text: "Quiere dormir temprano.",                  isCorrect: false },
    ],
  },
  {
    id: "a4",
    story: "Tomás guardó los libros en la mochila, revisó la lista tres veces, suspiró y se fue a dormir muy temprano. No tocó su consola.",
    question: "¿Qué le pasa a Tomás?",
    options: [
      { text: "Tiene un examen importante mañana.", isCorrect: true },
      { text: "Está enfermo.",                       isCorrect: false },
      { text: "No le gusta su consola.",             isCorrect: false },
      { text: "Se mudó de casa.",                    isCorrect: false },
    ],
  },
  {
    id: "a5",
    story: "Lola se peinó frente al espejo cinco veces, eligió tres camisas distintas, se puso perfume y miró el reloj cada dos minutos.",
    question: "¿Qué le pasa a Lola?",
    options: [
      { text: "Está nerviosa por una cita o evento especial.", isCorrect: true },
      { text: "Va a hacer ejercicio.",                          isCorrect: false },
      { text: "Le gustan los espejos.",                         isCorrect: false },
      { text: "Es su cumpleaños.",                              isCorrect: false },
    ],
  },
  {
    id: "a6",
    story: "Don Roberto cargó dos maletas grandes al taxi, abrazó a su esposa, le susurró algo al oído y le entregó un sobre. Subió al auto sin mirar atrás.",
    question: "¿Qué hace Don Roberto?",
    options: [
      { text: "Se va de viaje largo, probablemente solo.", isCorrect: true },
      { text: "Sale a comprar pan.",                        isCorrect: false },
      { text: "Lleva a su esposa al doctor.",               isCorrect: false },
      { text: "Se va al trabajo en la mañana.",             isCorrect: false },
    ],
  },
  {
    id: "a7",
    story: "Sofía abrazó al perro, le dio una golosina, le rascó la barriga y le dijo: 'pórtate bien, vuelvo pronto'. Cerró la puerta con llave.",
    question: "¿Qué hace Sofía?",
    options: [
      { text: "Sale dejando al perro solo en casa.", isCorrect: true },
      { text: "El perro está enfermo.",               isCorrect: false },
      { text: "Va a cocinar.",                        isCorrect: false },
      { text: "Acaba de adoptar al perro.",           isCorrect: false },
    ],
  },
  {
    id: "a8",
    story: "Pedro entró corriendo a casa, abrazó a todos, no podía dejar de sonreír y mostraba un papel con un sello dorado. Sus padres lloraban de alegría.",
    question: "¿Qué pasó?",
    options: [
      { text: "Pedro recibió una noticia muy buena (premio, beca, aceptación).", isCorrect: true },
      { text: "Pedro acaba de llegar de un viaje.",                              isCorrect: false },
      { text: "Pedro perdió algo importante.",                                   isCorrect: false },
      { text: "Pedro acaba de ver una película.",                                isCorrect: false },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// GameScreen — delega al sub-componente según el nivel elegido
// ─────────────────────────────────────────────────────────────
function GameScreen({ app, setApp, go }) {
  const cat = app.currentCategory || "letraCQ";
  const [restartTick, setRestartTick] = useStateG(0);
  const restart = () => setRestartTick((t) => t + 1);
  if (cat === "elementosTexto") return <ElementosTextoGame key={`elem-${restartTick}`} app={app} setApp={setApp} go={go} onRestart={restart} />;
  return <LetraCQGame key={`letraCQ-${restartTick}`} app={app} setApp={setApp} go={go} onRestart={restart} />;
}

// ─────────────────────────────────────────────────────────────
// HUD común (logo + chips de tema + ronda dots + timer + estrellas)
// ─────────────────────────────────────────────────────────────
function GameHUD({ elapsed, stars, attempted, solved, total = 3, app, setApp }) {
  const levels = (typeof LEVELS_CFG !== "undefined" && LEVELS_CFG) || (window.LEVELS_CFG || []);
  const currentId = app && app.currentCategory ? app.currentCategory : "letraCQ";
  const [pendingLevel, setPendingLevel] = useStateG(null);

  function requestSwitch(lvId) {
    if (lvId === currentId) return;
    setPendingLevel(lvId);
  }

  function confirmSwitch() {
    if (!pendingLevel) return;
    const cfg = levels.find((l) => l.id === pendingLevel);
    if (!cfg) { setPendingLevel(null); return; }
    setApp((s) => ({
      ...s,
      level: cfg.id,
      currentCategory: cfg.id,
      currentCatLabel: cfg.catLabel,
    }));
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

      {/* Chips de tema centrados (2 niveles) */}
      <div data-qa="hud-temas" style={{
        position: "absolute", top: 24, left: "50%", transform: "translateX(-50%)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        {levels.map((lv) => {
          const active = lv.id === currentId;
          return (
            <button
              key={lv.id}
              onClick={() => requestSwitch(lv.id)}
              title={active ? "Tema actual" : `Cambiar a "${lv.label}"`}
              style={{
                padding: "5px 14px",
                borderRadius: 999,
                background: active ? lv.grad : "rgba(0,0,0,0.35)",
                color: active ? lv.ink : "rgba(252,233,168,0.85)",
                fontFamily: "var(--ed-font-display)",
                fontWeight: 700, fontSize: 12, letterSpacing: "0.02em",
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

      {/* Indicador de ronda (n puntos) */}
      <div style={{
        position: "absolute", top: 64, left: "50%", transform: "translateX(-50%)",
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

      <SwitchLevelModal
        pendingLevel={pendingLevel}
        levels={levels}
        attempted={attempted}
        total={total}
        onCancel={() => setPendingLevel(null)}
        onConfirm={confirmSwitch}
      />
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
          style={{ padding: 24, maxWidth: 460, textAlign: "center", boxShadow: "var(--ed-shadow-card), 0 0 40px rgba(148,120,255,0.3)" }}
        >
          <div className="ed-label" style={{ color: "#a78bfa", marginBottom: 6 }}>Cambiar de tema</div>
          <h2 className="ed-h1" style={{ fontSize: 22, lineHeight: 1.15, marginBottom: 8 }}>
            ¿Ir a “{cfg.label}”?
          </h2>
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

function ExitToHomeModal({ open, onCancel, onConfirm, attempted, total }) {
  if (!open) return null;
  return (
    <PortalToBody>
      <div onClick={onCancel} style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.62)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "ed-pop-in 0.18s", padding: 16,
      }}>
        <div onClick={(e) => e.stopPropagation()} className="ed-card"
          style={{ padding: 24, maxWidth: 440, textAlign: "center", boxShadow: "var(--ed-shadow-card), 0 0 40px rgba(79,160,255,0.3)" }}
        >
          <div className="ed-label" style={{ color: "#7ab8ff", marginBottom: 6 }}>Volver al inicio</div>
          <h2 className="ed-h1" style={{ fontSize: 22, lineHeight: 1.15, marginBottom: 8 }}>¿Volver al inicio?</h2>
          <p className="ed-body" style={{ marginBottom: 16, fontSize: 14 }}>
            Vas a perder el progreso de esta ronda ({attempted}/{total}). No habrá reporte de esta sesión.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button className="ed-btn ed-btn-ghost" onClick={onCancel} style={{ height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
              SEGUIR JUGANDO
            </button>
            <button className="ed-btn ed-btn-primary" onClick={onConfirm} style={{ height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
              SÍ, SALIR
            </button>
          </div>
        </div>
      </div>
    </PortalToBody>
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
          style={{ padding: 24, maxWidth: 440, textAlign: "center", boxShadow: "var(--ed-shadow-card), 0 0 40px rgba(255,107,107,0.3)" }}
        >
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

// ─────────────────────────────────────────────────────────────
// NIVEL 1 — La letra C y Q (3 rondas con palabras de R0/R1/R2)
// ─────────────────────────────────────────────────────────────
function pickWord(bank, recentKey, usedKeys) {
  const recent = new Set(getRecent(recentKey));
  const exclude = new Set([...usedKeys, ...recent]);
  let pool = bank.filter((w) => !exclude.has(w.word));
  if (pool.length === 0) pool = bank.filter((w) => !usedKeys.has(w.word));
  if (pool.length === 0) pool = bank;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return pick;
}

function buildProblem(ronda, usedSets) {
  let bank, recentKey, tray;
  if (ronda === 0) { bank = LETRA_CQ_R0; recentKey = "letraCQ_r0"; tray = TRAY_C; }
  else if (ronda === 1) { bank = LETRA_CQ_R1; recentKey = "letraCQ_r1"; tray = TRAY_C; }
  else { bank = LETRA_CQ_R2; recentKey = "letraCQ_r2"; tray = TRAY_Q; }
  const usedKeys = usedSets[ronda];
  const pick = pickWord(bank, recentKey, usedKeys);
  usedKeys.add(pick.word);
  pushRecent(recentKey, pick.word);
  // Lista de huecos en orden de aparición
  const hidden = [];
  pick.segments.forEach((seg, i) => {
    if (seg.h !== undefined) hidden.push({ segIdx: i, correct: seg.h });
  });
  return { ...pick, hidden, tray };
}

function LetraCQGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "La letra C y Q";

  const usedSetsRef = useRefG([new Set(), new Set(), new Set()]);
  const [ronda, setRonda] = useStateG(0);
  const [problem, setProblem] = useStateG(() => buildProblem(0, usedSetsRef.current));
  const [filled, setFilled] = useStateG([]);  // valores por hueco (índice según problem.hidden)
  const [elapsed, setElapsed] = useStateG(0);
  const [stars, setStars] = useStateG(0);
  const [solved, setSolved] = useStateG(0);
  const [attempted, setAttempted] = useStateG(0);
  const [starsSession, setStarsSession] = useStateG(0);
  const [feedback, setFeedback] = useStateG(null);
  const [feedbackMsg, setFeedbackMsg] = useStateG("");
  const [confirmingExit, setConfirmingExit] = useStateG(false);
  const [confirmingHomeExit, setConfirmingHomeExit] = useStateG(false);
  const [log, setLog] = useStateG([]);
  const [wrongSlots, setWrongSlots] = useStateG([]); // huecos con error tras verificar

  const started = useRefG(Date.now());
  const exerciseStart = useRefG(Date.now());
  const lockedRef = useRefG(false); // bloquea interacciones durante el feedback

  useEffectG(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started.current) / 1000)), 500);
    return () => clearInterval(id);
  }, []);

  // Set glifos chalkboard del nivel 1
  useEffectG(() => {
    window.__currentChalkGlyphs = [
      { c: "C",   l: "6%",  t: "12%", r: "-8deg" },
      { c: "Q",   l: "82%", t: "16%", r: "6deg",  s: "0.62em" },
      { c: "ca",  l: "10%", t: "78%", r: "12deg", s: "0.5em" },
      { c: "ce",  l: "88%", t: "72%", r: "-10deg", s: "0.5em" },
      { c: "ci",  l: "45%", t: "8%",  r: "4deg",  s: "0.5em" },
      { c: "co",  l: "3%",  t: "45%", r: "-4deg", s: "0.5em" },
      { c: "cu",  l: "92%", t: "45%", r: "8deg",  s: "0.5em" },
      { c: "que", l: "30%", t: "55%", r: "-6deg", s: "0.45em" },
      { c: "qui", l: "70%", t: "62%", r: "8deg",  s: "0.45em" },
      { c: "✏",   l: "55%", t: "30%", r: "-4deg", s: "0.46em" },
    ];
    window.dispatchEvent(new Event("ed-chalk-glyphs-updated"));
    return () => {
      window.__currentChalkGlyphs = null;
      window.dispatchEvent(new Event("ed-chalk-glyphs-updated"));
    };
  }, []);

  function pressSyllable(syl) {
    if (lockedRef.current) return;
    setFilled((prev) => {
      const len = problem.hidden.length;
      const next = [...prev];
      while (next.length < len) next.push(undefined);
      for (let i = 0; i < len; i++) {
        if (next[i] === undefined) {
          next[i] = syl;
          return next;
        }
      }
      return prev;
    });
  }

  // Habilitado solo cuando todos los huecos están llenos
  const allFilled = problem.hidden.length > 0 && problem.hidden.every((_, i) => filled[i] !== undefined);

  function eraseSlot(slotIdx) {
    if (lockedRef.current) return;
    setFilled((prev) => {
      const next = [...prev];
      while (next.length < problem.hidden.length) next.push(undefined);
      next[slotIdx] = undefined;
      return next;
    });
  }

  function verify(currentFilled) {
    const len = problem.hidden.length;
    if (currentFilled.some((v) => v === undefined)) return;
    lockedRef.current = true;
    if (typeof window.markFirstAttempt === "function") window.markFirstAttempt();

    const isCorrect = problem.hidden.every((h, i) => currentFilled[i] === h.correct);
    const wrongIdx = problem.hidden.map((h, i) => currentFilled[i] !== h.correct ? i : -1).filter((i) => i >= 0);
    setWrongSlots(wrongIdx);

    // Reconstruir palabra del usuario para el log
    let userWord = "";
    let segIdxFilled = 0;
    problem.segments.forEach((seg) => {
      if (seg.h !== undefined) { userWord += currentFilled[segIdxFilled]; segIdxFilled++; }
      else userWord += seg.v;
    });

    const exerciseSec = Math.max(0, Math.floor((Date.now() - exerciseStart.current) / 1000));
    const earned = calcStars(isCorrect, exerciseSec);

    const newAttempted = attempted + 1;
    const newSolved = solved + (isCorrect ? 1 : 0);
    const newStarsTotal = stars + earned;
    const newStarsSession = starsSession + earned;

    const entry = {
      idx: newAttempted,
      a: problem.word,
      b: userWord,
      op: "🔤",
      correctAnswer: problem.word,
      userAnswer: userWord,
      isCorrect, time: exerciseSec, earned,
      emoji: problem.emoji,
    };
    const newLog = [...log, entry];

    setFeedback(isCorrect ? "ok" : "err");
    setFeedbackMsg(isCorrect ? `+${earned} ⭐` : ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]);
    setAttempted(newAttempted);
    setSolved(newSolved);
    setStars(newStarsTotal);
    setStarsSession(newStarsSession);
    setLog(newLog);

    const wait = isCorrect ? 950 : 1500;
    setTimeout(() => {
      setFeedback(null);
      setFeedbackMsg("");
      setFilled([]);
      setWrongSlots([]);
      lockedRef.current = false;
      if (newAttempted >= 3) {
        setApp((s) => ({
          ...s, stars: newStarsTotal,
          lastResult: { category: catLabel, solved: newSolved, total: 3, time: elapsed, starsEarned: newStarsSession, log: newLog },
        }));
        window.incrementGamesCompleted && window.incrementGamesCompleted();
        go("results");
      } else {
        const nextRonda = ronda + 1;
        setRonda(nextRonda);
        setProblem(buildProblem(nextRonda, usedSetsRef.current));
        exerciseStart.current = Date.now();
      }
    }, wait);
  }

  // Cálculo de tamaños de slot — adapta al largo total de la palabra
  const totalLen = problem.segments.reduce((acc, s) => acc + (s.h !== undefined ? s.h.length : s.v.length), 0);
  const SLOT_H = totalLen <= 5 ? 70 : totalLen <= 7 ? 62 : totalLen <= 9 ? 56 : 50;
  const baseW = SLOT_H * 0.62;
  const TRAY_W = 80;
  const TRAY_H = 64;

  const activeIdx = filled.findIndex((v) => v === undefined);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <GameHUD elapsed={elapsed} stars={stars} attempted={attempted} solved={solved} total={3} app={app} setApp={setApp} />

      {/* Enunciado (QUÉ hacer) — centrado absoluto al lienzo, alineado con chips/ronda */}
      <div style={{
        position: "absolute", top: 100, left: "50%", transform: "translateX(-50%)",
        maxWidth: 420, textAlign: "center",
        fontFamily: "var(--ed-font-display)", fontWeight: 700,
        fontSize: 19, lineHeight: 1.15,
        color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,0.55)",
        pointerEvents: "none",
      }}>
        Forma la palabra.
      </div>

      {/* Personaje grande con bocadillo */}
      <div data-qa="personaje" style={{
        position: "absolute", left: 8, bottom: 90, width: 220,
        pointerEvents: "none", textAlign: "center",
      }}>
        <div data-qa="bocadillo" style={{
          position: "absolute", left: 0, right: 0, top: -80,
          pointerEvents: "none",
          display: "flex", justifyContent: "center",
        }}>
          <div style={{
            position: "relative",
            display: "inline-block",
            maxWidth: 208,
            background: "linear-gradient(180deg, rgba(20,12,55,0.95), rgba(10,6,35,0.95))",
            border: "1.5px solid rgba(242,194,96,0.65)",
            borderRadius: 16, padding: "10px 14px",
            fontFamily: "var(--ed-font-display)",
            fontWeight: 700, fontSize: 14, lineHeight: 1.25,
            color: "#fce9a8", textAlign: "center",
            boxShadow: "0 10px 24px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}>
            Toca las sílabas que faltan.
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

      {/* Zona central: emoji + palabra con huecos — centrada al lienzo (x=450) */}
      <div data-qa="zona-central" style={{
        position: "absolute", top: 132, left: 230, right: 230, bottom: 140,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 22,
      }}>
        <div style={{
          width: 150, height: 130,
          borderRadius: 22,
          background: "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(240,235,225,0.9))",
          border: "3px solid #f2c260",
          boxShadow: "0 12px 28px rgba(0,0,0,0.45), 0 0 0 1px rgba(242,194,96,0.35), inset 0 -4px 0 rgba(0,0,0,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 88, lineHeight: 1,
        }}>
          {problem.emoji}
        </div>

        <div style={{
          display: "flex", justifyContent: "center", alignItems: "center",
          gap: 8, padding: "4px 6px", flexWrap: "wrap",
        }}>
          {(() => {
            // Renderizar segmentos en orden
            let hiddenCursor = 0;
            return problem.segments.map((seg, sIdx) => {
              if (seg.v !== undefined) {
                // Letras visibles
                return seg.v.split("").map((ch, k) => (
                  <div key={`v-${sIdx}-${k}`} style={{
                    width: baseW, height: SLOT_H,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--ed-font-display)", fontWeight: 700,
                    fontSize: SLOT_H * 0.55,
                    color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,0.5)",
                    borderBottom: "3px solid rgba(255,255,255,0.35)",
                  }}>{ch}</div>
                ));
              }
              // Hueco oculto
              const hIdx = hiddenCursor++;
              const f = filled[hIdx];
              const isFilled = f !== undefined;
              const isActive = hIdx === activeIdx;
              const isWrong = wrongSlots.includes(hIdx);
              const SLOT_W = (seg.h.length) * (SLOT_H * 0.46) + 12;
              return (
                <button key={`h-${sIdx}`} onClick={() => { if (isFilled && !lockedRef.current) eraseSlot(hIdx); }}
                  style={{
                    width: SLOT_W, height: SLOT_H, borderRadius: 12,
                    border: `2.5px solid ${feedback === "ok" ? "#2ecc8f" : isWrong ? "#ff6b6b" : isActive ? "#fce9a8" : "rgba(242,194,96,0.55)"}`,
                    background: isFilled
                      ? (isWrong ? "linear-gradient(180deg, rgba(255,150,150,0.95), rgba(220,80,80,0.85))" : "linear-gradient(180deg, rgba(252,233,168,0.95), rgba(217,164,65,0.85))")
                      : "rgba(10,6,35,0.55)",
                    color: isFilled ? "#3a2608" : "rgba(252,233,168,0.5)",
                    fontFamily: "var(--ed-font-display)", fontWeight: 800,
                    fontSize: SLOT_H * 0.42,
                    cursor: isFilled && !lockedRef.current ? "pointer" : "default",
                    boxShadow: isWrong
                      ? "0 0 16px rgba(255,107,107,0.6)"
                      : isActive
                        ? "0 0 14px rgba(252,233,168,0.5)"
                        : isFilled ? "0 4px 10px rgba(0,0,0,0.35)" : "inset 0 1px 0 rgba(255,255,255,0.08)",
                    transition: "all 0.15s ease",
                    animation: isWrong ? "ed-shake 0.4s" : "none",
                  }}
                  title={isFilled ? "Toca para borrar" : "Toca una sílaba abajo"}
                >
                  {isFilled ? f : "_"}
                </button>
              );
            });
          })()}
        </div>
      </div>

      {/* Bandeja: sílabas — centrada al lienzo */}
      <div data-qa="bandeja" style={{
        position: "absolute", bottom: 28, left: 230, right: 230,
        display: "flex", gap: 12, justifyContent: "center",
      }}>
        {problem.tray.map((syl, i) => {
          const colors = ["#ef5a5a", "#f5a623", "#f5d84b", "#4fa0ff", "#2ecc8f", "#a78bfa", "#fce9a8"];
          const color = colors[i % colors.length];
          return (
            <button key={i} className="ed-numpad-key" onClick={() => pressSyllable(syl)}
              style={{
                width: TRAY_W, height: TRAY_H, fontSize: 26,
                borderColor: color, borderWidth: 2, borderStyle: "solid",
                cursor: "pointer",
                fontFamily: "var(--ed-font-display)", fontWeight: 800,
                letterSpacing: "0.02em",
              }}
              title="Toca para colocar (reutilizable)"
            >{syl}</button>
          );
        })}
      </div>

      {/* Columna de acciones a la derecha — centrada vertical al lienzo */}
      <div data-qa="acciones" style={{
        position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)",
        display: "flex", flexDirection: "column", gap: 12, width: 150,
      }}>
        <button className="ed-btn ed-btn-verify"
          onClick={() => { if (allFilled && !lockedRef.current) verify(filled); }}
          disabled={!allFilled || lockedRef.current}
          style={{
            fontSize: 15, padding: "0 10px", height: 56, fontWeight: 800, letterSpacing: "0.04em",
            opacity: allFilled && !lockedRef.current ? 1 : 0.45,
            cursor: allFilled && !lockedRef.current ? "pointer" : "not-allowed",
          }}>¡VERIFICAR!</button>
        <button className="ed-btn ed-btn-erase"
          onClick={() => { if (!lockedRef.current) { setFilled([]); setWrongSlots([]); } }}
          disabled={lockedRef.current || filled.every((v) => v === undefined)}
          style={{
            fontSize: 15, padding: "0 10px", height: 56, fontWeight: 800, letterSpacing: "0.04em",
            opacity: !lockedRef.current && filled.some((v) => v !== undefined) ? 1 : 0.45,
          }}>BORRAR</button>
        <button className="ed-btn ed-btn-restart" onClick={() => setConfirmingExit(true)}
          style={{ fontSize: 15, padding: "0 10px", height: 56, fontWeight: 800, letterSpacing: "0.04em" }}>REINICIAR</button>
        <button className="ed-btn ed-btn-ghost" onClick={() => setConfirmingHomeExit(true)}
          style={{ fontSize: 15, padding: "0 10px", height: 56, fontWeight: 800, letterSpacing: "0.04em" }}>SALIR</button>
      </div>

      <FeedbackOverlay feedback={feedback} feedbackMsg={feedbackMsg} charName={char.name} />
      <RestartModal confirmingExit={confirmingExit} setConfirmingExit={setConfirmingExit} attempted={attempted} total={3} onRestart={onRestart} />
      <ExitToHomeModal open={confirmingHomeExit} onCancel={() => setConfirmingHomeExit(false)} onConfirm={() => { setConfirmingHomeExit(false); go("home"); }} attempted={attempted} total={3} />
      <style>{`
        @keyframes ed-shake {
          0%,100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// NIVEL 2 — Elementos del texto (3 mecánicas distintas)
// ─────────────────────────────────────────────────────────────
function ElementosTextoGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "Elementos del texto";

  const [ronda, setRonda] = useStateG(0);
  const [elapsed, setElapsed] = useStateG(0);
  const [stars, setStars] = useStateG(0);
  const [solved, setSolved] = useStateG(0);
  const [attempted, setAttempted] = useStateG(0);
  const [starsSession, setStarsSession] = useStateG(0);
  const [feedback, setFeedback] = useStateG(null);
  const [feedbackMsg, setFeedbackMsg] = useStateG("");
  const [confirmingExit, setConfirmingExit] = useStateG(false);
  const [confirmingHomeExit, setConfirmingHomeExit] = useStateG(false);
  const [log, setLog] = useStateG([]);
  const started = useRefG(Date.now());
  const exerciseStart = useRefG(Date.now());

  // VERIFICAR y BORRAR controlados por el padre: el sub-componente expone
  // sus funciones vía refs, y reporta ready=true cuando hay algo que hacer.
  const verifyRef = useRefG(null);
  const [verifyReady, setVerifyReady] = useStateG(false);
  const clearRef = useRefG(null);
  const [clearReady, setClearReady] = useStateG(false);

  // Al cambiar de ronda, reset verify/clear
  useEffectG(() => {
    verifyRef.current = null;
    clearRef.current = null;
    setVerifyReady(false);
    setClearReady(false);
  }, [ronda]);

  useEffectG(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started.current) / 1000)), 500);
    return () => clearInterval(id);
  }, []);

  // Glifos chalkboard nivel 2
  useEffectG(() => {
    window.__currentChalkGlyphs = [
      { c: "📖", l: "6%",  t: "12%", r: "-8deg" },
      { c: "💬", l: "82%", t: "16%", r: "6deg",  s: "0.62em" },
      { c: "📱", l: "10%", t: "78%", r: "12deg", s: "0.7em" },
      { c: "✏",  l: "88%", t: "72%", r: "-10deg", s: "0.55em" },
      { c: "📝", l: "45%", t: "8%",  r: "4deg",  s: "0.5em" },
      { c: "❓", l: "3%",  t: "45%", r: "-4deg", s: "0.6em" },
      { c: "❗", l: "92%", t: "45%", r: "8deg",  s: "0.58em" },
      { c: "💡", l: "30%", t: "55%", r: "-6deg", s: "0.55em" },
      { c: "🤔", l: "70%", t: "62%", r: "8deg",  s: "0.55em" },
      { c: "→",  l: "55%", t: "30%", r: "-4deg", s: "0.46em" },
    ];
    window.dispatchEvent(new Event("ed-chalk-glyphs-updated"));
    return () => {
      window.__currentChalkGlyphs = null;
      window.dispatchEvent(new Event("ed-chalk-glyphs-updated"));
    };
  }, []);

  function recordRound(isCorrect, userText, correctText, op, emojiTag) {
    if (typeof window.markFirstAttempt === "function") window.markFirstAttempt();
    const exerciseSec = Math.max(0, Math.floor((Date.now() - exerciseStart.current) / 1000));
    const earned = calcStars(isCorrect, exerciseSec);
    const newAttempted = attempted + 1;
    const newSolved = solved + (isCorrect ? 1 : 0);
    const newStarsTotal = stars + earned;
    const newStarsSession = starsSession + earned;

    const entry = {
      idx: newAttempted, a: correctText, b: userText, op,
      correctAnswer: correctText, userAnswer: userText,
      isCorrect, time: exerciseSec, earned,
      emoji: emojiTag,
    };
    const newLog = [...log, entry];

    setFeedback(isCorrect ? "ok" : "err");
    setFeedbackMsg(isCorrect ? `+${earned} ⭐` : ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]);
    setAttempted(newAttempted);
    setSolved(newSolved);
    setStars(newStarsTotal);
    setStarsSession(newStarsSession);
    setLog(newLog);

    const wait = isCorrect ? 950 : 1400;
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

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <GameHUD elapsed={elapsed} stars={stars} attempted={attempted} solved={solved} total={3} app={app} setApp={setApp} />

      {/* Enunciado (QUÉ hacer) — centrado al lienzo */}
      <div style={{
        position: "absolute", top: 100, left: "50%", transform: "translateX(-50%)",
        maxWidth: 500, textAlign: "center",
        fontFamily: "var(--ed-font-display)", fontWeight: 700,
        fontSize: 19, lineHeight: 1.15,
        color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,0.55)",
        pointerEvents: "none",
      }}>
        {ronda === 0 && "Reconoce la intención del texto."}
        {ronda === 1 && "Empareja cada texto con su tono."}
        {ronda === 2 && "Elige el mejor final para la historia."}
      </div>

      {/* Personaje grande con bocadillo */}
      <div data-qa="personaje" style={{
        position: "absolute", left: 8, bottom: 90, width: 220,
        pointerEvents: "none", textAlign: "center",
      }}>
        <div data-qa="bocadillo" style={{
          position: "absolute", left: 0, right: 0, top: -80,
          pointerEvents: "none",
          display: "flex", justifyContent: "center",
        }}>
          <div style={{
            position: "relative",
            display: "inline-block",
            maxWidth: 208,
            background: "linear-gradient(180deg, rgba(20,12,55,0.95), rgba(10,6,35,0.95))",
            border: "1.5px solid rgba(242,194,96,0.65)",
            borderRadius: 16, padding: "10px 14px",
            fontFamily: "var(--ed-font-display)",
            fontWeight: 700, fontSize: 14, lineHeight: 1.25,
            color: "#fce9a8", textAlign: "center",
            boxShadow: "0 10px 24px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}>
            {ronda === 0 && <>Tienes 30 segundos.<br/>¡Lee y toca rápido!</>}
            {ronda === 1 && <>Toca un texto y<br/>luego elige su tono.</>}
            {ronda === 2 && <>Lee con calma y<br/>fíjate en las pistas.</>}
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

      {/* Zona central — varía por ronda. Centrada al lienzo (x=450). */}
      <div data-qa="zona-central" style={{
        position: "absolute", top: 132, left: 230, right: 230, bottom: 28,
      }}>
        {ronda === 0 && (
          <SpeedQuizCard
            pool={INTENCIONALIDAD_POOL}
            chips={INTENCIONALIDAD_CHIPS}
            verifyRef={verifyRef}
            setVerifyReady={setVerifyReady}
            onFinish={(stats) => {
              const score = stats.aciertos - stats.errores;
              const isCorrect = score >= 4;
              recordRound(isCorrect, `${stats.aciertos} aciertos · ${stats.errores} errores`, "Detectar la intención del texto", "⚡", "📖");
            }}
          />
        )}
        {ronda === 1 && (
          <DragMatchCard
            pool={TONO_POOL}
            chips={TONO_CHIPS}
            verifyRef={verifyRef}
            setVerifyReady={setVerifyReady}
            clearRef={clearRef}
            setClearReady={setClearReady}
            onFinish={(stats) => {
              const isCorrect = stats.aciertos === 3;
              recordRound(isCorrect, `${stats.aciertos}/3 emparejados`, "Detectar tono del autor", "🎭", "💬");
            }}
          />
        )}
        {ronda === 2 && (
          <ElijeElFinalCard
            pool={ARGUMENTO_POOL}
            verifyRef={verifyRef}
            setVerifyReady={setVerifyReady}
            onAnswer={(opt, story) => {
              recordRound(opt.isCorrect, opt.text, story.options.find((o) => o.isCorrect).text, "🔍", "📖");
            }}
          />
        )}
      </div>

      {/* Columna de acciones a la derecha: VERIFICAR (todas) + BORRAR (solo R1) + REINICIAR + SALIR */}
      <div data-qa="acciones" style={{
        position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)",
        display: "flex", flexDirection: "column", gap: 12, width: 150,
      }}>
        <button className="ed-btn ed-btn-verify"
          onClick={() => { if (verifyReady && verifyRef.current) verifyRef.current(); }}
          disabled={!verifyReady}
          style={{
            fontSize: 15, padding: "0 10px", height: 56, fontWeight: 800, letterSpacing: "0.04em",
            opacity: verifyReady ? 1 : 0.45,
            cursor: verifyReady ? "pointer" : "not-allowed",
          }}>¡VERIFICAR!</button>
        {ronda === 1 && (
          <button className="ed-btn ed-btn-erase"
            onClick={() => { if (clearReady && clearRef.current) clearRef.current(); }}
            disabled={!clearReady}
            style={{
              fontSize: 15, padding: "0 10px", height: 56, fontWeight: 800, letterSpacing: "0.04em",
              opacity: clearReady ? 1 : 0.45,
              cursor: clearReady ? "pointer" : "not-allowed",
            }}>BORRAR</button>
        )}
        <button className="ed-btn ed-btn-restart" onClick={() => setConfirmingExit(true)}
          style={{ fontSize: 15, padding: "0 10px", height: 56, fontWeight: 800, letterSpacing: "0.04em" }}>REINICIAR</button>
        <button className="ed-btn ed-btn-ghost" onClick={() => setConfirmingHomeExit(true)}
          style={{ fontSize: 15, padding: "0 10px", height: 56, fontWeight: 800, letterSpacing: "0.04em" }}>SALIR</button>
      </div>

      <FeedbackOverlay feedback={feedback} feedbackMsg={feedbackMsg} charName={char.name} />
      <RestartModal confirmingExit={confirmingExit} setConfirmingExit={setConfirmingExit} attempted={attempted} total={3} onRestart={onRestart} />
      <ExitToHomeModal open={confirmingHomeExit} onCancel={() => setConfirmingHomeExit(false)} onConfirm={() => { setConfirmingHomeExit(false); go("home"); }} attempted={attempted} total={3} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// R0 — SpeedQuizCard: 30s, varios textos seguidos, tap chip rápido
// ─────────────────────────────────────────────────────────────
function SpeedQuizCard({ pool, chips, onFinish, verifyRef, setVerifyReady }) {
  const SESSION_DURATION = 30;
  const [timeLeft, setTimeLeft] = useStateG(SESSION_DURATION);
  const [stats, setStats] = useStateG({ aciertos: 0, errores: 0 });
  const [selectedChip, setSelectedChip] = useStateG(null);
  const finishedRef = useRefG(false);

  // Cola de textos: pool barajado al inicio. Cuando se agota, rebarajamos.
  const queueRef = useRefG(shuffle(pool));
  const [current, setCurrent] = useStateG(() => queueRef.current.shift());
  const [shake, setShake] = useStateG(null);

  useEffectG(() => {
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          finishedRef.current = true;
          if (setVerifyReady) setVerifyReady(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffectG(() => {
    if (timeLeft === 0 && finishedRef.current) {
      const t = setTimeout(() => onFinish(stats), 600);
      return () => clearTimeout(t);
    }
  }, [timeLeft, stats]);

  // Reportar al padre cuándo está listo (hay un chip seleccionado).
  useEffectG(() => {
    if (!setVerifyReady) return;
    setVerifyReady(!finishedRef.current && selectedChip !== null);
  }, [selectedChip]);

  // Exponer verify al padre.
  useEffectG(() => {
    if (!verifyRef) return;
    verifyRef.current = () => confirmSelection();
  }, [selectedChip, current]);

  function nextText() {
    if (queueRef.current.length === 0) queueRef.current = shuffle(pool);
    setCurrent(queueRef.current.shift());
  }

  function tap(chip) {
    if (finishedRef.current || !current) return;
    // Tap selecciona el chip (toggle si tap mismo). NO verifica.
    setSelectedChip((prev) => (prev === chip ? null : chip));
  }

  function confirmSelection() {
    if (finishedRef.current || !current || !selectedChip) return;
    if (selectedChip === current.correct) {
      setStats((s) => ({ ...s, aciertos: s.aciertos + 1 }));
      pushRecent("elementos_r1", current.id);
      setSelectedChip(null);
      nextText();
    } else {
      setStats((s) => ({ ...s, errores: s.errores + 1 }));
      setShake(selectedChip);
      setTimeout(() => setShake(null), 350);
      setSelectedChip(null);
    }
  }

  return (
    <div style={{
      position: "relative", width: "100%", height: "100%",
      display: "flex", flexDirection: "column", gap: 12,
    }}>
      {/* HUD del speed quiz */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontFamily: "var(--ed-font-display)", color: "#fce9a8", fontSize: 13, fontWeight: 700,
        padding: "4px 8px",
      }}>
        <div>✅ {stats.aciertos} &nbsp; ❌ {stats.errores}</div>
        <div style={{
          background: timeLeft <= 10 ? "rgba(255,107,107,0.5)" : "rgba(0,0,0,0.4)",
          borderRadius: 999, padding: "4px 14px",
          border: "1px solid rgba(252,233,168,0.5)",
        }}>⏱ {timeLeft}s</div>
      </div>

      {/* Card del texto: ocupa todo el spacer central — sin huecos blancos */}
      <div
        key={current ? current.id : "tiempo"}
        style={{
          flex: 1, minHeight: 0,
          background: "rgba(255,255,255,0.95)", color: "#1a1a1a",
          borderRadius: 14, padding: "18px 24px",
          border: "2px solid #f2c260",
          boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
          fontFamily: "var(--ed-font-ui)",
          fontSize: 18, lineHeight: 1.4, fontWeight: 500,
          textAlign: "center",
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: "ed-pop-in 0.32s ease-out",
        }}>
        {timeLeft === 0 ? "¡Tiempo!" : (current ? current.text : "")}
      </div>

      {/* Chips en grid 2×2 para aprovechar mejor el espacio vertical */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 1fr",
        gap: 8,
        minHeight: 110,
      }}>
        {chips.map((c) => {
          const isSelected = selectedChip === c;
          return (
            <button key={c} onClick={() => tap(c)} disabled={finishedRef.current}
              style={{
                padding: "10px 6px", borderRadius: 12,
                background: isSelected
                  ? "linear-gradient(180deg, #ffd84b, #c0850c)"
                  : "linear-gradient(180deg, #ffe97a, #d7b12a)",
                color: "#3a2608",
                fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 15,
                border: isSelected ? "2.5px solid #fce9a8" : "none",
                boxShadow: isSelected
                  ? "0 0 0 4px rgba(255,255,255,1), 0 0 0 8px rgba(252,233,168,0.65), 0 0 38px rgba(252,233,168,0.9), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -3px 0 rgba(0,0,0,0.2), 0 8px 22px -4px rgba(0,0,0,0.55)"
                  : "inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -3px 0 rgba(0,0,0,0.18), 0 4px 10px -2px rgba(0,0,0,0.45)",
                cursor: finishedRef.current ? "default" : "pointer", letterSpacing: "0.02em",
                opacity: finishedRef.current ? 0.5 : 1,
                transform: isSelected ? "translateY(-4px) scale(1.04)" : "none",
                transition: "all 0.15s ease",
                animation: shake === c ? "ed-shake 0.35s" : "none",
              }}>{c}</button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// R1 — DragMatchCard: 3 textos + 3 chips, tap para conectar
// ─────────────────────────────────────────────────────────────
function DragMatchCard({ pool, chips, onFinish, verifyRef, setVerifyReady, clearRef, setClearReady }) {
  // Elegir 3 textos con 3 tonos DISTINTOS (uno por chip si se puede)
  const items = useMemoG(() => {
    const recent = new Set(getRecent("elementos_r2"));
    const byChip = {};
    chips.forEach((c) => { byChip[c] = pool.filter((p) => p.correct === c && !recent.has(p.id)); });
    // Si algún chip se quedó sin pool, usar todos del chip
    chips.forEach((c) => { if (byChip[c].length === 0) byChip[c] = pool.filter((p) => p.correct === c); });
    // Elegir 3 chips al azar y para cada uno 1 texto
    const pickedChips = shuffle(chips).slice(0, 3);
    const picked = pickedChips.map((c) => {
      const arr = byChip[c];
      const p = arr[Math.floor(Math.random() * arr.length)];
      return p;
    }).filter(Boolean);
    picked.forEach((p) => pushRecent("elementos_r2", p.id));
    return shuffle(picked);
  }, []);
  const shownChips = useMemoG(() => shuffle(items.map((it) => it.correct)), [items]);

  // selectedText: id del texto seleccionado (esperando chip)
  const [selectedText, setSelectedText] = useStateG(null);
  // matches: { textId: chip }
  const [matches, setMatches] = useStateG({});
  const [verified, setVerified] = useStateG(false);
  const finishedRef = useRefG(false);

  // Exponer verify al padre vía ref. El padre decide cuándo se ejecuta
  // (cuando el usuario toca el botón VERIFICAR de la columna derecha).
  useEffectG(() => {
    if (!verifyRef) return;
    verifyRef.current = () => verifyNow(matches);
  }, [matches]);

  // Reportar al padre cuándo está listo para verificar (los 3 emparejados).
  useEffectG(() => {
    if (!setVerifyReady) return;
    setVerifyReady(!finishedRef.current && Object.keys(matches).length === items.length);
  }, [matches, items.length]);

  // Exponer clear (borrar todas las conexiones) al padre.
  useEffectG(() => {
    if (!clearRef) return;
    clearRef.current = () => {
      if (finishedRef.current) return;
      setMatches({});
      setSelectedText(null);
    };
  });

  // Reportar al padre cuándo hay algo que borrar.
  useEffectG(() => {
    if (!setClearReady) return;
    setClearReady(!finishedRef.current && Object.keys(matches).length > 0);
  }, [matches]);

  function tapText(itemId) {
    if (finishedRef.current) return;
    if (matches[itemId]) {
      // ya conectado: desconectar
      const next = { ...matches }; delete next[itemId]; setMatches(next); return;
    }
    setSelectedText(itemId === selectedText ? null : itemId);
  }
  function tapChip(chip) {
    if (finishedRef.current) return;
    if (!selectedText) return;
    // Si ese chip ya está usado por otro texto, no permitir (cada chip único)
    const usedBy = Object.entries(matches).find(([, c]) => c === chip);
    if (usedBy) return;
    const next = { ...matches, [selectedText]: chip };
    setMatches(next);
    setSelectedText(null);
    // Ya NO auto-verifica al completar — el padre dispara verify vía verifyRef.
  }
  function verifyNow(currentMatches) {
    if (finishedRef.current) return;
    if (Object.keys(currentMatches).length !== items.length) return;
    finishedRef.current = true;
    setVerified(true);
    if (setVerifyReady) setVerifyReady(false);
    let aciertos = 0;
    items.forEach((it) => { if (currentMatches[it.id] === it.correct) aciertos++; });
    setTimeout(() => onFinish({ aciertos, total: items.length }), 1000);
  }

  return (
    <div style={{
      position: "relative", width: "100%", height: "100%",
      display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14,
    }}>
      {/* Columna textos */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, justifyContent: "space-evenly" }}>
        {items.map((it) => {
          const isSelected = selectedText === it.id;
          const matchedChip = matches[it.id];
          const isCorrect = verified && matchedChip === it.correct;
          const isWrong = verified && matchedChip && matchedChip !== it.correct;
          return (
            <button key={it.id} onClick={() => tapText(it.id)}
              style={{
                padding: "10px 12px", borderRadius: 12,
                background: matchedChip
                  ? (verified
                      ? (isCorrect ? "rgba(46,204,143,0.92)" : "rgba(255,107,107,0.92)")
                      : "rgba(252,233,168,0.95)")
                  : (isSelected ? "rgba(252,233,168,0.85)" : "rgba(255,255,255,0.92)"),
                color: matchedChip && verified ? "#fff" : "#1a1a1a",
                fontFamily: "var(--ed-font-ui)", fontWeight: 500, fontSize: 12,
                border: `2px solid ${isSelected ? "#fce9a8" : matchedChip ? "#d9a441" : "rgba(242,194,96,0.5)"}`,
                textAlign: "left", lineHeight: 1.35,
                cursor: finishedRef.current ? "default" : "pointer",
                boxShadow: isSelected ? "0 0 0 4px rgba(255,255,255,1), 0 0 0 8px rgba(252,233,168,0.65), 0 0 38px rgba(252,233,168,0.9), 0 8px 22px -4px rgba(0,0,0,0.55)" : "0 3px 8px rgba(0,0,0,0.25)",
                transition: "all 0.15s ease",
                position: "relative",
              }}>
              {it.text}
              {matchedChip && (
                <div style={{
                  position: "absolute", right: 8, top: 6,
                  fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 10,
                  color: verified ? "#fff" : "#3a2608",
                  background: verified ? "rgba(0,0,0,0.25)" : "rgba(217,164,65,0.7)",
                  padding: "2px 6px", borderRadius: 999,
                }}>→ {matchedChip}</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Columna chips */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, justifyContent: "space-evenly" }}>
        {shownChips.map((chip) => {
          const usedByEntry = Object.entries(matches).find(([, c]) => c === chip);
          const used = !!usedByEntry;
          const itemForChip = used ? items.find((it) => it.id === usedByEntry[0]) : null;
          const isCorrect = verified && itemForChip && itemForChip.correct === chip;
          const isWrong = verified && itemForChip && itemForChip.correct !== chip;
          return (
            <button key={chip} onClick={() => tapChip(chip)} disabled={!selectedText && !verified}
              style={{
                padding: "16px 10px", borderRadius: 14,
                background: used
                  ? (verified
                      ? (isCorrect ? "linear-gradient(180deg, #5be0a3, #2ecc8f)" : "linear-gradient(180deg, #ff9b9b, #ef5a5a)")
                      : "linear-gradient(180deg, #ffe97a, #d7b12a)")
                  : (selectedText ? "linear-gradient(180deg, #ffe97a, #d7b12a)" : "rgba(0,0,0,0.45)"),
                color: used ? (verified ? "#fff" : "#3a2608") : selectedText ? "#3a2608" : "rgba(252,233,168,0.7)",
                fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 15,
                border: used ? "none" : "2px dashed rgba(252,233,168,0.45)",
                boxShadow: used
                  ? "inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -3px 0 rgba(0,0,0,0.18), 0 4px 10px -2px rgba(0,0,0,0.45)"
                  : selectedText ? "0 0 14px rgba(252,233,168,0.3)" : "none",
                cursor: (!selectedText && !used) || verified ? "default" : "pointer",
                letterSpacing: "0.02em",
                transition: "all 0.15s ease",
                opacity: (!selectedText && !used) ? 0.6 : 1,
              }}>{chip}</button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// R2 — ElijeElFinalCard: historia + 4 finales
// ─────────────────────────────────────────────────────────────
function ElijeElFinalCard({ pool, onAnswer, verifyRef, setVerifyReady }) {
  const story = useMemoG(() => {
    const recent = new Set(getRecent("elementos_r3"));
    let candidates = pool.filter((s) => !recent.has(s.id));
    if (candidates.length === 0) candidates = pool;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    pushRecent("elementos_r3", pick.id);
    return pick;
  }, []);
  const shuffledOptions = useMemoG(() => shuffle(story.options), [story]);
  const [selected, setSelected] = useStateG(null);   // opción seleccionada (aún no confirmada)
  const [answered, setAnswered] = useStateG(null);   // opción confirmada (verify ya disparado)
  const finishedRef = useRefG(false);

  function tap(opt) {
    if (finishedRef.current) return;
    // tap en la misma → deseleccionar; en otra → reemplaza la selección
    setSelected((prev) => (prev === opt ? null : opt));
  }

  // Reportar al padre cuándo está listo para verificar (hay una opción seleccionada).
  useEffectG(() => {
    if (!setVerifyReady) return;
    setVerifyReady(!finishedRef.current && selected !== null);
  }, [selected]);

  // Exponer verify al padre vía ref.
  useEffectG(() => {
    if (!verifyRef) return;
    verifyRef.current = () => {
      if (finishedRef.current || !selected) return;
      finishedRef.current = true;
      setAnswered(selected);
      if (setVerifyReady) setVerifyReady(false);
      setTimeout(() => onAnswer(selected, story), 1000);
    };
  }, [selected]);

  return (
    <div style={{
      position: "relative", width: "100%", height: "100%",
      display: "grid", gridTemplateRows: "auto 1fr", gap: 10,
    }}>
      {/* Texto narrativo */}
      <div style={{
        background: "rgba(255,255,255,0.95)", color: "#1a1a1a",
        borderRadius: 14, padding: "14px 20px",
        border: "2px solid #f2c260",
        boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
        fontFamily: "var(--ed-font-ui)",
      }}>
        <div style={{
          fontSize: 14, lineHeight: 1.5, fontWeight: 500,
        }}>{story.story}</div>
        <div style={{
          marginTop: 8, padding: "6px 10px",
          background: "rgba(242,194,96,0.18)", borderRadius: 8,
          fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 13,
          color: "#7a4d10",
        }}>🔍 {story.question}</div>
      </div>

      {/* 4 finales */}
      <div style={{ display: "grid", gridTemplateRows: "1fr 1fr 1fr 1fr", gap: 6 }}>
        {shuffledOptions.map((opt, i) => {
          const isSelected = selected === opt && !answered;
          const isThisAnswered = answered === opt;
          const showCorrect = answered && opt.isCorrect;
          const showWrong = isThisAnswered && !opt.isCorrect;
          return (
            <button key={i} onClick={() => tap(opt)} disabled={!!answered}
              style={{
                padding: "10px 14px", borderRadius: 12,
                background: showCorrect ? "linear-gradient(180deg, #5be0a3, #2ecc8f)"
                  : showWrong ? "linear-gradient(180deg, #ff9b9b, #ef5a5a)"
                  : isSelected ? "linear-gradient(180deg, #ffe97a, #d7b12a)"
                  : "rgba(255,233,122,0.92)",
                color: showCorrect || showWrong ? "#fff" : "#1a1a1a",
                fontFamily: "var(--ed-font-ui)", fontWeight: 600, fontSize: 13,
                border: `2.5px solid ${showCorrect ? "#1a8f5e" : showWrong ? "#a13b3b" : isSelected ? "#fce9a8" : "rgba(242,194,96,0.7)"}`,
                textAlign: "left", lineHeight: 1.3,
                cursor: answered ? "default" : "pointer",
                boxShadow: isSelected ? "0 0 0 4px rgba(255,255,255,1), 0 0 0 8px rgba(252,233,168,0.65), 0 0 38px rgba(252,233,168,0.9), 0 8px 22px -4px rgba(0,0,0,0.55)" : "0 4px 10px rgba(0,0,0,0.3)",
                transform: isSelected ? "translateY(-4px) scale(1.04)" : "none",
                transition: "all 0.15s ease",
              }}>{opt.text}</button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// RESULTS — reporte académico (compartido)
// ─────────────────────────────────────────────────────────────
function formatOp(e) {
  return `${e.emoji || ""} ${e.a}`;
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
              <th style={printStyles.th}>Reto</th>
              <th style={{ ...printStyles.th, ...printStyles.thR }}>Respuesta del estudiante</th>
              <th style={{ ...printStyles.th, ...printStyles.thR }}>Respuesta correcta</th>
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
  const res = app.lastResult || { category: "—", solved: 0, total: 3, time: 0, starsEarned: 0, log: [] };
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
                  color: "var(--ed-ink-dim)",
                  borderBottom: "1px solid rgba(148,120,255,0.3)",
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
                    <td style={{ padding: "8px 8px", textAlign: "right" }}>{e.userAnswer}</td>
                    <td style={{ padding: "8px 8px", textAlign: "right" }}>{e.correctAnswer}</td>
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
        res={res}
        dateStr={dateStr}
        m={m}
        s={s}
        attemptedCount={attemptedCount}
        totalEx={totalEx}
        accuracy={accuracy}
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
      <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: emphasis ? 22 : 18, color: tone, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

Object.assign(window, { GameScreen, ResultsScreen, LetraCQGame, ElementosTextoGame });
