# JUEGO-9 — "Chistes para los tristes" · diseño

## Tema

TEMA 1 del libro EDINUN de lenguaje para 6 años. El tema central del libro
combina la motivación narrativa de los chistes con el contenido fonético de
los grupos consonánticos `pr · pl · bl · br · fl · fr` (sílabas trabadas).

Audiencia: 6 años. Lectura inicial — la palabra es la unidad mínima a leer.

## Niveles

**1 nivel único**. En Home no se muestran chips de selección de dificultad;
solo input de nombre + ENTRAR. En el HUD del juego no se muestran tabs de
nivel.

Justificación: para 6 años, los chips de nivel agregan fricción cognitiva
sin valor pedagógico (no hay sub-temas dentro del libro). La variedad viene
del contenido, no de la dificultad.

## Mecánica

**"Completar la palabra con la sílaba trabada inicial"** — misma mecánica
en las 3 rondas, con foco distinto por ronda.

### Flujo por ejercicio

1. Cartel con emoji grande del objeto (ej: 🌻 para "flor").
2. Palabra debajo con UN slot ancho al inicio + letras restantes visibles:
   `[ __ ] O R` o `[ __ ] A T O`. El slot tiene el doble de ancho que las
   casillas regulares para acomodar las 2 letras de la sílaba trabada.
3. Bandeja inferior con **3 opciones** (1 correcta + 2 distractoras). Reglas:
   - Ninguna distractora puede formar una palabra real con el resto visible
     (evita ambigüedad: flato, plan, presa, brecha, bruma, plazo, bruta…).
   - La pareja del par mínimo (PR↔PL, etc.) entra solo *a veces*; el resto de
     las veces se usan clusters de fuera del par, para no exigir siempre la
     discriminación fina a un niño de 6 años.
4. **1 tap** a una sílaba → se inserta en el slot.
5. Tap al slot lleno → se borra (puede cambiar de opinión).
6. **VERIFICAR** → si correcto: feedback verde + estrellas (fórmula
   decreciente con tiempo del shell). Si incorrecto: feedback rojo + frase
   motivadora, NO consume intento si falta llenar el slot.
7. Tras 3 ejercicios → ResultsScreen.

### Variación por ronda

| Ronda | Grupos en foco | Banco posible |
|---|---|---|
| R1 | **PR / PL** | primo, premio, prima, plato, pluma, playa |
| R2 | **BL / BR** | blusa, bloque, brazo, brocha, bruja |
| R3 | **FL / FR** | flor, flecha, flan, flauta, fresa, fruta, frasco |

El motor saca 1 palabra random del banco del par objetivo de la ronda. Se
evitan repeticiones intra-sesión (en memoria) y entre sesiones (clave
`edinun_juego9_recientes_v1` en localStorage, FIFO de 8 palabras).

### Botones del rail derecho

- **¡VERIFICAR!** (verde) — valida la elección.
- **BORRAR** (rojo) — limpia el slot.
- **REINICIAR** (amarillo) — modal de confirmación, vuelve a ronda 1.
- **SALIR** (gris/azul) — modal de confirmación, vuelve a Home.

Sin auto-verificación (ver [[feedback-botones-manuales-verificar]]).

## Glifos del fondo

**Cosmic (15)** — pantallas Home/Character/Results:
PR, PL, BL, BR, FL, FR, ja, je, ji, jo, ju, ?, !, ✨, ★

**Chalkboard (10)** — pantalla Game:
PR, PL, BL, BR, FL, FR, ja, ?, ✨, je

Los glifos respiran el tema en su totalidad: sílabas trabadas + onomatopeyas
de risa (ja/je/ji/jo/ju) + símbolos exclamativos del registro de los chistes.

## Copy específico

### HomeScreen
- Label hero: "Chistes para los tristes"
- Título: "¡Bienvenido/a, Estudiante!"
- Descripción del tema:
  > Vamos a completar las palabras de los chistes con los sonidos
  > **pr · pl · bl · br · fl · fr**
- Sin chips de nivel (juego de 1 solo nivel).
- Input + botón ENTRAR.

### CharacterScreen
- Default seleccionado: **Márquez El Cuentacuentos** (`narrador`).
- Encaja temáticamente con "contar chistes".
- Sin cambios al layout del shell.

### GameScreen
- catLabel HUD: "Chistes para los tristes"
- Enunciado principal: "Completa la palabra"
- Bocadillo del personaje: "¿Cuál sonido falta? Tócalo."
- Feedback OK: "¡EXCELENTE!" + "+N ⭐"
- Feedback ERR: "¡UPS!" + frase motivadora aleatoria + nombre personaje.

### ResultsScreen
- Columnas del reporte: # | Palabra | Sonido elegido | Sonido correcto | Estado | Tiempo.
- Categoría mostrada: "Chistes para los tristes".

## Slug y personaje destacado

- Slug: `juego-9` (siguiendo numeración del repo).
- Personaje destacado en landing raíz: `narrador` (Márquez).

## Decisiones abiertas / riesgos

- **Emojis Unicode**: 🪶 (pluma), 🫙 (frasco), 🪈 (flauta) son emojis modernos
  que en algunos sistemas antiguos pueden no renderizar. Decisión de la autora
  (2026-06-19): se usan igual por fidelidad al objeto; si surgen quejas se
  sustituyen por símbolos más universales en `WORD_BANK`.
- **"prado"** se retiró del banco (emoji poco evocador + baja frecuencia léxica
  en Ecuador). **"broma"** se reemplazó por **"bruja" 🧙** (objeto concreto,
  sin tilde, coherente con el tema de cuentos).
- **"Playa"**: tiene "ya" interior. Si pedagógicamente se prefiere evitar
  palabras con otra consonante compleja, se puede sacar del banco.
- **Discriminación PR vs PL**: para un niño de 6 años puede ser sutil. Si
  el feedback muestra que es muy difícil, se puede mover el cluster
  distractor del MISMO par a un par lejano (ej: PR vs BL en lugar de PR vs PL).
- **Sin animación de risa de Márquez**: decisión explícita de la usuaria.
  El personaje queda con la animación `floating` del shell, sin overlays
  emocionales.

## QA visual

Corrida con Playwright en 6 viewports (1920×1080, 1280×800, 1024×768,
768×1024, 667×375, 375×667). 5/6 pasan sin errores en consola.

El 6º (375×667 mobile portrait) muestra el `RotateLockOverlay` del shell
— comportamiento esperado del marco, igual que en juego-6 y juego-7.

Capturas en `.planning/qa-screenshots/`. Resumen en `.planning/qa-results.json`.
