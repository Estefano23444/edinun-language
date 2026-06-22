// game-screens.jsx — GameScreen + ResultsScreen para JUEGO-21
// "Un mundo para soñar" (TEMA 1 del libro EDINUN, 13 años). 1 nivel, 3 rondas
// con mecánicas DISTINTAS (estándar 7+ años):
//   R1 — El umbral de los mundos: clasifica un microrrelato en lo extraño,
//        lo maravilloso o lo fantástico (tocar 1 de 3 + VERIFICAR).
//   R2 — La cadena del relato: ordena 5 escenas de un cuento (arrastrar).
//   R3 — La rueda de atributos: elige los 4 rasgos que resumen un concepto
//        y descarta los detalles/ejemplos (el arte de resumir).
//
// Todo el contenido es ORIGINAL (no se copian textos del libro). El shell
// (HUD, personaje, enunciado, action rail, modales, feedback, reporte,
// scoring por tiempo) se hereda del estándar. Personaje: Rolli (escritor).

const { useState: useStateG, useEffect: useEffectG, useRef: useRefG, useMemo: useMemoG } = React;

function PortalToBody({ children }) {
  return ReactDOM.createPortal(children, document.body);
}

// ─────────────────────────────────────────────────────────────
// Utilidades comunes
// ─────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Drag con fallback tap. Usa data-dropzone para detectar destinos.
function makeDragHandler({ item, ghostHtml, onTap, onDrop, disabled }) {
  return function onPointerDown(e) {
    if (disabled) return;
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    let started = false;
    let ghost = null;
    let currentZoneId = null;
    let lastX = startX, lastY = startY;
    const highlights = new Set();

    function clearHighlights() {
      for (const el of highlights) el.classList.remove("ed-drop-hover");
      highlights.clear();
    }
    function findZoneAt(x, y) {
      let prevVis = null;
      if (ghost) { prevVis = ghost.style.visibility; ghost.style.visibility = "hidden"; }
      const under = document.elementFromPoint(x, y);
      if (ghost) ghost.style.visibility = prevVis || "";
      if (!under || !under.closest) return null;
      const zone = under.closest("[data-dropzone]");
      return zone || null;
    }
    function onMove(ev) {
      const x = ev.clientX, y = ev.clientY;
      lastX = x; lastY = y;
      if (!started && Math.hypot(x - startX, y - startY) > 6) {
        started = true;
        ghost = document.createElement("div");
        ghost.style.cssText = "position:fixed;pointer-events:none;z-index:9999;transform:translate(-50%,-50%);transition:none;left:" + x + "px;top:" + y + "px;";
        ghost.innerHTML = ghostHtml || `<div style="background:#fce9a8;color:#3a2608;padding:6px 12px;border-radius:10px;font-family:Fredoka,Nunito,sans-serif;font-weight:800;font-size:13px;border:2px solid #4fd8ff;box-shadow:0 6px 18px rgba(0,0,0,0.5);">${String(item).slice(0,60)}</div>`;
        document.body.appendChild(ghost);
        document.body.style.cursor = "grabbing";
      }
      if (started && ghost) {
        ghost.style.left = x + "px";
        ghost.style.top = y + "px";
        clearHighlights();
        const zone = findZoneAt(x, y);
        if (zone) { zone.classList.add("ed-drop-hover"); highlights.add(zone); currentZoneId = zone.dataset.dropzone; }
        else { currentZoneId = null; }
      }
    }
    function onUp(ev) {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onCancel);
      let finalZone = currentZoneId;
      if (started && !finalZone) {
        const x = (ev && ev.clientX != null) ? ev.clientX : lastX;
        const y = (ev && ev.clientY != null) ? ev.clientY : lastY;
        const zone = findZoneAt(x, y);
        if (zone) finalZone = zone.dataset.dropzone;
      }
      if (ghost) { ghost.remove(); ghost = null; }
      document.body.style.cursor = "";
      clearHighlights();
      if (!started) { if (onTap) onTap(item); }
      else if (finalZone && onDrop) { onDrop(finalZone, item); }
    }
    function onCancel() {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onCancel);
      if (ghost) { ghost.remove(); ghost = null; }
      document.body.style.cursor = "";
      clearHighlights();
    }
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onCancel);
  };
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function calcStars(isCorrect, exerciseSec) {
  return isCorrect ? Math.max(1, 10 - Math.floor(exerciseSec / 3)) : 0;
}

const ENCOURAGEMENTS = [
  "¡Casi! Vuelve a mirar las pistas.",
  "Cada mundo tiene su propia regla 📖",
  "Lee de nuevo: la clave está en el texto.",
  "Equivocarse también es imaginar.",
  "¡La próxima historia es tuya!",
  "Respira y vuelve a intentarlo.",
  "Un buen lector mira los detalles.",
];

// ─────────────────────────────────────────────────────────────
// FIFO anti-repetición por categoría (mundo / cadena / rueda) en un
// solo key de localStorage. Ventana ≈ floor(N/2) por categoría.
// ─────────────────────────────────────────────────────────────
const RECENT_KEY = "edinun_juego21_recientes_v1";
const RECENT_LIMIT = 24;

function getRecent() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function pushRecent(key) {
  const arr = getRecent().filter((k) => k !== key);
  arr.unshift(key);
  const trimmed = arr.slice(0, RECENT_LIMIT);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(trimmed)); } catch {}
}
// Elige un ítem fresco bloqueando los ~floor(N/2) más recientes de su
// categoría; nunca vacía el pool y no repite la última jugada.
function pickFresh(bank, prefix, idOf) {
  const pre = prefix + ":";
  const recentIds = getRecent().filter((k) => k.startsWith(pre)).map((k) => k.slice(pre.length));
  const windowN = Math.floor(bank.length / 2);
  const blocked = new Set(recentIds.slice(0, windowN));
  let pool = bank.filter((b) => !blocked.has(idOf(b)));
  if (pool.length === 0) pool = bank;
  const p = pool[Math.floor(Math.random() * pool.length)];
  pushRecent(pre + idOf(p));
  return p;
}

// ═════════════════════════════════════════════════════════════
// BANCOS DE DATOS — TEMA 1 (literatura fantástica + resumen).
// Contenido 100% ORIGINAL. Vocabulario ecuatoriano neutro.
// ═════════════════════════════════════════════════════════════

// R1 — Clasificar microrrelatos. Cada relato lleva su MARCADOR que lo hace
// encajar en UNA sola categoría (regla pedagógica):
//   extrano    → al final hay explicación lógica.
//   maravilloso→ lo sobrenatural es lo normal de ese mundo (leyes propias).
//   fantastico → mundo real + irrupción inexplicable + duda.
const R1_CATS = [
  { id: "extrano",     label: "Lo extraño",     def: "Al final hay\nexplicación." },
  { id: "maravilloso", label: "Lo maravilloso", def: "La magia es\nlo normal allí." },
  { id: "fantastico",  label: "Lo fantástico",  def: "Algo imposible que\nsiembra la duda." },
];
const R1_BANK = [
  { id: "ext1", cat: "extrano",
    text: "Marcos oyó pasos en el techo toda la noche. Al amanecer descubrió que era una paloma atrapada entre las tejas.",
    clave: "Tiene una explicación lógica → es lo extraño." },
  { id: "ext2", cat: "extrano",
    text: "Una sombra enorme cruzó la ventana de Inés. Se asomó y vio que era el árbol del patio movido por el viento.",
    clave: "Lo raro se explica con la razón → es lo extraño." },
  { id: "ext3", cat: "extrano",
    text: "Daniel escuchó voces en la casa vacía. Luego entendió que era la radio del vecino, que había quedado encendida.",
    clave: "Hay una causa real y comprensible → es lo extraño." },
  { id: "mar1", cat: "maravilloso",
    text: "En el reino de Tármino los dragones reparten las cartas y, como cada mañana, a nadie le sorprende.",
    clave: "Lo sobrenatural es lo normal de ese mundo → es lo maravilloso." },
  { id: "mar2", cat: "maravilloso",
    text: "En la aldea de las nubes, las brujas cambian la lluvia por pétalos. Allí siempre ha sido así.",
    clave: "El mundo se rige por su propia magia → es lo maravilloso." },
  { id: "mar3", cat: "maravilloso",
    text: "En el bosque de Lúmina los animales conversan con la gente y nadie se asombra: es lo común desde siempre.",
    clave: "La magia no extraña a nadie ahí → es lo maravilloso." },
  { id: "fan1", cat: "fantastico",
    text: "Lucía cerró el libro y, al abrirlo, la última página estaba escrita con su propia letra. Jamás supo cómo.",
    clave: "Algo inexplicable irrumpe en su mundo real → es lo fantástico." },
  { id: "fan2", cat: "fantastico",
    text: "Mateo vio el reloj de la cocina marcar las trece y, por un instante, todo quedó detenido. Nunca supo si lo había imaginado.",
    clave: "Algo imposible irrumpe y le deja la duda → es lo fantástico." },
  { id: "fan3", cat: "fantastico",
    text: "Al mirarse al espejo, Sofía vio que su reflejo tardó un segundo en moverse. Nunca pudo entender por qué.",
    clave: "Un hecho imposible queda sin respuesta → es lo fantástico." },
];

