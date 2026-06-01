# Estándares de shell para juegos de lengua EDINUN

> **NATURALEZA**: este documento es **INAMOVIBLE**. La autora del producto fijó estos estándares como cierre del trabajo de unificación 2026-06-01. Cualquier desviación requiere **preguntarle explícitamente antes de tocar nada**. No "mejorar" valores por iniciativa propia.

Este documento es la fuente única de verdad para la apariencia y comportamiento del **shell** (CharacterCorner, GameEnunciado, GameHUD, ResultsScreen) en todos los juegos del repo `edinun-language`. Cada juego nuevo se construye usando exactamente estos valores.

## 1. CharacterCorner — Personaje + bocadillo (esquina inferior izquierda)

### Padre `<div data-qa="personaje">`

```js
position: "absolute",
left: 8,
bottom: 90,
width: 220,
pointerEvents: "none",
textAlign: "center",
```

### Bocadillo (nube de pensamiento)

**INVARIABLES:**

- `position: "absolute"`, `left: 0`, `right: 0`, **`bottom: "100%"`** (NO `top: -80` ni similares — la cola queda pegada arriba de la cabeza sin gap ni overlap)
- **`className: "ed-float-soft"`** — sincroniza la flotación con el personaje (misma animación CSS `translateY(0) → -6px → 0` en 3.5s ease-in-out)
- Cuerpo interno: `maxWidth: 208` (NO `width: 208` fijo — el cuerpo se adapta al texto; textos cortos no dejan aire vacío)
- `display: "flex"`, `justifyContent: "center"` en el wrapper para centrar el cuerpo inline-block
- `whiteSpace: "pre-line"` en el cuerpo (respeta `\n` manuales para multilinea)
- `fontSize: 14`, `fontWeight: 700`, `fontFamily: "var(--ed-font-display)"`
- Cola del bocadillo: triángulo apuntando hacia abajo, `bottom: -10`, `borderTop: "10px solid <fondoBocadillo>"`, ancho 18px

### Sombra de piso (radial gradient bajo el personaje)

- `width: 140`, `height: 16`, `borderRadius: "50%"`
- `background: "radial-gradient(ellipse, rgba(242,194,96,0.45), transparent 70%)"`, `filter: "blur(5px)"`

### `<char.Component>`

- **`size={190}`** (en juego), `floating` prop activado

### Nombre del personaje

- `marginTop: -2`, `fontSize: 14`, `fontWeight: 700`
- `fontFamily: "var(--ed-font-display)"`, `color: "#fce9a8"`, `letterSpacing: "0.04em"`
- `textShadow: "0 2px 6px rgba(0,0,0,0.6)"`

### Plantilla de referencia (copia esto a juegos nuevos)

```jsx
function CharacterCorner({ char, message }) {
  return (
    <div data-qa="personaje" style={{
      position: "absolute", left: 8, bottom: 90, width: 220,
      pointerEvents: "none", textAlign: "center",
    }}>
      <div data-qa="bocadillo" className="ed-float-soft" style={{
        position: "absolute", left: 0, right: 0, bottom: "100%",
        display: "flex", justifyContent: "center",
        pointerEvents: "none",
      }}>
        <div style={{
          position: "relative",
          maxWidth: 208,
          background: "linear-gradient(180deg, rgba(20,12,55,0.95), rgba(10,6,35,0.95))",
          border: "1.5px solid rgba(242,194,96,0.65)",
          borderRadius: 16, padding: "10px 14px",
          fontFamily: "var(--ed-font-display)",
          fontWeight: 700, fontSize: 14, lineHeight: 1.25,
          color: "#fce9a8", textAlign: "center",
          whiteSpace: "pre-line",
          boxShadow: "0 10px 24px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}>
          {message}
          <div style={{
            position: "absolute", bottom: -10, left: "50%", transform: "translateX(-50%)",
            width: 0, height: 0,
            borderLeft: "9px solid transparent", borderRight: "9px solid transparent",
            borderTop: "10px solid rgba(20,12,55,0.95)",
            filter: "drop-shadow(0 1px 0 rgba(242,194,96,0.55))",
          }} />
        </div>
      </div>
      <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
        <div style={{
          position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)",
          width: 140, height: 16, borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(242,194,96,0.45), transparent 70%)",
          filter: "blur(5px)",
        }} />
        <char.Component size={190} floating />
      </div>
      <div style={{
        marginTop: -2,
        fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 14,
        color: "#fce9a8", letterSpacing: "0.04em",
        textShadow: "0 2px 6px rgba(0,0,0,0.6)",
      }}>{char.name}</div>
    </div>
  );
}
```

## 2. GameEnunciado — Texto centrado superior (QUÉ hacer)

