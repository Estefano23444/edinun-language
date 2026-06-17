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
ganar, imponer) o rompen la estructura. Al elegir: feedback verde/rojo, se
revela la correcta (✓) y se explica el porqué; "Continuar" avanza. Auto-evaluado:
correcto si acierta las **3 fases**. Enseña a la vez la **estructura del
coloquio** y su **diferencia con el debate**. Componente NUEVO: `ColoquioSim`.
Banco: 2 coloquios (lenguas del Ecuador · lengua materna), FIFO 1.

### R3 · Salva la lengua — CLASIFICAR (arrastre)
Bandeja de situaciones + 4 cajas (causas) en cuadrícula 2×2: **Globalización ·
Falta de registros · Pocos hablantes · Diglosia**. El niño arrastra cada
situación a su causa. VERIFICAR manual; al fallar, cada situación se marca
verde/rojo (§11). Componente NUEVO: `CausasBins` (BinsRound de juego-19 extendido
a 4 cajas 2×2). Banco: 3 situaciones por causa, se toma 1 de cada una por ronda;
FIFO por causa.

## Por qué no se repiten las mecánicas
- R1 = reflejos / arcade (tocar lo que cae).
- R2 = decisión narrativa por fases (rol, tocar opción + Continuar).
- R3 = arrastrar y clasificar (la única ronda con drag).
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
- Pendiente: QA visual con Playwright en el entorno de la autora (no había Node/
  Playwright en PATH al construir; el bundle se generó con el runtime de Node
  embebido de Adobe). Revisar especialmente el alto vertical de R2 (escenario +
  3 opciones + explicación + Continuar) en la fase más larga.
