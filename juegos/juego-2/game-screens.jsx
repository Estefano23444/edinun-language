// game-screens.jsx — Juego 2. Tres niveles con mecánicas diferentes:
//   1. La letra r — atrapa la R en palabras (bandeja r/l/m/n/s).
//   2. La noticia — 3 rondas (parte resaltada / resumen / definición).
//   3. El blog — 3 rondas (elemento resaltado / shooter / definición).
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
  letraR:  "edinun_juego2_letraR_recientes_v1",
  noticia: "edinun_juego2_noticia_recientes_v1",
  blog:    "edinun_juego2_blog_recientes_v1",
};
const RECENT_LIMIT = 6;

function getRecent(level) {
  try {
    const raw = localStorage.getItem(RECENT_KEYS[level]);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function pushRecent(level, key) {
  const arr = getRecent(level).filter((k) => k !== key);
  arr.unshift(key);
  const trimmed = arr.slice(0, RECENT_LIMIT);
  try { localStorage.setItem(RECENT_KEYS[level], JSON.stringify(trimmed)); } catch {}
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
// DATA — NIVEL 1: La letra R
// ─────────────────────────────────────────────────────────────
const LETRA_R_BANK = [
  { emoji: "🌊", word: "mar" },
  { emoji: "🏆", word: "oro" },
  { emoji: "🌿", word: "rama" },
  { emoji: "💐", word: "ramo" },
  { emoji: "😄", word: "risa" },
  { emoji: "🎵", word: "rima" },
  { emoji: "❤️", word: "amor" },
  { emoji: "🍐", word: "pera" },
  { emoji: "🐂", word: "toro" },
  { emoji: "🏴‍☠️", word: "pirata" },
  { emoji: "🐭", word: "ratón" },
  { emoji: "🐯", word: "tigre" },
  { emoji: "🦒", word: "jirafa" },
  { emoji: "🦋", word: "mariposa" },
];
const R_TRAY = ["r", "l", "m", "n", "s"];

// ─────────────────────────────────────────────────────────────
// DATA — NIVEL 2: La noticia
// ─────────────────────────────────────────────────────────────
const NOTICIAS = [
  {
    id: "perezoso",
    emoji: "🦥",
    fecha: "22 ene 2016",
    titular: "La CTE rescata a un oso perezoso",
    entrada: "Hoy, 22 de enero de 2016, los agentes de la CTE se encontraron con una sorpresa: un pequeño perezoso intentaba cruzar el anillo vial de Quevedo.",
    cuerpo: "Se trataba de un animal pequeño, color café, que estaba abrazado a una columna de hierro a un lado de la carretera. La patrulla 394 que se encontraba en el sector se detuvo a ayudarlo.",
    cierre: "El perezoso fue revisado por un veterinario y se encuentra en excelentes condiciones para regresar a su hábitat natural.",
    resumen_correcto: "La CTE rescató a un perezoso que intentaba cruzar una vía en Quevedo.",
    resumen_distractores: [
      "Los agentes de la CTE patrullaban el anillo vial de Quevedo.",
      "Israel Bustamante es el subteniente de la CTE de Quevedo.",
    ],
  },
  {
    id: "incendio",
    emoji: "🔥",
    fecha: "Tarde de ayer",
    titular: "Incendio cerca del aeropuerto de Esmeraldas",
    entrada: "Un incendio forestal cerca de la cabecera norte del aeropuerto Carlos Concha, en Esmeraldas, puso en riesgo las instalaciones de la terminal aérea.",
    cuerpo: "Hasta la tarde de ayer se desconocían las causas que originaron las llamas en este sitio, ubicado a pocos metros de la pista principal.",
    cierre: "Los bomberos lograron apagar el fuego cuando se hallaba a tres metros de la cabecera norte del aeropuerto.",
    resumen_correcto: "Un incendio forestal en Esmeraldas amenazó el aeropuerto Carlos Concha.",
    resumen_distractores: [
      "El aeropuerto Carlos Concha tiene operaciones aéreas locales.",
      "Los bomberos trabajan a tres metros de la cabecera norte.",
    ],
  },
  {
    id: "monos",
    emoji: "🐒",
    fecha: "Ayer",
    titular: "44 monos aulladores muertos en reserva natural",
    entrada: "Ayer, en la reserva natural Pacoche en Manabí, encontraron 44 monos aulladores muertos en condiciones extrañas.",
    cuerpo: "Los veterinarios encargados piensan que puede tratarse de una enfermedad contagiosa, aunque aún no están seguros del origen exacto.",
    cierre: "Se han prohibido las visitas de los turistas a la reserva hasta aclarar los hechos.",
    resumen_correcto: "Hallaron 44 monos aulladores muertos en la reserva Pacoche de Manabí.",
    resumen_distractores: [
      "Los monos aulladores habitan en varios países de América del Sur.",
      "Los veterinarios son los encargados de la reserva.",
    ],
  },
  {
    id: "globos",
    emoji: "🎈",
    fecha: "Anoche",
    titular: "Festival de globos ilumina el cielo de Quito",
    entrada: "Anoche, miles de quiteños se reunieron en el parque Bicentenario para presenciar el lanzamiento de cientos de globos luminosos.",
    cuerpo: "El evento, organizado por la municipalidad, contó con bailes, ferias gastronómicas y juegos para toda la familia.",
    cierre: "El festival continuará durante todo el fin de semana con actividades culturales en distintos parques.",
    resumen_correcto: "Miles de quiteños asistieron al festival de globos en el parque Bicentenario.",
    resumen_distractores: [
      "Los globos vuelan muy alto en el cielo de Quito.",
      "La municipalidad organiza ferias todos los fines de semana.",
    ],
  },
  {
    id: "tortugas",
    emoji: "🐢",
    fecha: "Este lunes",
    titular: "Liberan 200 tortugas gigantes en las Galápagos",
    entrada: "El Parque Nacional Galápagos liberó este lunes 200 tortugas gigantes en la isla Santa Cruz como parte de su programa de conservación.",
    cuerpo: "Las tortugas, criadas en cautiverio durante cinco años, regresan a su hábitat natural luego de un proceso de adaptación.",
    cierre: "La iniciativa busca aumentar la población de la especie, que estuvo al borde de la extinción.",
    resumen_correcto: "Liberaron 200 tortugas gigantes en la isla Santa Cruz de Galápagos.",
    resumen_distractores: [
      "Las tortugas viven en cautiverio durante cinco años.",
      "Las Galápagos son un destino turístico popular.",
    ],
  },
  {
    id: "parque",
    emoji: "🌳",
    fecha: "Ayer",
    titular: "Inauguran nuevo parque ecológico en Guayaquil",
    entrada: "Guayaquil estrenó ayer un parque de 50 hectáreas dedicado a la conservación de plantas nativas y especies en peligro.",
    cuerpo: "El espacio cuenta con senderos, áreas de juego infantil y un centro de educación ambiental para los visitantes.",
    cierre: "El alcalde anunció que se sembrarán mil árboles adicionales en los próximos meses.",
    resumen_correcto: "Guayaquil inauguró un nuevo parque ecológico de 50 hectáreas.",
    resumen_distractores: [
      "El alcalde sembrará árboles en su tiempo libre.",
      "Los parques de Guayaquil tienen senderos y juegos.",
    ],
  },
];

const NOTICIA_CONCEPTOS = [
  { concepto: "TITULAR",     def: "Frase breve y llamativa que resume el tema de la noticia." },
  { concepto: "ENTRADA",     def: "Primer párrafo que responde qué ocurrió, quién, cuándo y dónde." },
  { concepto: "CUERPO",      def: "Desarrollo de la noticia con contexto y datos relevantes." },
  { concepto: "CIERRE",      def: "Párrafo final con un dato curioso o consecuencia del hecho." },
  { concepto: "¿QUÉ?",       def: "Pregunta del periodista que identifica el hecho ocurrido." },
  { concepto: "¿QUIÉN?",     def: "Pregunta del periodista que identifica al protagonista." },
  { concepto: "¿CUÁNDO?",    def: "Pregunta del periodista que identifica el tiempo del hecho." },
  { concepto: "¿DÓNDE?",     def: "Pregunta del periodista que identifica el lugar del hecho." },
  { concepto: "INFORMATIVO", def: "Tipo de texto que cuenta hechos reales y novedosos al público." },
  { concepto: "OBJETIVO",    def: "Característica de la noticia: cuenta los hechos sin opinión personal." },
];

// ─────────────────────────────────────────────────────────────
// DATA — NIVEL 3: El blog
// ─────────────────────────────────────────────────────────────
const BLOG_ELEMENTOS = [
  "ENTRADAS", "COMENTARIOS", "ARCHIVOS", "CATEGORÍAS",
  "DISEÑO", "BOTONES Y ENLACES", "MULTIMEDIA", "SOBRE MÍ",
];

const BLOG_CONCEPTOS = [
  { concepto: "ENTRADAS",          def: "Publicaciones individuales en las que el autor aborda un tema específico." },
  { concepto: "COMENTARIOS",       def: "Espacio donde los lectores dejan sus opiniones en respuesta a las entradas." },
  { concepto: "ARCHIVOS",          def: "Sistema para guardar y organizar las publicaciones por fecha o categoría." },
  { concepto: "CATEGORÍAS",        def: "Etiquetas que clasifican las publicaciones según su tema o contenido." },
  { concepto: "DISEÑO",            def: "Opciones de personalización del aspecto visual del blog." },
  { concepto: "BOTONES Y ENLACES", def: "Permiten a los lectores compartir las publicaciones en sus redes sociales." },
  { concepto: "MULTIMEDIA",        def: "Imágenes, videos y audios que enriquecen las publicaciones." },
  { concepto: "SOBRE MÍ",          def: "Sección que presenta al autor con información sobre su experiencia." },
  { concepto: "BLOG",              def: "Medio de comunicación versátil para compartir ideas y experiencias en línea." },
  { concepto: "BLOGUERO",          def: "Persona que escribe y mantiene un blog de forma regular." },
];

// Distractores del shooter (palabras relacionadas con web/redes pero NO son
// elementos canónicos del blog según el libro).
const BLOG_DISTRACTORES = [
  "INSTAGRAM", "FACEBOOK", "TWITTER", "WHATSAPP", "TIKTOK",
  "LIKES", "HASHTAG", "STORIES", "BANNER", "EMAIL",
];

// Mockups de blog para la ronda 1. Cada mockup tiene 4 secciones
// identificables que el sistema puede resaltar y preguntar.
const BLOG_MOCKUPS = [
  {
    id: "viajes",
    titulo: "Viajes por Ecuador",
    autor: "María",
    sections: [
      { kind: "ENTRADAS",     content: "• Galápagos eternas (Mar 15)\n• Quito iluminado (Mar 12)\n• Cuenca colonial (Mar 09)" },
      { kind: "COMENTARIOS",  content: "Juan: ¡Genial el de Galápagos!\nAna: Yo también fui a Cuenca." },
      { kind: "CATEGORÍAS",   content: "#Galápagos  #Sierra  #Costa  #Amazonía" },
      { kind: "SOBRE MÍ",     content: "Soy María, fotógrafa y amante de los viajes por mi país." },
    ],
  },
  {
    id: "cocina",
    titulo: "Sabores de mi casa",
    autor: "Carlos",
    sections: [
      { kind: "ENTRADAS",     content: "• Tarta de manzana (Mar 18)\n• Sopa de quinua (Mar 14)\n• Pan casero (Mar 10)" },
      { kind: "MULTIMEDIA",   content: "📷 30 fotos  ·  🎥 5 videos\nGalería completa de mis recetas." },
      { kind: "BOTONES Y ENLACES", content: "🔗 Compartir en redes\n📌 Guardar receta\n📩 Suscribirse" },
      { kind: "ARCHIVOS",     content: "Marzo 2024  ·  Febrero 2024\nEnero 2024  ·  Diciembre 2023" },
    ],
  },
  {
    id: "tecno",
    titulo: "Tecnología hoy",
    autor: "Sofía",
    sections: [
      { kind: "ENTRADAS",     content: "• Análisis del nuevo móvil (Mar 20)\n• 5 apps para estudiar (Mar 16)\n• Tendencias 2024 (Mar 11)" },
      { kind: "CATEGORÍAS",   content: "#Móviles  #Apps  #Internet  #Gadgets" },
      { kind: "DISEÑO",       content: "Tema: oscuro · Fuente: moderna\nColor principal: azul." },
      { kind: "SOBRE MÍ",     content: "Hola, soy Sofía. Escribo sobre tecnología accesible para todos." },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// GameScreen — delega al sub-componente según el nivel elegido
// ─────────────────────────────────────────────────────────────
function GameScreen({ app, setApp, go }) {
  const cat = app.currentCategory || "letraR";
  const [restartTick, setRestartTick] = useStateG(0);
  const restart = () => setRestartTick((t) => t + 1);
  if (cat === "noticia") return <NoticiaGame key={`noticia-${restartTick}`} app={app} setApp={setApp} go={go} onRestart={restart} />;
  if (cat === "blog")    return <BlogGame    key={`blog-${restartTick}`}    app={app} setApp={setApp} go={go} onRestart={restart} />;
  return <LetraRGame key={`letraR-${restartTick}`} app={app} setApp={setApp} go={go} onRestart={restart} />;
}

// ─────────────────────────────────────────────────────────────
// HUD común (logo + ronda dots + timer + estrellas) y modal de salida
// ─────────────────────────────────────────────────────────────
function GameHUD({ elapsed, stars, attempted, solved, total = 3, app, setApp }) {
  const levels = (typeof LEVELS_CFG !== "undefined" && LEVELS_CFG) || (window.LEVELS_CFG || []);
  const currentId = app && app.currentCategory ? app.currentCategory : "letraR";
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

      {/* Chips de tema centrados respecto a la canvas (alineados con el indicador de ronda) */}
      <div data-qa="hud-temas" style={{
        position: "absolute", top: 24, left: "50%", transform: "translateX(-50%)",
        display: "flex", alignItems: "center", gap: 6,
      }}>
        {levels.map((lv) => {
          const active = lv.id === currentId;
          return (
            <button
              key={lv.id}
              onClick={() => requestSwitch(lv.id)}
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
// NIVEL 1 — La letra R (3 rondas idénticas)
// Hereda la mecánica de "Completa la palabra" pero ocultando la R
// con bandeja r/l/m/n/s y distractores.
// ─────────────────────────────────────────────────────────────
function makeRProblem(usedKeys) {
  const recent = new Set(getRecent("letraR"));
  const exclude = new Set([...usedKeys, ...recent]);
  let pool = LETRA_R_BANK.filter((w) => !exclude.has(w.word));
  if (pool.length < 3) pool = LETRA_R_BANK.filter((w) => !usedKeys.has(w.word));
  if (pool.length === 0) pool = LETRA_R_BANK;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  const word = pick.word;
  const letters = word.split("");
  const hiddenIdx = [];
  for (let i = 0; i < letters.length; i++) {
    if (letters[i] === "r") hiddenIdx.push(i);
  }
  const correctLetters = hiddenIdx.map((i) => letters[i]);
  return {
    emoji: pick.emoji,
    word, letters, hiddenIdx, correctLetters,
    tray: R_TRAY,
  };
}

function LetraRGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "La letra del ronroneo: rrrrrr";

  const usedRef = useRefG(new Set());
  const [problem, setProblem] = useStateG(() => {
    const p = makeRProblem(usedRef.current);
    usedRef.current.add(p.word);
    pushRecent("letraR", p.word);
    return p;
  });
  const [filled, setFilled] = useStateG([]);
  const [elapsed, setElapsed] = useStateG(0);
  const [stars, setStars] = useStateG(0);
  const [solved, setSolved] = useStateG(0);
  const [attempted, setAttempted] = useStateG(0);
  const [starsSession, setStarsSession] = useStateG(0);
  const [feedback, setFeedback] = useStateG(null);
  const [feedbackMsg, setFeedbackMsg] = useStateG("");
  const [confirmingExit, setConfirmingExit] = useStateG(false);
  const [log, setLog] = useStateG([]);

  const started = useRefG(Date.now());
  const exerciseStart = useRefG(Date.now());

  useEffectG(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started.current) / 1000)), 500);
    return () => clearInterval(id);
  }, []);

  // Set glifos chalkboard del nivel 1
  useEffectG(() => {
    window.__currentChalkGlyphs = [
      { c: "R",  l: "6%",  t: "12%", r: "-8deg" },
      { c: "r",  l: "82%", t: "16%", r: "6deg",  s: "0.62em" },
      { c: "ra", l: "10%", t: "78%", r: "12deg", s: "0.5em" },
      { c: "re", l: "88%", t: "72%", r: "-10deg", s: "0.5em" },
      { c: "ri", l: "45%", t: "8%",  r: "4deg",  s: "0.5em" },
      { c: "ro", l: "3%",  t: "45%", r: "-4deg", s: "0.5em" },
      { c: "ru", l: "92%", t: "45%", r: "8deg",  s: "0.5em" },
      { c: "¡",  l: "30%", t: "55%", r: "-6deg", s: "0.55em" },
      { c: "¿",  l: "70%", t: "62%", r: "8deg",  s: "0.55em" },
      { c: "✏",  l: "55%", t: "30%", r: "-4deg", s: "0.46em" },
    ];
    return () => { window.__currentChalkGlyphs = null; };
  }, []);

  function pressLetter(letter) {
    setFilled((prev) => {
      const len = problem.hiddenIdx.length;
      const next = [...prev];
      while (next.length < len) next.push(undefined);
      for (let i = 0; i < len; i++) {
        if (next[i] === undefined) { next[i] = letter; return next; }
      }
      return prev;
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
    for (let i = problem.hiddenIdx.length - 1; i >= 0; i--) {
      if (filled[i] !== undefined) { eraseSlot(i); return; }
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

    const userLetters = problem.letters.slice();
    problem.hiddenIdx.forEach((wordPos, i) => { userLetters[wordPos] = filled[i]; });
    const userWord = userLetters.join("");
    const isCorrect = userWord === problem.word;
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

    const wait = isCorrect ? 950 : 1200;
    setTimeout(() => {
      setFeedback(null);
      setFeedbackMsg("");
      setFilled([]);
      if (newAttempted >= 3) {
        setApp((s) => ({
          ...s, stars: newStarsTotal,
          lastResult: { category: catLabel, solved: newSolved, total: 3, time: elapsed, starsEarned: newStarsSession, log: newLog },
        }));
        window.incrementGamesCompleted && window.incrementGamesCompleted();
        go("results");
      } else {
        const p = makeRProblem(usedRef.current);
        usedRef.current.add(p.word);
        pushRecent("letraR", p.word);
        setProblem(p);
        exerciseStart.current = Date.now();
      }
    }, wait);
  }

  const wordLen = problem.letters.length;
  const SLOT_W = wordLen <= 4 ? 64 : wordLen <= 6 ? 56 : wordLen <= 8 ? 46 : 40;
  const SLOT_H = wordLen <= 4 ? 72 : wordLen <= 6 ? 66 : 58;
  const SLOT_GAP = wordLen <= 6 ? 8 : 6;
  const slotOfHidden = (wordPos) => problem.hiddenIdx.indexOf(wordPos);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <GameHUD elapsed={elapsed} stars={stars} attempted={attempted} solved={solved} total={3} app={app} setApp={setApp} />

      {/* Enunciado */}
      <div style={{
        position: "absolute", top: 100, left: 250, right: 250,
        textAlign: "center",
        fontFamily: "var(--ed-font-display)", fontWeight: 700,
        fontSize: 20, lineHeight: 1.15,
        color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,0.55)",
        pointerEvents: "none",
      }}>
        Completa la palabra con la letra R.
      </div>

      {/* Personaje + bocadillo (igual que en completa-palabras) */}
      <div data-qa="personaje" style={{
        position: "absolute", left: 8, bottom: 90, width: 220,
        pointerEvents: "none", textAlign: "center",
      }}>
        <div data-qa="bocadillo" style={{
          position: "absolute", left: 6, top: -80, width: 208,
          pointerEvents: "none",
        }}>
          <div style={{
            position: "relative",
            background: "linear-gradient(180deg, rgba(20,12,55,0.95), rgba(10,6,35,0.95))",
            border: "1.5px solid rgba(242,194,96,0.65)",
            borderRadius: 16, padding: "10px 14px",
            fontFamily: "var(--ed-font-display)",
            fontWeight: 700, fontSize: 14, lineHeight: 1.25,
            color: "#fce9a8", textAlign: "center",
            boxShadow: "0 10px 24px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}>
            Selecciona la letra correcta.
            <div style={{
              position: "absolute", bottom: -10, left: 70,
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

      {/* Zona central: cartel emoji + casillas */}
      <div data-qa="zona-central" style={{
        position: "absolute", top: 146, left: "50%", transform: "translateX(-50%)",
        width: 460, textAlign: "center",
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 26,
      }}>
        <div style={{
          width: 160, height: 150,
          borderRadius: 22,
          background: "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(240,235,225,0.9))",
          border: "3px solid #f2c260",
          boxShadow: "0 12px 28px rgba(0,0,0,0.45), 0 0 0 1px rgba(242,194,96,0.35), inset 0 -4px 0 rgba(0,0,0,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 108, lineHeight: 1,
        }}>
          {problem.emoji}
        </div>

        <div style={{
          display: "flex", justifyContent: "center", alignItems: "center",
          gap: SLOT_GAP, padding: "4px 6px",
        }}>
          {problem.letters.map((ch, wordPos) => {
            const hiddenSlot = slotOfHidden(wordPos);
            const isHidden = hiddenSlot >= 0;
            if (!isHidden) {
              return (
                <div key={wordPos} style={{
                  width: SLOT_W, height: SLOT_H,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--ed-font-display)", fontWeight: 700,
                  fontSize: SLOT_H * 0.55,
                  color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,0.5)",
                  borderBottom: "3px solid rgba(255,255,255,0.35)",
                }}>{ch}</div>
              );
            }
            const f = filled[hiddenSlot];
            const isFilled = f !== undefined;
            let activeIdx = -1;
            for (let k = 0; k < problem.hiddenIdx.length; k++) {
              if (filled[k] === undefined) { activeIdx = k; break; }
            }
            const isActive = hiddenSlot === activeIdx;
            return (
              <button key={wordPos} onClick={() => { if (isFilled) eraseSlot(hiddenSlot); }}
                style={{
                  width: SLOT_W, height: SLOT_H, borderRadius: 12,
                  border: `2.5px solid ${feedback === "ok" ? "#2ecc8f" : feedback === "err" ? "#ff6b6b" : isActive ? "#fce9a8" : "rgba(242,194,96,0.55)"}`,
                  background: isFilled ? "linear-gradient(180deg, rgba(252,233,168,0.95), rgba(217,164,65,0.85))" : "rgba(10,6,35,0.55)",
                  color: isFilled ? "#3a2608" : "rgba(252,233,168,0.5)",
                  fontFamily: "var(--ed-font-display)", fontWeight: 800,
                  fontSize: SLOT_H * 0.55,
                  cursor: isFilled ? "pointer" : "default",
                  boxShadow: isActive ? "0 0 14px rgba(252,233,168,0.5)" : isFilled ? "0 4px 10px rgba(0,0,0,0.35)" : "inset 0 1px 0 rgba(255,255,255,0.08)",
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

      {/* Bandeja: r l m n s */}
      <div data-qa="bandeja" style={{
        position: "absolute", bottom: 60, left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: 12, justifyContent: "center",
      }}>
        {R_TRAY.map((letter, i) => {
          const color = ["#ef5a5a","#f5a623","#f5d84b","#4fa0ff","#2ecc8f"][i];
          return (
            <button key={i} className="ed-numpad-key" onClick={() => pressLetter(letter)}
              style={{
                width: 64, height: 68, fontSize: 30,
                borderColor: color, borderWidth: 2, borderStyle: "solid",
                cursor: "pointer",
              }}
              title="Toca para colocar (reutilizable)"
            >{letter}</button>
          );
        })}
      </div>

      {/* Acciones */}
      <div data-qa="acciones" style={{
        position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)",
        display: "flex", flexDirection: "column", gap: 12, width: 150,
      }}>
        <button className="ed-btn ed-btn-verify" onClick={verify}
          style={{ fontSize: 15, padding: "0 10px", height: 56, fontWeight: 800, letterSpacing: "0.04em" }}>¡VERIFICAR!</button>
        <button className="ed-btn ed-btn-erase" onClick={erase}
          style={{ fontSize: 15, padding: "0 10px", height: 56, fontWeight: 800, letterSpacing: "0.04em" }}>BORRAR</button>
        <button className="ed-btn ed-btn-restart" onClick={() => setConfirmingExit(true)}
          style={{ fontSize: 15, padding: "0 10px", height: 56, fontWeight: 800, letterSpacing: "0.04em" }}>REINICIAR</button>
      </div>

      <FeedbackOverlay feedback={feedback} feedbackMsg={feedbackMsg} charName={char.name} />
      <RestartModal confirmingExit={confirmingExit} setConfirmingExit={setConfirmingExit} attempted={attempted} total={3} onRestart={onRestart} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// NIVEL 2 — La noticia (3 rondas con mecánicas distintas).
// Se elige UNA noticia al iniciar el nivel. Rondas 0-1 usan esa
// noticia. Ronda 2 es teórica (definición → concepto).
// ─────────────────────────────────────────────────────────────
function pickNoticia(usedKeys) {
  const recent = new Set(getRecent("noticia"));
  const exclude = new Set([...usedKeys, ...recent]);
  let pool = NOTICIAS.filter((n) => !exclude.has(n.id));
  if (pool.length === 0) pool = NOTICIAS.filter((n) => !usedKeys.has(n.id));
  if (pool.length === 0) pool = NOTICIAS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function NoticiaGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "La noticia";

  const usedRef = useRefG(new Set());
  const [noticia] = useStateG(() => {
    const n = pickNoticia(usedRef.current);
    usedRef.current.add(n.id);
    pushRecent("noticia", n.id);
    return n;
  });

  // Ronda 0: parte resaltada. Ronda 1: elige resumen. Ronda 2: definición.
  const [ronda, setRonda] = useStateG(0);

  // Estado de la ronda 0
  const partes = ["TITULAR", "ENTRADA", "CUERPO", "CIERRE"];
  const [r0Highlight] = useStateG(() => partes[Math.floor(Math.random() * partes.length)]);

  // Estado de la ronda 2 (concepto): elegir un concepto y armar chips
  const [r2Pick] = useStateG(() => NOTICIA_CONCEPTOS[Math.floor(Math.random() * NOTICIA_CONCEPTOS.length)]);
  const [r2Chips] = useStateG(() => {
    const distractores = NOTICIA_CONCEPTOS.filter((c) => c.concepto !== r2Pick.concepto);
    const picked = shuffle(distractores).slice(0, 3);
    return shuffle([r2Pick, ...picked]);
  });

  const [elapsed, setElapsed] = useStateG(0);
  const [stars, setStars] = useStateG(0);
  const [solved, setSolved] = useStateG(0);
  const [attempted, setAttempted] = useStateG(0);
  const [starsSession, setStarsSession] = useStateG(0);
  const [feedback, setFeedback] = useStateG(null);
  const [feedbackMsg, setFeedbackMsg] = useStateG("");
  const [confirmingExit, setConfirmingExit] = useStateG(false);
  const [log, setLog] = useStateG([]);
  const started = useRefG(Date.now());
  const exerciseStart = useRefG(Date.now());

  useEffectG(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started.current) / 1000)), 500);
    return () => clearInterval(id);
  }, []);

  // Glifos del fondo (chalkboard) para nivel 2
  useEffectG(() => {
    window.__currentChalkGlyphs = [
      { c: "📰", l: "6%",  t: "12%", r: "-8deg" },
      { c: "📝", l: "82%", t: "16%", r: "6deg",  s: "0.62em" },
      { c: "🗞", l: "10%", t: "78%", r: "12deg", s: "0.7em" },
      { c: "✏",  l: "88%", t: "72%", r: "-10deg", s: "0.55em" },
      { c: "📌", l: "45%", t: "8%",  r: "4deg",  s: "0.5em" },
      { c: "¿",  l: "3%",  t: "45%", r: "-4deg", s: "0.6em" },
      { c: "?",  l: "92%", t: "45%", r: "8deg",  s: "0.58em" },
      { c: "¡",  l: "30%", t: "55%", r: "-6deg", s: "0.55em" },
      { c: "T",  l: "70%", t: "62%", r: "8deg",  s: "0.52em" },
      { c: "E",  l: "55%", t: "30%", r: "-4deg", s: "0.46em" },
    ];
    return () => { window.__currentChalkGlyphs = null; };
  }, []);

  // Resúmenes para ronda 1 (1 correcto + 2 distractores, mezclados al montaje)
  const [r1Options] = useStateG(() => {
    const correct = { text: noticia.resumen_correcto, isCorrect: true };
    const distractores = noticia.resumen_distractores.map((d) => ({ text: d, isCorrect: false }));
    return shuffle([correct, ...distractores]);
  });

  function answer(isCorrect, userText, correctText) {
    if (typeof window.markFirstAttempt === "function") window.markFirstAttempt();
    const exerciseSec = Math.max(0, Math.floor((Date.now() - exerciseStart.current) / 1000));
    const earned = calcStars(isCorrect, exerciseSec);
    const newAttempted = attempted + 1;
    const newSolved = solved + (isCorrect ? 1 : 0);
    const newStarsTotal = stars + earned;
    const newStarsSession = starsSession + earned;

    const entry = {
      idx: newAttempted,
      a: correctText, b: userText, op: ronda === 0 ? "📰" : ronda === 1 ? "📝" : "💡",
      correctAnswer: correctText, userAnswer: userText,
      isCorrect, time: exerciseSec, earned,
      emoji: noticia.emoji,
    };
    const newLog = [...log, entry];

    setFeedback(isCorrect ? "ok" : "err");
    setFeedbackMsg(isCorrect ? `+${earned} ⭐` : ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]);
    setAttempted(newAttempted);
    setSolved(newSolved);
    setStars(newStarsTotal);
    setStarsSession(newStarsSession);
    setLog(newLog);

    const wait = isCorrect ? 950 : 1200;
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

      {/* Enunciado dinámico según ronda */}
      <div style={{
        position: "absolute", top: 100, left: 240, right: 18,
        textAlign: "center",
        fontFamily: "var(--ed-font-display)", fontWeight: 700,
        fontSize: 19, lineHeight: 1.15,
        color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,0.55)",
        pointerEvents: "none",
      }}>
        {ronda === 0 && "Identifica la parte de la noticia."}
        {ronda === 1 && "Elige la frase que resume mejor la noticia."}
        {ronda === 2 && "¿A qué se refiere esta explicación?"}
      </div>

      {/* Personaje grande con bocadillo dinámico (igual tamaño que nivel 1) */}
      <div data-qa="personaje" style={{
        position: "absolute", left: 8, bottom: 90, width: 220,
        pointerEvents: "none", textAlign: "center",
      }}>
        <div data-qa="bocadillo" style={{
          position: "absolute", left: 6, top: -80, width: 208,
          pointerEvents: "none",
        }}>
          <div style={{
            position: "relative",
            background: "linear-gradient(180deg, rgba(20,12,55,0.95), rgba(10,6,35,0.95))",
            border: "1.5px solid rgba(242,194,96,0.65)",
            borderRadius: 16, padding: "10px 14px",
            fontFamily: "var(--ed-font-display)",
            fontWeight: 700, fontSize: 14, lineHeight: 1.25,
            color: "#fce9a8", textAlign: "center",
            boxShadow: "0 10px 24px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}>
            {ronda === 0 && "¿Qué parte de la noticia está marcada?"}
            {ronda === 1 && "Selecciona el resumen correcto."}
            {ronda === 2 && "Selecciona el concepto correcto."}
            <div style={{
              position: "absolute", bottom: -10, left: 70,
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

      {/* Zona central — varía por ronda */}
      <div data-qa="zona-central" style={{
        position: "absolute", top: 132, left: 240, right: 18, bottom: 18,
      }}>
        {ronda === 0 && (
          <NoticiaCard noticia={noticia} highlight={r0Highlight}
            chips={partes}
            onAnswer={(picked) => answer(picked === r0Highlight, picked, r0Highlight)} />
        )}
        {ronda === 1 && (
          <NoticiaResumenCard noticia={noticia} options={r1Options}
            onAnswer={(opt) => answer(opt.isCorrect, opt.text, noticia.resumen_correcto)} />
        )}
        {ronda === 2 && (
          <ConceptoCard def={r2Pick.def} chips={r2Chips.map((c) => c.concepto)} correct={r2Pick.concepto}
            onAnswer={(picked) => answer(picked === r2Pick.concepto, picked, r2Pick.concepto)} />
        )}
      </div>

      {/* Botón reiniciar, debajo del personaje en la columna izquierda */}
      <button className="ed-btn ed-btn-restart" onClick={() => setConfirmingExit(true)}
        style={{
          position: "absolute", left: 60, bottom: 24, width: 116,
          fontSize: 12, padding: "6px 12px", height: 36, fontWeight: 800, letterSpacing: "0.04em",
        }}>REINICIAR</button>

      <FeedbackOverlay feedback={feedback} feedbackMsg={feedbackMsg} charName={char.name} />
      <RestartModal confirmingExit={confirmingExit} setConfirmingExit={setConfirmingExit} attempted={attempted} total={3} onRestart={onRestart} />
    </div>
  );
}

// Tarjeta de noticia con una parte resaltada + chips de respuesta.
function NoticiaCard({ noticia, highlight, chips, onAnswer }) {
  const highlightBg = "linear-gradient(180deg, rgba(252,233,168,0.45), rgba(252,233,168,0.25))";
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 12 }}>
      <div style={{
        flex: 1, minHeight: 0,
        background: "rgba(255,255,255,0.95)", color: "#1a1a1a",
        borderRadius: 14, padding: "18px 24px",
        border: "2px solid #f2c260",
        boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
        fontFamily: "var(--ed-font-ui)",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
            <div style={{ fontSize: 52 }}>{noticia.emoji}</div>
            <div style={{
              background: highlight === "TITULAR" ? highlightBg : "transparent",
              borderRadius: 6, padding: highlight === "TITULAR" ? "8px 12px" : 0,
              border: highlight === "TITULAR" ? "1.5px dashed #d9a441" : "none",
              fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 22, lineHeight: 1.2,
              color: "#1a1a1a", flex: 1,
            }}>{noticia.titular}</div>
          </div>
          <div style={{ fontSize: 12, color: "#888", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>
            {noticia.fecha}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-around", flex: 1 }}>
          {[
            { kind: "ENTRADA", text: noticia.entrada },
            { kind: "CUERPO",  text: noticia.cuerpo },
            { kind: "CIERRE",  text: noticia.cierre },
          ].map((p) => (
            <p key={p.kind} style={{
              fontSize: 14, lineHeight: 1.5, margin: 0,
              background: highlight === p.kind ? highlightBg : "transparent",
              borderRadius: 6, padding: highlight === p.kind ? "8px 12px" : 0,
              border: highlight === p.kind ? "1.5px dashed #d9a441" : "none",
              color: "#1a1a1a",
            }}>{p.text}</p>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
        {chips.map((c) => (
          <button key={c} onClick={() => onAnswer(c)}
            style={{
              padding: "14px 8px", borderRadius: 12,
              background: "linear-gradient(180deg, #ffe97a, #d7b12a)",
              color: "#3a2608",
              fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 13,
              border: "none",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -3px 0 rgba(0,0,0,0.18), 0 4px 10px -2px rgba(0,0,0,0.45)",
              cursor: "pointer", letterSpacing: "0.02em",
            }}>{c}</button>
        ))}
      </div>
    </div>
  );
}

// Tarjeta de noticia con 3 frases de resumen.
function NoticiaResumenCard({ noticia, options, onAnswer }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 10 }}>
      <div style={{
        background: "rgba(255,255,255,0.95)", color: "#1a1a1a",
        borderRadius: 14, padding: "12px 16px",
        border: "2px solid #f2c260",
        boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
        fontFamily: "var(--ed-font-ui)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ fontSize: 32 }}>{noticia.emoji}</div>
          <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 16 }}>{noticia.titular}</div>
        </div>
        <p style={{ fontSize: 12, lineHeight: 1.4, margin: "3px 0" }}>{noticia.entrada}</p>
        <p style={{ fontSize: 12, lineHeight: 1.4, margin: "3px 0" }}>{noticia.cuerpo}</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minHeight: 0 }}>
        {options.map((opt, i) => (
          <button key={i} onClick={() => onAnswer(opt)}
            style={{
              padding: "12px 16px", borderRadius: 14,
              background: "rgba(255,233,122,0.92)",
              color: "#1a1a1a",
              fontFamily: "var(--ed-font-ui)", fontWeight: 600, fontSize: 14,
              border: "2px solid rgba(242,194,96,0.7)",
              textAlign: "left",
              boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
              cursor: "pointer",
              lineHeight: 1.35,
              flex: 1, minHeight: 0,
            }}>{opt.text}</button>
        ))}
      </div>
    </div>
  );
}

// Tarjeta de concepto: definición + 4 chips
function ConceptoCard({ def, chips, correct, onAnswer }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-evenly", gap: 0 }}>
      <div style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(240,235,225,0.9))",
        color: "#1a1a1a",
        borderRadius: 16, padding: "28px 32px",
        border: "3px solid #f2c260",
        boxShadow: "0 12px 28px rgba(0,0,0,0.45)",
        fontFamily: "var(--ed-font-display)", fontWeight: 600,
        fontSize: 20, lineHeight: 1.4,
        textAlign: "center",
      }}>
        "{def}"
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {chips.map((c, i) => (
          <button key={i} onClick={() => onAnswer(c)}
            style={{
              padding: "22px 12px", borderRadius: 14,
              background: "linear-gradient(180deg, #ffe97a, #d7b12a)",
              color: "#3a2608",
              fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 16,
              border: "none",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -3px 0 rgba(0,0,0,0.18), 0 4px 12px -2px rgba(0,0,0,0.45)",
              cursor: "pointer", letterSpacing: "0.02em",
            }}>{c}</button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// NIVEL 3 — El blog (3 rondas: elemento → shooter → concepto)
// ─────────────────────────────────────────────────────────────
function pickBlogMockup(usedKeys) {
  const recent = new Set(getRecent("blog"));
  const exclude = new Set([...usedKeys, ...recent]);
  let pool = BLOG_MOCKUPS.filter((m) => !exclude.has(m.id));
  if (pool.length === 0) pool = BLOG_MOCKUPS.filter((m) => !usedKeys.has(m.id));
  if (pool.length === 0) pool = BLOG_MOCKUPS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function BlogGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "El blog";

  const usedRef = useRefG(new Set());
  const [mockup] = useStateG(() => {
    const m = pickBlogMockup(usedRef.current);
    usedRef.current.add(m.id);
    pushRecent("blog", m.id);
    return m;
  });
  const [r0Highlight] = useStateG(() => mockup.sections[Math.floor(Math.random() * mockup.sections.length)].kind);
  const [r0Chips] = useStateG(() => {
    const distractores = BLOG_ELEMENTOS.filter((e) => e !== r0Highlight);
    return shuffle([r0Highlight, ...shuffle(distractores).slice(0, 3)]);
  });

  const [r2Pick] = useStateG(() => BLOG_CONCEPTOS[Math.floor(Math.random() * BLOG_CONCEPTOS.length)]);
  const [r2Chips] = useStateG(() => {
    const distractores = BLOG_CONCEPTOS.filter((c) => c.concepto !== r2Pick.concepto);
    return shuffle([r2Pick, ...shuffle(distractores).slice(0, 3)]);
  });

  const [ronda, setRonda] = useStateG(0);
  const [elapsed, setElapsed] = useStateG(0);
  const [stars, setStars] = useStateG(0);
  const [solved, setSolved] = useStateG(0);
  const [attempted, setAttempted] = useStateG(0);
  const [starsSession, setStarsSession] = useStateG(0);
  const [feedback, setFeedback] = useStateG(null);
  const [feedbackMsg, setFeedbackMsg] = useStateG("");
  const [confirmingExit, setConfirmingExit] = useStateG(false);
  const [log, setLog] = useStateG([]);
  const started = useRefG(Date.now());
  const exerciseStart = useRefG(Date.now());

  useEffectG(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started.current) / 1000)), 500);
    return () => clearInterval(id);
  }, []);

  useEffectG(() => {
    window.__currentChalkGlyphs = [
      { c: "💻", l: "6%",  t: "12%", r: "-8deg" },
      { c: "🌐", l: "82%", t: "16%", r: "6deg",  s: "0.62em" },
      { c: "📱", l: "10%", t: "78%", r: "12deg", s: "0.7em" },
      { c: "✏",  l: "88%", t: "72%", r: "-10deg", s: "0.55em" },
      { c: "📌", l: "45%", t: "8%",  r: "4deg",  s: "0.5em" },
      { c: "#",  l: "3%",  t: "45%", r: "-4deg", s: "0.6em" },
      { c: "@",  l: "92%", t: "45%", r: "8deg",  s: "0.58em" },
      { c: "¿",  l: "30%", t: "55%", r: "-6deg", s: "0.55em" },
      { c: "?",  l: "70%", t: "62%", r: "8deg",  s: "0.55em" },
      { c: "💬", l: "55%", t: "30%", r: "-4deg", s: "0.46em" },
    ];
    return () => { window.__currentChalkGlyphs = null; };
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

    const wait = isCorrect ? 950 : 1200;
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

      <div style={{
        position: "absolute", top: 100, left: 240, right: 18,
        textAlign: "center",
        fontFamily: "var(--ed-font-display)", fontWeight: 700,
        fontSize: 19, lineHeight: 1.15,
        color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,0.55)",
        pointerEvents: "none",
      }}>
        {ronda === 0 && "Identifica el elemento del blog."}
        {ronda === 1 && "Atrapa solo los elementos del blog."}
        {ronda === 2 && "¿A qué se refiere esta explicación?"}
      </div>

      {/* Personaje grande con bocadillo dinámico (igual tamaño que nivel 1) */}
      <div data-qa="personaje" style={{
        position: "absolute", left: 8, bottom: 90, width: 220,
        pointerEvents: "none", textAlign: "center",
      }}>
        <div data-qa="bocadillo" style={{
          position: "absolute", left: 6, top: -80, width: 208,
          pointerEvents: "none",
        }}>
          <div style={{
            position: "relative",
            background: "linear-gradient(180deg, rgba(20,12,55,0.95), rgba(10,6,35,0.95))",
            border: "1.5px solid rgba(242,194,96,0.65)",
            borderRadius: 16, padding: "10px 14px",
            fontFamily: "var(--ed-font-display)",
            fontWeight: 700, fontSize: 14, lineHeight: 1.25,
            color: "#fce9a8", textAlign: "center",
            boxShadow: "0 10px 24px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}>
            {ronda === 0 && "Selecciona el elemento correcto."}
            {ronda === 1 && "Toca solo los elementos del blog."}
            {ronda === 2 && "Selecciona el concepto correcto."}
            <div style={{
              position: "absolute", bottom: -10, left: 70,
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

      <div data-qa="zona-central" style={{
        position: "absolute", top: 132, left: 240, right: 18, bottom: 18,
      }}>
        {ronda === 0 && (
          <BlogMockupCard mockup={mockup} highlight={r0Highlight} chips={r0Chips}
            onAnswer={(picked) => recordRound(picked === r0Highlight, picked, r0Highlight, "🎯", "💻")} />
        )}
        {ronda === 1 && (
          <BlogShooterCard onFinish={(stats) => {
            // Score 0-10 según aciertos vs errores+perdidas
            const score = Math.max(0, stats.aciertos - stats.errores - stats.perdidas);
            const isCorrect = score >= 4;
            recordRound(isCorrect, `${stats.aciertos} aciertos`, "Atrapar elementos del blog", "🎯", "💥");
          }} />
        )}
        {ronda === 2 && (
          <ConceptoCard def={r2Pick.def}
            chips={r2Chips.map((c) => c.concepto)}
            correct={r2Pick.concepto}
            onAnswer={(picked) => recordRound(picked === r2Pick.concepto, picked, r2Pick.concepto, "💡", "💻")} />
        )}
      </div>

      <button className="ed-btn ed-btn-restart" onClick={() => setConfirmingExit(true)}
        style={{
          position: "absolute", left: 60, bottom: 24, width: 116,
          fontSize: 12, padding: "6px 12px", height: 36, fontWeight: 800, letterSpacing: "0.04em",
        }}>REINICIAR</button>

      <FeedbackOverlay feedback={feedback} feedbackMsg={feedbackMsg} charName={char.name} />
      <RestartModal confirmingExit={confirmingExit} setConfirmingExit={setConfirmingExit} attempted={attempted} total={3} onRestart={onRestart} />
    </div>
  );
}

// Mockup visual del blog para ronda 0
function BlogMockupCard({ mockup, highlight, chips, onAnswer }) {
  const highlightBg = "linear-gradient(180deg, rgba(123,184,255,0.45), rgba(123,184,255,0.25))";
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 12 }}>
      <div style={{
        flex: 1, minHeight: 0,
        background: "rgba(255,255,255,0.95)", color: "#1a1a1a",
        borderRadius: 14, padding: "14px 18px",
        border: "2px solid #4fa0ff",
        boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
        fontFamily: "var(--ed-font-ui)",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #ddd", paddingBottom: 8, marginBottom: 10 }}>
          <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 18 }}>{mockup.titulo}</div>
          <div style={{ fontSize: 11, color: "#888" }}>por {mockup.autor}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-around", flex: 1, gap: 6 }}>
          {mockup.sections.map((s) => (
            <div key={s.kind} style={{
              padding: "10px 12px",
              background: highlight === s.kind ? highlightBg : "transparent",
              borderRadius: 8,
              border: highlight === s.kind ? "1.5px dashed #2773d8" : "1px solid #eee",
              fontSize: 12, lineHeight: 1.4,
              whiteSpace: "pre-wrap",
              color: "#1a1a1a",
            }}>{s.content}</div>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
        {chips.map((c) => (
          <button key={c} onClick={() => onAnswer(c)}
            style={{
              padding: "14px 4px", borderRadius: 12,
              background: "linear-gradient(180deg, #7ab8ff, #2773d8)",
              color: "#fff",
              fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 12,
              border: "none",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -3px 0 rgba(0,0,0,0.25), 0 4px 10px -2px rgba(0,0,0,0.45)",
              cursor: "pointer", letterSpacing: "0.02em",
            }}>{c}</button>
        ))}
      </div>
    </div>
  );
}

// Shooter: burbujas que caen, el niño toca elementos del blog (correctas)
// y evita los distractores. 20 segundos.
function BlogShooterCard({ onFinish }) {
  const [bubbles, setBubbles] = useStateG([]);
  const [stats, setStats] = useStateG({ aciertos: 0, errores: 0, perdidas: 0 });
  const [timeLeft, setTimeLeft] = useStateG(20);
  const nextIdRef = useRefG(0);
  const finishedRef = useRefG(false);
  const containerRef = useRefG(null);

  // Estima el ancho del bubble a partir del texto: fontSize 15, uppercase
  // bold ~9.3 px/char + padding 18*2 + borde 2*2 + colchón.
  function estimateBubbleWidth(word) {
    return Math.ceil(word.length * 9.3) + 44;
  }

  useEffectG(() => {
    // Spawner cada ~900ms. La posición x se calcula al spawnear para
    // garantizar que el bubble completo entra en el ancho real del
    // contenedor — nada de palabras cortadas por el recuadro.
    const spawn = setInterval(() => {
      if (finishedRef.current) return;
      const useCorrect = Math.random() < 0.5;
      const pool = useCorrect ? BLOG_ELEMENTOS : BLOG_DISTRACTORES;
      const word = pool[Math.floor(Math.random() * pool.length)];
      const id = nextIdRef.current++;
      const containerW = (containerRef.current && containerRef.current.clientWidth) || 642;
      const margin = 12;
      const estW = estimateBubbleWidth(word);
      const maxX = Math.max(margin, containerW - estW - margin);
      const x = margin + Math.random() * (maxX - margin);
      setBubbles((bs) => [...bs, { id, word, isCorrect: useCorrect, x, y: -60, vy: 0.55 + Math.random() * 0.3 }]);
    }, 950);

    // Tick para mover burbujas (40ms ≈ 25fps, suficiente para una caída suave)
    const tick = setInterval(() => {
      if (finishedRef.current) return;
      setBubbles((bs) => {
        const next = [];
        let perdidasDelta = 0;
        for (const b of bs) {
          const newY = b.y + b.vy * 2.4;
          if (newY > 360) {
            if (b.isCorrect) perdidasDelta++;
          } else {
            next.push({ ...b, y: newY });
          }
        }
        if (perdidasDelta > 0) {
          setStats((s) => ({ ...s, perdidas: s.perdidas + perdidasDelta }));
        }
        return next;
      });
    }, 40);

    // Countdown
    const countdown = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(countdown);
          clearInterval(spawn);
          clearInterval(tick);
          finishedRef.current = true;
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      clearInterval(spawn);
      clearInterval(tick);
      clearInterval(countdown);
    };
  }, []);

  // Cuando termina el tiempo, llamar onFinish con stats finales
  useEffectG(() => {
    if (timeLeft === 0 && finishedRef.current) {
      // Esperar un momento para que el último estado de stats se asiente
      const t = setTimeout(() => onFinish(stats), 300);
      return () => clearTimeout(t);
    }
  }, [timeLeft, stats]);

  function handleTap(b) {
    setBubbles((bs) => bs.filter((x) => x.id !== b.id));
    if (b.isCorrect) setStats((s) => ({ ...s, aciertos: s.aciertos + 1 }));
    else setStats((s) => ({ ...s, errores: s.errores + 1 }));
  }

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", borderRadius: 14, background: "rgba(11,58,45,0.4)", border: "2px solid rgba(79,160,255,0.4)" }}>
      {/* HUD del shooter */}
      <div style={{
        position: "absolute", top: 8, left: 12, right: 12,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontFamily: "var(--ed-font-display)", color: "#fce9a8", fontSize: 13, fontWeight: 700,
        zIndex: 10,
      }}>
        <div>✅ {stats.aciertos} &nbsp; ❌ {stats.errores} &nbsp; ⌛ {stats.perdidas}</div>
        <div>⏱ {timeLeft}s</div>
      </div>

      {bubbles.map((b) => (
        <button key={b.id} onClick={() => handleTap(b)}
          style={{
            position: "absolute", left: b.x, top: b.y,
            padding: "12px 18px", borderRadius: 999,
            background: "rgba(255,255,255,0.95)",
            border: "2px solid #4fa0ff",
            fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 15,
            color: "#1a1a1a", cursor: "pointer",
            boxShadow: "0 4px 10px rgba(0,0,0,0.45)",
            whiteSpace: "nowrap",
          }}>
          {b.word}
        </button>
      ))}

      {timeLeft === 0 && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.55)", color: "#fce9a8",
          fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 22,
        }}>¡Tiempo!</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// RESULTS — reporte académico (compartido entre los 3 niveles)
// ─────────────────────────────────────────────────────────────
function formatOp(e) {
  return `${e.emoji || ""} ${e.a}`;
}

// Estilos inline para el reporte imprimible (no usan CSS vars del shell —
// se renderizan tal cual en el print).
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

// Documento imprimible. En pantalla está oculto (display:none vía CSS);
// en print se muestra y el resto del shell se oculta. Si no se renderiza
// este elemento, el print sale en blanco.
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

Object.assign(window, { GameScreen, ResultsScreen, LetraRGame, NoticiaGame, BlogGame });
