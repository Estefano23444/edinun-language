# Cuéntalo al mundo (juego-20) — diseño

## Tema
Dos temas del libro EDINUN de Lengua y Literatura, un nivel por edad:
- **El blog** (Tema 4, 11 años) — qué es un blog, sus partes, clasificar por tema, títulos llamativos.
- **La entrevista** (Tema 2, 14 años) — preguntas abiertas/cerradas, tipos de entrevista (perfil/noticias/opinión), estructura.

Contenido 100% ORIGINAL (no reproduce los ejemplos del libro). Base: juego-19/17 (2 niveles por edad, Home con selector, router por `app.level`).

## Niveles
| id | edad | label | personaje | grad |
|---|---|---|---|---|
| `blog` | 11 años | El blog | Verne (explorador) | azul |
| `entrevista` | 14 años | La entrevista | Rolli (escritor) | naranja |

Sin edad visible en los botones del Home. Descripción = de qué trata el tema.

## Mecánica (3 rondas distintas por nivel, desde 7 años)
### N1 — El blog (Verne)
- **R1 Arma tu blog** — `OrderRound`: arrastrar 4 fragmentos a sus zonas (Cabecera / Fecha / Entrada / Comentarios). Banco de 5 blogs originales (cocina, viajes, mascotas, tecnología, deportes), FIFO `b1`.
- **R2 Detective de blogs** — `Cartel` + `OptionButton`: leer una entrada y elegir el tema (Cocina/Aventuras/Mascotas/Tecnología/Deportes). 10 entradas, FIFO `b2`.
- **R3 Taller de títulos** — `Cartel` + `OptionButton` (apilados): elegir el título más llamativo entre 3 (uno bueno, dos vagos/aburridos). 8 temas, FIFO `b3`.

### N2 — La entrevista (Rolli)
- **R1 ¿Abierta o cerrada?** — `Cartel` + 2 `OptionButton`: clasificar la pregunta. 12 preguntas, FIFO `e1`.
- **R2 Detective de entrevistas** — `Cartel` (fragmento de diálogo) + `OptionButton`: tipo de entrevista (De perfil / De noticias / De opinión). 9 fragmentos, FIFO `e2`.
- **R3 Arma la entrevista** — `OrderRound` (5 casillas: Saludo / Apertura / Centrales / Seguimiento / Cierre). Banco de 4 entrevistados (deportista, científica, youtuber, músico), FIFO `e3`.

Una sola ronda con arrastre por nivel (N1-R1, N2-R3). Verificación manual (VERIFICAR), feedback al fallar 1500 ms, opción correcta resaltada en verde con ✓ (§11).

## Glifos del fondo
Tema comunicación digital + periodismo: 💻 🎙️ 📰 💬 🌐 📝 🎧 📱 🔗 📷 ✍️ ❓ ✦ ★ →. COSMIC 15, CHALK 10.

## Copy específico
- Título del juego: **Cuéntalo al mundo**. Label del Home: "Cuéntalo al mundo".
- Enunciado = QUÉ hacer (con punto); bocadillo = CÓMO (la mecánica).
- FIFO key: `edinun_blog_entrevista_recientes_v1`.

## Decisiones abiertas / riesgos
- Slug `juego-20` (originalmente se montó por error en juego-19, que es otro juego: "Telón y galaxia" — restaurado).
- QA visual Playwright: 6 rondas, 2 niveles, 0 errores de consola, sin solapes ni espacios mal distribuidos (1280×800).
- R2 y R3 de N1 comparten UI de selección (lectura→opción) pero con tareas cognitivas distintas (inferir tema vs. evaluar título); aprobado por la autora vía boceto.
