# JUEGO-7 — Reseñas y palabras escritas · diseño

## Tema
Dos temas del libro EDINUN:
- **N1 — La reseña** (8 años, Tema 2 del libro). Reseña literaria: qué es, sus 3 partes (Descripción, Valoración, Conclusión), ficha del libro y argumento.
- **N2 — Aprendiendo a escribir** (10 años, Tema 4 del libro). Pronombres personales y posesivos, verboides (infinitivo/gerundio/participio), verbos regulares vs irregulares.

## Niveles
| Nivel | Edad | Etiqueta Home | Descripción Home |
|---|---|---|---|
| `resena`   | 8 años  | La reseña                | Lee y opina sobre libros |
| `escritor` | 10 años | Aprendiendo a escribir   | Pronombres y verbos para escribir mejor |

Personaje destacado en el landing: **Rolli (la Escritora)** — encaja con la temática completa (lectura/escritura/reseña).

## Mecánica (6 rondas, todas distintas — regla 7+ años aplicada en ambos niveles)

### N1 · La reseña
- **R1 Ficha del libro** — Drag de etiquetas a slots tipo formulario. 6 campos (Título/Autor/Editorial/Año/Páginas/Género) + 2 distractores. 3 libros distintos en banco: "El oso y el piano", "El niño, el topo, el zorro y el caballo", "101 cosas antes de ser mayor". Mecánica: tap etiqueta → tap slot. **VERIFICAR**.

- **R2 Partes de la reseña** — Clasificación tap-tap a 3 cajones (DESCRIPCIÓN / VALORACIÓN / CONCLUSIÓN). 6 párrafos cortos de una reseña, 2 por cada tipo. El niño toca un cajón y luego el párrafo a asignar. 3 reseñas en banco: Matilda, El oso y el piano, El principito. **VERIFICAR**.

- **R3 Ordena el cuento** — 5 escenas de un cuento mezcladas, el niño las reordena con tap-tap intercambio (heredado del patrón de juego-6 R2 N2). 3 cuentos: La rama y el caracol (libro), El oso y el piano (resumido), El ratoncito valiente. **VERIFICAR**.

### N2 · Aprendiendo a escribir
- **R1 Pronombre detective** — 3 huecos con sustantivo subrayado y 3 opciones cada uno (pronombres personales y posesivos). Multiple choice por hueco. 3 textos en banco: De viaje, En casa, En clase. **VERIFICAR**.

- **R2 Laboratorio de verboides** — Drag combinatoria: un lexema central (cant- / com- / viv-) + 3 cajones (INFINITIVO / GERUNDIO / PARTICIPIO). Bandeja con 7 desinencias (3 correctas + 4 distractoras). 3 verbos en banco. **VERIFICAR**.

- **R3 Pintor de verbos** — Tomado del Aplico del libro. Un párrafo con 5 verbos resaltados; cada tap cicla AZUL (regular) → ROJO (irregular) → vacío. 3 textos en banco: Mi perro, El jardín de Marta, En la cocina. **VERIFICAR**.

## Adaptación del `log` (lastResult)
Cada ronda llena el log con:
- `a` = textTarget completo (todos los slots/respuestas correctas concatenadas)
- `b` = userAnswer (lo mismo pero con las respuestas del estudiante)
- `op` = icono temático (📕, ✍, 📖, 🕵, 🧪, 🖍)
- `correctAnswer` = a
- `userAnswer` = b
- `isCorrect` = bool, todo o nada (toda la ronda correcta o no)
- `time`, `earned` = como el resto del repo

## Glifos del fondo

```
Cosmic (15, home/character/results):
  📖 ✍ 📚 ★ yo tú él ar er ir ✨ ¿ ¡ -ando -ado

Chalkboard (10, game) — varía por nivel:
  N1 resena:     📖 ✍ ★ 📚 ✨ ? ¿ ¡ 🔖 📝
  N2 escritor:   yo tú él ar ✍ ? ✨ ir -ando -ado
```

## Copy específico

```
HomeScreen:
  Hero: "Lectores y escritores"
  Botón N1: "La reseña"             sub: "Lee y opina sobre libros"
  Botón N2: "Aprendiendo a escribir" sub: "Pronombres y verbos para escribir mejor"

GameScreen (bocadillos por ronda):
  N1R1: "Toca un dato y luego el casillero."
  N1R2: "Toca un cajón y luego una frase."
  N1R3: "Toca dos escenas para intercambiarlas."
  N2R1: "Toca el pronombre que reemplaza cada nombre."
  N2R2: "Toca una terminación y luego un cajón."
  N2R3: "Toca una vez = azul, dos veces = rojo."

Enunciados:
  N1R1: 'Completa la ficha del libro — "<título>"'
  N1R2: 'Clasifica las partes de la reseña de "<título>"'
  N1R3: 'Ordena las escenas del cuento "<título>"'
  N2R1: 'Reemplaza cada nombre por el pronombre correcto — "<título>"'
  N2R2: 'Forma los 3 verboides del verbo "<VERBO>"'
  N2R3: 'Pinta los verbos: azul = regular, rojo = irregular — "<título>"'

ResultsScreen category:
  "La reseña"  o  "Aprendiendo a escribir"
```

## Decisiones de diseño y riesgos

- **R2 N1 (Partes de reseña)**: 6 párrafos a clasificar en 3 cajones, 2 por tipo. El layout es 100px de cajones + lista vertical de párrafos. Riesgo: si los textos son largos, hay scroll vertical. Mitigado con `maxHeight: 360px` + `overflowY: auto`.

- **R3 N2 (Pintor de verbos)**: tap cicla 3 estados (vacío → azul → rojo → vacío). Patrón nuevo en el repo; no aparece en juegos 1-6. Riesgo: niño puede olvidar el 2do tap. Mitigado con leyenda visible permanente (🔵 Regular / 🔴 Irregular) abajo del párrafo.

- **R1 N1 (Ficha del libro)**: incluye 2 distractores en la bandeja para evitar que el niño solo arrastre por descarte. Tamaño de slots: minHeight 42px para que entre el nombre del campo + valor sin overflow.

- **Selección de verbos regulares/irregulares**: se respeta la definición del libro EDINUN (lexema cambia/no cambia). Los irregulares elegidos son los más comunes y reconocibles: tener, dormir, regar, sentir, jugar, poner, volver. Los regulares son verbos -ar y -er sin cambio: correr, comer, plantar, cantar, cocinar, picar, esperar.

- **Personaje destacado Rolli**: la Escritora encaja con todo el contenido (reseñar y escribir). Alternativa rechazada: Márquez el Cuentacuentos (más asociado a contar historias específicamente).
