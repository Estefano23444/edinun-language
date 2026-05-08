"""qa-checks.py — QA visual automatizado de un juego EDINUN GAMES.

Versión Python equivalente a qa-checks.js. Lanza Chromium en 6 viewports
canónicos, abre el index.html del juego, recorre el flujo Home → Personaje →
Game, valida zonas del grid (data-qa="...") y guarda screenshots.

Uso:
    cd juegos/<slug>
    python .planning/qa-checks.py

Requiere:
    - Python 3.8+
    - pip install playwright
    - playwright install chromium

Output:
    - .planning/qa-screenshots/<viewport>-<screen>.png
    - .planning/qa-results.json
    - exit code 0 si pasa, 1 si hay errores

Documentación detallada en .planning/qa-checks.md.
"""

import http.server
import json
import socketserver
import sys
import threading
import time
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("ERROR: playwright no está instalado.")
    print("Instalar con: pip install playwright && playwright install chromium")
    sys.exit(2)


VIEWPORTS = [
    {"name": "desktop-fullhd",   "width": 1920, "height": 1080},
    {"name": "laptop",           "width": 1280, "height": 800},
    {"name": "tablet-landscape", "width": 1024, "height": 768},
    {"name": "tablet-portrait",  "width": 768,  "height": 1024},
    {"name": "mobile-landscape", "width": 667,  "height": 375},
    {"name": "mobile-portrait",  "width": 375,  "height": 667},
]

ZONES = {
    "hud":          {"x": 0,   "y": 0,   "w": 900, "h": 56},
    "bocadillo":    {"x": 12,  "y": 68,  "w": 228, "h": 132},
    "zona-central": {"x": 260, "y": 68,  "w": 460, "h": 352},
    "acciones":     {"x": 740, "y": 68,  "w": 148, "h": 352},
    "personaje":    {"x": 0,   "y": 440, "w": 100, "h": 100},
    "bandeja":      {"x": 120, "y": 440, "w": 768, "h": 100},
}

ALLOWED_OVERLAPS = {
    frozenset(["zona-central", "bandeja"]),
    frozenset(["acciones", "bandeja"]),
}

TOLERANCE = 4
MIN_BUTTON_SIZE = 44
MIN_FICHA_SIZE = 56

PORT = 8765


def start_server(root_dir, port):
    handler = lambda *a, **kw: http.server.SimpleHTTPRequestHandler(*a, directory=str(root_dir), **kw)
    server = socketserver.TCPServer(("localhost", port), handler)
    server.daemon_threads = True
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server


def rects_overlap(a, b):
    return not (a["x"] + a["w"] <= b["x"] or b["x"] + b["w"] <= a["x"] or
                a["y"] + a["h"] <= b["y"] or b["y"] + b["h"] <= a["y"])


def rect_inside(inner, outer, tol):
    return (inner["x"] >= outer["x"] - tol and
            inner["y"] >= outer["y"] - tol and
            inner["x"] + inner["w"] <= outer["x"] + outer["w"] + tol and
            inner["y"] + inner["h"] <= outer["y"] + outer["h"] + tol)


GET_ZONE_BOXES_JS = """
() => {
  const stage = Array.from(document.querySelectorAll("div")).find(d => {
    const cs = getComputedStyle(d);
    return cs.width === "900px" && cs.height === "540px";
  });
  if (!stage) return null;
  const stageRect = stage.getBoundingClientRect();
  const sx = stageRect.width / 900;
  const sy = stageRect.height / 540;
  const result = {};
  document.querySelectorAll("[data-qa]").forEach(el => {
    const key = el.getAttribute("data-qa");
    const r = el.getBoundingClientRect();
    result[key] = {
      x: (r.left - stageRect.left) / sx,
      y: (r.top - stageRect.top) / sy,
      w: r.width / sx,
      h: r.height / sy,
    };
  });
  return { zones: result };
}
"""

CHECK_BUTTONS_JS = """
({ minBtn, minFicha }) => {
  const issues = [];
  const accionesEl = document.querySelector('[data-qa="acciones"]');
  if (accionesEl) {
    accionesEl.querySelectorAll("button").forEach(btn => {
      const r = btn.getBoundingClientRect();
      if (r.width < minBtn || r.height < minBtn) {
        issues.push({ severity: "warn", msg: `Botón "${btn.textContent.trim()}" en acciones: ${r.width.toFixed(0)}×${r.height.toFixed(0)} (mínimo ${minBtn}×${minBtn})` });
      }
    });
  }
  const bandejaEl = document.querySelector('[data-qa="bandeja"]');
  if (bandejaEl) {
    bandejaEl.querySelectorAll("button").forEach(btn => {
      const r = btn.getBoundingClientRect();
      if (r.width < minFicha || r.height < minFicha) {
        issues.push({ severity: "warn", msg: `Ficha "${btn.textContent.trim()}" en bandeja: ${r.width.toFixed(0)}×${r.height.toFixed(0)} (mínimo ${minFicha}×${minFicha})` });
      }
    });
  }
  return issues;
}
"""


