// screens.jsx — HomeScreen + CharacterScreen + CosmosBg para JUEGO-11
// "Mi refrán refranero" (TEMA 3 del libro EDINUN, 7 años).
// 1 nivel único, 3 rondas con mecánicas DISTINTAS (laboratorio · clasificar ·
// memoria). Tema: grupos consonánticos (con R: pr/br/cr/tr/dr/gr/fr ·
// con L: pl/bl/cl/gl/fl). Home sin chips de dificultad.

const { useState, useEffect, useRef, useMemo } = React;

// ─────────────────────────────────────────────────────────────
// Glifos del fondo — los grupos consonánticos del tema, como texto,
// + un par de sílabas trabadas para variar el ritmo visual.
// ─────────────────────────────────────────────────────────────
const CHALK_GLYPHS = [
  { c: "PR", l: "6%",  t: "12%", r: "-8deg" },
  { c: "BR", l: "82%", t: "16%", r: "6deg",  s: "0.62em" },
  { c: "TR", l: "10%", t: "78%", r: "12deg", s: "0.7em" },
  { c: "DR", l: "88%", t: "72%", r: "-10deg", s: "0.55em" },
  { c: "FR", l: "45%", t: "8%",  r: "4deg",  s: "0.5em" },
  { c: "PL", l: "3%",  t: "45%", r: "-4deg", s: "0.6em" },
  { c: "BL", l: "92%", t: "45%", r: "8deg",  s: "0.58em" },
  { c: "CL", l: "30%", t: "55%", r: "-6deg", s: "0.5em" },
  { c: "GL", l: "70%", t: "62%", r: "8deg",  s: "0.52em" },
  { c: "FL", l: "55%", t: "30%", r: "-4deg", s: "0.46em" },
];

