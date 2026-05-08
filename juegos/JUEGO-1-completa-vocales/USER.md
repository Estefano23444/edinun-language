# USER.md — Preferencias del usuario

Cómo Estefano (EDINUN) prefiere trabajar. Aplica a este proyecto y a juegos posteriores en la misma línea. Léelo antes de hacer cambios para no romper expectativas implícitas.

> **Mantener este archivo bajo 300 líneas.** Si crece, dividir en sub-docs en `.planning/`.

---

## Principios fundamentales

### 1. La usabilidad es la prioridad — y "usabilidad" empieza por responsive

Cualquier juego debe verse y funcionar bien en **móvil, tablet y desktop**. No es aceptable entregar una pantalla que solo se ve bien en una resolución y romper en otras. Si hay que elegir entre añadir una feature nueva o asegurar que las existentes son responsive, **se asegura responsive primero**.

### 2. Audiencia: 2do de primaria (6–8 años)

Todo el copy de UI:
- **Corto y accionable.** Frases de una línea. Verbos directos.
- **Sin jerga técnica.** Nada de "morfema", "lexema", "fonema", "sintagma", "categoría gramatical" en pantallas de juego.
- **Sin negaciones complejas.** "Suma y resta números" sí, "no se permite usar decimales" no.

Ejemplos buenos: "Suma y resta números." · "Multiplica usando las tablas." · "¿Salir del juego?"
Ejemplos a evitar: "Practica operaciones de suma y resta dentro del rango 0-99 con acarreo opcional."

### 3. Acciones destructivas siempre con modal

Salir del juego, rendirse, cambiar de nivel a mitad de partida, reiniciar progreso — **siempre** abrir un modal de confirmación antes de ejecutar, aunque parezca obvio. Aplica incluso si el usuario dijo "directo" o "sin modal".

**Por qué:** un niño de 6–8 años toca elementos por curiosidad; perder progreso por un tap accidental es frustrante. La fricción del modal es deseable.

---

## Metodología de QA responsive (la que usamos en esta sesión)

Cómo se testea responsive en este proyecto. Aplicar el mismo flujo a futuros juegos.

### Setup

1. **Servidor estático local:** `python -m http.server 8765` en la raíz del repo.
2. **Chrome headless** para capturas batch (instalado en Windows en `C:\Program Files\Google\Chrome\Application\chrome.exe`).
3. Carpeta de capturas en `/tmp/<proyecto>-shots/`.

### Comando de captura

```bash
"/c/Program Files/Google/Chrome/Application/chrome.exe" \
  --headless=new --disable-gpu --hide-scrollbars \
  --window-size=W,H --virtual-time-budget=4000 \
  --screenshot="/tmp/edinun-shots/<nombre>.png" \
  "http://127.0.0.1:8765/index.html"
```

### Viewports a cubrir (mínimo)

| Categoría        | Tamaño     | Notas                                              |
|------------------|------------|----------------------------------------------------|
| Desktop FullHD   | 1920×1080  | Escritorio actual                                  |
| Desktop laptop   | 1280×800   | Portátil estándar                                  |
| Tablet landscape | 1024×768   | iPad clásico                                       |
| Tablet portrait  | 768×1024   | iPad clásico vertical (lienzo letterboxed)         |
| Mobile landscape | 667×375    | iPhone SE horizontal — la "vista correcta"         |
| Mobile portrait  | 375×667    | iPhone SE vertical — debe mostrar "Gira tu disp."  |

Cada pantalla del flujo (Home, Personaje, Juego, Resultados) en al menos los viewports relevantes.

### Iteración

1. Capturar.
2. Revisar todas las imágenes — ¿el lienzo está centrado? ¿el contenido cabe sin clipping? ¿el hint de rotar aparece donde debe?
3. Si hay problema, **arreglar en el código** (no parchar el screenshot ni dejar pasar). Re-empaquetar (`python .planning/bundle.py`) y re-capturar.
4. Repetir hasta que todos los viewports se vean correctos.

### Caveat conocido: Chrome headless en Windows