// R2 — Ordenar 5 escenas de un microcuento de literatura fantástica
// (organizador de secuencia = el arte de resumir). Cada escena es breve para
// caber en la casilla. n = posición correcta (1..5).
const R2_BANK = [
  { id: "brujula", title: "La brújula",
    scenes: [
      "Daniel halló una brújula oxidada en un baúl viejo.",
      "Al girarla, apareció una puerta que no existía.",
      "Cruzó la puerta y llegó a una ciudad flotante.",
      "Un habitante le pidió que volviera al anochecer.",
      "Esperó el ocaso y la brújula se apagó para siempre.",
    ] },
  { id: "cuaderno", title: "El cuaderno",
    scenes: [
      "Valeria recibió un cuaderno totalmente en blanco.",
      "De noche, una historia se escribió sola en la hoja.",
      "Entre esas líneas, un personaje pedía ayuda.",
      "Valeria escribió una salida para salvarlo.",
      "Al amanecer, el cuaderno apareció firmado por ella.",
    ] },
  { id: "faro", title: "El faro",
    scenes: [
      "Un faro se encendía solo cada noche, sin nadie dentro.",
      "Tomás subió la escalera de caracol para investigar.",
      "Arriba encontró un reloj que giraba al revés.",
      "Cada vuelta del reloj devolvía un minuto al pasado.",
      "Tomás detuvo el reloj y el faro se apagó.",
    ] },
  { id: "semilla", title: "La semilla",
    scenes: [
      "Camila plantó una semilla gris que le regaló su abuela.",
      "Esa misma tarde brotó un árbol más alto que la casa.",
      "Entre las ramas crecían estrellas en vez de frutos.",
      "Camila tomó una estrella y la guardó en su bolsillo.",
      "Por la noche, su cuarto se llenó de luz propia.",
    ] },
  { id: "espejo", title: "El espejo del desván",
    scenes: [
      "Andrés halló un espejo cubierto de polvo en el desván.",
      "Al limpiarlo, vio en él un jardín que no era su casa.",
      "Estiró la mano y sus dedos atravesaron el cristal.",
      "Caminó entre flores que cantaban con voz suave.",
      "Al volver, el espejo solo reflejaba el desván vacío.",
    ] },
  { id: "carta", title: "La carta sin sello",
    scenes: [
      "Una carta sin sello apareció bajo la puerta de Lucía.",
      "Al abrirla, las palabras se movían como hormigas.",
      "Las letras formaron un mapa hacia el viejo molino.",
      "Lucía siguió el mapa y encontró una llave de plata.",
      "La llave abrió una puerta que el molino jamás tuvo.",
    ] },
];

// R3 — Rueda de atributos. correct = los 4 RASGOS que resumen el concepto;
// distract = DETALLES/EJEMPLOS concretos que NO son atributos generales (se
// descartan). El niño debe quedarse con los 4 atributos.
const R3_BANK = [
  { id: "cuento", concept: "El cuento fantástico",
    correct: ["Hechos inexplicables", "Rompe con lo real", "Deja una duda", "Mundo cotidiano"],
    distract: ["El héroe usa capa", "Tiene cinco capítulos", "Pasa en una noche"] },
  { id: "maravilloso", concept: "Lo maravilloso",
    correct: ["La magia es normal", "Tiene leyes propias", "Nadie se asombra", "Hay seres fantásticos"],
    distract: ["El mapa va al inicio", "Dura tres jornadas", "El rey es anciano"] },
  { id: "resumen", concept: "El resumen",
    correct: ["Toma las ideas clave", "Descarta los detalles", "Es más breve", "Guarda el sentido"],
    distract: ["Va en tinta azul", "Lleva título subrayado", "Ocupa media página"] },
  { id: "extrano", concept: "Lo extraño",
    correct: ["Algo raro al inicio", "Crea misterio", "Pasa en lo real", "Se explica al final"],
    distract: ["El gato es negro", "Sucede en otoño", "Llueve toda la tarde"] },
  { id: "fantastico", concept: "Lo fantástico",
    correct: ["Mezcla real y mágico", "Algo imposible irrumpe", "Siembra la duda", "Queda sin explicación"],
    distract: ["La casa es azul", "El reloj es antiguo", "Ocurre en domingo"] },
  { id: "narrador", concept: "El narrador",
    correct: ["Cuenta la historia", "Da una voz al relato", "Guía al lector", "Tiene un punto de vista"],
    distract: ["Usa lentes redondos", "Habla en voz baja", "Vive junto al río"] },
];

// ─────────────────────────────────────────────────────────────
// makeProblem por ronda
// ─────────────────────────────────────────────────────────────
function makeProblemR1() {
  const pick = pickFresh(R1_BANK, "mundo", (r) => r.id);
  return { ...pick };
}

function makeProblemR2() {
  const pick = pickFresh(R2_BANK, "cadena", (s) => s.id);
  const items = pick.scenes.map((label, i) => ({ id: `${pick.id}-${i}`, n: i + 1, label }));
  const byId = {};
  items.forEach((it) => { byId[it.id] = it; });
  return { storyId: pick.id, title: pick.title, items, byId };
}

function makeProblemR3() {
  const pick = pickFresh(R3_BANK, "rueda", (c) => c.id);
  const tray = shuffle([...pick.correct, ...pick.distract]);
  return { concept: pick.concept, correct: pick.correct, correctSet: new Set(pick.correct), tray };
}

// ═════════════════════════════════════════════════════════════
// Shell común: HUD, modales, action rail, feedback, personaje
// ═════════════════════════════════════════════════════════════
// Enunciado FIJO (absoluto) justo debajo de la fila RONDA — misma posición en
// las 3 rondas (estándar GameEnunciado). El ejercicio de cada ronda vive en una
// columna que arranca por debajo (top ≈ 112), así nunca queda una franja vacía
// entre RONDA y el enunciado aunque la ronda tenga poco contenido.
function GameEnunciado({ text, top = 82 }) {
  if (!text) return null;
  return (
    <div style={{
      position: "absolute", top, left: "50%", transform: "translateX(-50%)", width: 470,
      textAlign: "center",
      fontFamily: "var(--ed-font-display)", fontWeight: 700,
      fontSize: 17, lineHeight: 1.2,
      color: "#fff",
      textShadow: "0 2px 6px rgba(0,0,0,0.6)",
      pointerEvents: "none", zIndex: 5,
    }}>
      {text}
    </div>
  );
}

function GameHUD({ elapsed, stars, attempted, solved, total = 3, roundResults = [] }) {
  return (
    <>
      <div data-qa="hud" style={{
        position: "absolute", top: 10, left: 16, right: 16,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <EdinunLogoMini size={64} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(0,0,0,0.35)", borderRadius: 999, padding: "6px 12px",
            border: "1px solid rgba(242,194,96,0.4)", fontFamily: "var(--ed-font-mono)", fontSize: 13, color: "#fce9a8",
          }}>
            ⏱ {formatTime(elapsed)}
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(0,0,0,0.35)", borderRadius: 999, padding: "6px 12px",
            border: "1px solid rgba(242,194,96,0.4)", fontFamily: "var(--ed-font-display)", fontWeight: 600, color: "#fce9a8",
          }}>
            ⭐ {stars}
          </div>
        </div>
      </div>

      {/* Indicador de ronda — sin tabs de nivel (juego de 1 solo nivel). */}
      <div style={{
        position: "absolute", top: 54, left: "50%", transform: "translateX(-50%)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span className="ed-label" style={{ color: "rgba(255,255,255,0.7)" }}>Ronda</span>
        {Array.from({ length: total }).map((_, i) => {
          // Cada punto se pinta por el resultado REAL de su ronda (roundResults[i]),
          // no por el conteo acumulado: ronda 1 fallada + ronda 2 acertada ya no
          // se muestra invertido. Gris si la ronda aún no se ha jugado.
          const done = i < attempted;
          const ok = roundResults[i];
          return (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: "50%",
              background: done ? (ok ? "#fce9a8" : "#ff6b6b") : "rgba(255,255,255,0.2)",
              boxShadow: done ? "0 0 10px currentColor" : "none",
              color: ok ? "#fce9a8" : "#ff6b6b",
            }} />
          );
        })}
      </div>
    </>
  );
}

