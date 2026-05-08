<#
.SYNOPSIS
    Re-empaquetar los .jsx editables en el bloque <script type="text/babel">
    de index.html y EDINUN GAMES.html. Equivalente PowerShell de bundle.py
    para Windows sin Python instalado.

.DESCRIPTION
    Mantiene los dos HTML idénticos. Pensado para correrse manualmente tras
    editar cualquier .jsx (logo, characters, screens, game-screens, app).

.EXAMPLE
    cd juegos\<slug>
    powershell -ExecutionPolicy Bypass -File .planning\bundle.ps1

    o si no hay restricciones de ExecutionPolicy:

    .\.planning\bundle.ps1
#>

$ErrorActionPreference = "Stop"

# El script vive en .planning\bundle.ps1, así que el root del juego es ..
$ROOT = Resolve-Path (Join-Path $PSScriptRoot "..")
$JSX_FILES  = @("logo.jsx", "characters.jsx", "screens.jsx", "game-screens.jsx", "app.jsx")
$HTML_FILES = @("index.html", "EDINUN GAMES.html")

# Concatenar los .jsx en el orden de dependencia.
$bundle = ""
foreach ($f in $JSX_FILES) {
    $path = Join-Path $ROOT $f
    if (-not (Test-Path $path)) {
        Write-Error "No se encontró $f en $ROOT"
    }
    $text = Get-Content -Path $path -Raw -Encoding UTF8
    # Sanity check: ningún .jsx puede contener </script> literal — el parser
    # HTML cerraría el <script type=text/babel> antes de tiempo.
    if ($text -match "(?i)</script>") {
        Write-Error "ERROR: $f contiene '</script>' literal. Dividí el token (ej: `"<\\/scr`"+`"ipt>`")."
    }
    if ($bundle.Length -gt 0) { $bundle += "`n" }
    $bundle += $text
}

# Patrón: reemplaza desde <script type="text/babel"...> hasta </html>.
# (?s) = single-line (. matches \n), (?i) = case-insensitive.
$pattern = '(?si)(<script type="text/babel" data-presets="react">).*</html>'
$replacement = "`$1`n$bundle`n</script>`n</body>`n</html>"

foreach ($html in $HTML_FILES) {
    $p = Join-Path $ROOT $html
    if (-not (Test-Path $p)) {
        Write-Error "No se encontró $html en $ROOT"
    }
    $src = Get-Content -Path $p -Raw -Encoding UTF8
    if ($src -notmatch $pattern) {
        Write-Error "No se encontró el bloque <script babel> en $html"
    }
    $new = [regex]::Replace($src, $pattern, $replacement, 1)
    # UTF-8 sin BOM (compatibilidad con servidores y diff)
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($p, $new, $utf8NoBom)
    Write-Host "  OK $html actualizado ($($new.Length) bytes)"
}

Write-Host "Bundle listo."
