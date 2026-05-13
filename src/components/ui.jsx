export const cx = (...xs) => xs.filter(Boolean).join(" ");

export function Card({ className, children, ...rest }) {
  return (
    <div
      className={cx(
        "bg-paper border border-ink-200 rounded-xl shadow-[0_1px_0_rgba(15,15,12,0.02),0_8px_24px_-12px_rgba(15,15,12,0.08)]",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function RiskBadge({ level }) {
  const map = {
    HIGH: "bg-red-50 text-red-700 border-red-200",
    MEDIUM: "bg-amber-50 text-amber-800 border-amber-200",
    LOW: "bg-emerald-50 text-emerald-800 border-emerald-200",
  };
  const label = {
    HIGH: "Yüksek",
    MEDIUM: "Orta",
    LOW: "Düşük",
  }[level] || level;

  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-mono uppercase tracking-wider",
        map[level],
      )}
    >
      <span
        className={cx(
          "w-1.5 h-1.5 rounded-full",
          level === "HIGH" ? "bg-red-500" : level === "MEDIUM" ? "bg-amber-500" : "bg-emerald-500",
        )}
      />
      {label} risk
    </span>
  );
}

export function SeverityDot({ severity }) {
  const color = severity === "critical" ? "bg-red-500" : severity === "warning" ? "bg-amber-500" : "bg-emerald-500";
  return <span className={cx("inline-block w-2 h-2 rounded-full", color)} />;
}

export function StockBar({ current, threshold }) {
  const pct = Math.min(100, Math.round((current / Math.max(threshold, 1)) * 100));
  const color = pct < 35 ? "bg-red-500" : pct < 70 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div>
      <div className="h-1.5 w-full bg-ink-100 rounded-full overflow-hidden">
        <div className={cx("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between mt-1.5 text-[11px] font-mono text-ink-500">
        <span>
          <span className="text-ink-900 font-medium">{current}</span> stokta
        </span>
        <span>eşik {threshold}</span>
      </div>
    </div>
  );
}

export function RiskMeter({ score = 0 }) {
  const color = score >= 75 ? "bg-red-500" : score >= 50 ? "bg-amber-500" : "bg-emerald-500";
  const label = score >= 75 ? "text-red-700" : score >= 50 ? "text-amber-700" : "text-emerald-700";

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[11px] font-mono uppercase tracking-wider text-ink-500">Risk skoru</span>
        <span className={cx("font-mono text-sm", label)}>
          {score}
          <span className="text-ink-400">/100</span>
        </span>
      </div>
      <div className="h-1.5 w-full bg-ink-100 rounded-full overflow-hidden">
        <div className={cx("h-full rounded-full", color)} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

export function Sparkline({ series, height = 44, color = "#0F0F0C", fill = "rgba(15,15,12,0.06)" }) {
  if (!series || series.length === 0) return null;

  const w = 220;
  const h = height;
  const pad = 4;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const stepX = (w - pad * 2) / Math.max(series.length - 1, 1);
  const pts = series.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - (v - min) / range) * (h - pad * 2);
    return [x, y];
  });
  const path = pts.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(" ");
  const area = `${path} L${pts[pts.length - 1][0]},${h - pad} L${pts[0][0]},${h - pad} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" className="block">
      <path d={area} fill={fill} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.5" fill={color} />
    </svg>
  );
}

export function SectionHead({ eyebrow, title, subtitle, right }) {
  return (
    <div className="flex items-end justify-between mb-4 gap-4">
      <div>
        {eyebrow && <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-ink-500 mb-1">{eyebrow}</div>}
        <h2 className="text-[19px] font-medium tracking-tight text-ink-900">{title}</h2>
        {subtitle && <p className="text-[13px] text-ink-500 mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }) {
  if (!message) return null;

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800 flex items-center justify-between gap-3">
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="shrink-0 rounded-md border border-red-200 px-2 py-1 font-mono text-[11px] uppercase tracking-wider">
          Tekrar dene
        </button>
      )}
    </div>
  );
}

export function EmptyState({ children }) {
  return (
    <Card className="p-6 text-center text-[13px] text-ink-500">
      {children}
    </Card>
  );
}
