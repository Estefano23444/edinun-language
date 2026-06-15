// screens.jsx — HomeScreen + CharacterScreen + CosmosBg para JUEGO-21
// "Un mundo para soñar" (TEMA 1 del libro EDINUN, 13 años).
// 1 nivel único, 3 rondas con mecánicas DISTINTAS (clasificar · ordenar ·
// rueda de atributos). Tema: LITERATURA FANTÁSTICA — lo extraño, lo
// maravilloso y lo fantástico — + EL ARTE DE RESUMIR.
// Personaje destacado: Rolli (escritor). Home sin chips de dificultad.

const { useState, useEffect, useRef, useMemo } = React;

// ─────────────────────────────────────────────────────────────
// Glifos del fondo — símbolos de mundos imaginarios (sueños, libros,
// puertas, llaves, dragones) para ambientar sin distraer.
// ─────────────────────────────────────────────────────────────
const CHALK_GLYPHS = [
  { c: "🌙", l: "6%",  t: "12%", r: "-8deg", s: "0.5em" },
  { c: "🗝️", l: "82%", t: "16%", r: "6deg",  s: "0.5em" },
  { c: "📖", l: "10%", t: "78%", r: "12deg", s: "0.5em" },
  { c: "🐉", l: "88%", t: "72%", r: "-10deg", s: "0.52em" },
  { c: "🚪", l: "45%", t: "8%",  r: "4deg",  s: "0.48em" },
  { c: "✨", l: "3%",  t: "45%", r: "-4deg", s: "0.5em" },
  { c: "🔮", l: "92%", t: "45%", r: "8deg",  s: "0.5em" },
  { c: "☁️", l: "30%", t: "55%", r: "-6deg", s: "0.5em" },
  { c: "🕯️", l: "70%", t: "62%", r: "8deg",  s: "0.5em" },
  { c: "★",  l: "55%", t: "30%", r: "-4deg", s: "0.46em" },
];

const COSMIC_GLYPHS = [
  { c: "🌙", l: "5%",  t: "10%", r: "-8deg", s: "0.66em" },
  { c: "🗝️", l: "84%", t: "6%",  r: "6deg",  s: "0.6em" },
  { c: "🐉", l: "92%", t: "72%", r: "-12deg", s: "0.7em" },
  { c: "📖", l: "3%",  t: "82%", r: "12deg",  s: "0.66em" },
  { c: "🚪", l: "46%", t: "4%",  r: "-4deg",  s: "0.56em" },
  { c: "✨", l: "7%",  t: "46%", r: "-4deg",  s: "0.6em" },
  { c: "🔮", l: "88%", t: "40%", r: "8deg",   s: "0.6em" },
  { c: "🏰", l: "22%", t: "22%", r: "10deg",  s: "0.6em" },
  { c: "🦉", l: "70%", t: "24%", r: "-6deg",  s: "0.56em" },
  { c: "🕯️", l: "32%", t: "70%", r: "8deg",   s: "0.55em" },
  { c: "🪐", l: "62%", t: "78%", r: "-10deg", s: "0.58em" },
  { c: "☁️", l: "18%", t: "58%", r: "14deg",  s: "0.55em" },
  { c: "💫", l: "78%", t: "56%", r: "-8deg",  s: "0.52em" },
  { c: "✦",  l: "50%", t: "88%", r: "4deg",   s: "0.52em" },
  { c: "⭐", l: "40%", t: "38%", r: "-6deg",  s: "0.5em" },
];

