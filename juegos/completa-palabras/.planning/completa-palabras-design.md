# Completa la palabra — diseño

## Tema
Reconocer y escribir palabras conocidas (frutas, verduras, animales, objetos comunes) en mayúsculas, sin tildes ni Ñ ocultas. Audiencia: 2do grado / 6-8 años.

charId: escritor

## Niveles
**Un solo nivel** (sin chips en Home, sin tabs en HUD). Decisión: el juego se enfoca en una mecánica simple para que el niño no tenga que tomar decisiones de "dificultad" — la dificultad se modula internamente por el largo de la palabra y el número de letras ocultas.

Regla interna del generador:
- Palabras de 3-4 letras → 1 letra oculta.
- Palabras de 5-6 letras → 2 letras ocultas.
- Palabras de 7+ letras → 2-3 letras ocultas.
- Siempre se prioriza ocultar al menos una vocal.

## Mecánica
**Patrón nuevo** (no en la biblioteca matemática del skill): "Completa la palabra".

1. Zona central muestra un emoji grande dentro de un cartel dorado (200×180) — la pista visual de la palabra.
2. Debajo, la palabra con letras visibles (en blanco con borde dorado abajo) y casillas vacías para las letras ocultas (cuadros con borde dorado).
3. Bandeja inferior: 5-7 fichas de letras (las correctas + distractores priorizando vocales).
4. **Interacción**: tap en ficha → llena la primera casilla vacía. Tap en casilla llena → la borra y devuelve la ficha. Botón BORRAR → borra la última colocada. Botón VERIFICAR → evalúa.
5. **3 ejercicios** por sesión (palabras distintas, sin repetir). Estrellas decrecientes con tiempo según la fórmula heredada del shell.

### Mapeo del log (`lastResult.log[i]`)
- `a` = palabra correcta (string)
- `b` = palabra del estudiante (string)
- `op` = "📝"
- `emoji` = emoji del ejercicio (extra, lo usa el reporte)
- `correctAnswer` / `userAnswer` = strings

### Mapeo a zonas del grid (lienzo 900×540)
- HUD: `0..900 × 0..56`
- Bocadillo: `12..240 × 96..168` ("Toca las letras que faltan")
- Zona central (emoji + casillas): `260..720 × 78..360`
- Acciones (VERIFICAR / BORRAR / SALIR vertical): `740..888 × 80..420`
- Personaje (wrapper con label): `0..230 × 280..530`
- Bandeja de fichas: centrada en `120..888 × 460..530`

## Glifos del fondo
**Cosmic** (15): `A E I O U M N P R S T L B C D`
**Chalkboard** (10): `A E I O U _ ? ✎ 📖 ✏`

## Copy específico
- HomeScreen hero: "EDINUN · Juegos de lenguaje"
- HomeScreen descripción: "Mira la imagen y completa la palabra."
- CharacterScreen label: "Elige tu guía de palabras"
- GameScreen HUD chip: "📖 COMPLETA LA PALABRA"
- Bocadillo: "Toca las letras que faltan."
- catLabel: "Completa la palabra"
- ResultsScreen: subtítulo del reporte académico = "Reporte académico · Juegos de Lenguaje"
- ResultsScreen frase de cierre: "{studentName}, completaste {N} de 3 palabras."

## Decisiones abiertas / riesgos
- **PIÑA contiene Ñ**: el carácter Ñ no se oculta nunca (no es elegible). Si la palabra elegida tiene Ñ, queda visible junto con las demás letras "no ocultas". Esto preserva la regla "sin tildes/Ñ ocultas".
- **Largo máximo**: la palabra más larga del banco es "MARIPOSA" (8) y "ZANAHORIA" (9). Las casillas se reducen dinámicamente (`SLOT_W` 40-64 px) para que toda la palabra quepa en los 460 px de zona-central. Validado por el QA visual.
- **Pool finito**: 31 palabras. En una sesión sin repetir, se usan 3. Si el niño juega muchas rondas seguidas, eventualmente puede repetir entre sesiones pero el `usedRef` evita repetir dentro de la misma sesión.
- **Emojis y SO**: los emojis nativos varían entre Windows / iOS / Android. Se aceptó esto antes que crear un asset pack de imágenes (proporción áurea del shell — heredamos lo simple).
