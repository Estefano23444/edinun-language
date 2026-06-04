# Instrucciones del proyecto edinun-language

Repo de juegos de lengua EDINUN. 13 juegos actualmente, todos comparten el mismo shell visual y estructural.

## Estándares de shell INAMOVIBLES (2026-06-01)

La autora fijó los siguientes estándares como inamovibles. **Cualquier desviación requiere preguntarle explícitamente antes de tocar nada.** No "mejorar" valores por iniciativa propia.

Fuentes de verdad (sincronizadas):
- **`docs/shell-standards.md`** — versionado en el repo, fuente canónica portable.
- `.claude/skills/edinun-game-builder/references/shell-standards.md` — copia local que usa la skill (no se commitea).

Leer cualquiera de las dos antes de crear/modificar cualquier juego.

Resumen de los estándares (detalle completo en el archivo de referencia):

1. **CharacterCorner**: padre `bottom: 90, width: 220`, char `size={190} floating`, bocadillo `bottom: 100%` + `className="ed-float-soft"`, bocadillo cuerpo `maxWidth: 208` + `whiteSpace: "pre-line"`, fontSize 14, sombra 140×16, nombre marginTop -2 fontSize 14.
2. **GameEnunciado**: centrado con `left: 50% + translateX(-50%)`, `width: 488`, prop `top` (default 84).
3. **Enunciado vs Bocadillo**: enunciado = QUÉ hacer (la tarea, termina con punto); bocadillo = CÓMO hacerlo (la mecánica). Nunca poner solo el título como enunciado.
4. **Minúsculas en juegos de completar palabra**: la data (word, segments, tray) va en minúsculas; nunca mencionar "minúsculas" en enunciados.
5. **ResultsScreen modelo juego-1**: char `size={180}`, título "¡Ronda completa!" fontSize 36, frase fontSize 13 maxWidth 240, grid `0.85fr 1.4fr`, logo size 56.
6. **Selectores binarios inline** (g/j, c/s/z): pill blanca + dos mitades + divisor vertical (segmented control), no chips sueltos.
7. **Wrap de palabras**: cuando una palabra es texto+inline-block+texto, pre-procesar tokens para agrupar último trozo de texto + selector + sufijo en un span `whiteSpace: "nowrap"`.
8. **Carteles con texto variable**: `width: "fit-content"` con `maxWidth`, no `width: "100%"`.
9. **3 rondas obligatorias** por sesión; desde 7 años cada ronda con mecánica diferente.
10. **Botones VERIFICAR/BORRAR/REINICIAR/SALIR manuales**, centrados vertical con `top: 50% + translateY(-50%)`.
11. **Feedback al fallar**: marcar la opción correcta en verde con badge ✓ cuando el niño falla y no la había elegido.
12. **FIFO anti-repetición por categoría**, tamaño ≈ `Math.floor(N/2)` donde N es el banco.
13. **Avance automático al fallar** en mecánicas tipo SpeedQuiz (no dejar al niño atascado).
14. **Vocabulario ecuatoriano**: evitar regionalismos de MX/ES/CO.

## Comandos

- **Rebundle** (regenera index.html + "EDINUN GAMES.html" de un juego):
  ```
  cd juegos/<slug> && node .planning/bundle.js
  ```
- **Servidor local** para probar visualmente: `npx http-server -p <puerto> -c-1 --silent` (desde la raíz del repo).
- **Verificación visual**: usar Playwright MCP (navegar, screenshot, evaluate).

## Arquitectura

- React 18.3 + Babel standalone, sin build step. JSX inline en HTML.
- Cada `juegos/<slug>/` es autocontenida y portable.
- Bundle: `.planning/bundle.js` concatena los `.jsx` en orden y los inyecta en el `<script type="text/babel">` de `index.html` + `EDINUN GAMES.html`.
- Persistencia: `localStorage` (FIFO de escenas recientes, contador de visitantes).

## Memoria de la autora

Los archivos en `C:/Users/Admin/.claude/projects/c--Users-Admin-Desktop-edinun-language/memory/` contienen reglas de feedback y notas de cada juego. Consultar antes de hacer cambios estructurales.

## Si quieres desviarte de algún estándar

**Pregunta primero.** Cita el punto exacto de `shell-standards.md`, explica qué cambiar y por qué, y espera autorización explícita.
