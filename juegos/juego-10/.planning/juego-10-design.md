# Mi fabulosa fábula (juego-10) — diseño

## Tema
TEMA 3 del libro EDINUN: "Mi propia fabulosa fábula" — proceso de creación de
fábulas y relatos. Audiencia: **7 años**. Personaje destacado: **Márquez**
(El Cuentacuentos, guardián de las historias).

## Niveles
**1 nivel único** (una sola edad / un solo tema). Home sin chips de dificultad;
HUD del juego sin tabs de nivel. 3 rondas por sesión.

## Mecánica (3 rondas con mecánicas DISTINTAS — obligatorio a 7+)

| Ronda | Mecánica | Saber del libro |
|---|---|---|
| **R1 — Arma la fábula** | Ordenar 3 partes en cajones **Inicio · Nudo · Desenlace** (drag y/o tap). | Estructura narrativa (Paso 4 "Crear un esquema"). |
| **R2 — Ruleta + moraleja** | **Girar la ruleta** (sortea la fábula) y luego **elegir su moraleja** correcta (multi-choice, 3 opciones). | Identificar el mensaje ("Encuentra la moraleja"). |
| **R3 — Acertijo de personajes** | Adivinar el animal por su pista y **formar su nombre con sílabas** (completar palabra). | Vocabulario + personajes de fábula (Paso 3). |

- **R1 interacción**: drag (bandeja→cajón y cajón→cajón para mover si te equivocas)
  + tap como alternativa. Las fichas usan SOLO `onPointerDown` (drag+tap vía
  `makeDragHandler`) y los cajones SOLO `onClick`, para evitar el doble-disparo de
  eventos (un `onClick`+`onPointerDown` juntos disparaban `onTap` dos veces).
- **R2 ruleta**: rueda SVG de 6 sectores (emojis de las fábulas) + puntero + botón
  GIRAR. Aterriza en la fábula elegida por FIFO; VERIFICAR se habilita solo tras
  girar y elegir moraleja. Mecánica canónica "ruleta" combinada con multi-choice.
- **Vocabulario simplificado para 7 años**: sin "royó" (→ "cortó con sus dientes"),
  sin "previsor(a)", "despreciar", "en vano", "constancia".
- **Validación**: R1 cada cajón contiene la parte de su tipo · R2 índice == correcta ·
  R3 sílabas ensambladas == palabra.
- **Sílabas en MINÚSCULAS** y sin tildes (shell-standards §4). Animales sin tilde:
  zorro, tortuga, hormiga, conejo, lobo, oveja.
- **Feedback al fallar**: opción/parte correcta en verde con ✓ (en R1 "✓ Va en: …", en R3 "✓ Era: …",
  en R2 la moraleja correcta resaltada); reveal 3 s antes del overlay (alineado con juego-7).
- **R2 anti-patrón**: las opciones de moraleja se **barajan por sesión** (el banco trae `correcta:0`
  en todas); se califica por texto, no por índice fijo, para que la correcta no quede siempre arriba.
- **FIFO anti-repetición** por categoría (orden/moraleja/acertijo), banco de 6 → FIFO=3.
- Contrato `lastResult.log` con columnas genéricas (Reto / Tu respuesta / Correcta / Estado / Tiempo).

## Glifos del fondo
- **Cosmic (15)**: 🦊 🐢 📖 ✏️ 🐭 🐴 💡 ❝ ❞ ✨ ★ ? ! … Aa
- **Chalkboard (10)**: 📖 ✏️ 🦊 🐢 ✨ 💡 ? ! … ★

## Copy específico
- **Slug**: `juego-10` · **Título landing**: "Mi fabulosa fábula" · charId `narrador`.
- **Enunciados (QUÉ)**: R1 "Ordena las partes de la fábula." · R2 "Lee la fábula y elige su moraleja." · R3 "Adivina el personaje y forma su nombre."
- **Bocadillos (CÓMO)**: R1 "Toca una parte y luego su lugar." · R2 "Toca la moraleja correcta." · R3 "Toca las sílabas en orden para formar el nombre."

## QA
- Playwright en 6 viewports (1920/1280/1024/768×1024/667×375/375×667): **0 errores JS**.
  El "fallo" en 375×667 es el overlay esperado "Gira tu teléfono" (portrait móvil).
- Smoke test end-to-end: las 3 rondas verifican y llegan a Resultados con reporte.
- Solapamientos: solo el "beso" canónico de ~4 px entre bbox del personaje y zona
  central (igual que juego-9; contenido visible centrado, no choca).
- R1 centrado verticalmente (corregido: faltaba `justifyContent: center`).

## Decisiones abiertas / riesgos
- Se cambió la R3 propuesta (board game "personaje avanza") por "acertijo de
  personajes formando palabra" a pedido de la autora (juego solo para 7 años → más simple).
- Banco de 6 por ronda; ampliable si se desea más variedad.
