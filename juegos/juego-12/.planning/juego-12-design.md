# Te invito a mi fiesta — diseño (juego-12)

## Tema
TEMA 2 del libro EDINUN de lenguaje para 7 años: **"Te invito a mi fiesta"**.
El tema del libro reúne 4 bloques: (A) textos de invitación, (B) lenguaje
formal vs coloquial, (C) la *m* antes de *p* y *b* (mp/mb), (D) palabras
homófonas. El bloque A (la invitación/fiesta) se usa como **envoltorio
narrativo** de todo el juego; B, C y D se reparten en las 3 rondas.

## Niveles
**1 solo nivel** (audiencia 7 años). En Home no hay chips de dificultad y el
HUD del juego no tiene tabs. 3 rondas con **mecánica distinta** cada una
(estándar 7+).

## Mecánica
Las 3 mecánicas salen de la lista canónica de 6.

### R1 — La *m* antes de *p* y *b* → Shooter "cazapalabras"
- Caen palabras en un carril de **3 columnas fijas** (`R1_COLS = [18,50,82]%`,
  una palabra por columna en X → **nunca se enciman**). Animación CSS `ed-fall`.
- **Distribución vertical pareja**: cada columna se repuebla cuando su palabra
  más alta ya descendió **> 38%** (se rastrea `born` + `dur` y se calcula la
  fracción recorrida) → el carril se mantiene lleno de **6–8 palabras
  escalonadas de arriba a abajo**, sin huecos ni amontonamientos. Spawn cada
  **560 ms**, `dur` 5.6–6.4 s. Carril **alto (348 px)** para aprovechar el
  espacio vertical. *(antes: una sola palabra por columna → caja casi vacía;
  la autora pidió varias veces "distribuir bien los espacios".)*
- El niño **toca las bien escritas** (m antes de p/b) y **deja caer las trampas
  con *n*** (canpana, tanbor…). **Temporizador de 20 s** (`R1_TIME`), **sin meta
  fija**: el puntaje es **cuántas palabras correctas atrapa en el tiempo**. La
  ronda se cierra al acabar los 20 s — **sin VERIFICAR manual** (estándar shooter).
  Estrellas = `clamp(cazadas − ⌊fallos/2⌋, 0..10)` (vía `earnedOverride` en
  `answer()`); `isCorrect = cazadas > 0 && cazadas >= fallos`.
- Banco ampliado a **32 pares ok/bad** (mp y mb, sin tildes, minúsculas):
  campana, campo, trompeta, trompo, limpio, empanada, comprar, tiempo, rampa,
  trampa, campamento, estampilla, romper, pompa, tambor, sombrero, sombra,
  hombre, hombro, nombre, alfombra, cambio, bombero, bombilla, bomba, tumba,
  embudo, alambre, hambre, sombrilla, temblor, zumbido. El pool se **baraja y
  se recorre con un cursor sin repetir** dentro de la ronda (no salen 2 veces).
- *(Cambios 2026-06-03: antes era Laboratorio de combinar sílabas — coincidía con
  la R1 de juego-11 → shooter. Luego se añadió temporizador, columnas anti-overlap
  y banco ampliado sin repetición, a pedido de la autora.)*

### R2 — Palabras homófonas → Lectura con varios huecos
- Un **párrafo (lectura) con 5 huecos**, cada uno un **selector inline
  segmentado** (estándar 6) con un par de homófonas. El niño elige cada palabra
  **según el contexto**. VERIFICAR valida que **las 5** sean correctas.
