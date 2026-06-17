# Buscando la palabra adecuada — diseño (juego-23)

## Tema
TEMA 3 del libro EDINUN de Lengua y Literatura: **adecuación** —
"Buscando la palabra adecuada". Cubre los **niveles/registros del lenguaje**
(coloquial · estándar · culto), la **adecuación** al receptor y a la situación
comunicativa, y la **variación léxica** (palabras fuera de registro).
Audiencia: **13 años**. 1 solo nivel. Personaje destacado por defecto:
**Márquez** (narrador), guía para elegir las palabras adecuadas según con quién
se habla. El estudiante puede cambiarlo.

Contenido apoyado en el libro pero con **redacción propia** (no se copian los
párrafos del texto). Vocabulario ecuatoriano neutro.

> La autora pidió una mecánica **muy diferente** a la del juego-22 y un juego
> entretenido para chicos de 13. Diseño aprobado por la autora vía menú de
> mecánicas con bocetos ASCII; eligió A (dial) + B (chat) + D (termómetro) y,
> tras señalar que A y D pensaban igual (juzgar el nivel de un mensaje en una
> escala), aceptó reemplazar D por C (reparador) para tener 3 cerebros
> distintos: **reconocer → elegir → producir**.

## Niveles
Un único nivel (`registro`, catLabel "Buscando la palabra adecuada"). Home sin
chips de dificultad; HUD sin tabs. 3 rondas con mecánicas DISTINTAS (estándar
7+). Una sola ronda usa arrastre (R3).

## Mecánica (3 rondas, 3 interacciones distintas)

### R1 · Sintoniza el mensaje — DIAL (tocar/girar)
Aparece un mensaje y un **dial de 3 sectores** (coloquial · estándar · culto).
El estudiante toca una posición → la **aguja gira** hacia ella (transición CSS).
Auto-evaluado (§13): al acertar, breve verde y avanza; al fallar, marca la
elegida en rojo, revela la correcta en verde (✓) y **avanza solo**. 6 mensajes
(2 por nivel), correcto si aciertos ≥ 5. Componente NUEVO: `RegistroDial`
(patrón de tarjetas heredado de `OrigenSelector` de juego-24, con dial SVG).
Trabaja **reconocer** el registro.

### R2 · Chat correcto — SIMULADOR DE CHAT (elegir) — ronda estrella
Pantalla de **celular**: chateas con un receptor distinto (👵 abuela · 🎓 rector
· 😎 pana). En cada turno el receptor escribe (globo izq) y eliges una de 2
respuestas (globos candidatos); la adecuada respeta el registro del receptor,
la otra es graciosa pero inadecuada (demasiado informal con la abuela/rector,
raramente formal con el amigo). Feedback verde/rojo por turno (§11); la
conversación **avanza con la respuesta adecuada** para mantener coherencia.
Auto-evaluado: 3 turnos, correcto si ≥ 2. Componente NUEVO: `ChatSim`. Banco:
3 conversaciones (abuela · rector · pana), FIFO 1. Trabaja **elegir** según el
receptor (adecuación). Enseña que la adecuación va en AMBOS sentidos.

### R3 · Reparador de mensajes — ARRASTRE (producir/corregir)
La única ronda con arrastre. 3 frases con una palabra **coloquial** (mostrada
tachada) y un hueco; bandeja con las **3 palabras adecuadas + 2 señuelos
coloquiales**. El estudiante arrastra (o toca y suelta) la palabra correcta a
cada hueco. VERIFICAR manual (§10) + BORRAR; al fallar, cada hueco se marca
verde/rojo y se revela la palabra correcta (§11). Componente NUEVO:
`ReparadorBoard`. Banco: 8 frases (FIFO 3). Trabaja **producir/corregir** el
registro (variación léxica).

## Por qué no se repiten las mecánicas
- R1 = reconocer / clasificar (girar el dial). 1 cerebro: taxonomía.
- R2 = decidir social (tocar el globo adecuado al receptor). 2º cerebro: adecuación.
- R3 = producir / corregir (arrastrar la palabra adecuada). 3er cerebro: producción.
Tres interacciones físicas + tres tipos de pensamiento distintos. Máximo
contraste con juego-22 (shooter · simulador de coloquio · memoria) y con
juego-24 (emparejar · selector de origen · clasificar tecnicismos).

## Glifos del fondo
Tema comunicación + chat + registros: 💬 📱 ✍️ 🗣️ 📨 ✨ 🎙️ 💭 📖 🎭 🔤 📝 🗨️ ✦ ⭐.
COSMIC 15, CHALK 10.

## Copy específico
- Home label: "Buscando la palabra adecuada". Descripción: "Elige las palabras
  adecuadas para cada persona y cada situación."
- Enunciados (QUÉ): R1 "Clasifica cada mensaje según su registro." · R2
  "Responde a cada persona con el registro adecuado." · R3 "Cambia las palabras
  fuera de lugar por la forma adecuada."
- Bocadillos (CÓMO): R1 "Gira el dial: ¿es coloquial, estándar o culto?" · R2
  "Toca el mensaje que le queda bien a esa persona." · R3 "Arrastra cada palabra
  adecuada a su hueco."
- FIFO key: `edinun_juego23_recientes_v1`.

## Decisiones / riesgos
- 3 componentes nuevos (`RegistroDial`, `ChatSim`, `ReparadorBoard`); el shell
  (HUD, personaje, enunciado, action rail, modales, feedback, reporte, scoring
  por tiempo) se hereda intacto del estándar (juego-24/21).
- Revisar en QA visual: altura del marco de celular de R2 (cabecera + hilo +
  2 opciones) y el alto de las 3 frases con hueco de R3 dentro del lienzo
  900×540; rotación de la aguja del dial en R1.
