export default function LineChart({
  data = [],
  xKey = "x",
  yKey = "y",
  height = 150,
  label,
  valueFmt = (v) => String(v),
}) {
  const W = 800;
  const H = height;
  const PADX = 28;
  const PADY = 22;

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

  const sx = (i) => PADX + (i / xSpan) * (W - PADX * 2);
  const sy = (y) => PADY + (1 - (y - yMin) / ySpan) * (H - PADY * 2);

  const pathD = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${sx(i).toFixed(2)} ${sy(p.y).toFixed(2)}`)
    .join(" ");

  const last = pts[pts.length - 1];

  return (
    <div>
      {label ? (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div className="muted" style={{ fontSize: 12 }}>{label}</div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 900,
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid #e5e7eb",
              background: "#fff",
            }}
          >
            Latest: {valueFmt(last.y)}
          </span>
        </div>
      ) : null}

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" style={{ marginTop: label ? 10 : 0 }}>
        {/* grid */}
        <g opacity="0.5">
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = PADY + t * (H - PADY * 2);
            return (
              <line
                key={t}
                x1={PADX}
                y1={y}
                x2={W - PADX}
                y2={y}
                stroke="#e5e7eb"
              />
            );
          })}
        </g>

        {/* line */}
        <path
          d={pathD}
          fill="none"
          stroke="#2563eb"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* last point highlight */}
        <circle cx={sx(pts.length - 1)} cy={sy(last.y)} r="6" fill="#2563eb" opacity="0.9" />

        {/* y labels */}
        <text x={PADX} y={PADY - 8} fontSize="11" fill="#6b7280">
          {valueFmt(yMax)}
        </text>
        <text x={PADX} y={H - 6} fontSize="11" fill="#6b7280">
          {valueFmt(yMin)}
        </text>
      </svg>
    </div>
  );
}
