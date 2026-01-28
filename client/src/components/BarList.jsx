export default function BarList({ items = [], labelKey = "label", valueKey = "value" }) {
  const rows = (items || []).filter((x) => x && Number.isFinite(Number(x[valueKey])));
  if (!rows.length) return <div className="muted">No data yet.</div>;

  const max = Math.max(...rows.map((r) => Number(r[valueKey])));

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {rows.map((r, idx) => {
        const val = Number(r[valueKey]);
        const pct = max ? (val / max) * 100 : 0;

        return (
          <div key={idx} style={{ display: "grid", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <span style={{ fontWeight: 800 }}>{String(r[labelKey])}</span>
              <span className="muted">{val}</span>
            </div>
            <div style={{ height: 10, background: "#f3f4f6", borderRadius: 999, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${pct}%`,
                  background: "linear-gradient(90deg, #2563eb, #111827)",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
