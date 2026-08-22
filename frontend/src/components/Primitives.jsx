export function Panel({ title, action, children, className = "" }) {
  return (
    <div className={`border border-ink-200 bg-ink-0 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-ink-200">
          <h3 className="font-mono text-[11px] font-semibold tracking-wider uppercase text-ink-700">
            {title}
          </h3>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

export function MetricCard({ label, value, unit, delta, deltaLabel }) {
  return (
    <div className="border border-ink-200 bg-ink-0 px-4 py-3.5">
      <div className="font-mono text-[10px] tracking-wider uppercase text-ink-500">
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className="font-mono text-2xl font-semibold tabular text-ink-950">
          {value}
        </span>
        {unit && <span className="font-mono text-xs text-ink-500">{unit}</span>}
      </div>
      {delta !== undefined && (
        <div className="mt-1 font-mono text-[11px] text-ink-500">
          <span className="text-ink-950 font-medium">
            {delta > 0 ? "▲" : delta < 0 ? "▼" : "–"} {Math.abs(delta)}
          </span>{" "}
          {deltaLabel}
        </div>
      )}
    </div>
  );
}

/**
 * Status is communicated with shape + weight, never color — this product
 * is strictly black/white/gray by design.
 *   ok      -> hollow square
 *   warn    -> half-filled square
 *   breach  -> solid square
 */
export function StatusDot({ status = "ok", label }) {
  const shapeClass =
    status === "breach"
      ? "bg-ink-950 border-ink-950"
      : status === "warn"
      ? "bg-ink-300 border-ink-950"
      : "bg-ink-0 border-ink-400";

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2.5 h-2.5 border ${shapeClass}`} />
      {label && <span className="font-mono text-[11px] text-ink-700">{label}</span>}
    </span>
  );
}

export function Badge({ children, tone = "default" }) {
  const toneClass =
    tone === "inverse"
      ? "bg-ink-950 text-ink-0"
      : "bg-ink-100 text-ink-700 border border-ink-300";
  return (
    <span
      className={`inline-block px-2 py-0.5 font-mono text-[10px] tracking-wide uppercase ${toneClass}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({ title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-ink-300">
      <div className="w-8 h-8 border-2 border-ink-950 mb-4" />
      <div className="font-mono text-sm font-semibold text-ink-950">{title}</div>
      {description && (
        <div className="mt-1 text-[13px] text-ink-500 max-w-xs">{description}</div>
      )}
    </div>
  );
}
