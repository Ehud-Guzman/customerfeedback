import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getOverview, getTrends } from "../api/analytics.api";
import LineChart from "../components/LineChart.jsx";
import BarList from "../components/BarList.jsx";

function fmtDT(v) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return "—";
  }
}

function StatCard({ label, value, sub }) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="muted" style={{ fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 950, letterSpacing: "-0.02em", marginTop: 6 }}>
        {value}
      </div>
      {sub ? (
        <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
          {sub}
        </div>
      ) : null}
    </div>
  );
}

export default function OverviewPage() {
  const [days, setDays] = useState(7);

  const overviewQ = useQuery({
    queryKey: ["overview", days],
    queryFn: () => getOverview(days),
  });

  const trendsQ = useQuery({
    queryKey: ["trends", 14],
    queryFn: () => getTrends(14),
  });

  const ok = overviewQ.data?.ok;
  const d = overviewQ.data?.data;

  const surveyRows = useMemo(() => {
    const rows = d?.surveyBreakdown || [];
    return rows.slice().sort((a, b) => (b.count || 0) - (a.count || 0));
  }, [d]);

  const trendsSeries = trendsQ.data?.data?.series || [];

  // Better loading/error UI
  if (overviewQ.isLoading) {
    return (
      <div className="container" style={{ maxWidth: 1100 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 950, fontSize: 16 }}>Loading overview…</div>
          <div className="muted" style={{ marginTop: 6 }}>Pulling responses and summary analytics.</div>
        </div>
      </div>
    );
  }

  if (!ok) {
    const msg = overviewQ.data?.message || overviewQ.error?.message || "Failed to load overview.";
    return (
      <div className="container" style={{ maxWidth: 1100 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 950, fontSize: 16 }}>Couldn’t load overview</div>
          <div className="muted" style={{ marginTop: 6 }}>{msg}</div>
          <button className="btn" style={{ marginTop: 12 }} onClick={() => overviewQ.refetch()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "flex-end",
        }}
      >
        <div>
          <div className="muted" style={{ fontSize: 12 }}>Dashboard</div>
          <h1 style={{ marginBottom: 4, fontSize: 26, fontWeight: 950 }}>Overview</h1>
          <div className="muted" style={{ fontSize: 12 }}>
            Snapshot of feedback activity • Updated {fmtDT(d.updatedAt)}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span className="muted" style={{ fontSize: 12 }}>Window</span>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            style={{
              width: 160,
              padding: 10,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background: "#fff",
              fontWeight: 700,
            }}
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          marginTop: 14,
          gap: 12,
        }}
      >
        <StatCard
          label="Responses (window)"
          value={d.responsesInWindow ?? 0}
          sub={`Since ${fmtDT(d.since)}`}
        />
        <StatCard label="Total responses" value={d.totalResponses ?? 0} />
        <StatCard
          label="Avg time spent (min)"
          value={d.avgTimeSpentMin == null ? "—" : d.avgTimeSpentMin.toFixed(1)}
          sub="Based on responses with timeSpentMin"
        />
      </div>

      {/* Bars */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          marginTop: 12,
          gap: 12,
        }}
      >
        <div className="card" style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
            <div>
              <div style={{ fontWeight: 950 }}>Channels</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Public QR vs Staff-assisted</div>
            </div>
            <span className="muted" style={{ fontSize: 12 }}>Last {days} days</span>
          </div>

          <div style={{ marginTop: 12 }}>
            {(d.sources || []).length ? (
              <BarList
                items={(d.sources || []).map((x) => ({ label: x.source, value: x.count }))}
                labelKey="label"
                valueKey="value"
              />
            ) : (
              <div className="muted">No channel data yet.</div>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
            <div>
              <div style={{ fontWeight: 950 }}>Top fast-exit reasons</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                Why customers leave quickly
              </div>
            </div>
            <span className="muted" style={{ fontSize: 12 }}>Last {days} days</span>
          </div>

          <div style={{ marginTop: 12 }}>
            {(d.fastExitReasonsTop || []).length ? (
              <BarList
                items={(d.fastExitReasonsTop || []).map((x) => ({ label: x.reason, value: x.count }))}
                labelKey="label"
                valueKey="value"
              />
            ) : (
              <div className="muted">No fast-exit reasons yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Charts + Drilldowns */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
          marginTop: 12,
          gap: 12,
        }}
      >
        <div className="card" style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
            <div>
              <div style={{ fontWeight: 950 }}>Trends</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Last 14 days</div>
            </div>
            <span className="muted" style={{ fontSize: 12 }}>Responses/day</span>
          </div>

          <div style={{ marginTop: 12 }}>
            {trendsQ.isLoading ? (
              <div className="muted">Loading trends…</div>
            ) : trendsQ.data?.ok ? (
              <>
                <LineChart
                  data={trendsSeries}
                  xKey="day"
                  yKey="responses"
                  label="Responses per day"
                  valueFmt={(v) => String(Math.round(v))}
                />

                <div style={{ marginTop: 14 }}>
                  <LineChart
                    data={trendsSeries.filter((x) => x.avgTimeSpentMin != null)}
                    xKey="day"
                    yKey="avgTimeSpentMin"
                    label="Avg time spent (min)"
                    valueFmt={(v) => Number(v).toFixed(1)}
                  />
                </div>
              </>
            ) : (
              <div className="muted">Failed to load trends.</div>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
            <div>
              <div style={{ fontWeight: 950 }}>Survey breakdown</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                Click a survey to open analytics + QR
              </div>
            </div>
            <span className="muted" style={{ fontSize: 12 }}>
              {surveyRows.length ? `${surveyRows.length} surveys` : "No data"}
            </span>
          </div>

          <div style={{ marginTop: 12 }}>
            {surveyRows.length ? (
              <div style={{ display: "grid", gap: 8 }}>
                {surveyRows.map((s) => (
                  <Link
                    key={s.surveyId}
                    to={`/app/surveys/${s.surveyId}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "10px 12px",
                      border: "1px solid #e5e7eb",
                      borderRadius: 12,
                      background: "#fff",
                      textDecoration: "none",
                    }}
                  >
                    <span style={{ fontWeight: 850 }}>{s.title}</span>
                    <span className="muted" style={{ fontWeight: 800 }}>{s.count}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="muted">No survey responses yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
