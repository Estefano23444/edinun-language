# Juego 4 — diseño

## Tema
**"Los 4 caminos del lenguaje"** — cuatro niveles temáticos del libro EDINUN,
uno por etapa de edad: tipos de texto (7 años), función poética (10),
escritura académica (12) y enriquecimiento de la lengua (14).

## Niveles
| Nivel | Slug | Edad | Concepto |
|---|---|---|---|
| 🟠 T1 | `tipos` | 7 años | Literario / Informativo / Funcional |
| 🟡 T2 | `poetica` | 10 años | Función poética del lenguaje |
| 🔵 T3 | `escritura` | 12 años | Informes, conectores, revisión |
| 🟣 T4 | `enriquece` | 14 años | Polisemia, homófonas, condicional |

Layout en HomeScreen: **grid 2×2** (no fila de 3). HUD del juego: **4 chips
centrados**. Tocar un chip no activo abre `SwitchLevelModal` igual que juego-2.

## Mecánica

Cada nivel tiene **3 rondas con mecánicas distintas entre sí** (decisión
explícita del autor para evitar repetición visual dentro del mismo nivel).

### T1 — Tipos de texto
- R1 · Trivia 3 botones (LITERARIO/INFORMATIVO/FUNCIONAL).
- R2 · Organizador gráfico tap-to-place (4 cuadros: Definición/Oración/Sinónimo/Dibujo).
- R3 · Mapa de burbujas estilo libro, tap múltiple toggle, consigna varía por ejercicio.

### T2 — Lenguaje poético
- R1 · Trivia función 3 botones (POÉTICA/INFORMA/PIDE ALGO).
- R2 · Emparejar refrán ↔ significado, tap-tap líneas entre 2 columnas.
- R3 · Encerrar figuras literarias en poemas, tap múltiple sobre versos.

### T3 — Escritura académica
- R1 · Ordenar las 6 partes del informe, tap-to-slot a slots 1-6.
- R2 · Conector correcto, trivia 3 botones + tipo de relación arriba.
- R3 · Cazar errores en párrafo, tap múltiple sobre palabras.

### T4 — Enriquece tu lengua
- R1 · Descubre la palabra polisémica, trivia 3 botones con 2 emojis arriba.
- R2 · Elige la letra (homófonas), tap 1 de 2 con pista + palabra con casilla.
- R3 · Completa con condicional, tap-to-place de verbos a 3 huecos en párrafo.

## Glifos del fondo

### Cosmic (15 símbolos, home/character/results)
Genéricos de lenguaje: `A`, `B`, `📖`, `📝`, `?`, `¿`, `✏`, `📰`, `📋`, `💬`,
`🌍`, `¡`, `🖊`, `📚`, `✨`.

### Chalkboard (10 símbolos por tema, sobrescribe `window.__currentChalkGlyphs`)
- T1: `📖 📰 📋 🍰 🦋 ? 📝 ✏ 📚 ¡`
- T2: `✨ 💫 ✏ * ❤ 🌙 📖 ¿ ¡ ✨`
- T3: `📑 🖊 📊 ✓ ✗ ? . , ; :`
- T4: `🌍 💬 🐭 🖱 ? A B Z Y V`

## Copy específico

### Slug y personaje
- **Slug del juego**: `juego-4`.
- **Personaje destacado en el landing**: 🧭 **Verne (El Explorador)** —
  encaja con la idea de "explorar 4 facetas distintas del lenguaje".
- El estudiante elige libre en `CharacterScreen` como siempre.

### Etiquetas en Home
- T1: "Tipos de texto" · "Literario, informativo o funcional."
- T2: "Lenguaje poético" · "Refranes, metáforas y rimas."
- T3: "Escritura académica" · "Informes, conectores y revisión."
- T4: "Enriquece tu lengua" · "Polisemia, homófonas y condicional."

### catLabel (HUD del juego + reporte)
- T1 → "Tipos de texto"
- T2 → "Lenguaje poético"
- T3 → "Escritura académica"
- T4 → "Enriquece tu lengua"

### Bocadillo del personaje (por ronda)
- T1·R1: "¿De qué familia es este texto?"
- T1·R2: "Arrastra cada pieza al cuadro correcto."
- T1·R3: "Pinta solo las burbujas correctas. Después VERIFICA."
- T2·R1: "¿Qué función tiene esta oración?"
- T2·R2: "Toca un refrán y luego su significado."
- T2·R3: "Toca las figuras literarias del poema."
- T3·R1: "Arrastra cada parte al orden correcto (1-6)."
- T3·R2: "Elige el conector que mejor une las oraciones."
- T3·R3: "Toca las palabras con error ortográfico."
- T4·R1: "¿Qué palabra conecta estas dos imágenes?"
- T4·R2: "Elige la letra que completa la palabra."
- T4·R3: "Arrastra cada verbo al hueco correcto."

## Decisiones abiertas / riesgos

1. **Drag-and-drop usando tap-to-place**: en lugar de HTML5 drag events
   (que tienen problemas en tablet/mobile), todas las mecánicas de "arrastrar"
   usan el patrón **tap pieza → tap destino**. Más simple y accesible.

2. **Slots `data-qa` heredados del juego-2**: el QA visual valida zonas
   genéricas (HUD, bocadillo, zona-central, personaje, bandeja, acciones).
   Las 12 rondas son visualmente distintas, así que un QA estricto requeriría
   redefinir zonas por ronda — fuera de alcance del scaffolding inicial.

3. **Banco de polisémicas con emojis Unicode**: dependemos del set de emojis
   del dispositivo. Si un emoji no está disponible (ej: 🖱 en sistemas viejos)
   aparecerá como rectángulo. Aceptable.

4. **Anti-repetición agresiva**: `RECENT_LIMIT = 6` y cada ronda hace pushRecent.
   Si el banco tiene 6 items o menos (ej: ORG_BANK tiene 6), la primera vez
   se descartan todos. El fallback es repetir desde el banco completo,
   no falla.

5. **Sin botón VERIFICAR en R1 de T1, T2 y T4**: las trivias se validan
   instantáneamente al tocar la opción (con un delay de 250ms para mostrar
   el highlight). R2 y R3 sí llevan VERIFICAR cuando requieren múltiples
   acciones.

6. **El bocadillo del personaje vive en la zona inferior izquierda y la zona
   central arranca en `left:240`** para evitar colisiones.

7. **HUD con 4 chips ocupa más ancho que con 3**: las etiquetas se mantienen
   cortas ("Tipos de texto", "Lenguaje poético", "Escritura académica",
   "Enriquece tu lengua") para que entren en una fila sin wrap.
   Fuente del chip se redujo de 11px (juego-2) a 10px.

## QA realizado
- ✅ Bundle exitoso.
- ✅ HomeScreen + CharacterScreen + T1·R1 + T1·R2 verificados visualmente
  con Playwright en viewport 1280×800.
- ⏸ T1·R3, T2/T3/T4: pendiente verificación visual del usuario.
- ⏸ QA en 6 viewports: ejecutar `node .planning/qa-checks.js` cuando sea
  necesario (el script existe pero está adaptado al juego antiguo
  "completa-palabras" — útil para validar layout general, no zonas exactas
  de cada ronda).
