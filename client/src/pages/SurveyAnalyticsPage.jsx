import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getSurveyAnalytics } from "../api/analytics.api";
import BackButton from "../components/BackButton.jsx";
import BarList from "../components/BarList.jsx";

function pct(n) {
  if (n == null) return "—";
  return `${n.toFixed(1)}%`;
}

export default function SurveyAnalyticsPage() {
  const { surveyId } = useParams();
  const [days, setDays] = useState(7);

  const q = useQuery({
    queryKey: ["surveyAnalytics", surveyId, days],
    queryFn: () => getSurveyAnalytics(surveyId, days),
  });

  if (q.isLoading) return <div className="container">Loading…</div>;
  if (!q.data?.ok) return <div className="container">Failed to load.</div>;

  const d = q.data.data;

  return (
    <div className="container">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
            <BackButton label="Overview" to="/app/overview" />
            <span className="muted" style={{ fontSize: 12 }}>Survey analytics</span>
          </div>

          <h1 style={{ marginBottom: 4 }}>{d.survey?.title || "Survey"}</h1>
          <div className="muted">{d.survey?.description || ""}</div>
          <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
            Responses in window: <b>{d.responsesInWindow}</b>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="muted" style={{ fontSize: 12 }}>Window</span>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ width: 120 }}>
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </div>
      </div>

      {/* Questions */}
      <div className="grid" style={{ marginTop: 14 }}>
        {(d.questions || []).map((q) => (
          <div className="card" key={q.questionId}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div style={{ fontWeight: 800 }}>
                {q.order}. {q.prompt}
              </div>
              <div className="muted" style={{ fontSize: 12 }}>{q.type}</div>
            </div>

            <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
              Total answers: <b>{q.totalAnswers}</b>
            </div>

            {/* ⭐ RATING */}
            {q.type === "RATING_1_5" && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                  <div>
                    <div className="muted" style={{ fontSize: 12 }}>Average rating</div>
                    <div style={{ fontSize: 22, fontWeight: 900 }}>
                      {q.avgRating == null ? "—" : q.avgRating.toFixed(2)}
                    </div>
                  </div>

                  <div className="muted" style={{ fontSize: 12 }}>Distribution (1★–5★)</div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <BarList
                    items={q.chart || []}
                    labelKey="label"
                    valueKey="count"
                  />
                </div>
              </div>
            )}

            {/* 👍 YES / NO — 🔵 Phase 2 */}
            {q.type === "YES_NO" && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <div>
                    <div className="muted" style={{ fontSize: 12 }}>YES</div>
                    <div style={{ fontSize: 18, fontWeight: 900 }}>{q.yes}</div>
                  </div>
                  <div>
                    <div className="muted" style={{ fontSize: 12 }}>NO</div>
                    <div style={{ fontSize: 18, fontWeight: 900 }}>{q.no}</div>
                  </div>
                  <div>
                    <div className="muted" style={{ fontSize: 12 }}>YES %</div>
                    <div style={{ fontSize: 18, fontWeight: 900 }}>{pct(q.yesPercent)}</div>
                  </div>
                </div>

                {/* Bar chart */}
                <div style={{ marginTop: 10 }}>
                  <BarList
                    items={q.chart || []}
                    labelKey="label"
                    valueKey="count"
                  />
                </div>
              </div>
            )}

            {/* 📊 CHOICE SINGLE — 🔵 Phase 2 */}
            {q.type === "CHOICE_SINGLE" && (
              <div style={{ marginTop: 12 }}>
                {(q.chart || []).length ? (
                  <BarList
                    items={q.chart}
                    labelKey="label"
                    valueKey="count"
                  />
                ) : (
                  <div className="muted">No responses yet.</div>
                )}
              </div>
            )}

            {/* 💬 TEXT */}
            {q.type === "TEXT" && (
              <div style={{ marginTop: 10 }}>
                <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Latest comments</div>
                {(q.latest || []).length ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    {q.latest.map((c, idx) => (
                      <div key={idx} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 10 }}>
                        <div style={{ fontWeight: 700 }}>{c.value}</div>
                        <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
                          {new Date(c.submittedAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="muted">No comments yet.</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
