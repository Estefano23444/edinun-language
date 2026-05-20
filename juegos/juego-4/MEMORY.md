# MEMORY — Juego 4

Bitácora del juego `juegos/juego-4/`.

## Origen
Cuarto juego del repo `edinun-language`. A diferencia del juego-2 (3 niveles)
y completa-palabras (1 nivel), Juego 4 tiene **4 niveles temáticos** del libro
EDINUN, uno por etapa de edad:

- 🟠 **Tipos de texto** (7 años) — literario / informativo / funcional
- 🟡 **Lenguaje poético** (10 años) — función poética del lenguaje
- 🔵 **Escritura académica** (12 años) — informes, conectores, revisión
- 🟣 **Enriquece tu lengua** (14 años) — polisemia, homófonas, condicional

## Audiencias por nivel (NO expuestas en UI)
- Nivel 1: 7 años (2do/3ro de primaria)
- Nivel 2: 10 años (5to de primaria)
- Nivel 3: 12 años (7mo de básica)
- Nivel 4: 14 años (9no de básica)

## Diferencias respecto a juego-2
- HomeScreen con **4 botones de nivel en grid 2×2** (no 3 en fila).
- HUD del juego con **4 chips de tema** (vs 3 en juego-2).
- Cada nivel renderiza un sub-componente con **3 rondas de mecánicas distintas**:
  - `TiposDeTextoGame`: trivia 3 botones / organizador gráfico drag / mapa burbujas tap
  - `PoeticaGame`: trivia función / emparejar refranes tap-tap / encerrar figuras literarias
  - `EscrituraGame`: ordenar 6 partes informe / conector correcto trivia / cazar errores tap
  - `EnriquecimientoGame`: descubre palabra polisémica / elegir letra homófona / completar condicional drag
- 4 sets de glifos chalkboard dinámicos por nivel vía `window.__currentChalkGlyphs`.
- Personaje destacado en el landing del repo: **Verne (El Explorador)**.
  El estudiante igual elige libre en `CharacterScreen`.

## Mecánicas por ronda

### T1 — Tipos de texto
- **R1 trivia**: aparece un texto del banco (12 textos) → 3 botones LITERARIO/INFORMATIVO/FUNCIONAL.
- **R2 organizador**: palabra central (6 palabras) + 4 cuadros (Definición/Oración/Sinónimo/Dibujo) + bandeja con 4 piezas → tap-to-place.
- **R3 burbujas**: mapa estilo libro con 7 burbujas. Consigna cambia por ejercicio (pinta literarios / informativos / funcionales). Tap toggle + VERIFICAR.

### T2 — Lenguaje poético
- **R1 trivia función**: oración del banco (12) → 3 botones POÉTICA / INFORMA / PIDE.
- **R2 refranes**: 3 refranes a la izq + 3 significados mezclados a la derecha → tap-tap líneas + VERIFICAR.
- **R3 figuras literarias**: poema de 4 versos (6 poemas en banco) → tap múltiple sobre versos con figura + VERIFICAR.

### T3 — Escritura académica
- **R1 ordenar partes**: 6 partes del informe (Asunto/Introducción/Metodología/Resultados/Conclusiones/Referencias) desordenadas → tap-to-slot a slots numerados 1-6 + VERIFICAR.
- **R2 conector correcto**: oración con hueco + tipo de relación arriba (oposición/causa/adición/temporal/ejemplificación) → 3 botones de conectores.
- **R3 cazar errores**: párrafo de informe con palabras erróneas marcadas con corchetes en el banco → tap múltiple sobre las palabras con error.

### T4 — Enriquece tu lengua
- **R1 polisemia**: 2 emojis representando significados distintos de la misma palabra → 3 opciones de palabra (8 polisémicas en banco).
- **R2 homófonas**: pista + palabra con casilla "?" → tap 1 de 2 letras (V/B, S/Z, LL/Y). 8 pares en banco.
- **R3 condicional**: párrafo con 3 huecos + bandeja con 5 verbos (3 correctos + 2 distractores) → tap-to-place a huecos + VERIFICAR.

## Anti-repetición persistente
Cuatro claves independientes en localStorage:
- `edinun_juego4_tipos_recientes_v1`
- `edinun_juego4_poetica_recientes_v1`
- `edinun_juego4_escritura_recientes_v1`
- `edinun_juego4_enriquece_recientes_v1`

Cada una guarda hasta 6 ids recientes para evitar repeticiones entre rondas.

## Estructura del catálogo (en game-screens.jsx)
- **T1**: `TIPOS_BANK` (12), `ORG_BANK` (6), `BURBUJAS_DATA` (3 mapas).
- **T2**: `FUNCIONES_BANK` (12), `REFRANES_BANK` (6 pares), `POEMAS_BANK` (6 poemas).
- **T3**: `INFORME_PARTES` (6 fijas), `INFORME_CONTEXTOS` (3), `CONECTORES_BANK` (12), `ERRORES_BANK` (6 párrafos).
- **T4**: `POLISEMIAS_BANK` (8), `HOMOFONAS_BANK` (8 pares), `CONDICIONAL_BANK` (6 párrafos).

## Comandos
```bash
# Re-empaquetar tras editar cualquier .jsx
node .planning/bundle.js

# QA visual (heredado del template — usar con cuidado:
# las zonas data-qa son las mismas pero las mecánicas son distintas,
# así que solo valida cobertura general).
node .planning/qa-checks.js
```

## QA realizado
- ✅ Bundle generado sin errores (`node .planning/bundle.js`).
- ✅ Servido en `localhost:8766` con `npx http-server`.
- ✅ HomeScreen renderiza 4 botones en grid 2×2 con todos los colores correctos.
- ✅ CharacterScreen renderiza los 4 personajes (Rolli, Verne, Gaby, Márquez).
- ✅ T1·R1 (trivia tipos) renderiza correctamente con 4 chips de tema en HUD.
- ✅ T1·R2 (organizador BUZÓN) renderiza con palabra central + 4 cuadros + bandeja con 4 piezas mezcladas.
- ⏸ T2/T3/T4: paralelos en estructura a T1, pendiente QA visual manual del usuario.
- ⏸ QA en 6 viewports: ejecutar `node .planning/qa-checks.js` cuando sea necesario.

## Notas de diseño
Decisiones de mecánica por tema documentadas en `.planning/juego-4-design.md`.
