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
// Configuración de los 2 niveles. Cada uno define su glifo (letras
// grandes estilo libro escolar), gradiente del chip, descripción y
// catLabel que GameScreen lee para elegir banco/bandeja/copy.
// ─────────────────────────────────────────────────────────────
const LEVELS_CFG = [
  {
    id: "vocales",
    label: "Vocales",
    grad: "linear-gradient(180deg, #ffe97a, #d7b12a)",
    ink: "#3a2608",
    description: "Mira la imagen y completa con las vocales.",
    catLabel: "Completa la palabra con vocales",
  },
  {
    id: "letraV",
    label: "Letra V",
    grad: "linear-gradient(180deg, #ffc06e, #e4881a)",
    ink: "#3a2608",
    description: "Completa cada palabra con la letra V.",
    catLabel: "Letra V",
  },
];

// ─────────────────────────────────────────────────────────────
// 1. HOME — selección de tema + nombre + ENTRAR.
// El usuario debe elegir uno de los 2 niveles ANTES de poder ingresar.
// Conserva el layout 2 columnas (logo izq, formulario der) del shell.
// ─────────────────────────────────────────────────────────────
function HomeScreen({ app, setApp, go }) {
  const visitors = useVisitorCount();
  const [name, setName] = useState(app.studentName || "");
  // El tema arranca sin selección — se exige clic explícito.
  const [level, setLevel] = useState(
    app.level && LEVELS_CFG.some((l) => l.id === app.level) ? app.level : null
  );

  const canStart = !!name.trim() && !!level;
  const currentCfg = LEVELS_CFG.find((l) => l.id === level) || null;

  function start() {
    if (!canStart) return;
    setApp((s) => ({
      ...s,
      studentName: name.trim(),
      level,
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

        {/* Derecha — saludo + chips de tema + descripción + nombre + ENTRAR */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 520 }}>
          <div>
            <div className="ed-label" style={{ color: "#4fd8ff", marginBottom: 6 }}>
              El taller de las letras
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

          {/* Chips de tema — 2 columnas. Cada chip muestra el glifo de letras
              grande arriba (estilo "tarjeta de letra" del libro escolar) y la
              etiqueta abajo. Selección visible con borde blanco y elevación. */}
          <div>
            <div className="ed-label" style={{ marginBottom: 8 }}>
              Selecciona un tema para jugar
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {LEVELS_CFG.map((lv) => {
                const active = level === lv.id;
                return (
                  <button
                    key={lv.id}
                    onClick={() => setLevel(lv.id)}
                    style={{
                      padding: "20px 12px",
                      borderRadius: 16,
                      background: lv.grad,
                      color: lv.ink,
                      fontFamily: "var(--ed-font-display)", fontWeight: 800,
                      fontSize: 22, letterSpacing: "0.02em",
                      lineHeight: 1.1,
                      textShadow: "0 1px 0 rgba(255,255,255,0.35)",
                      border: "none",
                      boxShadow: active
                        ? "inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -3px 0 rgba(0,0,0,0.2), 0 0 0 3px rgba(255,255,255,0.85), 0 0 26px rgba(255,255,255,0.35)"
                        : "inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -3px 0 rgba(0,0,0,0.18), 0 6px 14px -4px rgba(0,0,0,0.45)",
                      transform: active ? "translateY(-2px)" : "none",
                      transition: "all 0.18s ease",
                      cursor: "pointer",
                    }}
                  >
                    {lv.label}
                  </button>
                );
              })}
            </div>
            {/* Descripción del tema seleccionado (placeholder si no hay) */}
            <div style={{
              marginTop: 10,
              padding: "10px 14px",
              borderRadius: 12,
              background: "rgba(10,6,35,0.55)",
              border: `1px solid ${currentCfg ? "rgba(148,120,255,0.3)" : "rgba(148,120,255,0.18)"}`,
              fontFamily: "var(--ed-font-display)", fontWeight: 600,
              fontSize: 14, lineHeight: 1.3,
              color: currentCfg ? "#fce9a8" : "rgba(252,233,168,0.5)",
              textAlign: "center",
              fontStyle: currentCfg ? "normal" : "italic",
            }}>
              {currentCfg ? currentCfg.description : "Elige un tema para empezar."}
            </div>
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
                title={!name.trim() ? "Escribe tu nombre" : !level ? "Selecciona un tema" : ""}
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
// 2. SELECCIÓN DE PERSONAJE — idéntico al shell, default Rolli.
// Mapea el nivel elegido en Home al catId/catLabel que GameScreen
// usa para seleccionar banco de palabras, bandeja y copy.
// ─────────────────────────────────────────────────────────────
function CharacterScreen({ app, setApp, go }) {
  const [sel, setSel] = useState(app.character || "escritor");
  const current = CHARACTERS.find((c) => c.id === sel) || CHARACTERS[0];

  function choose() {
    const lvCfg = LEVELS_CFG.find((l) => l.id === app.level) || LEVELS_CFG[0];
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
