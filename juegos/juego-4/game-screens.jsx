// game-screens.jsx — Juego 4. Cuatro temas de lenguaje con mecánicas distintas:
//   1. Tipos de texto       (7 años)  — trivia / organizador / mapa burbujas
//   2. Lenguaje poético     (10 años) — trivia función / emparejar refranes / encerrar figuras
//   3. Escritura académica  (12 años) — ordenar partes informe / conector correcto / cazar errores
//   4. Enriquece tu lengua  (14 años) — palabra polisémica / homófonas / condicional drag
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

// Estrellas por tiempo: 0-2s → 10⭐, 27+s → 1⭐, fallo → 0.
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

// Anti-repetición persistente por tema
const RECENT_KEYS = {
  tipos:     "edinun_juego4_tipos_recientes_v1",
  poetica:   "edinun_juego4_poetica_recientes_v1",
  escritura: "edinun_juego4_escritura_recientes_v1",
  enriquece: "edinun_juego4_enriquece_recientes_v1",
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

function pickFromBank(level, bank, idField) {
  const recent = new Set(getRecent(level));
  let pool = bank.filter((x) => !recent.has(x[idField]));
  if (pool.length === 0) pool = bank;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─────────────────────────────────────────────────────────────
// BANCOS DE DATOS — TEMA 1 (Tipos de texto)
// ─────────────────────────────────────────────────────────────

// R1 — Trivia: literario / informativo / funcional
const TIPOS_BANK = [
  { id: "pinocho",     titulo: "Pinocho",                fragmento: "Érase una vez un viejo carpintero llamado Gepeto, que vivía en una pequeña cabaña…", tipo: "literario" },
  { id: "platero",     titulo: "Platero y yo",           fragmento: "Platero es pequeño, peludo, suave; tan blando por fuera, que se diría todo de algodón…", tipo: "literario" },
  { id: "pajaro",      titulo: "El pájaro encarnado",    fragmento: "En el árbol de mi pecho hay un pájaro encarnado. Cuando te veo se asusta…", tipo: "literario" },
  { id: "liebre",      titulo: "La liebre y la tortuga", fragmento: "Un día la liebre se burló de la lentitud de la tortuga. La tortuga la retó a una carrera…", tipo: "literario" },
  { id: "anfibios",    titulo: "Los anfibios",           fragmento: "Se conoce como anfibios a los vertebrados terrestres que atraviesan un período de metamorfosis…", tipo: "informativo" },
  { id: "lluvia",      titulo: "Llovió mucho",           fragmento: "Ayer cayó la lluvia más fuerte del año en la ciudad. Las calles quedaron inundadas…", tipo: "informativo" },
  { id: "bolivar",     titulo: "Simón Bolívar",          fragmento: "Simón Bolívar nació en 1783 en Caracas. Fue uno de los líderes más importantes de la independencia…", tipo: "informativo" },
  { id: "jugo",        titulo: "Jugo de naranja",        fragmento: "¡Nuevo jugo de naranja! Lleno de vitaminas para empezar el día con energía…", tipo: "informativo" },
  { id: "panqueques",  titulo: "Receta de panqueques",   fragmento: "1. Mezcla la harina con la leche. 2. Bate los huevos. 3. Cocina en el sartén caliente…", tipo: "funcional" },
  { id: "avion",       titulo: "Avión de papel",         fragmento: "Dobla la hoja por la mitad. Marca el pliegue. Abre y dobla las puntas hacia el centro…", tipo: "funcional" },
  { id: "abuela",      titulo: "Carta a la abuela",      fragmento: "Querida abuela, te escribo para contarte que la escuela empezó. Te extraño mucho…", tipo: "funcional" },
  { id: "email",       titulo: "Email a Pedro",          fragmento: "Asunto: Tarea de mañana. Hola Pedro, te envío la tarea de matemáticas para que la revises…", tipo: "funcional" },
];

// R2 — Organizador gráfico: palabra central + 4 piezas (definición, oración, sinónimo, dibujo)
const ORG_BANK = [
  {
    id: "buzon",  palabra: "BUZÓN",
    definicion: "Caja para echar cartas o mensajes.",
    oracion:    "Eché una carta en el buzón.",
    sinonimo:   "Casillero de correo.",
    dibujo:     "📮",
  },
  {
    id: "mariposa", palabra: "MARIPOSA",
    definicion: "Insecto con alas grandes y de colores.",
    oracion:    "Vi una mariposa en el jardín.",
    sinonimo:   "Lepidóptero.",
    dibujo:     "🦋",
  },
  {
    id: "biblioteca", palabra: "BIBLIOTECA",
    definicion: "Lugar lleno de libros para leer.",
    oracion:    "Estudié toda la tarde en la biblioteca.",
    sinonimo:   "Sala de lectura.",
    dibujo:     "📚",
  },
  {
    id: "paraguas", palabra: "PARAGUAS",
    definicion: "Objeto que protege de la lluvia.",
    oracion:    "Abrí mi paraguas cuando empezó a llover.",
    sinonimo:   "Sombrilla.",
    dibujo:     "☂️",
  },
  {
    id: "oceano", palabra: "OCÉANO",
    definicion: "Gran masa de agua salada.",
    oracion:    "El océano es muy profundo y azul.",
    sinonimo:   "Mar.",
    dibujo:     "🌊",
  },
  {
    id: "bicicleta", palabra: "BICICLETA",
    definicion: "Vehículo de dos ruedas con pedales.",
    oracion:    "Voy al colegio en bicicleta.",
    sinonimo:   "Bici.",
    dibujo:     "🚲",
  },
];

// R3 — Mapa de burbujas: 3 ejercicios con consigna distinta
const BURBUJAS_DATA = [
  {
    id: "literario", consigna: "Encuentra los textos LITERARIOS",
    burbujas: ["cuento", "poema", "teatro", "novela", "noticia", "receta", "manual"],
    correctos: ["cuento", "poema", "teatro", "novela"],
    centro: "TEXTOS LITERARIOS",
    color: "#ffc06e",
  },
  {
    id: "informativo", consigna: "Encuentra los textos INFORMATIVOS",
    burbujas: ["noticias", "libros escolares", "publicidad", "textos históricos", "cuento", "poema", "receta"],
    correctos: ["noticias", "libros escolares", "publicidad", "textos históricos"],
    centro: "TEXTOS INFORMATIVOS",
    color: "#ffe97a",
  },
  {
    id: "funcional", consigna: "Encuentra los textos FUNCIONALES",
    burbujas: ["receta", "carta", "manual", "email", "cuento", "noticia", "poema"],
    correctos: ["receta", "carta", "manual", "email"],
    centro: "TEXTOS FUNCIONALES",
    color: "#7ab8ff",
  },
];

// ─────────────────────────────────────────────────────────────
// BANCOS DE DATOS — TEMA 2 (Lenguaje poético)
// ─────────────────────────────────────────────────────────────

// R1 — Trivia función: POÉTICA / INFORMA / PIDE
const FUNCIONES_BANK = [
  { id: "luna",     oracion: "Brillaba la luna en tus ojos.",              funcion: "poetica" },
  { id: "pez",      oracion: "El pez por la boca muere.",                  funcion: "poetica" },
  { id: "estrellas",oracion: "Tus ojos iluminan como estrellas.",          funcion: "poetica" },
  { id: "esencial", oracion: "Lo esencial es invisible a los ojos.",       funcion: "poetica" },
  { id: "tiempo",   oracion: "A mal tiempo, buena cara.",                  funcion: "poetica" },
  { id: "examen",   oracion: "El examen de inglés será el lunes.",         funcion: "informa" },
  { id: "quito",    oracion: "Quito es la capital de Ecuador.",            funcion: "informa" },
  { id: "clima",    oracion: "Hoy hay 20 grados de temperatura.",          funcion: "informa" },
  { id: "museo",    oracion: "El museo abre a las 9 de la mañana.",        funcion: "informa" },
  { id: "vuelo",    oracion: "¿A qué hora parte el vuelo?",                funcion: "pide" },
  { id: "vengan",   oracion: "Vengan conmigo a la sala.",                  funcion: "pide" },
  { id: "puerta",   oracion: "Cierra la puerta, por favor.",               funcion: "pide" },
];

// R2 — Emparejar refrán ↔ significado
const REFRANES_BANK = [
  { id: "pez",     refran: "El pez por la boca muere",         significado: "Si hablas de más, te metes en líos." },
  { id: "tiempo",  refran: "A mal tiempo, buena cara",          significado: "Hay que mantener buena actitud." },
  { id: "perro",   refran: "Perro que ladra no muerde",         significado: "Quien amenaza poco actúa." },
  { id: "tarde",   refran: "Más vale tarde que nunca",          significado: "Hacerlo aunque sea tarde es mejor que no hacerlo." },
  { id: "boca",    refran: "En boca cerrada no entran moscas",  significado: "A veces es mejor callar." },
  { id: "busca",   refran: "Quien busca, encuentra",            significado: "Si te esfuerzas, lograrás lo que quieres." },
];

// R3 — Encerrar figuras literarias en poemas
const POEMAS_BANK = [
  {
    id: "fuertes",
    titulo: "Gloria Fuertes",
    versos: [
      { texto: "En el árbol de mi pecho",           figura: true  },
      { texto: "hay un pájaro encarnado.",          figura: true  },
      { texto: "Cuando te veo se asusta,",          figura: false },
      { texto: "aletea, lanza saltos.",             figura: false },
    ],
  },
  {
    id: "dario",
    titulo: "Rubén Darío",
    versos: [
      { texto: "Las princesas primorosas",          figura: true  },
      { texto: "se parecen mucho a ti.",            figura: true  },
      { texto: "Cortan lirios, cortan rosas,",      figura: false },
      { texto: "cortan astros. Son así.",           figura: true  },
    ],
  },
  {
    id: "calderon",
    titulo: "Calderón",
    versos: [
      { texto: "¿Qué es la vida? Un frenesí.",      figura: true  },
      { texto: "¿Qué es la vida? Una ilusión,",     figura: true  },
      { texto: "una sombra, una ficción.",          figura: true  },
      { texto: "Y los sueños, sueños son.",         figura: false },
    ],
  },
  {
    id: "luceros",
    titulo: "Anónimo",
    versos: [
      { texto: "Tus ojos son dos luceros",          figura: true  },
      { texto: "que iluminan mi camino.",           figura: true  },
      { texto: "Tu sonrisa es primavera",           figura: true  },
      { texto: "y yo soy tu peregrino.",            figura: false },
    ],
  },
  {
    id: "rio",
    titulo: "Río",
    versos: [
      { texto: "El río canta mientras corre,",      figura: true  },
      { texto: "acaricia las piedras del lecho.",   figura: true  },
      { texto: "Lleva las hojas del otoño,",        figura: false },
      { texto: "y un secreto viejo en su pecho.",   figura: true  },
    ],
  },
  {
    id: "lorca",
    titulo: "Federico (adaptado)",
    versos: [
      { texto: "Verde que te quiero verde.",        figura: true  },
      { texto: "Verde viento, verdes ramas.",       figura: true  },
      { texto: "El barco sobre la mar",             figura: false },
      { texto: "y el caballo en la montaña.",       figura: false },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// BANCOS DE DATOS — TEMA 3 (Escritura académica)
// ─────────────────────────────────────────────────────────────

// R1 — Ordenar las 6 partes del informe
const INFORME_PARTES = [
  "Asunto",
  "Introducción",
  "Metodología",
  "Resultados",
  "Conclusiones",
  "Referencias bibliográficas",
];

const INFORME_CONTEXTOS = [
  { id: "uv",     titulo: "Informe: La luz UV en plantas de tomate" },
  { id: "bar",    titulo: "Informe: Productos saludables en el bar del colegio" },
  { id: "lectura",titulo: "Informe: Hábitos de lectura de los adolescentes" },
];

// R2 — Conector correcto
const CONECTORES_BANK = [
  { id: "estudio_no",  oracion: "Estudié mucho ___ no aprobé el examen.",     funcion: "oposición",      correcta: "sin embargo", distractores: ["además", "por eso"] },
  { id: "estudio_si",  oracion: "Estudié mucho ___ aprobé el examen.",        funcion: "causa",          correcta: "por eso",     distractores: ["sin embargo", "además"] },
  { id: "geo_mate",    oracion: "Estudio geografía ___ matemáticas.",         funcion: "adición",        correcta: "además",      distractores: ["sin embargo", "después"] },
  { id: "ana_pedro",   oracion: "Ana llegó ___ Pedro se fue.",                funcion: "temporal",       correcta: "mientras",    distractores: ["sin embargo", "además"] },
  { id: "reciclar",    oracion: "Es importante reciclar, ___ las botellas.",  funcion: "ejemplificación",correcta: "por ejemplo", distractores: ["sin embargo", "además"] },
  { id: "pizza",       oracion: "Comí pizza ___ helado.",                     funcion: "adición",        correcta: "y también",   distractores: ["pero", "antes"] },
  { id: "lluvia",      oracion: "Llovió mucho ___ no salimos.",               funcion: "causa",          correcta: "por eso",     distractores: ["aunque", "además"] },
  { id: "salir",       oracion: "Quería salir ___ tenía tarea.",              funcion: "oposición",      correcta: "pero",        distractores: ["así que", "además"] },
  { id: "llegofue",    oracion: "Llegó ___ se fue.",                          funcion: "temporal",       correcta: "y después",   distractores: ["aunque", "así que"] },
  { id: "planetas",    oracion: "Los planetas son varios, ___ Marte.",        funcion: "ejemplificación",correcta: "como",        distractores: ["sin embargo", "también"] },
  { id: "rapido",      oracion: "Comimos rápido ___ llegar a tiempo.",        funcion: "causa",          correcta: "para",        distractores: ["aunque", "sin embargo"] },
  { id: "frutas",      oracion: "Hay frutas: manzanas, peras ___ uvas.",      funcion: "adición",        correcta: "y también",   distractores: ["sin embargo", "por ejemplo"] },
];

// R3 — Caza errores: palabras tocables, las que tienen error en negrita
// Cada párrafo se renderiza como array de tokens (palabras); las erróneas tienen flag err=true.
const ERRORES_BANK = [
  {
    id: "uv",
    tokens: "En este estudio, se [investigo] el impacto de la luz UV en las plantas de tomate. La [ipotesis] era que la luz UV podría afectar negativamente su [crezimiento].",
    correctos: { investigo: "investigó", ipotesis: "hipótesis", crezimiento: "crecimiento" },
  },
  {
    id: "plantas",
    tokens: "Las plantas se [espusieron] a cuatro niveles de luz: control, bajo, medio y alto. [avia] 20 plantas en total y fueron [monitorisadas] durante 30 días.",
    correctos: { espusieron: "expusieron", avia: "había", monitorisadas: "monitorizadas" },
  },
  {
    id: "analisis",
    tokens: "El [analisis] mostró que las plantas con luz [intenza] crecieron menos. La [conclucion] es clara: la luz UV es perjudicial.",
    correctos: { analisis: "análisis", intenza: "intensa", conclucion: "conclusión" },
  },
  {
    id: "bar",
    tokens: "Marcelo Jiménez [redacto] un informe [cientifico] sobre los bares del colegio. [Acia] falta más variedad de productos saludables.",
    correctos: { redacto: "redactó", cientifico: "científico", Acia: "Hacía" },
  },
  {
    id: "tabla",
    tokens: "Los resultados [estan] en la tabla. Se [resive] la información del bar y se [clacifica] por categorías.",
    correctos: { estan: "están", resive: "recibe", clacifica: "clasifica" },
  },
  {
    id: "trabaco",
    tokens: "El [trabaco] de [invetigacion] [tubo] como objetivo comparar dos métodos de estudio.",
    correctos: { trabaco: "trabajo", invetigacion: "investigación", tubo: "tuvo" },
  },
];

// ─────────────────────────────────────────────────────────────
// BANCOS DE DATOS — TEMA 4 (Enriquece tu lengua)
// ─────────────────────────────────────────────────────────────

// R1 — Descubre la palabra polisémica
const POLISEMIAS_BANK = [
  { id: "raton",    palabra: "ratón",    emoji1: "🐭", label1: "animal",      emoji2: "🖱️", label2: "dispositivo",     distractores: ["pantalla", "teclado"] },
  { id: "papel",    palabra: "papel",    emoji1: "📄", label1: "hoja",        emoji2: "🎭", label2: "rol de actor",    distractores: ["papiro", "cartón"] },
  { id: "banco",    palabra: "banco",    emoji1: "🪑", label1: "asiento",     emoji2: "🏦", label2: "institución",     distractores: ["silla", "parque"] },
  { id: "llave",    palabra: "llave",    emoji1: "🔑", label1: "para abrir",  emoji2: "💧", label2: "grifo de agua",   distractores: ["candado", "manija"] },
  { id: "cabeza",   palabra: "cabeza",   emoji1: "👤", label1: "cuerpo",      emoji2: "👑", label2: "líder",           distractores: ["jefe", "frente"] },
  { id: "estrella", palabra: "estrella", emoji1: "⭐", label1: "cielo",       emoji2: "🌟", label2: "famoso",          distractores: ["luna", "sol"] },
  { id: "hoja",     palabra: "hoja",     emoji1: "🍃", label1: "árbol",       emoji2: "📄", label2: "papel",           distractores: ["rama", "tronco"] },
  { id: "pluma",    palabra: "pluma",    emoji1: "🪶", label1: "ave",         emoji2: "🖊️", label2: "escritura",       distractores: ["lápiz", "ala"] },
];

// R2 — Elige la letra (homófonas). Cada item: pista, palabra con casilla "?", letra correcta, opciones (2).
const HOMOFONAS_BANK = [
  { id: "taza",   pista: "Pequeña vasija con asa para beber.",         pre: "TA",  post: "A", correcta: "Z",  opciones: ["S", "Z"]  },
  { id: "tasa",   pista: "Precio fijado a un elemento.",                pre: "TA",  post: "A", correcta: "S",  opciones: ["S", "Z"]  },
  { id: "valla",  pista: "Saltar la barrera del jardín.",               pre: "VA",  post: "A", correcta: "LL", opciones: ["Y", "LL"] },
  { id: "vaya",   pista: "Exclamación: '¡___ susto me diste!'",         pre: "VA",  post: "A", correcta: "Y",  opciones: ["Y", "LL"] },
  { id: "vello",  pista: "Pelo suave del cuerpo.",                      pre: "",    post: "ELLO", correcta: "V", opciones: ["V", "B"] },
  { id: "bello",  pista: "Hermoso, precioso.",                          pre: "",    post: "ELLO", correcta: "B", opciones: ["V", "B"] },
  { id: "votar",  pista: "Acción para elegir representante.",           pre: "",    post: "OTAR", correcta: "V", opciones: ["V", "B"] },
  { id: "botar",  pista: "Lanzar algo lejos.",                          pre: "",    post: "OTAR", correcta: "B", opciones: ["V", "B"] },
];

// R3 — Completa con condicional (drag de verbos a párrafo con huecos)
const CONDICIONAL_BANK = [
  {
    id: "viaje",
    texto: ["Si yo fuera tú, ", null, " ayuda a mis padres. Me ", null, " acompañarte al viaje, pero no ", null, " los pasajes."],
    correctas: ["pediría", "encantaría", "podría"],
    distractores: ["comeré", "iba"],
  },
  {
    id: "libro",
    texto: ["Si tuviera más tiempo, ", null, " ese libro. ", null, " pagar 200 dólares por él, pero no lo encuentro. ", null, " ir a la librería del centro."],
    correctas: ["compraría", "valdría", "debería"],
    distractores: ["compré", "valgo"],
  },
  {
    id: "mar",
    texto: ["Me ", null, " vivir cerca del mar. ", null, " todos los días a la playa y ", null, " a nadar al amanecer."],
    correctas: ["gustaría", "iría", "saldría"],
    distractores: ["gustaba", "iba"],
  },
  {
    id: "invisible",
    texto: ["Si fuera invisible, ", null, " a todos los museos gratis. ", null, " junto a las obras sin que nadie me viera. ", null, " muy emocionante."],
    correctas: ["entraría", "estaría", "sería"],
    distractores: ["entré", "estuve"],
  },
  {
    id: "loteria",
    texto: ["Si me ganara la lotería, ", null, " una casa grande. ", null, " un viaje a mi familia. No ", null, " que trabajar más."],
    correctas: ["compraría", "regalaría", "tendría"],
    distractores: ["compré", "regalé"],
  },
  {
    id: "estudio",
    texto: ["Si hubiera estudiado más, ", null, " aprobado. ", null, " podido entrar a la universidad. Mi mamá ", null, " orgullosa."],
    correctas: ["habría", "habría", "estaría"],
    distractores: ["he", "estuve"],
  },
];

// ─────────────────────────────────────────────────────────────
// GameScreen — delega al sub-componente según el nivel elegido
// ─────────────────────────────────────────────────────────────
function GameScreen({ app, setApp, go }) {
  const cat = app.currentCategory || "tipos";
  const [restartTick, setRestartTick] = useStateG(0);
  const restart = () => setRestartTick((t) => t + 1);
  if (cat === "poetica")   return <PoeticaGame          key={`poetica-${restartTick}`}   app={app} setApp={setApp} go={go} onRestart={restart} />;
  if (cat === "escritura") return <EscrituraGame        key={`escritura-${restartTick}`} app={app} setApp={setApp} go={go} onRestart={restart} />;
  if (cat === "enriquece") return <EnriquecimientoGame  key={`enriquece-${restartTick}`} app={app} setApp={setApp} go={go} onRestart={restart} />;
  return <TiposDeTextoGame key={`tipos-${restartTick}`} app={app} setApp={setApp} go={go} onRestart={restart} />;
}

// ─────────────────────────────────────────────────────────────
// HUD común (logo + chips de 4 temas + timer + estrellas) y modales
// ─────────────────────────────────────────────────────────────
// Enunciado grande arriba (estilo completa-palabras): texto blanco con sombra,
// centrado entre el personaje (left:240) y el ActionRail (right:168).
function GameEnunciado({ text }) {
  if (!text) return null;
  return (
    <div style={{
      position: "absolute", top: 88, left: 240, right: 168,
      textAlign: "center",
      fontFamily: "var(--ed-font-display)", fontWeight: 700,
      fontSize: 19, lineHeight: 1.2,
      color: "#fff",
      textShadow: "0 2px 6px rgba(0,0,0,0.55)",
      pointerEvents: "none",
      zIndex: 5,
    }}>
      {text}
    </div>
  );
}

function GameHUD({ elapsed, stars, attempted, solved, total = 3, app, setApp }) {
  const levels = (typeof LEVELS_CFG !== "undefined" && LEVELS_CFG) || (window.LEVELS_CFG || []);
  const currentId = app && app.currentCategory ? app.currentCategory : "tipos";
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

      {/* 4 chips de tema centrados arriba */}
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
                padding: "4px 10px",
                borderRadius: 999,
                background: active ? lv.grad : "rgba(0,0,0,0.35)",
                color: active ? lv.ink : "rgba(252,233,168,0.85)",
                fontFamily: "var(--ed-font-display)",
                fontWeight: 700, fontSize: 10, letterSpacing: "0.02em",
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
          style={{ padding: 24, maxWidth: 460, textAlign: "center", boxShadow: "var(--ed-shadow-card), 0 0 40px rgba(148,120,255,0.3)" }}
        >
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

// Rail derecho con botones de acción. Cada sub-juego declara qué botones
// aplican a la ronda actual mediante los props canVerify y showErase.
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

// Componente personaje + bocadillo (zona inferior izquierda)
function CharacterCorner({ char, message }) {
  return (
    <div data-qa="personaje" style={{
      position: "absolute", left: 8, bottom: 76, width: 220,
      pointerEvents: "none", textAlign: "center",
    }}>
      <div data-qa="bocadillo" style={{
        position: "absolute", left: 6, top: -82, width: 208,
        pointerEvents: "none",
      }}>
        <div style={{
          position: "relative",
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
// CONTINÚA EN OTRO ARCHIVO LÓGICAMENTE — pero para empaquetar va aquí
// Los 4 sub-juegos: TiposDeTextoGame, PoeticaGame, EscrituraGame, EnriquecimientoGame
// ─────────────────────────────────────────────────────────────
// Para minimizar lecturas, mantenemos todo en este único archivo.
// Cada sub-juego implementa su propio state (attempted, solved, stars, log…)
// porque el shell de game-screens.jsx tradicional (juego-2) lo hace así.

// ─────────────────────────────────────────────────────────────
// TEMA 1 · TiposDeTextoGame — 3 rondas:
//   R1: Trivia 3 botones (literario / informativo / funcional)
//   R2: Organizador gráfico (drag 4 piezas a 4 cuadros)
//   R3: Pinta burbujas del mapa (tap múltiple toggle)
// ─────────────────────────────────────────────────────────────
function TiposDeTextoGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "Tipos de texto";

  // 3 rondas con mecánicas distintas. Ronda 0=trivia, 1=organizador, 2=burbujas.
  const [ronda, setRonda] = useStateG(0);

  // State controlado de cada card (levantado para que ActionRail pueda actuar)
  const [r1Selected, setR1Selected] = useStateG(null);
  const [r1Locked, setR1Locked] = useStateG(false);
  const [r2Placed, setR2Placed] = useStateG({});
  const [r2Picked, setR2Picked] = useStateG(null);
  const [r2Verified, setR2Verified] = useStateG(false);
  const [r3Picked, setR3Picked] = useStateG(new Set());
  const [r3Locked, setR3Locked] = useStateG(false);

  // R1 — pick aleatorio del banco de textos
  const [r1Pick] = useStateG(() => {
    const recent = new Set(getRecent("tipos"));
    let pool = TIPOS_BANK.filter((t) => !recent.has(t.id));
    if (pool.length === 0) pool = TIPOS_BANK;
    const p = pool[Math.floor(Math.random() * pool.length)];
    pushRecent("tipos", p.id);
    return p;
  });

  // R2 — pick aleatorio del banco de organizadores
  const [r2Pick] = useStateG(() => {
    const recent = new Set(getRecent("tipos"));
    let pool = ORG_BANK.filter((t) => !recent.has(t.id));
    if (pool.length === 0) pool = ORG_BANK;
    const p = pool[Math.floor(Math.random() * pool.length)];
    pushRecent("tipos", p.id);
    return p;
  });

  // R3 — los 3 mapas, uno por tipo. Mezclamos el orden.
  const [r3Order] = useStateG(() => shuffle(BURBUJAS_DATA));
  const r3Current = r3Order[0]; // mostramos uno; el shell solo usa 1 ronda r3

  // Estados del shell
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

  // Glifos chalkboard del Tema 1
  useEffectG(() => {
    window.__currentChalkGlyphs = [
      { c: "📖", l: "6%",  t: "12%", r: "-8deg" },
      { c: "📰", l: "82%", t: "16%", r: "6deg",  s: "0.62em" },
      { c: "📋", l: "10%", t: "78%", r: "12deg", s: "0.6em" },
      { c: "🍰", l: "88%", t: "72%", r: "-10deg", s: "0.5em" },
      { c: "🦋", l: "45%", t: "8%",  r: "4deg",  s: "0.55em" },
      { c: "?",  l: "3%",  t: "45%", r: "-4deg", s: "0.6em" },
      { c: "📝", l: "92%", t: "45%", r: "8deg",  s: "0.5em" },
      { c: "✏",  l: "30%", t: "55%", r: "-6deg", s: "0.55em" },
      { c: "📚", l: "70%", t: "62%", r: "8deg",  s: "0.5em" },
      { c: "¡",  l: "55%", t: "30%", r: "-4deg", s: "0.55em" },
    ];
    return () => { window.__currentChalkGlyphs = null; };
  }, []);

  // canVerify y showErase por ronda
  const canVerify =
    ronda === 0 ? (r1Selected !== null && !r1Locked) :
    ronda === 1 ? (Object.keys(r2Placed).length === 4 && !r2Verified) :
    ronda === 2 ? (r3Picked.size > 0 && !r3Locked) :
    false;
  const showErase = ronda !== 0;

  function handleVerify() {
    if (!canVerify) return;
    if (ronda === 0) {
      setR1Locked(true);
      answer(r1Selected === r1Pick.tipo, r1Selected, r1Pick.tipo, "📖");
    } else if (ronda === 1) {
      setR2Verified(true);
      let allOK = true;
      const SLOTS = ["definicion", "oracion", "sinonimo", "dibujo"];
      for (const s of SLOTS) {
        const pieceIdx = r2Placed[s];
        if (pieceIdx === undefined) { allOK = false; break; }
        if (r2Pieces[pieceIdx].slot !== s) { allOK = false; break; }
      }
      setTimeout(() => answer(allOK, JSON.stringify(r2Placed), "ok", "🗂"), 400);
    } else if (ronda === 2) {
      setR3Locked(true);
      const correctSet = new Set(r3Current.correctos);
      let isOK = r3Picked.size === correctSet.size;
      if (isOK) for (const w of r3Picked) if (!correctSet.has(w)) { isOK = false; break; }
      setTimeout(() => answer(isOK, Array.from(r3Picked).join(","), r3Current.correctos.join(","), "💧"), 400);
    }
  }

  function handleErase() {
    if (ronda === 1) {
      if (r2Verified) return;
      setR2Placed({});
      setR2Picked(null);
    } else if (ronda === 2) {
      if (r3Locked) return;
      setR3Picked(new Set());
    }
  }

  // r2Pieces se calcula en el componente, lo necesitamos arriba para verify
  const [r2Pieces] = useStateG(() => {
    const SLOTS = ["definicion", "oracion", "sinonimo", "dibujo"];
    return shuffle(SLOTS.map((s) => ({ slot: s, text: r2Pick[s] })));
  });

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

  const [confirmingActualExit, setConfirmingActualExit] = useStateG(false);

  // Enunciado (QUÉ hacer) — grande, arriba, blanco con sombra.
  // Bocadillo (CÓMO) — corto, dentro del bocadillo del personaje.
  const enunciado =
    ronda === 0 ? "¿Qué tipo de texto es?" :
    ronda === 1 ? "Organizador gráfico de relación" :
    `Encuentra los textos ${r3Current.id === "literario" ? "literarios" : r3Current.id === "informativo" ? "informativos" : "funcionales"}.`;

  const bocadillo =
    ronda === 0 ? "Lee y elige. Después ¡VERIFICA!" :
    ronda === 1 ? "Coloca las 4 piezas y ¡VERIFICA!" :
    "Toca las burbujas correctas y ¡VERIFICA!";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <GameHUD elapsed={elapsed} stars={stars} attempted={attempted} solved={solved} total={3} app={app} setApp={setApp} />

      <CharacterCorner char={char} message={bocadillo} />
      <GameEnunciado text={enunciado} />

      {/* Zona central — varía por ronda. right:168 deja sitio al ActionRail. */}
      <div data-qa="zona-central" style={{
        position: "absolute", top: 128, left: 240, right: 168, bottom: 14,
      }}>
        {ronda === 0 && (
          <TiposTriviaCard pick={r1Pick}
            selected={r1Selected} locked={r1Locked}
            onSelect={(t) => { if (!r1Locked) setR1Selected(r1Selected === t ? null : t); }}
          />
        )}
        {ronda === 1 && (
          <OrganizadorCard pick={r2Pick}
            pieces={r2Pieces} placed={r2Placed} picked={r2Picked} verified={r2Verified}
            onPickPiece={(idx) => { if (r2Verified) return; if (Object.values(r2Placed).includes(idx)) return; setR2Picked(r2Picked === idx ? null : idx); }}
            onPickFromSlot={(slot) => {
              if (r2Verified) return;
              const idx = r2Placed[slot];
              if (idx === undefined) return;
              const next = { ...r2Placed };
              delete next[slot];
              setR2Placed(next);
              setR2Picked(idx);
            }}
            onPlaceIn={(slot, explicitIdx) => {
              if (r2Verified) return;
              const idx = explicitIdx !== undefined ? explicitIdx : r2Picked;
              if (idx === null || idx === undefined) {
                if (r2Placed[slot] !== undefined) { const next = { ...r2Placed }; delete next[slot]; setR2Placed(next); }
                return;
              }
              const next = { ...r2Placed };
              for (const k of Object.keys(next)) if (next[k] === idx) delete next[k];
              next[slot] = idx;
              setR2Placed(next);
              setR2Picked(null);
            }}
          />
        )}
        {ronda === 2 && (
          <BurbujasCard data={r3Current}
            picked={r3Picked} locked={r3Locked}
            onToggle={(w) => { if (r3Locked) return; const next = new Set(r3Picked); if (next.has(w)) next.delete(w); else next.add(w); setR3Picked(next); }}
          />
        )}
      </div>

      <ActionRail
        canVerify={canVerify}
        onVerify={handleVerify}
        showErase={showErase}
        onErase={handleErase}
        onRestart={() => setConfirmingExit(true)}
        onExit={() => setConfirmingActualExit(true)}
      />

      <FeedbackOverlay feedback={feedback} feedbackMsg={feedbackMsg} charName={char.name} />
      <RestartModal confirmingExit={confirmingExit} setConfirmingExit={setConfirmingExit} attempted={attempted} total={3} onRestart={onRestart} />
      <ExitModal confirmingExit={confirmingActualExit} setConfirmingExit={setConfirmingActualExit} attempted={attempted} total={3} onExit={() => go("home")} />
    </div>
  );
}

function TiposTriviaCard({ pick, selected, locked, onSelect }) {
  function choose(tipo) {
    if (locked) return;
    onSelect && onSelect(tipo);
  }

  return (
    <div style={{
      display: "flex", flexDirection: "row", alignItems: "center",
      justifyContent: "center", height: "100%", gap: 22, padding: "0 4px",
    }}>
      {/* Texto a la izquierda — usa el espacio vertical disponible */}
      <div style={{
        flex: "1 1 0", maxWidth: 320, minHeight: 180,
        background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(245,238,225,0.95))",
        border: "3px solid #f2c260",
        borderRadius: 18,
        padding: "20px 22px",
        boxShadow: "0 10px 24px rgba(0,0,0,0.45)",
        color: "#3a2608",
        display: "flex", flexDirection: "column", justifyContent: "center",
      }}>
        <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 17, marginBottom: 8 }}>
          {pick.titulo}
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.4, fontStyle: "italic" }}>"{pick.fragmento}"</div>
      </div>
      {/* Opciones en columna vertical a la derecha */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "stretch", minWidth: 160 }}>
        {[
          { id: "literario",   label: "LITERARIO",   color: "#ffc06e" },
          { id: "informativo", label: "INFORMATIVO", color: "#ffe97a" },
          { id: "funcional",   label: "FUNCIONAL",   color: "#7ab8ff" },
        ].map((opt) => (
          <button key={opt.id} onClick={() => choose(opt.id)}
            disabled={locked}
            style={{
              padding: "14px 18px", borderRadius: 14,
              background: selected === opt.id ? "linear-gradient(180deg,#fce9a8,#d9a441)" : "rgba(255,255,255,0.92)",
              color: "#3a2608", border: `3px solid ${opt.color}`,
              fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 14, letterSpacing: "0.04em",
              cursor: locked ? "default" : "pointer",
              boxShadow: selected === opt.id
                ? "0 0 0 4px rgba(255,255,255,1), 0 0 0 8px rgba(252,233,168,0.65), 0 0 38px rgba(252,233,168,0.9), 0 8px 22px -4px rgba(0,0,0,0.55)"
                : "0 6px 14px rgba(0,0,0,0.35)",
              transform: selected === opt.id ? "translateY(-4px) scale(1.04)" : "none",
              transition: "all 0.18s ease",
              opacity: locked && selected !== opt.id ? 0.5 : 1,
            }}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function OrganizadorCard({ pick, pieces, placed, picked, verified, onPickPiece, onPickFromSlot, onPlaceIn }) {
  // 4 cuadros (2x2) alrededor de la palabra central + bandeja con piezas.
  // Soporta DRAG (HTML5) y tap-to-place, también desde slot a slot.
  const LABELS = { definicion: "Definición", oracion: "Oración", sinonimo: "Sinónimo", dibujo: "Dibujo" };
  const [dragIdx, setDragIdx] = React.useState(null);
  const [dragOverSlot, setDragOverSlot] = React.useState(null);

  const pickPiece = (idx) => onPickPiece && onPickPiece(idx);
  const pickFromSlot = (slot) => onPickFromSlot && onPickFromSlot(slot);
  const placeIn = (slot, explicitIdx) => onPlaceIn && onPlaceIn(slot, explicitIdx);

  function renderSlot(slot, pos) {
    const idx = placed[slot];
    const piece = idx !== undefined ? pieces[idx] : null;
    const correct = verified && piece && piece.slot === slot;
    const wrong = verified && piece && piece.slot !== slot;
    const isHover = dragOverSlot === slot;
    const isDragSource = piece && dragIdx === idx;
    return (
      <div key={slot}
        // Tap: si tiene pieza y nada en mano → la levanta. Si no, intenta placeIn.
        onClick={() => {
          if (verified) return;
          if (piece && picked === null) { pickFromSlot(slot); return; }
          placeIn(slot);
        }}
        // Drag-source: la pieza colocada se puede arrastrar a otro slot.
        draggable={!verified && !!piece}
        onDragStart={(e) => {
          if (verified || !piece) return;
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", String(idx));
          setDragIdx(idx);
        }}
        onDragEnd={() => { setDragIdx(null); setDragOverSlot(null); }}
        onDragOver={(e) => { if (!verified) { e.preventDefault(); setDragOverSlot(slot); } }}
        onDragLeave={() => setDragOverSlot((s) => s === slot ? null : s)}
        onDrop={(e) => {
          if (verified) return;
          e.preventDefault();
          const raw = e.dataTransfer.getData("text/plain");
          const dIdx = parseInt(raw, 10);
          setDragOverSlot(null);
          setDragIdx(null);
          if (!Number.isNaN(dIdx)) placeIn(slot, dIdx);
        }}
        style={{
          ...pos,
          position: "absolute",
          width: 170, height: 70,
          border: `2px dashed ${correct ? "#2ecc8f" : wrong ? "#ff6b6b" : isHover ? "#4fd8ff" : "rgba(252,233,168,0.55)"}`,
          background: piece
            ? "linear-gradient(180deg, rgba(252,233,168,0.95), rgba(217,164,65,0.85))"
            : isHover ? "rgba(79,216,255,0.18)" : "rgba(10,6,35,0.55)",
          color: piece ? "#3a2608" : "rgba(252,233,168,0.65)",
          fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 12, lineHeight: 1.2,
          borderRadius: 12, padding: "8px 10px",
          cursor: verified ? "default" : (piece ? "grab" : "pointer"),
          userSelect: "none",
          textAlign: piece && piece.slot === "dibujo" && piece.text.length < 4 ? "center" : "left",
          overflow: "hidden",
          opacity: isDragSource ? 0.4 : 1,
          boxShadow: isHover ? "0 0 12px rgba(79,216,255,0.5)" : "none",
          transition: "background 0.15s, border-color 0.15s, opacity 0.15s",
        }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.06em", color: piece ? "#3a2608" : "#a78bfa", textTransform: "uppercase", marginBottom: 2 }}>
          {LABELS[slot]}
        </div>
        <div style={{ fontSize: piece && piece.text.length < 4 ? 28 : 11, lineHeight: 1.15 }}>
          {piece ? piece.text : "(vacío)"}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "absolute", inset: 0, padding: "0 8px",
      display: "flex", flexDirection: "column", justifyContent: "center", gap: 14 }}>

      {/* Cuadros (2×2) con palabra central — alto fijo */}
      <div style={{ position: "relative", height: 210 }}>
        {renderSlot("definicion", { left: "8%",  top: 0 })}
        {renderSlot("oracion",    { right: "8%", top: 0 })}
        {renderSlot("sinonimo",   { left: "8%",  bottom: 0 })}
        {renderSlot("dibujo",     { right: "8%", bottom: 0 })}

        {/* Palabra central */}
        <div style={{
          position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)",
          background: "linear-gradient(180deg, #f2c260, #d9a441)",
          border: "3px solid rgba(255,255,255,0.85)",
          padding: "10px 22px", borderRadius: 999,
          fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 16, color: "#3a2608",
          boxShadow: "0 8px 18px rgba(0,0,0,0.45)",
          whiteSpace: "nowrap",
        }}>
          {pick.palabra}
        </div>
      </div>

      {/* Bandeja con piezas (sólo las no colocadas) — pegada a los slots, sin gap muerto */}
      <div data-qa="bandeja" style={{
        background: "rgba(10,6,35,0.45)",
        border: "1px dashed rgba(252,233,168,0.3)",
        borderRadius: 12,
        padding: "10px 8px",
        display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap",
        minHeight: 56,
      }}>
        {pieces.map((p, i) => {
          if (Object.values(placed).includes(i)) return null;
          const isPicked = picked === i;
          const isDragging = dragIdx === i;
          return (
            <div key={i}
              draggable={!verified}
              onDragStart={(e) => {
                if (verified) return;
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", String(i));
                setDragIdx(i);
              }}
              onDragEnd={() => { setDragIdx(null); setDragOverSlot(null); }}
              onClick={() => { if (!verified) pickPiece(i); }}
              style={{
                padding: "8px 12px", maxWidth: 180,
                background: isPicked ? "linear-gradient(180deg,#fce9a8,#d9a441)" : "rgba(255,255,255,0.92)",
                color: "#3a2608",
                border: `2px solid ${isPicked ? "#4fd8ff" : "rgba(242,194,96,0.65)"}`,
                borderRadius: 10,
                fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: p.text.length < 4 ? 24 : 11,
                lineHeight: 1.2,
                cursor: verified ? "default" : "grab",
                userSelect: "none",
                opacity: isDragging ? 0.4 : 1,
                boxShadow: isPicked ? "0 0 14px rgba(79,216,255,0.6)" : "0 4px 10px rgba(0,0,0,0.3)",
                transition: "opacity 0.15s",
              }}>
              {p.text}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BurbujasCard({ data, picked, locked, onToggle }) {
  function toggle(word) {
    if (locked) return;
    onToggle && onToggle(word);
  }
  // 7 burbujas distribuidas alrededor del centro: 1 arriba · 2 medio · 2 medio · 2 abajo.
  const positions = [
    { left: "40%", top: "2%"  },  // arriba centro
    { left: "5%",  top: "30%" },  // medio-izq
    { left: "75%", top: "30%" },  // medio-der
    { left: "5%",  top: "65%" },  // abajo-izq
    { left: "75%", top: "65%" },  // abajo-der
    { left: "20%", top: "92%" },  // base-izq
    { left: "60%", top: "92%" },  // base-der
  ];

  return (
    <div style={{ position: "absolute", inset: 0, padding: "0 8px" }}>
      <div style={{ position: "relative", height: "100%" }}>
        {/* Burbuja central */}
        <div style={{
          position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)",
          background: `linear-gradient(180deg, ${data.color}, #d9a441)`,
          border: "3px solid rgba(255,255,255,0.85)",
          padding: "14px 24px", borderRadius: 999,
          fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 13, color: "#3a2608",
          boxShadow: "0 8px 18px rgba(0,0,0,0.45)",
          whiteSpace: "nowrap", textAlign: "center",
        }}>
          {data.centro}
        </div>

        {/* Burbujas exteriores */}
        {data.burbujas.map((w, i) => {
          const pos = positions[i] || { left: "50%", top: "90%" };
          const isPicked = picked.has(w);
          const isCorrect = data.correctos.includes(w);
          const showResult = locked;
          let bg = isPicked ? "linear-gradient(180deg,#ff9ecf,#c5418f)" : "rgba(255,255,255,0.92)";
          let border = isPicked ? "#c5418f" : "rgba(242,194,96,0.55)";
          if (showResult) {
            if (isCorrect && isPicked)       { bg = "linear-gradient(180deg,#9bf2c6,#2ecc8f)"; border = "#2ecc8f"; }
            else if (isCorrect && !isPicked) { bg = "linear-gradient(180deg,#fce9a8,#f2c260)"; border = "#f2c260"; }
            else if (!isCorrect && isPicked) { bg = "linear-gradient(180deg,#ffb3b3,#ff6b6b)"; border = "#ff6b6b"; }
          }
          return (
            <button key={i} onClick={() => toggle(w)} disabled={locked}
              style={{
                position: "absolute", ...pos,
                padding: "10px 16px", borderRadius: 999,
                background: bg, color: "#3a2608", border: `2px solid ${border}`,
                fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 12,
                cursor: locked ? "default" : "pointer",
                boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
                whiteSpace: "nowrap",
              }}>
              {w}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TEMA 2 · PoeticaGame — 3 rondas:
//   R1: Trivia 3 botones (POÉTICA / INFORMA / PIDE ALGO)
//   R2: Empareja refrán ↔ significado (tap-tap líneas)
//   R3: Encerrar figuras literarias en versos (tap múltiple)
// ─────────────────────────────────────────────────────────────
function PoeticaGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "Lenguaje poético";

  const [ronda, setRonda] = useStateG(0);

  // R1 — pick aleatorio
  const [r1Pick] = useStateG(() => {
    const recent = new Set(getRecent("poetica"));
    let pool = FUNCIONES_BANK.filter((t) => !recent.has(t.id));
    if (pool.length === 0) pool = FUNCIONES_BANK;
    const p = pool[Math.floor(Math.random() * pool.length)];
    pushRecent("poetica", p.id);
    return p;
  });

  // R2 — 3 refranes al azar (con su significado)
  const [r2Pairs] = useStateG(() => {
    const recent = new Set(getRecent("poetica"));
    let pool = REFRANES_BANK.filter((t) => !recent.has(t.id));
    if (pool.length < 3) pool = REFRANES_BANK;
    const picks = shuffle(pool).slice(0, 3);
    picks.forEach((p) => pushRecent("poetica", p.id));
    return picks;
  });

  // R3 — pick aleatorio del banco de poemas
  const [r3Pick] = useStateG(() => {
    const recent = new Set(getRecent("poetica"));
    let pool = POEMAS_BANK.filter((t) => !recent.has(t.id));
    if (pool.length === 0) pool = POEMAS_BANK;
    const p = pool[Math.floor(Math.random() * pool.length)];
    pushRecent("poetica", p.id);
    return p;
  });

  // Estados del shell
  const [elapsed, setElapsed] = useStateG(0);
  const [stars, setStars] = useStateG(0);
  const [solved, setSolved] = useStateG(0);
  const [attempted, setAttempted] = useStateG(0);
  const [starsSession, setStarsSession] = useStateG(0);
  const [feedback, setFeedback] = useStateG(null);
  const [feedbackMsg, setFeedbackMsg] = useStateG("");
  const [confirmingExit, setConfirmingExit] = useStateG(false);
  const [confirmingActualExit, setConfirmingActualExit] = useStateG(false);
  const [log, setLog] = useStateG([]);
  const started = useRefG(Date.now());
  const exerciseStart = useRefG(Date.now());

  // States levantados de las cards
  const [r1Selected, setR1Selected] = useStateG(null);
  const [r1Locked, setR1Locked] = useStateG(false);
  const [r2RightOrder] = useStateG(() => shuffle(r2Pairs.map((p, i) => ({ origIdx: i, sig: p.significado }))));
  const [r2SelectedLeft, setR2SelectedLeft] = useStateG(null);
  const [r2Connections, setR2Connections] = useStateG({});
  const [r2Verified, setR2Verified] = useStateG(false);
  const [r3Picked, setR3Picked] = useStateG(new Set());
  const [r3Locked, setR3Locked] = useStateG(false);

  useEffectG(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started.current) / 1000)), 500);
    return () => clearInterval(id);
  }, []);

  useEffectG(() => {
    window.__currentChalkGlyphs = [
      { c: "✨", l: "6%",  t: "12%", r: "-8deg" },
      { c: "💫", l: "82%", t: "16%", r: "6deg",  s: "0.62em" },
      { c: "✏",  l: "10%", t: "78%", r: "12deg", s: "0.7em" },
      { c: "*",  l: "88%", t: "72%", r: "-10deg", s: "0.5em" },
      { c: "❤",  l: "45%", t: "8%",  r: "4deg",  s: "0.55em" },
      { c: "🌙", l: "3%",  t: "45%", r: "-4deg", s: "0.5em" },
      { c: "📖", l: "92%", t: "45%", r: "8deg",  s: "0.5em" },
      { c: "¿",  l: "30%", t: "55%", r: "-6deg", s: "0.55em" },
      { c: "¡",  l: "70%", t: "62%", r: "8deg",  s: "0.55em" },
      { c: "✨", l: "55%", t: "30%", r: "-4deg", s: "0.46em" },
    ];
    return () => { window.__currentChalkGlyphs = null; };
  }, []);

  function answer(isCorrect, userText, correctText, opIcon) {
    if (typeof window.markFirstAttempt === "function") window.markFirstAttempt();
    const exerciseSec = Math.max(0, Math.floor((Date.now() - exerciseStart.current) / 1000));
    const earned = calcStars(isCorrect, exerciseSec);
    const newAttempted = attempted + 1;
    const newSolved = solved + (isCorrect ? 1 : 0);
    const newStarsTotal = stars + earned;
    const newStarsSession = starsSession + earned;
    const entry = { idx: newAttempted, a: correctText, b: userText, op: opIcon || "·",
      correctAnswer: correctText, userAnswer: userText, isCorrect, time: exerciseSec, earned };
    const newLog = [...log, entry];

    setFeedback(isCorrect ? "ok" : "err");
    setFeedbackMsg(isCorrect ? `+${earned} ⭐` : ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]);
    setAttempted(newAttempted); setSolved(newSolved); setStars(newStarsTotal);
    setStarsSession(newStarsSession); setLog(newLog);

    const wait = isCorrect ? 950 : 1200;
    setTimeout(() => {
      setFeedback(null); setFeedbackMsg("");
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

  const canVerify =
    ronda === 0 ? (r1Selected !== null && !r1Locked) :
    ronda === 1 ? (Object.keys(r2Connections).length === r2Pairs.length && !r2Verified) :
    ronda === 2 ? (r3Picked.size > 0 && !r3Locked) :
    false;
  const showErase = ronda !== 0;

  function handleVerify() {
    if (!canVerify) return;
    if (ronda === 0) {
      setR1Locked(true);
      answer(r1Selected === r1Pick.funcion, r1Selected, r1Pick.funcion, "✨");
    } else if (ronda === 1) {
      setR2Verified(true);
      let ok = true;
      for (let i = 0; i < r2Pairs.length; i++) {
        const ri = r2Connections[i];
        if (ri === undefined) { ok = false; break; }
        if (r2RightOrder[ri].origIdx !== i) { ok = false; break; }
      }
      setTimeout(() => answer(ok, JSON.stringify(r2Connections), "ok", "🔗"), 400);
    } else if (ronda === 2) {
      setR3Locked(true);
      const correctSet = new Set();
      r3Pick.versos.forEach((v, i) => { if (v.figura) correctSet.add(i); });
      let ok = r3Picked.size === correctSet.size;
      if (ok) for (const i of r3Picked) if (!correctSet.has(i)) { ok = false; break; }
      setTimeout(() => answer(ok, Array.from(r3Picked).join(","), Array.from(correctSet).join(","), "✨"), 400);
    }
  }

  function handleErase() {
    if (ronda === 1) {
      if (r2Verified) return;
      setR2Connections({});
      setR2SelectedLeft(null);
    } else if (ronda === 2) {
      if (r3Locked) return;
      setR3Picked(new Set());
    }
  }

  const enunciado =
    ronda === 0 ? "¿Qué función cumple esta oración?" :
    ronda === 1 ? "Une cada refrán con su significado." :
    "Encuentra las figuras literarias del poema.";

  const bocadillo =
    ronda === 0 ? "Lee y elige. Después ¡VERIFICA!" :
    ronda === 1 ? "Toca un refrán y luego su significado." :
    "Toca los versos con figuras y ¡VERIFICA!";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <GameHUD elapsed={elapsed} stars={stars} attempted={attempted} solved={solved} total={3} app={app} setApp={setApp} />

      <CharacterCorner char={char} message={bocadillo} />
      <GameEnunciado text={enunciado} />

      <div data-qa="zona-central" style={{
        position: "absolute", top: 128, left: 240, right: 168, bottom: 14,
      }}>
        {ronda === 0 && (
          <PoeticaTriviaCard pick={r1Pick}
            selected={r1Selected} locked={r1Locked}
            onSelect={(t) => { if (!r1Locked) setR1Selected(r1Selected === t ? null : t); }}
          />
        )}
        {ronda === 1 && (
          <RefranesCard pairs={r2Pairs} rightOrder={r2RightOrder}
            selectedLeft={r2SelectedLeft} connections={r2Connections} verified={r2Verified}
            onTapLeft={(i) => { if (r2Verified) return; setR2SelectedLeft(r2SelectedLeft === i ? null : i); }}
            onTapRight={(rightIdx) => {
              if (r2Verified) return;
              if (r2SelectedLeft === null) {
                const k = Object.entries(r2Connections).find(([_, v]) => v === rightIdx);
                if (k) { const next = { ...r2Connections }; delete next[k[0]]; setR2Connections(next); }
                return;
              }
              const next = { ...r2Connections };
              delete next[r2SelectedLeft];
              for (const k of Object.keys(next)) if (next[k] === rightIdx) delete next[k];
              next[r2SelectedLeft] = rightIdx;
              setR2Connections(next);
              setR2SelectedLeft(null);
            }}
          />
        )}
        {ronda === 2 && (
          <FigurasCard poema={r3Pick}
            picked={r3Picked} locked={r3Locked}
            onToggle={(i) => { if (r3Locked) return; const next = new Set(r3Picked); if (next.has(i)) next.delete(i); else next.add(i); setR3Picked(next); }}
          />
        )}
      </div>

      <ActionRail
        canVerify={canVerify}
        onVerify={handleVerify}
        showErase={showErase}
        onErase={handleErase}
        onRestart={() => setConfirmingExit(true)}
        onExit={() => setConfirmingActualExit(true)}
      />

      <FeedbackOverlay feedback={feedback} feedbackMsg={feedbackMsg} charName={char.name} />
      <RestartModal confirmingExit={confirmingExit} setConfirmingExit={setConfirmingExit} attempted={attempted} total={3} onRestart={onRestart} />
      <ExitModal confirmingExit={confirmingActualExit} setConfirmingExit={setConfirmingActualExit} attempted={attempted} total={3} onExit={() => go("home")} />
    </div>
  );
}

function PoeticaTriviaCard({ pick, selected, locked, onSelect }) {
  function choose(f) {
    if (locked) return;
    onSelect && onSelect(f);
  }
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "100%", gap: 22, padding: "0 8px",
    }}>
      <div style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(245,238,225,0.95))",
        border: "3px solid #f2c260", borderRadius: 18,
        padding: "20px 24px", boxShadow: "0 10px 24px rgba(0,0,0,0.45)",
        maxWidth: 480, color: "#3a2608",
        fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 18, lineHeight: 1.3,
        textAlign: "center", fontStyle: "italic",
      }}>
        "{pick.oracion}"
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        {[
          { id: "poetica", label: "POÉTICA",   color: "#ffe97a" },
          { id: "informa", label: "INFORMA",   color: "#7ab8ff" },
          { id: "pide",    label: "PIDE ALGO", color: "#ffc06e" },
        ].map((opt) => (
          <button key={opt.id} onClick={() => choose(opt.id)} disabled={locked}
            style={{
              padding: "14px 20px", borderRadius: 14,
              background: selected === opt.id ? "linear-gradient(180deg,#fce9a8,#d9a441)" : "rgba(255,255,255,0.92)",
              color: "#3a2608", border: `3px solid ${opt.color}`,
              fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 14, letterSpacing: "0.04em",
              cursor: locked ? "default" : "pointer",
              boxShadow: selected === opt.id
                ? "0 0 0 4px rgba(255,255,255,1), 0 0 0 8px rgba(252,233,168,0.65), 0 0 38px rgba(252,233,168,0.9), 0 8px 22px -4px rgba(0,0,0,0.55)"
                : "0 6px 14px rgba(0,0,0,0.35)",
              transform: selected === opt.id ? "translateY(-4px) scale(1.04)" : "none",
              transition: "all 0.18s ease",
              opacity: locked && selected !== opt.id ? 0.5 : 1,
            }}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function RefranesCard({ pairs, rightOrder, selectedLeft, connections, verified, onTapLeft, onTapRight }) {
  // Componente CONTROLADO — state vive en el padre.
  const tapLeft = (i) => onTapLeft && onTapLeft(i);
  const tapRight = (rightIdx) => onTapRight && onTapRight(rightIdx);

  return (
    <div style={{ position: "absolute", inset: 0, padding: "8px 8px" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 14px 1fr", gap: 12, height: "100%", alignItems: "center" }}>
          {/* Columna izquierda — refranes */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pairs.map((p, i) => {
              const isSel = selectedLeft === i;
              const isConnected = connections[i] !== undefined;
              const isCorrect = verified && connections[i] !== undefined && rightOrder[connections[i]].origIdx === i;
              const isWrong   = verified && (connections[i] === undefined || rightOrder[connections[i]].origIdx !== i);
              let border = "rgba(242,194,96,0.55)";
              if (isSel) border = "#4fd8ff";
              if (isCorrect) border = "#2ecc8f";
              if (isWrong) border = "#ff6b6b";
              return (
                <button key={i} onClick={() => tapLeft(i)} disabled={verified}
                  style={{
                    padding: "10px 12px", borderRadius: 12,
                    background: isConnected ? "linear-gradient(180deg,#fce9a8,#d9a441)" : "rgba(255,255,255,0.92)",
                    color: "#3a2608", border: `2px solid ${border}`,
                    fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 13, lineHeight: 1.25,
                    textAlign: "left", cursor: "pointer",
                    boxShadow: isSel ? "0 0 14px rgba(79,216,255,0.6)" : "0 4px 10px rgba(0,0,0,0.35)",
                  }}>
                  "{p.refran}"
                </button>
              );
            })}
          </div>
          {/* Columna central — indicadores */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center", justifyContent: "center" }}>
            {pairs.map((_, i) => {
              const has = connections[i] !== undefined;
              return <div key={i} style={{
                width: 12, height: 12, borderRadius: "50%",
                background: has ? "#fce9a8" : "rgba(255,255,255,0.2)",
                border: "1px solid rgba(252,233,168,0.5)",
              }} />;
            })}
          </div>
          {/* Columna derecha — significados */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rightOrder.map((r, j) => {
              const usedBy = Object.entries(connections).find(([_, v]) => v === j);
              const isConnected = !!usedBy;
              const leftI = usedBy ? Number(usedBy[0]) : null;
              const isCorrect = verified && isConnected && r.origIdx === leftI;
              const isWrong   = verified && isConnected && r.origIdx !== leftI;
              let border = "rgba(242,194,96,0.55)";
              if (isCorrect) border = "#2ecc8f";
              if (isWrong) border = "#ff6b6b";
              return (
                <button key={j} onClick={() => tapRight(j)} disabled={verified}
                  style={{
                    padding: "10px 12px", borderRadius: 12,
                    background: isConnected ? "linear-gradient(180deg,#fce9a8,#d9a441)" : "rgba(255,255,255,0.92)",
                    color: "#3a2608", border: `2px solid ${border}`,
                    fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 12, lineHeight: 1.25,
                    textAlign: "left", cursor: "pointer", boxShadow: "0 4px 10px rgba(0,0,0,0.35)",
                  }}>
                  {r.sig}
                </button>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}

function FigurasCard({ poema, picked, locked, onToggle }) {
  function toggle(i) {
    if (locked) return;
    onToggle && onToggle(i);
  }

  return (
    <div style={{ position: "absolute", inset: 0, padding: "0 8px",
      display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        margin: "0 auto", maxWidth: 480,
        background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(245,238,225,0.95))",
        border: "3px solid #f2c260", borderRadius: 14,
        padding: "12px 18px",
        boxShadow: "0 10px 24px rgba(0,0,0,0.45)",
        display: "flex", flexDirection: "column", gap: 6,
      }}>
        <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 12, color: "#a78bfa", letterSpacing: "0.06em", textTransform: "uppercase", textAlign: "center" }}>
          {poema.titulo}
        </div>
        {poema.versos.map((v, i) => {
          const isPicked = picked.has(i);
          const isCorrect = locked && v.figura;
          const isWrong   = locked && isPicked && !v.figura;
          const missed    = locked && v.figura && !isPicked;
          let bg = isPicked ? "linear-gradient(180deg,#fce9a8,#d9a441)" : "transparent";
          let color = isPicked ? "#3a2608" : "#3a2608";
          let border = isPicked ? "#d9a441" : "transparent";
          if (locked) {
            if (isCorrect && isPicked) { bg = "linear-gradient(180deg,#9bf2c6,#2ecc8f)"; border = "#2ecc8f"; }
            else if (isWrong)           { bg = "linear-gradient(180deg,#ffb3b3,#ff6b6b)"; border = "#ff6b6b"; color = "#fff"; }
            else if (missed)            { bg = "linear-gradient(180deg,#fce9a8,#f2c260)"; border = "#f2c260"; }
          }
          return (
            <button key={i} onClick={() => toggle(i)} disabled={locked}
              style={{
                padding: "8px 12px", borderRadius: 10,
                background: bg, color, border: `2px solid ${border}`,
                fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 14, lineHeight: 1.3,
                textAlign: "left", cursor: locked ? "default" : "pointer",
                fontStyle: "italic",
              }}>
              {v.texto}
            </button>
          );
        })}
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TEMA 3 · EscrituraGame — 3 rondas:
//   R1: Ordena las 6 partes del informe (drag a slots numerados)
//   R2: Conector correcto (trivia 3 botones, función arriba)
//   R3: Caza los errores (tap múltiple sobre palabras)
// ─────────────────────────────────────────────────────────────
function EscrituraGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "Escritura académica";

  const [ronda, setRonda] = useStateG(0);

  const [r1Pick] = useStateG(() => {
    return INFORME_CONTEXTOS[Math.floor(Math.random() * INFORME_CONTEXTOS.length)];
  });

  const [r2Pick] = useStateG(() => {
    const recent = new Set(getRecent("escritura"));
    let pool = CONECTORES_BANK.filter((t) => !recent.has(t.id));
    if (pool.length === 0) pool = CONECTORES_BANK;
    const p = pool[Math.floor(Math.random() * pool.length)];
    pushRecent("escritura", p.id);
    return p;
  });

  const [r3Pick] = useStateG(() => {
    const recent = new Set(getRecent("escritura"));
    let pool = ERRORES_BANK.filter((t) => !recent.has(t.id));
    if (pool.length === 0) pool = ERRORES_BANK;
    const p = pool[Math.floor(Math.random() * pool.length)];
    pushRecent("escritura", p.id);
    return p;
  });

  const [elapsed, setElapsed] = useStateG(0);
  const [stars, setStars] = useStateG(0);
  const [solved, setSolved] = useStateG(0);
  const [attempted, setAttempted] = useStateG(0);
  const [starsSession, setStarsSession] = useStateG(0);
  const [feedback, setFeedback] = useStateG(null);
  const [feedbackMsg, setFeedbackMsg] = useStateG("");
  const [confirmingExit, setConfirmingExit] = useStateG(false);
  const [confirmingActualExit, setConfirmingActualExit] = useStateG(false);
  const [log, setLog] = useStateG([]);
  const started = useRefG(Date.now());
  const exerciseStart = useRefG(Date.now());

  // States levantados de las cards
  const [r1Pieces] = useStateG(() => shuffle(INFORME_PARTES.map((p, i) => ({ text: p, origIdx: i }))));
  const [r1Placed, setR1Placed] = useStateG([null, null, null, null, null, null]);
  const [r1Picked, setR1Picked] = useStateG(null);
  const [r1Verified, setR1Verified] = useStateG(false);
  const [r2Opciones] = useStateG(() => shuffle([r2Pick.correcta, ...r2Pick.distractores]));
  const [r2Selected, setR2Selected] = useStateG(null);
  const [r2Locked, setR2Locked] = useStateG(false);
  const [r3Picked, setR3Picked] = useStateG(new Set());
  const [r3Locked, setR3Locked] = useStateG(false);

  useEffectG(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started.current) / 1000)), 500);
    return () => clearInterval(id);
  }, []);

  useEffectG(() => {
    window.__currentChalkGlyphs = [
      { c: "📑", l: "6%",  t: "12%", r: "-8deg" },
      { c: "🖊", l: "82%", t: "16%", r: "6deg",  s: "0.62em" },
      { c: "📊", l: "10%", t: "78%", r: "12deg", s: "0.7em" },
      { c: "✓",  l: "88%", t: "72%", r: "-10deg", s: "0.5em" },
      { c: "✗",  l: "45%", t: "8%",  r: "4deg",  s: "0.5em" },
      { c: "?",  l: "3%",  t: "45%", r: "-4deg", s: "0.55em" },
      { c: ".",  l: "92%", t: "45%", r: "8deg",  s: "0.7em" },
      { c: ",",  l: "30%", t: "55%", r: "-6deg", s: "0.7em" },
      { c: ";",  l: "70%", t: "62%", r: "8deg",  s: "0.6em" },
      { c: ":",  l: "55%", t: "30%", r: "-4deg", s: "0.6em" },
    ];
    return () => { window.__currentChalkGlyphs = null; };
  }, []);

  function answer(isCorrect, userText, correctText, opIcon) {
    if (typeof window.markFirstAttempt === "function") window.markFirstAttempt();
    const exerciseSec = Math.max(0, Math.floor((Date.now() - exerciseStart.current) / 1000));
    const earned = calcStars(isCorrect, exerciseSec);
    const newAttempted = attempted + 1;
    const newSolved = solved + (isCorrect ? 1 : 0);
    const newStarsTotal = stars + earned;
    const newStarsSession = starsSession + earned;
    const entry = { idx: newAttempted, a: correctText, b: userText, op: opIcon || "·",
      correctAnswer: correctText, userAnswer: userText, isCorrect, time: exerciseSec, earned };
    const newLog = [...log, entry];
    setFeedback(isCorrect ? "ok" : "err");
    setFeedbackMsg(isCorrect ? `+${earned} ⭐` : ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]);
    setAttempted(newAttempted); setSolved(newSolved); setStars(newStarsTotal);
    setStarsSession(newStarsSession); setLog(newLog);
    const wait = isCorrect ? 950 : 1200;
    setTimeout(() => {
      setFeedback(null); setFeedbackMsg("");
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

  // r3 — parsear tokens del párrafo (algunos marcados con [..] son errores)
  const r3Tokens = useMemoG(() => {
    const arr = [];
    const regex = /(\[[^\]]+\])|(\s+)|([^\s\[\]]+)/g;
    let m;
    while ((m = regex.exec(r3Pick.tokens)) !== null) {
      if (m[1]) arr.push({ type: "err", text: m[1].slice(1, -1) });
      else if (m[2]) arr.push({ type: "space", text: m[2] });
      else arr.push({ type: "ok", text: m[3] });
    }
    return arr;
  }, [r3Pick.tokens]);

  const canVerify =
    ronda === 0 ? (r1Placed.every((p) => p !== null) && !r1Verified) :
    ronda === 1 ? (r2Selected !== null && !r2Locked) :
    ronda === 2 ? (r3Picked.size > 0 && !r3Locked) :
    false;
  const showErase = ronda !== 1;

  function handleVerify() {
    if (!canVerify) return;
    if (ronda === 0) {
      setR1Verified(true);
      let ok = true;
      for (let i = 0; i < INFORME_PARTES.length; i++) {
        if (r1Placed[i] !== INFORME_PARTES[i]) { ok = false; break; }
      }
      setTimeout(() => answer(ok, r1Placed.join(" → "), INFORME_PARTES.join(" → "), "📑"), 400);
    } else if (ronda === 1) {
      setR2Locked(true);
      answer(r2Selected === r2Pick.correcta, r2Selected, r2Pick.correcta, "🔗");
    } else if (ronda === 2) {
      setR3Locked(true);
      const correctSet = new Set();
      r3Tokens.forEach((t, i) => { if (t.type === "err") correctSet.add(i); });
      let ok = correctSet.size === r3Picked.size;
      if (ok) for (const i of r3Picked) if (!correctSet.has(i)) { ok = false; break; }
      setTimeout(() => answer(ok,
        Array.from(r3Picked).map((i) => r3Tokens[i].text).join(", "),
        r3Tokens.filter((t) => t.type === "err").map((t) => t.text).join(", "), "✗"), 400);
    }
  }

  function handleErase() {
    if (ronda === 0) {
      if (r1Verified) return;
      setR1Placed([null, null, null, null, null, null]);
      setR1Picked(null);
    } else if (ronda === 2) {
      if (r3Locked) return;
      setR3Picked(new Set());
    }
  }

  const enunciado =
    ronda === 0 ? "Ordena las partes del informe (1 a 6)." :
    ronda === 1 ? "Elige el conector correcto." :
    "Encuentra las palabras con error.";

  const bocadillo =
    ronda === 0 ? "Arrastra cada parte y ¡VERIFICA!" :
    ronda === 1 ? "Elige y ¡VERIFICA!" :
    "Toca las palabras con error y ¡VERIFICA!";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <GameHUD elapsed={elapsed} stars={stars} attempted={attempted} solved={solved} total={3} app={app} setApp={setApp} />

      <CharacterCorner char={char} message={bocadillo} />
      <GameEnunciado text={enunciado} />

      <div data-qa="zona-central" style={{
        position: "absolute", top: 128, left: 240, right: 168, bottom: 14,
      }}>
        {ronda === 0 && (
          <OrdenInformeCard contexto={r1Pick}
            pieces={r1Pieces} placed={r1Placed} picked={r1Picked} verified={r1Verified}
            onPickPiece={(text) => { if (r1Verified) return; if (r1Placed.includes(text)) return; setR1Picked(r1Picked === text ? null : text); }}
            onPlaceAt={(idx, explicitText) => {
              if (r1Verified) return;
              const text = explicitText !== undefined ? explicitText : r1Picked;
              if (text === null || text === undefined) {
                if (r1Placed[idx]) { const next = [...r1Placed]; next[idx] = null; setR1Placed(next); }
                return;
              }
              const next = [...r1Placed];
              for (let k = 0; k < next.length; k++) if (next[k] === text) next[k] = null;
              next[idx] = text;
              setR1Placed(next);
              setR1Picked(null);
            }}
          />
        )}
        {ronda === 1 && (
          <ConectoresCard pick={r2Pick} opciones={r2Opciones}
            selected={r2Selected} locked={r2Locked}
            onSelect={(opt) => { if (!r2Locked) setR2Selected(r2Selected === opt ? null : opt); }}
          />
        )}
        {ronda === 2 && (
          <ErroresCard pick={r3Pick} tokens={r3Tokens}
            picked={r3Picked} locked={r3Locked}
            onToggle={(idx) => { if (r3Locked) return; const next = new Set(r3Picked); if (next.has(idx)) next.delete(idx); else next.add(idx); setR3Picked(next); }}
          />
        )}
      </div>

      <ActionRail
        canVerify={canVerify}
        onVerify={handleVerify}
        showErase={showErase}
        onErase={handleErase}
        onRestart={() => setConfirmingExit(true)}
        onExit={() => setConfirmingActualExit(true)}
      />

      <FeedbackOverlay feedback={feedback} feedbackMsg={feedbackMsg} charName={char.name} />
      <RestartModal confirmingExit={confirmingExit} setConfirmingExit={setConfirmingExit} attempted={attempted} total={3} onRestart={onRestart} />
      <ExitModal confirmingExit={confirmingActualExit} setConfirmingExit={setConfirmingActualExit} attempted={attempted} total={3} onExit={() => go("home")} />
    </div>
  );
}

function OrdenInformeCard({ contexto, pieces, placed, picked, verified, onPickPiece, onPlaceAt }) {
  // Soporta DRAG (HTML5) y tap-to-place.
  const [dragText, setDragText] = React.useState(null);
  const [dragOverIdx, setDragOverIdx] = React.useState(null);
  const pickPiece = (text) => onPickPiece && onPickPiece(text);
  const placeAt = (idx, explicitText) => onPlaceAt && onPlaceAt(idx, explicitText);

  return (
    <div style={{ position: "absolute", inset: 0, padding: "4px 8px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{
        textAlign: "center",
        fontFamily: "var(--ed-font-display)",
        fontWeight: 800, fontSize: 13, color: "#fce9a8",
        textShadow: "0 2px 4px rgba(0,0,0,0.4)",
      }}>
        {contexto.titulo}
      </div>

      <div style={{ display: "flex", gap: 14, flex: 1, minHeight: 0 }}>
        {/* Slots numerados (izquierda) */}
        <div style={{ flex: "0 0 230px", display: "flex", flexDirection: "column", gap: 6, overflow: "auto" }}>
          {placed.map((t, i) => {
            const correct = verified && t === INFORME_PARTES[i];
            const wrong = verified && t !== INFORME_PARTES[i];
            const isHover = dragOverIdx === i;
            return (
              <div key={i}
                onClick={() => { if (!verified) placeAt(i); }}
                onDragOver={(e) => { if (!verified) { e.preventDefault(); setDragOverIdx(i); } }}
                onDragLeave={() => setDragOverIdx((x) => x === i ? null : x)}
                onDrop={(e) => {
                  if (verified) return;
                  e.preventDefault();
                  const raw = e.dataTransfer.getData("text/plain");
                  setDragOverIdx(null); setDragText(null);
                  if (raw) placeAt(i, raw);
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 12px", borderRadius: 10,
                  background: t ? "linear-gradient(180deg,#fce9a8,#d9a441)"
                    : isHover ? "rgba(79,216,255,0.18)" : "rgba(10,6,35,0.55)",
                  color: t ? "#3a2608" : "rgba(252,233,168,0.5)",
                  border: `2px dashed ${correct ? "#2ecc8f" : wrong ? "#ff6b6b" : isHover ? "#4fd8ff" : "rgba(252,233,168,0.45)"}`,
                  fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 12,
                  textAlign: "left", cursor: verified ? "default" : "pointer",
                  width: "100%", minHeight: 38,
                  boxShadow: isHover ? "0 0 12px rgba(79,216,255,0.5)" : "none",
                  transition: "background 0.15s, border-color 0.15s",
                }}>
                <span style={{ fontWeight: 800, fontSize: 14, color: t ? "#3a2608" : "#a78bfa" }}>{i + 1}.</span>
                <span style={{ flex: 1 }}>{t || "(vacío)"}</span>
              </div>
            );
          })}
        </div>

        {/* Bandeja de piezas (derecha) */}
        <div style={{
          flex: 1, minWidth: 0,
          background: "rgba(10,6,35,0.45)",
          border: "1px dashed rgba(252,233,168,0.3)",
          borderRadius: 12,
          padding: 10,
          display: "flex", flexWrap: "wrap", alignContent: "flex-start", gap: 8,
        }}>
          {pieces.map((p, i) => {
            if (placed.includes(p.text)) return null;
            const isPicked = picked === p.text;
            const isDragging = dragText === p.text;
            return (
              <div key={i}
                draggable={!verified}
                onDragStart={(e) => {
                  if (verified) return;
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", p.text);
                  setDragText(p.text);
                }}
                onDragEnd={() => { setDragText(null); setDragOverIdx(null); }}
                onClick={() => { if (!verified) pickPiece(p.text); }}
                style={{
                  padding: "8px 12px", borderRadius: 10,
                  background: isPicked ? "linear-gradient(180deg,#fce9a8,#d9a441)" : "rgba(255,255,255,0.92)",
                  color: "#3a2608",
                  border: `2px solid ${isPicked ? "#4fd8ff" : "rgba(242,194,96,0.65)"}`,
                  fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 12,
                  cursor: verified ? "default" : "grab", userSelect: "none",
                  opacity: isDragging ? 0.4 : 1,
                  boxShadow: isPicked ? "0 0 14px rgba(79,216,255,0.6)" : "0 4px 10px rgba(0,0,0,0.3)",
                  transition: "opacity 0.15s",
                }}>
                {p.text}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

function ConectoresCard({ pick, opciones, selected, locked, onSelect }) {
  function choose(opt) {
    if (locked) return;
    onSelect && onSelect(opt);
  }
  // Insertar el hueco visualmente en la oración
  const parts = pick.oracion.split("___");
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "100%", gap: 18, padding: "0 8px",
    }}>
      <div style={{
        background: "rgba(167,139,250,0.18)",
        border: "1px solid rgba(167,139,250,0.6)",
        borderRadius: 999, padding: "4px 14px",
        fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 11,
        color: "#a78bfa", letterSpacing: "0.04em", textTransform: "uppercase",
      }}>
        Tipo: {pick.funcion}
      </div>
      <div style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(245,238,225,0.95))",
        border: "3px solid #f2c260", borderRadius: 18,
        padding: "16px 22px", boxShadow: "0 10px 24px rgba(0,0,0,0.45)",
        maxWidth: 460, color: "#3a2608",
        fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 16, lineHeight: 1.4,
        textAlign: "center",
      }}>
        {parts[0]}
        <span style={{
          display: "inline-block", padding: "2px 12px", margin: "0 4px",
          borderBottom: "3px solid #a78bfa", color: "#a78bfa", fontWeight: 800, minWidth: 60,
        }}>___</span>
        {parts[1]}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        {opciones.map((opt, i) => (
          <button key={i} onClick={() => choose(opt)} disabled={locked}
            style={{
              padding: "10px 16px", borderRadius: 12,
              background: selected === opt ? "linear-gradient(180deg,#fce9a8,#d9a441)" : "rgba(255,255,255,0.92)",
              color: "#3a2608", border: "2px solid #4fa0ff",
              fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 13,
              cursor: locked ? "default" : "pointer", boxShadow: "0 4px 10px rgba(0,0,0,0.35)",
              opacity: locked && selected !== opt ? 0.5 : 1,
            }}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function ErroresCard({ pick, tokens, picked, locked, onToggle }) {
  function toggle(idx) {
    if (locked) return;
    onToggle && onToggle(idx);
  }

  return (
    <div style={{ position: "absolute", inset: 0, padding: "0 8px",
      display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        margin: "0 auto", maxWidth: 480,
        background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(245,238,225,0.95))",
        border: "3px solid #f2c260", borderRadius: 14,
        padding: "16px 18px",
        boxShadow: "0 10px 24px rgba(0,0,0,0.45)",
        color: "#3a2608", fontFamily: "var(--ed-font-display)", fontSize: 14, lineHeight: 1.6,
      }}>
        {tokens.map((t, i) => {
          if (t.type === "space") return <span key={i}>{t.text}</span>;
          const tokenIsErr = t.type === "err";
          const isPicked = picked.has(i);
          let bg = isPicked ? "rgba(167,139,250,0.4)" : "transparent";
          let color = "#3a2608";
          let outline = "none";
          if (locked) {
            if (tokenIsErr && isPicked) { bg = "rgba(46,204,143,0.45)"; outline = "2px solid #2ecc8f"; }
            else if (tokenIsErr && !isPicked) { bg = "rgba(252,233,168,0.55)"; outline = "2px solid #f2c260"; }
            else if (!tokenIsErr && isPicked) { bg = "rgba(255,107,107,0.5)"; outline = "2px solid #ff6b6b"; }
          }
          return (
            <span key={i} onClick={() => toggle(i)}
              style={{
                background: bg, padding: "2px 4px", borderRadius: 4,
                cursor: locked ? "default" : "pointer", color, outline,
                fontWeight: tokenIsErr && locked ? 800 : 600,
              }}>
              {t.text}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TEMA 4 · EnriquecimientoGame — 3 rondas:
//   R1: Descubre la palabra polisémica (trivia 3 botones con imágenes arriba)
//   R2: Elige la letra correcta (homófonas, tap 1 de 2)
//   R3: Completa el párrafo con condicional (drag de verbos a huecos)
// ─────────────────────────────────────────────────────────────
function EnriquecimientoGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "Enriquece tu lengua";

  const [ronda, setRonda] = useStateG(0);

  const [r1Pick] = useStateG(() => {
    const recent = new Set(getRecent("enriquece"));
    let pool = POLISEMIAS_BANK.filter((t) => !recent.has(t.id));
    if (pool.length === 0) pool = POLISEMIAS_BANK;
    const p = pool[Math.floor(Math.random() * pool.length)];
    pushRecent("enriquece", p.id);
    return p;
  });

  const [r2Pick] = useStateG(() => {
    const recent = new Set(getRecent("enriquece"));
    let pool = HOMOFONAS_BANK.filter((t) => !recent.has(t.id));
    if (pool.length === 0) pool = HOMOFONAS_BANK;
    const p = pool[Math.floor(Math.random() * pool.length)];
    pushRecent("enriquece", p.id);
    return p;
  });

  const [r3Pick] = useStateG(() => {
    const recent = new Set(getRecent("enriquece"));
    let pool = CONDICIONAL_BANK.filter((t) => !recent.has(t.id));
    if (pool.length === 0) pool = CONDICIONAL_BANK;
    const p = pool[Math.floor(Math.random() * pool.length)];
    pushRecent("enriquece", p.id);
    return p;
  });

  const [elapsed, setElapsed] = useStateG(0);
  const [stars, setStars] = useStateG(0);
  const [solved, setSolved] = useStateG(0);
  const [attempted, setAttempted] = useStateG(0);
  const [starsSession, setStarsSession] = useStateG(0);
  const [feedback, setFeedback] = useStateG(null);
  const [feedbackMsg, setFeedbackMsg] = useStateG("");
  const [confirmingExit, setConfirmingExit] = useStateG(false);
  const [confirmingActualExit, setConfirmingActualExit] = useStateG(false);
  const [log, setLog] = useStateG([]);
  const started = useRefG(Date.now());
  const exerciseStart = useRefG(Date.now());

  // States levantados de las cards
  const [r1Opciones] = useStateG(() => shuffle([r1Pick.palabra, ...r1Pick.distractores]));
  const [r1Selected, setR1Selected] = useStateG(null);
  const [r1Locked, setR1Locked] = useStateG(false);
  const [r2Selected, setR2Selected] = useStateG(null);
  const [r2Locked, setR2Locked] = useStateG(false);
  const [r3Opciones] = useStateG(() => shuffle([...r3Pick.correctas, ...r3Pick.distractores]));
  const [r3Placed, setR3Placed] = useStateG([null, null, null]);
  const [r3Picked, setR3Picked] = useStateG(null);
  const [r3Verified, setR3Verified] = useStateG(false);

  useEffectG(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started.current) / 1000)), 500);
    return () => clearInterval(id);
  }, []);

  useEffectG(() => {
    window.__currentChalkGlyphs = [
      { c: "🌍", l: "6%",  t: "12%", r: "-8deg" },
      { c: "💬", l: "82%", t: "16%", r: "6deg",  s: "0.62em" },
      { c: "🐭", l: "10%", t: "78%", r: "12deg", s: "0.6em" },
      { c: "🖱", l: "88%", t: "72%", r: "-10deg", s: "0.55em" },
      { c: "?",  l: "45%", t: "8%",  r: "4deg",  s: "0.6em" },
      { c: "A",  l: "3%",  t: "45%", r: "-4deg", s: "0.6em" },
      { c: "B",  l: "92%", t: "45%", r: "8deg",  s: "0.6em" },
      { c: "Z",  l: "30%", t: "55%", r: "-6deg", s: "0.55em" },
      { c: "Y",  l: "70%", t: "62%", r: "8deg",  s: "0.55em" },
      { c: "V",  l: "55%", t: "30%", r: "-4deg", s: "0.55em" },
    ];
    return () => { window.__currentChalkGlyphs = null; };
  }, []);

  function answer(isCorrect, userText, correctText, opIcon) {
    if (typeof window.markFirstAttempt === "function") window.markFirstAttempt();
    const exerciseSec = Math.max(0, Math.floor((Date.now() - exerciseStart.current) / 1000));
    const earned = calcStars(isCorrect, exerciseSec);
    const newAttempted = attempted + 1;
    const newSolved = solved + (isCorrect ? 1 : 0);
    const newStarsTotal = stars + earned;
    const newStarsSession = starsSession + earned;
    const entry = { idx: newAttempted, a: correctText, b: userText, op: opIcon || "·",
      correctAnswer: correctText, userAnswer: userText, isCorrect, time: exerciseSec, earned };
    const newLog = [...log, entry];
    setFeedback(isCorrect ? "ok" : "err");
    setFeedbackMsg(isCorrect ? `+${earned} ⭐` : ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]);
    setAttempted(newAttempted); setSolved(newSolved); setStars(newStarsTotal);
    setStarsSession(newStarsSession); setLog(newLog);
    const wait = isCorrect ? 950 : 1200;
    setTimeout(() => {
      setFeedback(null); setFeedbackMsg("");
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

  const canVerify =
    ronda === 0 ? (r1Selected !== null && !r1Locked) :
    ronda === 1 ? (r2Selected !== null && !r2Locked) :
    ronda === 2 ? (r3Placed.every((p) => p !== null) && !r3Verified) :
    false;
  const showErase = ronda === 2;

  function handleVerify() {
    if (!canVerify) return;
    if (ronda === 0) {
      setR1Locked(true);
      answer(r1Selected === r1Pick.palabra, r1Selected, r1Pick.palabra, "🔤");
    } else if (ronda === 1) {
      setR2Locked(true);
      answer(r2Selected === r2Pick.correcta, r2Selected, r2Pick.correcta, "🔠");
    } else if (ronda === 2) {
      setR3Verified(true);
      let ok = true;
      for (let i = 0; i < r3Pick.correctas.length; i++) {
        if (r3Placed[i] !== r3Pick.correctas[i]) { ok = false; break; }
      }
      setTimeout(() => answer(ok, r3Placed.join(" / "), r3Pick.correctas.join(" / "), "✏"), 400);
    }
  }

  function handleErase() {
    if (ronda === 2) {
      if (r3Verified) return;
      setR3Placed([null, null, null]);
      setR3Picked(null);
    }
  }

  const enunciado =
    ronda === 0 ? "¿Qué palabra conecta las imágenes?" :
    ronda === 1 ? "Elige la letra correcta." :
    "Completa el párrafo con los verbos correctos.";

  const bocadillo =
    ronda === 0 ? "Mira las imágenes y elige. ¡VERIFICA!" :
    ronda === 1 ? "Lee la pista y elige. ¡VERIFICA!" :
    "Arrastra cada verbo a su hueco y ¡VERIFICA!";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <GameHUD elapsed={elapsed} stars={stars} attempted={attempted} solved={solved} total={3} app={app} setApp={setApp} />

      <CharacterCorner char={char} message={bocadillo} />
      <GameEnunciado text={enunciado} />

      <div data-qa="zona-central" style={{
        position: "absolute", top: 128, left: 240, right: 168, bottom: 14,
      }}>
        {ronda === 0 && (
          <PolisemiasCard pick={r1Pick} opciones={r1Opciones}
            selected={r1Selected} locked={r1Locked}
            onSelect={(opt) => { if (!r1Locked) setR1Selected(r1Selected === opt ? null : opt); }}
          />
        )}
        {ronda === 1 && (
          <HomofonasCard pick={r2Pick}
            selected={r2Selected} locked={r2Locked}
            onSelect={(letter) => { if (!r2Locked) setR2Selected(r2Selected === letter ? null : letter); }}
          />
        )}
        {ronda === 2 && (
          <CondicionalCard pick={r3Pick} opciones={r3Opciones}
            placed={r3Placed} picked={r3Picked} verified={r3Verified}
            onPickWord={(w) => { if (r3Verified) return; if (r3Placed.includes(w)) return; setR3Picked(r3Picked === w ? null : w); }}
            onPlaceAt={(holeIdx, explicitWord) => {
              if (r3Verified) return;
              const w = explicitWord !== undefined ? explicitWord : r3Picked;
              if (w === null || w === undefined) {
                if (r3Placed[holeIdx]) { const next = [...r3Placed]; next[holeIdx] = null; setR3Placed(next); }
                return;
              }
              const next = [...r3Placed];
              for (let k = 0; k < next.length; k++) if (next[k] === w) next[k] = null;
              next[holeIdx] = w;
              setR3Placed(next);
              setR3Picked(null);
            }}
          />
        )}
      </div>

      <ActionRail
        canVerify={canVerify}
        onVerify={handleVerify}
        showErase={showErase}
        onErase={handleErase}
        onRestart={() => setConfirmingExit(true)}
        onExit={() => setConfirmingActualExit(true)}
      />

      <FeedbackOverlay feedback={feedback} feedbackMsg={feedbackMsg} charName={char.name} />
      <RestartModal confirmingExit={confirmingExit} setConfirmingExit={setConfirmingExit} attempted={attempted} total={3} onRestart={onRestart} />
      <ExitModal confirmingExit={confirmingActualExit} setConfirmingExit={setConfirmingActualExit} attempted={attempted} total={3} onExit={() => go("home")} />
    </div>
  );
}

function PolisemiasCard({ pick, opciones, selected, locked, onSelect }) {
  function choose(opt) {
    if (locked) return;
    onSelect && onSelect(opt);
  }
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "100%", gap: 18, padding: "0 8px",
    }}>
      <div style={{ display: "flex", gap: 14, alignItems: "center", justifyContent: "center" }}>
        {[{ emoji: pick.emoji1, label: pick.label1 }, { emoji: pick.emoji2, label: pick.label2 }].map((it, i) => (
          <div key={i} style={{
            width: 140, height: 130,
            background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(245,238,225,0.95))",
            border: "3px solid #f2c260", borderRadius: 14,
            boxShadow: "0 8px 18px rgba(0,0,0,0.45)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            color: "#3a2608",
          }}>
            <div style={{ fontSize: 60, lineHeight: 1 }}>{it.emoji}</div>
            <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 12, marginTop: 4 }}>
              {it.label}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        {opciones.map((opt, i) => (
          <button key={i} onClick={() => choose(opt)} disabled={locked}
            style={{
              padding: "10px 18px", borderRadius: 12,
              background: selected === opt ? "linear-gradient(180deg,#fce9a8,#d9a441)" : "rgba(255,255,255,0.92)",
              color: "#3a2608", border: "2px solid #c39cff",
              fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 14,
              cursor: locked ? "default" : "pointer", boxShadow: "0 4px 10px rgba(0,0,0,0.35)",
              opacity: locked && selected !== opt ? 0.5 : 1,
            }}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function HomofonasCard({ pick, selected, locked, onSelect }) {
  function choose(letter) {
    if (locked) return;
    onSelect && onSelect(letter);
  }
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "100%", gap: 22, padding: "0 8px",
    }}>
      <div style={{
        background: "rgba(195,156,255,0.18)",
        border: "1px solid rgba(195,156,255,0.6)",
        borderRadius: 12, padding: "8px 18px",
        color: "#c39cff", fontFamily: "var(--ed-font-display)", fontSize: 14, fontWeight: 700,
        maxWidth: 460, textAlign: "center", lineHeight: 1.3,
      }}>
        PISTA: {pick.pista}
      </div>
      <div style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(245,238,225,0.95))",
        border: "3px solid #f2c260", borderRadius: 14,
        padding: "20px 28px", boxShadow: "0 10px 24px rgba(0,0,0,0.45)",
        color: "#3a2608",
        fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 36, letterSpacing: "0.18em",
        display: "flex", alignItems: "center", gap: 4,
      }}>
        {pick.pre.split("").map((c, i) => <span key={i}>{c}</span>)}
        <span style={{
          display: "inline-block", width: 60, height: 56, borderRadius: 8,
          border: "3px dashed #c39cff", color: "#c39cff", textAlign: "center", lineHeight: "50px",
          background: locked ? (selected === pick.correcta ? "rgba(46,204,143,0.3)" : "rgba(255,107,107,0.3)") : "transparent",
        }}>{locked ? selected : "?"}</span>
        {pick.post.split("").map((c, i) => <span key={i}>{c}</span>)}
      </div>
      <div style={{ display: "flex", gap: 14 }}>
        {pick.opciones.map((opt) => (
          <button key={opt} onClick={() => choose(opt)} disabled={locked}
            style={{
              width: 84, height: 84, borderRadius: 16,
              background: selected === opt ? "linear-gradient(180deg,#fce9a8,#d9a441)" : "rgba(255,255,255,0.92)",
              color: "#3a2608", border: "3px solid #c39cff",
              fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 38,
              cursor: locked ? "default" : "pointer", boxShadow: "0 4px 10px rgba(0,0,0,0.35)",
              opacity: locked && selected !== opt ? 0.5 : 1,
            }}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function CondicionalCard({ pick, opciones, placed, picked, verified, onPickWord, onPlaceAt }) {
  // Soporta DRAG (HTML5) y tap-to-place.
  const [dragWord, setDragWord] = React.useState(null);
  const [dragOverIdx, setDragOverIdx] = React.useState(null);
  const pickWord = (w) => onPickWord && onPickWord(w);
  const placeAt = (holeIdx, explicitWord) => onPlaceAt && onPlaceAt(holeIdx, explicitWord);

  // Renderizar el párrafo intercalando texto y huecos
  const fragments = [];
  let holeIdx = 0;
  for (const item of pick.texto) {
    if (item === null) {
      const slotIdx = holeIdx;
      const filled = placed[slotIdx];
      const correct = verified && filled === pick.correctas[slotIdx];
      const wrong = verified && filled !== pick.correctas[slotIdx];
      const isHover = dragOverIdx === slotIdx;
      fragments.push(
        <span key={`h${slotIdx}`}
          onClick={() => { if (!verified) placeAt(slotIdx); }}
          onDragOver={(e) => { if (!verified) { e.preventDefault(); setDragOverIdx(slotIdx); } }}
          onDragLeave={() => setDragOverIdx((x) => x === slotIdx ? null : x)}
          onDrop={(e) => {
            if (verified) return;
            e.preventDefault();
            const raw = e.dataTransfer.getData("text/plain");
            setDragOverIdx(null); setDragWord(null);
            if (raw) placeAt(slotIdx, raw);
          }}
          style={{
            display: "inline-block",
            padding: "2px 10px", margin: "0 3px",
            background: filled ? "linear-gradient(180deg,#fce9a8,#d9a441)"
              : isHover ? "rgba(79,216,255,0.25)" : "rgba(195,156,255,0.18)",
            color: filled ? "#3a2608" : "#c39cff",
            border: `2px dashed ${correct ? "#2ecc8f" : wrong ? "#ff6b6b" : isHover ? "#4fd8ff" : "#c39cff"}`,
            borderRadius: 8, minWidth: 80,
            fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 13,
            cursor: verified ? "default" : "pointer",
            transition: "background 0.15s, border-color 0.15s",
          }}>
          {filled || "___"}
        </span>
      );
      holeIdx++;
    } else {
      fragments.push(<span key={`t${holeIdx}-${item.slice(0, 8)}`}>{item}</span>);
    }
  }

  return (
    <div style={{ position: "absolute", inset: 0, padding: "0 8px",
      display: "flex", flexDirection: "column", justifyContent: "center", gap: 14 }}>
      <div style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(245,238,225,0.95))",
        border: "3px solid #f2c260", borderRadius: 14,
        padding: "16px 20px", boxShadow: "0 10px 24px rgba(0,0,0,0.45)",
        color: "#3a2608",
        fontFamily: "var(--ed-font-display)", fontSize: 14, lineHeight: 1.9,
        textAlign: "left", maxWidth: 480, margin: "0 auto",
      }}>
        {fragments}
      </div>

      <div data-qa="bandeja" style={{
        background: "rgba(10,6,35,0.45)",
        border: "1px dashed rgba(195,156,255,0.4)",
        borderRadius: 12,
        padding: "10px 8px",
        display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap",
        minHeight: 50,
      }}>
        {opciones.map((w, i) => {
          if (placed.includes(w)) return null;
          const isPicked = picked === w;
          const isDragging = dragWord === w;
          return (
            <div key={i}
              draggable={!verified}
              onDragStart={(e) => {
                if (verified) return;
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", w);
                setDragWord(w);
              }}
              onDragEnd={() => { setDragWord(null); setDragOverIdx(null); }}
              onClick={() => { if (!verified) pickWord(w); }}
              style={{
                padding: "8px 14px", borderRadius: 10,
                background: isPicked ? "linear-gradient(180deg,#fce9a8,#d9a441)" : "rgba(255,255,255,0.92)",
                color: "#3a2608",
                border: `2px solid ${isPicked ? "#4fd8ff" : "#c39cff"}`,
                fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 13,
                cursor: verified ? "default" : "grab", userSelect: "none",
                opacity: isDragging ? 0.4 : 1,
                boxShadow: isPicked ? "0 0 14px rgba(79,216,255,0.6)" : "0 4px 10px rgba(0,0,0,0.3)",
                transition: "opacity 0.15s",
              }}>
              {w}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// RESULTS — reporte académico (compartido entre los 4 temas)
// ─────────────────────────────────────────────────────────────
function formatOp(e) {
  return `${e.op || ""} ${e.a}`;
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

Object.assign(window, { GameScreen, ResultsScreen });
