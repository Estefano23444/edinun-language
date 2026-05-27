# Juego 6 — Versos, recetas y palabras

## Tema
Adaptación del libro EDINUN para 8 años, dos temas:
- **Nivel 1: Texto poético** (Creador de sensaciones — figuras literarias, uso de la tilde, género de sustantivos).
- **Nivel 2: Texto instructivo** (¿Cómo lo hago? — kichwa/ayllu, recetas y orden, formación del plural).

Personaje destacado del landing: **Gaby la Poeta** (`poeta`).

## Niveles
Dos niveles fijos. Ambos para 8 años. Tres rondas por nivel, mecánica distinta en cada ronda (requisito 7+ años, ver `feedback_rondas-distintas-7anos`).

| Nivel | Tema | Ronda 1 | Ronda 2 | Ronda 3 |
|---|---|---|---|---|
| basic (`poetico`) | Texto poético | Ruleta poética | Detective de tildes | Memoria de parejas |
| medium (`instructivo`) | Texto instructivo | Kichwa árbol | Ordena la receta | Laboratorio plural |

Los nombres en `LEVELS_CFG`: ids `poetico` e `instructivo`, etiquetas "Texto poético" / "Texto instructivo".

## Mecánicas

### Nivel 1 — Texto poético

**R1 · 🎰 Ruleta poética**
Cartel central con una oración del libro. Debajo, una ruleta giratoria de 3 sectores (COMPARACIÓN 🌹 / METÁFORA ✨ / NINGUNA 📖). El niño toca un sector y la ruleta gira animadamente (2 vueltas + offset) hasta detenerse en su elección. VERIFICAR compara con el tipo real. Banco de 12 oraciones (4 por tipo) del Aplico del libro. Inspirado en backlog idea #1.

**R2 · 🔍 Detective de tildes**
Poema corto en cartel-pergamino. 3 palabras están escritas sin tilde. El niño toca cada palabra "sospechosa" → se enmarca en amarillo · contador `0/3 → 3/3`. VERIFICAR evalúa coincidencia exacta. Tras verificar, las palabras correctas se muestran con la tilde puesta automáticamente. 3 poemas distintos (`arbol`, `mama`, `pajaros`). Inspirado en backlog idea #2.

**R3 · 🃏 Memoria de parejas**
6 cartas boca abajo en grid 3×2 (3 parejas masc/fem mezcladas). Tap voltea una carta. Segundo tap voltea otra. Si forman pareja (mismo `pairId`) → quedan doradas con glow tras 500 ms. Si no, se voltean otra vez tras 900 ms. Cuando las 6 están emparejadas → VERIFICAR habilitado. 3 sets: (padre/madre, amigo/amiga, gallo/gallina), (caballo/yegua, jefe/jefa, bailarín/bailarina), (rey/reina, actor/actriz, héroe/heroína). Mecánica clásica kid-friendly.

### Nivel 2 — Texto instructivo

**R1 · 🌳 Empareja kichwa con el árbol familiar (AYLLU)**
6 miembros de la familia en grid 3×2 con emoji + etiqueta español + slot vacío. Bandeja con 6 etiquetas kichwa. Tap-tap: el niño toca una etiqueta (se eleva con glow), luego toca el miembro correspondiente → la etiqueta queda colocada en el slot. Si toca un miembro con etiqueta puesta sin tener otra en mano, la recoge. VERIFICAR compara cada miembro contra su kichwa correcto. 3 sets: familia básica · con tíos · con hermanos.

**R2 · 🍓 Ordena la receta**
5 tarjetas con emoji + texto (pasos numerados internamente 1–5), mezcladas. Tap-tap intercambia: el niño toca una tarjeta (se ilumina), luego toca otra → se intercambian de posición. VERIFICAR valida que el orden visual coincida con la secuencia 1→5. Si no está mezclada al iniciar (azar), se aplica swap forzoso. 3 procesos: batido del libro, lavarse las manos, hacer avión de papel.

