import { NavLink, useParams } from "react-router-dom";

const navItem =
  "flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium tracking-tight transition-colors border-l-2";

export default function Sidebar({ models }) {
  const { modelId } = useParams();

  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 flex flex-col bg-ink-950 text-ink-0 border-r border-ink-950">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-ink-800">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-ink-0" />
          <span className="font-mono text-[13px] font-semibold tracking-widest uppercase">
            Sentinel
          </span>
        </div>
        <div className="mt-1 font-mono text-[10px] text-ink-500 tracking-wider">
          MODEL MONITORING
        </div>
      </div>

      {/* Global nav */}
      <nav className="px-2 py-3 border-b border-ink-800">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `${navItem} ${
              isActive
                ? "border-ink-0 text-ink-0 bg-ink-900"
                : "border-transparent text-ink-400 hover:text-ink-0"
            }`
          }
        >
          Overview
        </NavLink>
        <NavLink
          to="/compare"
          className={({ isActive }) =>
            `${navItem} ${
              isActive
                ? "border-ink-0 text-ink-0 bg-ink-900"
                : "border-transparent text-ink-400 hover:text-ink-0"
            }`
          }
        >
          Compare
        </NavLink>
        <NavLink
          to="/register"
          className={({ isActive }) =>
            `${navItem} ${
              isActive
                ? "border-ink-0 text-ink-0 bg-ink-900"
                : "border-transparent text-ink-400 hover:text-ink-0"
            }`
          }
        >
          Register Model
        </NavLink>
      </nav>

      {/* Model list */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        <div className="px-3 mb-2 font-mono text-[10px] text-ink-500 tracking-wider uppercase">
          Models ({models.length})
        </div>
        {models.length === 0 && (
          <div className="px-3 text-[12px] text-ink-500">No models registered yet.</div>
        )}
        {models.map((m) => (
          <NavLink
            key={m.model_id}
            to={`/models/${m.model_id}`}
            className={({ isActive }) =>
              `${navItem} ${
                isActive || modelId === m.model_id
                  ? "border-ink-0 text-ink-0 bg-ink-900"
                  : "border-transparent text-ink-400 hover:text-ink-0"
              }`
            }
          >
            <span className="w-1.5 h-1.5 bg-current shrink-0" />
            <span className="truncate">{m.model_id}</span>
            <span className="ml-auto font-mono text-[10px] text-ink-500">{m.version}</span>
          </NavLink>
        ))}
      </div>

      <div className="px-4 py-3 border-t border-ink-800 font-mono text-[10px] text-ink-600">
        v0.1.0 · local
      </div>
    </aside>
  );
}
