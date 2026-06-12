# Juego-14 — "Explorando la biblioteca" · diseño

## Tema

TEMA 1 del libro EDINUN de Lengua y Literatura. Juego pensado para **4 niveles
por edad** (uno por cada edad del libro). **Los 4 niveles están implementados.**

## Niveles

Selector en Home (tarjetas por edad). `app.level` enruta el juego.

| id | edad | tema | mecánica |
|----|------|------|----------|
| `biblioteca` | 6 años | letras **y** / **f** | 1 mecánica × 3 rondas (completar palabra) |
| `poemas` | 10 años | **Poemas populares** | 3 rondas DISTINTAS (ruleta · rima · detective) |
| `voces` | 12 años | **El poema y sus voces** | 3 rondas DISTINTAS (figura · clasifica rima · laboratorio) |
| `opinion` | 14 años | **El género de opinión** | 3 rondas DISTINTAS (shooter · hecho/opinión · clasifica oración) |

Personaje temático por nivel: biblioteca → **Verne** (explorador); poemas y
voces → **Gaby** (poeta). El niño puede cambiarlo en CharacterScreen.

## Mecánica

### NIVEL 1 — BibliotecaGame (6 años)

"Completar la palabra con la sílaba inicial" (misma mecánica en las 3 rondas;
estándar permite repetir mecánica hasta 6 años). Cartel con emoji + slot inicial
de 2 letras + letras restantes visibles; bandeja de 3 sílabas (1 correcta + 2
distractoras del mismo set). VERIFICAR manual. Feedback §11 (correcta en verde ✓
al fallar). FIFO anti-repetición (`edinun_juego14_recientes_v1`).

- R1 → letra **y**: yoyo, yate, yegua, yoga, yuca. Tray ya/ye/yi/yo/yu. (Sin "yema":
  el emoji de huevo 🥚 no muestra la yema y confundía.)
- R2 → letra **f**: foca, foco, foto, fideo, fiesta, familia, fuego. Tray fa/fe/fi/fo/fu.
- R3 → mezcla y + f.

Data en minúsculas (estándar). El slot toma las 2 primeras letras (split
ortográfico, igual criterio que juego-9).

### NIVEL 2 — PoemasGame (10 años) — 3 rondas distintas

Contrato `lastResult` genérico (Reto / Tu respuesta / Respuesta correcta).
FIFO `edinun_juego14poemas_recientes_v1` con ventana floor(N/2) por ronda.

- **R1 · Ruleta** (mecánica canónica #1). Ruleta animada (conic-gradient + puntero,
  transición 1.7s). GIRAR → revela un fragmento de poema fijado → el niño clasifica
  el **tipo**: amorfino / copla / yaraví. Marcas claras: yaraví = triste (¡ayayay!),
  amorfino = amor/humor del campo, copla = corta/descriptiva. Feedback §11.
- **R2 · Completa la rima** (repo: multi-choice con foco en la rima). Copla con el
  último verso incompleto; el niño elige la palabra que **rima** con el 2º verso.
  Los distractores NO riman. Feedback §11.
