import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { Panel } from "../components/Primitives";

export default function RegisterModel({ onRegistered }) {
  const [modelId, setModelId] = useState("");
  const [name, setName] = useState("");
  const [version, setVersion] = useState("v1");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const model = await api.registerModel({ model_id: modelId, name, version });
      setResult(model);
      onRegistered?.();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to register model.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink-950">Register Model</h1>
        <p className="mt-1 text-[13px] text-ink-500">
          Create a monitoring target and get back an API key for ingestion.
        </p>
      </header>

      {!result && (
        <Panel title="New Model">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Model ID" hint="Unique identifier, e.g. fraud-detector-v2">
              <input
                required
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                placeholder="fraud-detector-v2"
                className="w-full border border-ink-300 px-3 py-2 font-mono text-[13px] focus:border-ink-950"
              />
            </Field>
            <Field label="Display Name">
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Fraud Detector"
                className="w-full border border-ink-300 px-3 py-2 text-[13px] focus:border-ink-950"
              />
            </Field>
            <Field label="Version">
              <input
                required
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="v1"
                className="w-full border border-ink-300 px-3 py-2 font-mono text-[13px] focus:border-ink-950"
              />
            </Field>

            {error && (
              <div className="border border-ink-950 bg-ink-950 text-ink-0 px-3 py-2 font-mono text-[12px]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-ink-950 text-ink-0 py-2.5 font-mono text-[12px] font-semibold uppercase tracking-wider hover:bg-ink-800 disabled:opacity-50"
            >
              {submitting ? "Registering…" : "Register Model"}
            </button>
          </form>
        </Panel>
      )}

      {result && (
        <Panel title="Model Registered">
          <div className="space-y-3">
            <Row label="Model ID" value={result.model_id} />
            <Row label="API Key" value={result.api_key} mono />
            <div className="border border-ink-200 bg-ink-50 p-3 font-mono text-[11px] text-ink-600 leading-relaxed">
              Add this to your model's serving code:
              <pre className="mt-2 whitespace-pre-wrap text-ink-950">
{`requests.post(
  "http://localhost:8000/v1/predictions",
  headers={"X-API-Key": "${result.api_key}"},
  json={
    "model_id": "${result.model_id}",
    "input_features": {...},
    "prediction": 0.83,
    "latency_ms": 42.1,
  },
)`}
              </pre>
            </div>
            <button
              onClick={() => navigate(`/models/${result.model_id}`)}
              className="w-full bg-ink-950 text-ink-0 py-2.5 font-mono text-[12px] font-semibold uppercase tracking-wider hover:bg-ink-800"
            >
              Go to Model →
            </button>
          </div>
        </Panel>
      )}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="block font-mono text-[10px] uppercase tracking-wider text-ink-500 mb-1.5">
        {label}
      </span>
      {children}
      {hint && <span className="block mt-1 text-[11px] text-ink-400">{hint}</span>}
    </label>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between border-b border-ink-100 pb-2">
      <span className="font-mono text-[10px] uppercase tracking-wider text-ink-500">{label}</span>
      <span className={`text-[13px] text-ink-950 ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
