import { useState, useRef, useEffect } from "react";

/* ── Design tokens — cohérents avec v7 ─────────────────────── */
const T = {
  light: {
    appBg: "#F8F7F4", cardBg: "#FFFFFF", navBg: "#FFFFFF",
    headerBg: "#FFFFFF", border: "#E8E6DE", borderSub: "#F1EFE8",
    text1: "#2C2C2A", text2: "#5F5E5A", text3: "#888780", text4: "#B4B2A9",
    chip: "#F1EFE8", chipBorder: "#D3D1C7",
    sectionBg: "#FFFFFF", surfaceVar: "#F1EFE8",
  },
  dark: {
    appBg: "#141412", cardBg: "#1E1D1A", navBg: "#1A1917",
    headerBg: "#1A1917", border: "#2E2D28", borderSub: "#252420",
    text1: "#F0EFE8", text2: "#B8B6AE", text3: "#7A7872", text4: "#4E4D48",
    chip: "#252420", chipBorder: "#36352E",
    sectionBg: "#1E1D1A", surfaceVar: "#252420",
  },
};

const FODMAP = {
  low:  { bg: "#E1F5EE", border: "#5DCAA5", text: "#085041", dot: "#1D9E75",
          darkBg: "#0D2B1E", darkBorder: "#1D6B48", darkText: "#5DCAA5" },
  med:  { bg: "#FAEEDA", border: "#FAC775", text: "#854F0B", dot: "#EF9F27",
          darkBg: "#271A04", darkBorder: "#7A5010", darkText: "#FAC775" },
  high: { bg: "#FAECE7", border: "#F0997B", text: "#993C1D", dot: "#D85A30",
          darkBg: "#2B1108", darkBorder: "#7A2E14", darkText: "#F0997B" },
};

const COLORS = {
  teal:  "#0F6E56",
  coral: "#D85A30",
  amber: "#BA7517",
  blue:  "#378ADD",
};

/* ── Données simulées ───────────────────────────────────────── */
const SYMPTOM_OPTIONS = [
  { key: "abdominal_pain", label: "Douleurs abdominales" },
  { key: "bloating",       label: "Ballonnements" },
  { key: "nausea",         label: "Nausées" },
  { key: "fatigue",        label: "Fatigue" },
  { key: "brain_fog",      label: "Brouillard mental" },
  { key: "transit",        label: "Transit" },
];

function generateTrend(days, symptomKey) {
  const seed = symptomKey.charCodeAt(0);
  const points = [];
  let val = 4 + (seed % 3);
  for (let i = 0; i < days; i++) {
    if (Math.random() > 0.15) { // 15% de jours sans données
      val = Math.max(0, Math.min(10, val + (Math.random() - 0.48) * 2));
      points.push({ day: i, value: Math.round(val * 10) / 10, hasData: true });
    } else {
      points.push({ day: i, value: null, hasData: false });
    }
  }
  return points;
}

function generateWellbeing(days) {
  const points = [];
  let val = 6;
  for (let i = 0; i < days; i++) {
    if (Math.random() > 0.2) {
      val = Math.max(1, Math.min(10, val + (Math.random() - 0.45) * 1.5));
      points.push({ day: i, value: Math.round(val * 10) / 10 });
    } else {
      points.push({ day: i, value: null });
    }
  }
  return points;
}

const INSIGHTS = [
  { type: "alert",         icon: "⚠️", title: "Ballonnements post-prandials fréquents",
    desc: "Vos ballonnements sont 3× plus élevés dans les 2h suivant les repas contenant de l'oignon ou du blé.", confidence: 0.87 },
  { type: "correlation",   icon: "🔗", title: "Corrélation oignon → douleurs (score 0.82)",
    desc: "Sur 14 occurrences repérées, 11 sont suivies de douleurs abdominales dans un délai de 90 min.", confidence: 0.82 },
  { type: "pattern",       icon: "📈", title: "Fatigue systématique le lundi",
    desc: "La fatigue moyenne du lundi est de 7.2/10 contre 4.1/10 les autres jours — possiblement lié au stress de reprise.", confidence: 0.71 },
  { type: "recommendation",icon: "💡", title: "Essayer le protocole Low-FODMAP strict 2 semaines",
    desc: "Votre profil de symptômes est cohérent avec une sensibilité FODMAP élevée. Un protocole d'élimination strict pourrait clarifier les déclencheurs.", confidence: 0.68 },
];

