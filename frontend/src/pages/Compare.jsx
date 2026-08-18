import { useState } from "react";
import api from "../api/client";
import { Panel, MetricCard, EmptyState } from "../components/Primitives";
import { LatencyChart, VolumeChart } from "../components/Charts";

export default function Compare({ models }) {
  const [selected, setSelected] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  function toggle(modelId) {
    setSelected((prev) =>
      prev.includes(modelId) ? prev.filter((m) => m !== modelId) : [...prev, modelId].slice(-3)
    );
  }

  async function handleCompare() {
    if (selected.length < 2) return;
    setLoading(true);
    try {
      const result = await api.compareModels(selected, 100);
      setData(result);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink-950">Compare</h1>
        <p className="mt-1 text-[13px] text-ink-500">
          Select 2–3 models to overlay performance side by side.
        </p>
      </header>

      <Panel title="Select Models" className="mb-6">
        <div className="flex flex-wrap gap-2">
          {models.map((m) => {
            const active = selected.includes(m.model_id);
            return (
              <button
                key={m.model_id}
                onClick={() => toggle(m.model_id)}
                className={`font-mono text-[11px] px-3 py-1.5 border transition-colors ${
                  active
                    ? "bg-ink-950 text-ink-0 border-ink-950"
                    : "border-ink-300 text-ink-700 hover:border-ink-950"
                }`}
              >
                {m.model_id}
              </button>
            );
          })}
        </div>
        <button
          onClick={handleCompare}
          disabled={selected.length < 2 || loading}
          className="mt-4 bg-ink-950 text-ink-0 px-4 py-2 font-mono text-[11px] uppercase tracking-wider hover:bg-ink-800 disabled:opacity-40"
        >
          {loading ? "Loading…" : `Compare (${selected.length})`}
        </button>
      </Panel>

      {!data && (
        <EmptyState
          title="No comparison yet"
          description="Pick at least two models above and click Compare."
        />
      )}

      {data && (
        <div className="space-y-4">
          <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${Object.keys(data).length}, minmax(0,1fr))` }}>
            {Object.entries(data).map(([modelId, snapshots]) => {
              const latest = snapshots[snapshots.length - 1];
              return (
                <div key={modelId} className="border border-ink-200">
                  <div className="px-3 py-2 border-b border-ink-200 bg-ink-950 text-ink-0 font-mono text-[11px] font-semibold">
                    {modelId}
                  </div>
                  <div className="grid grid-cols-2 gap-px bg-ink-200">
                    <MetricCard
                      label="p95 Latency"
                      value={latest ? Math.round(latest.p95_latency_ms) : "–"}
                      unit="ms"
                    />
                    <MetricCard
                      label="Requests"
                      value={latest ? latest.request_count : "–"}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {Object.entries(data).map(([modelId, snapshots]) => (
            <Panel key={modelId} title={`${modelId} — Latency`}>
              <LatencyChart data={snapshots} />
            </Panel>
          ))}
          {Object.entries(data).map(([modelId, snapshots]) => (
            <Panel key={`${modelId}-vol`} title={`${modelId} — Volume`}>
              <VolumeChart data={snapshots} />
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
