# MEMORY — Completa la palabra

Bitácora del juego `juegos/completa-palabras/`.

## Origen
- Primer juego del repo `edinun-language` (rebrand del shell EDINUN GAMES
  para temas de lenguaje).
- Repo previo había arrancado con `JUEGO-1-completa-vocales`, que fue
  eliminado (commit `72225ac`). Este juego lo reemplaza con una mecánica
  más rica: completar la palabra completa, no solo las vocales.

## Personajes
4 personajes adaptados al tema de lenguaje (ya rebrandeados a nivel del
landing antes de crear este juego):
- escritor → **Rolli** (La Escritora)
- explorador → **Verne** (El Explorador)
- poeta → **Gaby** (La Poeta)
- narrador → **Márquez** (El Cuentacuentos)

Default en `app.jsx`: `character: "escritor"`. El landing destaca a Rolli.

## Mecánica
- Emoji grande arriba (pista visual) + palabra con letras visibles y
  casillas vacías para las ocultas.
- Bandeja inferior: 5-7 fichas de letras (correctas + distractores).
- Tap en ficha → llena primera casilla vacía. Tap en casilla llena →
  borra. Botón BORRAR → borra la última. VERIFICAR → evalúa.
- 3 ejercicios, palabras sin repetir en la sesión. Estrellas decrecientes
  con tiempo (fórmula del shell, intacta).

## Decisiones
- **Un solo nivel** (sin chips ni tabs). El usuario lo pidió así.
- **Sin tildes** ocultas. La Ñ y los acentos quedan visibles si la
  palabra los tiene; nunca son slot a completar.
- **Bundle.js (Node), no bundle.py**: Python no está disponible en el
  entorno; el repo ya usa Node + Playwright.
- **Personaje pequeño en GameScreen**: tamaño 170 (vs 200 del shell
  matemático) para dejar más respiración al wrapper que sube hasta y=280
  por el bocadillo de pista.

## QA
- 6 viewports canónicos (1920×1080, 1280×800, 1024×768, 768×1024, 667×375,
  375×667). Mobile portrait valida que aparece el overlay bloqueante.
- Script: `node .planning/qa-checks.js` (corre `localhost:8765` con
  servidor estático integrado y Playwright/Chromium).

## Comandos
```bash
# Re-empaquetar tras editar cualquier .jsx
node .planning/bundle.js

# QA visual completo
node .planning/qa-checks.js

# Servir manualmente para probar en navegador
npx http-server -p 8765 .   # o cualquier servidor estático
```
