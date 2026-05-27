# MEMORY · juego-6 (Versos, recetas y palabras)

Bitácora del juego 6 del repo `edinun-language`.

## Resumen
- **Audiencia**: 8 años.
- **Slug**: `juego-6`.
- **Personaje destacado en landing**: Gaby la Poeta (`poeta`).
- **Niveles**: 2 (Texto poético + Texto instructivo).
- **Mecánicas**: 6 distintas. 3 del backlog (#1 ruleta, #2 detective literario, #4 laboratorio).

## Estructura
- `index.html` y `EDINUN GAMES.html` (idénticos) generados con `.planning/bundle.js`.
- `screens.jsx` — HomeScreen con 2 niveles, CharacterScreen genérico, CosmosBg con glifos del tema.
- `game-screens.jsx` — GameScreen router → `TextoPoeticoGame` o `TextoInstructivoGame`. Shell común (HUD, modales, ActionRail, FeedbackOverlay, CharacterCorner) + 6 cards de mecánica + ResultsScreen.
- `.planning/juego-6-design.md` — diseño completo aprobado.
- `.planning/qa-checks.js` — QA Playwright para Nivel 1 en 6 viewports.
- `.planning/qa-nivel2.js` — QA del Nivel 2 (Texto instructivo).
- `.planning/qa-landing.js` — verifica que el landing del repo lista juego-6.

## Decisiones de diseño
- Los 2 temas vienen del libro EDINUN del Tema 1 (poético) y Tema 1 (instructivo) de unidades distintas.
- Las 3 rondas de cada nivel son mecánicamente distintas (requisito 7+ años).
- Personajes pueden repetirse entre juegos del repo (Gaby también se reservó para juego-5 según `project_juego5-csz`, pero los personajes no son exclusivos).

## QA
- Pasó en 5/6 viewports (1920×1080, 1280×800, 1024×768, 768×1024, 667×375). El sexto (375×667 mobile portrait) muestra el RotateLockOverlay del shell, comportamiento esperado.
- Sin errores de consola.
- Capturas en `.planning/qa-screenshots/`.

## Pendiente / futuro
- Si se ven lentos los tap-tap, considerar drag-and-drop en R3 N1 (memoria) y R1 N2 (kichwa) y R2 N2 (ordena).
- R3 N2 (laboratorio) solo cubre plurales regulares en `-s` / `-es`. Excepciones (z→c) podrían añadirse después.
