// game-screens.jsx — GameScreen + ResultsScreen para JUEGO-25
// "Otras palabras, otros mundos" (TEMA 2 del libro EDINUN, 14 años):
// ¿Por qué el mundo se ve diferente según la lengua? ¿Realmente se ve
// diferente? 1 nivel, 3 rondas con mecánicas DISTINTAS (estándar 7+):
//   R1 — Detector de estereotipos: DESLIZAR cartas. Aparece un mensaje
//        publicitario; el estudiante lo desliza a la izquierda (ESTEREOTIPO)
//        o a la derecha (INCLUSIVO). Auto-evaluado (§13), sin VERIFICAR.
//   R2 — Rescata la lengua: TOCAR acciones. Un tablero de acciones; toca
//        las que mantienen viva la lengua y evita las que la debilitan.
//        Barra de vitalidad. Auto-evaluado (§13), sin VERIFICAR.
//   R3 — Descifra otro mundo: DESCIFRAR mensajes. Llega una transmisión en el
//        idioma de un planeta (colores/tiempo/números); el estudiante usa la
//        CLAVE del planeta para traducirla. Auto-evaluado (§13), sin VERIFICAR.
//
// Contenido basado SOLO en las capturas del libro (hipótesis de Sapir-Whorf,
// relatividad lingüística, estereotipos en la publicidad y desaparición de
// las lenguas). Vocabulario ecuatoriano neutro. El shell (HUD, personaje,
// enunciado, action rail, modales, feedback, reporte, scoring por tiempo) se
// hereda del estándar. Personaje por defecto: Rolli (escritor).

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
  "¡Casi! Vuelve a leer con calma.",
  "Cada lengua es una forma de ver el mundo 🌎",
  "Equivocarse también es aprender.",
  "Respira y vuelve a intentarlo.",
  "Mira bien las palabras: ahí está la pista.",
  "¡La próxima es tuya!",
  "Piensa qué dice de verdad el mensaje.",
];

// ─────────────────────────────────────────────────────────────
// FIFO anti-repetición por categoría en un solo key de localStorage.
// Ventana ≈ floor(N/2) por categoría.
// ─────────────────────────────────────────────────────────────
const RECENT_KEY = "edinun_juego25_recientes_v1";
const RECENT_LIMIT = 40;

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
// Elige N ítems frescos distintos bloqueando los ~floor(N/2) más recientes de
// su categoría; nunca vacía el pool y procura no repetir lo último jugado.
function pickFreshN(bank, prefix, idOf, n) {
  const out = [];
  const used = new Set();
  const pre = prefix + ":";
  for (let k = 0; k < n; k++) {
    const recentIds = getRecent().filter((x) => x.startsWith(pre)).map((x) => x.slice(pre.length));
    const windowN = Math.floor(bank.length / 2);
    const blocked = new Set(recentIds.slice(0, windowN));
    let pool = bank.filter((b) => !blocked.has(idOf(b)) && !used.has(idOf(b)));
    if (pool.length === 0) pool = bank.filter((b) => !used.has(idOf(b)));
    if (pool.length === 0) pool = bank;
    const p = pool[Math.floor(Math.random() * pool.length)];
    used.add(idOf(p));
    pushRecent(pre + idOf(p));
    out.push(p);
  }
  return out;
}

// ═════════════════════════════════════════════════════════════
// BANCOS DE DATOS — TEMA 2 (la lengua y la percepción · estereotipos ·
// desaparición de las lenguas). Tomado de las capturas del libro.
// ═════════════════════════════════════════════════════════════

// R1 — DESLIZAR. ESTEREOTIPOS: los 8 mensajes listados textualmente en la
// página "Los estereotipos en la publicidad". INCLUSIVOS: su versión justa
// (aplicar el concepto del libro, sin inventar datos nuevos).
const R1_ESTEREOTIPOS = [
  { id: "e1", emoji: "🧹", text: "La mujer es la encargada de la limpieza y las tareas del hogar." },
  { id: "e2", emoji: "⚽", text: "Solo los hombres disfrutan los deportes." },
  { id: "e3", emoji: "🧸", text: "A los niños les gusta el celeste y a las niñas el rosado." },
  { id: "e4", emoji: "💄", text: "La mujer siempre debe ser guapa y lucir bien." },
  { id: "e5", emoji: "🚗", text: "Los hombres manejan autos grandes y las mujeres no." },
  { id: "e6", emoji: "📱", text: "Los hombres saben de tecnología y pueden arreglarlo todo." },
  { id: "e7", emoji: "💪", text: "El hombre es fuerte y exitoso." },
  { id: "e8", emoji: "👔", text: "El jefe es malvado y siempre grita a los trabajadores." },
];
const R1_INCLUSIVOS = [
  { id: "i1", emoji: "🧹", text: "En casa, las tareas del hogar se reparten entre todos." },
  { id: "i2", emoji: "⚽", text: "Tanto mujeres como hombres disfrutan los deportes." },
  { id: "i3", emoji: "🧸", text: "Cada niña o niño elige los colores y juegos que prefiere." },
  { id: "i4", emoji: "💄", text: "Una persona vale por quién es, no por su apariencia." },
  { id: "i5", emoji: "🚗", text: "Cualquier persona puede conducir cualquier auto." },
  { id: "i6", emoji: "📱", text: "Cualquier persona puede aprender de tecnología." },
  { id: "i7", emoji: "💪", text: "La fuerza y el éxito no dependen del género." },
  { id: "i8", emoji: "👔", text: "Un buen jefe escucha y respeta a su equipo." },
];

// R2 — TOCAR. Acciones que MANTIENEN viva una lengua vs acciones que la
// DEBILITAN, ligadas a lo que dice el libro: la transmisión de tradiciones y
// costumbres sostiene las lenguas; la urbanización, la asimilación cultural y
// el reemplazo por un idioma dominante las hacen desaparecer.
const R2_BUENAS = [
  { id: "b1", text: "Enseñarla a los niños y jóvenes" },
  { id: "b2", text: "Hablarla en casa y en la comunidad" },
  { id: "b3", text: "Mantener vivas sus tradiciones y costumbres" },
  { id: "b4", text: "Compartir sus cuentos y canciones" },
  { id: "b5", text: "Sentir orgullo por la lengua propia" },
  { id: "b6", text: "Celebrar sus fiestas y relatos en familia" },
];
const R2_MALAS = [
  { id: "m1", text: "Dejar de hablarla por la asimilación cultural" },
  { id: "m2", text: "Reemplazarla por un solo idioma dominante" },
  { id: "m3", text: "Abandonar sus tradiciones y costumbres" },
  { id: "m4", text: "No transmitirla a las nuevas generaciones" },
  { id: "m5", text: "Avergonzarse de hablar la lengua propia" },
  { id: "m6", text: "Usarla cada vez menos hasta olvidarla" },
];

