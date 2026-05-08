# MEMORY.md — EDINUN GAMES

Bitácora del proyecto: qué se ha hecho, decisiones tomadas, estado actual.

## Origen

Handoff bundle de Claude Design (claude.ai/design). Prototipo HTML/JSX que se llevó a producción manteniendo HTML estático sin build (servido por GitHub Pages).

## Stack y deploy

- **Frontend:** React 18 + Babel Standalone cargados desde unpkg (CDN). Todo el JSX vive inline en `index.html` / `EDINUN GAMES.html` dentro de un único `<script type="text/babel" data-presets="react">`.
- **Sin build, sin package manager, sin tests.** Doble clic en `index.html` funciona local (`file://`).
- **Repo:** https://github.com/Estefano23444/edinun-language (público).
- **URL live:** https://estefano23444.github.io/edinun-language/ (GitHub Pages, branch `main`, path `/`).
- **Workflow editar:** modificar `.jsx` fuente → re-empaquetar al HTML (ver `CLAUDE.md`) → commit → push → Pages redespliega.

## Identidad de producto

- Nombre: **EDINUN GAMES** (no "EDINUN Conecta" — renombrado).
- Logo: `assets/edinun-logo.png` dorado oficial. Se usa como `EdinunLogo` (grande, con glow) y `EdinunLogoMini` (HUD). Sin reconstrucción SVG.
- Paleta cósmica + dorado EDINUN definida en `styles.css` con variables `--ed-*`.

## Flujo de la app

`Home` (nivel → nombre → ENTRAR) → `Personaje` (4 personajes) → `Juego` (3 rondas) → `Resultados` (con imprimir + reiniciar).

En Home el orden es **nivel primero, nombre después**: tocar un botón grande de color es más concreto para un niño de 6–8 años que escribir un nombre, así que se elige el nivel y luego se identifica antes de entrar.

Sin pantalla de menú ni perfil — el nivel elegido en Home determina la dificultad de la palabra:
- `basic` → palabras cortas (3-4 letras), 1 vocal escondida
- `medium` → palabras medianas (4-5 letras), 2 vocales escondidas
- `advanced` → palabras largas (5-7 letras), 2-3 vocales escondidas

## Juego actual (JUEGO-1)

**Completa con vocales** — el estudiante ve una palabra con consonantes
intactas y huecos donde van las vocales. Toca un teclado de 5 vocales
(A E I O U) para llenar los huecos. Cada vocal puede usarse varias veces
(la ficha no se consume). Personaje destacado: Lupe la escritora.

## Decisiones clave de UX (validadas con el usuario)

- **Personajes** son tipo Mario Kart: solo profesión + vibe (Lupe escritora, Río poeta, Sami exploradora, Teo cuentacuentos). **No** mencionar temas específicos como "el de sinónimos" o "la de la ortografía" en sus descripciones.
- **Juego** tiene la **mecánica como protagonista** (no el personaje). Personaje queda pequeño en esquina inferior izquierda.
- **Interacción del jugador** depende del patrón de mecánica del juego (ver `mechanics-design.md`): tap directo en multiple choice, drag & drop con fallback tap-to-place en mecánicas de fichas/slots, etc. Lo invariante: **siempre debe haber un camino sin drag** para que funcione en móvil táctil.
- **Pista del personaje en juego**: bocadillo en la zona superior izquierda del lienzo con texto compacto explicando CÓMO resolver, no QUÉ resolver. Universal a todos los niveles. El feedback motivador post-VERIFICAR sigue saliendo en el centro con atribución al personaje — los dos canales no se pisan: el bocadillo lleva pista de mecánica, el feedback central lleva reacción al intento.
- **Enunciado de juego accionable**: verbo directo, instrucción de interacción, no descripción de la tarea (ej: "Toca el sinónimo" no "Identifica el sinónimo correcto").
- **3 ejercicios por sesión** (no 5).
- **Botones VERIFICAR y BORRAR / SALIR** en columna derecha del juego según mecánica, sin botón de Pista.
- **Contador de visitantes** persistente en `localStorage` (`edinun_visitors_v1`), incrementa una vez por sesión vía `sessionStorage` guard. Solo cuenta cuando el estudiante completa su primer intento real (no al cargar la página).
- **Resultados:** botones de Imprimir reporte (CSS `@media print` recorta a `.ed-print-area`) y Reiniciar juego.
- **Glifos del fondo** adaptados al dominio lenguaje (letras, signos de puntuación, acentos, palabras cortas) — opacidad 0.42, glow blanco+dorado.

## Decisiones técnicas de producción

- **`DeviceStage` adaptativo:** clasifica viewport en `desktop` / `tablet` / `mobile` por dimensiones (no UA). Sin marco de teléfono, sin notch.
- **Lienzo lógico fijo 900×540 paisaje** escalado con `transform: scale()` (estrategia *contain*). Las pantallas usan `position: absolute` con coordenadas pixel — el lienzo fijo preserva el layout.
- **Fondo cósmico al viewport completo** (rendered en `DeviceStage`, no en cada pantalla). Las pantallas son transparentes — ya no se renderiza `<CosmosBg/>` adentro. Esto evita que las "barras laterales" en aspect ratios distintos se vean negras: el cosmos se extiende edge-to-edge.
- **Glifos del fondo responsive** con `font-size: clamp(48px, 7vmin, 110px)` en `.ed-glyphs` + tamaños relativos `em` por glifo. Misma escala visual en cualquier dispositivo.
- **Variant del fondo por ruta:** `cosmic` por defecto, `chalkboard` (verde pizarra) para la pantalla de juego. App pasa la variant a `DeviceStage`.
- **Móvil portrait:** el lienzo paisaje queda letterboxed (pequeño). Aparece pildorita `↻ Gira tu dispositivo` no bloqueante. **El contenido nunca rota** — el usuario gira físicamente el teléfono.
- **Pinch-zoom custom (no nativo).** Los gestos táctiles los maneja `DeviceStage` con handlers de touch (`{passive: false}`) y los aplica al `transform` del lienzo, no al visual viewport del browser. Razón: con el lienzo letterboxed, el zoom nativo de iOS Safari panea al usuario hasta los bordes vacíos de cosmos (el "rebote" reportado en iPhone 17 Pro). Meta viewport con `user-scalable=no` y `touch-action: none` en el wrapper. Detalle técnico (math del anclaje, modos de gesto, snap-back) en `.planning/ios-zoom.md`.
- **`DebugNav`** del prototipo eliminado (era la barra `demo Inicio Personaje Juego Resultados`).
- **React `.production.min.js`** en vez de development.

## Limitaciones conocidas / pendientes

- Layouts internos siguen siendo pixel-positioned dentro del lienzo 900×540, así que la UI no se "estira" fluida en desktop — se escala uniforme. Refactor a layout fluido con `vw/vh`/grid es trabajo mayor pendiente si se quiere que botones/personajes crezcan más en pantallas grandes.
- Drag & drop HTML5 funciona con mouse; en móvil táctil el fallback es tap-to-place (tocar una ficha → la coloca en el siguiente slot vacío). Aplica a mecánicas de fichas/slots; mecánicas de tap directo (multiple choice) no requieren fallback.
- Sin backend: trazabilidad y progreso solo viven en `localStorage` del navegador del estudiante.
- `design-canvas.jsx` y carpeta `uploads/` son residuos del bundle original — están en `.gitignore`, no se publican.

## Archivos cargados en runtime

`index.html` (idéntico a `EDINUN GAMES.html`) + `styles.css` + `assets/edinun-logo.png`. Los `.jsx` son fuente editable que se re-empaqueta al HTML, no se cargan en runtime.
