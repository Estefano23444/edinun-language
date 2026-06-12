# Escritores del mundo real — diseño

## Tema

Juego de **2 niveles por edad** (Home con selector, router por `app.level`).
Cubre dos temas del libro EDINUN de Lengua y Literatura:

- **Tema 1 — "Escritura y tecnología"** (11 años). La evolución de la
  escritura, la escritura tradicional vs digital, las herramientas digitales
  (escritura predictiva, traducción, corrección, colaboración, IA).
- **Tema 2 — "Textos periodísticos: la noticia"** (12 años). La pirámide
  invertida (titular/entrada/cuerpo/cierre), la objetividad (hecho vs
  opinión) y la detección de fake news / titulares sensacionalistas.

Contenido **100% original** (no reproduce los ejemplos del libro: ni la tabla
de etapas históricas, ni la noticia del James Webb, ni la de Bosa).

## Niveles

| id | edad | tema | personaje | mecánicas (3 rondas distintas) |
|----|------|------|-----------|--------------------------------|
| `escritura` | 11 años | Escritura y tecnología | **Verne** (explorador) | ordenar · shooter · acertijo |
| `noticia` | 12 años | La noticia | **Rolli** (escritor) | ordenar · detective · acertijo |

Ambas edades son 7+, así que cada nivel lleva **3 rondas con mecánica
diferente**. Solo **una** ronda por nivel usa arrastre (se evitó el problema
de dos rondas drag-a-cajitas seguidas).

## Mecánica

### NIVEL 1 — EscrituraGame (11 años)

- **R1 · La máquina del tiempo** (ORDENAR, componente `OrderRound`): 5 hitos
  de la evolución de la escritura se arrastran a casillas 1→5 (1 = más
  antiguo). Re-arrastre + bandeja para devolver. VERIFICAR manual. Banco
  `E1_TIMELINES` (herramientas / mensajes / instrumentos), FIFO prefijo `e1`.
- **R2 · Atrapa lo digital** (SHOOTER `DigitalShooter`, mecánica canónica #2):
  frases cortas flotan hacia abajo 16s; tocar las **digitales** (acierto),
  dejar caer las de **papel**. Auto-evaluado (§13, sin VERIFICAR). Ronda
  correcta si `aciertos >= 4 && errores <= 2`. Bancos `E2_DIGITAL`/`E2_PAPEL`.
- **R3 · El asistente misterioso** (ACERTIJO, `OptionButton` + pistas
  revelables): 2-3 pistas describen una herramienta digital; el niño adivina
  con 3 opciones. Banco `E3_ACERTIJOS`, FIFO prefijo `e3`.

### NIVEL 2 — NoticiaGame (12 años)

- **R1 · Arma la noticia** (ORDENAR, `OrderRound`): las 4 partes de la
  pirámide invertida (Titular → Entrada → Cuerpo → Cierre) se arrastran a
  casillas 1→4, cada tarjeta con un ejemplo original. Banco `N1_NEWS`
  (feria / parque / robótica), FIFO prefijo `n1`.
- **R2 · Caza la opinión** (DETECTIVE, tocar la frase dentro del texto):
  una noticia de 4 frases; una opina y rompe la objetividad (índice
  variable). El niño toca la frase subjetiva. VERIFICAR + feedback §11
  (la correcta en verde ✓). Banco `N2_TEXTS`, FIFO prefijo `n2`.
- **R3 · ¿Confiable o trampa?** (ACERTIJO binario, detector de fake news):
  un titular → CONFIABLE / TRAMPA. Titulares objetivos vs
  sensacionalistas/fake. Banco `N3_HEADLINES`, FIFO prefijo `n3`.

## Glifos del fondo

Tema tecnológico/comunicación: `</>` `{ }` `@` `#` `0` `1` `01` `→` `Aa` `=`
`✎` `💬` `📰` `⌨` `?` `★` (15 cosmic, 10 chalkboard). En `screens.jsx`.

## Copy específico

- Slug/carpeta: `juego-17`. Título landing: **"Escritores del mundo real"**.
- Home: hero "Escribe, informa y comunica" + selector de 2 temas (botones con
  degradado + cajita `${edad} · ${descripción}`).
- Enunciados (QUÉ) y bocadillos (CÓMO) separados §3, terminados en punto.
  - N1: "Ordena los inventos…" / "Arrastra cada ficha a su casilla, del 1 al 5."
        · "Atrapa solo lo de la escritura digital." / "Toca las frases digitales
        y deja pasar el papel." · "Adivina qué herramienta digital se describe." /
        "Lee las pistas y toca la herramienta correcta."
  - N2: "Ordena las partes de la noticia…" / "Arrastra cada parte a su lugar
        (1 = lo principal)." · "Encuentra la frase que opina…" / "Toca la parte
        del texto que opina, no informa." · "Decide si el titular es confiable o
        una trampa." / "Lee el titular y toca confiable o trampa."

## Arquitectura

Copiado de **juego-14** (multinivel por edad, Home selector, router por
`app.level`). `GameScreen`: `noticia` → `NoticiaGame`, default → `EscrituraGame`.
Shell compartido heredado intacto: `GameHUD` (con tabs de tema + `SwitchLevelModal`),
`CharacterCorner` §1, `ActionRail` (con `hideVerify` para el shooter),
`FeedbackOverlay`, `ConfirmModal`, `makeAnswer` (scoring/log/results),
`makeDragHandler`, `OrderRound` (ordenar genérico N casillas), `OptionButton`,
`Cartel`, `DigitalShooter`. `ResultsScreen` genérica (Reto / Tu respuesta /
Respuesta correcta). FIFO único `edinun_escritura_noticia_recientes_v1`.

## Decisiones abiertas / riesgos

- **R1 ordenar línea del tiempo vs tabla del libro**: el concepto de evolución
  cronológica ES el aprendizaje; los ítems son generales (no copian la tabla
  Antigüedad→Tablillas… del libro). Aprobado en la planificación.
- **Shooter**: única mecánica nueva del juego (adaptada del shooter de juego-5).
  Frases cortas para minimizar solapes al caer. Umbral de aprobación
  `aciertos>=4 && errores<=2`. Si en aula resulta muy fácil/difícil, ajustar.
- **Personaje**: Verne (visionario/tecnología) para escritura, Rolli
  (escritor/reportero) para la noticia. El niño puede cambiarlo.

## QA visual

Playwright (1280×800 aprox.): Home, N1-R1 (ordenar), N1-R3 (acertijo),
N2-R1 (pirámide), N2-R2 (detective), N2-R3 (confiable/trampa) y Resultados
(reporte 3/3, 100%) capturados sin errores. **0 errores de consola** en todo
el flujo. FIFO confirmado (set de línea del tiempo distinto al recargar). El
shooter (N1-R2) se verificó funcionalmente (monta, corre 16s, puntúa y avanza);
la captura en vivo no se congeló por la latencia del runner vs el timer de 16s.
