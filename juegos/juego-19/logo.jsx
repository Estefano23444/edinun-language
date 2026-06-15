// logo.jsx — Logo EDINUN usando el PNG oficial dorado.
// Nada de reconstruir en SVG: mantenemos el asset original impecable.

function EdinunLogo({ size = 180, glow = true }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        position: "relative",
        filter: glow
          ? "drop-shadow(0 0 28px rgba(242,194,96,0.45)) drop-shadow(0 6px 12px rgba(0,0,0,0.45))"
          : "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
      }}
    >
      {glow && (
        <div
          style={{
            position: "absolute",
            inset: "-6%",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(242,194,96,0.22) 0%, rgba(242,194,96,0.08) 45%, transparent 75%)",
            pointerEvents: "none",
          }}
        />
      )}
      <img
        src="assets/edinun-logo.png"
        alt="EDINUN — Ediciones Nacionales Unidas"
        style={{ width: "100%", height: "100%", objectFit: "contain", position: "relative", display: "block" }}
      />
    </div>
  );
}

// Versión compacta (HUD) — mismo PNG, tamaño pequeño
function EdinunLogoMini({ size = 40 }) {
  return (
    <img
      src="assets/edinun-logo.png"
      alt="EDINUN"
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.35))",
      }}
    />
  );
}

Object.assign(window, { EdinunLogo, EdinunLogoMini });