// R3 — DESCIFRAR. Llega un mensaje de otro mundo escrito en un idioma que
// organiza la realidad distinto al español (relatividad lingüística, hipótesis
// de Sapir-Whorf). El estudiante usa la CLAVE del planeta para traducirlo. Cada
// planeta encarna un ejemplo real del libro: los colores (como el idioma dani),
// el tiempo (como el árabe, derecha→izquierda) y los números (como el francés,
// que arma el 92 por veintenas). makeProblemR3 toma uno de cada grupo en orden.
const R3_COLORES = [
  { id: "kael1", planeta: "KAEL", emoji: "🪐",
    regla: "En Kael solo existen 2 colores: claro y oscuro.",
    mensaje: ["TIK", "SORA", "LUM"],
    clave: [ { a: "TIK", es: "el / la" }, { a: "SORA", es: "cielo" }, { a: "LUM", es: "claro", color: true }, { a: "DUN", es: "oscuro", color: true } ],
    pregunta: "¿Qué dice el mensaje?",
    opciones: [ { text: "El cielo claro", ok: true }, { text: "El cielo azul", ok: false }, { text: "El mar oscuro", ok: false } ],
    explica: "En Kael no tienen la palabra «azul»: a ese color lo llaman «claro». Ven el mismo cielo; solo cambia cómo lo nombran." },
  { id: "kael2", planeta: "KAEL", emoji: "🪐",
    regla: "En Kael solo existen 2 colores: claro y oscuro.",
    mensaje: ["NEVA", "LUM"],
    clave: [ { a: "NEVA", es: "nieve" }, { a: "LUM", es: "claro", color: true }, { a: "DUN", es: "oscuro", color: true } ],
    pregunta: "¿Qué dice el mensaje?",
    opciones: [ { text: "Nieve clara", ok: true }, { text: "Nieve blanca", ok: false }, { text: "Nieve brillante", ok: false } ],
    explica: "En Kael no tienen «blanco» ni «brillante»: a la nieve la llaman «clara». La ven igual que tú; solo le dan otro nombre." },
  { id: "vure1", planeta: "VURË", emoji: "🌑",
    regla: "En Vurë solo existen 2 colores: claro y oscuro.",
    mensaje: ["TIK", "MARU", "DUN"],
    clave: [ { a: "TIK", es: "el / la" }, { a: "MARU", es: "mar" }, { a: "LUM", es: "claro", color: true }, { a: "DUN", es: "oscuro", color: true } ],
    pregunta: "¿Qué dice el mensaje?",
    opciones: [ { text: "El mar oscuro", ok: true }, { text: "El mar azul", ok: false }, { text: "El mar verde", ok: false } ],
    explica: "En Vurë no tienen «azul» ni «verde»: al mar lo llaman «oscuro». Es el mismo mar; cambia la palabra, no lo que ven." },
  { id: "vure2", planeta: "VURË", emoji: "🌑",
    regla: "En Vurë solo existen 2 colores: claro y oscuro.",
    mensaje: ["TIK", "FLORA", "LUM"],
    clave: [ { a: "TIK", es: "la" }, { a: "FLORA", es: "flor" }, { a: "LUM", es: "claro", color: true }, { a: "DUN", es: "oscuro", color: true } ],
    pregunta: "¿Qué dice el mensaje?",
    opciones: [ { text: "La flor clara", ok: true }, { text: "La flor roja", ok: false }, { text: "La flor amarilla", ok: false } ],
    explica: "En Vurë no tienen «roja» ni «amarilla»: a la flor la llaman «clara». La ven igual; solo la nombran distinto." },
  { id: "kael3", planeta: "KAEL", emoji: "🪐",
    regla: "En Kael solo existen 2 colores: claro y oscuro.",
    mensaje: ["TIK", "NOK", "DUN"],
    clave: [ { a: "TIK", es: "la" }, { a: "NOK", es: "noche" }, { a: "LUM", es: "claro", color: true }, { a: "DUN", es: "oscuro", color: true } ],
    pregunta: "¿Qué dice el mensaje?",
    opciones: [ { text: "La noche oscura", ok: true }, { text: "La noche negra", ok: false }, { text: "La noche morada", ok: false } ],
    explica: "En Kael no tienen «negra» ni «morada»: a la noche la llaman «oscura». Ven lo mismo; solo cambia el nombre." },
  { id: "kael4", planeta: "KAEL", emoji: "🪐",
    regla: "En Kael solo existen 2 colores: claro y oscuro.",
    mensaje: ["TIK", "SORA", "DUN"],
    clave: [ { a: "TIK", es: "el / la" }, { a: "SORA", es: "cielo" }, { a: "LUM", es: "claro", color: true }, { a: "DUN", es: "oscuro", color: true } ],
    pregunta: "¿Qué dice el mensaje?",
    opciones: [ { text: "El cielo oscuro", ok: true }, { text: "El cielo gris", ok: false }, { text: "El cielo violeta", ok: false } ],
    explica: "En Kael no tienen «gris» ni «violeta»: a ese cielo lo llaman «oscuro». El cielo es el mismo; cambia cómo lo dicen." },
  { id: "vure3", planeta: "VURË", emoji: "🌑",
    regla: "En Vurë solo existen 2 colores: claro y oscuro.",
    mensaje: ["NEVA", "DUN"],
    clave: [ { a: "NEVA", es: "nieve" }, { a: "LUM", es: "claro", color: true }, { a: "DUN", es: "oscuro", color: true } ],
    pregunta: "¿Qué dice el mensaje?",
    opciones: [ { text: "Nieve oscura", ok: true }, { text: "Nieve sucia", ok: false }, { text: "Nieve azulada", ok: false } ],
    explica: "En Vurë no tienen «sucia» ni «azulada»: a esa nieve la llaman «oscura». La ven igual; solo la nombran distinto." },
];
const R3_TIEMPO = [
  { id: "zira1", planeta: "ZIRA", emoji: "🌌",
    rtl: true,
    regla: "En Zira el tiempo se lee al revés: de DERECHA a IZQUIERDA.",
    mensaje: ["KEEN", "MOLA", "ZUP"],
    clave: [ { a: "ZUP", es: "comer" }, { a: "MOLA", es: "jugar" }, { a: "KEEN", es: "dormir" } ],
    pregunta: "¿Qué hace PRIMERO el extraterrestre?",
    opciones: [ { text: "Comer", ok: true }, { text: "Jugar", ok: false }, { text: "Dormir", ok: false } ],
    explica: "En Zira el tiempo va de derecha a izquierda, así que lo primero es lo de la derecha: ZUP = comer." },
  { id: "zira2", planeta: "ZIRA", emoji: "🌌",
    rtl: true,
    regla: "En Zira el tiempo se lee al revés: de DERECHA a IZQUIERDA.",
    mensaje: ["SUNA", "REMA", "TOBI"],
    clave: [ { a: "TOBI", es: "estudiar" }, { a: "REMA", es: "comer" }, { a: "SUNA", es: "dormir" } ],
    pregunta: "¿Qué hace AL FINAL?",
    opciones: [ { text: "Dormir", ok: true }, { text: "Comer", ok: false }, { text: "Estudiar", ok: false } ],
    explica: "Lo último es lo de la izquierda: SUNA = dormir. En Zira el tiempo corre al revés del español." },
  { id: "omak1", planeta: "OMAK", emoji: "🪐",
    rtl: true,
    regla: "En Omak el tiempo se lee al revés: de DERECHA a IZQUIERDA.",
    mensaje: ["BRIL", "NOKA", "PESH"],
    clave: [ { a: "PESH", es: "correr" }, { a: "NOKA", es: "leer" }, { a: "BRIL", es: "cantar" } ],
    pregunta: "¿Qué hace PRIMERO el extraterrestre?",
    opciones: [ { text: "Correr", ok: true }, { text: "Leer", ok: false }, { text: "Cantar", ok: false } ],
    explica: "Lo primero es lo de la derecha: PESH = correr. En Omak el tiempo va de derecha a izquierda." },
  { id: "omak2", planeta: "OMAK", emoji: "🪐",
    rtl: true,
    regla: "En Omak el tiempo se lee al revés: de DERECHA a IZQUIERDA.",
    mensaje: ["GUNA", "TARO", "VEXA"],
    clave: [ { a: "VEXA", es: "desayunar" }, { a: "TARO", es: "caminar" }, { a: "GUNA", es: "bañarse" } ],
    pregunta: "¿Qué hace AL FINAL?",
    opciones: [ { text: "Bañarse", ok: true }, { text: "Caminar", ok: false }, { text: "Desayunar", ok: false } ],
    explica: "Lo último es lo de la izquierda: GUNA = bañarse. En Omak el tiempo corre al revés del español." },
  { id: "zira3", planeta: "ZIRA", emoji: "🌌",
    rtl: true,
    regla: "En Zira el tiempo se lee al revés: de DERECHA a IZQUIERDA.",
    mensaje: ["LIMU", "FANO", "DRIK"],
    clave: [ { a: "DRIK", es: "lavarse" }, { a: "FANO", es: "vestirse" }, { a: "LIMU", es: "salir" } ],
    pregunta: "¿Qué hace PRIMERO el extraterrestre?",
    opciones: [ { text: "Lavarse", ok: true }, { text: "Vestirse", ok: false }, { text: "Salir", ok: false } ],
    explica: "Lo primero es lo de la derecha: DRIK = lavarse. En Zira el tiempo va de derecha a izquierda." },
  { id: "zira4", planeta: "ZIRA", emoji: "🌌",
    rtl: true,
    regla: "En Zira el tiempo se lee al revés: de DERECHA a IZQUIERDA.",
    mensaje: ["POLU", "NARI", "TESH"],
    clave: [ { a: "TESH", es: "pintar" }, { a: "NARI", es: "secar" }, { a: "POLU", es: "guardar" } ],
    pregunta: "¿Qué hace AL FINAL?",
    opciones: [ { text: "Guardar", ok: true }, { text: "Secar", ok: false }, { text: "Pintar", ok: false } ],
    explica: "Lo último es lo de la izquierda: POLU = guardar. En Zira el tiempo corre al revés del español." },
  { id: "omak3", planeta: "OMAK", emoji: "🪐",
    rtl: true,
    regla: "En Omak el tiempo se lee al revés: de DERECHA a IZQUIERDA.",
    mensaje: ["YORA", "MIBO", "KASU"],
    clave: [ { a: "KASU", es: "despertar" }, { a: "MIBO", es: "desayunar" }, { a: "YORA", es: "ir a la escuela" } ],
    pregunta: "¿Qué hace PRIMERO el extraterrestre?",
    opciones: [ { text: "Despertar", ok: true }, { text: "Desayunar", ok: false }, { text: "Ir a la escuela", ok: false } ],
    explica: "Lo primero es lo de la derecha: KASU = despertar. En Omak el tiempo va de derecha a izquierda." },
];
const R3_NUMEROS = [
  { id: "nove1", planeta: "NOVE", emoji: "🛰️",
    regla: "En Nove los números se arman por veintenas: VEK = veinte (20).",
    mensaje: ["VEK", "VEK", "VEK", "VEK", "+ 12"],
    clave: [ { a: "VEK", es: "veinte (20)" }, { a: "+ 12", es: "más doce" } ],
    pregunta: "¿Qué número es «cuatro VEK y doce»?",
    opciones: [ { text: "92", ok: true }, { text: "82", ok: false }, { text: "412", ok: false } ],
    explica: "Cuatro veintenas (4×20 = 80) más doce = 92. En Nove los números se arman así." },
  { id: "nove2", planeta: "NOVE", emoji: "🛰️",
    regla: "En Nove los números se arman por veintenas: VEK = veinte (20).",
    mensaje: ["VEK", "VEK", "VEK", "+ 5"],
    clave: [ { a: "VEK", es: "veinte (20)" }, { a: "+ 5", es: "más cinco" } ],
    pregunta: "¿Qué número es «tres VEK y cinco»?",
    opciones: [ { text: "65", ok: true }, { text: "35", ok: false }, { text: "305", ok: false } ],
    explica: "Tres veintenas (3×20 = 60) más cinco = 65. Nove arma los números por veintenas." },
  { id: "trell1", planeta: "TRELL", emoji: "☄️",
    regla: "En Trell los números se arman por veintenas: VEK = veinte (20).",
    mensaje: ["VEK", "VEK", "+ 7"],
    clave: [ { a: "VEK", es: "veinte (20)" }, { a: "+ 7", es: "más siete" } ],
    pregunta: "¿Qué número es «dos VEK y siete»?",
    opciones: [ { text: "47", ok: true }, { text: "27", ok: false }, { text: "207", ok: false } ],
    explica: "Dos veintenas (2×20 = 40) más siete = 47. En Trell los números se arman así." },
  { id: "trell2", planeta: "TRELL", emoji: "☄️",
    regla: "En Trell los números se arman por veintenas: VEK = veinte (20).",
    mensaje: ["VEK", "VEK", "VEK", "+ 10"],
    clave: [ { a: "VEK", es: "veinte (20)" }, { a: "+ 10", es: "más diez" } ],
    pregunta: "¿Qué número es «tres VEK y diez»?",
    opciones: [ { text: "70", ok: true }, { text: "40", ok: false }, { text: "310", ok: false } ],
    explica: "Tres veintenas (3×20 = 60) más diez = 70. En Trell los números se arman así." },
  { id: "nove3", planeta: "NOVE", emoji: "🛰️",
    regla: "En Nove los números se arman por veintenas: VEK = veinte (20).",
    mensaje: ["VEK", "VEK", "+ 3"],
    clave: [ { a: "VEK", es: "veinte (20)" }, { a: "+ 3", es: "más tres" } ],
    pregunta: "¿Qué número es «dos VEK y tres»?",
    opciones: [ { text: "43", ok: true }, { text: "23", ok: false }, { text: "203", ok: false } ],
    explica: "Dos veintenas (2×20 = 40) más tres = 43. En Nove los números se arman así." },
  { id: "nove4", planeta: "NOVE", emoji: "🛰️",
    regla: "En Nove los números se arman por veintenas: VEK = veinte (20).",
    mensaje: ["VEK", "VEK", "VEK", "VEK", "+ 1"],
    clave: [ { a: "VEK", es: "veinte (20)" }, { a: "+ 1", es: "más uno" } ],
    pregunta: "¿Qué número es «cuatro VEK y uno»?",
    opciones: [ { text: "81", ok: true }, { text: "41", ok: false }, { text: "401", ok: false } ],
    explica: "Cuatro veintenas (4×20 = 80) más uno = 81. En Nove los números se arman así." },
  { id: "trell3", planeta: "TRELL", emoji: "☄️",
    regla: "En Trell los números se arman por veintenas: VEK = veinte (20).",
    mensaje: ["VEK", "+ 8"],
    clave: [ { a: "VEK", es: "veinte (20)" }, { a: "+ 8", es: "más ocho" } ],
    pregunta: "¿Qué número es «un VEK y ocho»?",
    opciones: [ { text: "28", ok: true }, { text: "108", ok: false }, { text: "18", ok: false } ],
    explica: "Una veintena (1×20 = 20) más ocho = 28. En Trell los números se arman así." },
];

