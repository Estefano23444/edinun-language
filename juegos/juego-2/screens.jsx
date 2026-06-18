// screens.jsx — HomeScreen + CharacterScreen + CosmosBg para "Juego 2".
// Tres niveles: La letra r · La noticia · El blog. Cada uno mapea a una
// categoría distinta que GameScreen lee para renderizar la mecánica.

const { useState, useEffect, useRef, useMemo } = React;

// ─────────────────────────────────────────────────────────────
// Fondo cósmico + glifos. Cosmic = home/character/results.
// Chalkboard = juego (cambia el set de glifos según el nivel desde
// GameScreen, pero acá usamos un set genérico de lenguaje).
// ─────────────────────────────────────────────────────────────
function CosmosBg({ variant = "cosmic", glyphSize }) {
  const glyphsStyle = glyphSize ? { fontSize: glyphSize + "px" } : undefined;
  if (variant === "chalkboard") {
    // Para chalkboard, GameScreen puede sobreescribir leyendo
    // window.__currentChalkGlyphs si se quiere por nivel. Por defecto,
    // glifos genéricos de lenguaje/comunicación.
    const glyphs = (typeof window !== "undefined" && window.__currentChalkGlyphs) || [
      { c: "📰", l: "6%",  t: "12%", r: "-8deg" },
      { c: "📝", l: "82%", t: "16%", r: "6deg",  s: "0.62em" },
      { c: "✏",  l: "10%", t: "78%", r: "12deg", s: "0.7em" },
      { c: "📌", l: "88%", t: "72%", r: "-10deg", s: "0.55em" },
      { c: "💬", l: "45%", t: "8%",  r: "4deg",  s: "0.5em" },
      { c: "?",  l: "3%",  t: "45%", r: "-4deg", s: "0.6em" },
      { c: "¿",  l: "92%", t: "45%", r: "8deg",  s: "0.58em" },
      { c: "¡",  l: "30%", t: "55%", r: "-6deg", s: "0.5em" },
      { c: "📖", l: "70%", t: "62%", r: "8deg",  s: "0.52em" },
      { c: "🗞", l: "55%", t: "30%", r: "-4deg", s: "0.46em" },
    ];
    return (
      <div
        style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at center, #3a9b7a 0%, #1d6b53 55%, #0b3a2d 100%)",
          overflow: "hidden",
        }}
      >
        <div className="ed-glyphs" style={{ color: "rgba(255,255,255,0.10)", ...glyphsStyle }}>
          {glyphs.map((g, i) => (
            <span key={i} style={{ left: g.l, top: g.t, "--rot": g.r, fontSize: g.s }}>{g.c}</span>
          ))}
        </div>
      </div>
    );
  }
  // Cosmic (home / character / results)
  return (
    <>
      <div className="ed-cosmos" />
      <div className="ed-glyphs" style={glyphsStyle}>
        <span style={{ left: "5%",  top: "10%", "--rot": "-8deg" }}>A</span>
        <span style={{ left: "84%", top: "6%",  "--rot": "6deg",  fontSize: "0.78em" }}>R</span>
        <span style={{ left: "92%", top: "72%", "--rot": "-12deg", fontSize: "0.74em" }}>📰</span>
        <span style={{ left: "3%",  top: "82%", "--rot": "12deg", fontSize: "0.91em" }}>💻</span>
        <span style={{ left: "46%", top: "4%",  "--rot": "-4deg", fontSize: "0.59em" }}>r</span>
        <span style={{ left: "7%",  top: "46%", "--rot": "-4deg", fontSize: "0.67em" }}>M</span>
        <span style={{ left: "88%", top: "40%", "--rot": "8deg",  fontSize: "0.65em" }}>📝</span>
        <span style={{ left: "22%", top: "22%", "--rot": "10deg", fontSize: "0.52em" }}>P</span>
        <span style={{ left: "70%", top: "24%", "--rot": "-6deg", fontSize: "0.57em" }}>L</span>
        <span style={{ left: "32%", top: "70%", "--rot": "8deg",  fontSize: "0.61em" }}>S</span>
        <span style={{ left: "62%", top: "78%", "--rot": "-10deg", fontSize: "0.63em" }}>T</span>
        <span style={{ left: "18%", top: "58%", "--rot": "14deg", fontSize: "0.48em" }}>?</span>
        <span style={{ left: "78%", top: "56%", "--rot": "-8deg", fontSize: "0.52em" }}>¡</span>
        <span style={{ left: "50%", top: "88%", "--rot": "4deg",  fontSize: "0.5em" }}>B</span>
        <span style={{ left: "40%", top: "38%", "--rot": "-6deg", fontSize: "0.54em" }}>N</span>
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
  const raw = localStorage.getItem(VISITOR_KEY);
  const v = raw ? parseInt(raw, 10) : 0;
  return isNaN(v) ? 0 : v;
}

