import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getSurveyAnalytics } from "../api/analytics.api";
import { getSurveyQr, createSurveyQr } from "../api/qr.api";

import BackButton from "../components/BackButton.jsx";
import BarList from "../components/BarList.jsx";
import SurveyQrCard from "../components/SurveyQrCard.jsx";

function pct(n) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return `${Number(n).toFixed(1)}%`;
}

function fmtDT(v) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return "—";
  }
}

function Chip({ label, value }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 999,
        padding: "6px 10px",
        display: "inline-flex",
        gap: 8,
        alignItems: "center",
        background: "#fff",
      }}
    >
      <span className="muted" style={{ fontSize: 12 }}>{label}</span>
      <span style={{ fontWeight: 900, fontSize: 12 }}>{value}</span>
    </div>
  );
}

function Card({ title, subtitle, right, children }) {
  return (
    <div className="card" style={{ padding: 14 }}>
      {(title || subtitle || right) ? (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "flex-start",
            marginBottom: 10,
          }}
        >
          <div>
            {title ? <div style={{ fontWeight: 950, fontSize: 14 }}>{title}</div> : null}
            {subtitle ? <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{subtitle}</div> : null}
          </div>
          {right ? <div>{right}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export default function SurveyAnalyticsPage() {
  // ✅ Hooks FIRST, always, no early returns before this section ends
  const { surveyId } = useParams();
  const qc = useQueryClient();
  const [days, setDays] = useState(7);

  const analyticsQ = useQuery({
    queryKey: ["surveyAnalytics", surveyId, days],
    queryFn: () => getSurveyAnalytics(surveyId, days),
  });

  const qrQ = useQuery({
    queryKey: ["surveyQr", surveyId],
    queryFn: () => getSurveyQr(surveyId),
  });

  const generateQr = useMutation({
    mutationFn: () => createSurveyQr(surveyId, { rotate: false }),
    onSuccess: (res) => {
      if (res?.ok) {
        toast.success("QR token generated");
        qc.invalidateQueries({ queryKey: ["surveyQr", surveyId] });
      } else {
        toast.error(res?.message || "Failed to generate QR");
      }
    },
    onError: () => toast.error("Failed to generate QR"),
  });

  const rotateQr = useMutation({
    mutationFn: () => createSurveyQr(surveyId, { rotate: true }),
    onSuccess: (res) => {
      if (res?.ok) {
        toast.success("QR rotated (old token disabled)");
        qc.invalidateQueries({ queryKey: ["surveyQr", surveyId] });
      } else {
        toast.error(res?.message || "Failed to rotate QR");
      }
    },
    onError: () => toast.error("Failed to rotate QR"),
  });

  // ✅ Derived data via useMemo is ALSO a hook — so it must be above returns
  const d = analyticsQ.data?.ok ? analyticsQ.data.data : null;
  const questions = useMemo(() => (Array.isArray(d?.questions) ? d.questions : []), [d]);

  const kpis = useMemo(() => {
    const totalAnswers = questions.reduce((sum, q) => sum + Number(q.totalAnswers || 0), 0);
    const yesNoCount = questions.filter((q) => q.type === "YES_NO").length;
    const choiceCount = questions.filter((q) => q.type === "CHOICE_SINGLE").length;
    const ratingCount = questions.filter((q) => q.type === "RATING_1_5").length;
    const textCount = questions.filter((q) => q.type === "TEXT").length;

    return { totalAnswers, yesNoCount, choiceCount, ratingCount, textCount };
  }, [questions]);

  const token = qrQ.data?.ok ? (qrQ.data?.data?.token || null) : null;
  const qrMeta = qrQ.data?.ok ? qrQ.data?.data : null;

  // ✅ Now we can conditionally render safely

  // Loading
  if (analyticsQ.isLoading) {
    return (
      <div className="container" style={{ maxWidth: 1100 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
          <BackButton label="Overview" to="/app/overview" />
          <span className="muted" style={{ fontSize: 12 }}>Survey analytics</span>
        </div>

        <Card title="Loading analytics…" subtitle="Fetching survey data and response stats." />
      </div>
    );
  }

  // Error / not ok
  if (!analyticsQ.data?.ok) {
    const msg =
      analyticsQ.data?.message ||
      analyticsQ.error?.message ||
      "Analytics failed to load.";

    return (
      <div className="container" style={{ maxWidth: 1100 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
          <BackButton label="Overview" to="/app/overview" />
          <span className="muted" style={{ fontSize: 12 }}>Survey analytics</span>
        </div>

        <Card
          title="Couldn’t load analytics"
          subtitle={msg}
          right={
            <button className="btn" onClick={() => analyticsQ.refetch()}>
              Retry
            </button>
          }
        >
          <div className="muted" style={{ fontSize: 12 }}>
            If this keeps happening, check backend logs for Prisma errors and confirm X-Org-Id header is present.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <BackButton label="Overview" to="/app/overview" />
        <span className="muted" style={{ fontSize: 12 }}>Survey analytics</span>
      </div>

      {/* Hero */}
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ minWidth: 260 }}>
            <div className="muted" style={{ fontSize: 12 }}>Survey</div>
            <div style={{ fontSize: 22, fontWeight: 950, marginTop: 4 }}>
              {d?.survey?.title || "Survey"}
            </div>

            {d?.survey?.description ? (
              <div className="muted" style={{ marginTop: 6 }}>
                {d.survey.description}
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <Chip label="Responses" value={d?.responsesInWindow ?? 0} />
              <Chip label="Questions" value={questions.length} />
              <Chip label="Total answers" value={kpis.totalAnswers} />
              <Chip label="Updated" value={fmtDT(d?.updatedAt)} />
            </div>
          </div>

          <div style={{ display: "grid", gap: 8, alignContent: "start" }}>
            <div className="muted" style={{ fontSize: 12 }}>Window</div>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              style={{
                width: 180,
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

            <div className="muted" style={{ fontSize: 12 }}>QR</div>

            {token ? (
              <button
                className="btn-secondary"
                onClick={() => rotateQr.mutate()}
                disabled={rotateQr.isPending}
                title="Disable old token and create a new one"
              >
                {rotateQr.isPending ? "Rotating…" : "Rotate QR"}
              </button>
            ) : (
              <button className="btn" onClick={() => generateQr.mutate()} disabled={generateQr.isPending}>
                {generateQr.isPending ? "Generating…" : "Generate QR"}
              </button>
            )}

            {qrMeta?.createdAt ? (
              <div className="muted" style={{ fontSize: 12 }}>
                Created: {fmtDT(qrMeta.createdAt)}
                {qrMeta.expiresAt ? ` • Expires: ${fmtDT(qrMeta.expiresAt)}` : ""}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* QR card */}
      <div style={{ marginTop: 12 }}>
        {token ? (
          <SurveyQrCard token={token} meta={qrMeta} />

        ) : (
          <Card
            title="Public QR"
            subtitle="Generate a QR token to start collecting anonymous feedback via public link."
            right={
              <button className="btn" onClick={() => generateQr.mutate()} disabled={generateQr.isPending}>
                {generateQr.isPending ? "Generating…" : "Generate QR"}
              </button>
            }
          />
        )}
      </div>

      {/* KPI grid */}
      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
        <Card title="Response activity" subtitle="Data volume in this window">
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="muted">Responses</span>
              <b>{d?.responsesInWindow ?? 0}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="muted">Total answers</span>
              <b>{kpis.totalAnswers}</b>
            </div>
          </div>
        </Card>

        <Card title="Question mix" subtitle="Types present">
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="muted">YES/NO</span>
              <b>{kpis.yesNoCount}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="muted">Choice</span>
              <b>{kpis.choiceCount}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="muted">Rating</span>
              <b>{kpis.ratingCount}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="muted">Text</span>
              <b>{kpis.textCount}</b>
            </div>
          </div>
        </Card>

        <Card title="Trust signals" subtitle="Credibility details">
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="muted">Last updated</span>
              <b style={{ fontSize: 12 }}>{fmtDT(d?.updatedAt)}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="muted">Window (days)</span>
              <b>{d?.windowDays ?? days}</b>
            </div>
          </div>
        </Card>
      </div>

      {/* Questions */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 950, fontSize: 14, marginBottom: 10 }}>
          Question analytics
        </div>

        {questions.length === 0 ? (
          <Card
            title="No questions found"
            subtitle="This survey has no active questions. Add questions to start collecting useful responses."
          />
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {questions.map((q) => {
              const type = String(q.type || "").toUpperCase();

              return (
                <div className="card" key={q.questionId} style={{ padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 950, fontSize: 14 }}>
                        {q.order}. {q.prompt}
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                        <Chip label="Type" value={type} />
                        <Chip label="Answers" value={q.totalAnswers ?? 0} />
                        {type === "YES_NO" ? <Chip label="YES %" value={pct(q.yesPercent)} /> : null}
                        {type === "RATING_1_5" ? (
                          <Chip label="Avg rating" value={q.avgRating == null ? "—" : Number(q.avgRating).toFixed(2)} />
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Charts / details */}
                  {type === "RATING_1_5" && (
                    <div style={{ marginTop: 12 }}>
                      <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Distribution (1–5)</div>
                      <BarList items={q.chart || []} labelKey="label" valueKey="count" />
                    </div>
                  )}

                  {type === "YES_NO" && (
                    <div style={{ marginTop: 12 }}>
                      {(q.chart || []).length ? (
                        <BarList items={q.chart} labelKey="label" valueKey="count" />
                      ) : (
                        <div className="muted">No responses yet.</div>
                      )}
                    </div>
                  )}

                  {type === "CHOICE_SINGLE" && (
                    <div style={{ marginTop: 12 }}>
                      <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Option distribution</div>
                      {(q.chart || []).length ? (
                        <BarList items={q.chart} labelKey="label" valueKey="count" />
                      ) : (
                        <div className="muted">No responses yet.</div>
                      )}
                    </div>
                  )}

                  {type === "TEXT" && (
                    <div style={{ marginTop: 12 }}>
                      <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Latest comments</div>
                      {(q.latest || []).length ? (
                        <div style={{ display: "grid", gap: 10 }}>
                          {q.latest.map((c, idx) => (
                            <div
                              key={idx}
                              style={{
                                border: "1px solid #e5e7eb",
                                borderRadius: 14,
                                padding: 12,
                                background: "#fff",
                              }}
                            >
                              <div style={{ fontWeight: 800 }}>{c.value}</div>
                              <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                                {fmtDT(c.submittedAt)}
                                {c.source ? ` • ${c.source}` : ""}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="muted">No comments yet.</div>
                      )}
                    </div>
                  )}

                  {!["RATING_1_5", "YES_NO", "CHOICE_SINGLE", "TEXT"].includes(type) ? (
                    <div className="muted" style={{ marginTop: 12 }}>
                      This question type isn’t supported in analytics UI yet.
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="muted" style={{ fontSize: 12, marginTop: 12, textAlign: "center" }}>
        Tip: Use “Open test” in the QR card to verify public survey before printing.
      </div>
    </div>
  );
}