// ─────────────────────────────────────────────────────────────
// makeProblem por ronda (una sola vez por montaje del juego)
// ─────────────────────────────────────────────────────────────
function makeProblemR1() {
  const est = pickFreshN(R1_ESTEREOTIPOS, "est", (x) => x.id, 2);
  const inc = pickFreshN(R1_INCLUSIVOS, "inc", (x) => x.id, 2);
  const deck = shuffle([
    ...est.map((c) => ({ ...c, isEstereotipo: true })),
    ...inc.map((c) => ({ ...c, isEstereotipo: false })),
  ]); // mazo de 4 cartas balanceado: 2 estereotipo + 2 inclusivo
  return { deck };
}
function makeProblemR2() {
  const buenas = pickFreshN(R2_BUENAS, "buena", (x) => x.id, 3).map((c) => ({ ...c, good: true }));
  const malas = pickFreshN(R2_MALAS, "mala", (x) => x.id, 3).map((c) => ({ ...c, good: false }));
  return { cards: shuffle([...buenas, ...malas]) };
}
function makeProblemR3() {
  // Un reto de cada concepto, en orden: colores → tiempo → números.
  const c = pickFreshN(R3_COLORES, "pcol", (x) => x.id, 1)[0];
  const t = pickFreshN(R3_TIEMPO, "ptie", (x) => x.id, 1)[0];
  const n = pickFreshN(R3_NUMEROS, "pnum", (x) => x.id, 1)[0];
  return { retos: [c, t, n] };
}