- **R3 · Detective de versos** (mecánica canónica #3). Copla de 4 versos donde uno
  fue cambiado y **no rima** (el intruso, en índice variable). Lupa 🔍 decorativa;
  el niño toca el verso intruso. Al fallar, el correcto se marca en verde ✓.

Vocabulario y ejemplos ecuatorianos (montubio, manabita, Eloy Alfaro, yaraví de
la Sierra, amorfino de la Costa). Sin tildes problemáticas en respuestas.

### NIVEL 3 — VocesGame (12 años) — 3 rondas distintas

Tema "El poema y sus voces". Se centra en los 3 pilares poéticos (figuras, rima,
producción de rima); la parte de "discurso" del libro queda fuera (otra competencia).

- **R1 · Identifica la figura** (tap multi-choice + lupa): un verso → toca la figura
  (metáfora, hipérbole, personificación, onomatopeya, hipérbaton, paradoja).
  3 opciones (1 correcta + 2 del set). Banco R1_FIG. Feedback §11.
- **R2 · Clasifica la rima** (tap-to-place a cajas): 3 fichas (1 consonante, 1 asonante,
  1 verso libre) → tocar ficha y luego su caja. Banco R2_PAIRS por tipo. Al verificar,
  ✓ verde / ✗ rojo por ficha.
- **R3 · Laboratorio del verso** (combinar base + terminación = palabra que rima
  consonante, minúsculas §4): estrofa con último verso incompleto; tray de 3
  terminaciones (or/ido/ón/era). Banco R3_LAB. Probeta base+slot revela la palabra
  al acertar. Feedback §11.

FIFO `edinun_juego14poemas_recientes_v1` (prefijos vf/vl) para R1 y R3.

### NIVEL 4 — OpinionGame (14 años) — 3 rondas distintas

Tema "El género periodístico de opinión". Mecánicas dinámicas para 14 años.

- **R1 · Shooter** (mecánica canónica #2, NUEVA en el repo): 4 tarjetas de tipos de
  texto **caen** (animación CSS `ed-fall14`); el joven toca la canasta correcta antes
  de que lleguen abajo: **Informativo / De opinión / Mixto** (noticia·reportaje /
  editorial·artículo·columna / crónica). Auto-evaluado (sin VERIFICAR, §13);
  `onAnimationEnd` = caída sin atrapar (fallo). Ronda correcta si 4/4.
- **R2 · ¿Hecho u opinión?** (binario): una frase → toca **HECHO** u **OPINIÓN**.
  Banco R2_FRASES (hecho comprobable vs opinión subjetiva). Feedback §11.
- **R3 · Clasifica la oración sin verbo** (tap-to-place a 3 cajas): sust. + modificador
  / interjección / frase nominal. Banco R3_ORA (ejemplos del libro). ✓/✗ por ficha.

`ActionRail` admite `hideVerify` (R1 no muestra VERIFICAR/BORRAR).

## Glifos del fondo

Heredados del nivel 1 (letras + 📖 + ✎ + sílabas y/f) — neutros para lenguaje.
No se cambiaron al añadir poemas para no tocar el shell compartido de fondo.

## Copy específico

- Home: "TEMA 1 · Explorar el lenguaje" + selector de nivel por edad.
- N1 enunciado: "Completa la palabra con la sílaba." · bocadillo: "Toca la sílaba que falta."
- N2 enunciados: "Lee el poema y elige qué tipo es." / "Elige la palabra que rima y
  completa el verso." / "Encuentra el verso que no rima con los demás."
- N2 bocadillos (CÓMO): "Gira la ruleta y lee con calma." / "Escucha el final y busca
  el sonido igual." / "Léelos en voz alta; uno suena distinto."

## Arquitectura

`GameScreen` enruta por `app.level` → `BibliotecaGame` | `PoemasGame`. Shell
compartido: GameHUD, CharacterCorner (§1, bocadillo ed-float-soft), ActionRail,
FeedbackOverlay, ConfirmModal, EnunciadoInline, makeAnswer (scoring/log/results).
`ResultsScreen` única y genérica para ambos niveles.

## Decisiones abiertas / riesgos

- **Amorfino vs copla** (R1) es la distinción más sutil para 10 años; se eligieron
  fragmentos con marcas claras y el feedback §11 muestra el tipo correcto al fallar.
  Si en aula resulta difícil, considerar reemplazar "copla" por "arrullo" (religioso),
  que contrasta más, o cambiar R1 a clasificación por región (Costa/Sierra/Amazonía).
- **Niveles 3 y 4** pendientes (otras edades). Al añadirlos, el selector de Home
  crece a 3–4 tarjetas (ya es un grid `1fr 1fr`, escalable).
- Emojis modernos (🦭 foca, 🪀 yoyo, 🧘 yoga) pueden no renderizar en sistemas muy
  viejos; sustituibles en WORD_BANK si surgen quejas.

## QA visual

Playwright, flujo completo de ambos niveles. Nivel 2 en 1280×800, 1024×768 y
667×375: **0 errores de consola**, sin desbordes ni solapes (ruleta, rima y
detective caben en la columna central centrada). Nivel 1 sin regresión.
Capturas en `.planning/qa-screenshots/` (N1-* y N2-*).
