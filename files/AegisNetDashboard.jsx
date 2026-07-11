import { useState, useEffect, useRef } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { ShieldAlert, Radio, Activity, Cpu } from "lucide-react";

/* ---------------------------------------------------------------------- *
 *  Mock ATM network + attack data
 *  Replace useAegisNetFeed()'s internals with a real WebSocket connection
 *  once the FastAPI backend (see spec, Section 8) is running — the message
 *  shapes below already match that contract.
 * ---------------------------------------------------------------------- */

const BRANCH_HOSTS = ["10.42.20.", "10.42.21."];
const ATM_SUBNET = ["10.42.11.", "10.42.12.", "10.42.14."];
const CORE_SWITCH = "10.42.1.1";
const BENIGN_PORTS = [443, 8443, 3389, 8080, 5432];

function randomIp(prefixes) {
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  return prefix + (Math.floor(Math.random() * 250) + 2);
}
function randomPort() {
  return 1024 + Math.floor(Math.random() * 60000);
}

const ATTACK_DEFS = {
  dos: {
    label: "VOLUMETRIC DOS",
    make: () => ({
      src: randomIp(BRANCH_HOSTS), dst: CORE_SWITCH,
      sport: randomPort(), dport: 443, proto: "TCP", flags: "SYN",
    }),
    report: () => ({
      Threat_Analysis:
        "Sustained high-frequency SYN packets toward the gateway switch, each flow closing in under 40ms — consistent with a volumetric flood aimed at severing the ATM's link to the core network rather than a legitimate burst.",
      Confidence_Validation: `High (${91 + Math.floor(Math.random() * 7)}%) — packet-rate and flow-duration signature matches known SYN-flood profile.`,
      Recommended_Mitigation: [
        "Flag Terminal ID for temporary network isolation at the branch switch pending SOC review.",
        "Rate-limit inbound connections to the gateway port from the offending subnet.",
      ],
    }),
  },
  bruteforce: {
    label: "ADMIN BRUTE FORCE",
    make: () => ({
      src: randomIp(BRANCH_HOSTS), dst: randomIp(ATM_SUBNET),
      sport: randomPort(), dport: Math.random() > 0.5 ? 22 : 21,
      proto: "TCP", flags: "PSH,ACK",
    }),
    report: () => ({
      Threat_Analysis:
        "Repeated small-packet authentication attempts against the ATM PC's remote administration port, arriving faster than a human operator could type credentials — consistent with automated brute-forcing of SSH/FTP access.",
      Confidence_Validation: `High (${88 + Math.floor(Math.random() * 8)}%) — packet size and inter-arrival pattern match credential-stuffing signature.`,
      Recommended_Mitigation: [
        "Lock the local administration account and force a credential reset on the affected ATM PC.",
        "Block inbound access to the admin port from any IP outside the maintenance VLAN.",
      ],
    }),
  },
  portscan: {
    label: "SUBNET RECONNAISSANCE",
    make: () => ({
      src: randomIp(BRANCH_HOSTS), dst: randomIp(ATM_SUBNET),
      sport: randomPort(), dport: randomPort(), proto: "TCP", flags: "SYN",
    }),
    report: () => ({
      Threat_Analysis:
        "A single source is sweeping sequential destination ports across the ATM subnet with no completed handshakes — consistent with reconnaissance to fingerprint live ATM endpoints ahead of a targeted attack.",
      Confidence_Validation: `Medium-High (${78 + Math.floor(Math.random() * 10)}%) — destination-port entropy and handshake-completion rate match scan signature.`,
      Recommended_Mitigation: [
        "Restrict local port access on the ATM subnet to whitelisted service ports only.",
        "Alert the branch network administrator to trace the scanning host on the physical switch.",
      ],
    }),
  },
};
const ATTACK_KEYS = Object.keys(ATTACK_DEFS);

function useTypewriter(text, speed = 11) {
  const [out, setOut] = useState("");
  useEffect(() => {
    if (!text) { setOut(""); return; }
    setOut("");
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text]);
  return out;
}

