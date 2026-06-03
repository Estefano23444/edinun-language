# Mi refrán refranero — diseño (JUEGO-11)

## Tema
TEMA 3 del libro EDINUN, **7 años**: **grupos consonánticos**.
- Con R: `pr · br · cr · tr · dr · gr · fr`
- Con L: `pl · bl · cl · gl · fl`
Envoltorio narrativo: refranes y trabalenguas ("Mi refrán refranero").
Personaje: **Márquez** (narrador / sabio de refranes).

## Niveles
**1 solo nivel** (decisión de la autora). Home sin chips de dificultad, HUD sin tabs.
3 rondas con **mecánica DISTINTA** cada una (estándar 7+ años). 3 ejercicios = 3 rondas.

## Mecánica (arco: construir → clasificar → emparejar)
- **R1 — Laboratorio de palabras** (canónica #5): pista (emoji + frase) → el niño
  toca las sílabas de la bandeja para llenar la probeta y formar la palabra.
  Mezcla de **2 y 3 sílabas** (la probeta muestra 2 o 3 casillas). Sílabas en
  minúsculas. Valida `syll.join("") === word`. Campo `avoid` por palabra bloquea
  sílabas distractoras que formarían otra palabra válida con el mismo prefijo
  (p. ej. "to" → fru+to = "fruto", también válido para la pista de "fruta").
- **R2 — Atrapa y clasifica** (canónica #2 + drag-to-bin): 6 palabras se arrastran
  (con fallback tap-tap) a 4 casillas de grupo. Dos sets limpios: {tr,pr,br,fr} y
  {pl,bl,cl,fl}; cada palabra contiene SOLO un grupo del set → validación sin
  ambigüedad. Lock colorea aciertos (verde ✓) y fallos (rojo ✗).
- **R3 — Memoria de parejas** (concentración): tablero de **8 cartas (4 parejas)** =
  4 dibujos + 4 palabras con grupo. El niño destapa de a 2; si la imagen coincide
  con su palabra quedan fijas. Al completar avisa con `onComplete(errores)`;
  completar = ronda lograda (estrellas según tiempo). Sin BORRAR en esta ronda.
  Emojis claros e inequívocos (no hay emoji de clavo → se usa otra palabra).

## Glifos del fondo
- Cosmic (15): `PR BR CR TR DR GR FR PL BL CL GL FL` + `bla tra gru`.
- Chalkboard (10): `PR BR TR DR FR PL BL CL GL FL`.

## Copy específico
Regla: enunciado = QUÉ, bocadillo = CÓMO, **sin repetir términos** entre ambos.

| Ronda | Enunciado (QUÉ) | Bocadillo (CÓMO) |
|---|---|---|
| R1 | Forma la palabra del dibujo. | Toca y une las sílabas. |
| R2 | Guarda cada palabra en su grupo. | Arrástrala hasta la casilla correcta. |
| R3 | Encuentra las parejas. | Destapa el dibujo y su palabra. |

- Home: "Mi refrán refranero" · catLabel "Grupos consonánticos".
- Vocabulario ecuatoriano, palabras de R1 en minúsculas sin tildes, enunciados con punto.

## Arquitectura
- Base estructural: copia del **juego-9** (1 nivel, sin chips, Márquez).
- Shell reutilizado del estándar **juego-8** (GameHUD sin tabs, CharacterCorner,
  GameEnunciado, ActionRail, modales, FeedbackOverlay, makeDragHandler, ResultsScreen,
  reporte imprimible, scoring por tiempo `calcStars`).
- `GameScreen` → wrapper con `restartTick` que remonta `RefranesGame`; despacho
  `ronda === 0/1/2` a `LaboratorioCard` / `ClasificaCard` / `DetectiveCard`.
- FIFO anti-repetición: 1 key `edinun_juego11_recientes_v1`, prefijos `lab:`/`clas:`/`det:`.

## QA
`node .planning/qa-checks.js` (repo servido en :8765). Recorre Home→Personaje→R1→R2→R3→
Resultados en los 6 viewports canónicos con arrastre real de mouse. **Resultado: 0
errores.** Portrait 375×667 muestra el overlay "Gira tu teléfono" (invariante esperado).

## Decisiones abiertas / riesgos
- R2 usa arrastre por punteros (`makeDragHandler`) con fallback tap-tap; el QA
  automático requiere `page.mouse` real (un `.click()` sintético no dispara onTap fiable).
- Bancos ampliables: R1 (16 palabras), R2 (2 sets × 4 grupos × 4 palabras), R3 (8 frases).
