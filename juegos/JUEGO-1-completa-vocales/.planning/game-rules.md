# Reglas del juego — sesión actual

Decisiones que rigen una sesión de juego en `GameScreen`. Editar `verify()` o
los contadores sin tener en cuenta estas invariantes rompe el reporte de
resultados aguas abajo.

## Una ronda = 3 ejercicios fijos

- `attempted` cuenta intentos (0..3). Cada llamada a `verify()` con todos los
  slots llenos consume **un** intento.
- Cuando `attempted === 3`, navega a `results`. No hay reintento del mismo
  ejercicio: si el estudiante se equivoca, se pasa al siguiente.
- Si faltan dígitos por colocar, `verify()` muestra feedback "Completa todos
  los casilleros" y **no** consume el intento.

## Estrellas por ejercicio (máx 10)

Solo se ganan estrellas con respuesta correcta. Fórmula:

```js
earned = Math.max(1, 10 - Math.floor(exerciseSec / 3))
```

`exerciseSec` es el tiempo desde que empezó **ese** ejercicio (no el tiempo
total de la sesión). `exerciseStart` se reinicia tras cada `verify()` exitoso
o fallido.

Tabla resultante:

| Tiempo (s) | Estrellas |
|------------|-----------|
| 0–2        | 10        |
| 3–5        | 9         |
| 6–8        | 8         |
| 9–11       | 7         |
| 12–14      | 6         |
| 15–17      | 5         |
| 18–20      | 4         |
| 21–23      | 3         |
| 24–26      | 2         |
| 27+        | 1         |

Respuesta incorrecta = 0 estrellas para ese ejercicio.

## Precisión

`accuracy = round((solved / total) * 100)` donde `total = 3`. Antes estaba
hardcodeado en 100 — ahora refleja el desempeño real (e.g. 2 aciertos de 3 →
67 %).

## Estrellas totales en el reporte

`starsEarned` en `lastResult` es la suma de estrellas ganadas **en esta
sesión** (`starsSession`), no `solved * 5` como antes. Esto refleja el nuevo
sistema basado en tiempo.
