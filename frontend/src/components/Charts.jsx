import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const axisStyle = {
  fontSize: 11,
  fontFamily: "IBM Plex Mono, monospace",
  fill: "#737373",
};

const tooltipStyle = {
  contentStyle: {
    background: "#000000",
    border: "none",
    borderRadius: 0,
    padding: "8px 12px",
  },
  labelStyle: { color: "#999999", fontFamily: "IBM Plex Mono, monospace", fontSize: 11 },
  itemStyle: { color: "#ffffff", fontFamily: "IBM Plex Mono, monospace", fontSize: 12 },
};

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function LatencyChart({ data }) {
  const rows = data.map((d) => ({
    time: formatTime(d.window_start),
    p50: Math.round(d.p50_latency_ms),
    p95: Math.round(d.p95_latency_ms),
    p99: Math.round(d.p99_latency_ms),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid stroke="#e4e4e4" vertical={false} />
        <XAxis dataKey="time" tick={axisStyle} axisLine={{ stroke: "#cccccc" }} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} unit="ms" />
        <Tooltip {...tooltipStyle} />
        <Line type="monotone" dataKey="p50" stroke="#cccccc" strokeWidth={1.5} dot={false} />
        <Line type="monotone" dataKey="p95" stroke="#737373" strokeWidth={1.5} dot={false} />
        <Line type="monotone" dataKey="p99" stroke="#000000" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function VolumeChart({ data }) {
  const rows = data.map((d) => ({
    time: formatTime(d.window_start),
    requests: d.request_count,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid stroke="#e4e4e4" vertical={false} />
        <XAxis dataKey="time" tick={axisStyle} axisLine={{ stroke: "#cccccc" }} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="requests" fill="#000000" radius={0} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AccuracyChart({ data }) {
  const rows = data
    .filter((d) => d.accuracy !== null && d.accuracy !== undefined)
    .map((d) => ({
      time: formatTime(d.window_start),
      accuracy: Math.round(d.accuracy * 1000) / 10, // percent, 1 decimal
    }));

  if (rows.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid stroke="#e4e4e4" vertical={false} />
        <XAxis dataKey="time" tick={axisStyle} axisLine={{ stroke: "#cccccc" }} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
        <Tooltip {...tooltipStyle} />
        <Line type="monotone" dataKey="accuracy" stroke="#000000" strokeWidth={2} dot={{ r: 2, fill: "#000000" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function PredictionHistogram({ histogram }) {
  if (!histogram) return null;
  const rows = Object.entries(histogram).map(([bucket, count]) => ({
    bucket,
    count,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid stroke="#e4e4e4" vertical={false} />
        <XAxis
          dataKey="bucket"
          tick={{ ...axisStyle, fontSize: 9 }}
          axisLine={{ stroke: "#cccccc" }}
          tickLine={false}
          interval={0}
          angle={-35}
          textAnchor="end"
          height={50}
        />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="count" fill="#000000" radius={0} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Drift heatmap: features (rows) x time windows (cols).
 * Intensity encoded via grayscale fill — darker = higher PSI = more drift.
 * No color hue used, per design constraint.
 */
export function DriftHeatmap({ snapshots }) {
  const featureSet = new Set();
  snapshots.forEach((s) => {
    if (s.psi_scores) Object.keys(s.psi_scores).forEach((f) => featureSet.add(f));
  });
  const features = Array.from(featureSet);

  if (features.length === 0) return null;

  const cellFill = (psi) => {
    if (psi === undefined || psi === null) return "#f2f2f2";
    if (psi < 0.1) return "#e4e4e4";
    if (psi < 0.2) return "#999999";
    if (psi < 0.4) return "#4d4d4d";
    return "#000000";
  };
  const textColor = (psi) => (psi >= 0.2 ? "#ffffff" : "#000000");

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse w-full">
        <thead>
          <tr>
            <th className="text-left font-mono text-[10px] uppercase text-ink-500 pb-2 pr-3 sticky left-0 bg-ink-0">
              Feature
            </th>
            {snapshots.map((s, i) => (
              <th key={i} className="font-mono text-[9px] text-ink-400 pb-2 px-0.5 font-normal">
                {new Date(s.window_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((feature) => (
            <tr key={feature}>
              <td className="font-mono text-[11px] text-ink-950 pr-3 py-0.5 sticky left-0 bg-ink-0 whitespace-nowrap">
                {feature}
              </td>
              {snapshots.map((s, i) => {
                const psi = s.psi_scores?.[feature];
                return (
                  <td key={i} className="p-0.5">
                    <div
                      title={psi !== undefined ? `PSI ${psi}` : "no data"}
                      className="w-7 h-7 flex items-center justify-center font-mono text-[8px]"
                      style={{ background: cellFill(psi), color: textColor(psi) }}
                    >
                      {psi !== undefined && psi !== null ? psi.toFixed(2) : "–"}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-3 mt-3 font-mono text-[10px] text-ink-500">
        <span>PSI:</span>
        <LegendSwatch color="#e4e4e4" label="<0.1 stable" />
        <LegendSwatch color="#999999" label="0.1–0.2 watch" />
        <LegendSwatch color="#4d4d4d" label="0.2–0.4 shift" />
        <LegendSwatch color="#000000" label=">0.4 drift" />
      </div>
    </div>
  );
}

function LegendSwatch({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="w-3 h-3 inline-block" style={{ background: color }} />
      {label}
    </span>
  );
}
