# Un diálogo para conocernos — diseño (juego-22)

## Tema
TEMA 3 del libro EDINUN de Lengua y Literatura: **Lengua y cultura** —
"Un diálogo para conocernos". Cubre el **Ecuador plurilingüe** (14 lenguas
originarias), el **coloquio** (vs. el debate, su estructura) y **por qué
desaparecen las lenguas** (globalización · falta de registros · pocos
hablantes · diglosia). Audiencia: **13 años**. 1 solo nivel.
Personaje destacado por defecto: **Verne** (explorador), guía del
descubrimiento de las lenguas del Ecuador. El estudiante puede cambiarlo.

Contenido apoyado en el libro pero con **redacción propia** (no se copian los
párrafos del texto). Vocabulario ecuatoriano neutro.

> Nota: la autora primero clasificó el tema como "ortografía", pero el TEMA 3
> es de **sociolingüística / lengua y cultura**. Se alineó con ella antes de
> diseñar: el juego trabaja CONCEPTOS, no escritura de palabras.

## Niveles
Un único nivel (`dialogo`, catLabel "Un diálogo para conocernos"). Home sin
chips de dificultad; HUD sin tabs. 3 rondas con mecánicas DISTINTAS (estándar
7+). Una sola ronda usa arrastre (R3).

## Mecánica (3 rondas, 3 interacciones distintas)

### R1 · Atrapa las lenguas del Ecuador — SHOOTER (arcade, §13)
Caen nombres de lenguas. El niño **toca las originarias del Ecuador** (acierto)
y **deja caer las de otros países** (Náhuatl, Maya, Guaraní, Aimara,
Mapudungun, Wayúu, Zapoteco, Rapa Nui, Tupí, Muisca). Auto-evaluado, sin
VERIFICAR. Gana con **aciertos ≥ 6 y errores ≤ 2** en 16 s. Se evita "Quechua"
para no confundir con el Kichwa ecuatoriano.
Banco SÍ: 14 lenguas del Ecuador (Kichwa Sierra/Amazónico, Shuar Chicham,
Achuar Chicham, Shiwiar Chicham, A'ingae, Tsafiki, Cha'palaa, Awapit, Sia
Pedee, Paicoca, Wao Terero, Sápara, Shimingae). Componente NUEVO: `LenguasShooter`
(patrón heredado de juego-19 `ComediaShooter`).

### R2 · El coloquio en vivo — SIMULADOR (rol/historia) — ronda estrella
El niño **modera un coloquio** y decide en cada una de las **3 fases**
(Presentación → Desarrollo → Cierre). Cada fase: narración + 3 opciones; la
correcta es propia del COLOQUIO, las incorrectas imitan al DEBATE (convencer,
ganar, imponer) o rompen la estructura. Tocar una opción solo la **selecciona**
(resalte dorado/cian); el niño pulsa **VERIFICAR** (rail derecho, estándar #10)
para calificar: feedback verde/rojo, se revela la correcta (✓) y se explica el
porqué; tras un momento para leer, **avanza solo** de fase. Auto-avance, sin
botón CONTINUAR. Correcto si acierta las **3 fases**. Enseña a la vez la
**estructura del coloquio** y su **diferencia con el debate**. Componente
`ColoquioSim` (CONTROLADO: el padre maneja fase/selección/bloqueo y dispara la
calificación desde VERIFICAR). Banco: 2 coloquios (lenguas del Ecuador · lengua
materna), FIFO 1.

### R3 · Memoria de las lenguas — MEMORIA (parejas causa ↔ ejemplo)
Tablero de **8 cartas boca abajo** (4 parejas, cuadrícula 4×2). Cada pareja une
una **CAUSA** (emoji + nombre: Globalización · Falta de registros · Pocos
hablantes · Diglosia) con un **EJEMPLO** breve de esa causa. El niño voltea dos
cartas: si coinciden quedan a la vista (borde de color + ✓ verde); si no, se
ocultan tras un instante. Sin arrastre ni VERIFICAR (toca y voltea).
Auto-evaluado: al emparejar las 4, termina; correcto si lo logra con **≤3
fallos**. Trabaja memoria + relación causa-ejemplo. Componente NUEVO:
`MemoriaLenguas`. Banco: 2 ejemplos por causa, 1 por ronda (FIFO) → varía al
repetir. (Reemplazó las mecánicas previas de clasificar `CausasBins` y de
selector `RescateLengua`, que se parecían demasiado a la R2.)

## Por qué no se repiten las mecánicas
- R1 = reflejos / arcade (tocar lo que cae).
- R2 = decisión / criterio (leer la fase y elegir + VERIFICAR).
- R3 = memoria y relación (voltear cartas y emparejar causa ↔ ejemplo).
Tres interacciones físicas + tres tipos de pensamiento distintos.

## Glifos del fondo
Tema diálogo + lenguas + Ecuador: 💬 🗣️ 🌎 🦜 📖 ✨ 🎤 🏔️ 🪶 🌿 🧭 📜 ✍️ ✦ ⭐.
COSMIC 15, CHALK 10.

## Copy específico
- Home label: "Un diálogo para conocernos". Descripción: "Descubre las lenguas
  del Ecuador y aprende a dialogar para conocernos."
- Enunciados (QUÉ): R1 "Atrapa solo las lenguas originarias del Ecuador." · R2
  "Modera el coloquio eligiendo la mejor decisión en cada fase." · R3 "Lleva
  cada situación a la causa que explica la desaparición de la lengua."
- Bocadillos (CÓMO): R1 "¡Rápido! Toca las lenguas del Ecuador y deja caer las
  de otros países." · R2 "El coloquio comparte ideas, no busca ganar como el
  debate." · R3 "Arrastra cada caso a su causa correcta."
- FIFO key: `edinun_juego22_recientes_v1`.

## Decisiones / riesgos
- Diseño aprobado por la autora vía bocetos ASCII y elección de la ronda estrella
  (simulador "El coloquio en vivo").
- 3 componentes nuevos (LenguasShooter, ColoquioSim, CausasBins); el shell (HUD,
  personaje, enunciado, action rail, modales, feedback, reporte) se hereda intacto
  del estándar (juego-21).
- QA visual con Playwright (1280×800): flujo completo Home → Personaje → R1
  (shooter) → R2 (simulador, 3 fases) → R3 (clasificar 4 causas) → Resultados.
  0 errores de consola/página.
- QA GEOMÉTRICA (qa-geom22.js, viewports 1920×1080 / 1280×800 / 1024×768): mide
  bounding boxes en coords lógicas y detecta solapes / overflow / invasión del riel.
  Primera pasada encontró 2 solapes reales (no visibles a simple vista):
  · R2: el contenido (ancho 470) pisaba el bocadillo 5×74 px → se estrechó a 448 y
    se centró vertical (justifyContent center). Botón Continuar/Terminar termina en
    y≈498-506 (margen >30 px al borde) en las 3 fases.
  · R3: el enunciado de 2 líneas pisaba la bandeja 19 px → se acortó a 1 línea
    ("Clasifica cada situación según su causa."), distinto del bocadillo (CÓMO).
  Tras los arreglos: ✓ sin solapes ni overflow en los 3 viewports. La cuadrícula
  2×2 de R3 entra a 2 cajas por fila; feedback verde/rojo (✗/✓) correcto.
- Node v24.16.0 + Playwright/Chromium se instalaron por-usuario (sin admin) como
  parte del entorno de desarrollo (Node en `%LOCALAPPDATA%\nodejs`, en el PATH de
  usuario).
