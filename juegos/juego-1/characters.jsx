// characters.jsx — Personajes EDINUN GAMES · Juegos de lenguaje.
// Renderizan los PNG de assets/char-<id>.png. Misma API que la versión
// SVG (props `size`, `floating`) para no romper a los consumidores
// (GameScreen, CharacterScreen, ResultsScreen, CharacterAvatar).

// ─────────────────────────────────────────────────────────────
// Sparkles — chispas animadas alrededor del personaje. Refuerzan
// la estética cósmica heredada del shell.
// ─────────────────────────────────────────────────────────────
function Sparkles({ color = "#fce9a8", count = 6, seed = 1 }) {
  const pts = Array.from({ length: count }, (_, i) => {
    const a = (i * 360) / count + seed * 37;
    const r = 70 + (i % 3) * 8;
    const x = 100 + Math.cos((a * Math.PI) / 180) * r;
    const y = 100 + Math.sin((a * Math.PI) / 180) * r;
    const s = 2 + (i % 3);
    return { x, y, s, delay: i * 0.35 };
  });
  return (
    <g>
      {pts.map((p, i) => (
        <g key={i} transform={`translate(${p.x} ${p.y})`}>
          <circle r={p.s} fill={color} opacity="0.9">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="2.4s" begin={`${p.delay}s`} repeatCount="indefinite" />
          </circle>
        </g>
      ))}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────
// Fábrica de componentes — cada personaje es un PNG con sparkles
// superpuestos. Identidad: escritor / explorador / poeta / narrador.
// ─────────────────────────────────────────────────────────────
function makeCharacter(id, sparkleColor, sparkleSeed) {
  return function Character({ size = 200, floating = true }) {
    return (
      <div
        className={floating ? "ed-float-soft" : ""}
        style={{
          width: size, height: size,
          position: "relative",
          display: "inline-block",
          lineHeight: 0,
        }}
      >
        <img
          src={`assets/char-${id}.png`}
          alt=""
          draggable="false"
          style={{
            width: "100%", height: "100%",
            objectFit: "contain",
            display: "block",
            filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.35))",
            userSelect: "none",
            pointerEvents: "none",
          }}
        />
        <svg
          viewBox="0 0 200 200"
          aria-hidden="true"
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            pointerEvents: "none",
            overflow: "visible",
          }}
        >
          <Sparkles color={sparkleColor} count={6} seed={sparkleSeed} />
        </svg>
      </div>
    );
  };
}

const EscritorCharacter = makeCharacter("escritor", "#e89a4e", 1);
const PoetaCharacter = makeCharacter("poeta", "#a78bfa", 2);
const ExploradorCharacter = makeCharacter("explorador", "#5fb878", 3);
const NarradorCharacter = makeCharacter("narrador", "#ef6f6f", 4);

// ─────────────────────────────────────────────────────────────
// Avatar compacto (HUD / cards). Marco circular dorado/violeta.
// ─────────────────────────────────────────────────────────────
function CharacterAvatar({ char, size = 56 }) {
  const map = {
    escritor: EscritorCharacter,
    poeta: PoetaCharacter,
    explorador: ExploradorCharacter,
    narrador: NarradorCharacter,
  };
  const C = map[char] || EscritorCharacter;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "radial-gradient(circle at 30% 30%, rgba(138,90,242,.8), rgba(18,10,55,.95))",
      boxShadow: "inset 0 0 0 2px rgba(242,194,96,.8), 0 0 14px rgba(138,90,242,.45)",
      display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
    }}>
      <div style={{ transform: `translateY(${size * 0.06}px) scale(1.15)` }}>
        <C size={size} floating={false} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Catálogo — nombres cortos, profesiones literarias claras,
// quotes evocadoras para 6-8 años.
// ─────────────────────────────────────────────────────────────
const CHARACTERS = [
  {
    id: "escritor",
    name: "Rolli",
    title: "La Escritora",
    specialty: "Maestra de las palabras",
    quote: "Escribir es como hacer magia con un lápiz.",
    Component: EscritorCharacter,
  },
  {
    id: "explorador",
    name: "Verne",
    title: "El Explorador",
    specialty: "Buscador de palabras",
    quote: "Cada libro es una aventura por descubrir.",
    Component: ExploradorCharacter,
  },
  {
    id: "poeta",
    name: "Gaby",
    title: "La Poeta",
    specialty: "Tejedora de versos",
    quote: "Los poemas saben bailar y hacer cosquillas.",
    Component: PoetaCharacter,
  },
  {
    id: "narrador",
    name: "Márquez",
    title: "El Cuentacuentos",
    specialty: "Guardián de las historias",
    quote: "Cierra los ojos: te cuento un cuento.",
    Component: NarradorCharacter,
  },
];

Object.assign(window, {
  EscritorCharacter,
  PoetaCharacter,
  ExploradorCharacter,
  NarradorCharacter,
  CharacterAvatar,
  CHARACTERS,
});