const COSMIC_GLYPHS = [
  { c: "PR", l: "5%",  t: "10%", r: "-8deg" },
  { c: "BR", l: "84%", t: "6%",  r: "6deg",  s: "0.78em" },
  { c: "CR", l: "92%", t: "72%", r: "-12deg", s: "0.74em" },
  { c: "TR", l: "3%",  t: "82%", r: "12deg",  s: "0.91em" },
  { c: "DR", l: "46%", t: "4%",  r: "-4deg",  s: "0.59em" },
  { c: "GR", l: "7%",  t: "46%", r: "-4deg",  s: "0.67em" },
  { c: "FR", l: "88%", t: "40%", r: "8deg",   s: "0.65em" },
  { c: "PL", l: "22%", t: "22%", r: "10deg",  s: "0.52em" },
  { c: "BL", l: "70%", t: "24%", r: "-6deg",  s: "0.57em" },
  { c: "CL", l: "32%", t: "70%", r: "8deg",   s: "0.61em" },
  { c: "GL", l: "62%", t: "78%", r: "-10deg", s: "0.63em" },
  { c: "FL", l: "18%", t: "58%", r: "14deg",  s: "0.48em" },
  { c: "bla", l: "78%", t: "56%", r: "-8deg",  s: "0.52em" },
  { c: "tra", l: "50%", t: "88%", r: "4deg",   s: "0.5em" },
  { c: "gru", l: "40%", t: "38%", r: "-6deg",  s: "0.54em" },
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
// Contador de visitas — endpoint PHP del lado servidor con fallback localStorage.
// En servidores con PHP (Apache de edinun.com) muestra el conteo global real.
// En GitHub Pages / servidor estático sin PHP, el .php se sirve como texto
// plano → el fetch falla parseando JSON → caemos al contador localStorage
// (per-navegador, igual que la versión anterior). El localStorage también
// hace de caché del último valor servido por PHP para mostrar algo durante
// la primera carga / si el servidor está caído.
// ─────────────────────────────────────────────────────────────
const VISITOR_ENDPOINT = "counter.php"; // relativo a index.html del juego
const VISITOR_KEY = "edinun_visitors_v1";
const VISITOR_SESSION_FLAG = "edinun_visit_counted_v1";

async function fetchVisitorCount(opts) {
  const inc = opts && opts.increment;
  const url = inc ? VISITOR_ENDPOINT + "?inc=1" : VISITOR_ENDPOINT;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("counter http " + res.status);
  // Tolera dos contratos de servidor: JSON {"count": N} (counter.php de este
  // repo) o un numero plano "N" (contador.php legacy de otros juegos del mismo
  // server). Si el .php se sirve como texto ("<?php...") ambos parseos fallan
  // -> NaN -> throw -> el cliente cae a localStorage.
  const text = (await res.text()).trim();
  let count;
  try {
    const data = JSON.parse(text);
    count = data && typeof data.count === "number" ? data.count : Number(data);
  } catch (e) {
    count = Number(text);
  }
  if (!Number.isFinite(count)) throw new Error("counter invalid payload");
  return count;
}

function readLocalVisitorCount() {
  try {
    const raw = localStorage.getItem(VISITOR_KEY);
    const v = raw ? parseInt(raw, 10) : 0;
    return isNaN(v) ? 0 : v;
  } catch { return 0; }
}

function writeLocalVisitorCount(n) {
  try { localStorage.setItem(VISITOR_KEY, String(n)); } catch {}
}

function useVisitorCount() {
  const [n, setN] = useState(() => readLocalVisitorCount());

  useEffect(() => {
    let cancelled = false;
    // Lee del servidor al montar. Si falla, queda el valor cacheado en local.
    fetchVisitorCount()
      .then((count) => {
        if (cancelled) return;
        setN(count);
        writeLocalVisitorCount(count);
      })
      .catch(() => { /* fallback localStorage ya cargado en el initializer */ });

    function onUpdate(ev) {
      const value = ev && ev.detail && ev.detail.count;
      if (typeof value === "number") setN(value);
      else setN(readLocalVisitorCount());
    }
    window.addEventListener("edinun:visitors-updated", onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener("edinun:visitors-updated", onUpdate);
    };
  }, []);

  return n;
}

function markFirstAttempt() {
  try {
    if (sessionStorage.getItem(VISITOR_SESSION_FLAG) === "1") return;
    sessionStorage.setItem(VISITOR_SESSION_FLAG, "1");
  } catch {}

  fetchVisitorCount({ increment: true })
    .then((count) => {
      writeLocalVisitorCount(count);
      window.dispatchEvent(new CustomEvent("edinun:visitors-updated", { detail: { count } }));
    })
    .catch(() => {
      const next = readLocalVisitorCount() + 1;
      writeLocalVisitorCount(next);
      window.dispatchEvent(new CustomEvent("edinun:visitors-updated", { detail: { count: next } }));
    });
}

function incrementGamesCompleted() {
  const KEY = "edinun_games_completed_v1";
  let next = 1;
  try {
    const raw = localStorage.getItem(KEY);
    next = (raw ? parseInt(raw, 10) : 0) + 1;
    localStorage.setItem(KEY, String(next));
  } catch {}
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
    id: "refranes",
    label: "Mi refrán refranero",
    grad: "linear-gradient(180deg, #ffe97a, #d7b12a)",
    ink: "#3a2608",
    description: "Juega con los grupos consonánticos de los refranes.",
    catLabel: "Grupos consonánticos",
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
      level: "refranes",
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
              Mi refrán refranero
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
            Juega con los grupos consonánticos
            <br />
            <span style={{ color: "#ffd76e", fontSize: 16, letterSpacing: "0.04em" }}>
              pr · br · cr · tr · dr · gr · fr · pl · bl · cl · gl · fl
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
// 2. SELECCIÓN DE PERSONAJE — idéntico al shell. Default Márquez
// (narrador) porque encaja temáticamente con los refranes y la
// tradición oral.
// ─────────────────────────────────────────────────────────────
function CharacterScreen({ app, setApp, go }) {
  const [sel, setSel] = useState(app.character || "narrador");
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
