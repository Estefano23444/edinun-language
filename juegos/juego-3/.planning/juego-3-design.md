# Juego 3 — diseño

## Tema
Tercer juego del repo `edinun-language`. Dos niveles temáticos del libro EDINUN
de lenguaje, cada uno para una audiencia distinta (no expuesta en la UI):
- Nivel 1 → 6 años (1ro de primaria) — la letra C y Q.
- Nivel 2 → 12 años (7mo de primaria) — elementos para comprender mejor un texto.

charId destacado en el landing: **narrador** (Márquez, El Cuentacuentos).

## Niveles

2 niveles seleccionables desde HomeScreen con botones de color (naranja / azul).
Los botones muestran SOLO el nombre del tema.

| Botón | Tema | Mecánica |
|---|---|---|
| 🟠 La letra C y Q | Completa palabras con sílabas C/Q+vocal | 1 mecánica × 3 rondas con progresión |
| 🔵 Elementos del texto | Comprende lo que lees | 3 rondas con mecánicas DISTINTAS |

## Mecánica de cada nivel

### 🟠 Nivel 1 — La letra C y Q (6 años)
Patrón "Completa la palabra" adaptado a sílabas:
- Emoji + palabra con TODAS las sílabas C/Q+vocal ocultas (puede haber 1, 2 o 3 huecos).
- Las letras no objetivo quedan visibles entre los huecos (ej: CASCO → `[CA] S [CO]`).
- Bandeja de fichas reutilizables. Tap llena el primer hueco vacío.
- Auto-verifica al completar TODOS los huecos. Sin botón VERIFICAR ni BORRAR explícito (tap en casillero lleno borra esa ficha).
- 3 rondas, una palabra distinta por ronda. Sin repetir en la misma sesión + anti-repetición persistente en localStorage.

**Progresión por ronda** (no mostrada al niño, solo refleja el orden interno):
- R0 — C con A/O/U (sonido /k/) — bandeja `CA CE CI CO CU`.
- R1 — C con E/I (sonido /s/) — bandeja `CA CE CI CO CU`.
- R2 — Q + U siempre juntas — bandeja `QUE QUI`.

**Banco** (en `LETRA_CQ_R0/R1/R2`):
- R0 (10): CASA, COCO, CUNA, CAMA, CUBO, COCHE, CABRA, CASCO, CARACOL, CACAO.
- R1 (7): CEBRA, CISNE, CEREZA, CENA, CINE, CINTA, CIPRÉS.
- R2 (10): QUESO, QUINCE, RAQUETA, MOSQUITO, MÁQUINA, PARQUE, BUQUE, PAQUETE, BOSQUE, ESQUELETO.

**Bocadillo único las 3 rondas**: *"Completa la palabra."*
**catLabel en reporte**: **"La letra C y Q"**

### 🔵 Nivel 2 — Elementos del texto (12 años)
3 rondas con 3 mecánicas activas y distintas.

#### R0 — SPEED QUIZ "¿Para qué?" (intencionalidad)
- Cronómetro de 30 segundos.
- Cola de mini-textos del pool. Cada texto: tap rápido en uno de 4 chips fijos (`INFORMAR · PERSUADIR · ENTRETENER · OPINAR`).
- Tap correcto → +1 acierto, siguiente texto. Tap incorrecto → +1 error, chip tiembla, mismo texto sigue.
- Al terminar 30s: `score = aciertos − errores`. Considera correcto si `score ≥ 4`.
- Pool de 12 textos cortos, mezcla de las 4 intenciones.

#### R1 — DRAG MATCH "El tono escondido" (tono del autor)
- 3 textos en columna izquierda + 3 chips de tono en columna derecha.
- Tap-to-connect: tap en un texto lo selecciona; tap en un chip lo conecta al texto seleccionado. Cada chip es único (no se puede usar dos veces).
- Al conectar los 3 → auto-verifica. `isCorrect` solo si los 3 emparejamientos son correctos.
- 3 textos elegidos para que cada uno sea de un tono distinto (uno por chip de los 4 disponibles).
- Pool de 12 textos. Chips: `ADMIRA · CRITICA · SE BURLA · INFORMA`.