function CosmosBg({ variant = "cosmic", glyphSize }) {
  const glyphsStyle = glyphSize ? { fontSize: glyphSize + "px" } : undefined;
  if (variant === "chalkboard") {
    // Pantalla de juego (pizarra verde) — 10 glifos.
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, #3a9b7a 0%, #1d6b53 55%, #0b3a2d 100%)",
          overflow: "hidden",
        }}
      >
        <div className="ed-glyphs" style={{ color: "rgba(255,255,255,0.10)", ...glyphsStyle }}>
          {CHALK_GLYPHS.map((g, i) => (
            <span key={i} style={{
              left: g.l, top: g.t, "--rot": g.r,
              ...(g.s ? { fontSize: g.s } : {}),
            }}>{g.c}</span>
          ))}
        </div>
      </div>
    );
  }
  // Pantallas de marco cósmico (home/character/results) — 15 glifos.
  return (
    <>
      <div className="ed-cosmos" />
      <div className="ed-glyphs" style={glyphsStyle}>
        {COSMIC_GLYPHS.map((g, i) => (
          <span key={i} style={{
            left: g.l, top: g.t, "--rot": g.r,
            ...(g.s ? { fontSize: g.s } : {}),
          }}>{g.c}</span>
        ))}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Contador de visitantes (compartido entre juegos del repo via
// localStorage).
// ─────────────────────────────────────────────────────────────
function useVisitorCount() {
  const KEY = "edinun_visitors_v1";
  const [n, setN] = useState(() => {
    const raw = localStorage.getItem(KEY);
    const v = raw ? parseInt(raw, 10) : 0;
    return isNaN(v) ? 0 : v;
  });
  useEffect(() => {
    function onUpdate() {
      const raw = localStorage.getItem(KEY);
      const v = raw ? parseInt(raw, 10) : 0;
      if (!isNaN(v)) setN(v);
    }
    window.addEventListener("edinun:visitors-updated", onUpdate);
    return () => window.removeEventListener("edinun:visitors-updated", onUpdate);
  }, []);
  return n;
}

function markFirstAttempt() {
  const KEY = "edinun_visitors_v1";
  const SESSION_FLAG = "edinun_visit_counted_v1";
  if (sessionStorage.getItem(SESSION_FLAG) === "1") return;
  const raw = localStorage.getItem(KEY);
  const current = raw ? parseInt(raw, 10) : 0;
  const next = (isNaN(current) ? 0 : current) + 1;
  localStorage.setItem(KEY, String(next));
  sessionStorage.setItem(SESSION_FLAG, "1");
  window.dispatchEvent(new Event("edinun:visitors-updated"));
}

function incrementGamesCompleted() {
  const KEY = "edinun_games_completed_v1";
  const raw = localStorage.getItem(KEY);
  const next = (raw ? parseInt(raw, 10) : 0) + 1;
  localStorage.setItem(KEY, String(next));
  window.dispatchEvent(new Event("edinun:games-updated"));
  return next;
}

function PeopleIcon({ size = 18, color = "#fce9a8" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="8" cy="7" r="3" fill={color} />
      <circle cx="16" cy="7" r="3" fill={color} opacity="0.85" />
      <path d="M2 20c0-3.3 2.7-6 6-6s6 2.7 6 6v1H2v-1z" fill={color} />
      <path d="M14 20c0-2 -.7-3.8-1.8-5.2 1-.5 2.1-.8 3.3-.8 3.3 0 6 2.7 6 6v1H14v-1z" fill={color} opacity="0.85" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Configuración del nivel único. Es 1 sólo nivel → en Home no se
// muestran chips de dificultad y el HUD del juego no tiene tabs.
// El catLabel se inyecta como "currentCatLabel" para ResultsScreen.
// ─────────────────────────────────────────────────────────────
const LEVELS_CFG = [
  {
    id: "fantastica",
    label: "Un mundo para soñar",
    grad: "linear-gradient(180deg, #b794ff, #6c4fd1)",
    ink: "#1a0a3a",
    description: "Distingue lo extraño, lo maravilloso y lo fantástico, y resume con ideas claras.",
    catLabel: "Literatura fantástica",
  },
];

// ─────────────────────────────────────────────────────────────
// 1. HOME — saludo + nombre + ENTRAR. Sin chips de nivel (juego de
// 1 solo nivel). Conserva el layout 2 columnas (logo izq, formulario
// der) del shell.
// ─────────────────────────────────────────────────────────────
function HomeScreen({ app, setApp, go }) {
  const visitors = useVisitorCount();
  const [name, setName] = useState(app.studentName || "");

  const canStart = !!name.trim();

  function start() {
    if (!canStart) return;
    setApp((s) => ({
      ...s,
      studentName: name.trim(),
      level: "fantastica",
      sessionStart: Date.now(),
    }));
    go("character");
  }

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* Contador de visitantes (abajo derecha) */}
      <div style={{
        position: "absolute", bottom: 18, right: 22,
        display: "flex", alignItems: "center", gap: 8,
        background: "rgba(10,6,35,0.55)",
        border: "1px solid rgba(242,194,96,0.3)",
        borderRadius: 999, padding: "6px 12px",
        backdropFilter: "blur(8px)",
      }}>
        <PeopleIcon size={16} color="#fce9a8" />
        <div style={{ fontFamily: "var(--ed-font-mono)", fontSize: 11, color: "#f2c260", letterSpacing: "0.06em" }}>
          {visitors.toLocaleString("es-CO")}
          <span style={{ color: "rgba(246,241,255,0.55)", marginLeft: 6 }}>visitas</span>
        </div>
      </div>

      {/* Contenido principal — 2 columnas */}
      <div style={{
        position: "absolute", inset: 0,
        display: "grid",
        gridTemplateColumns: "1fr 1.15fr",
        alignItems: "center",
        padding: "32px 48px",
        gap: 32,
      }}>
        {/* Izquierda — logo protagonista */}
        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <EdinunLogo size={280} />
        </div>

        {/* Derecha — saludo + descripción + nombre + ENTRAR. Sin chips
            de nivel porque el juego tiene 1 solo tema. */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 520 }}>
          <div>
            <div className="ed-label" style={{ color: "#4fd8ff", marginBottom: 6 }}>
              Un mundo para soñar
            </div>
            <h1 className="ed-h1" style={{ fontSize: 36, lineHeight: 1.05 }}>
              ¡Bienvenido/a,{" "}
              <span style={{
                background: "linear-gradient(180deg,#fce9a8,#d9a441)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontWeight: 600,
              }}>
                Estudiante!
              </span>
            </h1>
          </div>

          {/* Descripción del tema único */}
          <div style={{
            padding: "14px 16px",
            borderRadius: 14,
            background: "rgba(10,6,35,0.55)",
            border: "1px solid rgba(242,194,96,0.35)",
            fontFamily: "var(--ed-font-display)", fontWeight: 600,
            fontSize: 15, lineHeight: 1.35,
            color: "#fce9a8",
            textAlign: "center",
          }}>
            Explora la literatura fantástica y aprende a resumir
            <br />
            <span style={{ color: "#ffd76e", fontSize: 16, letterSpacing: "0.04em" }}>
              lo extraño · lo maravilloso · lo fantástico
            </span>
          </div>

          {/* Nombre + ENTRAR */}
          <div>
            <div className="ed-label" style={{ marginBottom: 8 }}>
              Escribe tu nombre y entra
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <input
                  className="ed-input"
                  placeholder="Escribe tu nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && start()}
                />
              </div>
              <button className="ed-btn ed-btn-primary" onClick={start} disabled={!canStart}
                title={!name.trim() ? "Escribe tu nombre" : ""}
                style={{ height: 50, padding: "0 24px", fontSize: 15, opacity: canStart ? 1 : 0.5, cursor: canStart ? "pointer" : "not-allowed" }}>
                ENTRAR →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. SELECCIÓN DE PERSONAJE — idéntico al shell. Default Rolli
// (escritor) porque es el guía de los lectores grandes (13 años) y
// encaja con la creación literaria del tema.
// ─────────────────────────────────────────────────────────────
function CharacterScreen({ app, setApp, go }) {
  const [sel, setSel] = useState(app.character || "escritor");
  const current = CHARACTERS.find((c) => c.id === sel) || CHARACTERS[0];

  function choose() {
    const lvCfg = LEVELS_CFG[0];
    setApp((s) => ({
      ...s,
      character: sel,
      currentCategory: lvCfg.id,
      currentCatLabel: lvCfg.catLabel,
    }));
    go("game");
  }

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ position: "absolute", top: 18, left: 24, right: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button className="ed-btn ed-btn-ghost" onClick={() => go("home")} style={{ padding: "8px 14px" }}>
          ← VOLVER
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, color: "#fce9a8", fontSize: 20, textShadow: "0 2px 6px rgba(0,0,0,0.45)" }}>
            Hola, {app.studentName || "Estudiante"} 👋
          </div>
          <EdinunLogoMini size={64} />
        </div>
      </div>

      {/* Contenido */}
      <div style={{
        position: "absolute", inset: "92px 32px 24px 32px",
        display: "grid", gridTemplateColumns: "1fr 1.05fr", gap: 24, alignItems: "center",
      }}>
        {/* Izquierda — personaje seleccionado grande */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 0 }}>
          <div style={{ position: "relative" }}>
            <div style={{
              position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)",
              width: 220, height: 28, borderRadius: "50%",
              background: "radial-gradient(ellipse, rgba(242,194,96,0.45), transparent 70%)",
              filter: "blur(5px)",
            }} />
            <current.Component size={280} floating />
          </div>
          <div style={{ textAlign: "center", marginTop: 4 }}>
            <h2 className="ed-h1" style={{ fontSize: 28, lineHeight: 1 }}>{current.name}</h2>
            <div className="ed-label" style={{ color: "#fce9a8", marginTop: 2, fontSize: 10 }}>{current.title}</div>
            <div className="ed-body" style={{ marginTop: 6, maxWidth: 320, fontStyle: "italic", fontSize: 13, lineHeight: 1.35 }}>
              "{current.quote}"
            </div>
          </div>
        </div>

        {/* Derecha — grid 2x2 */}
        <div>
          <div className="ed-label" style={{ marginBottom: 10 }}>Elige tu guía de palabras</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {CHARACTERS.map((c) => {
              const active = sel === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSel(c.id)}
                  className="ed-card"
                  style={{
                    padding: 12,
                    textAlign: "left",
                    cursor: "pointer",
                    transform: active ? "translateY(-2px)" : "none",
                    boxShadow: active
                      ? "var(--ed-shadow-card), 0 0 0 2px rgba(79,216,255,0.7), 0 0 30px rgba(79,216,255,0.35)"
                      : "var(--ed-shadow-card)",
                    transition: "all 0.18s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 68, height: 68, flexShrink: 0 }}>
                      <c.Component size={68} floating={false} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 18 }}>
                        {c.name}
                      </div>
                      <div className="ed-label" style={{ fontSize: 10, color: "#4fd8ff" }}>
                        {c.specialty}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <button
            onClick={choose}
            className="ed-btn ed-btn-primary"
            style={{ marginTop: 20, width: "100%", height: 52, fontSize: 17 }}
          >
            ¡VAMOS, {current.name.toUpperCase()}! →
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { HomeScreen, CharacterScreen, CosmosBg, incrementGamesCompleted, useVisitorCount, markFirstAttempt, LEVELS_CFG });
