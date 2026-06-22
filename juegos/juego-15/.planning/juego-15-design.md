# Juego-15 — "El cuaderno de mis memorias" · diseño

## Tema

TEMA 1 del libro EDINUN de Lengua y Literatura, **10 años**: *Memorias como
género literario*. Contenidos clave que enseña el juego:
- Tipos de narrador: **protagonista** (cuenta su propia vida) vs **testigo**
  (relata lo que vivió/presenció otra persona).
- El lenguaje de las memorias es **personal y evocador**, no frío ni técnico.
- Una memoria mezcla **pasado y presente** y se ordena en el tiempo
  (planteamiento → nudo → desenlace / antes → después → ahora).
- Características: primera persona, emociones, recuerdos del pasado; NO 100%
  exacta, NO lenguaje de manual.

## Niveles

**1 nivel único (10 años), 3 rondas con mecánicas DISTINTAS** (estándar 7+).
Home sin chips de dificultad. Personaje destacado: **Márquez** (El
Cuentacuentos), cambiable en CharacterScreen.

## Mecánica

La autora pidió mecánicas **frescas** (no repetir ruleta/detective/shooter ya
muy usadas). Set elegido — incluye una mecánica **nueva en el repo**:

### R1 — El camino de los recuerdos (mecánica NUEVA: "un personaje avanza")
Tablero de casillas (start 🏠 → 4 casillas → meta 🏁). En cada casilla un
mini-reto de opción sobre las memorias. **Acierta → el personaje avanza una
casilla; falla → se queda** y se revela la opción correcta en verde ✓ (§11),
pero el camino continúa (no se atasca, espíritu §13). La ronda se considera
lograda si llega a la meta (4/4). Banco de 10 preguntas, FIFO `cam:` ventana
floor(N/2). Sin VERIFICAR (es tap por casilla); el tablero llama a `answer()`.

### R2 — La línea del tiempo (fresca: ordenar en timeline)
3 fragmentos barajados de UNA memoria + 3 casilleros verticales **Antes →
Después → Ahora**. Tap fragmento + tap casillero, o arrastrar (fallback tap).
VERIFICAR manual; cada casillero se colorea verde/rojo (§11). `id` de cada
fragmento = su orden correcto → validación `placed[s] === s`. Banco de 6
memorias, FIFO `tl:`. Enseña pasado+presente y orden temporal.

### R3 — El tono justo (fresca: elegir palabra evocadora)
Una memoria con un hueco y 3 finales: 1 evocador/emotivo (correcto), 1 plano,
1 frío/de manual. El niño elige el final "más vivo". Auto-evalúa al tocar
(sin VERIFICAR, igual que R1; aprobado por la autora 2026-06-22), con ~2.2 s
al fallar para ver el final correcto en verde ✓ (§11). Banco de 6, FIFO
`tono:`. Enseña el lenguaje personal y evocador de las memorias.

Contrato `lastResult` genérico (Reto / Tu respuesta / Respuesta correcta /
Estado / Tiempo). Scoring decreciente por tiempo (`calcStars`). 3 entradas en
`log`, una por ronda.

## Glifos del fondo

Palabras y símbolos del recuerdo (neutros para lenguaje):
- Cósmico (15): ayer · 📖 · 📓 · recuerdo · 💭 · 🕰 · 🌙 · ahora · ❤ · yo · ✉ · ✎ · ☕ · 📷 · 🍃
- Chalkboard (10): ayer · 📖 · recuerdo · ✎ · ahora · 💭 · 🕰 · yo · ❤ · 🌙

## Copy específico

- Home: "TEMA 1 · Memorias como género literario" + "recuerdo · emoción ·
  narrador · pasado y presente". Slug `juego-15`. Título
  "El cuaderno de mis memorias".
- Enunciados (QUÉ) / Bocadillos (CÓMO):
  - R1 — "Responde bien para llegar a la meta." / "Toca una opción; si aciertas, avanzas una casilla."
  - R2 — "Ordena los momentos de la memoria." / "Coloca cada parte: antes, después y ahora."
  - R3 — "Elige la palabra que sí emociona." / "Lee la frase y toca la opción más viva."

## Decisiones abiertas / riesgos

- **R1 todo-o-nada**: la ronda solo cuenta como correcta si el niño llega a la
  meta (4/4). Las preguntas son fáciles (2-3 opciones claras) para que 4/4 sea
  alcanzable a 10 años; el reporte muestra "X de 4 casillas". Si en aula resulta
  estricto, se puede bajar el umbral a 3/4 en `finishR1`.
- **R1 y R3 sin VERIFICAR** (excepción del estándar §10/§13 para mecánicas tipo
  quiz/tablero/elección; documentado y aprobado por la autora — R3 confirmado
  en vivo el 2026-06-22). Solo R2 (ordenar) conserva VERIFICAR manual.
- Emojis (📖 🏁 🧭 🕰) pueden no renderizar en sistemas muy viejos; sustituibles.

## QA visual

Playwright, flujo completo de las 3 rondas en los viewports canónicos.
Capturas en `.planning/qa-screenshots/`.
