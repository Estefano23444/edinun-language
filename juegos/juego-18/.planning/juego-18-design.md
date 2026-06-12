# El baúl de las herramientas de escritura — diseño

## Tema

TEMA 5 del libro EDINUN de Lengua y Literatura, **11 años**. "El baúl de las
herramientas de escritura": las herramientas gramaticales que usamos al
escribir. El libro presenta tres: el **modo condicional**, los **prefijos y
sufijos**, y las **desinencias**. Una herramienta por ronda.

Marco narrativo: Rolli (la escritora) abre su baúl de herramientas; cada ronda
destapa una herramienta distinta.

## Niveles

1 solo nivel. Home sin chips de dificultad. La edad NO se muestra en ningún
botón ni texto visible (decisión de la autora 2026-06-11): solo vive en
comentarios del código.

## Mecánica — 3 rondas DISTINTAS (estándar 7+ años)

### R1 · Ruleta de los deseos (modo condicional)
Familia **ruleta animada** (como juego-12). La rueda gira y sortea un deseo con
"si…" y un hueco; el niño elige, entre 3 chips, el verbo en **modo condicional**
(`-aría`) frente al imperfecto (`-aba`) y el futuro (`-aré`). Verbos `-ar` para
que las tres terminaciones sean claramente distintas. VERIFICAR manual; al
fallar la correcta queda verde con ✓ (§11).

### R2 · El taller de palabras (prefijos y sufijos)
Familia **laboratorio**. Dado un significado objetivo y una raíz, el niño toca
la pieza (PREFIJO o SUFIJO) que se une a la raíz. El hueco va al INICIO (prefijo)
o al FINAL (sufijo) — la posición enseña la diferencia. Piezas SIN guion
(estándar juego-13). BORRAR limpia el hueco. Feedback §11 en la bandeja.

### R3 · El detective de desinencias (desinencias)
Familia **clasificar** (tap-tap, sin drag para fiabilidad). Verbos conjugados en
el pool; el niño toca un verbo (se ilumina) y luego su **cajón** de persona
(Yo / Tú / Nosotros), leyendo la terminación. Toca un verbo ya guardado para
devolverlo; BORRAR vacía todo. La terminación se muestra subrayada en rojo para
resaltar la desinencia. Al verificar: verde si bien guardado, rojo + "→ persona"
correcta si no (§11).

Todas las rondas con VERIFICAR manual (§10). Contenido ORIGINAL (no copiado del
libro). FIFO anti-repetición por categoría (`edinun_baul_recientes_v1`, ventana
≈ floor(N/2)).

## Glifos del fondo
- Cósmico (15): 🪶 📜 📖 ✏️ ✒️ 📝 🖋️ 📚 + texto (ía · re · des · ? · ! · ✓ · ★).
- Pizarra (10): si… · ía · re · des · -o · 🪶 · ✒️ · ? · ! · ✓.

## Copy específico
- Slug: `baul-de-escritura`. Personaje por defecto: **Rolli** (escritor).
- catLabel: "El baúl de las herramientas de escritura". Título de tarjeta del
  landing: "El baúl de la escritura".
- Enunciados (QUÉ): R1 "Completa el deseo con el verbo en modo condicional." ·
  R2 "Forma la palabra que tenga ese significado." · R3 "Guarda cada verbo en el
  cajón de su persona."
- Bocadillos (CÓMO): R1 "Gira la ruleta y toca el verbo correcto." · R2 "Toca la
  pieza que se une a la palabra." · R3 "Lee la terminación: toca un verbo y su
  cajón."

## Decisiones abiertas / riesgos
- R2 y R3 son tap-to-place (no drag HTML5) por fiabilidad y QA; la autora aprobó
  "arrastrar" pero tap es equivalente pedagógicamente y más robusto.
- QA visual: 0 errores de consola en los 6 viewports; las 3 mecánicas se ven
  bien hasta 667×375 (portrait 375×667 bloqueado por overlay, esperado).
