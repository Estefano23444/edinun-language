# MEMORY — Juego 5

Bitácora del juego `juegos/juego-5/`.

## Origen
Quinto juego del repo `edinun-language`. Dos niveles temáticos del libro EDINUN
basados en el **Tema 3 "¿Quién hace las reglas de ortografía?"** y
**Tema 3 "La lengua, una marca del pensamiento"**:

- 🟠 **Reglas C, S, Z** (3 mecánicas distintas: completa con letra, trivia 3 cartas, shooter caza-errores)
- 🔵 **Lengua y pensamiento** (3 mecánicas distintas: speed quiz con combo, hashtag-match, shooter anti-spam horizontal)

## Audiencias por nivel (NO expuestas en UI)
- Nivel 1: 7 años (2do de primaria) — ortografía con C, S, Z.
- Nivel 2: 13 años (8vo de primaria) — cosmovisión, globalización, prejuicios, estereotipos.

## Personaje destacado en el landing
**poeta** (Gaby, La Poeta). Único de los 4 personajes aún no destacado en el
landing del repo, y encaja temáticamente con "jugar con las palabras y el
pensamiento". Diversifica el landing visualmente.

## Diferencias respecto a juego-3
- Estructura HUD/HomeScreen idéntica (2 niveles con grid `1fr 1fr`, 2 chips de tema en el HUD).
- Nivel 1 (7 años) usa **3 rondas con mecánicas DISTINTAS** (no progresión de la misma mecánica como en juego-3 N1):
  - R0 **CSZ_CompletaCard**: emoji + palabra con UN hueco + bandeja C/S/Z. Tap selecciona, VERIFICAR confirma.
  - R1 **CSZ_TriviaCard**: pista en palabras + 3 cartas con la palabra escrita de 3 formas. Tap selecciona, VERIFICAR confirma.
  - R2 **CSZ_ShooterCard**: caen burbujas con palabras 20s. Niño caza solo las MAL escritas. Sin VERIFICAR (tap es acción).
- Nivel 2 (13 años) tiene 3 mecánicas claramente distintas entre sí (después de iterar con la usuaria — la versión original tenía R0 speed-quiz y R1 hashtag-match que se sentían repetitivas):
  - R0 **LP_CarreraCard**: pista con 2 carriles. La frase aparece en el centro inferior con etiqueta "✋ ARRÁSTRAME"; el niño la **arrastra** (pointer events) al carril correcto y se **queda ahí** (acumulación visual hasta 4 últimas por carril). 6 frases por sesión. VERIFICAR al final → aciertos ≥ 4 = correcto.
  - R1 **LP_ComicCard**: **UNA sola viñeta** estilo cómic con avatar grande + bocadillo + 4 opciones en grid 2×2 (empática, sigue estereotipo, indiferente, burlona). Posición de la correcta varía por viñeta. VERIFICAR confirma. 1 acierto = ronda completa.
  - R2 **LP_RuletaCard**: ruleta giratoria con 5 sectores (los 5 conceptos del nivel). El niño gira, aparece un caso de la categoría sorteada, clasifica con uno de 5 botones, VERIFICAR confirma. 3 giros = ronda completa.

## Decisiones clave de implementación
- **Botones manuales VERIFICAR/REINICIAR/SALIR** en las rondas donde aplica (R0 y R1 de ambos niveles). En las rondas de shooter/speed quiz (R2 de CSZ y R0/R2 de LP), VERIFICAR no aplica (tap es la respuesta directa); REINICIAR y SALIR siguen disponibles.
- **Banco sin regionalismos no ecuatorianos** (no portazo, no carrazo, no manaza, etc). Ver feedback en memoria.
- **Anti-repetición** persistente por ronda (FIFO 6 en localStorage).
- **El bocadillo del Nivel 1 R0** se actualiza dinámicamente con la regla pedagógica del libro de cada palabra concreta (8 reglas posibles: diminutivos -CITO/-CILLA, verbos -CIR/-DUCIR, -SIVO, -ÍSIMO, -OSO, -EZ/-EZA, -AZ/-OZ, -AZO/-AZA).

