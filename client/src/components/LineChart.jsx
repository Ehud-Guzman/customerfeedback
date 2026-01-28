export default function LineChart({
  data = [],
  xKey = "x",
  yKey = "y",
  height = 140,
  label,
  valueFmt = (v) => String(v),
}) {
  const W = 800; // internal viewbox width
  const H = height;
  const PAD = 24;

  const pts = data
    .map((d) => ({
      x: String(d?.[xKey] ?? ""),
      y: Number(d?.[yKey]),
    }))
    .filter((p) => Number.isFinite(p.y));

  if (!pts.length) {
    return (
      <div className="muted" style={{ fontSize: 12 }}>
        No chart data yet.
      </div>
    );
  }

  const ys = pts.map((p) => p.y);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const ySpan = yMax - yMin || 1;

  const xSpan = pts.length - 1 || 1;

  const sx = (i) => PAD + (i / xSpan) * (W - PAD * 2);
  const sy = (y) => PAD + (1 - (y - yMin) / ySpan) * (H - PAD * 2);

  const d = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${sx(i).toFixed(2)} ${sy(p.y).toFixed(2)}`)
    .join(" ");

  const last = pts[pts.length - 1];

  return (
    <div>
      {label ? (
        <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
          {label}
        </div>
      ) : null}

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img">
        {/* grid */}
        <g opacity="0.35">
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = PAD + t * (H - PAD * 2);
            return <line key={t} x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="#e5e7eb" />;
          })}
        </g>

        {/* line */}
        <path d={d} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />

        {/* points */}
        {pts.map((p, i) => (
          <circle key={i} cx={sx(i)} cy={sy(p.y)} r="3.5" fill="#111827" opacity="0.9" />
        ))}

        {/* last point highlight */}
        <circle cx={sx(pts.length - 1)} cy={sy(last.y)} r="6" fill="#2563eb" opacity="0.9" />

        {/* y labels */}
        <text x={PAD} y={PAD - 8} fontSize="11" fill="#6b7280">
          {valueFmt(yMax)}
        </text>
        <text x={PAD} y={H - 6} fontSize="11" fill="#6b7280">
          {valueFmt(yMin)}
        </text>
      </svg>

      <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
        Latest: <b>{valueFmt(last.y)}</b>
      </div>
    </div>
  );
}
