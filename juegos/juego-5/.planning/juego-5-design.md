# Juego 5 — diseño

## Tema
Quinto juego del repo `edinun-language`. Dos niveles temáticos del libro EDINUN
de lenguaje, cada uno para una audiencia distinta (no expuesta en la UI):
- Nivel 1 → 7 años — ortografía con C, S, Z (Tema 3 del libro).
- Nivel 2 → 13 años — La lengua: una marca del pensamiento (cosmovisión, globalización, prejuicios, estereotipos).

charId destacado en el landing: **poeta** (Gaby, La Poeta).

## Niveles

2 niveles seleccionables desde HomeScreen con botones de color (naranja / azul).
Los botones muestran SOLO el nombre del tema.

| Botón | Tema | Mecánica |
|---|---|---|
| 🟠 Reglas C, S, Z | Ortografía con C/S/Z | 3 rondas con mecánicas DISTINTAS |
| 🔵 Lengua y pensamiento | Cosmovisión + prejuicios | 3 rondas con mecánicas DISTINTAS |

## Mecánica de cada nivel

### 🟠 Nivel 1 — Reglas C, S, Z (7 años)
3 rondas con 3 mecánicas activas y distintas.

#### R0 — "Completa con la letra"
- Emoji grande + palabra con UN solo hueco donde va C, S o Z.
- Bandeja: 3 fichas grandes C / S / Z (siempre las 3 visibles).
- Tap en ficha → llena el hueco; tap en hueco lleno → borra; REINICIAR vacía; **VERIFICAR** confirma.
- Bocadillo de Gaby: **la regla pedagógica del libro** correspondiente al ejercicio (8 reglas distintas).
- Pool: 30 palabras (~8 C, 11 S, 14 Z) balanceadas sin regionalismos no ecuatorianos.
- catLabel en reporte: **"Reglas C, S, Z"**

#### R1 — "¿Cuál se escribe bien?"
- Cartel con pista en palabras (ej: *"algo muy bello"*, *"lo que da un golpe"*).
- 3 cartas grandes con la palabra escrita de 3 formas (1 correcta + 2 errores plausibles C↔S, S↔Z).
- Tap selecciona; re-tap cambia selección; REINICIAR deselecciona; **VERIFICAR** confirma.
- Feedback al verificar: correcta brilla y crece, las otras se atenúan al 40%.
- Pool: 12 ejercicios cubriendo las 3 letras.

#### R2 — "Caza-errores" (shooter vertical 20s)
- Cronómetro de **20 segundos**.
- Caen burbujas con palabras desde arriba (3-4 simultáneas, velocidad lenta).
- Mezcla: 60% mal escritas, 40% bien escritas. Total ~12-15 burbujas en 20s.
- El niño toca **solo las MAL escritas**.
- Marcador local `✅ aciertos ❌ errores ⌛ perdidas` + cronómetro en HUD del shooter.
- Score = aciertos − errores − perdidas. Correcto si **score ≥ 4**.
- Sin VERIFICAR ni REINICIAR (tap es la respuesta directa); SALIR sí con modal.

### 🔵 Nivel 2 — Lengua y pensamiento (13 años)
3 rondas con 3 mecánicas activas y distintas.

#### R0 — "Carrera de 2 carriles" (drag-and-drop, acumulación)
- Pista con 2 carriles: **PREJUICIO** (izq, rosa) / **ESTEREOTIPO** (der, azul).
- Una frase aparece en el centro inferior con etiqueta "✋ ARRÁSTRAME".
- El niño la **arrastra** (pointer events) hacia el lado correcto. Al soltar dentro de un carril → la frase **se queda ahí** (acumulación visual de las últimas 4 por carril, verde si acertó, rojo si no).
- Si suelta en el centro → la frase vuelve al punto inicial (cancelar).
- Aparece la siguiente frase. 6 frases por sesión (3 prejuicios + 3 estereotipos, balanceadas).
- Marcador local `📦 N/6` arriba.
- **VERIFICAR** al final → score = aciertos − errores. Correcto si **aciertos ≥ 4** de 6.
- REINICIAR vacía y reinicia. SALIR con modal.
- Pool: **24 frases distintas** (12 prejuicios + 12 estereotipos), sin repetir las usadas por R2 (ruleta).

#### R1 — "Cómic interactivo" (1 viñeta, 4 opciones)
- **UNA sola viñeta de cómic** estilo libro infantil: avatar grande de personaje (64px) + bocadillo blanco con borde negro + nombre.
- El personaje dice algo problemático (prejuicio o estereotipo cotidiano).
- El niño elige entre **4 opciones** en grid 2×2:
  - 1 **empática (correcta)**: cuestiona el estereotipo con respeto.
  - 1 que sigue el estereotipo.
  - 1 indiferente / cambia tema.
  - 1 burlona o agresiva.
- La posición de la correcta **varía** por viñeta (no patrón fijo: a veces es la 1, a veces la 4, etc).
- Tap selecciona, **VERIFICAR** confirma. La correcta se ilumina verde con ✓; las incorrectas se atenúan.
- 1 acierto = ronda completa.
- Pool: **15 viñetas distintas** con 4 opciones cada una. Anti-repetición en localStorage.
- Pedagogía: aprender a RESPONDER ante estereotipos en la vida real, no solo a identificarlos.