function RestartModal({ confirmingExit, setConfirmingExit, attempted, total, onRestart }) {
  if (!confirmingExit) return null;
  return (
    <PortalToBody>
      <div onClick={() => setConfirmingExit(false)} style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.62)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "ed-pop-in 0.18s", padding: 16,
      }}>
        <div onClick={(e) => e.stopPropagation()} className="ed-card"
          style={{ padding: 24, maxWidth: 440, textAlign: "center", boxShadow: "var(--ed-shadow-card), 0 0 40px rgba(255,107,107,0.3)" }}>
          <div className="ed-label" style={{ color: "#ff8b8b", marginBottom: 6 }}>Reiniciar juego</div>
          <h2 className="ed-h1" style={{ fontSize: 22, lineHeight: 1.15, marginBottom: 8 }}>¿Empezar de nuevo?</h2>
          <p className="ed-body" style={{ marginBottom: 16, fontSize: 14 }}>
            Vas a perder el progreso de esta ronda ({attempted}/{total}) y volverás a la primera.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button className="ed-btn ed-btn-ghost" onClick={() => setConfirmingExit(false)} style={{ height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
              SEGUIR JUGANDO
            </button>
            <button className="ed-btn ed-btn-primary" onClick={() => { setConfirmingExit(false); onRestart && onRestart(); }} style={{ height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
              SÍ, REINICIAR
            </button>
          </div>
        </div>
      </div>
    </PortalToBody>
  );
}

function ExitModal({ confirmingExit, setConfirmingExit, attempted, total, onExit }) {
  if (!confirmingExit) return null;
  return (
    <PortalToBody>
      <div onClick={() => setConfirmingExit(false)} style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.62)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "ed-pop-in 0.18s", padding: 16,
      }}>
        <div onClick={(e) => e.stopPropagation()} className="ed-card"
          style={{ padding: 24, maxWidth: 440, textAlign: "center", boxShadow: "var(--ed-shadow-card), 0 0 40px rgba(255,138,76,0.3)" }}>
          <div className="ed-label" style={{ color: "#ff8b4c", marginBottom: 6 }}>Volver al inicio</div>
          <h2 className="ed-h1" style={{ fontSize: 22, lineHeight: 1.15, marginBottom: 8 }}>¿Volver al inicio?</h2>
          <p className="ed-body" style={{ marginBottom: 16, fontSize: 14 }}>
            Vas a perder el progreso de esta ronda ({attempted}/{total}). No habrá reporte de esta sesión.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button className="ed-btn ed-btn-ghost" onClick={() => setConfirmingExit(false)} style={{ height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
              SEGUIR JUGANDO
            </button>
            <button className="ed-btn ed-btn-primary" onClick={() => { setConfirmingExit(false); onExit && onExit(); }} style={{ height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
              SÍ, SALIR
            </button>
          </div>
        </div>
      </div>
    </PortalToBody>
  );
}

function ActionRail({ canVerify, onVerify, hideVerify, showErase, onErase, onRestart, onExit }) {
  return (
    <div data-qa="acciones" style={{
      position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
      display: "flex", flexDirection: "column", gap: 10, width: 148,
    }}>
      {!hideVerify && (
        <button className="ed-btn ed-btn-verify"
          onClick={() => { if (canVerify && onVerify) onVerify(); }}
          disabled={!canVerify}
          style={{
            fontSize: 14, padding: "0 8px", height: 52, fontWeight: 800, letterSpacing: "0.04em",
            opacity: canVerify ? 1 : 0.45, cursor: canVerify ? "pointer" : "not-allowed",
          }}>
          ¡VERIFICAR!
        </button>
      )}
      {showErase && (
        <button className="ed-btn ed-btn-erase" onClick={onErase}
          style={{ fontSize: 14, padding: "0 8px", height: 52, fontWeight: 800, letterSpacing: "0.04em" }}>
          BORRAR
        </button>
      )}
      <button className="ed-btn ed-btn-restart" onClick={onRestart}
        style={{ fontSize: 14, padding: "0 8px", height: 52, fontWeight: 800, letterSpacing: "0.04em" }}>
        REINICIAR
      </button>
      <button className="ed-btn ed-btn-ghost" onClick={onExit}
        style={{ fontSize: 14, padding: "0 8px", height: 52, fontWeight: 800, letterSpacing: "0.04em" }}>
        SALIR
      </button>
    </div>
  );
}

function FeedbackOverlay({ feedback, feedbackMsg, charName }) {
  if (!feedback) return null;
  return (
    <PortalToBody>
      <div style={{
        position: "fixed", inset: 0, zIndex: 1000,
        pointerEvents: "none",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 14,
        background: "rgba(0,0,0,0.62)", backdropFilter: "blur(3px)",
        animation: "ed-pop-in 0.3s",
      }}>
        <div style={{
          fontFamily: "'Fredoka','Baloo 2',system-ui,sans-serif",
          fontWeight: 700, fontSize: "clamp(60px, 11vmin, 120px)",
          color: feedback === "ok" ? "#2ecc8f" : "#ff6b6b",
          textShadow: "0 4px 0 rgba(0,0,0,0.45), 0 0 60px currentColor",
        }}>
          {feedback === "ok" ? "¡EXCELENTE!" : "¡UPS!"}
        </div>
        {feedbackMsg && (
          <div style={{
            fontFamily: "'Fredoka','Baloo 2',system-ui,sans-serif",
            fontWeight: 700, fontSize: "clamp(16px, 2.4vmin, 26px)",
            color: feedback === "ok" ? "#fce9a8" : "#fff",
            background: "rgba(0,0,0,0.55)",
            padding: "8px 26px", borderRadius: 999,
            textShadow: "0 2px 6px rgba(0,0,0,0.6)",
            textAlign: "center", maxWidth: "80vw",
          }}>
            {feedback === "ok" ? feedbackMsg : `${feedbackMsg} — ${charName}`}
          </div>
        )}
      </div>
    </PortalToBody>
  );
}

function CharacterCorner({ char, message }) {
  return (
    <div data-qa="personaje" style={{
      position: "absolute", left: 8, bottom: 90, width: 220,
      pointerEvents: "none", textAlign: "center",
    }}>
      <div data-qa="bocadillo" className="ed-float-soft" style={{
        position: "absolute", left: 0, right: 0, bottom: "100%",
        display: "flex", justifyContent: "center",
        pointerEvents: "none",
      }}>
        <div style={{
          position: "relative",
          maxWidth: 208,
          background: "linear-gradient(180deg, rgba(20,12,55,0.95), rgba(10,6,35,0.95))",
          border: "1.5px solid rgba(242,194,96,0.65)",
          borderRadius: 16, padding: "10px 14px",
          fontFamily: "var(--ed-font-display)",
          fontWeight: 700, fontSize: 14, lineHeight: 1.25,
          color: "#fce9a8", textAlign: "center",
          whiteSpace: "pre-line",
          boxShadow: "0 10px 24px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}>
          {message}
          <div style={{
            position: "absolute", bottom: -10, left: "50%", transform: "translateX(-50%)",
            width: 0, height: 0,
            borderLeft: "9px solid transparent", borderRight: "9px solid transparent",
            borderTop: "10px solid rgba(20,12,55,0.95)",
            filter: "drop-shadow(0 1px 0 rgba(242,194,96,0.55))",
          }} />
        </div>
      </div>
      <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
        <div style={{
          position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)",
          width: 140, height: 16, borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(242,194,96,0.45), transparent 70%)",
          filter: "blur(5px)",
        }} />
        <char.Component size={190} floating />
      </div>
      <div style={{
        marginTop: -2,
        fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 14,
        color: "#fce9a8", letterSpacing: "0.04em",
        textShadow: "0 2px 6px rgba(0,0,0,0.6)",
      }}>{char.name}</div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// GameScreen — wrapper que permite REINICIAR remontando el juego.
// ═════════════════════════════════════════════════════════════
function GameScreen({ app, setApp, go }) {
  const [restartTick, setRestartTick] = useStateG(0);
  const restart = () => setRestartTick((t) => t + 1);
  return (
    <>
      <style>{`
        .ed-drop-hover {
          outline: 3px dashed #4fd8ff !important;
          outline-offset: 2px;
          box-shadow: 0 0 22px rgba(79,216,255,0.7) !important;
          background-color: rgba(79,216,255,0.18) !important;
          transition: all 0.12s ease;
        }
        .ed-draggable { touch-action: none; user-select: none; -webkit-user-select: none; }
      `}</style>
      <MundosGame key={`mundos-${restartTick}`} app={app} setApp={setApp} go={go} onRestart={restart} />
    </>
  );
}

function MundosGame({ app, setApp, go, onRestart }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const catLabel = app.currentCatLabel || "Literatura fantástica";

  const [ronda, setRonda] = useStateG(0);

  // Picks por ronda (una sola vez por montaje).
  const [r1Pick] = useStateG(() => makeProblemR1());
  const [r2Pick] = useStateG(() => makeProblemR2());
  const [r3Pick] = useStateG(() => makeProblemR3());

  // R1 — categoría elegida | null
  const [r1Choice, setR1Choice] = useStateG(null);
  const [r1Locked, setR1Locked] = useStateG(false);

  // R2 — orden: 5 casillas (id de escena | null)
  const [r2Slots, setR2Slots] = useStateG(() => Array(r2Pick.items.length).fill(null));
  const [r2Locked, setR2Locked] = useStateG(false);

  // R3 — rueda: 4 ranuras (rasgo | null)
  const [r3Slots, setR3Slots] = useStateG(() => Array(4).fill(null));
  const [r3Locked, setR3Locked] = useStateG(false);

  // Shell state
  const [elapsed, setElapsed] = useStateG(0);
  const [stars, setStars] = useStateG(0);
  const [solved, setSolved] = useStateG(0);
  const [attempted, setAttempted] = useStateG(0);
  const [starsSession, setStarsSession] = useStateG(0);
  const [feedback, setFeedback] = useStateG(null);
  const [feedbackMsg, setFeedbackMsg] = useStateG("");
  const [confirmingRestart, setConfirmingRestart] = useStateG(false);
  const [confirmingExit, setConfirmingExit] = useStateG(false);
  const [log, setLog] = useStateG([]);
  const started = useRefG(Date.now());
  const exerciseStart = useRefG(Date.now());

  useEffectG(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started.current) / 1000)), 500);
    return () => clearInterval(id);
  }, []);

  // ── Estados de completitud por ronda
  const r2AllPlaced = r2Slots.every(Boolean);
  const r3AllPlaced = r3Slots.every(Boolean);

  // R1 (clasificar, 1 opción) se AUTO-EVALÚA: al tocar un mundo se resalta y, tras
  // una breve ventana para recapacitar (~700 ms), se califica sola. Por eso su
  // VERIFICAR se oculta y su canVerify queda en false.
  const canVerify =
    ronda === 0 ? false :
    ronda === 1 ? (r2AllPlaced && !r2Locked) :
    ronda === 2 ? (r3AllPlaced && !r3Locked) :
    false;

  const r1AutoRef = useRefG(null);
  const gradeTimerRef = useRefG(null);
  const advanceTimerRef = useRefG(null);
  // Vivo mientras el componente esté montado; los timeouts pendientes lo
  // consultan y abortan al desmontar (REINICIAR remonta MundosGame con key nueva)
  // para no disparar setState/navegación sobre un árbol que ya no existe.
  const aliveRef = useRefG(true);
  useEffectG(() => () => {
    aliveRef.current = false;
    clearTimeout(r1AutoRef.current);
    clearTimeout(gradeTimerRef.current);
    clearTimeout(advanceTimerRef.current);
  }, []);

  // Califica la R1 con la opción tocada (mismo flujo que tenía VERIFICAR).
  function gradeR1(choiceId) {
    if (r1Locked) return;
    setR1Locked(true);
    const correct = choiceId === r1Pick.cat;
    const chosenLabel = (R1_CATS.find((c) => c.id === choiceId) || {}).label || "—";
    const correctLabel = (R1_CATS.find((c) => c.id === r1Pick.cat) || {}).label || "—";
    // Al fallar, unos segundos para ver cuál era la correcta (verde ✓). El "reto"
    // guarda el relato clasificado (antes era genérico) para reconstruir R1.
    gradeTimerRef.current = setTimeout(() => answer(correct, chosenLabel, correctLabel, "🌙", `«${r1Pick.text}»`, r1Pick.clave), correct ? 420 : 2500);
  }

  function handleVerify() {
    if (!canVerify) return;
    if (ronda === 1) {
      setR2Locked(true);
      let correct = true;
      for (let i = 0; i < r2Slots.length; i++) {
        const id = r2Slots[i];
        if (!id || r2Pick.byId[id].n !== i + 1) { correct = false; break; }
      }
      // Reporte reconstruible: en vez de códigos opacos ("1.3 2.1…"), guardar
      // el INICIO de cada escena, en el orden que puso el niño (userText) y en el
      // orden correcto 1→5 (correctText), para que un docente reconstruya R2.
      const sceneShort = (s) => s.replace(/[.,…]+$/, "").split(/\s+/).slice(0, 2).join(" ");
      const userText = r2Slots.map((id, i) => `${i + 1}.${id ? sceneShort(r2Pick.byId[id].label) : "—"}`).join("  ");
      const correctText = r2Pick.items.slice().sort((a, b) => a.n - b.n).map((it) => `${it.n}.${sceneShort(it.label)}`).join("  ");
      // R2 (ordenar 5 escenas): al fallar, dejamos las correcciones visibles
      // más tiempo antes del "¡UPS!" porque hay mucho texto que leer.
      gradeTimerRef.current = setTimeout(() => answer(correct, userText, correctText, "🧭", `ordenar "${r2Pick.title}"`, null), correct ? 420 : 3500);
    } else if (ronda === 2) {
      setR3Locked(true);
      const correct = r3Slots.every((w) => w && r3Pick.correctSet.has(w));
      // Conserva las ranuras vacías como "(vacío)" para que el reporte distinga
      // "puso un distractor" de "dejó una ranura sin llenar".
      const userText = r3Slots.map((w) => w || "(vacío)").join(" · ");
      const correctText = r3Pick.correct.join(" · ");
      // R3 (rueda): al fallar, dejamos las correcciones visibles más tiempo
      // (varias fichas + el ✓ del rasgo que faltó) para alcanzar a leerlas.
      gradeTimerRef.current = setTimeout(() => answer(correct, userText, correctText, "🎡", `rueda: ${r3Pick.concept}`, null), correct ? 420 : 3500);
    }
  }

  function handleErase() {
    if (ronda === 0) { if (r1Locked) return; setR1Choice(null); }
    // R2 (ordenar) usa REINICIAR, no BORRAR.
    else if (ronda === 2) { if (r3Locked) return; setR3Slots(Array(4).fill(null)); }
  }

  function answer(isCorrect, userText, correctText, opIcon, reto, note) {
    if (!aliveRef.current) return;
    if (typeof window.markFirstAttempt === "function") window.markFirstAttempt();
    const exerciseSec = Math.max(0, Math.floor((Date.now() - exerciseStart.current) / 1000));
    const earned = calcStars(isCorrect, exerciseSec);
    const newAttempted = attempted + 1;
    const newSolved = solved + (isCorrect ? 1 : 0);
    const newStarsTotal = stars + earned;
    const newStarsSession = starsSession + earned;

    const entry = {
      idx: newAttempted,
      a: reto || correctText, b: userText, op: opIcon || "·",
      correctAnswer: correctText, userAnswer: userText, note: note || "",
      isCorrect, time: exerciseSec, earned,
    };
    const newLog = [...log, entry];

    setFeedback(isCorrect ? "ok" : "err");
    // Igual que el resto de juegos: al acertar solo "+N ⭐"; al fallar, una
    // frase de ánimo. (La explicación queda en las correcciones del tablero.)
    setFeedbackMsg(isCorrect ? `+${earned} ⭐` : ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]);
    setAttempted(newAttempted);
    setSolved(newSolved);
    setStars(newStarsTotal);
    setStarsSession(newStarsSession);
    setLog(newLog);

    const wait = isCorrect ? 1100 : 1600;
    advanceTimerRef.current = setTimeout(() => {
      if (!aliveRef.current) return;
      setFeedback(null);
      setFeedbackMsg("");
      if (newAttempted >= 3) {
        setApp((s) => ({
          ...s, stars: newStarsTotal,
          lastResult: { category: catLabel, solved: newSolved, total: 3, time: elapsed, starsEarned: newStarsSession, log: newLog },
        }));
        window.incrementGamesCompleted && window.incrementGamesCompleted();
        go("results");
      } else {
        setRonda((r) => r + 1);
        exerciseStart.current = Date.now();
      }
    }, wait);
  }

  // Enunciado = QUÉ hacer (la tarea). Bocadillo = CÓMO (la mecánica).
  const enunciado =
    ronda === 0 ? "Decide a qué mundo pertenece el relato." :
    ronda === 1 ? "Ordena las escenas para reconstruir el cuento." :
    "Elige los 4 rasgos que resumen el concepto.";
  const bocadillo =
    ronda === 0 ? "Lee el relato y toca\nel mundo correcto." :
    ronda === 1 ? "Arrastra cada escena\na su lugar, del 1 al 5." :
    "¡Completa la rueda! Toca\nlos 4 rasgos que definen\nel concepto.";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <GameHUD elapsed={elapsed} stars={stars} attempted={attempted} solved={solved} total={3} roundResults={log.map((e) => e.isCorrect)} />
      <CharacterCorner char={char} message={bocadillo} />
      {/* R1 tiene poco contenido y arranca más abajo → bajamos su enunciado
          para que no quede pegado a RONDA. R2/R3 llenan más arriba, así que
          su enunciado se queda alto para no encimar el ejercicio. */}
      <GameEnunciado text={enunciado} top={ronda === 0 ? 116 : 82} />

      {ronda === 0 && (
        <MundoCard
          pick={r1Pick}
          chosen={r1Choice}
          locked={r1Locked}
          onChoose={(id) => {
            if (r1Locked) return;
            setR1Choice(id);
            // Resalta y, si no cambia de idea en ~700 ms, califica sola.
            clearTimeout(r1AutoRef.current);
            r1AutoRef.current = setTimeout(() => gradeR1(id), 700);
          }}
        />
      )}

      {ronda === 1 && (
        <CadenaCard
          pick={r2Pick}
          slots={r2Slots}
          setSlots={setR2Slots}
          locked={r2Locked}
        />
      )}

      {ronda === 2 && (
        <RuedaCard
          pick={r3Pick}
          slots={r3Slots}
          setSlots={setR3Slots}
          locked={r3Locked}
        />
      )}

      <ActionRail
        canVerify={canVerify}
        onVerify={handleVerify}
        hideVerify={ronda === 0}
        showErase={ronda === 2}
        onErase={handleErase}
        onRestart={() => setConfirmingRestart(true)}
        onExit={() => setConfirmingExit(true)}
      />

      <FeedbackOverlay feedback={feedback} feedbackMsg={feedbackMsg} charName={char.name} />
      <RestartModal confirmingExit={confirmingRestart} setConfirmingExit={setConfirmingRestart} attempted={attempted} total={3} onRestart={onRestart} />
      <ExitModal confirmingExit={confirmingExit} setConfirmingExit={setConfirmingExit} attempted={attempted} total={3} onExit={() => go("home")} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// R1 · El umbral de los mundos — cartel con el microrrelato + 3
