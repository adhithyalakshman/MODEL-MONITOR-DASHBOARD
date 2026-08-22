import { Link } from "react-router-dom";
import { EmptyState, Badge } from "../components/Primitives";

export default function Overview({ models, loading }) {
  return (
    <div className="max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink-950">Overview</h1>
        <p className="mt-1 text-[13px] text-ink-500">
          All models currently reporting to this monitor.
        </p>
      </header>

      {loading && (
        <div className="font-mono text-[12px] text-ink-500">Loading models…</div>
      )}

      {!loading && models.length === 0 && (
        <EmptyState
          title="No models registered"
          description="Register a model and point its serving code at the ingestion API to start monitoring."
        />
      )}

      {!loading && models.length > 0 && (
        <div className="border border-ink-200">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-ink-200 bg-ink-50">
                <th className="font-mono text-[10px] uppercase tracking-wider text-ink-500 px-4 py-2.5">
                  Model
                </th>
                <th className="font-mono text-[10px] uppercase tracking-wider text-ink-500 px-4 py-2.5">
                  Version
                </th>
                <th className="font-mono text-[10px] uppercase tracking-wider text-ink-500 px-4 py-2.5">
                  API Key
                </th>
                <th className="font-mono text-[10px] uppercase tracking-wider text-ink-500 px-4 py-2.5">
                  Registered
                </th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr key={m.model_id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50">
                  <td className="px-4 py-3 font-medium text-[13px] text-ink-950">
                    {m.model_id}
                  </td>
                  <td className="px-4 py-3">
                    <Badge>{m.version}</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-ink-500">
                    {m.api_key.slice(0, 12)}…
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-ink-500">
                    {new Date(m.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/models/${m.model_id}`}
                      className="font-mono text-[11px] font-medium text-ink-950 underline underline-offset-2 hover:no-underline"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
