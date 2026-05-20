# MEMORY — Juego 3

Bitácora del juego `juegos/juego-3/`.

## Origen
Tercer juego del repo `edinun-language`. Dos niveles temáticos del libro EDINUN:
- 🟠 La letra C y Q (1 mecánica × 3 rondas con progresión CA/CO/CU → CE/CI → QUE/QUI)
- 🔵 Elementos del texto (3 mecánicas distintas: speed quiz, drag match, elige el final)

## Audiencias por nivel (NO expuestas en UI)
- Nivel 1: 6 años (1ro de primaria) — la letra C y Q.
- Nivel 2: 12 años (7mo de primaria) — elementos del texto.

## Personaje destacado en el landing
**narrador** (Márquez, El Cuentacuentos). El cuentacuentos encaja temáticamente
con "comprender textos" del Nivel 2 y aporta variedad respecto a juego-2 (que
usa escritor).

## Diferencias respecto a juego-2
- HomeScreen con **2 botones de nivel** (en lugar de 3). Grid `1fr 1fr`.
- HUD del juego con 2 chips de tema (en lugar de 3).
- Nivel 1 reutiliza el patrón "Completa la palabra" de `completa-palabras` pero
  con sílabas C/Q+vocal en vez de letras sueltas, y bandejas distintas por ronda
  (5 sílabas C en R0/R1, 2 sílabas Q en R2).
- Nivel 2 introduce 3 mecánicas NUEVAS en el repo:
  - **SpeedQuizCard**: cronómetro 30s + cola de textos + tap-chip rápido. Score
    final → 1 entrada del log.
  - **DragMatchCard**: 3 textos vs 3 chips, tap-to-connect (no drag&drop nativo
    para compatibilidad táctil), auto-verify al conectar los 3.
  - **ElijeElFinalCard**: historia narrativa sin desenlace + 4 opciones de
    inferencia, tap directo con feedback verde/rojo en la opción elegida.

## Comandos
```bash
# Re-empaquetar tras editar cualquier .jsx
node .planning/bundle.js

# QA visual (heredado del template)
node .planning/qa-checks.js
```

## Estructura del catálogo (en game-screens.jsx)
- `LETRA_CQ_R0` (10 palabras), `LETRA_CQ_R1` (7), `LETRA_CQ_R2` (10).
- `TRAY_C = ["CA","CE","CI","CO","CU"]`, `TRAY_Q = ["QUE","QUI"]`.
- `INTENCIONALIDAD_POOL` (12 textos) + `INTENCIONALIDAD_CHIPS` (4).
- `TONO_POOL` (12 textos) + `TONO_CHIPS` (4).
- `ARGUMENTO_POOL` (8 historias con `question` + `options[4]`).

## Anti-repetición persistente
Seis claves independientes en localStorage:
- `edinun_juego3_letraCQ_r0_recientes_v1`
- `edinun_juego3_letraCQ_r1_recientes_v1`
- `edinun_juego3_letraCQ_r2_recientes_v1`
- `edinun_juego3_elementos_r1_recientes_v1`
- `edinun_juego3_elementos_r2_recientes_v1`
- `edinun_juego3_elementos_r3_recientes_v1`

Cada una guarda hasta 6 keys recientes para evitar repeticiones entre rondas.

## Layout adoptado por sub-juego
- **LetraCQGame**: emoji card + fila de slots/letras visibles centrada, bandeja
  de fichas debajo (bottom 60). Botón REINICIAR debajo del personaje (left 60,
  bottom 24).
- **ElementosTextoGame**: zona-central a `top=132 left=240 right=18 bottom=70`.
  Cada ronda monta un sub-componente distinto dentro de esa caja, manteniendo
  HUD, personaje, bocadillo y botón REINICIAR fijos.

## Pendiente futuro
- Validar pool de palabras Nivel 1 con docentes ecuatorianos por si CIPRÉS o
  ESQUELETO no son vocabulario común en la audiencia objetivo.
- Considerar agregar un cuarto chip distractor en R1 de Nivel 2 (DragMatch) si
  el ejercicio se siente fácil tras testing real.
