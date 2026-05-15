// screens.jsx — HomeScreen + CharacterScreen + CosmosBg adaptado al
// juego de lenguaje "Completa la palabra". Hereda la estructura del shell
// (logo izq + formulario der en Home, 4 personajes grid en Character).

const { useState, useEffect, useRef, useMemo } = React;

// ─────────────────────────────────────────────────────────────
// Fondo cósmico + glifos de LENGUAJE (letras/símbolos de escritura).
// La firma y posiciones son idénticas a la versión matemática del shell:
// solo cambian los glifos para que el fondo respire "lenguaje" en vez de
// fórmulas.
// ─────────────────────────────────────────────────────────────
function CosmosBg({ variant = "cosmic", glyphSize }) {
  const glyphsStyle = glyphSize ? { fontSize: glyphSize + "px" } : undefined;
  if (variant === "chalkboard") {
    // Pantalla de juego (pizarra verde). 10 glifos de lenguaje.
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
          <span style={{ left: "6%", top: "12%", "--rot": "-8deg" }}>A</span>
          <span style={{ left: "82%", top: "16%", "--rot": "6deg", fontSize: "0.62em" }}>E</span>
          <span style={{ left: "10%", top: "78%", "--rot": "12deg", fontSize: "0.7em" }}>I</span>
          <span style={{ left: "88%", top: "72%", "--rot": "-10deg", fontSize: "0.55em" }}>O</span>
          <span style={{ left: "45%", top: "8%", "--rot": "4deg", fontSize: "0.5em" }}>U</span>
          <span style={{ left: "3%", top: "45%", "--rot": "-4deg", fontSize: "0.6em" }}>?</span>
          <span style={{ left: "92%", top: "45%", "--rot": "8deg", fontSize: "0.58em" }}>_</span>
          <span style={{ left: "30%", top: "55%", "--rot": "-6deg", fontSize: "0.5em" }}>📖</span>
          <span style={{ left: "70%", top: "62%", "--rot": "8deg", fontSize: "0.52em" }}>✏</span>
          <span style={{ left: "55%", top: "30%", "--rot": "-4deg", fontSize: "0.46em" }}>✎</span>
        </div>
      </div>
    );
  }
  // Pantallas de marco cósmico (home/character/results). 15 letras.
  return (
    <>
      <div className="ed-cosmos" />
      <div className="ed-glyphs" style={glyphsStyle}>
        <span style={{ left: "5%", top: "10%", "--rot": "-8deg" }}>A</span>
        <span style={{ left: "84%", top: "6%", "--rot": "6deg", fontSize: "0.78em" }}>E</span>
        <span style={{ left: "92%", top: "72%", "--rot": "-12deg", fontSize: "0.74em" }}>I</span>
        <span style={{ left: "3%", top: "82%", "--rot": "12deg", fontSize: "0.91em" }}>O</span>
        <span style={{ left: "46%", top: "4%", "--rot": "-4deg", fontSize: "0.59em" }}>U</span>
        <span style={{ left: "7%", top: "46%", "--rot": "-4deg", fontSize: "0.67em" }}>M</span>
        <span style={{ left: "88%", top: "40%", "--rot": "8deg", fontSize: "0.65em" }}>N</span>
        <span style={{ left: "22%", top: "22%", "--rot": "10deg", fontSize: "0.52em" }}>P</span>
        <span style={{ left: "70%", top: "24%", "--rot": "-6deg", fontSize: "0.57em" }}>R</span>
        <span style={{ left: "32%", top: "70%", "--rot": "8deg", fontSize: "0.61em" }}>S</span>
        <span style={{ left: "62%", top: "78%", "--rot": "-10deg", fontSize: "0.63em" }}>T</span>
        <span style={{ left: "18%", top: "58%", "--rot": "14deg", fontSize: "0.48em" }}>L</span>
        <span style={{ left: "78%", top: "56%", "--rot": "-8deg", fontSize: "0.52em" }}>B</span>
        <span style={{ left: "50%", top: "88%", "--rot": "4deg", fontSize: "0.5em" }}>C</span>
        <span style={{ left: "40%", top: "38%", "--rot": "-6deg", fontSize: "0.54em" }}>D</span>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Contador de visitantes (compartido entre juegos del repo via
// localStorage). Mismo contrato que el shell matemático.
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
// 1. HOME — nombre + ENTRAR. Sin chips de nivel (juego de un solo nivel).
// Conserva el layout 2 columnas (logo izq, formulario der) del shell.
// ─────────────────────────────────────────────────────────────
function HomeScreen({ app, setApp, go }) {
  const visitors = useVisitorCount();
  const [name, setName] = useState(app.studentName || "");

  function start() {
    if (!name.trim()) return;
    setApp((s) => ({
      ...s,
      studentName: name.trim(),
      level: "unico",
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
        padding: "40px 56px",
        gap: 40,
      }}>
        {/* Izquierda — logo protagonista */}
        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <EdinunLogo size={300} />
        </div>

        {/* Derecha — saludo + input + botón. Sin botones de nivel. */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 520 }}>
          <div>
            <div className="ed-label" style={{ color: "#4fd8ff", marginBottom: 8 }}>
              El país de las palabras de tierra
            </div>
            <h1 className="ed-h1" style={{ fontSize: 44, lineHeight: 1.05 }}>
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

          {/* Descripción del juego — equivalente al "bloque de descripción de
              nivel" de la versión matemática, pero ahora fija (un solo nivel). */}
          <div style={{
            padding: "14px 18px",
            borderRadius: 14,
            background: "rgba(10,6,35,0.55)",
            border: "1px solid rgba(148,120,255,0.3)",
            fontFamily: "var(--ed-font-display)", fontWeight: 600,
            fontSize: 16, lineHeight: 1.35,
            color: "#fce9a8",
            textAlign: "center",
          }}>
            Mira la imagen y completa con las vocales.
          </div>

          {/* Nombre + ENTRAR */}
          <div>
            <div className="ed-label" style={{ marginBottom: 10 }}>
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
              <button className="ed-btn ed-btn-primary" onClick={start} disabled={!name.trim()}
                style={{ height: 52, padding: "0 28px", fontSize: 16, opacity: name.trim() ? 1 : 0.5 }}>
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
// 2. SELECCIÓN DE PERSONAJE — idéntico al shell, default Rolli.
// Mapeo de nivel→categoría: un solo catLabel "Completa la palabra".
// ─────────────────────────────────────────────────────────────
function CharacterScreen({ app, setApp, go }) {
  const [sel, setSel] = useState(app.character || "escritor");
  const current = CHARACTERS.find((c) => c.id === sel) || CHARACTERS[0];

  function choose() {
    setApp((s) => ({
      ...s,
      character: sel,
      currentCategory: "palabra",
      currentCatLabel: "Completa la palabra",
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

Object.assign(window, { HomeScreen, CharacterScreen, CosmosBg, incrementGamesCompleted, useVisitorCount, markFirstAttempt });
