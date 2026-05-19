# MEMORY — Juego 2

Bitácora del juego `juegos/juego-2/`.

## Origen
Segundo juego del repo `edinun-language`. A diferencia del primer juego
("Completa la palabra") que tiene un solo nivel, Juego 2 tiene **3 niveles
temáticos** del libro EDINUN:
- 🟠 La letra r (1 mecánica)
- 🟡 La noticia (3 mecánicas distintas en sus 3 rondas)
- 🔵 El blog (3 mecánicas distintas, incluye shooter en ronda 2)

## Audiencias por nivel (NO expuestas en UI)
- Nivel 1: 6 años (1ro de primaria)
- Nivel 2: 9 años (4to de primaria)
- Nivel 3: 12 años (7mo de primaria)

## Diferencias respecto a "Completa la palabra"
- HomeScreen con **3 botones de nivel** (en vez de uno solo).
- Cada nivel renderiza un sub-componente distinto (`LetraRGame`,
  `NoticiaGame`, `BlogGame`) seleccionado por `app.currentCategory`.
- Glifos del fondo `chalkboard` son **dinámicos por nivel** vía
  `window.__currentChalkGlyphs`.
- Personaje **grande en los 3 niveles** (`size=190`, `width=220`,
  `left=8`, `bottom=90`), con bocadillo dinámico por ronda. Zona-central
  arranca en `left=240` para no chocar. El botón SALIR vive debajo del
  personaje en la columna izquierda (`left=70, bottom=24`).
- HUD del juego trae **3 chips de tema** centrados arriba (`data-qa="hud-temas"`).
  El activo se pinta con el `grad` del nivel; los otros, en gris. Tocar uno
  no activo abre el modal `SwitchLevelModal` (similar al ExitModal) y al
  confirmar cambia `app.currentCategory`/`currentCatLabel`, lo que remonta
  el sub-juego desde cero (timers se limpian solos por unmount).

## Comandos
```bash
# Re-empaquetar tras editar cualquier .jsx
node .planning/bundle.js

# QA visual (heredado del template)
node .planning/qa-checks.js
```

## Estructura del catálogo (en game-screens.jsx)
- `LETRA_R_BANK` (14 palabras)
- `R_TRAY` (5 letras: r/l/m/n/s)
- `NOTICIAS` (6 noticias con titular/entrada/cuerpo/cierre + 1 resumen
  correcto + 2 distractores cada una)
- `NOTICIA_CONCEPTOS` (10 conceptos + definición del libro)
- `BLOG_ELEMENTOS` (8 elementos canónicos del libro)
- `BLOG_CONCEPTOS` (10 conceptos + definición)
- `BLOG_DISTRACTORES` (10 palabras digitales NO canónicas, para el shooter)
- `BLOG_MOCKUPS` (3 mockups con 4 secciones cada uno)

## Anti-repetición persistente
Tres claves independientes en localStorage:
- `edinun_juego2_letraR_recientes_v1`
- `edinun_juego2_noticia_recientes_v1`
- `edinun_juego2_blog_recientes_v1`

Cada una guarda hasta 6 keys recientes para evitar repeticiones entre rondas.
