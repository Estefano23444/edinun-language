# Otras palabras, otros mundos (juego-25) — diseño

## Tema
TEMA 2 del libro EDINUN de Lengua y Literatura, **14 años**:
**"¿Por qué el mundo se ve diferente según la lengua? ¿Realmente se ve
diferente?"** Audiencia: 14 años. **1 solo nivel.** Personaje destacado por
defecto: **Rolli** (escritor); el estudiante puede cambiarlo.

Contenido tomado **SOLO de las capturas del libro** que envió la autora (sin
inventar datos): la **hipótesis de Sapir-Whorf** / relatividad lingüística, los
**estereotipos en la publicidad** y la **desaparición de las lenguas**. Las
mecánicas NO replican los ejercicios del libro.

> Decisión con la autora: se descartó una primera idea de R2 ("constructor de
> una lengua inventada") porque obligaba a inventar morfemas. También se
> descartó la ronda de lenguas construidas (klingon/quenya/esperanto) por
> preferencia de la autora. La R2 final ("Rescata la lengua") la eligió ella
> entre tres bocetos.

## Niveles
Un único nivel (`lengua`, catLabel "Otras palabras, otros mundos"). Home sin
chips de dificultad; HUD sin tabs. 3 rondas con mecánicas DISTINTAS (estándar
7+). Debe ser **muy diferente al juego-24** (que usa shooter · simulador de
fases · memoria de parejas): aquí no se repite ninguna de esas tres.

## Mecánica (3 rondas, 3 interacciones distintas)

### R1 · Detector de estereotipos — DESLIZAR cartas (§13, auto-evaluado)
Aparece un mensaje publicitario y el estudiante **desliza la carta**: a la
izquierda si refuerza un **ESTEREOTIPO**, a la derecha si es **INCLUSIVO**.
También hay dos botones (alternativa al gesto). La carta se inclina y sale
volando; feedback verde/rojo y avanza sola. Auto-evaluado, sin VERIFICAR.
Mazo de **4 cartas** (2 estereotipo + 2 inclusivo). Se logra con **aciertos ≥ 3**.
Banco SÍ (estereotipo): los **8 estereotipos listados textualmente** en la
página "Los estereotipos en la publicidad" (la mujer y la limpieza, solo los
hombres y el deporte, niños celeste / niñas rosado, etc.). Banco NO (inclusivo):
su versión justa (aplicar el concepto del libro). Componente: `EstereotipoSwipe`.

### R2 · Rescata la lengua — TOCAR acciones (§13, auto-evaluado) — ronda elegida
Tablero de **6 acciones** (3 que mantienen viva la lengua, 3 que la debilitan)
con una **barra de vitalidad**. El estudiante **toca las acciones buenas**: la
barra sube y la carta queda verde (✓); si toca una mala, la carta tiembla y queda
roja (✗) **pero la barra no baja** (el progreso se mantiene). Termina al encontrar
las 3 buenas; **encontrarlas YA es éxito** (los errores no reprueban). Auto-evaluado,
sin VERIFICAR.
Banco: BUENAS = transmitir/usar/celebrar la lengua y sus tradiciones; MALAS =
asimilación cultural, reemplazo por un idioma dominante, abandono de tradiciones,
no transmitirla. Todo ligado a la captura: "la urbanización o la asimilación
cultural afectan la transmisión de tradiciones y costumbres que sostienen las
lenguas". Componente: `RescateLengua`.

### R3 · Descifra otro mundo — DESCIFRAR mensajes (§13, auto-evaluado)
> **NOTA (2026-06-22):** en la implementación esta ronda reemplazó a la diseñada
> "El medidor: ¿mito o verdad?" (arrastre de un marcador con VERIFICAR). Aquí se
> documenta lo que está en el código; la decisión de fondo (mantener "Descifra
> otro mundo" o retomar "El medidor") queda **abierta para la autora**.

Llega una **transmisión** en el idioma de un planeta; el estudiante usa la
**CLAVE del planeta** para traducirla y toca la opción correcta (3 opciones).
Cada planeta organiza la realidad distinto y encarna un ejemplo del libro: los
**colores** (un idioma con solo «claro/oscuro»), el **tiempo** (se lee de derecha
a izquierda) y los **números** (se arman por veintenas, como el francés). **3
retos** (uno de cada concepto, FIFO); se logra con **aciertos ≥ 2 de 3**.
Auto-evaluado, sin VERIFICAR. Al responder se revela la opción correcta (✓) y se
explica el porqué; la explicación refleja la hipótesis **DÉBIL** de Sapir-Whorf
(la lengua cambia cómo se NOMBRA el mundo, no lo que se puede ver). Componente:
`DescifraMundo`.

## Por qué no se repiten las mecánicas
- R1 = reflejos + criterio social (deslizar y clasificar una carta a la vez).
- R2 = rescate (tocar varias acciones de un tablero, barra de vitalidad).
- R3 = descifrado (traducir un mensaje con la clave del planeta y elegir).
Tres mecánicas distintas (deslizar · tablero con barra · descifrar con clave); R2
y R3 comparten el gesto de tocar, pero el tipo de pensamiento difiere. Ninguna
coincide con el juego-24 (shooter · simulador · memoria).

## Glifos del fondo
Tema lengua + percepción + mundo: 🌎 💬 👁️ 🌈 🔤 🧠 🗣️ 📖 🔢 🕐 📺 ✍️ ✨ ✦ ⭐.
CHALK 10, COSMIC 15.

## Copy específico
- Home label: "Otras palabras, otros mundos". Descripción: "¿El mundo se ve
  distinto según la lengua que hablas? Descúbrelo jugando."
- Enunciados (QUÉ): R1 "Decide si cada mensaje refuerza un estereotipo o es
  inclusivo." · R2 "Elige las acciones que mantienen viva la lengua." · R3
  "Descifra el mensaje de otro mundo."
- Bocadillos (CÓMO): R1 "Desliza la carta: izquierda si es estereotipo, derecha
  si es inclusiva." · R2 "Toca solo las acciones que ayudan a que la lengua siga
  viva." · R3 "Usa la clave del planeta para traducir el mensaje."
- FIFO key: `edinun_juego25_recientes_v1`.

## Decisiones / riesgos
- Diseño aprobado por la autora vía bocetos ASCII de pantalla completa; eligió
  Rolli como guía y la R2 "Rescata la lengua".
- 3 componentes nuevos (EstereotipoSwipe, RescateLengua, DescifraMundo); el
  shell (HUD, personaje, enunciado, action rail, modales, feedback, reporte) se
  hereda intacto del estándar (juego-22).
- Las cartas "inclusivo" (R1) y las afirmaciones "a medias" (R3) son
  aplicaciones del concepto del libro, no datos inventados; cada afirmación de
  R3 lleva su explicación citando la lógica del texto.
- Pendiente: QA visual con Playwright (flujo Home → Personaje → R1 → R2 → R3 →
  Resultados) y QA geométrica en 1920×1080 / 1280×800 / 1024×768.