#### R2 — ELIGE EL FINAL "Detective de textos" (argumento implícito)
- Historia narrativa corta (3-5 líneas) sin desenlace explícito.
- Pregunta concreta tipo "¿qué le pasó?" o "¿qué pasaba?".
- 4 finales posibles, 1 correcto (la inferencia válida). Los demás son: afirmaciones literales no inferenciales, exageraciones, datos no presentes.
- Tap → resultado inmediato (verde si correcto, rojo si no), pasa al reporte tras 500ms.
- Pool de 8 historias.

**Bocadillos por ronda**:
- R0: *"¿Para qué fue escrito?"*
- R1: *"¿Cómo se siente el autor?"*
- R2: *"¿Cómo termina la historia?"*

**catLabel en reporte**: **"Elementos del texto"**

## Glifos del fondo

**Cosmic (home/character/results)** — 15 símbolos mixtos:
`C` `Q` `📖` `💬` `ce` `ci` `📝` `✏` `qu` `💡` `🤔` `?` `¡` `📚` `🔍`

**Chalkboard (dinámico por nivel)**:
- Nivel 1: `C` `Q` `ca` `ce` `ci` `co` `cu` `que` `qui` `✏`
- Nivel 2: `📖` `💬` `📱` `✏` `📝` `❓` `❗` `💡` `🤔` `→`

## Copy específico

- Hero del Home: `EDINUN · Letras y textos`
- HomeScreen botones:
  - 🟠 "La letra C y Q" — *"Completa palabras con CA, CE, CI, CO, CU, QUE, QUI."*
  - 🔵 "Elementos del texto" — *"Descubre el sentido escondido en lo que lees."*
- Resultado: *"{studentName}, completaste {N} de 3 retos."*

## Decisiones de diseño

- **Bandejas distintas por ronda en Nivel 1**: R0 y R1 muestran las 5 sílabas C (`CA CE CI CO CU`) para forzar discriminación. R2 muestra solo `QUE QUI` porque el libro enseña que la Q solo va con U.
- **Auto-verify al completar huecos** (sin botón VERIFICAR): más fluido para 6 años. El niño puede borrar tocando un casillero lleno antes de completar el último.
- **Un intento por ronda**: si se equivoca, los huecos malos tiemblan en rojo, 0⭐, y avanza tras 1.5s.
- **Mecánicas activas en Nivel 2**: el primer borrador era "tap chip + tap chip + tap chip" — aburrido para 12 años. Se cambió a 3 mecánicas distintas (speed / drag-match / elegir final) para variar la interacción.
- **DragMatch como tap-to-connect**: en mobile el drag&drop puro es complicado. Tap secuencial (texto → chip) funciona en touch, mouse y trackpad sin librerías externas.
- **Personaje grande en los 2 niveles**: tamaño uniforme (`size=190`, columna izquierda, bocadillo arriba). Zona-central arranca en `left=240` para no chocar. Botón REINICIAR debajo del personaje (igual que juego-2).
- **Anti-repetición independiente por ronda/categoría** vía 6 claves separadas en localStorage (`edinun_juego3_letraCQ_r0/r1/r2_recientes_v1`, `edinun_juego3_elementos_r1/r2/r3_recientes_v1`).

## Decisiones abiertas / riesgos

- **Algunos emojis**: 🔢 para QUINCE quizá no es ideal (más bien "input numérico"). Si en QA se ve mal, cambiar a otro emoji evocador del 15.
- **Largo de palabras Nivel 1**: la más larga es ESQUELETO (9 letras). Los slots se reducen dinámicamente según el largo total para caber en el ancho útil entre `left=240` y `right=18`. Validado por el QA visual.
- **Speed quiz frenético para 6 años?**: el Nivel 2 con SpeedQuiz es para 12 años, no 6. La velocidad asumida es accesible para esa edad pero requiere validación con usuarios reales.
- **Distractores en DragMatch**: los 3 chips mostrados son los 3 tonos correctos (uno por texto). No hay un cuarto chip distractor, lo cual baja la dificultad. Se puede subir agregando 1 distractor inactivo en versiones futuras.
- **Pool finito en Nivel 2**: 12+12+8 textos. En sesiones muy repetidas eventualmente puede repetir entre sesiones, pero las claves de localStorage evitan repetición inmediata.
