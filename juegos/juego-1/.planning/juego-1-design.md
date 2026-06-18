# Completa la palabra — diseño

## Tema
Reconocer y escribir palabras conocidas (frutas, verduras, animales, objetos
comunes) en minúsculas, sin tildes ni Ñ ocultas. Audiencia: 2do grado / 6-8
años. Dos niveles temáticos que comparten mecánica y shell pero cambian
banco de palabras, bandeja y copy.

charId: escritor

## Niveles

**Dos niveles** (chips en Home, sin tabs en HUD). El usuario DEBE seleccionar
uno antes de poder ingresar el nombre y entrar.

| id      | label en chip          | glifo del chip | banco                  | bandeja        | catLabel                          |
|---------|------------------------|----------------|------------------------|----------------|-----------------------------------|
| vocales | "Completa con vocales" | "a e i o u"    | `WORD_BANK_VOCALES` (39 palabras) | a, e, i, o, u  | "Completa la palabra con vocales" |
| letraV  | "Letra V"              | "V"            | `WORD_BANK_LETRA_V` (17 palabras) | v, b, f, n, u  | "Letra V"                         |

Los chips se renderizan con gradiente dorado/naranja (estilo "tarjeta de
letra" del libro escolar) y muestran el glifo en grande arriba + label
abajo. Selección visible con borde blanco grueso y elevación 2 px.

### Cómo se elige el banco/bandeja en runtime
1. `HomeScreen` setea `app.level` con el id del chip seleccionado.
2. `CharacterScreen` mapea `app.level` → `app.currentCategory` y
   `app.currentCatLabel` leyendo `LEVELS_CFG`.
3. `GameScreen` busca `CATEGORIES[app.currentCategory]` y usa su `bank`,
   `tray`, `isSlot`, `recentKey`, `instruction` y `hint`.

Cada nivel tiene su propia clave de `localStorage` para "palabras recientes"
(buffers FIFO independientes de 10 entradas).

## Mecánica
**Patrón nuevo** (no en la biblioteca matemática del skill): "Completa la
palabra". Idéntica entre los dos niveles — solo cambia qué letras se ocultan
y qué fichas hay en la bandeja.

1. Zona central muestra un emoji grande dentro de un cartel dorado
   (~195×180) — la pista visual de la palabra.
2. Debajo, la palabra con letras visibles (en blanco con borde dorado
   inferior) y casillas vacías para las letras ocultas (cuadros con borde
   dorado).
3. Bandeja inferior: 5 fichas reutilizables (la misma ficha puede colocarse
   en varios slots). Tray según nivel:
   - **vocales**: `[a, e, i, o, u]` — todas correctas en algún punto.
   - **letraV**: `[v, b, f, n, u]` — solo `v` es correcta; las otras son
     distractores fijos. **B** suena parecido a V (/b/ ≡ /v/ en español);
     **F, N, U** son confundibles visualmente para un niño de 6 años.
4. **Interacción**: tap en ficha → llena primera casilla vacía. Tap en
   casilla llena → la borra. Botón BORRAR → borra la última colocada.
   Botón VERIFICAR → evalúa.
5. **3 ejercicios** por sesión, palabras distintas (sin repetir intra-ronda
   gracias a `usedRef`; sin repetir entre rondas/sesiones recientes gracias
   al buffer `recentKey` en localStorage). Estrellas decrecientes con
   tiempo según la fórmula heredada del shell.

### Reglas de los slots
- **vocales**: se ocultan TODAS las vocales de la palabra (1-3 según largo).
  La Ñ, tildes y consonantes son visibles.
- **letraV**: se ocultan TODAS las V de la palabra (1 o 2 — solo `vivienda`
  tiene 2). Todo lo demás (incluidas vocales, tildes y la propia palabra
  con sus consonantes) es visible.

### Banco "Letra V" — 17 palabras
Seleccionadas del libro escolar (ejercicio 3 y tabla de sílabas de la letra V)
y palabras frecuentes con V interior para niños de 6 años:

V inicial (libro): vaca · vela · vaso · ventana · volcán · vestido · viento · velero
V interior (libro): uva · avión · nieve · selva
V interior (extra): huevo · ave · nave · pavo
V doble (libro, reto): vivienda

Las palabras con tilde (`volcán` → á, `avión` → ó) muestran el acento como
letra visible — nunca es slot.

### Mapeo del log (`lastResult.log[i]`)
- `a` = palabra correcta (string)
- `b` = palabra del estudiante (string)
- `op` = "📝"
- `emoji` = emoji del ejercicio (lo usa el reporte)
- `correctAnswer` / `userAnswer` = strings

### Mapeo a zonas del grid (lienzo 900×540)
- HUD: `0..900 × 0..56`
- Bocadillo: `12..240 × 96..168` (texto varía por nivel)
- Zona central (emoji + casillas): `260..720 × 78..360`
- Acciones (VERIFICAR / BORRAR / SALIR vertical): `740..888 × 80..420`
- Personaje (wrapper con label): `0..230 × 280..530`
- Bandeja de fichas: centrada en `120..888 × 460..530`

## Glifos del fondo
**Cosmic** (15): `A E I O U M N P R S T L B C D`
**Chalkboard** (10): `A E I O U _ ? ✎ 📖 ✏`

Compartidos entre niveles — el fondo no cambia con la categoría (decisión
de no recargar al usuario con cambios visuales).

## Copy específico
- HomeScreen hero (label superior): "El país de las palabras de tierra"
- HomeScreen label chips: "Selecciona un tema para jugar"
- HomeScreen descripción dinámica:
  - vocales: "Mira la imagen y completa con las vocales."
  - letraV: "Completa cada palabra con la letra V."
  - sin selección: "Elige un tema para empezar." (italic, semi-opaco)
- CharacterScreen label: "Elige tu guía de palabras"
- GameScreen enunciado (varía por nivel, `catCfg.instruction`):
  - vocales: "Completa la palabra usando las vocales."
  - letraV: "Completa la palabra con la letra V."
- Bocadillo del personaje (varía por nivel, `catCfg.hint`):
  - vocales: "Toca cada vocal en su lugar."
  - letraV: "Toca la V donde corresponde."
- catLabel (varía por nivel, va al reporte):
  - vocales: "Completa la palabra con vocales"
  - letraV: "Letra V"
- ResultsScreen subtítulo: "Reporte académico · Juegos de Lenguaje"
- ResultsScreen frase de cierre: "{studentName}, completaste {N} de 3
  palabras."

## Decisiones abiertas / riesgos
- **PIÑA contiene Ñ**: el carácter Ñ nunca es slot. Si la palabra tiene Ñ,
  queda visible. Preserva "sin tildes/Ñ ocultas".
- **Largo máximo**: `mariposa` (8), `zanahoria` (9), `vivienda` (8). Las
  casillas se reducen dinámicamente (`SLOT_W` 40-64 px) para que toda la
  palabra quepa en los 460 px de zona-central. Validado por el QA visual.
- **Pool finito por nivel**: 39 vocales · 17 letraV. En una sesión sin
  repetir se usan 3. El `usedRef` evita repetir intra-ronda y el buffer
  `recentKey` (10 entradas) reduce la repetición entre rondas.
- **Distractores con letras visibles en la palabra**: para `letraV`, la
  bandeja tiene `n` y `u`, que aparecen visibles en algunas palabras
  (`ventana`, `huevo`, `uva`, etc.). Es intencional — el niño debe
  identificar que el slot pide V y no la letra que ya aparece visible
  en otra posición. Refuerza la atención sobre la posición del slot.
- **Emojis y SO**: los emojis nativos varían entre Windows / iOS / Android.
  Aceptado para mantener el peso del juego bajo (sin asset pack).
- **Compatibilidad con localStorage previo**: el buffer antiguo
  `edinun_completa_palabras_recientes_v1` deja de leerse. No hay migración
  — el nuevo nivel "vocales" empieza con buffer vacío. Impacto: el primer
  juego de un usuario que ya había jugado podría repetir alguna palabra
  vista hace tiempo. Aceptable.