- Las historias deben tener **sentido y concordancia** (ej. evitar "me puse una
  bota" → usar "se me salió una bota"). Centrada verticalmente (márgenes iguales).
- Se ve como una **hojita de papel rayado**: papel crema, **renglones azules**
  (repeating-linear-gradient), **margen rojo**, **pin** arriba, leve `rotate(-1.2deg)`,
  texto **sin negrita** (`fontWeight 400`, ink gris). Angosta (392 px) y centrada
  en la zona segura (sin chocar con el personaje/bocadillo ni el rail).
- Lecturas **coherentes** (mini-historias con sentido y concordancia).
- Al fallar: cada correcta queda verde con ✓; la elegida mal, roja (estándar 11).
- Huecos a mitad de oración → opciones en minúscula. 6 lecturas (`R2_BANK` con
  `parts`: strings + `{options, answer}`), FIFO por `id`. Pares: casa/caza,
  tubo/tuvo, ola/hola, hay/ay, bota/vota, ciento/siento.
- *(Cambios 2026-06-03: antes "acertijos" pista+2 botones; luego oración única
  con selector inline; finalmente la autora pidió una **lectura con varios
  ejercicios** → párrafo de 3 huecos, card más angosta y alta.)*

### R3 — Lenguaje formal vs coloquial → Ruleta de la fiesta
- Rueda SVG de 6 sectores con emojis de fiesta + puntero. Botón **🎡 GIRAR**
  (o GIRANDO… mientras anima ~2.3s con `cubic-bezier`). Al detenerse, sortea
  una de 6 frases (3 formales + 3 coloquiales) y la muestra en un cartel.
- El niño clasifica la frase: **Formal** / **Coloquial**. VERIFICAR valida
  `elegido === frase.type`. Feedback verde ✓ en la correcta al fallar.

### Validación / scoring / log
- Scoring decreciente por tiempo heredado del shell (`calcStars`).
- `lastResult.log[i]` = { idx, a (correcta), b (respuesta), op (🧪/🔍/🎡),
  correctAnswer, userAnswer, isCorrect, time, earned }.

### Mapa de zonas (grid 900×540)
- Enunciado → top **86** en R1/R3; en **R2 baja a top 120** (se acerca a la
  hojita y equilibra el hueco; deja libre la lectura más alta, cuyo borde
  superior queda en ~160). El enunciado no es de posición fija: se mueve por
  ronda si el layout lo pide.
- R1: cartel+probeta → zona-central (top 132); bandeja sílabas → bandeja (bottom 30).
- R2: cartel pista → zona-central (top 130); opciones → bandeja.
- R3: rueda → bandeja dentro de zona-central (top 118); GIRAR/frase/clasificación apilados.
- Bocadillo → personaje (izq inferior). Acciones → rail derecho centrado vertical.

## Glifos del fondo
- Cosmic (15): 🎉 🎈 🎂 🎁 📨 · mp · mb · m · p · b · ? · ! · ✓ · ★ · ✨
- Chalkboard (10): mp · mb · m · p · b · 🎈 · 🎉 · ? · ! · ✓

## Copy específico
- Slug: `juego-12` · Título: "Te invito a mi fiesta" · Personaje: Márquez (narrador).
- catLabel: "Te invito a mi fiesta".
- Enunciados (QUÉ) / Bocadillos (CÓMO):
  - R1: "Forma la palabra que falta para la fiesta." / "Toca las sílabas y arma la palabra. Antes de p o b va m."
  - R2: "Descubre la palabra correcta según la pista." / "Lee la pista y toca la palabra que encaja."
  - R3: "Di si la frase de la invitación es formal o coloquial." / "Gira la ruleta y clasifica la frase."
- Frases R3 (vocabulario ecuatoriano):
  - Formal: "¿Me podría acompañar a mi fiesta?", "Será un honor recibirlos en casa.",
    "Quedan cordialmente invitados.", "Le esperamos con mucho gusto.",
    "Agradezco su gentil presencia.", "Por favor, confirme su asistencia."
  - Coloquial: "¡Topamos en mi cumple!", "¡Qué chévere, ahí nos vemos!",
    "¡Ya quiero ir a tu fiesta!", "¡Cae a mi casa el sábado!",
    "¡Dale, no te pierdas la fiesta!", "¡Va a estar buenazo!"

## FIFO anti-repetición
`edinun_juego12_recientes_v1`, límite 24, claves prefijadas por ronda
(`lec:` para la lectura R2, `ruleta:` para R3). R1 (shooter) no usa FIFO:
gestiona su propio pool de caída.

**Ventana por categoría (estándar 12)**: `pickFresh`/`pickN` bloquean solo los
**últimos `floor(N/2)` ids de SU prefijo** (N = tamaño del banco), no todos los
vistos. *Bug corregido 2026-06-04*: antes excluían **todos** los recientes;
como la lista de 24 es compartida y se llena con los 6 ids de `lec:`, el pool
quedaba vacío → fallback a `Math.random()` sobre el banco completo → **la
lectura se repetía al recargar**. Con la ventana (3 de 6) el pool nunca se vacía
y se garantiza no repetir dentro de 3 jugadas seguidas (verificado: 12 picks
seguidos, 0 repeticiones en ventana).

## Decisiones abiertas / riesgos
- La ruleta es la primera mecánica del repo con animación de giro: usa
  `setTimeout(2350)` para resolver el sorteo (más robusto que `transitionend`
  en headless). El sector aterrizado determina honestamente la frase a clasificar.
- R3 clasifica **una sola frase** por ronda (un VERIFICAR), coherente con el
  shell de 3 verificaciones por sesión.
- QA Playwright: 6 viewports, 0 errores de consola. Portrait 375×667 muestra el
  overlay "Gira tu teléfono" (esperado, igual que el resto del repo).
