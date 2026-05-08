# QA visual automatizado

Validación automatizada del juego en 6 viewports canónicos usando Playwright. La skill `edinun-game-builder` ejecuta esto antes de declarar terminado cualquier juego nuevo.

## Qué se valida

1. **Zonas dentro de su área declarada**: cada elemento con `data-qa="<zona>"` debe tener su bounding box dentro de las coordenadas de la zona correspondiente (ver `references/layout-grid.md` de la skill).
2. **No overlaps no permitidos**: ningún par de zonas se superpone, salvo las excepciones declaradas (ej: `zona-central` extendida absorbiendo `bandeja`).
3. **Elementos dentro del lienzo 900×540**: ningún elemento sale del lienzo lógico (con tolerancia de 4 px).
4. **Tamaños mínimos de touch targets**: botones de acción ≥ 44×44, fichas ≥ 56×56.

Más checks se pueden agregar editando `qa-checks.js` o `qa-checks.py` (ver "Extender checks" abajo).

## Atributos `data-qa` esperados en el shell

Estos atributos los pone el template del juego en el shell heredado. **No los toques**, pero si tu mecánica nueva añade elementos en una zona, replica el atributo de la zona padre o agrega los suyos:

| Atributo | Elemento | Coords zona |
|---|---|---|
| `data-qa="hud"` | Barra superior con logo, tabs, cronómetro, estrellas | (0, 0, 900, 56) |
| `data-qa="bocadillo"` | Globo de pista del personaje (zona narrativa) | (12, 68, 228, 132) |
| `data-qa="zona-central"` | Wrapper de la mecánica (palabra+opciones, rejilla de slots, contenedores, oración a completar, etc.) | (260, 68, 460, 352) |
| `data-qa="acciones"` | Columna de botones VERIFICAR/BORRAR/SALIR | (740, 68, 148, 352) |
| `data-qa="personaje"` | Personaje pequeño en esquina inferior izquierda | (0, 440, 100, 100) |
| `data-qa="bandeja"` | Bandeja de fichas/dígitos inferior (opcional) | (120, 440, 768, 100) |

Si tu mecánica no usa bandeja, simplemente no incluyas el `data-qa="bandeja"` y el QA lo trata como zona ausente (no error).

## Cómo correrlo

### Opción 1 — Node.js (recomendado, más liviano)

Pre-requisito una sola vez:

```bash
# Desde la raíz del repo (o cualquier carpeta con package.json)
npm install --save-dev @playwright/test playwright
npx playwright install chromium
```

Correr:

```bash
cd juegos/<slug>
node .planning/qa-checks.js
```

### Opción 2 — Python

Pre-requisito una sola vez:

```bash
pip install playwright
playwright install chromium
```

Correr:

```bash
cd juegos/<slug>
python .planning/qa-checks.py
```

## Output

El script genera:

- `.planning/qa-screenshots/<viewport>-1-home.png` (Home)
- `.planning/qa-screenshots/<viewport>-2-character.png` (Selección de personaje)
- `.planning/qa-screenshots/<viewport>-3-game.png` (Pantalla de juego)
- `.planning/qa-results.json` (resumen con todos los issues)
- Exit code: `0` si pasa todo, `1` si hay errores, `2` si crash

Una corrida toma 10–30 segundos según hardware (las 6 capturas + validaciones).

## Cómo lo usa la skill

`edinun-game-builder` lo ejecuta automáticamente antes de declarar terminado un juego nuevo (paso 7.5 de su flujo). Si hay issues, la skill:

1. Inspecciona los screenshots problemáticos.
2. Razona sobre la causa.
3. Edita los `.jsx` para corregir.
4. Re-empaqueta el HTML.
5. Vuelve a correr el QA.

Máximo 3 iteraciones automáticas. Si al cuarto intento sigue fallando, escala al usuario con el detalle de los issues.

## Extender los checks (avanzado)

Cuando una mecánica nueva introduce elementos visuales propios (ej: rejilla cartesiana con celdas individuales, pizza con porciones tappables, balanza con platillos), conviene añadir checks específicos. Editar `qa-checks.js`:

```js
// Después de checkButtonSizes(page) en runForViewport, añadir:
const customIssues = await page.evaluate(() => {
  const issues = [];
  // Ejemplo: la rejilla debe tener exactamente 25 celdas (5×5)
  const cells = document.querySelectorAll('[data-qa="rejilla-celda"]');
  if (cells.length !== 25) {
    issues.push({ severity: "error", msg: `Rejilla tiene ${cells.length} celdas (esperado 25)` });
  }
  // Ejemplo: el avatar arrastrable empieza en (0,0) lógico
  const avatar = document.querySelector('[data-qa="avatar-jugador"]');
  if (avatar) {
    const r = avatar.getBoundingClientRect();
    // ... validación específica
  }
  return issues;
});
allIssues.push(...customIssues);
```

Documentar los checks custom en el `<slug>-design.md` del juego para que un futuro mantenedor entienda qué se está validando.

## Limitaciones conocidas

- El script asume que el flujo Home → Personaje → Game funciona con los mismos selectores que el shell base ("ENTRAR", "VAMOS"). Si tu juego cambia esos textos, ajustar los selectores.
- No valida contraste de colores (visual). El sistema de diseño del shell ya garantiza contraste suficiente; si tu mecánica añade colores nuevos inline, validar manualmente.
- No prueba interacciones con drag-and-drop. Si una mecánica depende exclusivamente de drag para avanzar (ej: avatar que solo se puede arrastrar, no clickear), el QA actual no validará el flujo más allá del primer ejercicio. Considerar agregar fallback de tap.
- En viewports muy pequeños (mobile-portrait 375×667) aparece el `RotateLockOverlay` bloqueante, que es esperado. El QA captura igualmente y los selectores del flujo no se encuentran (reportará warns, no errors críticos).