def validate_zones(observed):
    issues = []
    if not observed or "zones" not in observed:
        issues.append({"severity": "error", "msg": "No se pudo localizar el lienzo o ningún elemento data-qa"})
        return issues
    z = observed["zones"]

    for key, expected in ZONES.items():
        got = z.get(key)
        if not got:
            if key in ("bandeja", "bocadillo"):
                continue
            issues.append({"severity": "warn", "msg": f'Zona "{key}" no encontrada en el DOM'})
            continue
        if not rect_inside(got, expected, TOLERANCE):
            issues.append({
                "severity": "error",
                "msg": f'Zona "{key}" fuera de su área: observado ({got["x"]:.0f}, {got["y"]:.0f}, {got["w"]:.0f}×{got["h"]:.0f}) vs declarado ({expected["x"]}, {expected["y"]}, {expected["w"]}×{expected["h"]})',
            })

    keys = list(z.keys())
    for i in range(len(keys)):
        for j in range(i + 1, len(keys)):
            a, b = keys[i], keys[j]
            if frozenset([a, b]) in ALLOWED_OVERLAPS:
                continue
            if rects_overlap(z[a], z[b]):
                issues.append({"severity": "error", "msg": f'Zonas "{a}" y "{b}" se superponen.'})

    for key, got in z.items():
        if (got["x"] < -TOLERANCE or got["y"] < -TOLERANCE or
                got["x"] + got["w"] > 900 + TOLERANCE or got["y"] + got["h"] > 540 + TOLERANCE):
            issues.append({"severity": "error", "msg": f'Zona "{key}" sale del lienzo: ({got["x"]:.0f}, {got["y"]:.0f}, {got["w"]:.0f}×{got["h"]:.0f})'})

    return issues


def run_for_viewport(browser, vp, base_url, screenshots_dir):
    ctx = browser.new_context(viewport={"width": vp["width"], "height": vp["height"]})
    page = ctx.new_page()
    all_issues = []
    try:
        page.goto(base_url, wait_until="load")
        page.wait_for_timeout(700)
        page.screenshot(path=str(screenshots_dir / f'{vp["name"]}-1-home.png'))

        name_input = page.locator('input[placeholder*="nombre" i]').first
        if name_input.count() > 0:
            name_input.fill("QABot")
            page.locator('button:has-text("ENTRAR")').first.click()
            page.wait_for_timeout(400)

        page.screenshot(path=str(screenshots_dir / f'{vp["name"]}-2-character.png'))
        vamos = page.locator('button:has-text("VAMOS")').first
        if vamos.count() > 0:
            vamos.click()
            page.wait_for_timeout(500)

        page.screenshot(path=str(screenshots_dir / f'{vp["name"]}-3-game.png'))
        observed = page.evaluate(GET_ZONE_BOXES_JS)
        all_issues.extend(validate_zones(observed))
        button_issues = page.evaluate(CHECK_BUTTONS_JS, {"minBtn": MIN_BUTTON_SIZE, "minFicha": MIN_FICHA_SIZE})
        all_issues.extend(button_issues)
    except Exception as e:
        all_issues.append({"severity": "error", "msg": f"Excepción: {e}"})
    finally:
        ctx.close()
    return {"viewport": vp["name"], "issues": all_issues}


def main():
    cwd = Path.cwd()
    base_url = f"http://localhost:{PORT}/index.html"
    screenshots_dir = cwd / ".planning" / "qa-screenshots"
    screenshots_dir.mkdir(parents=True, exist_ok=True)

    print(f"Sirviendo {cwd} en {base_url}...")
    server = start_server(cwd, PORT)
    time.sleep(0.3)

    print("Lanzando Chromium...")
    with sync_playwright() as p:
        browser = p.chromium.launch()
        results = []
        for vp in VIEWPORTS:
            print(f'  → {vp["name"]} ({vp["width"]}×{vp["height"]})')
            results.append(run_for_viewport(browser, vp, base_url, screenshots_dir))
        browser.close()

    server.shutdown()

    total = sum(len(r["issues"]) for r in results)
    errors = sum(sum(1 for i in r["issues"] if i["severity"] == "error") for r in results)
    summary = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "cwd": str(cwd),
        "viewports": len(VIEWPORTS),
        "totalIssues": total,
        "errorIssues": errors,
        "pass": errors == 0,
        "results": results,
    }
    (cwd / ".planning" / "qa-results.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False))

    print("\n=== RESUMEN ===")
    print(f"Total issues: {total} ({errors} errores)")
    for r in results:
        if not r["issues"]:
            print(f'  ✓ {r["viewport"]}')
            continue
        print(f'  ✗ {r["viewport"]}: {len(r["issues"])} issue(s)')
        for i in r["issues"]:
            print(f'      [{i["severity"]}] {i["msg"]}')
    print(f"\nScreenshots: {screenshots_dir}")
    print(f'Resultados:  {cwd / ".planning" / "qa-results.json"}')

    sys.exit(0 if errors == 0 else 1)


if __name__ == "__main__":
    main()
