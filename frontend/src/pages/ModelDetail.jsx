import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import api from "../api/client";
import { Panel, MetricCard, StatusDot, EmptyState, Badge } from "../components/Primitives";
import {
  LatencyChart,
  VolumeChart,
  AccuracyChart,
  PredictionHistogram,
  DriftHeatmap,
} from "../components/Charts";

export default function ModelDetail() {
  const { modelId } = useParams();
  const [stats, setStats] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [baseline, setBaseline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, a, b] = await Promise.all([
      api.getStats(modelId, 100),
      api.getAlerts(modelId, 20),
      api.getBaseline(modelId),
    ]);
    setStats(s);
    setAlerts(a);
    setBaseline(b);
    setLoading(false);
  }, [modelId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000); // poll every 10s
    return () => clearInterval(interval);
  }, [load]);

  async function handleCaptureBaseline() {
    setCapturing(true);
    try {
      await api.captureBaseline(modelId, 500);
      await load();
    } finally {
      setCapturing(false);
    }
  }

  const latest = stats[stats.length - 1];

  if (loading && stats.length === 0) {
    return <div className="font-mono text-[12px] text-ink-500">Loading…</div>;
  }

  if (stats.length === 0) {
    return (
      <div className="max-w-3xl">
        <ModelHeader modelId={modelId} />
        <EmptyState
          title="No stats yet"
          description="No prediction windows have been processed for this model. Send traffic, then run the stats job (jobs/compute_stats.py)."
        />
      </div>
    );
  }

  const maxPsi = latest?.psi_scores
    ? Math.max(0, ...Object.values(latest.psi_scores))
    : null;
  const driftStatus = maxPsi === null ? "ok" : maxPsi >= 0.4 ? "breach" : maxPsi >= 0.2 ? "warn" : "ok";

  return (
    <div className="max-w-6xl">
      <ModelHeader modelId={modelId} />

      {/* Top metric row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MetricCard
          label="p95 Latency"
          value={latest ? Math.round(latest.p95_latency_ms) : "–"}
          unit="ms"
        />
        <MetricCard
          label="Requests / window"
          value={latest ? latest.request_count : "–"}
        />
        <MetricCard
          label="Max Drift (PSI)"
          value={maxPsi !== null ? maxPsi.toFixed(2) : "n/a"}
        />
        <MetricCard
          label="Accuracy"
          value={latest?.accuracy != null ? `${Math.round(latest.accuracy * 100)}` : "–"}
          unit={latest?.accuracy != null ? "%" : ""}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Panel title="Latency (p50 · p95 · p99)">
          <LatencyChart data={stats} />
        </Panel>
        <Panel title="Request Volume">
          <VolumeChart data={stats} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Panel title="Prediction Distribution (latest window)">
          <PredictionHistogram histogram={latest?.prediction_histogram} />
        </Panel>
        <Panel title="Accuracy Proxy (labeled subset)">
          {latest?.accuracy != null ? (
            <AccuracyChart data={stats} />
          ) : (
            <div className="h-[220px] flex items-center justify-center font-mono text-[12px] text-ink-400">
              No labeled predictions yet — POST /v1/labels to enable this.
            </div>
          )}
        </Panel>
      </div>

      <Panel
        title="Feature Drift"
        action={
          <div className="flex items-center gap-3">
            <StatusDot status={driftStatus} label={driftStatus.toUpperCase()} />
            <button
              onClick={handleCaptureBaseline}
              disabled={capturing}
              className="font-mono text-[10px] uppercase tracking-wider border border-ink-950 px-2.5 py-1 hover:bg-ink-950 hover:text-ink-0 disabled:opacity-50"
            >
              {capturing ? "Capturing…" : baseline.length ? "Recapture Baseline" : "Capture Baseline"}
            </button>
          </div>
        }
        className="mb-4"
      >
        {baseline.length === 0 ? (
          <EmptyState
            title="No baseline captured"
            description="Capture a baseline from recent traffic to start measuring PSI/KS drift against it."
          />
        ) : (
          <DriftHeatmap snapshots={stats.slice(-24)} />
        )}
      </Panel>

      <Panel title="Alert History">
        {alerts.length === 0 ? (
          <div className="font-mono text-[12px] text-ink-400 py-2">
            No alerts fired. Configure alert rules via the API (POST /v1/models/{modelId}/alert-rules).
          </div>
        ) : (
          <div className="divide-y divide-ink-100">
            {alerts.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <StatusDot status="breach" />
                  <span className="font-mono text-[12px] text-ink-950">{a.message}</span>
                </div>
                <span className="font-mono text-[11px] text-ink-500">
                  {new Date(a.fired_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function ModelHeader({ modelId }) {
  return (
    <header className="mb-6 flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-ink-950 font-mono">
            {modelId}
          </h1>
          <Badge tone="inverse">LIVE</Badge>
        </div>
        <p className="mt-1 text-[13px] text-ink-500">
          Auto-refreshing every 10s · stats computed by the background job
        </p>
      </div>
    </header>
  );
}