## Pools de datos
- **CSZ_COMPLETA_POOL**: 30 palabras balanceadas C/S/Z con emoji + hideIdx + correct + rule.
- **CSZ_TRIVIA_POOL**: 12 ejercicios con pista en palabras + 3 opciones + correctIdx.
- **CSZ_BIEN / CSZ_MAL**: 24 palabras bien escritas + 24 mal escritas (errores plausibles C↔S, S↔Z) para el shooter.
- **LP_PE_POOL**: 12 frases mezcladas entre prejuicios y estereotipos.
- **LP_COMIC_POOL**: 15 viñetas con avatar + nombre + frase problemática + **4 opciones** de respuesta (1 empática + 3 no), posición de la correcta varía por viñeta.
- **LP_RULETA_CATEGORIAS**: 5 categorías con color/emoji para la ruleta.
- **LP_RULETA_POOL**: 25 casos distribuidos en 5 conceptos (5 por concepto).

## Scoring por ronda (asíncrono — auto-verifica al timeout para rondas con cronómetro)
- **CSZ R0 (completa con letra)**: isCorrect = letra elegida coincide con la correcta. Estrellas según fórmula del shell.
- **CSZ R1 (trivia 3 cartas)**: isCorrect = índice elegido coincide con correctIdx. Estrellas según tiempo.
- **CSZ R2 (shooter)**: score = aciertos − errores − perdidas. isCorrect si score ≥ 4. Estrellas según tiempo.
- **LP R0 (carrera drag-and-drop)**: 6 frases por sesión, drag a un carril, se acumulan. VERIFICAR. isCorrect si aciertos ≥ 4 de 6.
- **LP R1 (cómic 1 viñeta)**: 1 viñeta sola con 4 opciones en grid 2×2. VERIFICAR. isCorrect si la opción elegida es la empática.
- **LP R2 (ruleta de la conciencia)**: 3 giros. isCorrect si aciertos ≥ 2 (de 3). Cada giro: ruleta determina la categoría, niño clasifica con 5 botones, VERIFICAR.

## Glifos del fondo
- **Cosmic** (home/character/results): mezcla de C/S/Z/-ito/-azo/-oso (para nivel 1) y #/💬/📱/🌍/📚 (para nivel 2). 15 símbolos.
- **Chalkboard del juego**: cambia dinámicamente entre niveles vía `window.__currentChalkGlyphs` + evento `ed-chalk-glyphs-updated`. 10 símbolos por nivel.

## Iteración 2026-05-26 (correcciones por feedback de usuaria)
- **CSZ R0**: corregido `hideIdx` en 16 palabras del pool — apuntaba a letra
  incorrecta (ej: en "bellísimo" ocultaba la `m` en idx 7; corregido a la `s`
  en idx 5). Verificado palabra por palabra.
- **CSZ R1 (Trivia)**: removido `textTransform: "uppercase"` en las cartas →
  las opciones se muestran en minúsculas como en el pool.
- **ResultsScreen**: reescrito con el formato canónico de juego-3 (helpers
  `ReportField` y `SummaryCell`, grid `0.85fr 1.4fr`, columna "Tiempo" en la
  tabla, 4 SummaryCells en la parte inferior, dos botones lado a lado
  "IMPRIMIR REPORTE" + "JUGAR OTRA RONDA").
- **LP R0 (Carrera)**:
  - La frase ahora **sube automáticamente** (≈0.55 px cada 30 ms hasta
    META_PX = 280) en lugar de quedarse estática esperando el arrastre.
  - Si llega a la meta sin que el niño la arrastre lateralmente, se cuenta
    como fallo (placed con `timedOut: true` en el lado opuesto del correcto).
  - El marcador "📦 N/6" ahora está **centrado** y se eliminó el duplicado
    "Arrastra cada frase al carril correcto" (ya está en el enunciado de
    arriba).
  - El overlay "¡Todas listas!" usa flex-column con `gap: 28` para separar
    visiblemente las dos frases.
- **LP R2 (Ruleta)**: agregado **feedback por giro**. Tras VERIFICAR, los
  botones de clasificación muestran ✓ en verde sobre el correcto y ✗ en rojo
  sobre el equivocado durante 1.4 s, junto a un banner abajo con
  "✓ ¡Correcto!" o "✗ Era X" antes de avanzar al siguiente giro.

## Pendiente
- (ninguno) — correcciones aplicadas, bundle regenerado, QA visual sin errores.