El flag `--window-size` en Windows tiene un mínimo (~482px ancho) y `window.innerHeight` reporta unos 96px menos por chrome simulado. Esto significa que para captura, el screenshot SÍ tiene el tamaño solicitado, pero `window.innerWidth/Height` que ve el JS puede no coincidir.

**Implicación para responsive logic basada en `innerWidth`:** los viewports muy pequeños (<482px) no pueden testearse fielmente con Chrome headless en Windows. Para esos casos hay que probar en un teléfono real o usar Playwright con `Emulation.setDeviceMetricsOverride`. En la práctica, la mayoría de teléfonos modernos en navegador con la barra URL visible reportan ~390×664 (innerW × innerH), lo cual sí entra en rango testeable.

---

## Decisiones de diseño que se mantienen

Estas son invariantes — cambiarlas requiere conversación explícita, no un commit silencioso.

### Lienzo lógico fijo + escala uniforme

- Lienzo de **900×540 (paisaje)** es el sistema de coordenadas de toda la UI.
- `DeviceStage` lo escala con `transform: scale()` al viewport, manteniendo aspect ratio (estrategia *contain*).
- **El centro visual del lienzo siempre coincide con el centro del viewport.** Implementación con `position: absolute; left:50%; top:50%; transform: translate(-50%,-50%) scale(...)`. NO usar `display:grid; placeItems:center` — bug confirmado: cuando el lienzo es más grande que el viewport (mobile portrait), las grid tracks auto-dimensionan al contenido y el lienzo queda alineado a la esquina superior izquierda en vez de centrado.

### Móvil portrait: contenido NO rota

- El usuario gira **físicamente el teléfono**. La app no rota su contenido según `orientationchange`.
- En portrait, el lienzo paisaje queda letterboxed (pequeño). Se muestra una píldora discreta `↻ Gira tu dispositivo` no bloqueante (descartable con tap).
- **Por qué:** los niños sostienen el teléfono en vertical por reflejo. El hint los educa a girar. Forzar landscape lock no funciona bien en navegador y bloquea el flujo.

### Sin marco de teléfono ni notch decorativo

- En desktop/tablet, el fondo cósmico se extiende edge-to-edge. No hay simulación de chasis de teléfono.
- Decisión tomada para evitar que la app "parezca un demo" en pantallas grandes.

### Fondo cósmico fijo al viewport completo

- `CosmosBg` se renderiza en `DeviceStage` (fuera del lienzo), llenando el viewport.
- Las pantallas dentro del lienzo son transparentes — no renderizan su propio fondo.
- Así, en cualquier aspect ratio, las "barras" del letterbox no se ven negras: el cosmos se extiende.

### Personajes estilo Mario Kart

- Cada personaje = profesión + vibe, sin atributos académicos.
- Catálogo: Lupe (escritora), Río (poeta), Sami (exploradora), Teo (cuentacuentos).
- **No mencionar temas específicos** ("el de sinónimos", "la de la ortografía") en las descripciones de los personajes. Son personajes Mario-Kart asociados a profesiones literarias, no avatares de un tema.
- Renderizan PNG (`assets/char-<id>.png`) con sparkles SVG superpuestos.

---

## Cómo aplicar a juegos posteriores

Cuando arranque un nuevo juego de lenguaje (u otro contenido educativo) bajo la misma línea:

1. **Clonar la estructura de archivos** de este repo (HTML estático + bundle inline + `bundle.py`). No introducir build step a menos que sea estrictamente necesario.
2. **Mantener el lienzo 900×540** o documentar explícitamente por qué se cambia.
3. **Aplicar la metodología de QA responsive** desde el primer commit jugable, no al final.
4. **Copiar este USER.md** al nuevo repo y ajustarlo si las preferencias evolucionan.
5. **Reusar la paleta y tipografía** de `styles.css` (variables `--ed-*`) para coherencia visual entre juegos.

---

## Archivos relacionados

- `CLAUDE.md` — guía técnica para Claude Code (arquitectura, comandos, invariantes de código).
- `MEMORY.md` — bitácora del proyecto (qué se ha hecho, decisiones tomadas).
- `.planning/` — notas técnicas por tema (cada archivo <200 líneas).
- `.planning/bundle.py` — script de re-empaquetado de los `.jsx` al HTML.