/* ── Helpers visuels ────────────────────────────────────────── */
function scoreColor(v, mode) {
  if (!v || v === 0) return T[mode].text4;
  if (v <= 3) return FODMAP.low.dot;
  if (v <= 6) return FODMAP.med.dot;
  return FODMAP.high.dot;
}

function dayColor(v, mode) {
  if (v === null) return T[mode].surfaceVar;
  if (v >= 7) return mode === "dark" ? "#0D2B1E" : "#C8E6C9";
  if (v >= 4) return mode === "dark" ? "#271A04" : "#FFE0B2";
  return mode === "dark" ? "#2B1108" : "#FFCDD2";
}
function dayTextColor(v, mode) {
  if (v === null) return T[mode].text4;
  if (v >= 7) return mode === "dark" ? "#5DCAA5" : "#1B5E20";
  if (v >= 4) return mode === "dark" ? "#FAC775" : "#BF360C";
  return mode === "dark" ? "#F0997B" : "#B71C1C";
}

/* ── PhoneFrame ─────────────────────────────────────────────── */
function PhoneFrame({ children, mode }) {
  const s = T[mode];
  return (
    <div style={{ width: 390, minHeight: 720, background: s.appBg, borderRadius: 16,
      overflow: "hidden", border: `0.5px solid ${s.border}`,
      display: "flex", flexDirection: "column", position: "relative",
      fontFamily: "'DM Sans', system-ui, sans-serif",
      boxShadow: "0 4px 32px rgba(0,0,0,0.18)" }}>
      {children}
    </div>
  );
}

/* ── Section card wrapper ───────────────────────────────────── */
function SectionCard({ title, icon, mode, children, accent }) {
  const s = T[mode];
  return (
    <div style={{ background: s.sectionBg, border: `0.5px solid ${s.border}`,
      borderRadius: 14, margin: "0 12px 10px", overflow: "hidden" }}>
      <div style={{ padding: "10px 14px 8px", borderBottom: `0.5px solid ${s.borderSub}`,
        display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: ".8px", color: accent ?? COLORS.teal }}>{title}</span>
      </div>
      <div style={{ padding: "12px 14px" }}>{children}</div>
    </div>
  );
}