**R3 · 🧪 Laboratorio del plural**
Cartel grande: `singular` + slot + `=` + cartel resultado (vacío). Bandeja con 2 sufijos: `-s` y `-es`. Tap selecciona el sufijo (entra al slot, glow azul) y el resultado se forma en vivo (`singular + sufijo`). VERIFICAR confirma. Pista pedagógica fija debajo del cartel: "Pista: '{palabra}' termina en vocal/consonante". 6 palabras del libro (flor, estrella, reloj, regla, color, teléfono). Inspirado en backlog idea #4.

## Cobertura del backlog
- ✅ #1 Ruleta (N1 R1)
- ✅ #2 Detective literario (N1 R2)
- ❌ #3 Personaje que avanza (no implementado — descartado por usuaria)
- ✅ #4 Laboratorio de palabras (N2 R3)
- ❌ #5 Acertijos (no implementado — descartado por usuaria)

## Glifos del fondo

**Cosmic** (home/character/results, 15): `✏ 📖 📜 ✨ á é í ó ú 🍓 🌳 ¿ ¡ 🧪 🎰`

**Chalkboard N1** (juego texto poético, 10): `✏ 📜 á é 📖 ? ✨ ¡ 🌹 🃏`

**Chalkboard N2** (juego texto instructivo, 10): `🍓 🌳 🧪 📜 🥛 ? 📖 ✏ → ¡`

## Copy específico
- **Home hero**: "EDINUN · Texto poético y palabras" (a través de la línea genérica del shell).
- **Bocadillos por ronda**:
  - N1R1: "Gira la ruleta al sector correcto."
  - N1R2: "Toca las 3 palabras con tilde olvidada."
  - N1R3: "Voltea cartas para emparejar."
  - N2R1: "Toca una etiqueta y luego el miembro."
  - N2R2: "Toca dos tarjetas para intercambiarlas."
  - N2R3: "Elige -s o -es para hacer el plural."
- **Enunciados** se ven en `GameEnunciado` arriba del lienzo.

## Mapeo del log

| Ronda | `a` | `b` | `op` |
|---|---|---|---|
| N1R1 | tipo correcto | tipo elegido | 🎰 |
| N1R2 | palabras tildadas correctas | palabras marcadas | 🔍 |
| N1R3 | "3 parejas" | "todas las parejas" | 🃏 |
| N2R1 | mapa EsKichwa correcto | mapa EsKichwa del estudiante | 🌳 |
| N2R2 | orden correcto | orden del estudiante | 🍓 |
| N2R3 | "singular + sufijo = plural" correcto | versión del estudiante | 🧪 |

## Decisiones abiertas / riesgos

1. **R1 ruleta**: la animación CSS `transform: rotate(720deg + baseAngle)` se acumula vuelta tras vuelta sin reset. Después de 3 ejercicios la ruleta queda en alto valor angular pero el cálculo modular nunca falla. Si se nota lentitud, agregar reset entre rondas.
2. **R3 memoria**: solo 6 cartas (3 parejas) en 3×2. Si se quisiera subir el reto a 5 parejas, ajustar el grid del array `r3Cards` y `r3Set.parejas`.
3. **N2R1 kichwa**: solo aceptamos kichwa estándar (sin distinción por género del hablante). Para `hermano/hermana` se usa `turi/pani` (perspectiva de mujer) — si la usuaria pide `wawki/ñaña` (perspectiva de hombre) para algún set, ajustar el banco.
4. **N2R2 ordena**: el tap-tap intercambia 2 tarjetas. Para 8 años funciona; si se ve lento, considerar drag HTML5 con reorder.
5. **N2R3 laboratorio**: solo cubre `-s` y `-es` (plurales regulares). Excepciones (`lápiz → lápices` con cambio z→c) podrían añadirse en una variante futura.
6. **QA mobile portrait**: el overlay "Gira tu teléfono" del shell bloquea el juego en 375×667, según el invariante del shell. Este es el comportamiento correcto y no se modifica.

## Tooling
- Bundle: `node .planning/bundle.js`
- QA: `node .planning/qa-checks.js` (necesita servidor en :8765)
- QA Nivel 2: `node .planning/qa-nivel2.js`
- QA Landing: `node .planning/qa-landing.js`