#### R2 — "Ruleta de la conciencia" (ruleta giratoria con 5 sectores)
- Ruleta circular con **5 sectores** (los 5 conceptos del Nivel 2: LENGUA, COSMOVISIÓN, GLOBALIZACIÓN, PREJUICIO, ESTEREOTIPO), cada uno con su color y emoji.
- Botón central **GIRAR**. Al pulsar: animación de rotación con desaceleración (1.8s).
- Al detenerse, el sector señalado por el puntero determina la **categoría sorteada**. Aparece un **caso real de esa categoría** (frase del libro o derivada) en el cartel a la derecha.
- 5 botones grandes con los 5 conceptos. El niño debe **clasificar el caso** (tap selecciona, REINICIAR deselecciona).
- **VERIFICAR** confirma: correcto si la categoría elegida coincide con la categoría que sorteó la ruleta.
- 3 giros por sesión. Correcto si **aciertos ≥ 2** (parcial aceptable).
- Pool: 5 casos por concepto = **25 casos** en total. Anti-repetición intra-sesión.
- Mecánica nueva en el repo, no es shooter. Visualmente única (ruleta giratoria).

## Banco de datos (resumen)

### CSZ — palabras (sin regionalismos)
- **C** (8): pececito, florecilla, manecilla, conducir, traducir, decir, bendecir, lucir.
- **S** (12): explosivo, intensivo, expresivo, bellísimo, lindísimo, grandísimo, bondadoso, sabroso, hermoso, maravilloso, grandioso, gracioso.
- **Z** (14): belleza, pereza, tristeza, timidez, niñez, paz, audaz, veloz, abrazo, pedazo, balonazo, pelotazo, cabezazo, codazo (no incluido en pool actual: codazo se reservó).

### Trivia (R1 CSZ) — 12 ejercicios
Pista breve en palabras + 3 opciones (1 correcta + 2 errores plausibles).

### Shooter (R2 CSZ) — 24 bien / 24 mal
Palabras bien escritas y mal escritas (errores C↔S, S↔Z).

### Lengua y pensamiento (Nivel 2)
- **24 frases** prejuicio/estereotipo (R0 carrera) — distintas a las de R2 ruleta.
- **15 viñetas de cómic** con avatar + frase + 4 opciones (R1) — posición de la correcta varía.
- **25 casos** distribuidos en 5 conceptos (5 por concepto) para la ruleta (R2).

## Glifos del fondo

### Cosmic (15 símbolos, home/character/results)
Mezcla de los 2 temas: `C S Z á é í ó ú -azo -ito -oso ✏ 🌍 💬 # 📱 📚 🤔 ¿ ¡ ?`.

### Chalkboard (10 símbolos por tema, sobrescribe `window.__currentChalkGlyphs`)
- N1 (csz): `C S Z -ito -ivo -azo -oso ? ¡ ✏`
- N2 (lengua): `# 🌍 💬 📱 ❗ ? ✨ 🤔 📖 🎯`

## Copy específico

### Slug y personaje
- **Slug del juego**: `juego-5`.
- **Personaje destacado en el landing**: 🎭 **Gaby (La Poeta)**.

### HomeScreen
- Hero: "De la letra al pensamiento"
- Label chips: "Selecciona un tema para jugar"
- Descripción dinámica:
  - csz: "Aprende a escribir con C, S y Z."
  - lenguaPensamiento: "Cosmovisión, globalización, prejuicios y estereotipos."

### CharacterScreen
- Label: "Elige tu guía de palabras"

### GameScreen — Bocadillos por ronda
- **CSZ R0**: rota con la regla pedagógica del libro (8 reglas distintas).
- **CSZ R1**: "Solo una está bien escrita."
- **CSZ R2**: "Caza solo las MAL escritas 🎯"
- **LP R0**: "Arrastra cada frase a su carril correcto 🏎"
- **LP R1**: "Elige la respuesta más empática 💬"
- **LP R2**: "Gira la ruleta y clasifica el caso 🎰"

### ResultsScreen
- Subtítulo: "Reporte académico · Juegos de Lenguaje"
- catLabel registrado en `lastResult.category`:
  - N1: "Reglas C, S, Z"
  - N2: "Lengua y pensamiento"

## Decisiones abiertas / riesgos

- **Combo en LP R0**: el flash visual sobre la card del texto es sutil; si en uso real se ve agresivo, ajustar el color del background. Probado solo en desktop, falta validar en mobile.
- **Ruleta (LP R2)**: el sector sorteado SIEMPRE coincide con la categoría del caso mostrado, por lo que VERIFICAR está ligado a la ruleta. Si en uso real se siente "obvio" (porque el niño ve dónde paró la ruleta), considerar mostrar el caso ANTES de detener el spin para que clasifique sin pista visual. Por ahora, mantenemos el modelo "ruleta determina caso → niño clasifica" porque pedagógicamente refuerza el vocabulario.
- **Cards del trivia (CSZ R1)** se pueden ver apretadas en viewport mobile portrait (375×667). Si el QA lo evidencia, reducir fontSize de 22→18.
- **Posts del feed (LP R1)**: 3 posts con texto de 1-2 líneas + metadatos pueden ser densos para mobile. El QA visual lo verificará.
- **Bocadillo dinámico CSZ R0**: cuando el bocadillo cambia entre ejercicios, hay un cambio brusco. Si se ve raro, agregar transición CSS (no implementado por simplicidad).
- **Personaje fijo "Gaby"**: aunque el landing destaca a poeta, el estudiante puede elegir CUALQUIER personaje en la CharacterScreen — Gaby es solo el default visible. Esto es consistente con el resto del repo.
