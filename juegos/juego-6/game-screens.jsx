// game-screens.jsx — Juego 6. Dos niveles de lenguaje con mecánicas distintas:
//   1. Texto poético       (8 años)  — ruleta poética / detective tildes / memoria género
//   2. Texto instructivo   (8 años)  — kichwa árbol / ordena receta / laboratorio plural
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

// Cada banco tiene su propia key de "recientes" para que las picks de
// una ronda no contaminen las de otras. Anti-repetición persistente.
const RECENT_KEYS = {
  "poetico-cofres":    "edinun_juego6_p_cofres_v1",
  "poetico-poemas":    "edinun_juego6_p_poemas_v1",
  "poetico-parejas":   "edinun_juego6_p_parejas_v1",
  "instructivo-kichwa":"edinun_juego6_i_kichwa_v1",
  "instructivo-receta":"edinun_juego6_i_receta_v1",
  "instructivo-plural":"edinun_juego6_i_plural_v1",
};
const RECENT_LIMIT = 12;

function getRecent(bank) {
  try {
    const raw = localStorage.getItem(RECENT_KEYS[bank]);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function pushRecent(bank, key) {
  const arr = getRecent(bank).filter((k) => k !== key);
  arr.unshift(key);
  const trimmed = arr.slice(0, RECENT_LIMIT);
  try { localStorage.setItem(RECENT_KEYS[bank], JSON.stringify(trimmed)); } catch {}
}

// Pick anti-repetición: si el pool queda vacío, al menos excluimos el
// último ítem mostrado para no repetir dos veces seguidas.
function pickFresh(bank, all, idField = "id") {
  const recent = getRecent(bank);
  const recentSet = new Set(recent);
  let pool = all.filter((x) => !recentSet.has(x[idField]));
  if (pool.length === 0) {
    const lastId = recent[0];
    pool = all.filter((x) => x[idField] !== lastId);
    if (pool.length === 0) pool = all;
  }
  const p = pool[Math.floor(Math.random() * pool.length)];
  pushRecent(bank, p[idField]);
  return p;
}

// ─────────────────────────────────────────────────────────────
// BANCOS — TEMA 1 (Texto poético)
// ─────────────────────────────────────────────────────────────

// R1 — Ruleta: clasificar oración como comparación / metáfora / ninguna
const VERSOS_BANK = [
  { id: "globo",     texto: "Su cara era redonda como un globo.",                        tipo: "comparacion" },
  { id: "papa",      texto: "Aquella pelota estaba arrugada como una papa vieja.",       tipo: "comparacion" },
  { id: "sol",       texto: "Ese niño tiene zapatos deslumbrantes como el sol.",          tipo: "comparacion" },
  { id: "manzanas",  texto: "Tus mejillas brillan como manzanas maduras.",               tipo: "comparacion" },
  { id: "lava",      texto: "Sus cabellos son lava y sus dientes, diamantes.",            tipo: "metafora" },
  { id: "seda",      texto: "La chica de piel de seda tiene muchas amigas.",              tipo: "metafora" },
  { id: "luceros",   texto: "Tus ojos son dos luceros que iluminan la noche.",            tipo: "metafora" },
  { id: "rio",       texto: "Tiene risa de río al cantar una canción.",                   tipo: "metafora" },
  { id: "martes",    texto: "Hoy es martes y vamos al colegio temprano.",                 tipo: "ninguna" },
  { id: "arroz",     texto: "Mi mamá hizo arroz para el almuerzo.",                       tipo: "ninguna" },
  { id: "gato",      texto: "El gato duerme sobre el sofá de la sala.",                   tipo: "ninguna" },
  { id: "manos",     texto: "Lavé las manos antes de comer la merienda.",                 tipo: "ninguna" },
];

// R2 — Detective de tildes: poema con 3 palabras sin tilde
const POEMAS_BANK = [
  {
    id: "arbol",
    titulo: "Canción del jardín",
    // tokens: array de strings. Las palabras "sospechosas" están marcadas con el id de la palabra.
    // Cada token: { palabra: "x", err: true/false, correcta: "X (con tilde)" si err }
    tokens: [
      { p: "El" }, { p: "arbol",  err: true, ok: "árbol"  }, { p: "del" }, { p: "jardín" }, { p: "se" }, { p: "mueve," },
      { br: true },
      { p: "sus" }, { p: "hojas" }, { p: "brillan" }, { p: "al" }, { p: "sol." },
      { br: true },
      { p: "La" }, { p: "musica", err: true, ok: "música" }, { p: "del" }, { p: "viento" }, { p: "sopla" },
      { br: true },
      { p: "y" }, { p: "el" }, { p: "pajaro", err: true, ok: "pájaro" }, { p: "canta" }, { p: "su" }, { p: "voz." },
    ],
  },
  {
    id: "mama",
    titulo: "Camino al colegio",
    tokens: [
      { p: "Mi" }, { p: "mama", err: true, ok: "mamá" }, { p: "me" }, { p: "peina" }, { p: "el" }, { p: "cabello," },
      { br: true },
      { p: "mi" }, { p: "papa", err: true, ok: "papá" }, { p: "prepara" }, { p: "el" }, { p: "café." },
      { br: true },
      { p: "Subo" }, { p: "el" }, { p: "camino" }, { p: "muy" }, { p: "rapido,", err: true, ok: "rápido," },
      { br: true },
      { p: "hasta" }, { p: "la" }, { p: "cima," }, { p: "feliz." },
    ],
  },
  {
    id: "pajaros",
    titulo: "Noche en calma",
    tokens: [
      { p: "En" }, { p: "la" }, { p: "rama" }, { p: "el" }, { p: "pajaro", err: true, ok: "pájaro" }, { p: "canta," },
      { br: true },
      { p: "el" }, { p: "arbol", err: true, ok: "árbol" }, { p: "lo" }, { p: "abraza" }, { p: "con" }, { p: "paz." },
      { br: true },
      { p: "La" }, { p: "lampara", err: true, ok: "lámpara" }, { p: "ilumina" }, { p: "la" }, { p: "sala," },
      { br: true },
      { p: "y" }, { p: "la" }, { p: "noche" }, { p: "se" }, { p: "queda" }, { p: "en" }, { p: "calma." },
    ],
  },
];

// R3 — Memoria de parejas: pool de pares masc/fem. Cada partida toma 3 al azar.
const PAREJAS_POOL = [
  { id: "padre",     m: "padre",     f: "madre" },
  { id: "amigo",     m: "amigo",     f: "amiga" },
  { id: "gallo",     m: "gallo",     f: "gallina" },
  { id: "caballo",   m: "caballo",   f: "yegua" },
  { id: "jefe",      m: "jefe",      f: "jefa" },
  { id: "bailarin",  m: "bailarín",  f: "bailarina" },
  { id: "rey",       m: "rey",       f: "reina" },
  { id: "actor",     m: "actor",     f: "actriz" },
  { id: "heroe",     m: "héroe",     f: "heroína" },
  { id: "nino",      m: "niño",      f: "niña" },
  { id: "profesor",  m: "profesor",  f: "profesora" },
  { id: "leon",      m: "león",      f: "leona" },
  { id: "abuelo",    m: "abuelo",    f: "abuela" },
  { id: "hermano",   m: "hermano",   f: "hermana" },
  { id: "tio",       m: "tío",       f: "tía" },
  { id: "principe",  m: "príncipe",  f: "princesa" },
  { id: "gato",      m: "gato",      f: "gata" },
];

// ─────────────────────────────────────────────────────────────
// BANCOS — TEMA 2 (Texto instructivo)
// ─────────────────────────────────────────────────────────────

// R1 — Empareja kichwa con español (árbol familiar/ayllu)
// Nota: en kichwa los términos para hermano/hermana cambian según el sexo
// del hablante (turi, wawki, pani, ñaña). Para 8 años evitamos esa
// ambigüedad y usamos solo términos unívocos.
const KICHWA_SETS = [
  {
    id: "padres", titulo: "Mi familia",
    miembros: [
      { es: "MADRE",  kichwa: "mama",       emoji: "👩" },
      { es: "PADRE",  kichwa: "yaya",       emoji: "👨" },
      { es: "HIJO",   kichwa: "churi",      emoji: "🧒" },
      { es: "HIJA",   kichwa: "ushushi",    emoji: "👧" },
      { es: "ABUELA", kichwa: "hatunmama",  emoji: "👵" },
      { es: "ABUELO", kichwa: "hatunyaya",  emoji: "👴" },
    ],
  },
  {
    id: "tios", titulo: "Tíos y abuelos",
    miembros: [
      { es: "MADRE",  kichwa: "mama",       emoji: "👩" },
      { es: "PADRE",  kichwa: "yaya",       emoji: "👨" },
      { es: "TÍA",    kichwa: "tiya mama",  emoji: "💃" },
      { es: "TÍO",    kichwa: "tiyu yaya",  emoji: "🕺" },
      { es: "ABUELA", kichwa: "hatunmama",  emoji: "👵" },
      { es: "ABUELO", kichwa: "hatunyaya",  emoji: "👴" },
    ],
  },
  {
    id: "completa", titulo: "Familia grande",
    miembros: [
      { es: "ABUELA", kichwa: "hatunmama",  emoji: "👵" },
      { es: "ABUELO", kichwa: "hatunyaya",  emoji: "👴" },
      { es: "TÍA",    kichwa: "tiya mama",  emoji: "💃" },
      { es: "TÍO",    kichwa: "tiyu yaya",  emoji: "🕺" },
      { es: "HIJA",   kichwa: "ushushi",    emoji: "👧" },
      { es: "HIJO",   kichwa: "churi",      emoji: "🧒" },
    ],
  },
];

// R2 — Ordena la receta (5 pasos)
const RECETAS_BANK = [
  {
    id: "batido",
    titulo: "Batido de fresa y plátano",
    pasos: [
      { n: 1, emoji: "🍓", texto: "Lavar bien las fresas y trocearlas." },
      { n: 2, emoji: "🍌", texto: "Pelar y cortar los plátanos." },
      { n: 3, emoji: "🥛", texto: "Verter la leche y el azúcar en la licuadora." },
      { n: 4, emoji: "🌀", texto: "Agregar la fruta y triturar todo junto." },
      { n: 5, emoji: "🥤", texto: "Servir en vasos altos para disfrutar." },
    ],
  },
  {
    id: "manos",
    titulo: "Cómo lavarse las manos",
    pasos: [
      { n: 1, emoji: "💧", texto: "Mojar las manos con agua tibia." },
      { n: 2, emoji: "🧼", texto: "Aplicar jabón sobre las manos." },
      { n: 3, emoji: "🤲", texto: "Frotar bien por 20 segundos." },
      { n: 4, emoji: "🚿", texto: "Enjuagar con agua limpia." },
      { n: 5, emoji: "🧻", texto: "Secar con una toalla limpia." },
    ],
  },
  {
    id: "avion",
    titulo: "Hacer un avión de papel",
    pasos: [
      { n: 1, emoji: "📄", texto: "Toma una hoja rectangular." },
      { n: 2, emoji: "📐", texto: "Doblar la hoja por la mitad a lo largo." },
      { n: 3, emoji: "📃", texto: "Doblar las puntas hacia el centro." },
      { n: 4, emoji: "🛩", texto: "Plegar las alas hacia los lados." },
      { n: 5, emoji: "🚀", texto: "Lanzar suavemente al aire." },
    ],
  },
];

// R3 — Laboratorio del plural
const PLURAL_BANK = [
  // Termina en vocal → -s
  { id: "estrella",  singular: "estrella",  sufijo: "-s",  plural: "estrellas",   regla: "termina en vocal" },
  { id: "regla",     singular: "regla",     sufijo: "-s",  plural: "reglas",      regla: "termina en vocal" },
  { id: "telefono",  singular: "teléfono",  sufijo: "-s",  plural: "teléfonos",   regla: "termina en vocal" },
  { id: "libro",     singular: "libro",     sufijo: "-s",  plural: "libros",      regla: "termina en vocal" },
  { id: "mesa",      singular: "mesa",      sufijo: "-s",  plural: "mesas",       regla: "termina en vocal" },
  { id: "mariposa",  singular: "mariposa",  sufijo: "-s",  plural: "mariposas",   regla: "termina en vocal" },
  // Termina en consonante → -es
  { id: "flor",      singular: "flor",      sufijo: "-es", plural: "flores",      regla: "termina en consonante" },
  { id: "reloj",     singular: "reloj",     sufijo: "-es", plural: "relojes",     regla: "termina en consonante" },
  { id: "color",     singular: "color",     sufijo: "-es", plural: "colores",     regla: "termina en consonante" },
  { id: "mes",       singular: "mes",       sufijo: "-es", plural: "meses",       regla: "termina en consonante" },
  { id: "balcon",    singular: "balcón",    sufijo: "-es", plural: "balcones",    regla: "termina en consonante" },
  { id: "camion",    singular: "camión",    sufijo: "-es", plural: "camiones",    regla: "termina en consonante" },
];

// ─────────────────────────────────────────────────────────────
// GameScreen — delega al sub-componente según el nivel elegido
// ─────────────────────────────────────────────────────────────
function GameScreen({ app, setApp, go }) {
  const cat = app.currentCategory || "poetico";
  const [restartTick, setRestartTick] = useStateG(0);
  const restart = () => setRestartTick((t) => t + 1);
  if (cat === "instructivo") return <TextoInstructivoGame key={`ins-${restartTick}`} app={app} setApp={setApp} go={go} onRestart={restart} />;
  return <TextoPoeticoGame key={`poe-${restartTick}`} app={app} setApp={setApp} go={go} onRestart={restart} />;
}

// ─────────────────────────────────────────────────────────────
// Shell común: HUD, modales, action rail, feedback, personaje
// ─────────────────────────────────────────────────────────────
function GameEnunciado({ text }) {
  if (!text) return null;
  return (
    <div style={{
      position: "absolute", top: 92, left: 244, width: 488,
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

function GameHUD({ elapsed, stars, attempted, solved, total = 3, app, setApp }) {
  const levels = (typeof LEVELS_CFG !== "undefined" && LEVELS_CFG) || (window.LEVELS_CFG || []);
  const currentId = app && app.currentCategory ? app.currentCategory : "poetico";
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
          <EdinunLogoMini size={56} />
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

      <div data-qa="hud-temas" style={{
        position: "absolute", top: 22, left: "50%", transform: "translateX(-50%)",
        display: "flex", alignItems: "center", gap: 5,
      }}>
        {levels.map((lv) => {
          const active = lv.id === currentId;
          return (
            <button
              key={lv.id}
              onClick={() => requestSwitch(lv.id)}
              title={active ? "Tema actual" : `Cambiar a "${lv.label}"`}
              style={{
                padding: "4px 12px",
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
          style={{ padding: 24, maxWidth: 460, textAlign: "center", boxShadow: "var(--ed-shadow-card), 0 0 40px rgba(148,120,255,0.3)" }}>
          <div className="ed-label" style={{ color: "#a78bfa", marginBottom: 6 }}>Cambiar de tema</div>
          <h2 className="ed-h1" style={{ fontSize: 22, lineHeight: 1.15, marginBottom: 8 }}>
            ¿Ir a "{cfg.label}"?
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

function ActionRail({ canVerify, onVerify, showErase, onErase, onRestart, onExit }) {
  return (
    <div data-qa="acciones" style={{
      position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
      display: "flex", flexDirection: "column", gap: 10, width: 148,
    }}>
      <button className="ed-btn ed-btn-verify"
        onClick={() => { if (canVerify && onVerify) onVerify(); }}
        disabled={!canVerify}
        style={{
          fontSize: 13, padding: "0 8px", height: 48, fontWeight: 800, letterSpacing: "0.04em",
          opacity: canVerify ? 1 : 0.45, cursor: canVerify ? "pointer" : "not-allowed",
        }}>
        ¡VERIFICAR!
      </button>
      {showErase && (
        <button className="ed-btn ed-btn-erase" onClick={onErase}
          style={{ fontSize: 13, padding: "0 8px", height: 48, fontWeight: 800, letterSpacing: "0.04em" }}>
          BORRAR
        </button>
      )}
      <button className="ed-btn ed-btn-restart" onClick={onRestart}
        style={{ fontSize: 13, padding: "0 8px", height: 48, fontWeight: 800, letterSpacing: "0.04em" }}>
        REINICIAR
      </button>
      <button className="ed-btn ed-btn-ghost" onClick={onExit}
        style={{ fontSize: 13, padding: "0 8px", height: 48, fontWeight: 800, letterSpacing: "0.04em" }}>
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
    <div data-qa="personaje" style={{
      position: "absolute", left: 8, bottom: 76, width: 220,
      pointerEvents: "none", textAlign: "center",
    }}>
      <div data-qa="bocadillo" style={{
        position: "absolute", left: 0, right: 0, top: -82,
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
          fontWeight: 700, fontSize: 13, lineHeight: 1.25,
          color: "#fce9a8", textAlign: "center",
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
          width: 130, height: 14, borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(242,194,96,0.45), transparent 70%)",
          filter: "blur(5px)",
        }} />
        <char.Component size={170} floating />
      </div>
      <div style={{
        marginTop: -4,
        fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 13,
        color: "#fce9a8", letterSpacing: "0.04em",
        textShadow: "0 2px 6px rgba(0,0,0,0.6)",
      }}>{char.name}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TEMA 1 · TextoPoeticoGame — 3 rondas:
//   R1: Ruleta poética (comparación / metáfora / ninguna)
//   R2: Detective de tildes (cazar 3 errores en poema)
//   R3: Memoria de parejas (género masc/fem)
// ─────────────────────────────────────────────────────────────
function TextoPoeticoGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "Texto poético";

  const [ronda, setRonda] = useStateG(0);

  // R1 state
  const [r1Selected, setR1Selected] = useStateG(null);
  const [r1Locked, setR1Locked] = useStateG(false);

  // R2 state
  const [r2Picked, setR2Picked] = useStateG(new Set()); // indices de tokens marcados
  const [r2Locked, setR2Locked] = useStateG(false);

  // R3 state
  const [r3Flipped, setR3Flipped] = useStateG(new Set()); // indices boca arriba
  const [r3Matched, setR3Matched] = useStateG(new Set()); // indices ya emparejados
  const [r3Pending, setR3Pending] = useStateG([]); // indices en intento actual (max 2)
  const [r3Locked, setR3Locked] = useStateG(false);

  // Picks de cada ronda — cada banco tiene su propio recent
  const [r1Pick] = useStateG(() => pickFresh("poetico-cofres", VERSOS_BANK));
  const [r2Pick] = useStateG(() => pickFresh("poetico-poemas", POEMAS_BANK));

  // Pick 3 parejas al azar del pool grande, sin repetir las recientes
  const [r3Set] = useStateG(() => {
    const recent = getRecent("poetico-parejas");
    const recentSet = new Set(recent);
    let pool = PAREJAS_POOL.filter((p) => !recentSet.has(p.id));
    if (pool.length < 3) {
      // si quedan menos de 3 frescas, mezclar con las menos recientes
      const stale = PAREJAS_POOL.filter((p) => recentSet.has(p.id))
        .sort((a, b) => recent.indexOf(a.id) - recent.indexOf(b.id))
        .reverse();
      pool = [...pool, ...stale].slice(0, Math.max(3, pool.length + 1));
    }
    const picked = shuffle(pool).slice(0, 3);
    picked.forEach((p) => pushRecent("poetico-parejas", p.id));
    return {
      id: picked.map((p) => p.id).join("-"),
      titulo: "Empareja",
      parejas: picked,
    };
  });

  const [r3Cards] = useStateG(() => {
    const cards = [];
    r3Set.parejas.forEach((par, i) => {
      cards.push({ id: `m${i}`, text: par.m, pairId: i, kind: "m" });
      cards.push({ id: `f${i}`, text: par.f, pairId: i, kind: "f" });
    });
    return shuffle(cards);
  });

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

  useEffectG(() => {
    window.__qa_skip = () => { setRonda((r) => r + 1); exerciseStart.current = Date.now(); };
    return () => { delete window.__qa_skip; };
  }, []);

  useEffectG(() => {
    window.__currentChalkGlyphs = [
      { c: "✏",  l: "6%",  t: "12%", r: "-8deg" },
      { c: "📜", l: "82%", t: "16%", r: "6deg",  s: "0.62em" },
      { c: "á",  l: "10%", t: "78%", r: "12deg", s: "0.7em" },
      { c: "é",  l: "88%", t: "72%", r: "-10deg", s: "0.55em" },
      { c: "📖", l: "45%", t: "8%",  r: "4deg",  s: "0.55em" },
      { c: "?",  l: "3%",  t: "45%", r: "-4deg", s: "0.6em" },
      { c: "✨", l: "92%", t: "45%", r: "8deg",  s: "0.5em" },
      { c: "¡",  l: "30%", t: "55%", r: "-6deg", s: "0.55em" },
      { c: "🌹", l: "70%", t: "62%", r: "8deg",  s: "0.5em" },
      { c: "🃏", l: "55%", t: "30%", r: "-4deg", s: "0.5em" },
    ];
    return () => { window.__currentChalkGlyphs = null; };
  }, []);

  const canVerify =
    ronda === 0 ? (r1Selected !== null && !r1Locked) :
    ronda === 1 ? (r2Picked.size > 0 && !r2Locked) :
    ronda === 2 ? (r3Matched.size === r3Cards.length && !r3Locked) :
    false;
  const showErase = ronda !== 0;

  function handleVerify() {
    if (!canVerify) return;
    if (ronda === 0) {
      setR1Locked(true);
      answer(r1Selected === r1Pick.tipo, r1Selected, r1Pick.tipo, "🎰");
    } else if (ronda === 1) {
      setR2Locked(true);
      const errSet = new Set(r2Pick.tokens.map((t, i) => t.err ? i : null).filter((x) => x !== null));
      const allCorrect = r2Picked.size === errSet.size && [...r2Picked].every((i) => errSet.has(i));
      const userTokens = [...r2Picked].sort((a,b)=>a-b).map((i) => r2Pick.tokens[i].p).join(" ");
      const correctTokens = [...errSet].sort((a,b)=>a-b).map((i) => r2Pick.tokens[i].ok).join(" ");
      setTimeout(() => answer(allCorrect, userTokens, correctTokens, "🔍"), 350);
    } else if (ronda === 2) {
      setR3Locked(true);
      answer(true, "todas las parejas", "3 parejas", "🃏");
    }
  }

  function handleErase() {
    if (ronda === 1) {
      if (r2Locked) return;
      setR2Picked(new Set());
    } else if (ronda === 2) {
      if (r3Locked) return;
      setR3Flipped(new Set());
      setR3Matched(new Set());
      setR3Pending([]);
    }
  }

  function answer(isCorrect, userText, correctText, opIcon) {
    if (typeof window.markFirstAttempt === "function") window.markFirstAttempt();
    const exerciseSec = Math.max(0, Math.floor((Date.now() - exerciseStart.current) / 1000));
    const earned = calcStars(isCorrect, exerciseSec);
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

    setAttempted(newAttempted);
    setSolved(newSolved);
    setStars(newStarsTotal);
    setStarsSession(newStarsSession);
    setLog(newLog);

    // Al fallar, primero dejamos ver el estado (cofres abiertos, marcas) antes
    // de mostrar el overlay "¡UPS!". Al acertar mostramos overlay enseguida.
    const okMsg = `+${earned} ⭐`;
    const errMsg = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
    const revealDelay = isCorrect ? 0 : 1200;
    const overlayTime = isCorrect ? 950 : 1300;
    const totalTime   = revealDelay + overlayTime;

    setTimeout(() => {
      setFeedback(isCorrect ? "ok" : "err");
      setFeedbackMsg(isCorrect ? okMsg : errMsg);
    }, revealDelay);

    setTimeout(() => {
      setFeedback(null);
      setFeedbackMsg("");
    }, revealDelay + overlayTime);

    setTimeout(() => {
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
    }, totalTime);
  }

  // R3 logic: voltear carta
  function r3Flip(idx) {
    if (r3Locked) return;
    if (r3Matched.has(idx)) return;
    if (r3Flipped.has(idx)) return;
    if (r3Pending.length >= 2) return;
    const newFlipped = new Set(r3Flipped);
    newFlipped.add(idx);
    const newPending = [...r3Pending, idx];
    setR3Flipped(newFlipped);
    setR3Pending(newPending);
    if (newPending.length === 2) {
      const [a, b] = newPending;
      const cardA = r3Cards[a];
      const cardB = r3Cards[b];
      if (cardA.pairId === cardB.pairId) {
        // match
        setTimeout(() => {
          const m = new Set(r3Matched);
          m.add(a); m.add(b);
          setR3Matched(m);
          setR3Pending([]);
        }, 500);
      } else {
        // no match — flip back
        setTimeout(() => {
          const f = new Set(r3Flipped);
          f.delete(a); f.delete(b);
          setR3Flipped(f);
          setR3Pending([]);
        }, 900);
      }
    }
  }

  const enunciado =
    ronda === 0 ? "¿La oración es comparación, metáfora o ninguna?" :
    ronda === 1 ? `Encuentra las palabras sin tilde — "${r2Pick.titulo}"` :
    "Encuentra las 3 parejas: masculino con femenino";

  const bocadillo =
    ronda === 0 ? "Elige el cofre correcto y ábrelo." :
    ronda === 1 ? "Toca las 3 palabras con tilde olvidada." :
    "Voltea cartas para emparejar.";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <GameHUD elapsed={elapsed} stars={stars} attempted={attempted} solved={solved} total={3} app={app} setApp={setApp} />
      <CharacterCorner char={char} message={bocadillo} />
      <GameEnunciado text={enunciado} />

      <div data-qa="zona-central" style={{
        position: "absolute", top: 124, left: 244, width: 488, bottom: 14,
      }}>
        {ronda === 0 && (
          <CofresMagicosCard pick={r1Pick}
            selected={r1Selected} locked={r1Locked}
            onSelect={(t) => { if (r1Locked) return; setR1Selected(r1Selected === t ? null : t); }}
          />
        )}
        {ronda === 1 && (
          <DetectiveTildesCard poema={r2Pick}
            picked={r2Picked} locked={r2Locked}
            onToggle={(i) => { if (r2Locked) return; const next = new Set(r2Picked); if (next.has(i)) next.delete(i); else next.add(i); setR2Picked(next); }}
          />
        )}
        {ronda === 2 && (
          <MemoriaGeneroCard cards={r3Cards}
            flipped={r3Flipped} matched={r3Matched} locked={r3Locked}
            onFlip={r3Flip}
          />
        )}
      </div>

      <ActionRail
        canVerify={canVerify}
        onVerify={handleVerify}
        showErase={showErase}
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
// R1 · Cofres mágicos — 3 cofres con tapa, candado y label
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
function CofresMagicosCard({ pick, selected, locked, onSelect }) {
  const COFRES = [
    { id: "comparacion", label: "COMPARACIÓN", emoji: "🌹", trim: "#ff8ab4", glow: "rgba(255,138,180,0.65)" },
    { id: "metafora",    label: "METÁFORA",    emoji: "✨", trim: "#c39cff", glow: "rgba(195,156,255,0.65)" },
    { id: "ninguna",     label: "NINGUNA",     emoji: "📖", trim: "#7ab8ff", glow: "rgba(122,184,255,0.65)" },
  ];

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-evenly" }}>
      {/* Cartel con la oración */}
      <div style={{
        width: "100%", maxWidth: 480,
        background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(245,238,225,0.95))",
        border: "3px solid #f2c260",
        borderRadius: 20,
        padding: "16px 24px",
        boxShadow: "0 10px 22px rgba(0,0,0,0.5)",
        color: "#3a2608",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 17, lineHeight: 1.4, fontStyle: "italic", fontWeight: 600 }}>"{pick.texto}"</div>
      </div>

      {/* 3 cofres en fila */}
      <div style={{ display: "flex", gap: 18, justifyContent: "center", width: "100%" }}>
        {COFRES.map((c) => {
          const isSelected = selected === c.id;
          const isCorrect = locked && isSelected && pick.tipo === c.id;
          const isWrong   = locked && isSelected && pick.tipo !== c.id;
          const showAnswer = locked && pick.tipo === c.id && !isSelected;
          const isOpen = isCorrect || showAnswer;
          return (
            <button key={c.id}
              onClick={() => onSelect(c.id)}
              disabled={locked}
              style={{
                position: "relative",
                width: 130, height: 156,
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: locked ? "default" : "pointer",
                outline: "none",
                transform: isSelected && !locked
                  ? "translateY(-6px) scale(1.04)"
                  : isWrong ? "translateY(2px)" : "none",
                transition: "transform 0.2s ease",
                opacity: locked && !isSelected && !showAnswer ? 0.5 : 1,
              }}>
              {/* Tapa del cofre */}
              <div style={{
                position: "absolute", left: 8, top: 24, width: 114, height: 32,
                background: isCorrect
                  ? "linear-gradient(180deg, #ffe27a, #d9a441)"
                  : isWrong
                  ? "linear-gradient(180deg, #ff9a9a, #c33b3b)"
                  : "linear-gradient(180deg, #d9a441, #8b5510)",
                borderRadius: "60% 60% 10% 10% / 90% 90% 10% 10%",
                border: `3px solid ${c.trim}`,
                borderBottom: "none",
                transformOrigin: "50% 100%",
                transform: isOpen ? "translateY(-16px) rotate(-22deg)" : "rotate(0deg)",
                transition: "transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)",
                boxShadow: isSelected ? `0 0 18px ${c.glow}` : "0 4px 8px rgba(0,0,0,0.45)",
              }}>
                {/* Lazo/cinta central de la tapa */}
                <div style={{
                  position: "absolute", left: "50%", top: 6, transform: "translateX(-50%)",
                  width: 20, height: 18,
                  background: c.trim,
                  borderRadius: "50%",
                  border: "2px solid #fce9a8",
                }} />
              </div>

              {/* Cuerpo del cofre */}
              <div style={{
                position: "absolute", left: 8, top: 56, width: 114, height: 84,
                background: isCorrect
                  ? "linear-gradient(180deg, #fce9a8, #d9a441)"
                  : isWrong
                  ? "linear-gradient(180deg, #ffb0b0, #c33b3b)"
                  : "linear-gradient(180deg, #c79030, #8b5510)",
                borderRadius: "8px 8px 12px 12px",
                border: `3px solid ${c.trim}`,
                boxShadow: isSelected
                  ? `0 0 22px ${c.glow}, 0 6px 14px rgba(0,0,0,0.5)`
                  : "0 6px 14px rgba(0,0,0,0.5)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 4,
                color: "#fce9a8",
              }}>
                {/* Cerradura o gema (cambia al abrir) */}
                <div style={{
                  fontSize: 28,
                  filter: isOpen ? "drop-shadow(0 0 8px rgba(252,233,168,0.9))" : "none",
                }}>
                  {isOpen ? c.emoji : (isWrong ? "✕" : "🔒")}
                </div>
              </div>

              {/* Etiqueta (label tipo chip dorado debajo) */}
              <div style={{
                position: "absolute", left: 0, right: 0, bottom: 0,
                background: isCorrect
                  ? "linear-gradient(180deg, #2ecc8f, #15a06a)"
                  : isWrong
                  ? "linear-gradient(180deg, #ff6b6b, #c33b3b)"
                  : `linear-gradient(180deg, ${c.trim}, ${c.trim})`,
                color: "#fff",
                border: `2px solid ${isSelected ? "#fce9a8" : "rgba(255,255,255,0.7)"}`,
                borderRadius: 10,
                padding: "5px 6px",
                fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 11.5, letterSpacing: "0.04em",
                textAlign: "center",
                textShadow: "0 1px 2px rgba(0,0,0,0.3)",
              }}>
                {c.label}
              </div>

              {/* Chispas cuando se abre correcto */}
              {isCorrect && (
                <>
                  <div style={{ position: "absolute", left: 20, top: 6, fontSize: 18, animation: "ed-pop-in 0.4s" }}>✨</div>
                  <div style={{ position: "absolute", right: 18, top: 12, fontSize: 16, animation: "ed-pop-in 0.5s" }}>⭐</div>
                  <div style={{ position: "absolute", left: 56, top: -4, fontSize: 22, animation: "ed-pop-in 0.6s" }}>✨</div>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// R2 · Detective de tildes — poema con palabras tocables; las erróneas tienen err:true
// ─────────────────────────────────────────────────────────────
function DetectiveTildesCard({ poema, picked, locked, onToggle }) {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{
        width: "100%", maxWidth: 480,
        background: "linear-gradient(180deg, rgba(255,253,245,0.97), rgba(245,238,225,0.92))",
        border: "3px solid #f2c260",
        borderRadius: 20,
        padding: "20px 24px",
        boxShadow: "0 12px 26px rgba(0,0,0,0.55)",
        color: "#3a2608",
      }}>
        <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 16, marginBottom: 12, textAlign: "center", color: "#7a4a0e", letterSpacing: "0.02em" }}>
          🔍 {poema.titulo}
        </div>
        <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 17, lineHeight: 1.7, textAlign: "center" }}>
          {poema.tokens.map((tk, i) => {
            if (tk.br) return <br key={`b${i}`} />;
            const isPicked = picked.has(i);
            const isErr = !!tk.err;
            const wasErrAndMissed = locked && isErr && !isPicked;
            const wasCorrectPick = locked && isPicked && isErr;
            const wasWrongPick = locked && isPicked && !isErr;
            let bg = "transparent";
            let color = "#3a2608";
            let border = "2px solid transparent";
            if (isPicked && !locked) { bg = "rgba(255,231,90,0.85)"; border = "2px solid #d9a441"; }
            if (wasCorrectPick) { bg = "rgba(46,204,143,0.55)"; border = "2px solid #2ecc8f"; }
            if (wasWrongPick) { bg = "rgba(255,107,107,0.45)"; border = "2px solid #ff6b6b"; color = "#5c0e0e"; }
            if (wasErrAndMissed) { bg = "rgba(255,231,90,0.95)"; border = "2px dashed #d9a441"; }
            return (
              <span key={i}
                onClick={() => onToggle(i)}
                style={{
                  display: "inline-block",
                  padding: "2px 7px", margin: "2px 1px",
                  borderRadius: 8, background: bg, border,
                  cursor: locked ? "default" : "pointer",
                  color, fontWeight: 600,
                  transition: "background 0.15s, border-color 0.15s",
                  userSelect: "none",
                }}>
                {locked && wasCorrectPick ? tk.ok : tk.p}
              </span>
            );
          })}
        </div>
      </div>

      {/* Contador */}
      <div style={{
        background: "rgba(10,6,35,0.65)",
        border: "1px solid rgba(242,194,96,0.55)",
        borderRadius: 999,
        padding: "8px 22px",
        fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 15, color: "#fce9a8",
        letterSpacing: "0.02em",
      }}>
        🔍 Marcadas: {picked.size}/3
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// R3 · Memoria de parejas — 6 cartas boca abajo
// ─────────────────────────────────────────────────────────────
function MemoriaGeneroCard({ cards, flipped, matched, locked, onFlip }) {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{
        background: "rgba(10,6,35,0.45)",
        border: "1px dashed rgba(252,233,168,0.3)",
        borderRadius: 16,
        padding: 18,
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {cards.map((card, i) => {
            const isFlipped = flipped.has(i) || matched.has(i);
            const isMatched = matched.has(i);
            return (
              <div key={i}
                onClick={() => onFlip(i)}
                style={{
                  width: 136, height: 92,
                  perspective: 600,
                  cursor: locked || isMatched ? "default" : "pointer",
                }}>
                <div style={{
                  position: "relative", width: "100%", height: "100%",
                  transformStyle: "preserve-3d",
                  transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  transition: "transform 0.45s",
                }}>
                  {/* Cara back (boca abajo) */}
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(135deg, #2a3a8a, #1a2a6a)",
                    border: "2.5px solid #fce9a8",
                    borderRadius: 14,
                    backfaceVisibility: "hidden",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fce9a8", fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 32,
                    boxShadow: "0 6px 14px rgba(0,0,0,0.5)",
                  }}>
                    ?
                  </div>
                  {/* Cara front (boca arriba) */}
                  <div style={{
                    position: "absolute", inset: 0,
                    background: isMatched
                      ? "linear-gradient(180deg, #fce9a8, #d9a441)"
                      : "linear-gradient(180deg, #fff, #f5eee1)",
                    border: `3px solid ${isMatched ? "#2ecc8f" : "#f2c260"}`,
                    borderRadius: 14,
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#3a2608", fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 16,
                    boxShadow: isMatched ? "0 0 22px rgba(252,233,168,0.9), 0 0 0 3px rgba(46,204,143,0.4)" : "0 6px 14px rgba(0,0,0,0.4)",
                    textAlign: "center", padding: "4px 8px",
                  }}>
                    {card.text}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{
        background: "rgba(10,6,35,0.65)",
        border: "1px solid rgba(242,194,96,0.55)",
        borderRadius: 999,
        padding: "8px 22px",
        fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 15, color: "#fce9a8",
        letterSpacing: "0.02em",
      }}>
        🃏 Parejas: {matched.size / 2}/3
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TEMA 2 · TextoInstructivoGame — 3 rondas:
//   R1: Kichwa árbol familiar (drag etiquetas a miembros)
//   R2: Ordena receta (tap-tap intercambio)
//   R3: Laboratorio plural (drag sufijo a slot)
// ─────────────────────────────────────────────────────────────
function TextoInstructivoGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "Texto instructivo";

  const [ronda, setRonda] = useStateG(0);

  // R1 state: { miembroEs: kichwaText } (placed) + picked label
  const [r1Placed, setR1Placed] = useStateG({});
  const [r1Picked, setR1Picked] = useStateG(null);
  const [r1Locked, setR1Locked] = useStateG(false);

  // R2 state: orden actual de los pasos
  const [r2Selected, setR2Selected] = useStateG(null);
  const [r2Locked, setR2Locked] = useStateG(false);
  const [r2Order, setR2Order] = useStateG([]);

  // R3 state: { picked: sufijo elegido, locked }
  const [r3Selected, setR3Selected] = useStateG(null);
  const [r3Locked, setR3Locked] = useStateG(false);

  // Picks — cada banco con su propio recent
  const [r1Set]    = useStateG(() => pickFresh("instructivo-kichwa", KICHWA_SETS));
  const [r2Receta] = useStateG(() => pickFresh("instructivo-receta", RECETAS_BANK));

  // Inicializar r2Order con pasos mezclados (no en orden correcto, garantizar al menos 1 swap)
  useEffectG(() => {
    if (r2Order.length === 0) {
      let shuffled = shuffle(r2Receta.pasos);
      // Si quedó en orden por azar, intercambiar 2 elementos para asegurar mezcla
      const isOrdered = shuffled.every((p, i) => p.n === i + 1);
      if (isOrdered) {
        const t = shuffled[0]; shuffled[0] = shuffled[1]; shuffled[1] = t;
      }
      setR2Order(shuffled);
    }
  }, [r2Receta]);

  const [r3Pick] = useStateG(() => pickFresh("instructivo-plural", PLURAL_BANK));

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

  useEffectG(() => {
    window.__qa_skip = () => { setRonda((r) => r + 1); exerciseStart.current = Date.now(); };
    return () => { delete window.__qa_skip; };
  }, []);

  useEffectG(() => {
    window.__currentChalkGlyphs = [
      { c: "🍓", l: "6%",  t: "12%", r: "-8deg" },
      { c: "🌳", l: "82%", t: "16%", r: "6deg",  s: "0.62em" },
      { c: "🧪", l: "10%", t: "78%", r: "12deg", s: "0.6em" },
      { c: "📜", l: "88%", t: "72%", r: "-10deg", s: "0.55em" },
      { c: "🥛", l: "45%", t: "8%",  r: "4deg",  s: "0.5em" },
      { c: "?",  l: "3%",  t: "45%", r: "-4deg", s: "0.6em" },
      { c: "📖", l: "92%", t: "45%", r: "8deg",  s: "0.55em" },
      { c: "✏",  l: "30%", t: "55%", r: "-6deg", s: "0.55em" },
      { c: "→",  l: "70%", t: "62%", r: "8deg",  s: "0.6em" },
      { c: "¡",  l: "55%", t: "30%", r: "-4deg", s: "0.55em" },
    ];
    return () => { window.__currentChalkGlyphs = null; };
  }, []);

  const r1AllPlaced = Object.keys(r1Placed).length === r1Set.miembros.length;
  const r2IsOrdered = r2Order.length > 0 && r2Order.every((p, i) => p.n === i + 1);

  const canVerify =
    ronda === 0 ? (r1AllPlaced && !r1Locked) :
    ronda === 1 ? (r2Order.length > 0 && !r2Locked) :
    ronda === 2 ? (r3Selected !== null && !r3Locked) :
    false;
  const showErase = ronda === 0 || ronda === 1;

  function handleVerify() {
    if (!canVerify) return;
    if (ronda === 0) {
      setR1Locked(true);
      // Validar: cada miembro debe tener su kichwa correcto
      let correct = true;
      const wrong = [];
      for (const m of r1Set.miembros) {
        if (r1Placed[m.es] !== m.kichwa) { correct = false; wrong.push(m.es); }
      }
      const userText = r1Set.miembros.map((m) => `${m.es}=${r1Placed[m.es] || "?"}`).join(", ");
      const correctText = r1Set.miembros.map((m) => `${m.es}=${m.kichwa}`).join(", ");
      setTimeout(() => answer(correct, userText, correctText, "🌳"), 350);
    } else if (ronda === 1) {
      setR2Locked(true);
      const userText = r2Order.map((p) => p.n).join("→");
      const correctText = r2Receta.pasos.map((p) => p.n).join("→");
      setTimeout(() => answer(r2IsOrdered, userText, correctText, "🍓"), 350);
    } else if (ronda === 2) {
      setR3Locked(true);
      const isOK = r3Selected === r3Pick.sufijo;
      const userFormed = isOK ? r3Pick.plural : `${r3Pick.singular}${r3Selected.replace("-", "")}`;
      const userText = `${r3Pick.singular} + ${r3Selected} = ${userFormed}`;
      const correctText = `${r3Pick.singular} + ${r3Pick.sufijo} = ${r3Pick.plural}`;
      setTimeout(() => answer(isOK, userText, correctText, "🧪"), 350);
    }
  }

  function handleErase() {
    if (ronda === 0) {
      if (r1Locked) return;
      setR1Placed({});
      setR1Picked(null);
    } else if (ronda === 1) {
      if (r2Locked) return;
      setR2Order(shuffle(r2Receta.pasos));
      setR2Selected(null);
    }
  }

  function answer(isCorrect, userText, correctText, opIcon) {
    if (typeof window.markFirstAttempt === "function") window.markFirstAttempt();
    const exerciseSec = Math.max(0, Math.floor((Date.now() - exerciseStart.current) / 1000));
    const earned = calcStars(isCorrect, exerciseSec);
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

    setAttempted(newAttempted);
    setSolved(newSolved);
    setStars(newStarsTotal);
    setStarsSession(newStarsSession);
    setLog(newLog);

    // Al fallar, primero dejamos ver el estado del tablero (respuestas correctas,
    // marcas) antes de mostrar el overlay "¡UPS!". Al acertar va enseguida.
    const okMsg = `+${earned} ⭐`;
    const errMsg = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
    const revealDelay = isCorrect ? 0 : 1200;
    const overlayTime = isCorrect ? 950 : 1300;
    const totalTime   = revealDelay + overlayTime;

    setTimeout(() => {
      setFeedback(isCorrect ? "ok" : "err");
      setFeedbackMsg(isCorrect ? okMsg : errMsg);
    }, revealDelay);

    setTimeout(() => {
      setFeedback(null);
      setFeedbackMsg("");
    }, revealDelay + overlayTime);

    setTimeout(() => {
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
    }, totalTime);
  }

  // R2 — tap intercambio: si hay uno seleccionado, intercambia con el toque
  function r2Tap(idx) {
    if (r2Locked) return;
    if (r2Selected === null) {
      setR2Selected(idx);
    } else if (r2Selected === idx) {
      setR2Selected(null);
    } else {
      const newOrder = [...r2Order];
      const t = newOrder[r2Selected];
      newOrder[r2Selected] = newOrder[idx];
      newOrder[idx] = t;
      setR2Order(newOrder);
      setR2Selected(null);
    }
  }

  const enunciado =
    ronda === 0 ? `Empareja cada palabra kichwa con su miembro — ${r1Set.titulo}` :
    ronda === 1 ? `Ordena los pasos: "${r2Receta.titulo}"` :
    `Forma el plural: ${r3Pick.singular} + ___`;

  const bocadillo =
    ronda === 0 ? "Arrastra cada palabra al miembro correcto." :
    ronda === 1 ? "Arrastra las tarjetas para ordenarlas." :
    "Elige -s o -es para hacer el plural.";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <GameHUD elapsed={elapsed} stars={stars} attempted={attempted} solved={solved} total={3} app={app} setApp={setApp} />
      <CharacterCorner char={char} message={bocadillo} />
      <GameEnunciado text={enunciado} />

      <div data-qa="zona-central" style={{
        position: "absolute", top: 124, left: 244, width: 488, bottom: 14,
      }}>
        {ronda === 0 && (
          <KichwaArbolCard set={r1Set} placed={r1Placed} picked={r1Picked} locked={r1Locked}
            onPickLabel={(k) => { if (r1Locked) return; setR1Picked(r1Picked === k ? null : k); }}
            onPlaceIn={(memberEs, explicitKichwa) => {
              if (r1Locked) return;
              // Prioridad: si vino del drop con un kichwa explícito, úsalo
              const labelToPlace = explicitKichwa !== undefined ? explicitKichwa : r1Picked;
              if (labelToPlace === null || labelToPlace === undefined) {
                // tap sin label en mano: recoger lo que hubiera ahí
                if (r1Placed[memberEs]) {
                  const k = r1Placed[memberEs];
                  const next = { ...r1Placed }; delete next[memberEs];
                  setR1Placed(next); setR1Picked(k);
                }
                return;
              }
              const next = { ...r1Placed };
              // si la etiqueta ya está en otro miembro, quitarla de ahí
              for (const k of Object.keys(next)) if (next[k] === labelToPlace) delete next[k];
              next[memberEs] = labelToPlace;
              setR1Placed(next); setR1Picked(null);
            }}
          />
        )}
        {ronda === 1 && r2Order.length > 0 && (
          <OrdenaRecetaCard receta={r2Receta} order={r2Order} selected={r2Selected} locked={r2Locked}
            onTap={r2Tap}
            onSwap={(fromIdx, toIdx) => {
              if (r2Locked) return;
              const newOrder = [...r2Order];
              const t = newOrder[fromIdx];
              newOrder[fromIdx] = newOrder[toIdx];
              newOrder[toIdx] = t;
              setR2Order(newOrder);
              setR2Selected(null);
            }}
          />
        )}
        {ronda === 2 && (
          <LaboratorioPluralCard pick={r3Pick} selected={r3Selected} locked={r3Locked}
            onSelect={(s) => { if (r3Locked) return; setR3Selected(r3Selected === s ? null : s); }}
          />
        )}
      </div>

      <ActionRail
        canVerify={canVerify}
        onVerify={handleVerify}
        showErase={showErase}
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
// R1 · Kichwa árbol — 6 miembros con slots; bandeja con etiquetas kichwa
// ─────────────────────────────────────────────────────────────
function KichwaArbolCard({ set, placed, picked, locked, onPickLabel, onPlaceIn }) {
  const usedLabels = new Set(Object.values(placed));
  const [dragLabel, setDragLabel] = React.useState(null);
  const [dragOverMember, setDragOverMember] = React.useState(null);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
      {/* Árbol decorativo */}
      <div style={{
        width: "100%", maxWidth: 480,
        background: "linear-gradient(180deg, rgba(58,135,84,0.28), rgba(28,76,46,0.4))",
        border: "2px dashed rgba(252,233,168,0.45)",
        borderRadius: 18,
        padding: "14px 12px",
        position: "relative",
      }}>
        <div style={{ textAlign: "center", fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 15, color: "#fce9a8", marginBottom: 10, letterSpacing: "0.04em" }}>
          🌳 AYLLU · La familia
        </div>
        {/* 6 miembros en grid 3x2 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {set.miembros.map((m) => {
            const userKichwa = placed[m.es];
            const correctKichwa = m.kichwa;
            const isDragOver = dragOverMember === m.es;
            const wasCorrect = locked && userKichwa === correctKichwa;
            const wasWrong   = locked && userKichwa && userKichwa !== correctKichwa;
            const wasEmpty   = locked && !userKichwa;
            // Cuando se bloquea tras verificar: siempre mostramos la
            // respuesta correcta en el slot, con marco verde si el niño
            // acertó o rojo si se equivocó/lo dejó vacío.
            const slotText = locked ? correctKichwa : (userKichwa || "?");
            const slotBg = wasCorrect ? "rgba(46,204,143,0.9)"
              : wasWrong || wasEmpty ? "rgba(255,107,107,0.85)"
              : userKichwa ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.1)";
            const slotColor = (wasCorrect || wasWrong || wasEmpty) ? "#fff" : (userKichwa ? "#3a2608" : "rgba(252,233,168,0.5)");
            const slotBorder = wasCorrect ? "1.5px solid #2ecc8f"
              : wasWrong || wasEmpty ? "1.5px solid #ff6b6b"
              : userKichwa ? "1.5px solid #d9a441" : "1.5px dashed rgba(252,233,168,0.5)";
            return (
              <div key={m.es}
                onClick={() => onPlaceIn(m.es)}
                onDragOver={(e) => { if (!locked) { e.preventDefault(); setDragOverMember(m.es); } }}
                onDragLeave={() => setDragOverMember((cur) => cur === m.es ? null : cur)}
                onDrop={(e) => {
                  if (locked) return;
                  e.preventDefault();
                  const k = e.dataTransfer.getData("text/plain");
                  setDragOverMember(null);
                  setDragLabel(null);
                  if (k) onPlaceIn(m.es, k);
                }}
                style={{
                  background: wasCorrect
                    ? "linear-gradient(180deg, rgba(46,204,143,0.35), rgba(252,233,168,0.85))"
                    : wasWrong || wasEmpty
                    ? "linear-gradient(180deg, rgba(255,107,107,0.32), rgba(252,233,168,0.6))"
                    : userKichwa
                    ? "linear-gradient(180deg, rgba(252,233,168,0.95), rgba(217,164,65,0.85))"
                    : isDragOver ? "rgba(79,216,255,0.25)" : "rgba(10,6,35,0.5)",
                  border: `2px solid ${wasCorrect ? "#2ecc8f" : wasWrong || wasEmpty ? "#ff6b6b" : userKichwa ? "#fce9a8" : isDragOver ? "#4fd8ff" : "rgba(252,233,168,0.45)"}`,
                  borderRadius: 14,
                  padding: "8px 6px", textAlign: "center",
                  cursor: locked ? "default" : "pointer",
                  minHeight: 96,
                  transition: "all 0.15s",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between",
                  boxShadow: isDragOver ? "0 0 14px rgba(79,216,255,0.55)" : "none",
                }}>
                <div style={{ fontSize: 26, lineHeight: 1 }}>{m.emoji}</div>
                <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 11, color: locked || userKichwa ? "#3a2608" : "#fce9a8", letterSpacing: "0.04em" }}>
                  {m.es}
                </div>
                <div style={{
                  minHeight: 26, width: "100%",
                  fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 12.5,
                  background: slotBg,
                  border: slotBorder,
                  borderRadius: 8, padding: "4px 4px",
                  color: slotColor,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {slotText}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bandeja con etiquetas kichwa — arrastrables o con tap */}
      <div data-qa="bandeja" style={{
        width: "100%", maxWidth: 480,
        background: "rgba(10,6,35,0.55)",
        border: "1px dashed rgba(252,233,168,0.35)",
        borderRadius: 14,
        padding: "10px 12px",
        display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap",
        minHeight: 58,
        alignItems: "center",
      }}>
        {set.miembros.map((m) => {
          if (usedLabels.has(m.kichwa)) return null;
          const isPicked = picked === m.kichwa;
          const isDragging = dragLabel === m.kichwa;
          return (
            <button key={m.kichwa}
              draggable={!locked}
              onDragStart={(e) => {
                if (locked) return;
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", m.kichwa);
                setDragLabel(m.kichwa);
              }}
              onDragEnd={() => { setDragLabel(null); setDragOverMember(null); }}
              onClick={() => onPickLabel(m.kichwa)}
              disabled={locked}
              style={{
                padding: "8px 14px", borderRadius: 12,
                background: isPicked ? "linear-gradient(180deg,#fce9a8,#d9a441)" : "rgba(255,255,255,0.94)",
                color: "#3a2608",
                border: `2px solid ${isPicked ? "#4fd8ff" : "rgba(242,194,96,0.6)"}`,
                fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 13,
                cursor: locked ? "default" : "grab",
                boxShadow: isPicked ? "0 0 16px rgba(79,216,255,0.6)" : "0 3px 8px rgba(0,0,0,0.3)",
                transform: isPicked ? "translateY(-2px)" : "none",
                opacity: isDragging ? 0.4 : 1,
                transition: "all 0.15s",
                userSelect: "none",
              }}>
              {m.kichwa}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// R2 · Ordena la receta — 5 tarjetas con foto+texto, tap-tap intercambia
// ─────────────────────────────────────────────────────────────
function OrdenaRecetaCard({ receta, order, selected, locked, onTap, onSwap }) {
  const [dragFromIdx, setDragFromIdx] = React.useState(null);
  const [dragOverIdx, setDragOverIdx] = React.useState(null);
  const allCorrect = order.every((p, i) => p.n === i + 1);
  const showCorrectOrder = locked && !allCorrect;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
      <div style={{
        fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 13.5, color: "#fce9a8", textAlign: "center",
        background: "rgba(10,6,35,0.55)",
        border: "1px solid rgba(242,194,96,0.45)",
        borderRadius: 999,
        padding: "5px 18px",
      }}>
        🍓 {receta.titulo}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, width: "100%", maxWidth: 480 }}>
        {order.map((paso, i) => {
          const isSelected = selected === i;
          const isCorrect = locked && paso.n === i + 1;
          const isWrong = locked && paso.n !== i + 1;
          const isDragging = dragFromIdx === i;
          const isDragOver = dragOverIdx === i && dragFromIdx !== null && dragFromIdx !== i;
          return (
            <div key={`${paso.n}-${i}`}
              draggable={!locked}
              onDragStart={(e) => {
                if (locked) return;
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", String(i));
                setDragFromIdx(i);
              }}
              onDragEnd={() => { setDragFromIdx(null); setDragOverIdx(null); }}
              onDragOver={(e) => { if (!locked) { e.preventDefault(); setDragOverIdx(i); } }}
              onDragLeave={() => setDragOverIdx((c) => c === i ? null : c)}
              onDrop={(e) => {
                if (locked) return;
                e.preventDefault();
                const fromIdx = parseInt(e.dataTransfer.getData("text/plain"), 10);
                if (!Number.isNaN(fromIdx) && fromIdx !== i) onSwap && onSwap(fromIdx, i);
                setDragFromIdx(null);
                setDragOverIdx(null);
              }}
              onClick={() => onTap(i)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                background: isCorrect
                  ? "linear-gradient(180deg, rgba(46,204,143,0.28), rgba(255,255,255,0.94))"
                  : isWrong
                  ? "linear-gradient(180deg, rgba(255,107,107,0.22), rgba(255,255,255,0.94))"
                  : isDragOver
                  ? "linear-gradient(180deg, rgba(79,216,255,0.55), rgba(252,233,168,0.92))"
                  : isSelected
                  ? "linear-gradient(180deg, rgba(79,216,255,0.45), rgba(252,233,168,0.88))"
                  : "rgba(255,255,255,0.95)",
                color: "#3a2608",
                border: `2.5px solid ${isCorrect ? "#2ecc8f" : isWrong ? "#ff6b6b" : isDragOver ? "#4fd8ff" : isSelected ? "#4fd8ff" : "#f2c260"}`,
                borderRadius: 14, padding: "10px 14px",
                cursor: locked ? "default" : "grab",
                boxShadow: isDragOver || isSelected ? "0 0 18px rgba(79,216,255,0.65)" : "0 4px 10px rgba(0,0,0,0.35)",
                transform: isSelected ? "translateX(5px)" : "none",
                opacity: isDragging ? 0.4 : 1,
                transition: "background 0.18s, border-color 0.18s, box-shadow 0.18s, opacity 0.15s",
                userSelect: "none",
              }}>
              {/* Número de posición */}
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "linear-gradient(180deg, #f2c260, #d9a441)",
                color: "#3a2608", fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 16,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                border: "2px solid rgba(255,255,255,0.9)",
                boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
              }}>
                {i + 1}
              </div>
              <div style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>{paso.emoji}</div>
              <div style={{ flex: 1, minWidth: 0, fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>
                {paso.texto}
              </div>
            </div>
          );
        })}
      </div>

      {/* Orden correcto — solo cuando el niño se equivocó */}
      {showCorrectOrder && (
        <div style={{
          background: "linear-gradient(180deg, rgba(46,204,143,0.18), rgba(10,6,35,0.7))",
          border: "2px solid #2ecc8f",
          borderRadius: 12,
          padding: "8px 14px",
          display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center",
          color: "#fff",
          fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 12.5,
          maxWidth: 480,
        }}>
          <span style={{ color: "#a8f3c8" }}>✓ Orden correcto:</span>
          {receta.pasos.map((p, i) => (
            <span key={p.n} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{
                background: "linear-gradient(180deg, #f2c260, #d9a441)",
                color: "#3a2608",
                borderRadius: "50%", width: 22, height: 22,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 12,
                border: "1.5px solid rgba(255,255,255,0.85)",
              }}>{i + 1}</span>
              <span style={{ fontSize: 18 }}>{p.emoji}</span>
              {i < receta.pasos.length - 1 && <span style={{ color: "#fce9a8" }}>→</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// R3 · Laboratorio plural — cartel + slot + bandeja con sufijos
// ─────────────────────────────────────────────────────────────
function LaboratorioPluralCard({ pick, selected, locked, onSelect }) {
  const SUFIJOS = [
    { id: "-s",  label: "s",  color: "#7ab8ff" },
    { id: "-es", label: "es", color: "#ff8ab4" },
  ];
  const cleanSuffix = (s) => s.replace("-", "");
  const formed = !selected
    ? "?"
    : selected === pick.sufijo
      ? pick.plural
      : `${pick.singular}${cleanSuffix(selected)}`;
  const isCorrect = locked && selected === pick.sufijo;
  const isWrong = locked && selected !== pick.sufijo;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22 }}>
      {/* Cartel arriba: palabra + slot + signo + resultado */}
      <div style={{
        width: "100%", maxWidth: 480,
        background: "linear-gradient(180deg, rgba(255,253,245,0.97), rgba(245,238,225,0.92))",
        border: "3px solid #f2c260",
        borderRadius: 20,
        padding: "24px 18px",
        boxShadow: "0 10px 24px rgba(0,0,0,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
      }}>
        <div style={{
          fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 28, color: "#3a2608",
          padding: "8px 16px", background: "rgba(252,233,168,0.55)", borderRadius: 12,
        }}>
          {pick.singular}
        </div>
        <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 26, color: "#7a4a0e" }}>+</div>
        <div style={{
          minWidth: 68, height: 56,
          background: selected ? "linear-gradient(180deg, #4fd8ff, #2a98c8)" : "rgba(10,6,35,0.18)",
          border: `2.5px dashed ${selected ? "#4fd8ff" : "rgba(116,72,32,0.5)"}`,
          borderRadius: 12,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 22,
          color: selected ? "#fff" : "rgba(116,72,32,0.5)",
        }}>
          {selected ? cleanSuffix(selected) : "?"}
        </div>
        <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 26, color: "#7a4a0e" }}>=</div>
        <div style={{
          padding: "8px 16px",
          background: isCorrect ? "linear-gradient(180deg, #2ecc8f, #15a06a)" : isWrong ? "linear-gradient(180deg, #ff6b6b, #c33b3b)" : "linear-gradient(180deg, #fce9a8, #d9a441)",
          border: `2.5px solid ${isCorrect ? "#2ecc8f" : isWrong ? "#ff6b6b" : "#d9a441"}`,
          borderRadius: 12,
          fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 26, color: isCorrect || isWrong ? "#fff" : "#3a2608",
          minWidth: 110, textAlign: "center",
          boxShadow: isCorrect ? "0 0 22px rgba(46,204,143,0.7)" : "none",
        }}>
          {formed}
        </div>
      </div>

      {/* Pista de regla */}
      <div style={{
        background: "rgba(10,6,35,0.6)",
        border: "1px solid rgba(252,233,168,0.5)",
        borderRadius: 999,
        padding: "8px 22px",
        fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 13, color: "#fce9a8",
        letterSpacing: "0.02em",
        maxWidth: 460, textAlign: "center",
      }}>
        💡 "{pick.singular}" {pick.regla}
      </div>

      {/* Bandeja con 2 sufijos */}
      <div data-qa="bandeja" style={{
        background: "rgba(10,6,35,0.55)",
        border: "1px dashed rgba(252,233,168,0.35)",
        borderRadius: 14,
        padding: "14px 20px",
        display: "flex", gap: 22, justifyContent: "center",
      }}>
        {SUFIJOS.map((s) => {
          const isPicked = selected === s.id;
          return (
            <button key={s.id} onClick={() => onSelect(s.id)} disabled={locked}
              style={{
                padding: "16px 36px", borderRadius: 16,
                background: isPicked ? "linear-gradient(180deg,#fce9a8,#d9a441)" : s.color,
                color: isPicked ? "#3a2608" : "#08264d",
                border: `3px solid ${isPicked ? "#fce9a8" : "rgba(255,255,255,0.75)"}`,
                fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 22, letterSpacing: "0.04em",
                cursor: locked ? "default" : "pointer",
                boxShadow: isPicked ? "0 0 0 4px rgba(255,255,255,0.9), 0 0 22px rgba(252,233,168,0.7)" : "0 4px 10px rgba(0,0,0,0.4)",
                transform: isPicked ? "translateY(-3px) scale(1.06)" : "none",
                transition: "all 0.18s",
                opacity: locked && !isPicked ? 0.45 : 1,
                minWidth: 90,
              }}>
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ResultsScreen + PrintableReport (compartido)
// ─────────────────────────────────────────────────────────────
function formatOp(e) {
  return `${e.op || ""} ${e.a}`;
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
                <td style={{ ...printStyles.td, ...printStyles.tdOp }}>{e.op || ""} {e.a}</td>
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
            fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 32,
            background: "linear-gradient(180deg, #fce9a8, #d9a441)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            lineHeight: 1, marginBottom: 4, textAlign: "center",
          }}>¡Ronda completa!</div>
          <char.Component size={170} />
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
      <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: emphasis ? 22 : 18, color: tone, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

Object.assign(window, { GameScreen, ResultsScreen });