/* ═══ SYMPTOM CHART ════════════════════════════════════════════ */
function SymptomChart({ windowDays, mode }) {
  const s = T[mode];
  const [primary, setPrimary] = useState("abdominal_pain");
  const [secondary, setSecondary] = useState(null);

  const primData = generateTrend(windowDays, primary);
  const secData = secondary ? generateTrend(windowDays, secondary) : [];

  const W = 320, H = 100, PAD_L = 24, PAD_B = 20, PAD_T = 8, PAD_R = 8;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  function toXY(i, v) {
    return {
      x: PAD_L + (i / (windowDays - 1)) * chartW,
      y: PAD_T + (1 - v / 10) * chartH,
    };
  }

  function buildPath(data, key) {
    const pts = data.map((d, i) => d.hasData ? { ...toXY(i, d.value), i } : null).filter(Boolean);
    if (pts.length < 2) return "";
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let k = 1; k < pts.length; k++) {
      if (pts[k].i - pts[k-1].i === 1) {
        d += ` L ${pts[k].x} ${pts[k].y}`;
      } else {
        d += ` M ${pts[k].x} ${pts[k].y}`;
      }
    }
    return d;
  }

  const xLabels = [0, Math.floor(windowDays/2), windowDays-1].map(i => {
    const d = new Date(); d.setDate(d.getDate() - (windowDays - 1 - i));
    return { x: PAD_L + (i / (windowDays-1)) * chartW, label: `${d.getDate()}/${d.getMonth()+1}` };
  });

  return (
    <SectionCard title="Évolution des symptômes" icon="📈" mode={mode}>
      {/* Sélecteurs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <select value={primary} onChange={e => setPrimary(e.target.value)} style={{
          flex: 1, minWidth: 0, fontSize: 12, fontWeight: 600,
          color: COLORS.teal, background: mode === "dark" ? FODMAP.low.darkBg : FODMAP.low.bg,
          border: `0.5px solid ${mode === "dark" ? FODMAP.low.darkBorder : FODMAP.low.border}`,
          borderRadius: 8, padding: "5px 8px", cursor: "pointer",
          fontFamily: "inherit" }}>
          {SYMPTOM_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
        <select value={secondary ?? ""} onChange={e => setSecondary(e.target.value || null)} style={{
          flex: 1, minWidth: 0, fontSize: 12, fontWeight: 500,
          color: s.text3, background: s.chip,
          border: `0.5px solid ${s.chipBorder}`,
          borderRadius: 8, padding: "5px 8px", cursor: "pointer",
          fontFamily: "inherit" }}>
          <option value="">+ Superposer</option>
          {SYMPTOM_OPTIONS.filter(o => o.key !== primary).map(o =>
            <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </div>

      {/* SVG Chart */}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {/* Grid */}
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T+chartH}
          stroke={s.border} strokeWidth="1" />
        <line x1={PAD_L} y1={PAD_T+chartH} x2={PAD_L+chartW} y2={PAD_T+chartH}
          stroke={s.border} strokeWidth="1" />
        <line x1={PAD_L} y1={PAD_T+chartH/2} x2={PAD_L+chartW} y2={PAD_T+chartH/2}
          stroke={s.border} strokeWidth="0.5" strokeDasharray="2 4" />

        {/* Y labels */}
        {[10,5,0].map(v => (
          <text key={v} x={PAD_L-3} y={PAD_T + (1-v/10)*chartH + 4}
            textAnchor="end" fontSize="9" fill={s.text4}>{v}</text>
        ))}

        {/* X labels */}
        {xLabels.map((l, i) => (
          <text key={i} x={l.x} y={H-2} textAnchor="middle" fontSize="9" fill={s.text4}>{l.label}</text>
        ))}

        {/* Primary series */}
        <path d={buildPath(primData)} fill="none" stroke={COLORS.teal} strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" />
        {primData.filter(d => d.hasData).map((d, i) => {
          const {x, y} = toXY(i, d.value);
          return <circle key={i} cx={x} cy={y} r="2.5" fill={COLORS.teal} />;
        })}

        {/* Secondary series */}
        {secondary && <>
          <path d={buildPath(secData)} fill="none" stroke={COLORS.coral} strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 2" />
          {secData.filter(d => d.hasData).map((d, i) => {
            const {x, y} = toXY(i, d.value);
            return <circle key={i} cx={x} cy={y} r="2" fill={COLORS.coral} />;
          })}
        </>}
      </svg>

      {/* Légende */}
      <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 20, height: 2, background: COLORS.teal, borderRadius: 1 }} />
          <span style={{ fontSize: 11, color: s.text3 }}>
            {SYMPTOM_OPTIONS.find(o => o.key === primary)?.label}
          </span>
        </div>
        {secondary && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 16, height: 2, background: COLORS.coral, borderRadius: 1,
              borderTop: "2px dashed " + COLORS.coral }} />
            <span style={{ fontSize: 11, color: s.text3 }}>
              {SYMPTOM_OPTIONS.find(o => o.key === secondary)?.label}
            </span>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

