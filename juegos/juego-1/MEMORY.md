# MEMORY — Completa la palabra

Bitácora del juego `juegos/completa-palabras/`.

## Origen
- Primer juego del repo `edinun-language` (rebrand del shell EDINUN GAMES
  para temas de lenguaje).
- Reemplazó al `JUEGO-1-completa-vocales` original (commit `72225ac`)
  conservando la mecánica de ocultar SOLO vocales pero con shell nuevo.

## Personajes
4 personajes adaptados al tema de lenguaje (ya rebrandeados a nivel del
landing antes de crear este juego):
- escritor → **Rolli** (La Escritora)
- explorador → **Verne** (El Explorador)
- poeta → **Gaby** (La Poeta)
- narrador → **Márquez** (El Cuentacuentos)

Default en `app.jsx`: `character: "escritor"`. El landing destaca a Rolli.

## Niveles
**Dos niveles** seleccionables vía chips en Home (estilo libro escolar):

| id      | chip          | banco                            | bandeja        |
|---------|---------------|----------------------------------|----------------|
| vocales | "a e i o u"   | WORD_BANK_VOCALES (39 palabras)  | a, e, i, o, u  |
| letraV  | "V"           | WORD_BANK_LETRA_V (17 palabras)  | v, b, f, n, u  |

Los chips, bancos, bandejas, instrucción y bocadillo están centralizados
en `CATEGORIES` (`game-screens.jsx`) y `LEVELS_CFG` (`screens.jsx`). Para
agregar un nivel nuevo (ej. "Letra R"): nueva entrada en ambos objetos +
nueva clave de localStorage para el buffer de palabras recientes.

## Mecánica
- Emoji grande arriba (pista visual) + palabra con letras visibles
  y casillas vacías para las letras que `cfg.isSlot` marca como ocultas
  (todas las vocales en `vocales`; todas las V's en `letraV`).
- Bandeja inferior FIJA por nivel: 5 fichas reutilizables.
- Tap en ficha → llena primera casilla vacía. Tap en casilla llena →
  borra. Botón BORRAR → borra la última. VERIFICAR → evalúa.
- 3 ejercicios, palabras sin repetir en la sesión + buffer FIFO de 10
  palabras recientes por nivel en localStorage. Estrellas decrecientes
  con tiempo (fórmula del shell, intacta).

## Decisiones
- **Sin tildes** ocultas. La Ñ y los acentos quedan visibles si la
  palabra los tiene; nunca son slot a completar. En `letraV` la tilde
  de `volcán`/`avión` queda visible como cualquier otra letra.
- **Distractores letraV (v,b,f,n,u)** intencionalmente solapan con
  letras visibles en algunas palabras (ej. n en `ventana`, u en `uva`).
  Refuerza atención sobre la posición del slot, no sobre "qué letra
  no aparece visible".
- **Banco de letraV centrado en el libro**: 12 de 17 vienen del
  ejercicio 3 + tabla de sílabas + frases del libro. 5 extras
  (huevo, ave, nave, pavo) son palabras frecuentes para 6 años con
  V interior, para tener variedad sin alejarse del tema.
- **Bundle.js (Node), no bundle.py**: Python no está disponible en el
  entorno; el repo ya usa Node + Playwright.
- **Personaje pequeño en GameScreen**: tamaño 190 para dejar respiración
  al wrapper que sube hasta y=280 por el bocadillo de pista.
- **localStorage namespaced por nivel**: `edinun_completa_palabras_<nivel>_recientes_v1`.
  El buffer antiguo `edinun_completa_palabras_recientes_v1` queda
  huérfano (no se migra). Sin impacto pedagógico relevante.

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
