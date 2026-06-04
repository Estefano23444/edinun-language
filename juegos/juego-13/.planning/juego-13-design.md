# De oruga a mariposa — diseño (JUEGO-13)

## Tema
TEMA 3 del libro EDINUN, **8 años**: **sufijos y prefijos**.
- Sufijos para formar **adjetivos**: `-ado · -oso · -al · -áceo · -uzco · -ar`.
- Sufijos para formar **verbos**: `-ificar · -ear · -ecer · -izar · -ar`.
- **Prefijos** a la vez: `a-` · `en-`.
Envoltorio narrativo: el reportaje *"De oruga a mariposa"* (la metamorfosis). El
niño es un reportero que investiga a la mariposa. Personaje: **Verne** (explorador).

## Niveles
**1 solo nivel** (decisión de la autora). Home sin chips de dificultad, HUD sin tabs.
3 rondas con **mecánica DISTINTA** cada una (estándar 7+ años). 3 ejercicios = 3 rondas.

## Mecánica (arco: formar adjetivo → cazar verbo → clasificar prefijo)
- **R1 — Laboratorio del reportero** (canónica laboratorio): cartel con palabra
  base + pista de significado → el niño toca el **sufijo** correcto en la probeta
  `[base] + [sufijo]`. Se valida solo el sufijo y al acertar se revela el adjetivo
  real (`= azulado`). Maneja raíces irregulares (calor→caluroso, fenómeno→fenomenal)
  porque la respuesta correcta vive en la data, no en una concatenación literal.
- **R2 — La cámara del reportero** (cámara = elegir-una-opción): pista de
  significado (QUÉ) + 4 verbos "foto" en 2×2. El niño apunta (🎯) un verbo y dispara
  con VERIFICAR (📸). Distractores = no-palabras con el sufijo equivocado
  (simplecer, simplear…) → validación sin ambigüedad. Feedback estándar: al fallar,
  el verbo correcto se marca verde con ✓.
- **R3 — Clasifica la metamorfosis** (atrapa y clasifica + drag-to-bin): 6 verbos
  (3 con `a-`, 3 con `en-`) se arrastran (con fallback tap-tap) a 2 frascos de
  prefijo. Cada verbo empieza claramente con su prefijo → validación limpia. Lock
  colorea aciertos (verde ✓) y fallos (rojo ✗).

## Glifos del fondo
- Cosmic (15): `-ado -oso -al -ar -áceo -uzco -ecer -izar -ear -ificar a- en-` + `🦋 🐛 🍃`.
- Chalkboard (10): `-ado -oso -al -ar -ecer -izar a- en- -ear -uzco`.

## Copy específico
| Ronda | Enunciado (QUÉ) | Bocadillo de Verne (CÓMO) |
|---|---|---|
| R1 | Forma el adjetivo que falta. | Toca el sufijo de la probeta. |
| R2 | Elige el verbo que significa lo mismo. | Apunta y toca el verbo correcto. 📸 |
| R3 | Guarda cada verbo según su prefijo. | Arrástralo al frasco a- o en-. |

- Home: "De oruga a mariposa" · catLabel "Sufijos y prefijos".
- Vocabulario ecuatoriano; palabras de R1/R3 en minúsculas; enunciados con punto.

## Arquitectura
- Base estructural: copia del **juego-11** (1 nivel, sin chips, shell estándar).
- Shell reutilizado intacto: GameHUD sin tabs, CharacterCorner, GameEnunciado,
  ActionRail, modales, FeedbackOverlay, makeDragHandler, ResultsScreen, reporte
  imprimible, scoring por tiempo `calcStars`.
- `GameScreen` → wrapper con `restartTick` que remonta `ReportajeGame`; despacho
  `ronda === 0/1/2` a `SufijoLabCard` / `CamaraCard` / `ClasificaCard`.
- FIFO anti-repetición: 1 key `edinun_juego13_recientes_v1`, prefijos `lab:`/`cam:`/`clas:`.

## Decisiones / notas
- R2 se planteó como "shooter" pero se realiza como **cámara de elegir-una-opción
  con VERIFICAR** para respetar el estándar INAMOVIBLE de botones manuales (#10).
  Sigue el espíritu aprobado: "fotografía el verbo correcto".
- R3 clasifica por **prefijo** (no por sufijo) porque es lo que el libro usa en su
  tabla y es lo más legible para 8 años.
- Bancos ampliables: R1 (16 adjetivos), R2 (9 verbos), R3 (2×6 verbos).