// tarjetas de categoría. Tap una para elegir. Al fallar, la correcta
// se marca en verde con ✓ (feedback estándar).
// ─────────────────────────────────────────────────────────────
const MUNDO_COLOR = {
  extrano: "#4fa0ff",
  maravilloso: "#a78bfa",
  fantastico: "#ff8a3a",
};
function MundoCard({ pick, chosen, locked, onChoose }) {
  return (
    <div data-qa="zona-central" style={{
      position: "absolute", top: 116, bottom: 16, left: "50%", transform: "translateX(-50%)",
      width: 440, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
    }}>
      {/* Cartel del relato (héroe) — ancho ≤420 para despejar a Rolli y, al ser
          más angosto, más alto → llena mejor el espacio. */}
      <div style={{
        width: "100%", maxWidth: 420,
        padding: "22px 26px", borderRadius: 18,
        background: "linear-gradient(180deg, rgba(255,255,255,0.97), rgba(240,235,225,0.92))",
        border: "3px solid #f2c260",
        boxShadow: "0 12px 28px rgba(0,0,0,0.4), inset 0 -4px 0 rgba(0,0,0,0.06)",
        fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 18, lineHeight: 1.45,
        color: "#3a2608", textAlign: "center",
      }}>
        <span style={{ fontSize: 24, marginRight: 4 }}>“</span>{pick.text}<span style={{ fontSize: 24, marginLeft: 2 }}>”</span>
      </div>

      {/* 3 tarjetas de categoría */}
      <div data-qa="bandeja" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "nowrap" }}>
        {R1_CATS.map((c) => {
          const isChosen = chosen === c.id;
          const isAnswer = locked && c.id === pick.cat;
          const isWrongPick = locked && isChosen && c.id !== pick.cat;
          const color = MUNDO_COLOR[c.id];
          let bg, ink, border;
          if (isAnswer) { bg = "linear-gradient(180deg,#2ecc8f,#22a06c)"; ink = "#fff"; border = "#2ecc8f"; }
          else if (isWrongPick) { bg = "linear-gradient(180deg,#ff6b6b,#dc5050)"; ink = "#fff"; border = "#ff6b6b"; }
          else if (isChosen) { bg = "linear-gradient(180deg,#fce9a8,#e9c45a)"; ink = "#3a2608"; border = "#4fd8ff"; }
          else { bg = "rgba(255,255,255,0.94)"; ink = "#3a2608"; border = color; }
          return (
            <button key={c.id}
              onClick={() => { if (!locked) onChoose(c.id); }}
              disabled={locked}
              style={{
                position: "relative",
                width: 128, minHeight: 96, padding: "11px 7px", borderRadius: 14,
                border: `2.5px solid ${border}`, background: bg, color: ink,
                cursor: locked ? "default" : "pointer",
                fontFamily: "var(--ed-font-display)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5,
                boxShadow: isChosen || isAnswer ? "0 6px 16px rgba(0,0,0,0.35)" : "0 3px 8px rgba(0,0,0,0.25)",
                transform: (isChosen || isAnswer) ? "translateY(-2px)" : "none",
                transition: "all 0.15s ease",
              }}>
              <div style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.1 }}>{c.label}</div>
              <div style={{
                fontWeight: 700, fontSize: 11, lineHeight: 1.18, whiteSpace: "pre-line",
                // Concepto en el color del mundo (distinto a la etiqueta oscura).
                // En estados marcados (bg de color) va en blanco para contraste.
                color: (isChosen || isAnswer || isWrongPick) ? "rgba(255,255,255,0.92)" : color,
              }}>{c.def}</div>
              {isAnswer && !isChosen && (
                <span style={{
                  position: "absolute", top: -8, right: -8, width: 24, height: 24, borderRadius: "50%",
                  background: "#2ecc8f", color: "#fff", fontSize: 15, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "2px solid #fff", boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                }}>✓</span>
              )}
              {/* Marca TAMBIÉN con ✗ rojo la opción que eligió el niño (no solo
                  por color), igual que el ✓ verde de la correcta: se ven AMBAS. */}
              {isWrongPick && (
                <span style={{
                  position: "absolute", top: -8, right: -8, width: 24, height: 24, borderRadius: "50%",
                  background: "#ff6b6b", color: "#fff", fontSize: 15, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "2px solid #fff", boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                }}>✗</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// R2 · La cadena del relato — ordenar 5 escenas en casillas 1..5.
// Drag + re-arrastre + bandeja para devolver (patrón OrderRound).
// ─────────────────────────────────────────────────────────────
function CadenaCard({ pick, slots, setSlots, locked }) {
  const items = pick.items;
  const byId = pick.byId;
  const TRAY = "__tray-cad";
  const SLOT_PRE = "slot-cad-";
  const [shuffled] = useStateG(() => shuffle(items.map((c) => c.id)));

  function placeZone(zoneId, cardId) {
    if (locked) return;
    setSlots((prev) => {
      const s = prev.slice();
      const cur = s.indexOf(cardId);
      if (cur !== -1) s[cur] = null;
      if (zoneId === TRAY) return s;
      if (zoneId.indexOf(SLOT_PRE) !== 0) return s;
      const idx = parseInt(zoneId.slice(SLOT_PRE.length), 10);
      if (isNaN(idx)) return s;
      s[idx] = cardId;
      return s;
    });
  }
  function tapCard(cardId) {
    if (locked) return;
    setSlots((prev) => {
      const s = prev.slice();
      const cur = s.indexOf(cardId);
      if (cur !== -1) { s[cur] = null; return s; }
      const empty = s.indexOf(null);
      if (empty !== -1) s[empty] = cardId;
      return s;
    });
  }
  // inSlot=false → tarjeta angosta para la bandeja (2 columnas).
  // inSlot=true  → tarjeta ancha dentro de la casilla (menos líneas → casillas
  //                más bajas, entran las 5 con su corrección).
  const card = (id, ok, inSlot) => {
    const c = byId[id];
    if (!c) return null;
    return (
      <div key={id}
        className={locked ? "" : "ed-draggable"}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={locked ? undefined : makeDragHandler({
          item: id, disabled: locked,
          ghostHtml: `<div style="background:linear-gradient(180deg,#fce9a8,#e9c45a);color:#3a2608;padding:8px 14px;border-radius:10px;font-family:Fredoka,Nunito,sans-serif;font-weight:700;font-size:13px;border:2px solid #4fd8ff;box-shadow:0 8px 20px rgba(0,0,0,0.5);max-width:240px;text-align:center;">${c.label}</div>`,
          onTap: tapCard, onDrop: placeZone,
        })}
        style={{
          padding: "5px 9px", borderRadius: 10, textAlign: "center",
          minWidth: inSlot ? 240 : 180, maxWidth: inSlot ? 296 : 196,
          background: locked ? (ok ? "linear-gradient(180deg,#2ecc8f,#22a06c)" : "linear-gradient(180deg,#ff6b6b,#dc5050)") : "rgba(255,255,255,0.95)",
          color: locked ? "#fff" : "#3a2608", boxShadow: "0 3px 8px rgba(0,0,0,0.28)",
          cursor: locked ? "default" : "grab", touchAction: "none",
        }}>
        <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 11.5, lineHeight: 1.13 }}>
          {locked ? (ok ? "✓ " : "✗ ") : ""}{c.label}
        </div>
      </div>
    );
  };
  return (
    <div style={{
      // Al verificar (locked) ocultamos la bandeja y damos más alto vertical,
      // porque cada casilla crece con su corrección "✓ Aquí va: …".
      position: "absolute", top: locked ? 94 : 112, bottom: locked ? 8 : 14, left: "50%", transform: "translateX(-50%)",
      width: 440, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
    }}>
      {/* Bandeja: escenas por colocar (también zona para devolver). Solo
          mientras NO se ha verificado — después estorba y quita espacio a las
          correcciones. Ancho 420 → despeja el bocadillo de Rolli. */}
      {!locked && (
        <div data-dropzone={TRAY} data-qa="bandeja" style={{
          display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "center", alignItems: "center",
          minHeight: 44, width: 420, borderRadius: 14, padding: "8px 6px",
          background: "rgba(10,6,35,0.32)", border: "1.5px dashed rgba(167,139,250,0.45)",
        }}>
          {shuffled.filter((id) => !slots.includes(id)).map((id) => card(id, null))}
          {slots.every(Boolean) && (
            <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 14, color: "rgba(255,255,255,0.7)", pointerEvents: "none" }}>
              ¡Listo! Pulsa VERIFICAR.
            </div>
          )}
        </div>
      )}

      {/* Casillas numeradas 1..5 */}
      <div data-qa="zona-central" style={{ display: "flex", flexDirection: "column", gap: locked ? 6 : 5, alignItems: "center" }}>
        {slots.map((id, i) => {
          const ok = (locked && id) ? (byId[id].n === i + 1) : null;
          const correcta = (locked && !ok) ? items.find((c) => c.n === i + 1) : null;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 30, height: 30, flexShrink: 0, borderRadius: 8,
                background: "#a78bfa", color: "#1a0a3a", fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 16,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{i + 1}</div>
              <div data-dropzone={`${SLOT_PRE}${i}`}
                style={{
                  width: 320, minHeight: 38, borderRadius: 12, padding: "3px 8px",
                  background: "rgba(10,6,35,0.4)",
                  border: `2px dashed ${id ? "rgba(167,139,250,0.25)" : "rgba(167,139,250,0.6)"}`,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                }}>
                {id ? card(id, ok, true) : (
                  <span style={{ fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 12, color: "rgba(252,233,168,0.4)", pointerEvents: "none" }}>
                    Suelta aquí la escena {i + 1}
                  </span>
                )}
                {correcta && (
                  <div style={{
                    fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 10.5,
                    color: "#7dffc4", lineHeight: 1.12, textAlign: "center", pointerEvents: "none",
                  }}>
                    ✓ Aquí va: {correcta.label}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// R3 · La rueda de atributos — concepto al centro + 4 ranuras (N/S/E/O)
// + banco de fichas (4 atributos correctos + 3 detalles trampa). Tap una
// ficha → llena la siguiente ranura libre; tap ranura → la devuelve.
// Drag a una ranura concreta también funciona. Al verificar: cada ranura
// se marca verde (rasgo correcto) o roja (detalle). Los detalles que se
// dejaron en el banco NO se marcan en rojo (estándar). Si faltó un rasgo,
// se resalta en el banco con ✓ verde.
// ─────────────────────────────────────────────────────────────
function RuedaCard({ pick, slots, setSlots, locked }) {
  const TRAY = "__tray-rueda";
  const SLOT_PRE = "slot-rueda-";

  function placeZone(zoneId, chip) {
    if (locked) return;
    setSlots((prev) => {
      const s = prev.slice();
      const cur = s.indexOf(chip);
      if (cur !== -1) s[cur] = null;
      if (zoneId === TRAY) return s;
      if (zoneId.indexOf(SLOT_PRE) !== 0) return s;
      const idx = parseInt(zoneId.slice(SLOT_PRE.length), 10);
      if (isNaN(idx)) return s;
      s[idx] = chip;
      return s;
    });
  }
  function tapChip(chip) {
    if (locked) return;
    setSlots((prev) => {
      const s = prev.slice();
      const cur = s.indexOf(chip);
      if (cur !== -1) { s[cur] = null; return s; }
      const empty = s.indexOf(null);
      if (empty !== -1) s[empty] = chip;
      return s;
    });
  }

  const bank = pick.tray.filter((w) => !slots.includes(w));

  // ¿Acertó? Las 4 ranuras llenas y todas con rasgo correcto (misma regla que
  // el scoring de R3). Si NO, al bloquear revelamos los 4 rasgos correctos en
  // un cartel verde "✓" — mismo look que el "✓ Aquí va" de R2 — para que la
  // respuesta quede clara aunque las fichas correctas hayan quedado en el banco.
  const acerto = slots.every((w) => w && pick.correctSet.has(w));

  // Posiciones de las 4 ranuras alrededor del centro (N, E, S, O).
  // Ancho 420 → la ranura Oeste (x≈240) despeja el bocadillo/cuerpo de Rolli.
  const W = 420, H = 232;
  const slotPos = [
    { left: "50%", top: 0, tx: "-50%", ty: "0" },           // 0 arriba
    { right: 0, top: "50%", tx: "0", ty: "-50%" },          // 1 derecha
    { left: "50%", bottom: 0, tx: "-50%", ty: "0" },        // 2 abajo
    { left: 0, top: "50%", tx: "0", ty: "-50%" },           // 3 izquierda
  ];
  const SLOT_W = 128;

  function chipNode(chip, where) {
    // where: "bank" | índice de ranura
    const inSlot = where !== "bank";
    const ok = locked && inSlot ? pick.correctSet.has(chip) : null;
    return (
      <div
        className={locked ? "" : "ed-draggable"}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={locked ? undefined : makeDragHandler({
          item: chip,
          ghostHtml: `<div style="background:linear-gradient(180deg,#fce9a8,#e9c45a);color:#3a2608;padding:7px 12px;border-radius:10px;font-family:Fredoka,Nunito,sans-serif;font-weight:800;font-size:13px;border:2px solid #4fd8ff;box-shadow:0 8px 20px rgba(0,0,0,0.5);max-width:150px;text-align:center;">${chip}</div>`,
          onTap: tapChip, onDrop: placeZone,
        })}
        style={{
          padding: "6px 8px", borderRadius: 9, textAlign: "center", width: "100%",
          fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 12.5, lineHeight: 1.12,
          background: locked && inSlot
            ? (ok ? "linear-gradient(180deg,#2ecc8f,#22a06c)" : "linear-gradient(180deg,#ff6b6b,#dc5050)")
            : "rgba(255,255,255,0.95)",
          color: locked && inSlot ? "#fff" : "#3a2608",
          boxShadow: "0 3px 8px rgba(0,0,0,0.28)",
          cursor: locked ? "default" : "grab", touchAction: "none",
        }}>
        {locked && inSlot ? (ok ? "✓ " : "✗ ") : ""}{chip}
      </div>
    );
  }

  return (
    <div style={{
      position: "absolute", top: 112, bottom: 14, left: "50%", transform: "translateX(-50%)",
      width: 440, display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
    }}>
      {/* La rueda */}
      <div data-qa="zona-central" style={{ position: "relative", width: W, height: H }}>
        {/* Radios (líneas) detrás de todo */}
        <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}>
          <line x1={W/2} y1={H/2} x2={W/2} y2={26} stroke="rgba(167,139,250,0.55)" strokeWidth="3" />
          <line x1={W/2} y1={H/2} x2={W-128} y2={H/2} stroke="rgba(167,139,250,0.55)" strokeWidth="3" />
          <line x1={W/2} y1={H/2} x2={W/2} y2={H-26} stroke="rgba(167,139,250,0.55)" strokeWidth="3" />
          <line x1={W/2} y1={H/2} x2={128} y2={H/2} stroke="rgba(167,139,250,0.55)" strokeWidth="3" />
        </svg>

        {/* Concepto central */}
        <div style={{
          position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)",
          width: 132, minHeight: 66, borderRadius: "50% / 44%", padding: "10px 10px",
          background: "linear-gradient(180deg,#b794ff,#6c4fd1)",
          border: "3px solid #fce9a8",
          display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center",
          fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 15, lineHeight: 1.15, color: "#fff",
          boxShadow: "0 8px 22px rgba(0,0,0,0.45)", zIndex: 2,
        }}>{pick.concept}</div>

        {/* 4 ranuras */}
        {slots.map((chip, i) => {
          const p = slotPos[i];
          return (
            <div key={i}
              data-dropzone={`${SLOT_PRE}${i}`}
              style={{
                position: "absolute",
                left: p.left, right: p.right, top: p.top, bottom: p.bottom,
                transform: `translate(${p.tx}, ${p.ty})`,
                width: SLOT_W, minHeight: 46, borderRadius: 12, padding: 5,
                background: chip ? "transparent" : "rgba(10,6,35,0.45)",
                border: `2px dashed ${chip ? "rgba(167,139,250,0.2)" : "rgba(167,139,250,0.65)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 3,
              }}>
              {chip ? chipNode(chip, i) : (
                <span style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 12, color: "rgba(252,233,168,0.45)", pointerEvents: "none" }}>
                  rasgo
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Revelación: al fallar, mostramos los 4 rasgos correctos en verde
          (mismo "✓ verde" de R1/R2) para que la respuesta quede explícita. */}
      {locked && !acerto && (
        <div data-qa="revela-correcta" style={{
          width: 420, borderRadius: 12, padding: "8px 12px",
          background: "rgba(46,204,143,0.16)", border: "1.5px solid #2ecc8f",
          display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", alignItems: "center",
        }}>
          <span style={{ fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 12.5, color: "#7dffc4" }}>
            Correctos:
          </span>
          {pick.correct.map((attr) => (
            <span key={attr} style={{
              fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 12,
              color: "#fff", background: "linear-gradient(180deg,#2ecc8f,#22a06c)",
              borderRadius: 8, padding: "3px 9px",
            }}>✓ {attr}</span>
          ))}
        </div>
      )}

      {/* Banco de fichas (también zona para devolver). Ancho 420 + caja
          translúcida → despeja a Rolli a la izquierda. */}
      <div data-dropzone={TRAY} data-qa="bandeja" style={{
        display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "center", alignItems: "center",
        minHeight: 44, width: 420, borderRadius: 14, padding: "8px 6px",
        background: "rgba(10,6,35,0.28)", border: "1.5px dashed rgba(167,139,250,0.4)",
      }}>
        {bank.length === 0 && (
          <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 14, color: "rgba(255,255,255,0.7)", pointerEvents: "none" }}>
            Rueda completa. Pulsa VERIFICAR.
          </div>
        )}
        {bank.map((chip) => {
          const missed = locked && pick.correctSet.has(chip); // rasgo correcto no usado
          return (
            <div key={chip} style={{ position: "relative", width: 128 }}>
              {chipNode(chip, "bank")}
              {missed && (
                <span style={{
                  position: "absolute", top: -8, right: -8, width: 22, height: 22, borderRadius: "50%",
                  background: "#2ecc8f", color: "#fff", fontSize: 14, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "2px solid #fff", boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                }}>✓</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// RESULTS — Reporte académico imprimible (estructura estándar).
// ═════════════════════════════════════════════════════════════
function formatOp(e) {
  return `${e.op || "·"}  ${String(e.a).slice(0, 60)}`;
}

const printStyles = {
  doc: { padding: 0, margin: 0, color: "#111", background: "#fff" },
  head: { display: "flex", alignItems: "center", gap: 14, borderBottom: "2px solid #d9a441", paddingBottom: 10, marginBottom: 14 },
  logo: { width: 56, height: 56, objectFit: "contain" },
  title: { flex: 1, minWidth: 0 },
  org: { fontFamily: "'Fredoka','Baloo 2','Nunito',sans-serif", fontWeight: 700, fontSize: "16pt", letterSpacing: "0.03em", lineHeight: 1.1, margin: 0 },
  sub: { fontSize: "9pt", color: "#555", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 4 },
  date: { fontFamily: "ui-monospace,Consolas,monospace", fontSize: "10pt", color: "#555", textAlign: "right", whiteSpace: "nowrap" },
  fields: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 },
  field: { padding: "8px 10px", borderRadius: 6, border: "1px solid #ddd" },
  fieldL: { fontSize: "8pt", textTransform: "uppercase", letterSpacing: "0.08em", color: "#666" },
  fieldV: { fontSize: "12pt", fontWeight: 700, marginTop: 2 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "11pt" },
  thHead: { borderBottom: "2px solid #111" },
  th: { padding: 8, textAlign: "left", fontSize: "9pt", textTransform: "uppercase", letterSpacing: "0.08em", color: "#555", fontWeight: 700 },
  thR: { textAlign: "right" },
  thC: { textAlign: "center" },
  tr: { borderBottom: "1px solid #ccc" },
  td: { padding: "9px 8px", fontFamily: "ui-monospace,Consolas,monospace" },
  tdNum: { color: "#888", width: 36 },
  tdOp: { fontWeight: 700 },
  tdR: { textAlign: "right" },
  tdC: { textAlign: "center", fontFamily: "'Nunito',sans-serif", fontWeight: 700 },
  tdDim: { color: "#888" },
  tdOk: { color: "#1e8a5d" },
  tdErr: { color: "#c33b3b" },
  tdEmpty: { padding: 24, textAlign: "center", color: "#888", fontStyle: "italic" },
  summary: { marginTop: 16, borderTop: "2px solid #d9a441", paddingTop: 12, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 },
  cell: { padding: 10, borderRadius: 6, border: "1px solid #ddd", textAlign: "center" },
  cellEmp: { background: "#faf3df", borderColor: "#d9a441" },
  cellL: { fontSize: "8pt", textTransform: "uppercase", letterSpacing: "0.08em", color: "#666" },
  cellV: { fontSize: "18pt", fontWeight: 800, marginTop: 4 },
  foot: { marginTop: 16, fontSize: "9pt", color: "#888", textAlign: "center" },
};

function PrintableReport({ studentName, res, dateStr, m, s, attemptedCount, totalEx, accuracy }) {
  const log = res.log || [];
  return (
    <PortalToBody>
      <div className="ed-print-doc" style={printStyles.doc} aria-hidden="true">
        <div style={printStyles.head}>
          <img src="assets/edinun-logo.png" alt="" style={printStyles.logo} />
          <div style={printStyles.title}>
            <h1 style={printStyles.org}>EDINUN — Ediciones Nacionales Unidas</h1>
            <div style={printStyles.sub}>Reporte académico · Juegos de Lenguaje</div>
          </div>
          <div style={printStyles.date}>{dateStr}</div>
        </div>
        <div style={printStyles.fields}>
          <div style={printStyles.field}><div style={printStyles.fieldL}>Estudiante</div><div style={printStyles.fieldV}>{studentName || "—"}</div></div>
          <div style={printStyles.field}><div style={printStyles.fieldL}>Categoría</div><div style={printStyles.fieldV}>{res.category || "—"}</div></div>
          <div style={printStyles.field}><div style={printStyles.fieldL}>Tiempo total</div><div style={printStyles.fieldV}>{String(m).padStart(2,"0")}:{String(s).padStart(2,"0")}</div></div>
        </div>
        <table style={printStyles.table}>
          <thead>
            <tr style={printStyles.thHead}>
              <th style={printStyles.th}>#</th>
              <th style={printStyles.th}>Reto</th>
              <th style={{ ...printStyles.th, ...printStyles.thR }}>Tu respuesta</th>
              <th style={{ ...printStyles.th, ...printStyles.thR }}>Respuesta correcta</th>
              <th style={{ ...printStyles.th, ...printStyles.thC }}>Estado</th>
              <th style={{ ...printStyles.th, ...printStyles.thR }}>Tiempo</th>
            </tr>
          </thead>
          <tbody>
            {log.map((e) => (
              <tr key={e.idx} style={printStyles.tr}>
                <td style={{ ...printStyles.td, ...printStyles.tdNum }}>{e.idx}</td>
                <td style={{ ...printStyles.td, ...printStyles.tdOp }}>{e.op || ""} {String(e.a).slice(0, 60)}</td>
                <td style={{ ...printStyles.td, ...printStyles.tdR }}>{String(e.userAnswer).slice(0, 90)}</td>
                <td style={{ ...printStyles.td, ...printStyles.tdR }}>{String(e.correctAnswer).slice(0, 90)}</td>
                <td style={{ ...printStyles.td, ...printStyles.tdC, ...(e.isCorrect ? printStyles.tdOk : printStyles.tdErr) }}>
                  {e.isCorrect ? "Correcto" : "Incorrecto"}
                </td>
                <td style={{ ...printStyles.td, ...printStyles.tdR, ...printStyles.tdDim }}>{e.time}s</td>
              </tr>
            ))}
            {log.length === 0 && (
              <tr><td colSpan={6} style={printStyles.tdEmpty}>No se registraron ejercicios en esta sesión.</td></tr>
            )}
          </tbody>
        </table>
        <div style={printStyles.summary}>
          <div style={printStyles.cell}><div style={printStyles.cellL}>Ejercicios</div><div style={printStyles.cellV}>{attemptedCount} / {totalEx}</div></div>
          <div style={printStyles.cell}><div style={printStyles.cellL}>Correctos</div><div style={printStyles.cellV}>{res.solved}</div></div>
          <div style={printStyles.cell}><div style={printStyles.cellL}>Estrellas</div><div style={printStyles.cellV}>{res.starsEarned}</div></div>
          <div style={{ ...printStyles.cell, ...printStyles.cellEmp }}><div style={printStyles.cellL}>Precisión total</div><div style={printStyles.cellV}>{accuracy}%</div></div>
        </div>
        <div style={printStyles.foot}>EDINUN GAMES · Reporte generado automáticamente</div>
      </div>
    </PortalToBody>
  );
}

function ResultsScreen({ app, setApp, go }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const res = app.lastResult || { category: "Literatura fantástica", solved: 0, total: 3, time: 0, starsEarned: 0, log: [] };
  const m = Math.floor(res.time / 60), s = res.time % 60;
  const totalEx = res.total || 3;
  const attemptedCount = (res.log || []).length;
  const accuracy = attemptedCount > 0 ? Math.round((res.solved / attemptedCount) * 100) : 0;
  const dateStr = new Date().toLocaleDateString("es-EC", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 14, left: 24, right: 24, display: "flex", justifyContent: "flex-start", alignItems: "center" }}>
        <button className="ed-btn ed-btn-ghost" onClick={() => go("home")} style={{ padding: "8px 14px", fontWeight: 800, letterSpacing: "0.04em" }}>← VOLVER AL INICIO</button>
      </div>
      <div style={{
        position: "absolute", inset: "70px 32px 20px 32px",
        display: "grid", gridTemplateColumns: "0.85fr 1.4fr", gap: 24, alignItems: "stretch",
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <div style={{
            fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 36,
            background: "linear-gradient(180deg, #fce9a8, #d9a441)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            lineHeight: 1, marginBottom: 4, textAlign: "center",
          }}>¡Ronda completa!</div>
          <char.Component size={180} />
          <div className="ed-body" style={{ fontStyle: "italic", textAlign: "center", maxWidth: 240, fontSize: 13 }}>
            "{app.studentName}, completaste {res.solved} de {totalEx} retos."
            <div style={{ marginTop: 4, color: "var(--ed-ink-soft)", fontSize: 12 }}>— {char.name}</div>
          </div>
        </div>
        <div className="ed-card" style={{ padding: 16, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, borderBottom: "2px solid rgba(242,194,96,0.45)", paddingBottom: 10, marginBottom: 12 }}>
            <EdinunLogoMini size={56} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 18, letterSpacing: "0.04em", lineHeight: 1.1 }}>
                EDINUN — Ediciones Nacionales Unidas
              </div>
              <div style={{ fontFamily: "var(--ed-font-ui)", fontSize: 11, color: "var(--ed-ink-soft)", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 2 }}>
                Reporte académico · Juegos de Lenguaje
              </div>
            </div>
            <div style={{ fontFamily: "var(--ed-font-mono)", fontSize: 11, color: "var(--ed-ink-dim)", textAlign: "right" }}>{dateStr}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontFamily: "var(--ed-font-ui)", fontSize: 12, marginBottom: 10 }}>
            <ReportField label="Estudiante" value={app.studentName || "—"} />
            <ReportField label="Categoría" value={res.category} />
            <ReportField label="Tiempo total" value={`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`} />
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: "auto", marginBottom: 10 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--ed-font-ui)", fontSize: 12 }}>
              <thead>
                <tr style={{
                  fontFamily: "var(--ed-font-ui)", fontWeight: 700, fontSize: 10,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  color: "var(--ed-ink-dim)", borderBottom: "1px solid rgba(148,120,255,0.3)",
                }}>
                  <th style={{ textAlign: "left", padding: "6px 8px", width: 36 }}>#</th>
                  <th style={{ textAlign: "left", padding: "6px 8px" }}>Reto</th>
                  <th style={{ textAlign: "right", padding: "6px 8px" }}>Tu respuesta</th>
                  <th style={{ textAlign: "right", padding: "6px 8px" }}>Respuesta correcta</th>
                  <th style={{ textAlign: "center", padding: "6px 8px" }}>Estado</th>
                  <th style={{ textAlign: "right", padding: "6px 8px" }}>Tiempo</th>
                </tr>
              </thead>
              <tbody style={{ fontFamily: "var(--ed-font-mono)" }}>
                {(res.log || []).map((e) => (
                  <tr key={e.idx} style={{ borderBottom: "1px solid rgba(148,120,255,0.18)" }}>
                    <td style={{ padding: "8px 8px", color: "var(--ed-ink-soft)" }}>{e.idx}</td>
                    <td style={{ padding: "8px 8px", fontWeight: 600 }}>{formatOp(e)}</td>
                    <td style={{ padding: "8px 8px", textAlign: "right", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }}>{String(e.userAnswer).slice(0, 60)}</td>
                    <td style={{ padding: "8px 8px", textAlign: "right", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }}>{String(e.correctAnswer).slice(0, 60)}</td>
                    <td style={{ padding: "8px 8px", textAlign: "center", fontFamily: "var(--ed-font-display)", fontWeight: 700, color: e.isCorrect ? "#2ecc8f" : "#ff6b6b" }}>
                      {e.isCorrect ? "Correcto" : "Incorrecto"}
                    </td>
                    <td style={{ padding: "8px 8px", textAlign: "right", color: "var(--ed-ink-dim)" }}>{e.time}s</td>
                  </tr>
                ))}
                {(res.log || []).length === 0 && (
                  <tr><td colSpan={6} style={{ padding: "16px 8px", textAlign: "center", color: "var(--ed-ink-soft)", fontStyle: "italic" }}>
                    No se registraron ejercicios en esta sesión.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ borderTop: "2px solid rgba(242,194,96,0.45)", paddingTop: 10, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, fontFamily: "var(--ed-font-ui)", fontSize: 11 }}>
            <SummaryCell label="Ejercicios" value={`${attemptedCount} / ${totalEx}`} />
            <SummaryCell label="Correctos" value={`${res.solved}`} tone="#2ecc8f" />
            <SummaryCell label="Estrellas" value={`${res.starsEarned}`} tone="#fce9a8" />
            <SummaryCell label="Precisión total" value={`${accuracy}%`} tone="#fce9a8" emphasis />
          </div>
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button className="ed-btn ed-btn-ghost" onClick={() => window.print()}
              style={{ padding: "0 10px", fontSize: 13, height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>IMPRIMIR REPORTE</button>
            <button className="ed-btn ed-btn-primary" onClick={() => go("game")}
              style={{ padding: "0 10px", fontSize: 13, height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>JUGAR OTRA RONDA</button>
          </div>
        </div>
      </div>
      <PrintableReport
        studentName={app.studentName}
        res={res} dateStr={dateStr} m={m} s={s}
        attemptedCount={attemptedCount} totalEx={totalEx} accuracy={accuracy}
      />
    </div>
  );
}

function ReportField({ label, value }) {
  return (
    <div style={{ padding: "8px 10px", borderRadius: 10, background: "rgba(10,6,35,0.45)", border: "1px solid rgba(148,120,255,0.25)" }}>
      <div className="ed-label" style={{ fontSize: 9, color: "var(--ed-ink-soft)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 14, color: "var(--ed-ink)" }}>{value}</div>
    </div>
  );
}

function SummaryCell({ label, value, tone = "var(--ed-ink)", emphasis = false }) {
  return (
    <div style={{
      padding: "8px 10px", borderRadius: 10,
      background: emphasis ? "rgba(242,194,96,0.12)" : "rgba(10,6,35,0.4)",
      border: `1px solid ${emphasis ? "rgba(242,194,96,0.5)" : "rgba(148,120,255,0.25)"}`,
      textAlign: "center",
    }}>
      <div className="ed-label" style={{ fontSize: 9, color: "var(--ed-ink-soft)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: emphasis ? 22 : 18, color: tone, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}

Object.assign(window, { GameScreen, ResultsScreen });