function useAegisNetFeed() {
  const [flows, setFlows] = useState([]);
  const [metrics, setMetrics] = useState({ totalFlows: 0, activeThreats: 0, status: "OPERATIONAL" });
  const tRef = useRef(16);
  const [chartData, setChartData] = useState(() =>
    Array.from({ length: 16 }, (_, i) => ({
      t: i, throughput: 18 + Math.random() * 10, velocity: 12 + Math.random() * 8,
    }))
  );
  const [cognitive, setCognitive] = useState({ state: "idle", report: null, attackType: null });
  const analyzeTimer = useRef(null);
  const revertTimer = useRef(null);

  function triggerCognitive(attackKey) {
    clearTimeout(analyzeTimer.current);
    clearTimeout(revertTimer.current);
    setCognitive({ state: "analyzing", report: null, attackType: attackKey });
    analyzeTimer.current = setTimeout(() => {
      setCognitive({ state: "active", report: ATTACK_DEFS[attackKey].report(), attackType: attackKey });
      revertTimer.current = setTimeout(() => {
        setMetrics((prev) => ({ ...prev, status: "OPERATIONAL" }));
        setCognitive((prev) => ({ ...prev, state: "idle" }));
      }, 7000);
    }, 900);
  }

  useEffect(() => {
    /* --- DEMO MODE: in-memory simulated feed ---
       To go live, replace this whole effect with a WebSocket connection to
       the FastAPI backend and parse incoming { type: "flow" | "threat" }
       messages into the same setFlows/setMetrics/setChartData/setCognitive
       calls used below. See spec Section 9 for the exact swap-in code. */
    const interval = setInterval(() => {
      const roll = Math.random();
      let flow, isAttack = false, attackKey = null;
      if (roll < 0.1) {
        isAttack = true;
        attackKey = ATTACK_KEYS[Math.floor(Math.random() * ATTACK_KEYS.length)];
        flow = ATTACK_DEFS[attackKey].make();
      } else {
        flow = {
          src: randomIp(BRANCH_HOSTS), dst: randomIp(ATM_SUBNET),
          sport: randomPort(),
          dport: BENIGN_PORTS[Math.floor(Math.random() * BENIGN_PORTS.length)],
          proto: Math.random() > 0.15 ? "TCP" : "UDP",
          flags: "SYN,ACK",
        };
      }
      const entry = {
        ...flow, id: `${Date.now()}-${Math.random()}`, ts: new Date(),
        prediction: isAttack ? 1 : 0, attackKey,
      };
      setFlows((prev) => [...prev.slice(-38), entry]);
      setMetrics((prev) => ({
        totalFlows: prev.totalFlows + 1,
        activeThreats: prev.activeThreats + (isAttack ? 1 : 0),
        status: isAttack ? "UNDER_ATTACK" : prev.status,
      }));
      tRef.current += 1;
      setChartData((prev) => [
        ...prev.slice(-23),
        {
          t: tRef.current,
          throughput: isAttack ? 60 + Math.random() * 35 : 16 + Math.random() * 14,
          velocity: isAttack ? 50 + Math.random() * 40 : 10 + Math.random() * 10,
        },
      ]);
      if (isAttack) triggerCognitive(attackKey);
    }, 750);

    return () => {
      clearInterval(interval);
      clearTimeout(analyzeTimer.current);
      clearTimeout(revertTimer.current);
    };
  }, []);

  return { flows, metrics, chartData, cognitive };
}

/* ---------------------------------------------------------------------- *
 *  Presentational pieces
 * ---------------------------------------------------------------------- */

function StatusDot({ active, tone = "signal" }) {
  return <span className={`status-dot status-dot--${tone} ${active ? "is-active" : ""}`} />;
}

function MetricCard({ eyebrow, value, sub, tone }) {
  return (
    <div className={`panel metric-card ${tone ? "metric-card--" + tone : ""}`}>
      <div className="eyebrow">{eyebrow}</div>
      <div className="metric-value">{value}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  );
}

function MetricsBar({ metrics }) {
  const underAttack = metrics.status === "UNDER_ATTACK";
  return (
    <div className="metrics-bar grid grid-cols-1 md:grid-cols-3 gap-3">
      <MetricCard
        eyebrow="TOTAL FLOWS PROCESSED"
        value={metrics.totalFlows.toLocaleString()}
        sub="since session start"
      />
      <MetricCard
        eyebrow="ACTIVE THREATS DETECTED"
        value={metrics.activeThreats}
        tone={metrics.activeThreats > 0 ? "critical" : undefined}
        sub="cumulative, this session"
      />
      <MetricCard
        eyebrow="TERMINAL STATUS"
        value={underAttack ? "UNDER ATTACK" : "OPERATIONAL"}
        tone={underAttack ? "critical" : "signal"}
        sub={
          <span className="flex items-center gap-2">
            <StatusDot active tone={underAttack ? "critical" : "signal"} /> live
          </span>
        }
      />
    </div>
  );
}