// ═════════════════════════════════════════════════════════════
// Shell común: HUD, modales, action rail, feedback, personaje
// ═════════════════════════════════════════════════════════════
function GameEnunciado({ text, top = 82 }) {
  if (!text) return null;
  return (
    <div data-qa="enunciado" style={{
      position: "absolute", top, left: "50%", transform: "translateX(-50%)", width: 470,
      textAlign: "center",
      fontFamily: "var(--ed-font-display)", fontWeight: 700,
      fontSize: 17, lineHeight: 1.2,
      color: "#fff",
      textShadow: "0 2px 6px rgba(0,0,0,0.6)",
      pointerEvents: "none", zIndex: 5,
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

function ActionRail({ canVerify, onVerify, hideVerify, showErase, onErase, onRestart, onExit }) {
  return (
    <div data-qa="acciones" style={{
      position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
      display: "flex", flexDirection: "column", gap: 10, width: 148,
    }}>
      {!hideVerify && (
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
            fontWeight: 700, fontSize: "clamp(16px, 2.4vmin, 26px)",
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
        <char.Component size={190} floating />
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
        .ed-draggable { touch-action: none; user-select: none; -webkit-user-select: none; }
        @keyframes ed-shake-x {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
      <LenguaGame key={`lengua-${restartTick}`} app={app} setApp={setApp} go={go} onRestart={restart} />
    </>
  );
}

function LenguaGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "Otras palabras, otros mundos";

  const [ronda, setRonda] = useStateG(0);

  // Picks por ronda (una sola vez por montaje).
  const [r1Pick] = useStateG(() => makeProblemR1());
  const [r2Pick] = useStateG(() => makeProblemR2());
  const [r3Pick] = useStateG(() => makeProblemR3());

  // R1 — swipe (auto-evaluado)
  const r1DoneRef = useRefG(false);
  // R2 — rescate (auto-evaluado)
  const r2DoneRef = useRefG(false);
  // R3 — descifrar (auto-evaluado, como R1 y R2)
  const r3DoneRef = useRefG(false);

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

  // Robustez: si el niño pulsa SALIR/REINICIAR durante la ventana de feedback,
  // el componente se desmonta pero el setTimeout de answer() sigue vivo. aliveRef
  // + answerRef evitan setState/navegación sobre una instancia muerta.
  const aliveRef = useRefG(true);
  const answerRef = useRefG(null);
  useEffectG(() => () => { aliveRef.current = false; clearTimeout(answerRef.current); }, []);

  useEffectG(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started.current) / 1000)), 500);
    return () => clearInterval(id);
  }, []);

  // Las 3 rondas se AUTO-EVALÚAN (R1 deslizar, R2 rescate, R3 descifrar al tocar),
  // así que no hay VERIFICAR manual en ninguna.
  const canVerify = false;

  function handleSwipeFinish(s) {
    if (r1DoneRef.current) return;
    r1DoneRef.current = true;
    const correct = s.aciertos >= 3;
    const u = `${s.aciertos}/${s.total} bien clasificadas`;
    answer(correct, u, "Distinguir estereotipo vs inclusión", "📺", "Detector de estereotipos", null);
  }

  function handleRescateFinish(res) {
    if (r2DoneRef.current) return;
    r2DoneRef.current = true;
    // Encontrar las 3 acciones buenas YA es éxito: los errores no reprueban
    // (la ronda solo termina al hallar las 3). El progreso no se penaliza.
    const correct = res.salvadas >= res.total;
    const u = `${res.salvadas}/${res.total} acciones que la salvan`;
    answer(correct, u, "Elegir solo acciones que la mantienen viva", "🪶", "Rescata la lengua", null);
  }

  function handleDescifraFinish(s) {
    if (r3DoneRef.current) return;
    r3DoneRef.current = true;
    const correct = s.aciertos >= 2;
    const u = `${s.aciertos}/${s.total} mensajes descifrados`;
    answer(correct, u, "Descifrar mensajes de otros mundos", "🛸", "Descifra otro mundo", null);
  }

  function answer(isCorrect, userText, correctText, opIcon, reto, note) {
    if (!aliveRef.current) return;
    if (typeof window.markFirstAttempt === "function") window.markFirstAttempt();
    const exerciseSec = Math.max(0, Math.floor((Date.now() - exerciseStart.current) / 1000));
    const earned = calcStars(isCorrect, exerciseSec);
    const newAttempted = attempted + 1;
    const newSolved = solved + (isCorrect ? 1 : 0);
    const newStarsTotal = stars + earned;
    const newStarsSession = starsSession + earned;

    const entry = {
      idx: newAttempted,
      a: reto || correctText, b: userText, op: opIcon || "·",
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

    const wait = isCorrect ? 1100 : 1600;
    answerRef.current = setTimeout(() => {
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
    ronda === 0 ? "Decide si cada mensaje refuerza un estereotipo o es inclusivo." :
    ronda === 1 ? "Elige las acciones que mantienen viva la lengua." :
    "Descifra el mensaje de otro mundo.";
  const bocadillo =
    ronda === 0 ? "Desliza la carta:\nizquierda si es estereotipo,\nderecha si es inclusiva." :
    ronda === 1 ? "Toca solo las acciones\nque ayudan a que la\nlengua siga viva." :
    "Usa la clave del planeta\npara traducir el mensaje.";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <GameHUD elapsed={elapsed} stars={stars} attempted={attempted} solved={solved} total={3} />
      <CharacterCorner char={char} message={bocadillo} />
      <GameEnunciado text={enunciado} top={ronda === 0 ? 100 : ronda === 2 ? 102 : 108} />

      {ronda === 0 && (
        <EstereotipoSwipe deck={r1Pick.deck} onFinish={handleSwipeFinish} />
      )}

      {ronda === 1 && (
        <RescateLengua cards={r2Pick.cards} onFinish={handleRescateFinish} />
      )}

      {ronda === 2 && (
        <DescifraMundo retos={r3Pick.retos} onFinish={handleDescifraFinish} />
      )}

      <ActionRail
        canVerify={canVerify}
        onVerify={() => {}}
        hideVerify={true}
        showErase={false}
        onErase={() => {}}
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
// R1 · Detector de estereotipos (DESLIZAR, §13). Aparece un mensaje
// publicitario; el estudiante lo desliza a la izquierda (ESTEREOTIPO) o a la
// derecha (INCLUSIVO). También hay dos botones para tocar. Auto-evaluado:
// se logra con aciertos ≥ 3 de 4.
// ─────────────────────────────────────────────────────────────
function EstereotipoSwipe({ deck, onFinish }) {
  const [idx, setIdx] = useStateG(0);
  const [drag, setDrag] = useStateG(0);
  const [flyOut, setFlyOut] = useStateG(null); // { dir }
  const [result, setResult] = useStateG(null); // { correct, real } — feedback por carta
  const aciertosRef = useRefG(0);
  const erroresRef = useRefG(0);
  const lockRef = useRefG(false);
  const draggingRef = useRefG(false);
  const startXRef = useRefG(0);
  const scaleRef = useRefG(1);
  const timerRef = useRefG(null);
  const flyRef = useRefG(null);
  const THRESH = 80;

  // Limpia los timers de decide()/flyAndNext si se desmonta a mitad de animación
  // (p. ej. SALIR/REINICIAR durante la primera ronda), evitando setState/onFinish
  // sobre el componente ya muerto.
  useEffectG(() => () => { clearTimeout(timerRef.current); clearTimeout(flyRef.current); }, []);

  const card = deck[idx];

  function decide(dir) {
    if (lockRef.current || !card) return;
    lockRef.current = true;
    draggingRef.current = false;
    const chosenEstereotipo = dir < 0;
    const correct = chosenEstereotipo === card.isEstereotipo;
    if (correct) aciertosRef.current += 1; else erroresRef.current += 1;

    // La carta sale volando hacia el lado elegido y pasa a la siguiente.
    const flyAndNext = () => {
      setFlyOut({ dir });
      setDrag(dir * 520);
      flyRef.current = setTimeout(() => {
        const next = idx + 1;
        setFlyOut(null);
        setResult(null);
        lockRef.current = false;
        if (next >= deck.length) {
          onFinish({ aciertos: aciertosRef.current, errores: erroresRef.current, total: deck.length });
        } else {
          setIdx(next);
          setDrag(0);
        }
      }, 420);
    };

    if (correct) {
      // Acierto: la carta se pinta de verde un instante (confirmación) y vuela;
      // sin la pantalla grande de feedback (eso queda solo para los errores).
      setResult({ correct: true });
      setDrag(0);
      timerRef.current = setTimeout(flyAndNext, 650);
    } else {
      // Error: mostrar la respuesta correcta (✗ + "Era…") un momento y avanzar.
      setResult({ correct, real: card.isEstereotipo });
      setDrag(0);
      timerRef.current = setTimeout(flyAndNext, 1700);
    }
  }

  function onPointerDown(e) {
    if (lockRef.current) return;
    // preventDefault corta el gesto nativo del navegador (selección de texto /
    // arrastrar) que, si no, dispara pointercancel a mitad del swipe y mataba
    // el arrastre (la carta no se movía). Ver QA del 2026-06-18.
    e.preventDefault();
    draggingRef.current = true;
    startXRef.current = e.clientX;
    // Escala real del lienzo (DeviceStage escala el 900×540 al viewport): ancho
    // renderizado / ancho lógico, para que la carta siga al dedo 1:1.
    const t = e.currentTarget;
    scaleRef.current = (t.getBoundingClientRect().width / t.offsetWidth) || 1;
    if (t.setPointerCapture) {
      try { t.setPointerCapture(e.pointerId); } catch {}
    }
  }
  function onPointerMove(e) {
    if (!draggingRef.current) return;
    e.preventDefault();
    setDrag((e.clientX - startXRef.current) / scaleRef.current);
  }
  function onPointerUp() {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    // Decidir según la posición ACTUAL de la carta (drag), no recalcular con
    // e.clientX: en un pointercancel ese dato llega inválido y mandaba la carta
    // siempre a la izquierda. Así cuenta el lado real al que la arrastraste.
    if (drag > THRESH) decide(1);
    else if (drag < -THRESH) decide(-1);
    else setDrag(0);
  }
  function onPointerCancel() {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (!lockRef.current) setDrag(0);
  }

  const tilt = Math.max(-14, Math.min(14, drag / 12));
  const leftHint = Math.max(0, Math.min(1, -drag / THRESH));
  const rightHint = Math.max(0, Math.min(1, drag / THRESH));

  return (
    <div data-qa="zona-central" style={{
      position: "absolute", top: 122, bottom: 14, left: "50%", transform: "translateX(-50%)",
      width: 460, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-evenly", gap: 8,
    }}>
      <div style={{
        fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 12,
        color: "#fce9a8", letterSpacing: "0.04em",
      }}>
        Carta {Math.min(idx + 1, deck.length)} de {deck.length}
      </div>

      {/* Carta deslizable */}
      <div style={{ position: "relative", width: 320, height: 156 }}>
        {card && (
          <div
            className="ed-draggable"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            style={{
              position: "absolute", inset: 0,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              textAlign: "center", padding: "12px 18px",
              borderRadius: 18,
              background: result && result.correct
                ? "linear-gradient(180deg, #e6fff2, #b9ffdd)"
                : "linear-gradient(180deg, #ffffff, #eef2ff)",
              border: result
                ? `3px solid ${result.correct ? "#2ecc8f" : "#ff6b6b"}`
                : "3px solid #f2c260",
              boxShadow: "0 14px 30px rgba(0,0,0,0.45)",
              color: "#1c2440",
              cursor: lockRef.current ? "default" : "grab",
              transform: `translateX(${drag}px) rotate(${tilt}deg)`,
              transition: draggingRef.current ? "none" : "transform 0.45s cubic-bezier(0.2,0.8,0.2,1), opacity 0.45s",
              opacity: flyOut ? 0 : 1,
              touchAction: "none",
            }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{card.emoji || "📺"}</div>
            <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 15, lineHeight: 1.22 }}>
              “{card.text}”
            </div>

            {/* Solo al fallar: etiqueta con la respuesta correcta DEBAJO del texto.
                Al acertar no se muestra texto: basta con que la carta se pinte verde. */}
            {result && !result.correct && (
              <div style={{
                marginTop: 9, fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 13.5,
                color: "#c33b3b",
              }}>
                {`Era ${result.real ? "estereotipo" : "inclusivo"}`}
              </div>
            )}

            {/* Insignia en la esquina: ✓ verde al acertar, ✗ roja al fallar */}
            {result && (
              <span style={{
                position: "absolute", top: -13, right: -13, width: 32, height: 32, borderRadius: "50%",
                background: result.correct ? "#2ecc8f" : "#ff6b6b", color: "#fff", fontSize: 18, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "3px solid #fff", boxShadow: "0 3px 10px rgba(0,0,0,0.4)",
                animation: "ed-pop-in 0.3s",
              }}>{result.correct ? "✓" : "✗"}</span>
            )}

            {/* Pistas que aparecen al arrastrar */}
            <div style={{
              position: "absolute", top: 12, left: 12, opacity: leftHint,
              background: "#ff6b6b", color: "#fff", borderRadius: 8, padding: "3px 9px",
              fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 12, letterSpacing: "0.04em",
              transform: "rotate(-10deg)",
            }}>ESTEREOTIPO</div>
            <div style={{
              position: "absolute", top: 12, right: 12, opacity: rightHint,
              background: "#2ecc8f", color: "#fff", borderRadius: 8, padding: "3px 9px",
              fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 12, letterSpacing: "0.04em",
              transform: "rotate(10deg)",
            }}>INCLUSIVO</div>
          </div>
        )}
      </div>

      {/* Botones de decisión (alternativa al deslizar) */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button onClick={() => decide(-1)} disabled={lockRef.current}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 16px", borderRadius: 12,
            border: "2px solid #ff6b6b", background: "rgba(255,107,107,0.16)",
            color: "#ffd9d9", fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 13,
            cursor: "pointer", letterSpacing: "0.03em",
          }}>
          ⬅️ ESTEREOTIPO
        </button>
        <button onClick={() => decide(1)} disabled={lockRef.current}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 16px", borderRadius: 12,
            border: "2px solid #2ecc8f", background: "rgba(46,204,143,0.16)",
            color: "#d4ffe9", fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 13,
            cursor: "pointer", letterSpacing: "0.03em",
          }}>
          INCLUSIVO ➡️
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// R2 · Rescata la lengua (TOCAR, §13). Tablero de 6 acciones (3 que la
// salvan, 3 que la debilitan). Toca las buenas: la barra de vitalidad sube;
// si tocas una mala NO baja (el progreso se mantiene): solo se marca en rojo.
// Auto-evaluado: se logra al encontrar las 3 buenas; los errores no reprueban.
// ─────────────────────────────────────────────────────────────
function RescateLengua({ cards, onFinish }) {
  const goodTotal = cards.filter((c) => c.good).length;
  const [picked, setPicked] = useStateG({}); // id -> "ok" | "bad"
  const [vit, setVit] = useStateG(0);
  const erroresRef = useRefG(0);
  const foundRef = useRefG(0);
  const doneRef = useRefG(false);
  const timerRef = useRefG(null);

  useEffectG(() => () => clearTimeout(timerRef.current), []);

  function tap(c) {
    if (doneRef.current || picked[c.id]) return;
    if (c.good) {
      foundRef.current += 1;
      setPicked((p) => ({ ...p, [c.id]: "ok" }));
      setVit((v) => Math.min(100, v + Math.ceil(100 / goodTotal)));
      if (foundRef.current >= goodTotal && !doneRef.current) {
        doneRef.current = true;
        timerRef.current = setTimeout(
          () => onFinish({ salvadas: foundRef.current, errores: erroresRef.current, total: goodTotal }), 750
        );
      }
    } else {
      erroresRef.current += 1;
      setPicked((p) => ({ ...p, [c.id]: "bad" }));
      // Al fallar NO se baja la barra: el progreso se MANTIENE (preferencia de la
      // autora). La carta queda roja con ✗ y cuenta como error para el cierre.
    }
  }

  const vitColor = vit >= 66 ? "#2ecc8f" : vit >= 33 ? "#f2c260" : "#ff6b6b";

  return (
    <div data-qa="zona-central" style={{
      position: "absolute", top: 120, bottom: 14, left: "50%", transform: "translateX(-50%)",
      width: 460, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14,
    }}>
      {/* Barra de vitalidad */}
      <div style={{ width: 360 }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4,
          fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 12, color: "#fce9a8",
        }}>
          <span>🪶 Vitalidad de la lengua</span>
          <span>{foundRef.current}/{goodTotal}</span>
        </div>
        <div style={{
          width: "100%", height: 16, borderRadius: 999, overflow: "hidden",
          background: "rgba(0,0,0,0.35)", border: "1.5px solid rgba(242,194,96,0.45)",
        }}>
          <div style={{
            width: `${vit}%`, height: "100%", background: vitColor,
            transition: "width 0.35s ease, background 0.35s ease",
            boxShadow: "0 0 12px currentColor",
          }} />
        </div>
      </div>

      {/* Tablero de acciones */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: 420 }}>
        {cards.map((c) => {
          const state = picked[c.id];
          let bg = "linear-gradient(180deg, #ffffff, #eef2ff)", border = "rgba(242,194,96,0.5)", ink = "#1c2440";
          if (state === "ok") { bg = "linear-gradient(180deg,#eafff5,#c6efda)"; border = "#2ecc8f"; }
          else if (state === "bad") { bg = "linear-gradient(180deg,#ffe3e3,#ffc4c4)"; border = "#ff6b6b"; }
          return (
            <button key={c.id}
              onClick={() => tap(c)}
              disabled={!!state || doneRef.current}
              style={{
                position: "relative", minHeight: 64, borderRadius: 14, padding: "10px 12px",
                border: `2px solid ${border}`, background: bg, color: ink,
                fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 13, lineHeight: 1.2,
                textAlign: "center", cursor: state ? "default" : "pointer",
                boxShadow: state ? "0 0 14px rgba(0,0,0,0.25)" : "0 4px 10px rgba(0,0,0,0.3)",
                animation: state === "bad" ? "ed-shake-x 0.4s" : "none",
                transition: "all 0.15s ease",
              }}>
              {c.text}
              {state && (
                <span style={{
                  position: "absolute", top: -8, right: -8, width: 22, height: 22, borderRadius: "50%",
                  background: state === "ok" ? "#2ecc8f" : "#ff6b6b", color: "#fff", fontSize: 13, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "2px solid #fff", boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                }}>{state === "ok" ? "✓" : "✗"}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// R3 · Descifra otro mundo (DESCIFRAR, §9). Llega una transmisión en el idioma
// de otro planeta; el estudiante usa la CLAVE del planeta para traducirla y
// toca la opción correcta. Cada planeta organiza la realidad distinto (colores,
// tiempo, números) → el chico VIVE la relatividad lingüística (Sapir-Whorf).
// Auto-evaluado (como R1/R2): se logra con aciertos ≥ 2 de 3. Al fallar marca
// la opción correcta en verde con ✓ (§11) y muestra la explicación más tiempo.
// ─────────────────────────────────────────────────────────────
function DescifraMundo({ retos, onFinish }) {
  const [idx, setIdx] = useStateG(0);
  const [picked, setPicked] = useStateG(null); // texto de la opción elegida
  const [result, setResult] = useStateG(null); // { correct }
  const aciertosRef = useRefG(0);
  const erroresRef = useRefG(0);
  const lockRef = useRefG(false);
  const timerRef = useRefG(null);

  useEffectG(() => () => clearTimeout(timerRef.current), []);

  const reto = retos[idx];
  const reveal = !!result;

  function choose(opt) {
    if (lockRef.current || !reto) return;
    lockRef.current = true;
    if (opt.ok) aciertosRef.current += 1; else erroresRef.current += 1;
    setPicked(opt.text);
    setResult({ correct: opt.ok });
    // Tiempo para leer la explicación (enseña el concepto Sapir-Whorf): generoso
    // también al acertar, no solo al fallar, porque el texto premiado es el mismo.
    const wait = opt.ok ? 3200 : 5200;
    timerRef.current = setTimeout(() => {
      const next = idx + 1;
      setResult(null);
      setPicked(null);
      lockRef.current = false;
      if (next >= retos.length) {
        onFinish({ aciertos: aciertosRef.current, errores: erroresRef.current, total: retos.length });
      } else {
        setIdx(next);
      }
    }, wait);
  }

  if (!reto) return null;

  return (
    <div data-qa="zona-central" style={{
      position: "absolute", top: 126, bottom: 12, left: "50%", transform: "translateX(-50%)",
      width: 384, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-evenly", gap: 6,
    }}>
      {/* Encabezado: planeta + progreso */}
      <div style={{
        fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 12,
        color: "#fce9a8", letterSpacing: "0.04em",
      }}>
        {reto.emoji} Planeta {reto.planeta} · Mensaje {Math.min(idx + 1, retos.length)} de {retos.length}
      </div>

      {/* Transmisión entrante (mensaje alienígena) */}
      <div style={{
        width: 356, borderRadius: 14, padding: "9px 12px 12px",
        background: "rgba(8,30,24,0.55)", border: "2px solid rgba(79,216,255,0.55)",
        boxShadow: "inset 0 0 18px rgba(79,216,255,0.22)",
      }}>
        <div style={{
          fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 10.5,
          color: "#7fe6ff", letterSpacing: "0.12em", textAlign: "center", marginBottom: 7,
        }}>
          🛸 TRANSMISIÓN ENTRANTE
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
          {reto.mensaje.map((w, i) => (
            <span key={i} style={{
              fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 18,
              color: "#eafcff", background: "rgba(79,216,255,0.16)",
              border: "1.5px solid rgba(79,216,255,0.5)", borderRadius: 9,
              padding: "7px 15px", letterSpacing: "0.06em",
            }}>{w}</span>
          ))}
        </div>
        {reto.rtl && (
          <div style={{
            marginTop: 7, textAlign: "center",
            fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 12,
            color: "#ffd76b", letterSpacing: "0.02em",
          }}>
            ⟸ se lee de DERECHA a IZQUIERDA
          </div>
        )}
      </div>

      {/* Clave del planeta */}
      <div style={{
        width: 356, borderRadius: 14, padding: "9px 14px 10px",
        background: "linear-gradient(180deg, #fffef8, #fdf3d8)",
        border: "3px solid #f2c260", boxShadow: "0 8px 20px rgba(0,0,0,0.32)", color: "#1c2440",
      }}>
        <div style={{
          fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 10.5,
          color: "#9a6a16", letterSpacing: "0.08em", textAlign: "center", marginBottom: 4,
        }}>
          🔑 CLAVE DEL PLANETA {reto.planeta}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "1px 16px", marginBottom: 5 }}>
          {reto.clave.map((k, i) => (
            <span key={i} style={{
              fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 12.5,
              color: k.color ? "#1e6fae" : "#2a3350",
            }}>
              <b>{k.a}</b> = {k.es}
            </span>
          ))}
        </div>
        <div style={{
          marginTop: 3,
          background: "rgba(255,138,76,0.18)",
          border: "1.5px solid rgba(214,90,30,0.5)",
          borderRadius: 9, padding: "5px 10px",
          fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 13,
          color: "#c0410f", textAlign: "center", lineHeight: 1.28,
        }}>
          ⚠ {reto.regla}
        </div>
      </div>

      {/* Pregunta */}
      {!reveal && (
        <div style={{
          fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 15,
          color: "#fff", textAlign: "center", textShadow: "0 1px 4px rgba(0,0,0,0.5)",
        }}>
          {reto.pregunta}
        </div>
      )}

      {/* Opciones de traducción */}
      <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", width: 384 }}>
        {reto.opciones.map((opt, i) => {
          const isChosen = picked === opt.text;
          let border = "2px solid rgba(255,255,255,0.55)";
          let bg = "rgba(255,255,255,0.12)";
          if (reveal) {
            if (opt.ok) { border = "3px solid #2ecc8f"; bg = "rgba(46,204,143,0.22)"; }
            else if (isChosen) { border = "3px solid #ff6b6b"; bg = "rgba(255,107,107,0.2)"; }
            else { bg = "rgba(255,255,255,0.05)"; }
          }
          return (
            <button key={i} onClick={() => choose(opt)} disabled={reveal}
              style={{
                position: "relative", padding: "10px 14px", borderRadius: 12,
                border, background: bg, color: "#fff",
                fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 13,
                cursor: reveal ? "default" : "pointer", maxWidth: 240, lineHeight: 1.15,
                transition: "background 0.2s, border-color 0.2s",
              }}>
              {opt.text}
              {reveal && opt.ok && (
                <span style={{
                  position: "absolute", top: -9, right: -9, width: 24, height: 24, borderRadius: "50%",
                  background: "#2ecc8f", color: "#fff", fontSize: 14, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "2px solid #fff", boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                }}>✓</span>
              )}
              {reveal && isChosen && !opt.ok && (
                <span style={{
                  position: "absolute", top: -9, right: -9, width: 24, height: 24, borderRadius: "50%",
                  background: "#ff6b6b", color: "#fff", fontSize: 14, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "2px solid #fff", boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                }}>✗</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Explicación al responder (enseña el concepto Sapir-Whorf) */}
      {reveal && (
        <div style={{
          width: 356, borderRadius: 12, padding: "9px 14px",
          background: result.correct ? "rgba(46,204,143,0.16)" : "rgba(255,107,107,0.14)",
          border: `1.5px solid ${result.correct ? "rgba(46,204,143,0.6)" : "rgba(255,107,107,0.55)"}`,
          fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 12, lineHeight: 1.3,
          color: "#fce9a8", textAlign: "center",
        }}>
          <span style={{ color: result.correct ? "#7dffc4" : "#ffb3b3" }}>
            {result.correct ? "¡Descifrado! " : "Casi: "}
          </span>
          {reto.explica}
        </div>
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
  const res = app.lastResult || { category: "Otras palabras, otros mundos", solved: 0, total: 3, time: 0, starsEarned: 0, log: [] };
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
