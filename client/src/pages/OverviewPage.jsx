import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getOverview, getTrends } from "../api/analytics.api";
import LineChart from "../components/LineChart.jsx";
import BarList from "../components/BarList.jsx";

function StatCard({ label, value, sub }) {
  return (
    <div className="card">
      <div className="muted" style={{ fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.02em" }}>
        {value}
      </div>
      {sub ? (
        <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
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

  const d = overviewQ.data?.data;

  const surveyRows = useMemo(() => {
    const rows = d?.surveyBreakdown || [];
    return rows.slice().sort((a, b) => (b.count || 0) - (a.count || 0));
  }, [d]);

  const trendsSeries = trendsQ.data?.data?.series || [];

  if (overviewQ.isLoading) return <div className="container">Loading…</div>;
  if (!overviewQ.data?.ok) return <div className="container">Failed to load.</div>;

  return (
    <div className="container">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Overview</h1>
          <div className="muted">Tenant analytics snapshot</div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="muted" style={{ fontSize: 12 }}>Window</span>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            style={{ width: 140 }}
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", marginTop: 14 }}>
        <StatCard
          label="Responses (window)"
          value={d.responsesInWindow}
          sub={`Since ${new Date(d.since).toLocaleString()}`}
        />
        <StatCard label="Total responses" value={d.totalResponses} />
        <StatCard
          label="Avg time spent (min)"
          value={d.avgTimeSpentMin == null ? "—" : d.avgTimeSpentMin.toFixed(1)}
          sub="Based on responses with timeSpentMin"
        />
      </div>

      {/* Bars */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", marginTop: 12 }}>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
            <h3 style={{ margin: 0 }}>Sources</h3>
            <span className="muted" style={{ fontSize: 12 }}>QR vs STAFF</span>
          </div>

          <div style={{ marginTop: 10 }}>
            {(d.sources || []).length ? (
              <BarList
                items={(d.sources || []).map((x) => ({ label: x.source, value: x.count }))}
                labelKey="label"
                valueKey="value"
              />
            ) : (
              <div className="muted">No source data yet.</div>
            )}
          </div>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
            <h3 style={{ margin: 0 }}>Top fast-exit reasons</h3>
            <span className="muted" style={{ fontSize: 12 }}>Last {days} days</span>
          </div>

          <div style={{ marginTop: 10 }}>
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
      <div className="grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", marginTop: 12 }}>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
            <h3 style={{ margin: 0 }}>Trends (14 days)</h3>
            <span className="muted" style={{ fontSize: 12 }}>responses/day</span>
          </div>

          <div style={{ marginTop: 10 }}>
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

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
            <h3 style={{ margin: 0 }}>Survey breakdown</h3>
            <span className="muted" style={{ fontSize: 12 }}>click a survey</span>
          </div>

          <div style={{ marginTop: 10 }}>
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
                    <span style={{ fontWeight: 800 }}>{s.title}</span>
                    <span className="muted">{s.count}</span>
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