/* ═══ WELLBEING HEATMAP ════════════════════════════════════════ */
function WellbeingHeatmap({ windowDays, mode }) {
  const s = T[mode];
  const data = generateWellbeing(windowDays);
  const withData = data.filter(d => d.value !== null);
  const avg = withData.length
    ? Math.round(withData.reduce((a,d) => a+d.value, 0) / withData.length * 10)/10
    : null;

  const now = new Date();
  const month = now.toLocaleString("fr-FR", { month: "long", year: "numeric" });
  const firstDow = (new Date(now.getFullYear(), now.getMonth(), 1).getDay() + 6) % 7;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  const windowStart = new Date(now); windowStart.setDate(windowStart.getDate() - windowDays);

  const cells = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), i+1);
      const inWindow = d >= windowStart && d <= now;
      const dayIdx = Math.floor((now - d) / 86400000);
      const point = inWindow ? data[windowDays - 1 - dayIdx] : null;
      return { day: i+1, inWindow, value: point?.value ?? null };
    }),
  ];

  const DAY_NAMES = ["L","M","M","J","V","S","D"];
  const avgC = avg >= 7 ? FODMAP.low.dot : avg >= 4 ? FODMAP.med.dot : FODMAP.high.dot;

  return (
    <SectionCard title="Bien-être quotidien" icon="💚" mode={mode}>
      {/* Score moyen */}
      {avg !== null && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: avgC }}>{avg}</span>
          <span style={{ fontSize: 13, color: s.text3 }}>/10 · bien-être moyen sur {windowDays} j</span>
        </div>
      )}

      {/* Nom du mois */}
      <div style={{ fontSize: 12, fontWeight: 600, textAlign: "center",
        color: s.text3, marginBottom: 8, textTransform: "capitalize" }}>{month}</div>

      {/* Grille */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {DAY_NAMES.map((n,i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 9, fontWeight: 600,
            color: s.text4, paddingBottom: 3 }}>{n}</div>
        ))}
        {cells.map((cell, i) => (
          <div key={i} style={{
            aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 5, fontSize: 10, fontWeight: 500,
            background: cell === null ? "transparent"
              : !cell.inWindow ? s.surfaceVar
              : dayColor(cell.value, mode),
            color: cell === null ? "transparent"
              : !cell.inWindow ? s.text4
              : dayTextColor(cell.value, mode),
            opacity: cell === null ? 0 : !cell.inWindow ? 0.4 : 1,
          }}>
            {cell?.day}
          </div>
        ))}
      </div>

      {/* Légende */}
      <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
        {[
          { label: "≥ 7", bg: mode === "dark" ? "#0D2B1E" : "#C8E6C9", text: mode === "dark" ? "#5DCAA5" : "#1B5E20" },
          { label: "4–6", bg: mode === "dark" ? "#271A04" : "#FFE0B2", text: mode === "dark" ? "#FAC775" : "#BF360C" },
          { label: "≤ 3", bg: mode === "dark" ? "#2B1108" : "#FFCDD2", text: mode === "dark" ? "#F0997B" : "#B71C1C" },
          { label: "N/A", bg: s.surfaceVar, text: s.text4 },
        ].map((l, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: l.bg }} />
            <span style={{ fontSize: 10, color: s.text3 }}>{l.label}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

/* ═══ ADHERENCE CALENDAR ══════════════════════════════════════ */
function AdherenceCalendar({ windowDays, mode }) {
  const s = T[mode];

  // Simulated treatments
  const treatments = [
    { name: "Rifaximin 550mg", rate: 0.91 },
    { name: "Prokinétique", rate: 0.74 },
    { name: "Probiotiques", rate: 0.62 },
  ];
  const avg = treatments.reduce((a, t) => a + t.rate, 0) / treatments.length;
  const avgColor = avg >= 0.8 ? FODMAP.low.dot : avg >= 0.5 ? FODMAP.med.dot : FODMAP.high.dot;

  const now = new Date();
  const month = now.toLocaleString("fr-FR", { month: "long", year: "numeric" });
  const firstDow = (new Date(now.getFullYear(), now.getMonth(), 1).getDay() + 6) % 7;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  const windowStart = new Date(now); windowStart.setDate(windowStart.getDate() - windowDays);

  const cells = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), i+1);
      const inWindow = d >= windowStart && d <= now;
      return { day: i+1, inWindow };
    }),
  ];

  const rateColor = avg >= 0.8
    ? { bg: mode === "dark" ? "#0D2B1E" : "#C8E6C9", text: mode === "dark" ? "#5DCAA5" : "#1B5E20" }
    : avg >= 0.5
    ? { bg: mode === "dark" ? "#271A04" : "#FFE0B2", text: mode === "dark" ? "#FAC775" : "#BF360C" }
    : { bg: mode === "dark" ? "#2B1108" : "#FFCDD2", text: mode === "dark" ? "#F0997B" : "#B71C1C" };

  const DAY_NAMES = ["L","M","M","J","V","S","D"];

  return (
    <SectionCard title="Observance des traitements" icon="💊" mode={mode} accent={COLORS.amber}>
      {/* Score global */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: avgColor }}>
          {Math.round(avg * 100)}%
        </span>
        <span style={{ fontSize: 13, color: s.text3 }}>d'observance sur {windowDays} j</span>
      </div>

      {/* Nom du mois */}
      <div style={{ fontSize: 12, fontWeight: 600, textAlign: "center",
        color: s.text3, marginBottom: 8, textTransform: "capitalize" }}>{month}</div>

      {/* Grille */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 10 }}>
        {DAY_NAMES.map((n,i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 9, fontWeight: 600,
            color: s.text4, paddingBottom: 3 }}>{n}</div>
        ))}
        {cells.map((cell, i) => (
          <div key={i} style={{
            aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 5, fontSize: 10, fontWeight: 500,
            background: cell === null ? "transparent"
              : !cell.inWindow ? s.surfaceVar
              : rateColor.bg,
            color: cell === null ? "transparent"
              : !cell.inWindow ? s.text4
              : rateColor.text,
            opacity: cell === null ? 0 : !cell.inWindow ? 0.4 : 1,
          }}>
            {cell?.day}
          </div>
        ))}
      </div>

      {/* Détail par traitement */}
      <div style={{ borderTop: `0.5px solid ${s.borderSub}`, paddingTop: 8,
        display: "flex", flexDirection: "column", gap: 5 }}>
        {treatments.map((t, i) => {
          const tc = t.rate >= 0.8 ? FODMAP.low.dot : t.rate >= 0.5 ? FODMAP.med.dot : FODMAP.high.dot;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center",
              justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: s.text2 }}>{t.name}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: tc }}>
                {Math.round(t.rate * 100)}%
              </span>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

