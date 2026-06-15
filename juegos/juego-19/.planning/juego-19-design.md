# Telón y galaxia (juego-19) — diseño

## Tema
Juego de 2 temas por edad (Home con selector, router por `app.level`):
- **NIVEL 1 — El entremés** (11 años, personaje Rolli/`escritor`). Teatro cómico breve del Siglo de Oro: personajes populares, estructura Introducción/Nudo/Desenlace, entremés clásico vs teatro moderno.
- **NIVEL 2 — La ciencia ficción** (13 años, personaje Verne/`explorador`). Mundos posibles: utopía/distopía, elementos narrativos (narrador, tiempo, actantes), evaluación de fuentes confiables ("Detectives de información").

Contenido 100% ORIGINAL (no reproduce los ejemplos del libro).

## Niveles
| id | edad | label | personaje | catLabel |
|---|---|---|---|---|
| `entremes` | 11 | El entremés | escritor (Rolli) | El entremés · 11 años |
| `cienciaficcion` | 13 | La ciencia ficción | explorador (Verne) | La ciencia ficción · 13 años |

Las edades NO se muestran al niño (botones = nombre del tema; descripción = de qué trata el tema).

## Mecánica (6 distintas, sin repetir; 1 sola ronda con arrastre por nivel)
### Nivel 1 — El entremés
- **R1 La ruleta de los personajes** (RULETA). Gira la rueda decorativa → se revela una escena original → el niño elige (3 opciones) qué personaje típico la protagoniza (sacristán, bobo, soldado fanfarrón, estudiante, viejo engañado). `T1_ESCENAS` (8, FIFO). VERIFICAR manual.
- **R2 Arma tu entremés** (ORDENAR — único arrastre del nivel). 3 escenas a casillas Introducción/Nudo/Desenlace (`OrderRound` con `slotLabels`). `T2_OBRAS` (5 sets, FIFO).
- **R3 Atrapa la comedia** (SHOOTER, auto-evaluado §13). Caen rasgos: del entremés = atrapar; del teatro moderno = dejar caer. Gana con aciertos≥4 y errores≤2. `T3_ENTREMES` / `T3_MODERNO`.

### Nivel 2 — La ciencia ficción
- **R1 ¿Utopía o distopía?** (CLASIFICAR — único arrastre del nivel). 6 mini-mundos → 2 cajas (`BinsRound`). `CF_MUNDOS` (3 sets, FIFO). Drag + tap-seleccionar + re-arrastre.
- **R2 El analista narrativo** (IDENTIFICAR opción múltiple). Fragmento → identifica narrador / tiempo / actante. `CF_FRAGMENTOS` (10, FIFO). Feedback §11.
- **R3 Detective de fuentes** (DETECTIVE/investigación). Ficha de fuente (título + autor/año/entidad) → el niño marca los criterios que cumple (investigación) y da veredicto CONFIABLE / NO CONFIABLE (lo que se puntúa). Al verificar se revelan los criterios reales (verde/rojo). `CF_FUENTES` (6, FIFO) + `CF_CRITERIOS`.

## Glifos del fondo
- Chalkboard (juego, 10): 🎭 🚀 🤖 🌌 🎬 ⚛ 👽 ? 🛸 ★
- Cosmic (home/character/results, 15): 🎭 🚀 🌌 🛸 🎬 ⚛ → 🎪 👽 🤖 🪐 ? 🎭 ✦ ★

## Copy específico
- Home label: "Del telón a la galaxia". Botones: El entremés / La ciencia ficción.
- Personajes temáticos: Rolli (dramaturga) para entremés; Verne (padre de la ciencia ficción) para sci-fi. El niño puede cambiarlos.
- FIFO key: `edinun_telon_galaxia_recientes_v1`.

## Decisiones abiertas / riesgos
- En R3 (detective de fuentes) lo puntuado es el veredicto; el marcado de criterios es la investigación (se revela al verificar). Decisión tomada para mantener una mecánica clara y verificable.
- El shooter R3 del entremés es auto-evaluado (sin VERIFICAR) como en juego-17.
- QA visual (Playwright, 1280×800): los 6 rondas renderizan sin overflow; flujo completo de ambos temas = 3/3, 0 errores de consola. El lienzo 900×540 escala uniforme, así que el ajuste desktop garantiza el resto de viewports.