function writeLocalVisitorCount(n) {
  localStorage.setItem(VISITOR_KEY, String(n));
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
  if (sessionStorage.getItem(VISITOR_SESSION_FLAG) === "1") return;
  sessionStorage.setItem(VISITOR_SESSION_FLAG, "1");

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
// Configuración de los 3 niveles. Cada nivel define su color,
// etiqueta (sin BÁSICO/MEDIO/AVANZADO — solo el tema), categoría
// interna (que GameScreen mapea a mecánica) y descripción breve.
// ─────────────────────────────────────────────────────────────
const LEVELS_CFG = [
  {
    id: "letraR",
    label: "La letra r",
    grad: "linear-gradient(180deg, #ffc06e, #e4881a)",
    ink: "#3a2608",
    description: "Atrapa la letra R en cada palabra.",
    catLabel: "La letra del ronroneo: rrrrrr",
  },
  {
    id: "noticia",
    label: "La noticia",
    grad: "linear-gradient(180deg, #ffe97a, #d7b12a)",
    ink: "#3a2608",
    description: "Reconoce las partes de una noticia.",
    catLabel: "La noticia",
  },
  {
    id: "blog",
    label: "El blog",
    grad: "linear-gradient(180deg, #7ab8ff, #2773d8)",
    ink: "#08264d",
    description: "Identifica los elementos de un blog.",
    catLabel: "El blog",
  },
];

// ─────────────────────────────────────────────────────────────
// 1. HomeScreen — logo + saludo + 3 botones de nivel + nombre + ENTRAR
// ─────────────────────────────────────────────────────────────
function HomeScreen({ app, setApp, go }) {
  const visitors = useVisitorCount();
  const [name, setName] = useState(app.studentName || "");
  // El tema arranca sin selección — el usuario debe elegir uno explícitamente
  // antes de poder ingresar al juego.
  const [level, setLevel] = useState(app.level || null);

  const canStart = !!name.trim() && !!level;

  function start() {
    if (!canStart) return;
    const cfg = LEVELS_CFG.find((l) => l.id === level) || LEVELS_CFG[0];
    setApp((s) => ({
      ...s,
      studentName: name.trim(),
      level,
      sessionStart: Date.now(),
    }));
    go("character");
  }

  const currentCfg = LEVELS_CFG.find((l) => l.id === level) || null;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* Contador de visitantes */}
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

      <div style={{
        position: "absolute", inset: 0,
        display: "grid", gridTemplateColumns: "1fr 1.15fr",
        alignItems: "center",
        padding: "40px 56px", gap: 40,
      }}>
        {/* Logo grande izq */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <EdinunLogo size={300} />
        </div>

        {/* Formulario der: saludo + 3 botones de nivel + descripción + nombre */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 520 }}>
          <div>
            <div className="ed-label" style={{ color: "#4fd8ff", marginBottom: 8 }}>
              Palabras, noticias y blogs
            </div>
            <h1 className="ed-h1" style={{ fontSize: 40, lineHeight: 1.05 }}>
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

          {/* 3 botones de tema — solo nombre del tema, sin BÁSICO/MEDIO/AVANZADO */}
          <div>
            <div className="ed-label" style={{ marginBottom: 10 }}>
              Selecciona un tema para jugar
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {LEVELS_CFG.map((lv) => {
                const active = level === lv.id;
                return (
                  <button
                    key={lv.id}
                    onClick={() => setLevel(lv.id)}
                    style={{
                      padding: "14px 6px",
                      borderRadius: 16,
                      background: lv.grad,
                      color: lv.ink,
                      fontFamily: "var(--ed-font-display)",
                      fontWeight: 700, fontSize: 15,
                      letterSpacing: "0.02em",
                      lineHeight: 1.1,
                      border: "none",
                      boxShadow: active
                        ? "inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -3px 0 rgba(0,0,0,0.2), 0 0 0 3px rgba(255,255,255,0.85), 0 0 24px rgba(255,255,255,0.32)"
                        : "inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -3px 0 rgba(0,0,0,0.18), 0 6px 14px -4px rgba(0,0,0,0.45)",
                      transform: active ? "translateY(-2px)" : "none",
                      transition: "all 0.18s ease",
                      textShadow: "0 1px 0 rgba(255,255,255,0.25)",
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
// 2. CharacterScreen — mapea el nivel al catLabel + lanza el juego.
// ─────────────────────────────────────────────────────────────
function CharacterScreen({ app, setApp, go }) {
  const [sel, setSel] = useState(app.character || "escritor");
  const current = CHARACTERS.find((c) => c.id === sel) || CHARACTERS[0];

  function choose() {
    const lvCfg = LEVELS_CFG.find((l) => l.id === (app.level || "letraR")) || LEVELS_CFG[0];
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

      <div style={{
        position: "absolute", inset: "92px 32px 24px 32px",
        display: "grid", gridTemplateColumns: "1fr 1.05fr", gap: 24, alignItems: "center",
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
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