/* ═══ AI INSIGHTS ═════════════════════════════════════════════ */
function AiInsights({ mode, refreshKey }) {
  const s = T[mode];
  const [copied, setCopied] = useState(false);
  const hasInsights = refreshKey > 0;

  if (!hasInsights) return (
    <SectionCard title="Analyses IA" icon="✨" mode={mode} accent={COLORS.blue}>
      <div style={{ textAlign: "center", padding: "16px 0" }}>
        <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.5 }}>🤖</div>
        <div style={{ fontSize: 13, color: s.text3, marginBottom: 4 }}>Aucune analyse effectuée</div>
        <div style={{ fontSize: 12, color: s.text4 }}>
          Appuyez sur ✨ Analyser pour lancer votre première analyse IA
        </div>
      </div>
    </SectionCard>
  );

  const groupOrder = ["alert","correlation","pattern","recommendation"];
  const groupMeta = {
    alert:          { label: "Alertes",         icon: "⚠️" },
    correlation:    { label: "Corrélations",     icon: "🔗" },
    pattern:        { label: "Patterns",         icon: "📊" },
    recommendation: { label: "Recommandations",  icon: "💡" },
  };

  return (
    <SectionCard title="Analyses IA" icon="✨" mode={mode} accent={COLORS.blue}>
      {/* Meta + copy */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 12, flexWrap: "wrap", gap: 6 }}>
        <span style={{ fontSize: 11, color: s.text4 }}>
          Analysé le {new Date().toLocaleDateString("fr-FR")} · 14 j
        </span>
        <button onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px",
            borderRadius: 8, border: `0.5px solid ${s.chipBorder}`,
            background: s.chip, color: s.text2, fontSize: 11, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit" }}>
          {copied ? "✓ Copié" : "📋 Copier pour mon médecin"}
        </button>
      </div>

      {/* Insight cards */}
      {groupOrder.map(type => {
        const cards = INSIGHTS.filter(c => c.type === type);
        if (!cards.length) return null;
        const meta = groupMeta[type];
        return (
          <div key={type} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: ".7px", color: s.text3, marginBottom: 6,
              display: "flex", alignItems: "center", gap: 5 }}>
              <span>{meta.icon}</span>{meta.label}
            </div>
            {cards.map((card, i) => {
              const confColor = card.confidence >= 0.8 ? FODMAP.low
                : card.confidence >= 0.5 ? FODMAP.med : FODMAP.high;
              return (
                <div key={i} style={{ background: s.chip, border: `0.5px solid ${s.chipBorder}`,
                  borderRadius: 12, padding: "10px 12px", marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", gap: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: s.text1,
                      lineHeight: 1.3 }}>{card.title}</span>
                    <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700,
                      padding: "2px 6px", borderRadius: 10,
                      background: mode === "dark" ? confColor.darkBg : confColor.bg,
                      color: mode === "dark" ? confColor.darkText : confColor.text }}>
                      {Math.round(card.confidence * 100)}%
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: s.text3, lineHeight: 1.5 }}>
                    {card.desc}
                  </p>
                </div>
              );
            })}
          </div>
        );
      })}
    </SectionCard>
  );
}