```jsx
function GameEnunciado({ text, top = 84 }) {
  if (!text) return null;
  return (
    <div style={{
      position: "absolute", top, left: "50%", transform: "translateX(-50%)", width: 488,
      textAlign: "center",
      fontFamily: "var(--ed-font-display)", fontWeight: 700,
      fontSize: 17, lineHeight: 1.2,
      color: "#fff",
      textShadow: "0 2px 6px rgba(0,0,0,0.6)",
      pointerEvents: "none",
      zIndex: 5,
    }}>
      {text}
    </div>
  );
}
```

**Reglas:**
- Centrado con `left: 50%` + `transform: translateX(-50%)` (NO `left: 244` fijo)
- `top` configurable por prop (default 84)
- Ancho 488

## 3. Enunciado vs Bocadillo — separación QUÉ / CÓMO (regla pedagógica)

**INAMOVIBLE.** Confirmado explícitamente por la autora.

- **Enunciado** (texto blanco centrado arriba): describe **QUÉ hacer** — la tarea, el objetivo del ejercicio. Termina **con punto**.
- **Bocadillo** del personaje (nube de pensamiento): describe **CÓMO hacerlo** — la mecánica concreta, qué tocar/arrastrar.

**Anti-patrones:**
- **NO** poner solo el título de la escena como enunciado ("'Comunicado importante'." — mal). El título va dentro del cartel del ejercicio. El enunciado describe la acción ("Completa el texto con G o J." — bien).
- **NO** repetir lo mismo en ambos. Si dicen lo mismo, uno está mal.
- **NO** mencionar la palabra "minúsculas" en enunciados (ver punto 4).

**Ejemplos correctos (juego-7):**
- R0 Pronombre — enunciado: "Reemplaza cada nombre por el pronombre correcto." / bocadillo: "Toca el pronombre que reemplaza cada nombre."
- R1 Verboides — enunciado: 'Forma los 3 verboides del verbo "X".' / bocadillo: "Arrastra la terminación al cajón correcto."
- R2 G/J — enunciado: "Completa el texto con G o J." / bocadillo: "Toca g o j en cada palabra para elegir."

## 4. Minúsculas en juegos de completar palabra

**INAMOVIBLE.** Confirmado explícitamente.

En cualquier juego cuya mecánica sea "completar palabra" (rellenar huecos con letras, sílabas o segmentos), las palabras y opciones del bandejón deben renderizarse en **minúsculas**, nunca en mayúsculas.

**Aplicación:**
- Cambia la **data** (no solo CSS): `word: "CASA"` → `word: "casa"`, `segments: [{ h: "CA" }, { v: "SA" }]` → `[{ h: "ca" }, { v: "sa" }]`, `tray: ["CA", "CE"]` → `["ca", "ce"]`.
- Las **categorías o etiquetas** del HUD que NO son palabras a completar (ej. chips "PERSUADIR", "INFORMAR") pueden seguir en mayúsculas porque son rótulos.
- **NO mencionar "minúsculas" en los enunciados ni bocadillos** — el cambio es visual, no se explica al niño.

## 5. ResultsScreen — Pantalla de resultados (tamaños fijos)

**Tomar juego-1 (`completa-palabras`) como modelo canónico.** Cualquier juego nuevo debe coincidir exactamente con:

| Elemento | Valor |
|---|---|
| Personaje `<char.Component size>` | **180** (sin `floating`) |
| Título "¡Ronda completa!" `fontSize` | **36**, `fontWeight: 700`, `fontFamily: "var(--ed-font-display)"` |
| Frase de cierre `fontSize` | **13**, `maxWidth: 240`, `fontStyle: "italic"` |
| Grid principal `gridTemplateColumns` | **`"0.85fr 1.4fr"`** |
| Logo `EdinunLogoMini size` | **56** |
| Botones IMPRIMIR/JUGAR `height` | **44**, `fontSize: 13`, `fontWeight: 800` |

Si tu juego de completar palabra debe mostrar la palabra "completada" en la tabla, los encabezados son `# / Palabra / Respuesta del estudiante / Palabra correcta / Estado / Tiempo`. Para juegos con mecánicas diferentes (ej. juego-9 sílabas trabadas) puedes adaptar los nombres de columna **dentro de la misma estructura de tabla** — no rediseñar la pantalla.

## 6. Selectores binarios inline (estilo segmented control)

Cuando una palabra tiene un hueco que toma una de 2 opciones cortas (ej. g/j, c/s/z), usar **segmented control** en vez de chips inline sueltos:

```jsx
// Pill blanca con sombra, dos mitades separadas por divisor vertical
<span style={{
  display: "inline-flex", alignItems: "center",
  margin: "0 3px",
  background: "rgba(255,255,255,0.85)",
  border: `1.5px solid ${pillBorder}`,
  borderRadius: 8, overflow: "hidden",
  verticalAlign: "middle", lineHeight: 1,
  boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
}}>
  {renderHalf("g", "#2ecc8f")}  {/* verde si seleccionada */}
  <span style={{ width: 1, height: 16, background: "rgba(116,72,32,0.25)" }} />
  {renderHalf("j", "#ff8a3a")}  {/* naranja si seleccionada */}
</span>
```

- Mitad seleccionada: fondo de color sólido, texto blanco
- Mitad no seleccionada: transparente, texto `rgba(116,72,32,0.55)`
- Margin horizontal de 3px → claramente despegado del texto, ya no se confunde con letras de la palabra

## 7. Wrap de palabras compuestas (texto + selector + sufijo)

Si una palabra se construye como `prefijo_texto + selector_inline_block + sufijo_texto` (ej. "psicolo" + [g/j] + "ía" = "psicología"), el navegador rompe línea entre el texto y el inline-block si no se previene. **Solución obligatoria:** pre-procesar los tokens del párrafo para agrupar el último trozo del texto previo + selector + sufijo en un span con `whiteSpace: "nowrap"`. Ver implementación en `juegos/juego-7/game-screens.jsx` función `DetectiveGCard` (referencia).

## 8. Cartel del ejercicio — width fit-content

Para carteles que muestran texto variable (escenas/comunicados/párrafos), usar **`width: "fit-content"` con `maxWidth: <N>`** en vez de `width: "100%"`. Así las escenas cortas no quedan con aire vacío a los lados y las largas siguen tope-maxWidth con wrap.

```jsx
width: "fit-content", maxWidth: 470,
```

## 9. Estructura de rondas

- **3 rondas por sesión** — siempre, nunca menos ni más.
- Desde **7 años** cada ronda con mecánica diferente.
- Hasta **6 años** una misma mecánica puede repetirse entre rondas.

## 10. Botones VERIFICAR / BORRAR / REINICIAR / SALIR

- **Manuales**, no autoverificación. El niño confirma con VERIFICAR.
- Centrados verticalmente en la columna derecha: `top: "50%"`, `transform: "translateY(-50%)"`.
- `height: 56`, `width: 150`, `fontSize: 15`, `fontWeight: 800`, `letterSpacing: "0.04em"`.
- BORRAR aparece solo en mecánicas donde tenga sentido.

## 11. Feedback al verificar — opción correcta visible cuando se falla

En mecánicas tipo "elige una opción" (Pronombre, Categoría, etc.), al `verify()` con respuesta incorrecta:
- La opción equivocada del niño: fondo rojo `linear-gradient(180deg, rgba(255,107,107,0.95), rgba(220,80,80,0.95))`, borde `2px solid #ff6b6b`, texto blanco.
- La opción correcta (que el niño NO eligió): fondo verde `linear-gradient(180deg, rgba(46,204,143,0.95), rgba(34,160,108,0.95))`, borde `2px solid #2ecc8f`, texto blanco, **+ badge ✓** en esquina superior derecha (círculo verde con check blanco).

Implementación de referencia: `PronombreCard` en `juegos/juego-7/game-screens.jsx`.

## 12. Anti-repetición FIFO — tamaño según banco

Para evitar que el niño vea la misma escena dos veces seguidas tras recargar:
- `RECENT_LIMIT` por categoría, no global. Implementar como mapa `RECENT_LIMITS = { categoryA: N, ... }`.
- Regla práctica: si el banco tiene N escenas, FIFO ≈ `Math.floor(N/2)`. Ej. 16 escenas → FIFO=8; 8 escenas → FIFO=4.
- Esto deja un pool fresco igual al FIFO tras warmup.

## 13. Avance al fallar (mecánicas tipo SpeedQuiz)

En rondas con varias tarjetas en tiempo limitado (SpeedQuiz, drag-and-drop rápido), al **fallar**:
- Mostrar shake del chip equivocado ~350-450ms.
- Registrar la tarjeta como vista en la FIFO.
- Avanzar a la siguiente tarjeta **automáticamente** (NO dejar al niño atascado en la misma).

## 14. Vocabulario ecuatoriano

- Evitar regionalismos de México/España/Colombia.
- Vetadas: "portazo", "carrazo", "manaza" (entre otras).
- Cuando dudes del registro, preguntar a la autora.

---

## Si necesitas desviarte de cualquiera de estos estándares

**No improvises.** Pregúntale a la autora explícitamente antes de tocar nada. Cita el punto exacto de este documento, explica qué te gustaría cambiar y por qué, y espera autorización.
