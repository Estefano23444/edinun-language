// game-screens.jsx — Juego 5. Dos niveles con mecánicas diferentes:
//   1. Reglas C, S, Z (7 años) — 3 rondas:
//      R0 Completa con letra (tap-to-place, fichas C/S/Z + VERIFICAR)
//      R1 ¿Cuál se escribe bien? (trivia 3 cartas + VERIFICAR)
//      R2 Caza-errores (shooter vertical 20s, sin VERIFICAR)
//   2. Lengua y pensamiento (13 años) — 3 rondas:
//      R0 Reacción rápida (speed quiz 30s con combo, sin VERIFICAR)
//      R1 Hashtag Match (drag-match 3↔3 con estética social + VERIFICAR)
//      R2 Anti-spam (shooter horizontal 25s, sin VERIFICAR)
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

// Anti-repetición persistente por ronda
const RECENT_KEYS = {
  csz_r0:    "edinun_juego5_csz_r0_recientes_v1",
  csz_r1:    "edinun_juego5_csz_r1_recientes_v1",
  csz_r2:    "edinun_juego5_csz_r2_recientes_v1",
  lp_r0:     "edinun_juego5_lp_r0_recientes_v1",
  lp_r1:     "edinun_juego5_lp_r1_recientes_v1",
  lp_r2:     "edinun_juego5_lp_r2_recientes_v1",
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

function pushRecent(key, item, limit) {
  const arr = getRecent(key).filter((k) => k !== item);
  arr.unshift(item);
  const trimmed = arr.slice(0, limit || RECENT_LIMIT);
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
// DATA — NIVEL 1: Reglas C, S, Z (7 años)
// Cada palabra define qué letra está oculta. La bandeja es C / S / Z.
// El bocadillo trae la regla pedagógica del libro.
// ─────────────────────────────────────────────────────────────

// R0 — Completa con letra. word: palabra completa; hideIdx: posición del char a esconder;
// correct: la letra correcta; emoji; rule: regla del libro para el bocadillo.
const CSZ_COMPLETA_POOL = [
  // C — diminutivos -CITO/-CILLA y verbos -CIR/-DUCIR
  { id: "c1", word: "pececito",   hideIdx: 4, correct: "C", emoji: "🐠", rule: "Los diminutivos en -CITO van con C." },
  { id: "c2", word: "florecilla", hideIdx: 5, correct: "C", emoji: "🌼", rule: "Los diminutivos en -CILLA van con C." },
  { id: "c3", word: "manecilla",  hideIdx: 4, correct: "C", emoji: "🕒", rule: "Los diminutivos en -CILLA van con C." },
  { id: "c4", word: "conducir",   hideIdx: 5, correct: "C", emoji: "🚗", rule: "Los verbos en -CIR/-DUCIR van con C." },
  { id: "c5", word: "traducir",   hideIdx: 5, correct: "C", emoji: "📖", rule: "Los verbos en -DUCIR van con C." },
  { id: "c6", word: "decir",      hideIdx: 2, correct: "C", emoji: "💬", rule: "Los verbos en -CIR van con C." },
  { id: "c7", word: "bendecir",   hideIdx: 5, correct: "C", emoji: "🙏", rule: "Los verbos en -DECIR van con C." },
  { id: "c8", word: "lucir",      hideIdx: 2, correct: "C", emoji: "✨", rule: "Los verbos en -CIR van con C." },
  // S — terminaciones -SIVO/-SIVA, -ÍSIMO/-ÍSIMA, -OSO/-OSA
  { id: "s1", word: "explosivo",  hideIdx: 5, correct: "S", emoji: "💥", rule: "Las palabras en -SIVO van con S." },
  { id: "s2", word: "intensivo",  hideIdx: 5, correct: "S", emoji: "⚡", rule: "Las palabras en -SIVO van con S." },
  { id: "s3", word: "expresivo",  hideIdx: 5, correct: "S", emoji: "🎭", rule: "Las palabras en -SIVO van con S." },
  { id: "s4", word: "bellísimo",  hideIdx: 5, correct: "S", emoji: "🌸", rule: "Las palabras en -ÍSIMO van con S." },
  { id: "s5", word: "lindísimo",  hideIdx: 5, correct: "S", emoji: "💖", rule: "Las palabras en -ÍSIMO van con S." },
  { id: "s6", word: "grandísimo", hideIdx: 6, correct: "S", emoji: "📏", rule: "Las palabras en -ÍSIMO van con S." },
  { id: "s7", word: "bondadoso",  hideIdx: 7, correct: "S", emoji: "😊", rule: "Las palabras en -OSO van con S." },
  { id: "s8", word: "sabroso",    hideIdx: 5, correct: "S", emoji: "🍲", rule: "Las palabras en -OSO van con S." },
  { id: "s9", word: "hermoso",    hideIdx: 5, correct: "S", emoji: "🌅", rule: "Las palabras en -OSO van con S." },
  { id: "s10",word: "maravilloso",hideIdx: 9, correct: "S", emoji: "🌟", rule: "Las palabras en -OSO van con S." },
  { id: "s11",word: "grandioso",  hideIdx: 7, correct: "S", emoji: "🏛", rule: "Las palabras en -OSO van con S." },
  { id: "s12",word: "gracioso",   hideIdx: 6, correct: "S", emoji: "😂", rule: "Las palabras en -OSO van con S." },
  // Z — abstractos -EZ/-EZA, palabras -AZ/-OZ, golpes/grandes -AZO/-AZA
  { id: "z1", word: "belleza",    hideIdx: 5, correct: "Z", emoji: "🌹", rule: "Los abstractos en -EZA van con Z." },
  { id: "z2", word: "pereza",     hideIdx: 4, correct: "Z", emoji: "😴", rule: "Los abstractos en -EZA van con Z." },
  { id: "z3", word: "tristeza",   hideIdx: 6, correct: "Z", emoji: "😢", rule: "Los abstractos en -EZA van con Z." },
  { id: "z4", word: "timidez",    hideIdx: 6, correct: "Z", emoji: "🙈", rule: "Los abstractos en -EZ van con Z." },
  { id: "z5", word: "niñez",      hideIdx: 4, correct: "Z", emoji: "👶", rule: "Los abstractos en -EZ van con Z." },
  { id: "z6", word: "paz",        hideIdx: 2, correct: "Z", emoji: "🕊", rule: "Las palabras como paz, veloz van con Z." },
  { id: "z7", word: "audaz",      hideIdx: 4, correct: "Z", emoji: "🦁", rule: "Las palabras como audaz, veloz van con Z." },
  { id: "z8", word: "veloz",      hideIdx: 4, correct: "Z", emoji: "🏃", rule: "Las palabras como veloz, audaz van con Z." },
  { id: "z9", word: "abrazo",     hideIdx: 4, correct: "Z", emoji: "🤗", rule: "Las palabras en -AZO van con Z." },
  { id: "z10",word: "pedazo",     hideIdx: 4, correct: "Z", emoji: "🍰", rule: "Las palabras en -AZO van con Z." },
  { id: "z11",word: "balonazo",   hideIdx: 6, correct: "Z", emoji: "⚽", rule: "Las palabras en -AZO van con Z." },
  { id: "z12",word: "pelotazo",   hideIdx: 6, correct: "Z", emoji: "🏐", rule: "Las palabras en -AZO van con Z." },
  { id: "z13",word: "cabezazo",   hideIdx: 6, correct: "Z", emoji: "🤕", rule: "Las palabras en -AZO van con Z." },
];

// R1 — ¿Cuál se escribe bien? pista + 3 opciones (1 correcta + 2 errores plausibles).
const CSZ_TRIVIA_POOL = [
  { id: "t1", pista: "algo muy bello",        opciones: ["bellísimo",  "bellízimo",  "bellícimo"],  correctIdx: 0, emoji: "🌸" },
  { id: "t2", pista: "lo que da un golpe",    opciones: ["abrasso",    "abraco",     "abrazo"],     correctIdx: 2, emoji: "🤗" },
  { id: "t3", pista: "no tener miedo",        opciones: ["audaz",      "audas",      "audac"],      correctIdx: 0, emoji: "🦁" },
  { id: "t4", pista: "que corre muy rápido",  opciones: ["velos",      "velocs",     "veloz"],      correctIdx: 2, emoji: "🏃" },
  { id: "t5", pista: "lo que se siente al perder", opciones: ["trizteza", "tristeza", "tristesa"],   correctIdx: 1, emoji: "😢" },
  { id: "t6", pista: "muy muy grande",        opciones: ["gransioso",  "grandioso",  "granzioso"],  correctIdx: 1, emoji: "🏛" },
  { id: "t7", pista: "que conduce algo",      opciones: ["conducir",   "consucir",   "conduzir"],   correctIdx: 0, emoji: "🚗" },
  { id: "t8", pista: "un pez pequeñito",      opciones: ["pesesito",   "pesecito",   "pececito"],   correctIdx: 2, emoji: "🐠" },
  { id: "t9", pista: "lo que hay sin guerra", opciones: ["pas",        "paz",        "pac"],        correctIdx: 1, emoji: "🕊" },
  { id: "t10",pista: "lo opuesto a feo",      opciones: ["hermoso",    "hermozo",    "hermosso"],   correctIdx: 0, emoji: "🌅" },
  { id: "t11",pista: "una comida con buen sabor", opciones: ["zabrozo","sabrozo",    "sabroso"],    correctIdx: 2, emoji: "🍲" },
  { id: "t12",pista: "muy chistoso",          opciones: ["graciozo",   "gracioso",   "grasioso"],   correctIdx: 1, emoji: "😂" },
];

// R2 — Caza-errores shooter (vertical). Banco de palabras BIEN escritas y MAL escritas
// (errores plausibles C↔S, S↔Z) sin regionalismos no ecuatorianos.
const CSZ_BIEN = [
  "belleza", "abrazo", "veloz", "paz", "audaz", "tristeza", "pereza", "niñez",
  "pececito", "florecilla", "bellísimo", "lindísimo", "hermoso", "sabroso",
  "bondadoso", "gracioso", "explosivo", "intensivo", "conducir", "traducir",
  "balonazo", "pedazo", "cabezazo", "timidez",
];
const CSZ_MAL = [
  "belleza".replace("z", "s"),       // bellesa
  "abrazo".replace("z", "s"),        // abraso
  "velos",                            // veloz mal
  "pas",                              // paz mal
  "audas",                            // audaz mal
  "trizteza",                         // tristeza mal
  "perezsa",                          // pereza mal
  "niñes",                            // niñez mal
  "pesesito",                         // pececito mal
  "floresilla",                       // florecilla mal
  "bellízimo",                        // bellísimo mal
  "lindízimo",                        // lindísimo mal
  "hermozo",                          // hermoso mal
  "sabrozo",                          // sabroso mal
  "bondadozo",                        // bondadoso mal
  "graciozo",                         // gracioso mal
  "explocivo",                        // explosivo mal
  "intencivo",                        // intensivo mal
  "consucir",                         // conducir mal
  "tradusir",                         // traducir mal
  "balonaso",                         // balonazo mal
  "pedaso",                           // pedazo mal
  "cabesaso",                         // cabezazo mal
  "timides",                          // timidez mal
];

// Mapping MAL → BIEN para que el shooter respete la anti-repetición cross-ronda
// usando la palabra base correctamente escrita como clave.
const CSZ_MAL_TO_BIEN = (() => {
  const m = {};
  CSZ_BIEN.forEach((bien, i) => { m[CSZ_MAL[i]] = bien; });
  return m;
})();

// Anti-repetición CSZ por sesión (no por ronda): si "hermoso" salió en R0,
// no vuelve a salir en R1 ni R2 dentro de la misma partida.
function normalizeCszWord(w) {
  return (w || "").toLowerCase()
    .replace(/[áàä]/g, "a").replace(/[éèë]/g, "e").replace(/[íìï]/g, "i")
    .replace(/[óòö]/g, "o").replace(/[úùü]/g, "u").replace(/ñ/g, "n");
}
function getCszSessionWords() {
  if (!window.__juego5_csz_words) window.__juego5_csz_words = new Set();
  return window.__juego5_csz_words;
}
function addCszSessionWord(w) { getCszSessionWords().add(normalizeCszWord(w)); }
function hasCszSessionWord(w) { return getCszSessionWords().has(normalizeCszWord(w)); }
function clearCszSessionWords() { window.__juego5_csz_words = new Set(); }


// ─────────────────────────────────────────────────────────────
// DATA — NIVEL 2: Lengua y pensamiento (13 años)
// ─────────────────────────────────────────────────────────────

// R0 — Carrera "¿Prejuicio o estereotipo?" — 24 frases (12+12).
// PREJUICIO: afirmación anticipada con carga negativa sobre alguien (sin conocerlo).
// ESTEREOTIPO: idea construida sobre un grupo o colectivo (generalización).
// Frases DISTINTAS de las usadas en LP_RULETA_POOL para evitar repeticiones entre rondas.
const LP_PE_POOL = [
  // PREJUICIOS — 12 frases
  { id: "pe1",  text: "Mejor no me siento al lado de él, parece raro.",              correct: "PREJUICIO" },
  { id: "pe2",  text: "No la invito al cumpleaños, seguro no le va a gustar.",       correct: "PREJUICIO" },
  { id: "pe3",  text: "Asumir que alguien es flojo solo por cómo se viste.",         correct: "PREJUICIO" },
  { id: "pe4",  text: "No quiero hacer el trabajo grupal con él, no me da confianza.", correct: "PREJUICIO" },
  { id: "pe5",  text: "Esa chica nueva no me cae bien, no sé por qué.",              correct: "PREJUICIO" },
  { id: "pe6",  text: "Si tiene tatuajes, mejor mantente lejos.",                    correct: "PREJUICIO" },
  { id: "pe7",  text: "No le presto el cuaderno, seguro no me lo devuelve.",         correct: "PREJUICIO" },
  { id: "pe8",  text: "Ese profesor parece malo desde antes de la primera clase.",   correct: "PREJUICIO" },
  { id: "pe9",  text: "Mejor no hago amigos con los nuevos del salón.",              correct: "PREJUICIO" },
  { id: "pe10", text: "Su mirada me dice que no es buena persona.",                  correct: "PREJUICIO" },
  { id: "pe11", text: "Mejor no juego con ella, parece aburrida.",                   correct: "PREJUICIO" },
  { id: "pe12", text: "No le voy a hablar, seguro es pesado.",                       correct: "PREJUICIO" },
  // ESTEREOTIPOS — 12 frases
  { id: "es1",  text: "Los niños no son buenos en la cocina.",                       correct: "ESTEREOTIPO" },
  { id: "es2",  text: "Las niñas no son buenas en matemáticas.",                     correct: "ESTEREOTIPO" },
  { id: "es3",  text: "Los profes no entienden lo que pasa en redes.",               correct: "ESTEREOTIPO" },
  { id: "es4",  text: "Los deportistas no leen libros.",                              correct: "ESTEREOTIPO" },
  { id: "es5",  text: "Los músicos no quieren estudiar otras cosas.",                correct: "ESTEREOTIPO" },
  { id: "es6",  text: "Los políticos siempre mienten, todos sin excepción.",         correct: "ESTEREOTIPO" },
  { id: "es7",  text: "Los chicos de la sierra son tímidos.",                         correct: "ESTEREOTIPO" },
  { id: "es8",  text: "Los mayores no saben divertirse.",                             correct: "ESTEREOTIPO" },
  { id: "es9",  text: "Las personas con lentes son siempre estudiosas.",             correct: "ESTEREOTIPO" },
  { id: "es10", text: "Los hijos únicos son egoístas.",                               correct: "ESTEREOTIPO" },
  { id: "es11", text: "Las personas altas son buenas en básquet.",                   correct: "ESTEREOTIPO" },
  { id: "es12", text: "Los menores de edad no entienden de política.",               correct: "ESTEREOTIPO" },
];

// R1 — Cómic interactivo. 15 viñetas con un personaje que dice algo problemático.
// Cada viñeta tiene 4 opciones de respuesta:
//   - 1 EMPÁTICA (correcta — cuestiona el estereotipo/prejuicio con respeto).
//   - 1 SIGUE (valida el estereotipo).
//   - 1 INDIFERENTE (cambia el tema sin tomar posición).
//   - 1 BURLONA/AGRESIVA (otro extremo: refuerza con burla).
// La posición de la correcta VARÍA por viñeta (no patrón fijo).
const LP_COMIC_POOL = [
  {
    id: "comic1",
    avatar: "👨", name: "Andrés",
    frase: "Las mujeres no saben de fútbol, eso es un hecho.",
    options: [
      { text: "Bueno, quizá tengas razón en algunos casos.",                         isCorrect: false },
      { text: "Eso no es justo. Muchas mujeres aman y juegan fútbol.",               isCorrect: true  },
      { text: "Da igual, hablemos de otra cosa.",                                    isCorrect: false },
      { text: "Jajaja sí, son malísimas viendo partidos.",                           isCorrect: false },
    ],
  },
  {
    id: "comic2",
    avatar: "👩", name: "Sofía",
    frase: "No le des trabajo a ese chico, viene de un barrio peligroso.",
    options: [
      { text: "Tienes razón, mejor buscamos a otro candidato.",                      isCorrect: false },
      { text: "Bueno, vemos qué pasa después.",                                      isCorrect: false },
      { text: "Eso es un prejuicio. Démosle la oportunidad de mostrar quién es.",    isCorrect: true  },
      { text: "Sí, esa gente nunca cambia.",                                         isCorrect: false },
    ],
  },
  {
    id: "comic3",
    avatar: "🧑", name: "Diego",
    frase: "Los hombres no lloran, eso es ser débil.",
    options: [
      { text: "Llorar es humano. Sentir emociones no hace débil a nadie.",           isCorrect: true  },
      { text: "Sí, hay que ser fuertes siempre.",                                    isCorrect: false },
      { text: "Mejor cambiemos de tema.",                                            isCorrect: false },
      { text: "Solo lloran los nenas.",                                              isCorrect: false },
    ],
  },
  {
    id: "comic4",
    avatar: "👵", name: "Ema",
    frase: "Los adolescentes solo piensan en el celular, no les interesa nada más.",
    options: [
      { text: "Es verdad, son así toda la generación.",                              isCorrect: false },
      { text: "Bueno, los tiempos cambian abuela.",                                  isCorrect: false },
      { text: "Eso es generalizar. Hay adolescentes con muchos intereses.",          isCorrect: true  },
      { text: "Sí, son una causa perdida.",                                          isCorrect: false },
    ],
  },
  {
    id: "comic5",
    avatar: "🧓", name: "Don Tito",
    frase: "Los abuelitos no entienden tecnología, no vale la pena enseñarles.",
    options: [
      { text: "Cierto, mejor que pidan ayuda siempre.",                              isCorrect: false },
      { text: "Cualquier persona puede aprender. Tener paciencia ayuda mucho.",      isCorrect: true  },
      { text: "Yo tampoco entiendo del todo.",                                       isCorrect: false },
      { text: "Es perder el tiempo enseñarles.",                                     isCorrect: false },
    ],
  },
  {
    id: "comic6",
    avatar: "🧑‍🎓", name: "Mateo",
    frase: "Los gamers son todos antisociales, no salen de su cuarto.",
    options: [
      { text: "Tal vez. Mejor hablar con otros.",                                    isCorrect: false },
      { text: "Yo conozco a uno y sí es así.",                                       isCorrect: false },
      { text: "Solo se conectan con la pantalla, no con personas reales.",           isCorrect: false },
      { text: "Eso es un estereotipo. Muchos gamers son sociables y trabajan en equipo.", isCorrect: true  },
    ],
  },
  {
    id: "comic7",
    avatar: "👧", name: "Lucía",
    frase: "Mejor no me siento al lado de él, parece raro y seguro es mala persona.",
    options: [
      { text: "No conoces a esa persona. Juzgarla sin hablar es un prejuicio.",      isCorrect: true  },
      { text: "Buena idea, mejor cuidarse.",                                         isCorrect: false },
      { text: "Hagamos lo que tú quieras.",                                          isCorrect: false },
      { text: "Sí, se le ve hasta peligroso.",                                       isCorrect: false },
    ],
  },
  {
    id: "comic8",
    avatar: "🧒", name: "Bruno",
    frase: "Las niñas no son buenas en matemáticas, así de simple.",
    options: [
      { text: "Es lo que se ve en clase, sí.",                                       isCorrect: false },
      { text: "Depende de cada una, supongo.",                                       isCorrect: false },
      { text: "Eso no es cierto. El género no determina ser bueno en una materia.",  isCorrect: true  },
      { text: "Por eso siempre les copian a los chicos.",                            isCorrect: false },
    ],
  },
  {
    id: "comic9",
    avatar: "👦", name: "Tomás",
    frase: "Si vienen de esa familia, seguro no estudian. Es así con todos.",
    options: [
      { text: "Tienes razón, hay que ver de dónde viene la gente.",                  isCorrect: false },
      { text: "Bueno, no me consta directamente.",                                   isCorrect: false },
      { text: "De esa familia salen puros vagos, ¿no?",                              isCorrect: false },
      { text: "Cada persona es distinta. Juzgar por la familia es un prejuicio.",    isCorrect: true  },
    ],
  },
  {
    id: "comic10",
    avatar: "👩‍🏫", name: "Profe Ana",
    frase: "Los chicos del salón nuevo no van a aprender, son del colegio público.",
    options: [
      { text: "Eso suele pasar, sí.",                                                isCorrect: false },
      { text: "Cada estudiante aprende a su ritmo, sin importar de dónde venga.",    isCorrect: true  },
      { text: "Bueno, ya veremos los resultados.",                                   isCorrect: false },
      { text: "Hay que bajar el nivel para ellos entonces.",                         isCorrect: false },
    ],
  },
  {
    id: "comic11",
    avatar: "🧔", name: "Carlos",
    frase: "Los músicos no estudian, todos son flojos en lo académico.",
    options: [
      { text: "Mejor que cambien de carrera entonces.",                              isCorrect: false },
      { text: "Sí, viven en otro mundo.",                                            isCorrect: false },
      { text: "Generalizar es injusto. Muchos músicos son brillantes en varias áreas.", isCorrect: true  },
      { text: "Quizá tengas razón en algunos casos.",                                isCorrect: false },
    ],
  },
  {
    id: "comic12",
    avatar: "🧕", name: "Inés",
    frase: "Las personas con tatuajes son problemáticas, mejor evitarlas.",
    options: [
      { text: "Cierto, hay que tener cuidado.",                                      isCorrect: false },
      { text: "Yo también pienso así desde lejos.",                                  isCorrect: false },
      { text: "Bueno, tú sabrás con quién juntarte.",                                isCorrect: false },
      { text: "Los tatuajes son una expresión personal. No definen a una persona.",  isCorrect: true  },
    ],
  },
  {
    id: "comic13",
    avatar: "👨‍🎤", name: "Joaquín",
    frase: "Los deportistas no leen libros, solo se preocupan por entrenar.",
    options: [
      { text: "Es verdad, viven en el gimnasio.",                                    isCorrect: false },
      { text: "Hay muchos deportistas que combinan estudio y deporte muy bien.",     isCorrect: true  },
      { text: "Para qué van a leer si solo corren.",                                 isCorrect: false },
      { text: "Quizá deberían intentar leer más.",                                   isCorrect: false },
    ],
  },
  {
    id: "comic14",
    avatar: "👨‍💼", name: "Don Luis",
    frase: "Los jóvenes de hoy no quieren trabajar, son la generación perdida.",
    options: [
      { text: "Sí, los millennials lo arruinaron todo.",                             isCorrect: false },
      { text: "Cada generación tiene retos distintos. Juzgarlos en bloque es injusto.", isCorrect: true  },
      { text: "Bueno, son tiempos raros.",                                           isCorrect: false },
      { text: "Tiene razón, no les gusta esforzarse.",                               isCorrect: false },
    ],
  },
  {
    id: "comic15",
    avatar: "👨‍🦱", name: "Pedro",
    frase: "Los chicos altos siempre son buenos en básquet, es lógico.",
    options: [
      { text: "Sí, los bajitos no tienen chance.",                                   isCorrect: false },
      { text: "Quizá. Yo conozco a uno bajito que es bueno.",                        isCorrect: false },
      { text: "La altura ayuda, pero la habilidad y el entrenamiento importan más.", isCorrect: true  },
      { text: "Hay que reclutar solo a los altos entonces.",                         isCorrect: false },
    ],
  },
];

// R2 — Ruleta de la conciencia. 5 categorías (los 5 conceptos del Nivel 2)
// con pools de casos. La ruleta sortea una categoría, aparece un caso de esa
// categoría, el niño debe clasificarlo (los 5 botones) — si acierta, ha
// identificado lo que la ruleta sorteó.
const LP_RULETA_CATEGORIAS = [
  { id: "LENGUA",         color: "#7ab8ff", ink: "#08264d", emoji: "💬" },
  { id: "COSMOVISIÓN",    color: "#ffa94d", ink: "#3a2608", emoji: "🌅" },
  { id: "GLOBALIZACIÓN",  color: "#5be0a3", ink: "#0b3a2d", emoji: "🌍" },
  { id: "PREJUICIO",      color: "#ff9b9b", ink: "#3a0808", emoji: "👁" },
  { id: "ESTEREOTIPO",    color: "#a78bfa", ink: "#1a0a3a", emoji: "🏷" },
];
const LP_RULETA_POOL = {
  LENGUA: [
    "El kichwa tiene varias palabras para tipos de papa.",
    "Cada idioma transmite cómo entendemos el mundo.",
    "La lengua materna nos da identidad cultural.",
    "Los modismos cambian de país a país.",
    "Las palabras pueden cargar prejuicios sin que lo notemos.",
  ],
  COSMOVISIÓN: [
    "Los abuelos andinos agradecen al sol y la luna por la cosecha.",
    "Para la cultura andina, el agua es un ser sagrado.",
    "Cada pueblo tiene su forma de explicar el origen del mundo.",
    "En los Andes, la Pachamama es la madre tierra y se le agradece.",
    "Las festividades reflejan la forma de ver el mundo de un pueblo.",
  ],
  GLOBALIZACIÓN: [
    "Comer pizza italiana, sushi y llapingachos en la misma semana.",
    "Aprendí coreano viendo K-pop sin salir de Ecuador.",
    "Mi familia compra ropa fabricada en China por internet.",
    "Los memes recorren el mundo en horas, sin importar idioma.",
    "Mi primo en Madrid me sigue en TikTok en tiempo real.",
  ],
  PREJUICIO: [
    "No le des trabajo, viene de ese barrio peligroso.",
    "Si es de esa familia, seguro no estudia bien.",
    "Lo veo y ya sé que no va a ser un buen amigo.",
    "No me siento al lado de él, parece raro.",
    "Esa chica no me cae bien, no sé por qué.",
  ],
  ESTEREOTIPO: [
    "Los hombres no lloran porque eso es ser débil.",
    "Las mujeres no saben de fútbol.",
    "Los adolescentes solo piensan en el celular.",
    "Los abuelitos no entienden tecnología.",
    "Los gamers son todos antisociales.",
  ],
};

// ─────────────────────────────────────────────────────────────
// GameScreen — delega al sub-componente según el nivel elegido
// ─────────────────────────────────────────────────────────────
function GameScreen({ app, setApp, go }) {
  const cat = app.currentCategory || "csz";
  const [restartTick, setRestartTick] = useStateG(0);
  const restart = () => setRestartTick((t) => t + 1);
  if (cat === "lenguaPensamiento") return <LenguaGame key={`lp-${restartTick}`} app={app} setApp={setApp} go={go} onRestart={restart} />;
  return <CSZGame key={`csz-${restartTick}`} app={app} setApp={setApp} go={go} onRestart={restart} />;
}

// ─────────────────────────────────────────────────────────────
// HUD común (logo + chips de tema + ronda dots + timer + estrellas)
// ─────────────────────────────────────────────────────────────
function GameHUD({ elapsed, stars, attempted, solved, total = 3, app, setApp }) {
  const levels = (typeof LEVELS_CFG !== "undefined" && LEVELS_CFG) || (window.LEVELS_CFG || []);
  const currentId = app && app.currentCategory ? app.currentCategory : "csz";
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
// NIVEL 1 — Reglas C, S, Z (3 rondas)
// ─────────────────────────────────────────────────────────────
function CSZGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "Reglas C, S, Z";

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

  // Refs para que el rail derecho controle VERIFICAR/REINICIAR del sub-componente.
  const verifyRef = useRefG(null);
  const [verifyReady, setVerifyReady] = useStateG(false);
  const clearRef = useRefG(null);
  const [clearReady, setClearReady] = useStateG(false);

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

  // Glifos chalkboard del nivel 1
  useEffectG(() => {
    window.__currentChalkGlyphs = [
      { c: "C",    l: "6%",  t: "12%", r: "-8deg" },
      { c: "S",    l: "82%", t: "16%", r: "6deg",  s: "0.62em" },
      { c: "Z",    l: "45%", t: "8%",  r: "4deg",  s: "0.55em" },
      { c: "-ito", l: "10%", t: "78%", r: "12deg", s: "0.4em" },
      { c: "-ivo", l: "88%", t: "72%", r: "-10deg", s: "0.4em" },
      { c: "-azo", l: "3%",  t: "45%", r: "-4deg", s: "0.42em" },
      { c: "-oso", l: "92%", t: "45%", r: "8deg",  s: "0.42em" },
      { c: "?",    l: "30%", t: "55%", r: "-6deg", s: "0.55em" },
      { c: "¡",    l: "70%", t: "62%", r: "8deg",  s: "0.55em" },
      { c: "✏",    l: "55%", t: "30%", r: "-4deg", s: "0.46em" },
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

  // Bocadillo dinámico — referencia mutable que el sub-componente R0 actualiza con la regla.
  const [hintMsg, setHintMsg] = useStateG("Toca la letra que falta.");

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <GameHUD elapsed={elapsed} stars={stars} attempted={attempted} solved={solved} total={3} app={app} setApp={setApp} />

      {/* Enunciado (QUÉ hacer) */}
      <div style={{
        position: "absolute", top: 100, left: "50%", transform: "translateX(-50%)",
        maxWidth: 500, textAlign: "center",
        fontFamily: "var(--ed-font-display)", fontWeight: 700,
        fontSize: 19, lineHeight: 1.15,
        color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,0.55)",
        pointerEvents: "none",
      }}>
        {ronda === 0 && "Completa con la letra correcta."}
        {ronda === 1 && "¿Cuál se escribe bien?"}
        {ronda === 2 && "Toca SOLO las palabras MAL escritas."}
      </div>

      {/* Personaje + bocadillo */}
      <div data-qa="personaje" style={{
        position: "absolute", left: 8, bottom: 90, width: 220,
        pointerEvents: "none", textAlign: "center",
      }}>
        <div data-qa="bocadillo" className="ed-float-soft" style={{
          position: "absolute", left: 0, right: 0, bottom: "100%",
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
            {ronda === 0 && hintMsg}
            {ronda === 1 && <>Solo una está<br/>bien escrita.</>}
            {ronda === 2 && <>Caza solo las<br/>palabras mal escritas.</>}
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

      {/* Zona central — varía por ronda */}
      <div data-qa="zona-central" style={{
        position: "absolute", top: 132, left: 230, right: 230, bottom: 28,
      }}>
        {ronda === 0 && (
          <CSZ_CompletaCard
            verifyRef={verifyRef}
            setVerifyReady={setVerifyReady}
            clearRef={clearRef}
            setClearReady={setClearReady}
            setHintMsg={setHintMsg}
            onAnswer={(picked, problem) => {
              const isCorrect = picked === problem.correct;
              // userText: palabra con la letra elegida, correctText: palabra correcta
              const userWord = problem.word.slice(0, problem.hideIdx) + picked.toLowerCase() + problem.word.slice(problem.hideIdx + 1);
              recordRound(isCorrect, userWord, problem.word, "✏", problem.emoji);
            }}
          />
        )}
        {ronda === 1 && (
          <CSZ_TriviaCard
            verifyRef={verifyRef}
            setVerifyReady={setVerifyReady}
            clearRef={clearRef}
            setClearReady={setClearReady}
            onAnswer={(pickedIdx, problem) => {
              const isCorrect = pickedIdx === problem.correctIdx;
              recordRound(isCorrect, problem.opciones[pickedIdx], problem.opciones[problem.correctIdx], "📜", problem.emoji);
            }}
          />
        )}
        {ronda === 2 && (
          <CSZ_ShooterCard
            onFinish={(stats) => {
              const score = stats.aciertos - stats.errores - stats.perdidas;
              const isCorrect = score >= 3;
              recordRound(isCorrect, `${stats.aciertos} cazadas · ${stats.errores} erradas · ${stats.perdidas} escapadas`, "Cazar 3+ palabras mal escritas en 15s", "🎯", "💥");
            }}
          />
        )}
      </div>

      {/* Columna de acciones a la derecha — centrada vertical al lienzo */}
      <div data-qa="acciones" style={{
        position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)",
        display: "flex", flexDirection: "column", gap: 12, width: 150,
      }}>
        {/* R1 (trivia, TOCA 1 OPCIÓN) es AUTO-EVALUADA → sin VERIFICAR/BORRAR.
            R2 (shooter) ya era auto. Solo R0 (componer palabra) los muestra. */}
        {ronda === 0 && (
          <button className="ed-btn ed-btn-verify"
            onClick={() => { if (verifyReady && verifyRef.current) verifyRef.current(); }}
            disabled={!verifyReady}
            style={{
              fontSize: 15, padding: "0 10px", height: 56, fontWeight: 800, letterSpacing: "0.04em",
              opacity: verifyReady ? 1 : 0.45,
              cursor: verifyReady ? "pointer" : "not-allowed",
            }}>¡VERIFICAR!</button>
        )}
        {ronda === 0 && (
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
// CSZ R0 — CompletaCard: emoji + palabra con un hueco + bandeja C/S/Z
// ─────────────────────────────────────────────────────────────
function CSZ_CompletaCard({ onAnswer, verifyRef, setVerifyReady, clearRef, setClearReady, setHintMsg }) {
  const problem = useMemoG(() => {
    // R0 es la primera ronda del nivel CSZ → limpia el Set de palabras de la
    // sesión para que el anti-repetición cross-ronda arranque desde cero.
    clearCszSessionWords();
    // Ventana FIFO = floor(N/2) más recientes de ESTE pool (estándar 12).
    const windowN = Math.floor(CSZ_COMPLETA_POOL.length / 2);
    const blocked = new Set(getRecent("csz_r0").slice(0, windowN));
    let candidates = CSZ_COMPLETA_POOL.filter((p) => !blocked.has(p.id));
    if (candidates.length < 1) candidates = CSZ_COMPLETA_POOL;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    pushRecent("csz_r0", pick.id);
    addCszSessionWord(pick.word);
    return pick;
  }, []);
  const [picked, setPicked] = useStateG(null);

  useEffectG(() => { if (setHintMsg) setHintMsg(problem.rule); }, [problem.id]);

  useEffectG(() => {
    if (verifyRef) verifyRef.current = () => { if (picked) onAnswer(picked, problem); };
  }, [picked]);

  useEffectG(() => {
    if (setVerifyReady) setVerifyReady(picked !== null);
  }, [picked]);

  useEffectG(() => {
    if (clearRef) clearRef.current = () => setPicked(null);
  });
  useEffectG(() => {
    if (setClearReady) setClearReady(picked !== null);
  }, [picked]);

  // Renderiza la palabra con un hueco visual en hideIdx.
  const before = problem.word.slice(0, problem.hideIdx);
  const after = problem.word.slice(problem.hideIdx + 1);

  return (
    <div style={{
      position: "relative", width: "100%", height: "100%",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 14,
    }}>
      {/* Emoji grande */}
      <div style={{
        width: 140, height: 120,
        borderRadius: 22,
        background: "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(240,235,225,0.9))",
        border: "3px solid #f2c260",
        boxShadow: "0 12px 28px rgba(0,0,0,0.45), 0 0 0 1px rgba(242,194,96,0.35), inset 0 -4px 0 rgba(0,0,0,0.08)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 80, lineHeight: 1,
      }}>
        {problem.emoji}
      </div>

      {/* Palabra con hueco */}
      <div style={{
        display: "flex", alignItems: "baseline", justifyContent: "center",
        fontFamily: "var(--ed-font-display)", fontWeight: 700,
        color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,0.5)",
        gap: 3, padding: "0 6px",
      }}>
        <span style={{ fontSize: 38 }}>{before}</span>
        <span
          onClick={() => { if (picked) setPicked(null); }}
          style={{
            display: "inline-block",
            minWidth: 52, padding: "2px 8px",
            borderRadius: 10,
            background: picked ? "linear-gradient(180deg, #ffe97a, #d7b12a)" : "rgba(255,255,255,0.12)",
            border: "3px solid #f2c260",
            color: picked ? "#3a2608" : "rgba(255,255,255,0.4)",
            fontSize: 38, fontWeight: 700,
            textAlign: "center",
            cursor: picked ? "pointer" : "default",
            transition: "all 0.15s ease",
            boxShadow: picked ? "0 0 0 4px rgba(252,233,168,0.4), inset 0 1px 0 rgba(255,255,255,0.5)" : "none",
          }}>{picked || "_"}</span>
        <span style={{ fontSize: 38 }}>{after}</span>
      </div>

      {/* Bandeja C/S/Z */}
      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 2 }}>
        {["C", "S", "Z"].map((l) => {
          const isPicked = picked === l;
          return (
            <button key={l} onClick={() => setPicked(l)}
              style={{
                width: 76, height: 76, borderRadius: 16,
                background: isPicked
                  ? "linear-gradient(180deg, #ffd84b, #c0850c)"
                  : "linear-gradient(180deg, #ffe97a, #d7b12a)",
                color: "#3a2608",
                fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 38,
                border: isPicked ? "3px solid #fce9a8" : "none",
                boxShadow: isPicked
                  ? "0 0 0 4px rgba(255,255,255,1), 0 0 22px rgba(252,233,168,0.8), inset 0 1px 0 rgba(255,255,255,0.5)"
                  : "inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -3px 0 rgba(0,0,0,0.18), 0 4px 10px -2px rgba(0,0,0,0.45)",
                transform: isPicked ? "translateY(-3px) scale(1.05)" : "none",
                transition: "all 0.15s ease",
                cursor: "pointer",
              }}>{l}</button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CSZ R1 — TriviaCard: pista + 3 cartas
// ─────────────────────────────────────────────────────────────
function CSZ_TriviaCard({ onAnswer, verifyRef, setVerifyReady, clearRef, setClearReady }) {
  const problem = useMemoG(() => {
    // Ventana FIFO = floor(N/2) más recientes de ESTE pool (estándar 12).
    const windowN = Math.floor(CSZ_TRIVIA_POOL.length / 2);
    const blocked = new Set(getRecent("csz_r1").slice(0, windowN));
    // Excluir IDs bloqueados Y ejercicios cuya palabra correcta ya salió en R0.
    let candidates = CSZ_TRIVIA_POOL.filter((p) => {
      if (blocked.has(p.id)) return false;
      const correctWord = p.opciones[p.correctIdx];
      return !hasCszSessionWord(correctWord);
    });
    if (candidates.length < 1) {
      // Si la sesión bloqueó todo, ignorar el filtro cross-ronda.
      candidates = CSZ_TRIVIA_POOL.filter((p) => !blocked.has(p.id));
    }
    if (candidates.length < 1) candidates = CSZ_TRIVIA_POOL;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    pushRecent("csz_r1", pick.id);
    addCszSessionWord(pick.opciones[pick.correctIdx]);
    return pick;
  }, []);
  const [picked, setPicked] = useStateG(null);

  // Comportamiento B (AUTO-EVALUADA): esta ronda de "TOCA 1 OPCIÓN" se califica
  // sola al tocar una carta. No hay VERIFICAR/BORRAR — por eso no se registran
  // verifyRef/clearRef y verify/clearReady quedan en false.
  const lockedRef = useRefG(false);
  const autoRef = useRefG(null);
  useEffectG(() => () => clearTimeout(autoRef.current), []);

  useEffectG(() => { if (setVerifyReady) setVerifyReady(false); }, []);
  useEffectG(() => { if (setClearReady) setClearReady(false); }, []);

  // Califica la R2 con la carta tocada (mismo flujo que tenía VERIFICAR).
  function gradeR2(idx) {
    if (lockedRef.current) return;
    lockedRef.current = true;
    onAnswer(idx, problem);
  }

  return (
    <div style={{
      position: "relative", width: "100%", height: "100%",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 16,
    }}>
      {/* Pista */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        background: "rgba(255,255,255,0.95)", color: "#1a1a1a",
        borderRadius: 14, padding: "12px 22px",
        border: "2px solid #f2c260",
        boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
        fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 18,
        maxWidth: 360,
      }}>
        <span style={{ fontSize: 28 }}>{problem.emoji}</span>
        <span>"{problem.pista}"</span>
      </div>

      {/* 3 cartas — más grandes */}
      <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
        {problem.opciones.map((opt, i) => {
          const isPicked = picked === i;
          return (
            <button key={i} onClick={() => {
                if (lockedRef.current) return;
                setPicked(i);
                // Resalta y, si no cambia de idea en ~700 ms, califica sola.
                clearTimeout(autoRef.current);
                autoRef.current = setTimeout(() => gradeR2(i), 700);
              }}
              style={{
                minWidth: 150, minHeight: 75, padding: "18px 16px", borderRadius: 16,
                background: isPicked
                  ? "linear-gradient(180deg, #ffd84b, #c0850c)"
                  : "linear-gradient(180deg, #ffe97a, #d7b12a)",
                color: "#3a2608",
                fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 24,
                border: isPicked ? "3px solid #fce9a8" : "none",
                boxShadow: isPicked
                  ? "0 0 0 4px rgba(255,255,255,1), 0 0 0 8px rgba(252,233,168,0.65), 0 0 38px rgba(252,233,168,0.9), inset 0 1px 0 rgba(255,255,255,0.5)"
                  : "inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -3px 0 rgba(0,0,0,0.18), 0 6px 14px -4px rgba(0,0,0,0.45)",
                transform: isPicked ? "translateY(-4px) scale(1.04)" : "none",
                transition: "all 0.15s ease",
                cursor: "pointer", letterSpacing: "0.02em",
              }}>{opt}</button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CSZ R2 — ShooterCard: caen palabras 20s, caza solo las MAL escritas
// ─────────────────────────────────────────────────────────────
function CSZ_ShooterCard({ onFinish }) {
  const [bubbles, setBubbles] = useStateG([]);
  const [stats, setStats] = useStateG({ aciertos: 0, errores: 0, perdidas: 0 });
  const [timeLeft, setTimeLeft] = useStateG(15);
  const nextIdRef = useRefG(0);
  const finishedRef = useRefG(false);
  const containerRef = useRefG(null);
  // Anti-repetición: sets de palabras ya usadas en esta sesión.
  const usedMalRef = useRefG(new Set());
  const usedBienRef = useRefG(new Set());

  function estimateBubbleWidth(word) {
    return Math.ceil(word.length * 9.5) + 44;
  }

  function pickWord(useMal) {
    const pool = useMal ? CSZ_MAL : CSZ_BIEN;
    const used = useMal ? usedMalRef.current : usedBienRef.current;
    // Filtro doble: no repetir intra-ronda Y respetar las palabras que ya
    // salieron en R0/R1 dentro de la misma sesión.
    let available = pool.filter((w) => {
      if (used.has(w)) return false;
      const base = useMal ? CSZ_MAL_TO_BIEN[w] : w;
      return !hasCszSessionWord(base);
    });
    if (available.length === 0) {
      // Si nos quedamos sin palabras frescas, relajamos el filtro cross-ronda
      // antes que el intra-ronda (preferimos no repetir en la misma ronda).
      available = pool.filter((w) => !used.has(w));
    }
    if (available.length === 0) {
      used.clear();
      available = pool;
    }
    const word = available[Math.floor(Math.random() * available.length)];
    used.add(word);
    const base = useMal ? CSZ_MAL_TO_BIEN[word] : word;
    addCszSessionWord(base);
    return word;
  }

  useEffectG(() => {
    const spawn = setInterval(() => {
      if (finishedRef.current) return;
      // 60% mal escritas, 40% bien escritas
      const useMal = Math.random() < 0.6;
      const word = pickWord(useMal);
      const id = nextIdRef.current++;
      const containerW = (containerRef.current && containerRef.current.clientWidth) || 500;
      const margin = 10;
      const estW = estimateBubbleWidth(word);
      const maxX = Math.max(margin, containerW - estW - margin);
      const x = margin + Math.random() * (maxX - margin);
      setBubbles((bs) => [...bs, { id, word, isMal: useMal, x, y: -50, vy: 0.55 + Math.random() * 0.3 }]);
    }, 1100);

    const tick = setInterval(() => {
      if (finishedRef.current) return;
      setBubbles((bs) => {
        const next = [];
        let perdidasDelta = 0;
        for (const b of bs) {
          const newY = b.y + b.vy * 2.4;
          if (newY > 320) {
            if (b.isMal) perdidasDelta++;
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

  useEffectG(() => {
    if (timeLeft === 0 && finishedRef.current) {
      const t = setTimeout(() => onFinish(stats), 400);
      return () => clearTimeout(t);
    }
  }, [timeLeft, stats]);

  function handleTap(b) {
    if (finishedRef.current) return;
    setBubbles((bs) => bs.filter((x) => x.id !== b.id));
    if (b.isMal) setStats((s) => ({ ...s, aciertos: s.aciertos + 1 }));
    else setStats((s) => ({ ...s, errores: s.errores + 1 }));
  }

  return (
    <div ref={containerRef} style={{
      position: "relative", width: "100%", height: "100%", overflow: "hidden",
      borderRadius: 14, background: "rgba(11,58,45,0.4)",
      border: "2px solid rgba(242,194,96,0.4)",
    }}>
      {/* Marcador local */}
      <div style={{
        position: "absolute", top: 8, left: 12, right: 12,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontFamily: "var(--ed-font-display)", color: "#fce9a8", fontSize: 13, fontWeight: 700,
        zIndex: 10,
      }}>
        <div>✅ {stats.aciertos} &nbsp; ❌ {stats.errores} &nbsp; ⌛ {stats.perdidas}</div>
        <div style={{ color: timeLeft <= 5 ? "#ff8b8b" : "#fce9a8" }}>⏱ {timeLeft}s</div>
      </div>

      {bubbles.map((b) => (
        <button key={b.id} onClick={() => handleTap(b)}
          style={{
            position: "absolute", left: b.x, top: b.y,
            padding: "10px 16px", borderRadius: 999,
            background: "rgba(255,255,255,0.96)",
            border: "2px solid #f2c260",
            fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 17,
            color: "#1a1a1a", cursor: "pointer",
            boxShadow: "0 4px 10px rgba(0,0,0,0.45)",
            whiteSpace: "nowrap",
          }}>{b.word}</button>
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
// NIVEL 2 — Lengua y pensamiento (3 rondas)
// ─────────────────────────────────────────────────────────────
function LenguaGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "Lengua y pensamiento";

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

  const verifyRef = useRefG(null);
  const [verifyReady, setVerifyReady] = useStateG(false);
  const clearRef = useRefG(null);
  const [clearReady, setClearReady] = useStateG(false);

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

  // Glifos chalkboard del nivel 2
  useEffectG(() => {
    window.__currentChalkGlyphs = [
      { c: "#",   l: "6%",  t: "12%", r: "-8deg" },
      { c: "🌍", l: "82%", t: "16%", r: "6deg",  s: "0.62em" },
      { c: "💬", l: "45%", t: "8%",  r: "4deg",  s: "0.55em" },
      { c: "📱", l: "10%", t: "78%", r: "12deg", s: "0.55em" },
      { c: "❗", l: "88%", t: "72%", r: "-10deg", s: "0.55em" },
      { c: "?",  l: "3%",  t: "45%", r: "-4deg", s: "0.55em" },
      { c: "✨", l: "92%", t: "45%", r: "8deg",  s: "0.55em" },
      { c: "🤔", l: "30%", t: "55%", r: "-6deg", s: "0.55em" },
      { c: "📖", l: "70%", t: "62%", r: "8deg",  s: "0.55em" },
      { c: "🎯", l: "55%", t: "30%", r: "-4deg", s: "0.5em" },
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

      {/* Enunciado */}
      <div style={{
        position: "absolute", top: 100, left: "50%", transform: "translateX(-50%)",
        maxWidth: 500, textAlign: "center",
        fontFamily: "var(--ed-font-display)", fontWeight: 700,
        fontSize: 19, lineHeight: 1.15,
        color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,0.55)",
        pointerEvents: "none",
      }}>
        {ronda === 0 && "Arrastra cada frase al carril correcto."}
        {ronda === 1 && "Responde como un buen amigo."}
        {ronda === 2 && "Gira y clasifica el caso."}
      </div>

      {/* Personaje + bocadillo */}
      <div data-qa="personaje" style={{
        position: "absolute", left: 8, bottom: 90, width: 220,
        pointerEvents: "none", textAlign: "center",
      }}>
        <div data-qa="bocadillo" className="ed-float-soft" style={{
          position: "absolute", left: 0, right: 0, bottom: "100%",
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
            {ronda === 0 && <>Arrastra cada frase a<br/>su carril correcto.</>}
            {ronda === 1 && <>Elige la respuesta<br/>más empática.</>}
            {ronda === 2 && <>Gira la ruleta y<br/>clasifica el caso.</>}
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

      {/* Zona central */}
      <div data-qa="zona-central" style={{
        position: "absolute", top: 132, left: 230, right: 230, bottom: 28,
      }}>
        {ronda === 0 && (
          <LP_CarreraCard
            verifyRef={verifyRef}
            setVerifyReady={setVerifyReady}
            clearRef={clearRef}
            setClearReady={setClearReady}
            onFinish={(stats) => {
              const isCorrect = stats.aciertos >= 2;
              recordRound(isCorrect, `${stats.aciertos}/${stats.total} frases dirigidas bien`, "Arrastrar 2+ frases al carril correcto", "🏎", "🛣");
            }}
          />
        )}
        {ronda === 1 && (
          <LP_ComicCard
            verifyRef={verifyRef}
            setVerifyReady={setVerifyReady}
            clearRef={clearRef}
            setClearReady={setClearReady}
            onFinish={(stats) => {
              const isCorrect = stats.aciertos === 1;
              recordRound(isCorrect, isCorrect ? "Respuesta empática" : "Respuesta no empática", "Responder con empatía a un estereotipo", "💬", "📖");
            }}
          />
        )}
        {ronda === 2 && (
          <LP_RuletaCard
            verifyRef={verifyRef}
            setVerifyReady={setVerifyReady}
            clearRef={clearRef}
            setClearReady={setClearReady}
            onFinish={(stats) => {
              const isCorrect = stats.aciertos === 1;
              recordRound(isCorrect, isCorrect ? "Caso clasificado correctamente" : "Caso mal clasificado", "Clasificar el caso de la ruleta", "🎯", "🎰");
            }}
          />
        )}
      </div>

      {/* Columna de acciones — Nivel 2: R0 (arrastrar) y R2 (ruleta) usan
          VERIFICAR/BORRAR. R1 (cómic, TOCA 1 OPCIÓN) es AUTO-EVALUADA → se ocultan. */}
      <div data-qa="acciones" style={{
        position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)",
        display: "flex", flexDirection: "column", gap: 12, width: 150,
      }}>
        {ronda !== 1 && (
          <button className="ed-btn ed-btn-verify"
            onClick={() => { if (verifyReady && verifyRef.current) verifyRef.current(); }}
            disabled={!verifyReady}
            style={{
              fontSize: 15, padding: "0 10px", height: 56, fontWeight: 800, letterSpacing: "0.04em",
              opacity: verifyReady ? 1 : 0.45,
              cursor: verifyReady ? "pointer" : "not-allowed",
            }}>¡VERIFICAR!</button>
        )}
        {ronda !== 1 && (
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
// LP R0 — CarreraCard: pista con 2 carriles (PREJUICIO izq / ESTEREOTIPO
// der). Una frase aparece en el centro; el niño la ARRASTRA hacia un
// carril y la frase se QUEDA ahí (acumulación). Aparece la siguiente.
// 6 frases por sesión. VERIFICAR al final → score = aciertos − errores.
// Correcto si aciertos ≥ 4.
// ─────────────────────────────────────────────────────────────
function LP_CarreraCard({ onFinish, verifyRef, setVerifyReady, clearRef, setClearReady }) {
  const TOTAL_FRASES = 3;
  const SEGUNDOS_POR_FRASE = 6;
  const META_PX = 280;          // distancia desde la base hasta la meta
  const TICK_MS = 30;
  // px que sube por tick para que cada frase llegue a la meta en SEGUNDOS_POR_FRASE.
  const VELOCIDAD_PX_TICK = META_PX / (SEGUNDOS_POR_FRASE * 1000 / TICK_MS);
  // FIFO grande para que la próxima sesión nunca arranque con frases repetidas.
  const LP_R0_FIFO = 12;
  // Elegir 3 frases: 2 de un tipo + 1 del otro al azar, evitando frases que ya
  // salieron en sesiones recientes (localStorage).
  const queueInit = useMemoG(() => {
    const recent = getRecent("lp_r0");
    const allPrej = LP_PE_POOL.filter((p) => p.correct === "PREJUICIO");
    const allEste = LP_PE_POOL.filter((p) => p.correct === "ESTEREOTIPO");
    // Ventana FIFO = floor(N/2) más recientes de CADA tipo (estándar 12).
    const prejIds = new Set(allPrej.map((p) => p.id));
    const esteIds = new Set(allEste.map((p) => p.id));
    const blockedPrej = new Set(recent.filter((id) => prejIds.has(id)).slice(0, Math.floor(allPrej.length / 2)));
    const blockedEste = new Set(recent.filter((id) => esteIds.has(id)).slice(0, Math.floor(allEste.length / 2)));
    const freshPrej = allPrej.filter((p) => !blockedPrej.has(p.id));
    const freshEste = allEste.filter((p) => !blockedEste.has(p.id));
    // Solo se necesitan hasta 2 de cada tipo; la ventana garantiza fresh ≥ 2.
    const prejPool = freshPrej.length >= 2 ? freshPrej : allPrej;
    const estePool = freshEste.length >= 2 ? freshEste : allEste;
    // Balance variable: 2+1 o 1+2 al azar para que no siempre haya más de un tipo.
    const moreP = Math.random() < 0.5;
    const prej = shuffle(prejPool).slice(0, moreP ? 2 : 1);
    const este = shuffle(estePool).slice(0, moreP ? 1 : 2);
    const chosen = shuffle([...prej, ...este]);
    chosen.forEach((p) => pushRecent("lp_r0", p.id, LP_R0_FIFO));
    return chosen;
  }, []);
  const [queue, setQueue] = useStateG(queueInit);
  const [placed, setPlaced] = useStateG([]); // [{ id, text, correct, side, isCorrect }]
  const [dragOffset, setDragOffset] = useStateG({ x: 0, y: 0 });
  const [autoY, setAutoY] = useStateG(0); // px que la frase ha subido automáticamente
  const [dragging, setDragging] = useStateG(false);
  const containerRef = useRefG(null);
  const dragStartRef = useRefG({ x: 0, y: 0 });
  const draggingRef = useRefG(false);
  const finishedRef = useRefG(false);

  const current = queue[0] || null;
  const placedCount = placed.length;
  const allDone = placedCount === TOTAL_FRASES;

  useEffectG(() => {
    if (verifyRef) verifyRef.current = () => verifyNow();
  });
  useEffectG(() => {
    if (setVerifyReady) setVerifyReady(allDone && !finishedRef.current);
  }, [allDone]);
  useEffectG(() => {
    if (clearRef) clearRef.current = () => {
      if (finishedRef.current) return;
      setPlaced([]);
      setQueue(queueInit);
    };
  });
  useEffectG(() => {
    if (setClearReady) setClearReady(placedCount > 0 && !finishedRef.current);
  }, [placedCount]);

  function verifyNow() {
    if (finishedRef.current || !allDone) return;
    finishedRef.current = true;
    const aciertos = placed.filter((p) => p.isCorrect).length;
    const errores = placed.filter((p) => !p.isCorrect).length;
    setTimeout(() => onFinish({ aciertos, errores, total: TOTAL_FRASES }), 600);
  }

  // Animación: la frase sube automáticamente. Si llega a la meta sin que
  // el niño la arrastre a un carril, se cuenta como fallo y avanza la siguiente.
  useEffectG(() => {
    if (!current || allDone || finishedRef.current) return;
    setAutoY(0);
    const interval = setInterval(() => {
      if (draggingRef.current || finishedRef.current) return;
      setAutoY((y) => {
        const newY = y + VELOCIDAD_PX_TICK;
        if (newY >= META_PX) {
          // Llegó a la meta — fallo automático (lado opuesto del correcto)
          const correctSide = current.correct === "PREJUICIO" ? "left" : "right";
          const failSide = correctSide === "left" ? "right" : "left";
          setPlaced((p) => [...p, { id: current.id, text: current.text, correct: current.correct, side: failSide, isCorrect: false, timedOut: true }]);
          setQueue((q) => q.slice(1));
          return 0;
        }
        return newY;
      });
    }, 30);
    return () => clearInterval(interval);
  }, [current && current.id, allDone]);

  function onPointerDown(e) {
    if (!current || finishedRef.current || dragging) return;
    e.preventDefault();
    const target = e.currentTarget;
    if (target && target.setPointerCapture && e.pointerId !== undefined) {
      try { target.setPointerCapture(e.pointerId); } catch {}
    }
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    draggingRef.current = true;
    setDragging(true);
    setDragOffset({ x: 0, y: 0 });
  }

  function onPointerMove(e) {
    if (!dragging) return;
    setDragOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  }

  function onPointerUp(e) {
    if (!dragging || !current) { draggingRef.current = false; setDragging(false); return; }
    draggingRef.current = false;
    setDragging(false);
    // Determinar a qué carril cayó
    const containerRect = containerRef.current && containerRef.current.getBoundingClientRect();
    if (!containerRect) { setDragOffset({ x: 0, y: 0 }); return; }
    const midX = containerRect.left + containerRect.width / 2;
    const releaseX = e.clientX;
    let side = null;
    if (releaseX < midX - 30) side = "left";
    else if (releaseX > midX + 30) side = "right";
    if (!side) {
      // Cancelar — vuelve al centro (no reinicia el autoY)
      setDragOffset({ x: 0, y: 0 });
      return;
    }
    const correctSide = current.correct === "PREJUICIO" ? "left" : "right";
    const isCorrect = side === correctSide;
    setPlaced((p) => [...p, { id: current.id, text: current.text, correct: current.correct, side, isCorrect }]);
    setQueue((q) => q.slice(1));
    setDragOffset({ x: 0, y: 0 });
    setAutoY(0);
  }

  const placedLeft  = placed.filter((p) => p.side === "left");
  const placedRight = placed.filter((p) => p.side === "right");

  return (
    <div ref={containerRef} style={{
      position: "relative", width: "100%", height: "100%", overflow: "hidden",
      borderRadius: 14, background: "linear-gradient(180deg, rgba(11,32,58,0.6), rgba(8,20,40,0.6))",
      border: "2px solid rgba(122,184,255,0.4)",
    }}>
      {/* Marcador local — centrado + cronómetro por frase */}
      <div style={{
        position: "absolute", top: 4, left: 0, right: 0,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 14,
        fontFamily: "var(--ed-font-display)", color: "#fce9a8", fontSize: 12, fontWeight: 700,
        zIndex: 10, pointerEvents: "none",
      }}>
        <div>📦 {placedCount}/{TOTAL_FRASES}</div>
        {current && !allDone && (
          <div style={{
            color: autoY > META_PX * 0.7 ? "#ff9b9b" : "#fce9a8",
            transition: "color 0.2s",
          }}>
            ⏱ {Math.max(0, Math.ceil((META_PX - autoY) / META_PX * SEGUNDOS_POR_FRASE))}s
          </div>
        )}
      </div>

      {/* Etiquetas de carril */}
      <div style={{
        position: "absolute", top: 24, left: 0, right: 0,
        display: "grid", gridTemplateColumns: "1fr 1fr",
        pointerEvents: "none", zIndex: 2,
      }}>
        <div style={{
          padding: "6px 8px", textAlign: "center",
          background: "linear-gradient(180deg, rgba(255,155,155,0.55), rgba(239,90,90,0.3))",
          color: "#ffd6d6", fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 12,
          borderRight: "1px dashed rgba(252,233,168,0.4)",
          letterSpacing: "0.04em",
        }}>← PREJUICIO</div>
        <div style={{
          padding: "6px 8px", textAlign: "center",
          background: "linear-gradient(180deg, rgba(122,184,255,0.55), rgba(39,115,216,0.3))",
          color: "#d6e7ff", fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 12,
          letterSpacing: "0.04em",
        }}>ESTEREOTIPO →</div>
      </div>

      {/* Línea divisoria vertical */}
      <div style={{
        position: "absolute", top: 50, bottom: 4, left: "50%",
        width: 1, background: "rgba(252,233,168,0.3)",
        zIndex: 2, pointerEvents: "none",
      }} />

      {/* Frases acumuladas — IZQUIERDA */}
      <div style={{
        position: "absolute", top: 54, left: 4, width: "calc(50% - 6px)",
        display: "flex", flexDirection: "column", gap: 4, padding: "0 4px",
        pointerEvents: "none", zIndex: 1, maxHeight: "calc(100% - 60px)",
        overflow: "hidden",
      }}>
        {placedLeft.slice(-4).map((p, i) => (
          <div key={p.id + "-" + i} style={{
            background: p.isCorrect ? "rgba(46,204,143,0.85)" : "rgba(255,107,107,0.85)",
            color: "#fff",
            borderRadius: 8, padding: "5px 8px",
            fontFamily: "var(--ed-font-ui)", fontSize: 10, fontWeight: 600, lineHeight: 1.25,
            boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
            opacity: 0.92,
          }}>
            "{p.text.length > 60 ? p.text.slice(0, 58) + "…" : p.text}"
          </div>
        ))}
      </div>

      {/* Frases acumuladas — DERECHA */}
      <div style={{
        position: "absolute", top: 54, right: 4, width: "calc(50% - 6px)",
        display: "flex", flexDirection: "column", gap: 4, padding: "0 4px",
        pointerEvents: "none", zIndex: 1, maxHeight: "calc(100% - 60px)",
        overflow: "hidden",
      }}>
        {placedRight.slice(-4).map((p, i) => (
          <div key={p.id + "-" + i} style={{
            background: p.isCorrect ? "rgba(46,204,143,0.85)" : "rgba(255,107,107,0.85)",
            color: "#fff",
            borderRadius: 8, padding: "5px 8px",
            fontFamily: "var(--ed-font-ui)", fontSize: 10, fontWeight: 600, lineHeight: 1.25,
            boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
            opacity: 0.92,
          }}>
            "{p.text.length > 60 ? p.text.slice(0, 58) + "…" : p.text}"
          </div>
        ))}
      </div>

      {/* Línea de "meta" cerca del tope para que se vea hasta dónde puede subir */}
      <div style={{
        position: "absolute", top: 48, left: 0, right: 0,
        height: 2, background: "rgba(252,233,168,0.25)",
        boxShadow: "0 0 6px rgba(252,233,168,0.35)",
        zIndex: 2, pointerEvents: "none",
      }} />

      {/* Frase actual (draggable) — sube automáticamente desde el fondo */}
      {current && !allDone && (
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => { draggingRef.current = false; setDragging(false); setDragOffset({ x: 0, y: 0 }); }}
          style={{
            position: "absolute",
            left: "50%", bottom: 14,
            transform: `translateX(-50%) translate(${dragOffset.x}px, ${-autoY + dragOffset.y}px) ${dragging ? "scale(1.04)" : "scale(1)"}`,
            transition: dragging ? "none" : "transform 0.05s linear",
            background: "rgba(255,255,255,0.97)",
            color: "#1a1a1a",
            borderRadius: 14, padding: "10px 14px",
            border: "2.5px solid #f2c260",
            boxShadow: dragging
              ? "0 12px 28px rgba(0,0,0,0.6), 0 0 0 4px rgba(252,233,168,0.5)"
              : "0 6px 16px rgba(0,0,0,0.5)",
            fontFamily: "var(--ed-font-ui)", fontSize: 13, fontWeight: 600, lineHeight: 1.3,
            textAlign: "center", maxWidth: 290, minWidth: 220,
            zIndex: 5,
            cursor: dragging ? "grabbing" : "grab",
            touchAction: "none",
            userSelect: "none",
          }}>
          <div style={{ fontSize: 10, color: "#7a4a08", fontWeight: 800, letterSpacing: "0.04em", marginBottom: 3 }}>
            ✋ ARRÁSTRAME
          </div>
          "{current.text}"
        </div>
      )}

      {allDone && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.45)", color: "#fce9a8",
          fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 22,
          zIndex: 10, textAlign: "center", padding: "0 16px", gap: 28,
        }}>
          <div>¡Todas listas!</div>
          <div style={{ fontSize: 14, opacity: 0.85, fontWeight: 600 }}>Toca VERIFICAR.</div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LP R1 — ComicCard: UNA viñeta de cómic. Un personaje dice algo
// problemático (prejuicio o estereotipo). El niño elige la mejor
// respuesta empática entre 4 opciones (grid 2×2). VERIFICAR confirma.
// 1 viñeta correcta = ronda completa.
// ─────────────────────────────────────────────────────────────
function LP_ComicCard({ onFinish, verifyRef, setVerifyReady, clearRef, setClearReady }) {
  // 1 viñeta sola, con anti-repetición respecto a sesiones recientes.
  const current = useMemoG(() => {
    // Ventana FIFO = floor(N/2) más recientes de ESTE pool (estándar 12).
    const windowN = Math.floor(LP_COMIC_POOL.length / 2);
    const blocked = new Set(getRecent("lp_r1").slice(0, windowN));
    let candidates = LP_COMIC_POOL.filter((c) => !blocked.has(c.id));
    if (candidates.length < 1) candidates = LP_COMIC_POOL;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    pushRecent("lp_r1", pick.id);
    return pick;
  }, []);

  const [picked, setPicked] = useStateG(null); // índice de opción elegida (0..3)
  const [revealed, setRevealed] = useStateG(false);
  const finishedRef = useRefG(false);

  // Comportamiento B (AUTO-EVALUADA): ronda análoga de "TOCA 1 OPCIÓN" (elegir 1
  // respuesta empática). Se califica sola ~700 ms tras tocar — sin VERIFICAR/BORRAR.
  const autoRef = useRefG(null);
  useEffectG(() => () => clearTimeout(autoRef.current), []);

  useEffectG(() => { if (setVerifyReady) setVerifyReady(false); }, []);
  useEffectG(() => { if (setClearReady) setClearReady(false); }, []);

  function verifyNow(idx) {
    const choice = idx != null ? idx : picked;
    if (revealed || choice === null || finishedRef.current) return;
    const isOk = current.options[choice].isCorrect;
    setPicked(choice);
    setRevealed(true);
    finishedRef.current = true;
    setTimeout(() => {
      onFinish({ aciertos: isOk ? 1 : 0, total: 1 });
    }, 1300);
  }

  return (
    <div style={{
      position: "relative", width: "100%", height: "100%",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      {/* Panel del cómic: avatar + bocadillo (más grande que antes — 1 viñeta sola) */}
      <div style={{
        background: "linear-gradient(180deg, rgba(255,247,224,0.97), rgba(243,228,180,0.93))",
        borderRadius: 14, padding: "12px 14px",
        border: "2.5px solid #3a2608",
        boxShadow: "0 6px 16px rgba(0,0,0,0.45), inset 0 0 0 2px rgba(255,247,224,0.7)",
        display: "flex", alignItems: "center", gap: 14,
        minHeight: 90,
      }}>
        <div style={{
          fontSize: 64, lineHeight: 1,
          flexShrink: 0,
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
        }}>{current.avatar}</div>
        <div style={{ flex: 1, position: "relative" }}>
          <div style={{
            position: "relative",
            background: "#fff",
            border: "2.5px solid #3a2608",
            borderRadius: 16, padding: "10px 14px",
            fontFamily: "var(--ed-font-ui)", fontWeight: 600, fontSize: 14, lineHeight: 1.35,
            color: "#1a1a1a",
            boxShadow: "0 3px 6px rgba(0,0,0,0.2)",
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#7a4a08", marginBottom: 3, letterSpacing: "0.04em" }}>
              {current.name.toUpperCase()}
            </div>
            "{current.frase}"
            <div style={{
              position: "absolute", left: -10, top: 22,
              width: 0, height: 0,
              borderTop: "9px solid transparent",
              borderBottom: "9px solid transparent",
              borderRight: "13px solid #3a2608",
            }} />
            <div style={{
              position: "absolute", left: -7, top: 23,
              width: 0, height: 0,
              borderTop: "8px solid transparent",
              borderBottom: "8px solid transparent",
              borderRight: "11px solid #fff",
            }} />
          </div>
        </div>
      </div>

      {/* Pregunta */}
      <div style={{
        fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 13,
        color: "#fce9a8", textAlign: "center",
        textShadow: "0 1px 4px rgba(0,0,0,0.5)",
        margin: "2px 0",
      }}>
        ¿Cómo le respondes?
      </div>

      {/* 4 opciones en grid 2×2 */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: 8, flex: 1, minHeight: 0,
      }}>
        {current.options.map((opt, i) => {
          const isPicked = picked === i;
          const showResult = revealed;
          const isCorrect = showResult && opt.isCorrect;
          const isWrong = showResult && isPicked && !opt.isCorrect;
          let bg = "rgba(255,255,255,0.94)";
          let color = "#1a1a1a";
          let border = "rgba(242,194,96,0.5)";
          if (isPicked && !showResult) { bg = "rgba(252,233,168,0.95)"; border = "#fce9a8"; }
          if (showResult && isCorrect)  { bg = "rgba(46,204,143,0.95)"; color = "#fff"; border = "#2ecc8f"; }
          if (showResult && isWrong)    { bg = "rgba(255,107,107,0.95)"; color = "#fff"; border = "#ef5a5a"; }
          return (
            <button key={i}
              onClick={() => {
                if (revealed || finishedRef.current) return;
                setPicked(i);
                // Resalta y, si no cambia de idea en ~700 ms, califica sola.
                clearTimeout(autoRef.current);
                autoRef.current = setTimeout(() => verifyNow(i), 700);
              }}
              disabled={revealed || finishedRef.current}
              style={{
                padding: "10px 12px 10px 30px", borderRadius: 12,
                background: bg, color,
                border: `2.5px solid ${border}`,
                fontFamily: "var(--ed-font-ui)", fontWeight: 500, fontSize: 12, lineHeight: 1.3,
                textAlign: "left",
                cursor: revealed ? "default" : "pointer",
                boxShadow: isPicked && !showResult
                  ? "0 0 0 3px rgba(255,255,255,1), 0 0 0 6px rgba(252,233,168,0.55), 0 4px 12px rgba(0,0,0,0.4)"
                  : "0 2px 6px rgba(0,0,0,0.25)",
                transition: "all 0.18s ease",
                position: "relative",
                display: "flex", alignItems: "center",
              }}>
              <span style={{
                position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 14,
                color: isPicked || showResult ? color : "#7a4a08",
              }}>
                {showResult && isCorrect ? "✓" : showResult && isWrong ? "✗" : String.fromCharCode(97 + i) + ")"}
              </span>
              {opt.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LP R2 — RuletaCard: ruleta giratoria con 5 sectores (los 5 conceptos).
// El niño hace GIRAR; al detenerse en un sector aparece un caso de esa
// categoría; el niño debe clasificarlo (5 botones) y VERIFICAR.
// 3 giros con 3 aciertos = ronda correcta.
// ─────────────────────────────────────────────────────────────
function LP_RuletaCard({ onFinish, verifyRef, setVerifyReady, clearRef, setClearReady }) {
  // Estado por giro:
  const [rotation, setRotation] = useStateG(0);
  const [spinning, setSpinning] = useStateG(false);
  const [ready, setReady] = useStateG(false);          // ya hay un caso activo
  const [currentCat, setCurrentCat] = useStateG(null); // categoría sorteada
  const [currentCase, setCurrentCase] = useStateG("");
  const [picked, setPicked] = useStateG(null);
  const [feedback, setFeedback] = useStateG(null);     // { isOk, correctId }
  // Estado de la ronda interna:
  const [giro, setGiro] = useStateG(0);   // 0..2
  const [aciertos, setAciertos] = useStateG(0);
  const finishedRef = useRefG(false);
  const usedCasesRef = useRefG(new Set());

  // Resetear listo para verificar/borrar cuando cambia el estado.
  useEffectG(() => {
    if (verifyRef) verifyRef.current = () => verifyNow();
  });
  useEffectG(() => {
    if (setVerifyReady) setVerifyReady(ready && picked !== null && !spinning && !feedback);
  }, [ready, picked, spinning, feedback]);
  useEffectG(() => {
    if (clearRef) clearRef.current = () => { if (!feedback) setPicked(null); };
  });
  useEffectG(() => {
    if (setClearReady) setClearReady(picked !== null && !spinning && !feedback);
  }, [picked, spinning, feedback]);

  function spin() {
    if (spinning || ready || feedback || finishedRef.current) return;
    setSpinning(true);
    setPicked(null);
    // Elegimos categoría destino al azar
    const cats = LP_RULETA_CATEGORIAS;
    const targetIdx = Math.floor(Math.random() * cats.length);
    // Cada sector = 72°. El puntero está arriba (a 0°). Para que un sector
    // quede bajo el puntero al detenerse, debemos rotar tal que (target_center
    // - rotation) mod 360 = 0. Centro del sector i: 72*i + 36 grados.
    const sectorCenter = 72 * targetIdx + 36;
    // Sumar varias vueltas para efecto + rotación final negativa (sentido horario).
    const extraVueltas = 4 + Math.floor(Math.random() * 2); // 4-5 vueltas
    const finalRotation = rotation + 360 * extraVueltas + (360 - sectorCenter) + Math.random() * 8 - 4;
    setRotation(finalRotation);
    setTimeout(() => {
      // Elegir caso de la categoría sorteada (sin repetir en la sesión)
      const cat = cats[targetIdx];
      const pool = LP_RULETA_POOL[cat.id] || [];
      let candidates = pool.filter((c) => !usedCasesRef.current.has(c));
      if (candidates.length === 0) candidates = pool;
      const c = candidates[Math.floor(Math.random() * candidates.length)];
      usedCasesRef.current.add(c);
      setCurrentCat(cat);
      setCurrentCase(c);
      setReady(true);
      setSpinning(false);
    }, 1800);
  }

  function verifyNow() {
    if (!ready || picked === null || finishedRef.current || feedback) return;
    const isOk = picked === currentCat.id;
    const newAciertos = aciertos + (isOk ? 1 : 0);
    const newGiro = giro + 1;
    setAciertos(newAciertos);
    // Mostrar feedback visual antes de avanzar.
    setFeedback({ isOk, correctId: currentCat.id });
    setTimeout(() => {
      setGiro(newGiro);
      setFeedback(null);
      setReady(false);
      setPicked(null);
      setCurrentCat(null);
      setCurrentCase("");
      if (newGiro >= 1) {
        finishedRef.current = true;
        setTimeout(() => onFinish({ aciertos: newAciertos, total: 1 }), 250);
      }
    }, 1400);
  }

  // Construir el gradiente conic-gradient para la ruleta.
  const conic = (() => {
    const slices = LP_RULETA_CATEGORIAS.map((c, i) => {
      const start = (72 * i).toFixed(2);
      const end = (72 * (i + 1)).toFixed(2);
      return `${c.color} ${start}deg ${end}deg`;
    }).join(", ");
    return `conic-gradient(from 0deg, ${slices})`;
  })();

  // Tamaño de la ruleta — adaptarse a viewport.
  const WHEEL_SIZE = 200;

  return (
    <div style={{
      position: "relative", width: "100%", height: "100%",
      display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
      alignItems: "center",
    }}>
      {/* Columna izquierda: ruleta */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        position: "relative",
      }}>
        <div style={{ position: "relative", width: WHEEL_SIZE, height: WHEEL_SIZE }}>
          {/* Puntero arriba */}
          <div style={{
            position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
            width: 0, height: 0,
            borderLeft: "12px solid transparent",
            borderRight: "12px solid transparent",
            borderTop: "20px solid #fce9a8",
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))",
            zIndex: 5,
          }} />
          {/* Ruleta circular */}
          <div style={{
            width: "100%", height: "100%", borderRadius: "50%",
            background: conic,
            border: "4px solid #fce9a8",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5), inset 0 0 0 3px rgba(0,0,0,0.2)",
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? "transform 1.8s cubic-bezier(0.25, 0.85, 0.35, 1)" : "none",
            position: "relative",
          }}>
            {/* Etiquetas de los sectores */}
            {LP_RULETA_CATEGORIAS.map((c, i) => {
              const angle = 72 * i + 36; // centro del sector
              const r = WHEEL_SIZE * 0.34;
              const rad = (angle - 90) * Math.PI / 180;
              const x = WHEEL_SIZE / 2 + Math.cos(rad) * r;
              const y = WHEEL_SIZE / 2 + Math.sin(rad) * r;
              return (
                <div key={c.id} style={{
                  position: "absolute", left: x, top: y, transform: "translate(-50%, -50%)",
                  fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 22,
                  textShadow: "0 1px 2px rgba(0,0,0,0.4)",
                }}>{c.emoji}</div>
              );
            })}
          </div>
          {/* Botón centro: GIRAR */}
          <button onClick={spin} disabled={spinning || ready || finishedRef.current}
            style={{
              position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)",
              width: 70, height: 70, borderRadius: "50%",
              background: spinning ? "rgba(60,60,60,0.85)" : "linear-gradient(180deg, #ffe97a, #d7b12a)",
              color: "#3a2608",
              border: "3px solid #fce9a8",
              fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 13,
              cursor: (spinning || ready || finishedRef.current) ? "not-allowed" : "pointer",
              boxShadow: spinning ? "none" : "0 4px 10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.5)",
              opacity: (spinning || ready || finishedRef.current) ? 0.5 : 1,
              transition: "all 0.18s ease",
              zIndex: 6,
              letterSpacing: "0.04em",
            }}>
            {spinning ? "..." : ready ? "GIRADA" : "GIRAR"}
          </button>
        </div>
        {/* Contador de giros */}
        <div style={{
          fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 14,
          color: "#fce9a8", letterSpacing: "0.04em", textShadow: "0 2px 4px rgba(0,0,0,0.5)",
        }}>
          Giro {Math.min(giro + (ready ? 1 : 0), 1)}/1 &nbsp;·&nbsp; ✅ {aciertos}
        </div>
      </div>

      {/* Columna derecha: caso + botones de clasificación */}
      <div style={{
        display: "flex", flexDirection: "column", gap: 10,
        height: "100%", justifyContent: "center",
      }}>
        <div style={{
          background: ready ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.6)",
          color: "#1a1a1a",
          borderRadius: 12, padding: "10px 14px",
          border: `2px solid ${ready && currentCat ? currentCat.color : "#f2c260"}`,
          boxShadow: "0 6px 14px rgba(0,0,0,0.35)",
          fontFamily: "var(--ed-font-ui)", fontWeight: 500, fontSize: 13, lineHeight: 1.35,
          textAlign: "center", minHeight: 70,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontStyle: ready ? "normal" : "italic",
          opacity: ready ? 1 : 0.7,
        }}>
          {ready
            ? `"${currentCase}"`
            : (spinning ? "La ruleta está girando..." : "Toca GIRAR para empezar.")}
        </div>

        {/* 5 botones de clasificación */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {LP_RULETA_CATEGORIAS.map((c) => {
            const isPicked = picked === c.id;
            const isCorrectAnswer = feedback && feedback.correctId === c.id;
            const isWrongPick = feedback && isPicked && !feedback.isOk;
            const disabled = !ready || spinning || finishedRef.current || !!feedback;
            // Estilo según estado
            let bg, ink, border, boxShadow, transform;
            if (feedback && isCorrectAnswer) {
              bg = "#2ecc8f"; ink = "#0a3a25"; border = "2px solid #fce9a8";
              boxShadow = "0 0 0 3px rgba(255,255,255,1), 0 0 18px rgba(46,204,143,0.7)";
              transform = "translateY(-2px) scale(1.06)";
            } else if (isWrongPick) {
              bg = "#ff6b6b"; ink = "#fff"; border = "2px solid #fce9a8";
              boxShadow = "0 0 0 3px rgba(255,255,255,1), 0 0 18px rgba(255,107,107,0.7)";
              transform = "none";
            } else if (isPicked) {
              bg = c.color; ink = c.ink; border = "2px solid #fce9a8";
              boxShadow = "0 0 0 3px rgba(255,255,255,1), 0 0 18px rgba(252,233,168,0.7), inset 0 1px 0 rgba(255,255,255,0.4)";
              transform = "translateY(-2px) scale(1.04)";
            } else if (disabled) {
              bg = "rgba(60,60,60,0.5)"; ink = "rgba(252,233,168,0.5)"; border = `2px solid ${c.color}aa`;
              boxShadow = "inset 0 1px 0 rgba(255,255,255,0.2)"; transform = "none";
            } else {
              bg = `${c.color}66`; ink = "#fff"; border = `2px solid ${c.color}aa`;
              boxShadow = "inset 0 1px 0 rgba(255,255,255,0.2)"; transform = "none";
            }
            const label = (feedback && isCorrectAnswer)
              ? `✓ ${c.id}`
              : (isWrongPick ? `✗ ${c.id}` : c.id);
            return (
              <button key={c.id} onClick={() => !disabled && setPicked(c.id)} disabled={disabled}
                style={{
                  padding: "8px 6px", borderRadius: 10,
                  background: bg, color: ink,
                  fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 11,
                  border, boxShadow,
                  cursor: disabled ? "not-allowed" : "pointer",
                  letterSpacing: "0.02em",
                  transition: "all 0.2s ease",
                  opacity: disabled && !feedback ? 0.5 : 1,
                  transform,
                }}>{label}</button>
            );
          })}
        </div>

        {/* Banner de feedback */}
        {feedback && (
          <div style={{
            marginTop: 2, padding: "6px 10px", borderRadius: 8,
            background: feedback.isOk ? "rgba(46,204,143,0.95)" : "rgba(255,107,107,0.95)",
            color: "#fff",
            fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 12,
            textAlign: "center", letterSpacing: "0.04em",
            boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
          }}>
            {feedback.isOk ? "✓ ¡Correcto!" : `✗ Era ${feedback.correctId}`}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// RESULTS — reporte académico (compartido entre los 2 niveles)
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
                  {e.isCorrect ? "✓ Correcto" : "✗ Por mejorar"}
                </td>
                <td style={{ ...printStyles.td, ...printStyles.tdR, ...printStyles.tdDim }}>{e.time}s</td>
              </tr>
            ))}
            {log.length === 0 && (
              <tr><td colSpan={6} style={printStyles.tdEmpty}>Sin retos registrados.</td></tr>
            )}
          </tbody>
        </table>

        <div style={printStyles.summary}>
          <div style={printStyles.cell}>
            <div style={printStyles.cellL}>Intentos</div>
            <div style={printStyles.cellV}>{attemptedCount}/{totalEx}</div>
          </div>
          <div style={printStyles.cell}>
            <div style={printStyles.cellL}>Correctos</div>
            <div style={printStyles.cellV}>{res.solved || 0}</div>
          </div>
          <div style={printStyles.cell}>
            <div style={printStyles.cellL}>Precisión</div>
            <div style={printStyles.cellV}>{accuracy}%</div>
          </div>
          <div style={{ ...printStyles.cell, ...printStyles.cellEmp }}>
            <div style={printStyles.cellL}>Estrellas</div>
            <div style={printStyles.cellV}>⭐ {res.starsEarned || 0}</div>
          </div>
        </div>

        <div style={printStyles.foot}>
          Reporte generado por EDINUN GAMES — Juego 5: Reglas C, S, Z + Lengua y pensamiento.
        </div>
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
            <button className="ed-btn ed-btn-primary" onClick={() => { setApp((st) => ({ ...st, stars: 0 })); go("game"); }}
              style={{ padding: "0 10px", fontSize: 13, height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>JUGAR OTRA RONDA</button>
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