/* ═══ DIALOG ANALYSE ══════════════════════════════════════════ */
function AnalysisDialog({ mode, onClose, onConfirm }) {
  const s = T[mode];
  const [days, setDays] = useState(14);
  const options = [
    { days: 7,  label: "7 jours",  est: "~500 tokens" },
    { days: 14, label: "14 jours", est: "~1 000 tokens" },
    { days: 30, label: "30 jours", est: "~2 500 tokens" },
    { days: 90, label: "90 jours", est: "~7 000 tokens" },
  ];
  const cur = options.find(o => o.days === days);

  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "flex-end", zIndex: 100 }}
      onClick={onClose}>
      <div style={{ width: "100%", background: s.cardBg, borderRadius: "16px 16px 0 0",
        padding: "20px 16px 32px", border: `0.5px solid ${s.border}` }}
        onClick={e => e.stopPropagation()}>

        <div style={{ width: 32, height: 4, borderRadius: 2, background: s.chipBorder,
          margin: "0 auto 16px" }} />

        <div style={{ fontSize: 16, fontWeight: 700, color: s.text1, marginBottom: 4 }}>
          Lancer une analyse IA
        </div>
        <div style={{ fontSize: 13, color: s.text3, marginBottom: 16, lineHeight: 1.5 }}>
          Claude analysera vos données pour identifier corrélations et patterns de santé.
        </div>

        {/* Options fenêtre */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
          {options.map(o => (
            <button key={o.days} onClick={() => setDays(o.days)} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "11px 14px", borderRadius: 12, cursor: "pointer",
              fontFamily: "inherit",
              background: days === o.days
                ? (mode === "dark" ? FODMAP.low.darkBg : FODMAP.low.bg)
                : s.chip,
              border: `${days === o.days ? "1.5px" : "0.5px"} solid ${
                days === o.days ? (mode === "dark" ? FODMAP.low.darkBorder : FODMAP.low.border) : s.chipBorder}`,
              color: days === o.days ? (mode === "dark" ? FODMAP.low.darkText : FODMAP.low.text) : s.text2,
            }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{o.label}</span>
              <span style={{ fontSize: 11, opacity: 0.7 }}>{o.est}</span>
            </button>
          ))}
        </div>

        <div style={{ fontSize: 12, color: s.text4, marginBottom: 16 }}>
          Estimation : <strong style={{ color: s.text3 }}>{cur?.est}</strong>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "13px", borderRadius: 12,
            background: s.chip, border: `0.5px solid ${s.chipBorder}`,
            color: s.text2, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Annuler
          </button>
          <button onClick={() => onConfirm(days)} style={{ flex: 2, padding: "13px", borderRadius: 12,
            background: COLORS.teal, color: "white", border: "none",
            fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            ✨ Analyser {days} jours
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══ ANALYSIS HOME ════════════════════════════════════════════ */
function AnalysisHome({ mode }) {
  const s = T[mode];
  const [windowDays, setWindowDays] = useState(30);
  const [showDialog, setShowDialog] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const scrollRef = useRef(null);

  const runAnalysis = (days) => {
    setShowDialog(false);
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setLastAnalysis(new Date());
      setRefreshKey(k => k + 1);
    }, 3000);
  };

  const lastAgoLabel = () => {
    if (!lastAnalysis) return null;
    const d = Math.floor((Date.now() - lastAnalysis) / 86400000);
    return d === 0 ? "aujourd'hui" : d === 1 ? "hier" : `il y a ${d} jour${d>1?"s":""}`;
  };

  return (
    <PhoneFrame mode={mode}>
      {/* Header sticky */}
      <div style={{ background: s.headerBg, borderBottom: `0.5px solid ${s.border}`,
        padding: "12px 16px", position: "sticky", top: 0, zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <span style={{ fontSize: 18, fontWeight: 600, color: s.text1 }}>Analyse</span>
        {/* Sélecteur fenêtre */}
        <div style={{ display: "flex", gap: 2, background: s.chip, borderRadius: 10,
          border: `0.5px solid ${s.chipBorder}`, padding: 3 }}>
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setWindowDays(d)} style={{
              padding: "4px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600,
              border: "none", cursor: "pointer", fontFamily: "inherit",
              background: windowDays === d ? COLORS.teal : "transparent",
              color: windowDays === d ? "white" : s.text3,
              transition: "all .15s",
            }}>{d}j</button>
          ))}
        </div>
      </div>

      {/* Bandeau dernière analyse */}
      {lastAnalysis && (
        <div style={{ background: mode === "dark" ? FODMAP.low.darkBg : FODMAP.low.bg,
          borderBottom: `0.5px solid ${mode === "dark" ? FODMAP.low.darkBorder : FODMAP.low.border}`,
          padding: "7px 16px", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 13 }}>🕐</span>
          <span style={{ fontSize: 12, color: mode === "dark" ? FODMAP.low.darkText : FODMAP.low.text, fontWeight: 500 }}>
            Dernière analyse IA : {lastAgoLabel()}
          </span>
        </div>
      )}

      {/* Bandeau analysing */}
      {analyzing && (
        <div style={{ background: mode === "dark" ? FODMAP.med.darkBg : FODMAP.med.bg,
          borderBottom: `0.5px solid ${mode === "dark" ? FODMAP.med.darkBorder : FODMAP.med.border}`,
          padding: "8px 16px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ width: 16, height: 16, borderRadius: "50%",
            border: `2px solid ${COLORS.amber}`, borderTopColor: "transparent",
            animation: "spin 0.8s linear infinite" }} />
          <span style={{ fontSize: 13, color: mode === "dark" ? FODMAP.med.darkText : FODMAP.med.text, fontWeight: 500 }}>
            Analyse IA en cours…
          </span>
        </div>
      )}

      {/* Sections scrollable */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", paddingTop: 10, paddingBottom: 80 }}>
        <SymptomChart windowDays={windowDays} mode={mode} />
        <WellbeingHeatmap windowDays={windowDays} mode={mode} />
        <AdherenceCalendar windowDays={windowDays} mode={mode} />
        <AiInsights mode={mode} refreshKey={refreshKey} />
      </div>

      {/* FAB Analyser */}
      <button onClick={() => !analyzing && setShowDialog(true)} style={{
        position: "absolute", bottom: 80, right: 16,
        width: analyzing ? "auto" : 56, height: 56,
        padding: analyzing ? "0 20px" : 0,
        borderRadius: analyzing ? 28 : "50%",
        background: analyzing ? s.chip : COLORS.teal,
        border: `0.5px solid ${analyzing ? s.chipBorder : COLORS.teal}`,
        color: analyzing ? s.text3 : "white",
        fontSize: analyzing ? 13 : 22,
        fontFamily: "inherit", fontWeight: 600,
        cursor: analyzing ? "default" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        boxShadow: analyzing ? "none" : "0 4px 16px rgba(15,110,86,0.4)",
        transition: "all .2s",
        zIndex: 20,
      }}>
        {analyzing ? <>⏳ Analyse…</> : "✨"}
      </button>

      {/* Dialog overlay */}
      {showDialog && (
        <AnalysisDialog mode={mode}
          onClose={() => setShowDialog(false)}
          onConfirm={runAnalysis} />
      )}
    </PhoneFrame>
  );
}

