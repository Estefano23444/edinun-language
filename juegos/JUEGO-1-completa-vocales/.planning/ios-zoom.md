# Pinch-zoom en iPhone — implementación custom

## Por qué no el zoom nativo del browser

El zoom nativo de iOS Safari opera sobre el visual viewport del browser y deja al usuario panear libremente dentro del layout viewport. Con la geometría actual eso falla: el lienzo (900×540) está letterboxed dentro de un wrapper que mide `100vw × 100dvh`, y los bordes del wrapper son intencionalmente decorativos (solo cosmos). Cualquier pinch que no quede perfectamente centrado deja al usuario mirando un borde vacío de cosmos sin forma de "regresar al contenido".

Síntoma reportado: en iPhone 17 Pro el contenido "rebotaba" — un frame estaba zoomeado, al siguiente solo se veía cosmos (ver `reponsive/responsive.mp4`, frames 12.85s → 12.90s).

Los fixes previos (commits `0bb8202`, `7140e11`, `fec9e23`) intentaron hacer convivir el zoom nativo con la geometría letterboxed cambiando `position: fixed → relative`, removiendo `overflow:hidden` del body y añadiendo `overscroll-behavior: none`. Ninguno aborda la causa raíz: la pelea es entre "documento web normal con bordes paneables" (asumido por iOS) y "lienzo letterboxed con bordes vacíos" (nuestro diseño).

## Estrategia actual

Tomamos los gestos en JS y los aplicamos al `transform` del lienzo, no al visual viewport.

- **Meta viewport** en `index.html` y `EDINUN GAMES.html`: `maximum-scale=1, user-scalable=no` — desactiva el zoom del browser para que no compita con el nuestro.
- **`touch-action: none`** en el wrapper de `DeviceStage` — el browser no interpreta gestos táctiles por su cuenta. Los click/tap de botones siguen funcionando (no es lo mismo que `pointer-events`).
- **Handlers de `touchstart` / `touchmove` / `touchend`** atachados con `{passive: false}` para poder hacer `preventDefault()` durante un gesto activo.

## Modos de gesto

`gestureRef.current.mode`:

- `pinch` — dos dedos. Calcula `ratio = dist / dist0` y aplica `userZoom = z0 * ratio` con clamp a `[Z_MIN*0.7, Z_MAX*1.05]` (rango elástico durante el gesto). El `pan` se ajusta para que el punto medio entre los dedos quede anclado al mismo píxel del lienzo durante todo el gesto.
- `pan-armed` — un dedo, esperando ver si se mueve más de 8px antes de tomar control. Si no se mueve y el usuario suelta, el click pasa al hijo (botón). Solo se arma si `userZoom > 1`; con zoom en 1 los toques pasan directo a los botones.
- `pan` — un dedo, ya tomó control (movió > 8px con zoom > 1). Aplica delta lineal al `pan` acumulado.

## Math: anclaje del punto medio del pinch

Sean:
- `vw, vh` = tamaño del viewport.
- `s = baseScale * userZoom` = escala total del lienzo.
- `(panX, panY)` = pan acumulado en píxeles CSS del viewport.
- `(mx, my)` = posición de un punto en pantalla.

El mapeo de coords lienzo → pantalla con el transform `translate(-50%,-50%) translate(panX,panY) scale(s)` es:

```
screen.x = vw/2 + panX + s * (px - W/2)
screen.y = vh/2 + panY + s * (py - H/2)
```

Para que el punto medio del pinch `(mx0, my0)` quede anclado al mismo píxel del lienzo cuando la escala cambia de `s0` a `s1` (es decir, cuando `userZoom` pasa de `z0` a `z1`, con `r = z1/z0`):

```
panX_new = (mx0 - vw/2) * (1 - r) + r * panX0 + (mx_now - mx0)
```

Donde `(mx_now - mx0)` es el desplazamiento del propio gesto (la pinza también se mueve). La derivación está implícita en el código de `app.jsx`.

## Snap-back al soltar

En `touchend` con `e.touches.length === 0`:

- Si `userZoom < 1` → snap a `1` y `pan = (0,0)`.
- Si `userZoom > Z_MAX` → snap a `Z_MAX`.
- Si `pan` excede el rango válido `(±(s*W - vw)/2, ±(s*H - vh)/2)` → clamp.

La animación se logra alternando `transition: transform 0.22s` cuando no hay gesto activo (`!duringGesture`) y `transition: none` durante el gesto. El cambio de `userZoom` y `pan` post-touchend con `transition` activa anima suavemente.

## Reset en cambios de viewport

Cuando `vw` o `vh` cambian (rotación, resize de ventana en desktop, URL bar mostrándose/ocultándose), un `useEffect` resetea `userZoom = 1, pan = (0,0)`. Sin esto, el pan queda referenciado a un viewport que ya no existe.

## Lo que se delega al sistema operativo

Accesibilidad para usuarios con baja visión: iOS tiene zoom global del sistema (Ajustes → Accesibilidad → Zoom: triple-tap con tres dedos para hacer zoom sobre cualquier app). Funciona sobre nuestra UI sin importar lo que hagamos. Lo mismo Android (Magnification) y desktop (Cmd/Ctrl + scroll en navegador, OS magnifier). No reimplementamos eso.

## Lo que sigue funcionando igual

- Drag-and-drop HTML5 con mouse en desktop — los handlers nuestros solo capturan touch events, no pointer/mouse.
- Tap-to-place en móvil — los click events siguen llegando a los botones porque `touch-action: none` solo bloquea gestos del browser, no eventos.
- Glifos del fondo — `glyphSize` se sigue computando del viewport defendido contra DPR. La defensa de `useViewportSize` queda intacta para el caso ctrl+rueda en desktop.

## Lo que cambia respecto a antes

- En iPhone, ya no aparece el "rebote": el zoom siempre queda anclado al lienzo.
- En desktop, ctrl+rueda sigue siendo zoom del browser (no entra en nuestros handlers de touch). El defendido vía `physicalSize()` se mantiene.
- Doble-tap-zoom del browser está desactivado en todas las plataformas. Si un usuario lo necesitaba, ahora pinch dos veces rápido para llegar al mismo zoom.
