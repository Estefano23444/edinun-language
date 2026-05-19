# Juego 2 — diseño

## Tema
Juego con 3 niveles temáticos del libro EDINUN de lenguaje. Cada nivel es para una audiencia distinta (no expuesta en la UI): nivel 1 → 6 años, nivel 2 → 9 años, nivel 3 → 12 años. La estética visual es uniforme; solo el contenido y la complejidad varían.

charId: escritor (default visible en el landing del repo)

## Niveles

3 niveles seleccionables desde HomeScreen con botones de color (naranja / amarillo / azul). Los botones muestran SOLO el nombre del tema, sin "BÁSICO/MEDIO/AVANZADO" ni edades.

| Botón | Tema | Mecánica |
|---|---|---|
| 🟠 La letra r | Atrapar la R en palabras | 1 mecánica × 3 rondas idénticas |
| 🟡 La noticia | Comprensión de la noticia | 3 rondas con mecánicas distintas |
| 🔵 El blog | Reconocer elementos del blog | 3 rondas con mecánicas distintas (incluye shooter) |

## Mecánica de cada nivel

### 🟠 Nivel 1 — La letra r
- Emoji + palabra con la(s) R(s) oculta(s)
- Bandeja: `r l m n s` (5 fichas, la R correcta + 4 distractores). Reutilizables.
- 3 rondas = 3 palabras distintas
- catLabel en reporte: **"La letra del ronroneo: rrrrrr"**
- Bocadillo: *"Atrapa la r."*
- Enunciado: *"Completa la palabra con la letra R."*
- Pool (14 palabras): mar, oro, rama, ramo, risa, rima, amor, pera, toro, pirata, ratón, tigre, jirafa, mariposa.

### 🟡 Nivel 2 — La noticia
Una noticia elegida al inicio del nivel. Rondas 1-2 son sobre esa noticia. Ronda 3 es teórica.
- **Ronda 0** — Parte resaltada: 4 chips `TITULAR / ENTRADA / CUERPO / CIERRE`.
- **Ronda 1** — Elige el resumen: 3 frases (1 correcta + 2 distractoras realistas).
- **Ronda 2** — Definición → concepto: 4 chips de 10 conceptos posibles (Titular, Entrada, Cuerpo, Cierre, ¿Qué?, ¿Quién?, ¿Cuándo?, ¿Dónde?, Informativo, Objetivo).
- Pool de noticias (6): 3 del libro (oso perezoso, incendio en Esmeraldas, monos aulladores en Pacoche) + 3 ecuatorianas inventadas (festival de globos en Quito, tortugas en Galápagos, parque ecológico en Guayaquil).
- catLabel en reporte: **"La noticia"**

### 🔵 Nivel 3 — El blog
Un mockup de blog elegido al inicio. Ronda 0 lo usa. Rondas 1-2 son teóricas o de acción.
- **Ronda 0** — Elemento resaltado: 4 chips de 8 elementos del blog.
- **Ronda 1** — SHOOTER 20s: caen burbujas con palabras desde arriba, el niño toca solo las que son elementos del blog. Aciertos +, errores y burbujas perdidas -. Score final → estrellas (≥4 aciertos netos = correcto).
- **Ronda 2** — Definición → concepto: 4 chips de 10 conceptos (8 elementos + BLOG + BLOGUERO).
- Pool de mockups (3): "Viajes por Ecuador", "Sabores de mi casa", "Tecnología hoy".
- Distractores del shooter (palabras relacionadas pero NO canónicas según el libro): Instagram, Facebook, Twitter, WhatsApp, TikTok, Likes, Hashtag, Stories, Banner, Email.
- catLabel en reporte: **"El blog"**

## Glifos del fondo

Por pantalla:
- **Cosmic (home/character/results)**: A R 📰 💻 r M 📝 P L S T ? ¡ B N (15)
- **Chalkboard (juego)**: cambia según el nivel actual (set dinámico vía `window.__currentChalkGlyphs`):
  - Nivel 1: R r ra re ri ro ru ¡ ¿ ✏
  - Nivel 2: 📰 📝 🗞 ✏ 📌 ¿ ? ¡ T E
  - Nivel 3: 💻 🌐 📱 ✏ 📌 # @ ¿ ? 💬

## Copy específico

- HomeScreen hero: "El país de las palabras de tierra"
- HomeScreen descripción del nivel seleccionado: varía
  - Nivel 1: "Atrapa la letra R en cada palabra."
  - Nivel 2: "Reconoce las partes de una noticia."
  - Nivel 3: "Identifica los elementos de un blog."
- Resultado: "{studentName}, completaste {N} de 3 retos."

## Decisiones de diseño

- **Chips de tema en HUD del juego**: arriba al centro aparecen los 3 temas (La letra r / La noticia / El blog) como chips. El activo se ve con el color del nivel; los otros, en gris. Tocar un chip no activo abre un modal de confirmación ("¿Ir a 'X'? Vas a perder el progreso de esta ronda"). Si el usuario confirma, se cambia `app.currentCategory` y `GameScreen` desmonta el sub-juego viejo (limpiando timers) y monta el nuevo desde cero.
- **Glifos chalkboard dinámicos**: el set se cambia desde cada sub-juego vía `window.__currentChalkGlyphs` para que el fondo se sienta temático sin tocar el shell.
- **Personaje grande con bocadillo en los 3 niveles**: tamaño uniforme (`size=190`, `width=220`, `left=8`, `bottom=90`) igual que en nivel 1 y que el juego "Completa la palabra". El bocadillo del personaje cambia dinámicamente por ronda. La zona-central se posiciona a `left=240` para no chocar con la columna del personaje. El botón SALIR vive debajo del personaje (`left=70, bottom=24`) en lugar de a la derecha — así la card de juego puede usar todo el ancho restante hasta `right=18`.
- **Anti-repetición por nivel**: tres claves separadas en localStorage (`edinun_juego2_letraR_recientes_v1`, `edinun_juego2_noticia_recientes_v1`, `edinun_juego2_blog_recientes_v1`).

## Decisiones abiertas / riesgos

- **Shooter en JSX inline**: implementado sin librerías externas, con `setInterval` para spawn + tick. Funciona pero podría sentirse poco fluido en mobile débil. Si hay problemas, considerar reducir frecuencia de tick (40ms → 60ms) o usar `requestAnimationFrame`.
- **Score del shooter → estrellas**: la fórmula actual es `score = aciertos - errores - perdidas`, considera "correcto" si score ≥ 4. Esto da margen pero penaliza errores. Se puede ajustar tras feedback.
- **Algunos emojis**: ciertos emojis (🏴‍☠️ pirata) tienen variantes según sistema operativo; en general se ven bien pero podría mejorar usando emojis más universales.
