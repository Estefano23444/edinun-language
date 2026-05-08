# Completa con vocales — diseño

slug: JUEGO-1-completa-vocales
charId: escritor
fecha: 2026-05-08

## Tema

Reconocer las cinco vocales y completar palabras conocidas a las que les
faltan una o más vocales. Audiencia 6-8 años, lectura inicial.

## Niveles

| Nivel | Variante | Ejemplo |
|---|---|---|
| basic    | Palabras 3-4 letras, **1 vocal escondida** | `G_TO` → GATO |
| medium   | Palabras 4-5 letras, **2 vocales escondidas** | `M_S_` → MESA |
| advanced | Palabras 5-7 letras, **2-3 vocales escondidas** | `_SC__LA` → ESCUELA |

Etiquetas en HomeScreen:
- BÁSICO — "Una vocal escondida en cada palabra."
- MEDIO — "Dos vocales escondidas en cada palabra."
- AVANZADO — "Palabras más largas con más huecos."

## Mecánica

Patrón base: variante de Pattern 3 (fichas → slots) restringida a las 5
vocales.

Cada ejercicio muestra:
- Emoji grande arriba (pista visual).
- Pista textual corta debajo del emoji ("Animal que ladra").
- Palabra mostrada como fila de letras: las consonantes intactas,
  las vocales seleccionadas como slots vacíos.
- Bandeja inferior con un teclado de 5 vocales (A E I O U). Cada
  vocal puede usarse múltiples veces — una palabra puede tener dos
  As (CASA, MESA) y la ficha A no se "consume".
- Botones VERIFICAR / BORRAR / SALIR a la derecha.

Interacción:
- Tocar una vocal de la bandeja → se llena el primer slot vacío de
  izquierda a derecha.
- Tocar un slot lleno → vacía ese slot específico.
- BORRAR → vacía el último slot lleno.
- VERIFICAR → si todos los slots están llenos, valida la palabra
  reconstruida contra la palabra correcta.

Validación:
- Si la palabra reconstruida === palabra correcta → estrellas según
  tiempo (10..1), avanza tras 950ms.
- Si no coincide → 0 estrellas, frase de aliento del personaje, avanza
  al siguiente ejercicio tras 1200ms (no se reintenta el fallado).

### Mapeo a zonas del grid

- HUD                  → `(0, 0) → (900, 56)` (data-qa="hud")
- Bocadillo            → `(14, 130) → (229, 200)` (data-qa="bocadillo")
- Personaje            → `(8, 340) → (228, 540)` (data-qa="personaje")
- Zona central         → `(215, 102) → (685, 350)` (data-qa="zona-central")
  - Emoji + pista       → top de la zona
  - Palabra con huecos  → debajo
- Acciones             → `(740, 145) → (888, 395)` (data-qa="acciones")
- Bandeja vocales      → `(280, 470) → (618, 540)` (data-qa="bandeja")

## Glifos del fondo

Cosmic (15 símbolos):
`A`, `E`, `I`, `O`, `U`, `á`, `é`, `í`, `ó`, `ú`, `sol`, `luz`, `mar`, `paz`, `mes`

Chalkboard (10 símbolos):
`A`, `E`, `I`, `O`, `U`, `á`, `é`, `í`, `ó`, `ú`

## Copy específico

- Línea hero (Home): `EDINUN · Completa con vocales`
- catLabel (HUD del juego): `Completa con vocales · {Básico|Medio|Avanzado}`
- Bocadillo del personaje (CÓMO resolver): `Toca la vocal que falta en cada hueco.`
- Botones bandeja: A, E, I, O, U (sin acentos — el juego no espera tildes)
- Mensaje correcto: `+{N} ⭐` (heredado del shell)
- Mensajes de aliento (rotativos):
  - "¡Casi! Sigue intentándolo."
  - "Las palabras se aprenden jugando."
  - "¡La próxima es tuya!"
  - "Equivocarse también es aprender."
  - "Las vocales son cinco amiguitas."
  - "¡Vamos al siguiente reto!"
  - "Cada error te acerca al acierto."

## Banco de palabras

Cada nivel tiene 10 palabras curadas. El generador elige una al azar
por ejercicio (con 3 ejercicios por sesión la repetición es muy rara).

- basic (10): SOL, MAR, PAN, PEZ, LUZ, GATO, PATO, FLOR, OSO, PIE
- medium (10): MESA, CASA, LUNA, PERRO, NIÑO, TREN, RANA, DEDO, PALO, LECHE
- advanced (10): ESCUELA, AMIGO, PLATANO, CABALLO, BOMBERO, MARIPOSA, JUGUETE, LIBRO, ZAPATO, PELOTA

Reglas: mayúsculas, sin tildes, vocales = {A,E,I,O,U}. La Ñ se trata como
consonante fija (queda visible).

## Decisiones abiertas / riesgos

- **Vocales repetidas**: las fichas de vocales se reutilizan (no se
  consumen). Esto permite palabras como CASA o MESA sin tener que
  mostrar dos As en la bandeja, pero cualquier vocal puede usarse en
  varios slots aunque la palabra solo tenga una. La validación es por
  palabra completa, así que el estudiante no puede "engañar" — si pone
  AAA donde corresponde EAO, falla.
- **Ñ** queda como consonante. No es un caso difícil porque el banco
  de palabras solo incluye una con ñ (NIÑO).
- **Acentos**: las palabras del banco están sin tildes (PLATANO, no
  plátano). Decisión consciente para no introducir un eje de
  dificultad ortográfica antes de tiempo. Un juego dedicado a
  acentuación podría venir después.
- **Pool small**: 10 palabras por nivel. Si el usuario quiere más
  variedad, basta con extender los arrays en `WORD_BANK` dentro de
  `game-screens.jsx`.
