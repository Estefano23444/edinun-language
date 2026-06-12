# Historias y misterios (juego-16) — diseño

## Tema
Juego de 3 niveles por tema/edad (Home con selector de 3 botones, router por `app.level`).
Cubre tres temas del libro EDINUN, con contenido 100% ORIGINAL (no se copian
Beethoven / Batalla de Pichincha / Espejo / Poe del libro).

## Niveles
| Botón | id | Tema del libro | Edad | Personaje |
|-------|----|----------------|------|-----------|
| Relatos históricos | `relatos` | TEMA 4 "Sabiduría escrita" — el relato histórico | 10 años | Gaby (poeta) |
| Herramientas del escritor | `herramientas` | TEMA 5 — interjecciones, conectores, subjuntivo | 10 años | Gaby (poeta) |
| Detectives de la palabra | `detectives` | TEMA 1 "Entre pistas y palabras" — narrativa policial | 13 años | Rolli (escritor) |

Colores de botones (referencia de la autora): naranja / amarillo / azul.
Los botones NO muestran la edad (decisión de la autora). Personaje destacado del
landing: Gaby (poeta) — el menos usado del repo.

## Mecánicas (9 distintas, ninguna se repite)
### Nivel RELATOS (10 años)
- R1 **Verdadero o falso** — tap V/F sobre afirmaciones del relato histórico (definición).
- R2 **Laboratorio del relato** — arrastrar piezas a 3 ranuras ¿Quién?/¿Qué hizo?/¿Cuándo?;
  hay 2 piezas fantasiosas trampa que NO deben usarse (refuerza prosa + hechos reales).
- R3 **Une causa y efecto** — conectar pares (tap causa → tap efecto, líneas SVG). Cronológico/causal.

### Nivel HERRAMIENTAS (10 años)
- R1 **Atrapa la interjección** — shooter: tocar las interjecciones flotantes (¡Uf!, ¡Achachay!…),
  evitar las palabras normales. Sin VERIFICAR (auto-resuelve: 3 atrapadas = ganó; tocar normal = falla).
- R2 **Ruleta de conectores** — girar la ruleta → oración con hueco → elegir el conector correcto.
- R3 **El deseo del escritor** — completar la oración con el verbo en modo subjuntivo (vs indicativo/futuro).

### Nivel DETECTIVES (13 años)
- R1 **Resuelve el enigma** — inferencias: escena con pistas → elegir la conclusión correcta.
- R2 **El expediente del caso** — clasificar datos a 3 carpetas: Detective / Victimario / Pista.
- R3 **La lupa del detective** — multi-selección: marcar las pistas reales escondidas entre detalles irrelevantes.

## Glifos del fondo (historia + misterio)
- Cósmico (15): 📜 🔍 ⏳ 🕵️ 🏛️ 🗝️ ✒️ 📚 🧭 ⚖️ 🪶 ? 📖 🎭 ★
- Pizarra (10): 🔍 📜 ⏳ 🗝️ 🕵️ ✒️ 🏛️ ? 🧩 ★

## Copy clave
- Home: label "Historias y misterios", subtítulo "Elige un tema para empezar."
- Enunciado = QUÉ hacer (con punto); bocadillo = CÓMO (la mecánica). Ver cada ronda.
- Vocabulario ecuatoriano (interjecciones incluyen ¡Achachay!, ¡Ananay!, ¡Guácala!, ¡Arrarray!).

## Decisiones abiertas / riesgos
- FIFO compartido (`edinun_hym_recientes_v1`, prefijo por ronda), ventana ≈ N/2 por banco.
- Bug corregido en QA: el shooter usaba `caught` (state) en taps rápidos → stale closure;
  ahora acumula con `caughtRef` para no perder taps simultáneos.
- QA jugado: Relatos 3/3 y Herramientas 3/3 completos; Detectives R1 + layout R2 verificados.
  R3 lupa compila sin errores de consola (mecánica = toggle Set + verify, bajo riesgo).
  El navegador MCP del entorno crasheaba intermitentemente y limitó el QA interactivo de R3.