function TrafficConsole({ flows }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [flows]);

  return (
    <div className="panel console-panel">
      <div className="panel-header flex justify-between items-center">
        <span className="eyebrow flex items-center gap-2">
          <Radio size={13} /> LIVE TRAFFIC FLOW
        </span>
        <span className="panel-header-sub">{flows.length} flows buffered</span>
      </div>
      <div className="console-body" ref={scrollRef}>
        {flows.length === 0 && <div className="console-line console-line--muted">awaiting traffic…</div>}
        {flows.map((f) => (
          <div key={f.id} className={`console-line ${f.prediction === 1 ? "console-line--threat" : ""}`}>
            <span className="console-ts">{f.ts.toLocaleTimeString("en-US", { hour12: false })}</span>
            <span className="console-addr">{f.src}:{f.sport}</span>
            <span className="console-arrow">→</span>
            <span className="console-addr">{f.dst}:{f.dport}</span>
            <span className={`console-proto console-proto--${f.proto.toLowerCase()}`}>{f.proto}</span>
            <span className="console-flags">{f.flags}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="chart-tooltip">
      {payload.map((p) => (
        <div key={p.dataKey}>{p.name}: {p.value.toFixed(1)}</div>
      ))}
    </div>
  );
}

function AnalyticsChart({ data }) {
  return (
    <div className="panel">
      <div className="panel-header flex justify-between items-center">
        <span className="eyebrow flex items-center gap-2">
          <Activity size={13} /> SECURITY ANALYTICS
        </span>
        <span className="panel-header-sub">throughput &amp; packet velocity</span>
      </div>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="aegisThroughput" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4dd8e6" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#4dd8e6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="aegisVelocity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f2a93c" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#f2a93c" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#232b3d" strokeDasharray="3 5" vertical={false} />
            <XAxis dataKey="t" hide />
            <YAxis stroke="#8993a8" tick={{ fontSize: 10, fontFamily: "IBM Plex Mono, monospace" }} width={30} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="throughput" name="Throughput" stroke="#4dd8e6"
                  fill="url(#aegisThroughput)" strokeWidth={2} animationDuration={300} />
            <Area type="monotone" dataKey="velocity" name="Packet velocity" stroke="#f2a93c"
                  fill="url(#aegisVelocity)" strokeWidth={2} animationDuration={300} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-legend">
        <span><i className="legend-dot legend-dot--signal" /> Throughput</span>
        <span><i className="legend-dot legend-dot--warning" /> Packet velocity</span>
      </div>
    </div>
  );
}

function CognitiveEnginePanel({ cognitive }) {
  const analysisText = useTypewriter(cognitive.report?.Threat_Analysis || "", 10);
  const isIdle = cognitive.state === "idle";
  const isAnalyzing = cognitive.state === "analyzing";
  const isActive = cognitive.state === "active";
  const attackLabel = cognitive.attackType ? ATTACK_DEFS[cognitive.attackType].label : null;

  return (
    <div className={`panel cognitive-panel ${isActive || isAnalyzing ? "cognitive-panel--alert" : ""}`}>
      <div className="panel-header flex justify-between items-center">
        <span className="eyebrow eyebrow--cognition flex items-center gap-2">
          <Cpu size={13} /> COGNITIVE ENGINE
        </span>
        <StatusDot active={!isIdle} tone={isIdle ? "cognition" : "critical"} />
      </div>

      {isIdle && (
        <div className="cognitive-idle">
          <div className="cognitive-idle-dot" />
          <p>Standing by. No anomalies flagged by the perception layer.</p>
        </div>
      )}

      {isAnalyzing && (
        <div className="cognitive-analyzing">
          <div className="scan-line" />
          <p>ANALYZING ANOMALY…</p>
        </div>
      )}

      {isActive && cognitive.report && (
        <div className="cognitive-active">
          <div className="case-tag">{attackLabel}</div>
          <div className="case-block">
            <div className="case-label">Threat analysis</div>
            <p className="case-text">{analysisText}</p>
          </div>
          <div className="case-block">
            <div className="case-label">Confidence validation</div>
            <p className="case-text case-text--mono">{cognitive.report.Confidence_Validation}</p>
          </div>
          <div className="case-block">
            <div className="case-label">Recommended mitigation</div>
            <ol className="mitigation-list">
              {cognitive.report.Recommended_Mitigation.map((step, i) => (
                <li key={i}>
                  <span className="mitigation-index">{String(i + 1).padStart(2, "0")}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- *
 *  Root component
 * ---------------------------------------------------------------------- */

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap');

.aegisnet-root {
  --bg-void: #0a0e16;
  --bg-panel: #10151f;
  --bg-panel-raised: #161c29;
  --line: #232b3d;
  --text-primary: #e6eaf2;
  --text-secondary: #8993a8;
  --text-muted: #5b6478;
  --signal: #4dd8e6;
  --signal-dim: rgba(77, 216, 230, 0.14);
  --warning: #f2a93c;
  --warning-dim: rgba(242, 169, 60, 0.14);
  --critical: #ef4a5f;
  --critical-dim: rgba(239, 74, 95, 0.14);
  --cognition: #9d7fe8;
  background: var(--bg-void);
  background-image: radial-gradient(circle at 15% 0%, rgba(77,216,230,0.06), transparent 40%),
                     radial-gradient(circle at 85% 100%, rgba(157,127,232,0.06), transparent 40%);
  color: var(--text-primary);
  font-family: 'Inter', system-ui, sans-serif;
  min-height: 100vh;
  padding: 28px;
}
.aegisnet-shell { max-width: 1180px; margin: 0 auto; }
.app-header { border-bottom: 1px solid var(--line); padding-bottom: 18px; margin-bottom: 18px; }
.app-header h1 { font-family: 'Space Grotesk', sans-serif; font-size: 26px; font-weight: 600; margin: 4px 0 0; letter-spacing: -0.01em; }
.eyebrow { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.14em; color: var(--signal); text-transform: uppercase; }
.eyebrow--cognition { color: var(--cognition); }
.mode-tag { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.08em; color: var(--text-muted); border: 1px solid var(--line); padding: 5px 10px; border-radius: 3px; white-space: nowrap; }

.panel { background: var(--bg-panel); border: 1px solid var(--line); border-radius: 6px; padding: 16px 18px; }
.panel-header { margin-bottom: 12px; }
.panel-header-sub { font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; color: var(--text-muted); }

.metrics-bar { margin-bottom: 16px; }
.metric-card { display: flex; flex-direction: column; gap: 6px; transition: border-color 0.4s ease, box-shadow 0.4s ease; }
.metric-value { font-family: 'IBM Plex Mono', monospace; font-size: 26px; font-weight: 600; }
.metric-sub { font-size: 11.5px; color: var(--text-secondary); }
.metric-card--critical { border-color: rgba(239,74,95,0.4); box-shadow: 0 0 0 1px rgba(239,74,95,0.08), 0 0 24px -8px rgba(239,74,95,0.35); }
.metric-card--critical .metric-value { color: var(--critical); }
.metric-card--signal .metric-value { color: var(--signal); }

.status-dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; background: var(--text-muted); }
.status-dot--signal.is-active { background: var(--signal); box-shadow: 0 0 8px var(--signal); animation: pulse-soft 2.4s ease-in-out infinite; }
.status-dot--critical.is-active { background: var(--critical); box-shadow: 0 0 8px var(--critical); animation: pulse-hard 1.1s ease-in-out infinite; }
.status-dot--cognition.is-active { background: var(--cognition); box-shadow: 0 0 8px var(--cognition); animation: pulse-soft 2.4s ease-in-out infinite; }
@keyframes pulse-soft { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
@keyframes pulse-hard { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.55; transform: scale(1.3); } }

.main-grid { display: grid; grid-template-columns: 1.7fr 1fr; gap: 16px; align-items: start; }
@media (max-width: 900px) { .main-grid { grid-template-columns: 1fr; } }
.main-col { display: flex; flex-direction: column; gap: 16px; }

.console-body { height: 260px; overflow-y: auto; display: flex; flex-direction: column; gap: 3px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; padding-right: 4px; }
.console-line { display: grid; grid-template-columns: 68px 1fr 14px 1fr 48px 88px; gap: 8px; align-items: center; padding: 4px 8px; border-left: 2px solid transparent; border-radius: 2px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; }
.console-line--threat { border-left-color: var(--critical); background: var(--critical-dim); color: var(--text-primary); }
.console-line--muted { color: var(--text-muted); grid-template-columns: 1fr; }
.console-ts { color: var(--text-muted); }
.console-addr { overflow: hidden; text-overflow: ellipsis; }
.console-arrow { color: var(--text-muted); text-align: center; }
.console-proto { font-size: 10px; padding: 1px 6px; border-radius: 3px; text-align: center; letter-spacing: 0.04em; }
.console-proto--tcp { background: var(--signal-dim); color: var(--signal); }
.console-proto--udp { background: var(--warning-dim); color: var(--warning); }
.console-flags { color: var(--text-muted); font-size: 10.5px; }
.console-body::-webkit-scrollbar { width: 6px; }
.console-body::-webkit-scrollbar-thumb { background: var(--line); border-radius: 3px; }

.chart-legend { display: flex; gap: 16px; margin-top: 8px; font-size: 11px; color: var(--text-secondary); font-family: 'IBM Plex Mono', monospace; }
.legend-dot { width: 8px; height: 8px; border-radius: 2px; display: inline-block; margin-right: 5px; }
.legend-dot--signal { background: var(--signal); }
.legend-dot--warning { background: var(--warning); }
.chart-tooltip { background: var(--bg-panel-raised); border: 1px solid var(--line); border-radius: 4px; padding: 8px 10px; font-family: 'IBM Plex Mono', monospace; font-size: 11px; }

.cognitive-panel { min-height: 260px; border-color: var(--line); transition: border-color 0.5s ease, box-shadow 0.5s ease; }
.cognitive-panel--alert { border-color: rgba(157,127,232,0.5); box-shadow: 0 0 0 1px rgba(157,127,232,0.08), 0 0 32px -10px rgba(157,127,232,0.4); }
.cognitive-idle { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: var(--text-muted); text-align: center; padding: 36px 10px; }
.cognitive-idle-dot { width: 10px; height: 10px; border-radius: 50%; border: 1px solid var(--text-muted); }
.cognitive-idle p { font-size: 12.5px; max-width: 220px; }
.cognitive-analyzing { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 46px 10px; }
.cognitive-analyzing p { font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; letter-spacing: 0.1em; color: var(--cognition); }
.scan-line { width: 70%; height: 2px; background: linear-gradient(90deg, transparent, var(--cognition), transparent); animation: scan 1.1s linear infinite; }
@keyframes scan { 0% { transform: translateX(-60%); opacity: 0.2;} 50% { opacity: 1; } 100% { transform: translateX(60%); opacity: 0.2; } }
.case-tag { display: inline-block; font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; letter-spacing: 0.08em; color: var(--critical); background: var(--critical-dim); border: 1px solid rgba(239,74,95,0.35); padding: 4px 9px; border-radius: 3px; margin-bottom: 14px; }
.case-block { margin-bottom: 14px; animation: fade-in 0.5s ease both; }
.case-block:last-child { margin-bottom: 0; }
.case-label { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.1em; color: var(--text-muted); text-transform: uppercase; margin-bottom: 5px; }
.case-text { font-size: 13px; line-height: 1.5; color: var(--text-primary); }
.case-text--mono { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: var(--cognition); }
@keyframes fade-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
.mitigation-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.mitigation-list li { display: flex; gap: 10px; font-size: 12.5px; line-height: 1.5; }
.mitigation-index { font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; color: var(--cognition); flex-shrink: 0; padding-top: 1px; }

.app-footer { font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; color: var(--text-muted); text-align: center; padding-top: 16px; }

@media (prefers-reduced-motion: reduce) {
  .status-dot.is-active, .scan-line, .case-block { animation: none !important; }
}
`;

export default function AegisNetDashboard() {
  const { flows, metrics, chartData, cognitive } = useAegisNetFeed();

  return (
    <div className="aegisnet-root">
      <style>{STYLES}</style>
      <div className="aegisnet-shell">
        <header className="app-header flex justify-between items-end flex-wrap gap-3">
          <div>
            <div className="eyebrow flex items-center gap-2">
              <ShieldAlert size={13} /> AEGISNET // EDGE ATM SECURITY
            </div>
            <h1>Autonomous threat detection</h1>
          </div>
          <span className="mode-tag">SIMULATED FEED — DEMO MODE</span>
        </header>

        <MetricsBar metrics={metrics} />

        <div className="main-grid">
          <div className="main-col">
            <TrafficConsole flows={flows} />
            <AnalyticsChart data={chartData} />
          </div>
          <div>
            <CognitiveEnginePanel cognitive={cognitive} />
          </div>
        </div>

        <footer className="app-footer">
          Data source: local simulation — swap useAegisNetFeed() for a WebSocket client to go live.
        </footer>
      </div>
    </div>
  );
}
