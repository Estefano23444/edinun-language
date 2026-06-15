# Un mundo para soñar — diseño (juego-21)

## Tema
TEMA 1 del libro EDINUN de Lengua y Literatura: **la literatura fantástica**
(lo extraño · lo maravilloso · lo fantástico) y **el arte de resumir**
(idea central · organizadores gráficos). Audiencia: **13 años**. 1 solo nivel.
Personaje destacado: **Rolli** (escritor), guía de los lectores grandes.

Contenido **100% original** — no se copian textos del libro (ni Alicia, Orfeo,
Equivocación, el gato Nube, la catacumba, la oruga, etc.). Vocabulario
ecuatoriano neutro.

## Niveles
Un único nivel (`fantastica`, catLabel "Literatura fantástica"). Home sin chips
de dificultad; HUD sin tabs. 3 rondas con mecánicas DISTINTAS (estándar 7+).

## Mecánica (3 rondas)

### R1 · El umbral de los mundos — clasificar (tocar 1 de 3)
Lee un microrrelato original y elige si pertenece a **Lo extraño**,
**Lo maravilloso** o **Lo fantástico**; confirma con VERIFICAR.

**Desambiguación (regla pedagógica):** cada relato lleva su MARCADOR para que
encaje en UNA sola categoría:
- *extraño* → al final hay explicación lógica.
- *maravilloso* → lo sobrenatural es lo normal de ese mundo (leyes propias).
- *fantástico* → mundo real + irrupción inexplicable + duda.

Al verificar, el bocadillo de feedback muestra la **clave** (el porqué) tanto al
acertar como al fallar; la categoría correcta se marca en verde con ✓.
Banco: 9 relatos (3 por categoría), FIFO ≈ 4.

### R2 · La cadena del relato — ordenar (arrastrar + re-arrastre)
Arrastra 5 escenas desordenadas de un microcuento original a las casillas 1→5
(organizador de secuencia = el arte de resumir). Bandeja en caja translúcida a
2 columnas para no confundirse con las casillas. Banco: 3 cuentos
(La brújula · El cuaderno · El faro), FIFO 1.

### R3 · La rueda de atributos — elegir 4 rasgos (tocar/arrastrar)
Concepto al centro + 4 ranuras (N/E/S/O) unidas por radios. El niño llena las
ranuras con los **4 rasgos que resumen** el concepto y deja en el banco los
**detalles/ejemplos trampa**. Al verificar, cada ranura se marca verde (rasgo)
o roja (detalle); los detalles correctamente NO usados no se marcan en rojo; un
rasgo correcto no colocado se resalta en el banco con ✓ verde.
Banco: 3 conceptos (El cuento fantástico · Lo maravilloso · El resumen), FIFO 1.

## Glifos del fondo
- **Cosmic (15):** 🌙 🗝️ 🐉 📖 🚪 ✨ 🔮 🏰 🦉 🕯️ 🪐 ☁️ 💫 ✦ ⭐
- **Chalkboard (10):** 🌙 🗝️ 📖 🐉 🚪 ✨ 🔮 ☁️ 🕯️ ★

## Copy específico
- Home label: "Un mundo para soñar" · descripción: "lo extraño · lo maravilloso · lo fantástico".
- Enunciados (QUÉ): R1 "Decide a qué mundo pertenece el relato." · R2 "Ordena las
  escenas para reconstruir el cuento." · R3 "Elige los 4 rasgos que resumen el concepto."
- Bocadillos (CÓMO): R1 "Lee el relato y toca el mundo correcto." · R2 "Arrastra cada
  escena a su lugar, del 1 al 5." · R3 "Toca los rasgos que resumen; deja los detalles."

## Decisiones abiertas / riesgos
- La autora pidió expresamente que los 3 mundos se diferencien bien para que
  ningún relato encaje en dos categorías → resuelto con el marcador + la clave.
- R3 es un componente NUEVO (RuedaCard): radios en SVG + ranuras absolutas N/E/S/O.
- QA visual: flujo Home→Personaje→R1→R2→R3→Resultados verificado con Playwright,
  0 errores de consola, sin overflow del lienzo (zona-central termina en ~518/540).