/* ═══ ROOT ════════════════════════════════════════════════════ */
export default function App() {
  const [mode, setMode] = useState("light");

  return (
    <div style={{ padding: "24px 16px", display: "flex", flexDirection: "column",
      alignItems: "center", gap: 14, minHeight: "100vh",
      background: mode === "dark" ? "#0D0C0A" : "var(--color-background-tertiary,#F1EFE8)",
      transition: "background .3s" }}>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        select option { background: #1E1D1A; color: #F0EFE8; }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: 390 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".5px", textTransform: "uppercase",
          color: mode === "dark" ? "#4E4D48" : "var(--color-text-tertiary)" }}>
          FlowEase · Analyse v1
        </div>
        <button onClick={() => setMode(m => m === "light" ? "dark" : "light")} style={{
          padding: "5px 14px", borderRadius: 20, cursor: "pointer",
          fontSize: 12, fontWeight: 600, fontFamily: "inherit",
          background: mode === "dark" ? "#1E1D1A" : "white",
          border: `0.5px solid ${mode === "dark" ? "#2E2D28" : "#D3D1C7"}`,
          color: mode === "dark" ? "#B8B6AE" : "#5F5E5A" }}>
          {mode === "dark" ? "☀️ Light" : "🌙 Dark"}
        </button>
      </div>

      <AnalysisHome mode={mode} />

      <div style={{ fontSize: 11, textAlign: "center", maxWidth: 390,
        color: mode === "dark" ? "#4E4D48" : "var(--color-text-tertiary)" }}>
        Sélecteurs de symptômes · Toggle 7j/30j/90j · ✨ Analyser → dialog → résultats IA
      </div>
    </div>
  );
}
