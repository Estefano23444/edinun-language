#!/usr/bin/env python3
"""Re-empaquetar los .jsx editables en el bloque <script type=\"text/babel\">
de index.html y EDINUN GAMES.html.

Mantiene los dos HTML idénticos. Pensado para correrse manualmente tras
editar cualquier .jsx (logo, characters, screens, game-screens, app).
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JSX_FILES = ["logo.jsx", "characters.jsx", "screens.jsx", "game-screens.jsx", "app.jsx"]
HTML_FILES = ["index.html", "EDINUN GAMES.html"]

bundle = "\n".join((ROOT / f).read_text(encoding="utf-8") for f in JSX_FILES)

# Sanity check: si algún .jsx contiene literalmente "</script>" en su texto
# fuente, el navegador cerraría el <script type="text/babel"> antes de tiempo
# y todo lo que viniera después se renderizaría como texto. Bloqueamos esto.
# (Para emitir un </script> dentro de un template literal, usar el truco
#  ${"<\\/scr"+"ipt>"} o concatenación equivalente.)
for f in JSX_FILES:
    text = (ROOT / f).read_text(encoding="utf-8")
    if "</script>" in text.lower():
        raise SystemExit(
            f"ERROR: {f} contiene '</script>' literal. El parser HTML del "
            "navegador cerraría el bloque <script type=text/babel> ahí mismo. "
            "Dividí el token (ej: \"<\\\\/scr\"+\"ipt>\")."
        )

# Reemplazamos desde <script type="text/babel"> hasta </html> (todo el final
# del documento), reescribiendo de cero el cierre. Esto inmuniza el script
# contra HTMLs corruptos por bundles previos rotos: aunque haya basura entre
# medio, esta corrida la limpia. El head/body antes del script se mantiene
# intacto.
pattern = re.compile(
    r'(<script type="text/babel" data-presets="react">).*</html>',
    re.DOTALL | re.IGNORECASE,
)

for html in HTML_FILES:
    p = ROOT / html
    src = p.read_text(encoding="utf-8")
    if not pattern.search(src):
        raise SystemExit(f"No se encontró el bloque <script babel> en {html}")
    new = pattern.sub(
        lambda m: f"{m.group(1)}\n{bundle}\n</script>\n</body>\n</html>",
        src,
        count=1,
    )
    p.write_text(new, encoding="utf-8")
    print(f"  OK {html} actualizado ({len(new)} bytes)")

print("Bundle listo.")
