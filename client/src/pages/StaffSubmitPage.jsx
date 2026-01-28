import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import BackButton from "../components/BackButton.jsx";

import { listSurveys, getSurvey } from "../api/surveys.api";
import { submitStaffFeedback } from "../api/staffFeedback.api";

function parseChoices(choices) {
  if (!choices) return [];
  try {
    const v = JSON.parse(choices);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function AnswerField({ q, value, onChange }) {
  const type = String(q.type || "").toUpperCase();

  if (type === "RATING_1_5") {
    const n = Number(value || 0);
    return (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[1, 2, 3, 4, 5].map((x) => (
          <button
            key={x}
            type="button"
            className={n === x ? "" : "btn-secondary"}
            onClick={() => onChange(String(x))}
            style={{
              minWidth: 44,
              height: 40,
              borderRadius: 12,
              fontWeight: 900,
              background: n === x ? "#2563eb" : undefined,
              color: n === x ? "#fff" : undefined,
            }}
          >
            {x}
          </button>
        ))}
      </div>
    );
  }

  if (type === "YES_NO") {
    const v = String(value || "").toUpperCase();
    return (
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          className={v === "YES" ? "" : "btn-secondary"}
          onClick={() => onChange("YES")}
          style={{ borderRadius: 12, fontWeight: 900 }}
        >
          YES
        </button>
        <button
          type="button"
          className={v === "NO" ? "" : "btn-secondary"}
          onClick={() => onChange("NO")}
          style={{ borderRadius: 12, fontWeight: 900 }}
        >
          NO
        </button>
      </div>
    );
  }

  if (type === "CHOICE_SINGLE") {
    const options = parseChoices(q.choices);
    return (
      <select value={value || ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select…</option>
        {options.map((opt, idx) => {
          const key = typeof opt === "string" ? opt : opt.key ?? String(idx);
          const label = typeof opt === "string" ? opt : opt.label ?? key;
          return (
            <option key={key} value={key}>
              {label}
            </option>
          );
        })}
      </select>
    );
  }

  if (type === "TEXT") {
    return (
      <textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type response…"
      />
    );
  }

  return (
    <input
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Answer…"
    />
  );
}

export default function StaffSubmitPage() {
  const [surveyId, setSurveyId] = useState("");
  const [answers, setAnswers] = useState({});
  const [meta, setMeta] = useState({
    visitFrequency: "",
    timeSpentMin: "",
    fastExitReason: "",
    peakHourBucket: "",
  });

  // 1) list surveys (lightweight)
  const listQ = useQuery({
    queryKey: ["surveys"],
    queryFn: listSurveys,
  });

  const surveys = listQ.data?.data || [];

  // 2) fetch selected survey details (WITH questions)
  const surveyQ = useQuery({
    queryKey: ["survey", surveyId],
    queryFn: () => getSurvey(surveyId),
    enabled: !!surveyId,
  });

  const selected = surveyQ.data?.ok ? surveyQ.data.data : null;

  // when survey changes, clear answers/meta so old answers don’t leak
  useEffect(() => {
    setAnswers({});
    setMeta({
      visitFrequency: "",
      timeSpentMin: "",
      fastExitReason: "",
      peakHourBucket: "",
    });
  }, [surveyId]);

  const m = useMutation({
    mutationFn: (payload) => submitStaffFeedback(payload),
  });

  const canSubmit = useMemo(() => {
    if (!surveyId) return false;
    return Object.values(answers).some((v) => String(v || "").trim());
  }, [surveyId, answers]);

  const resetForm = () => {
    setAnswers({});
    setMeta({
      visitFrequency: "",
      timeSpentMin: "",
      fastExitReason: "",
      peakHourBucket: "",
    });
  };

  const onSubmit = async () => {
    if (!selected?.questions?.length) {
      alert("No questions loaded for this survey.");
      return;
    }

    const items = selected.questions
      .map((qq) => ({
        questionId: qq.id,
        value: String(answers[qq.id] ?? "").trim(),
      }))
      .filter((it) => it.value);

    if (!items.length) {
      alert("Answer at least one question.");
      return;
    }

    const payload = {
      surveyId,
      visitFrequency: meta.visitFrequency || null,
      timeSpentMin: meta.timeSpentMin ? Number(meta.timeSpentMin) : null,
      fastExitReason: meta.fastExitReason || null,
      peakHourBucket: meta.peakHourBucket || null,
      items,
    };

    const res = await m.mutateAsync(payload);
    if (res?.ok) resetForm();
  };

  return (
    <div className="container">
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 10,
        }}
      >
        <BackButton label="Dashboard" to="/app/overview" />
        <span className="muted" style={{ fontSize: 12 }}>
          Staff-assisted submission
        </span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Staff Submit</h1>
          <div className="muted">Capture feedback for customers without smartphones.</div>
        </div>
        <div className="chip">Mode: STAFF</div>
      </div>

      {/* Survey Picker */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
          Select survey
        </div>

        {listQ.isLoading ? (
          <div className="muted">Loading surveys…</div>
        ) : (
          <select value={surveyId} onChange={(e) => setSurveyId(e.target.value)}>
            <option value="">Select survey…</option>
            {surveys.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        )}

        {surveyId && (
          <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            {surveyQ.isLoading ? "Loading questions…" : selected?.description || "—"}
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
          <h3 style={{ margin: 0 }}>Context (optional)</h3>
          <span className="muted" style={{ fontSize: 12 }}>helps analytics</span>
        </div>

        <div className="grid" style={{ marginTop: 10, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <div className="field">
            <div className="label">Visit frequency</div>
            <select
              value={meta.visitFrequency}
              onChange={(e) => setMeta((x) => ({ ...x, visitFrequency: e.target.value }))}
            >
              <option value="">—</option>
              <option value="DAILY">DAILY</option>
              <option value="WEEKLY">WEEKLY</option>
              <option value="MONTHLY">MONTHLY</option>
              <option value="FIRST_TIME">FIRST_TIME</option>
            </select>
          </div>

          <div className="field">
            <div className="label">Time spent (minutes)</div>
            <input
              inputMode="numeric"
              placeholder="e.g. 5"
              value={meta.timeSpentMin}
              onChange={(e) => setMeta((x) => ({ ...x, timeSpentMin: e.target.value }))}
            />
          </div>

          <div className="field">
            <div className="label">Fast exit reason</div>
            <select
              value={meta.fastExitReason}
              onChange={(e) => setMeta((x) => ({ ...x, fastExitReason: e.target.value }))}
            >
              <option value="">—</option>
              <option value="QUEUE">QUEUE</option>
              <option value="NO_STOCK">NO_STOCK</option>
              <option value="PRICE">PRICE</option>
              <option value="SERVICE">SERVICE</option>
              <option value="OTHER">OTHER</option>
            </select>
          </div>

          <div className="field">
            <div className="label">Peak hour bucket</div>
            <select
              value={meta.peakHourBucket}
              onChange={(e) => setMeta((x) => ({ ...x, peakHourBucket: e.target.value }))}
            >
              <option value="">—</option>
              <option value="06-08">06-08</option>
              <option value="08-10">08-10</option>
              <option value="10-12">10-12</option>
              <option value="12-14">12-14</option>
              <option value="14-16">14-16</option>
              <option value="16-18">16-18</option>
              <option value="18-20">18-20</option>
            </select>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
          <h3 style={{ margin: 0 }}>Questions</h3>
          <span className="muted" style={{ fontSize: 12 }}>
            {surveyQ.isLoading ? "loading…" : selected?.questions?.length ? `${selected.questions.length} items` : "—"}
          </span>
        </div>

        {!surveyId ? (
          <div className="muted" style={{ marginTop: 10 }}>
            Pick a survey to start.
          </div>
        ) : surveyQ.isLoading ? (
          <div className="muted" style={{ marginTop: 10 }}>
            Loading survey questions…
          </div>
        ) : !selected?.questions?.length ? (
          <div className="muted" style={{ marginTop: 10 }}>
            No questions found for this survey.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
            {selected.questions.map((qq) => (
              <div key={qq.id} style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                  <div style={{ fontWeight: 900 }}>
                    {qq.order}. {qq.prompt}
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {qq.type}
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <AnswerField
                    q={qq}
                    value={answers[qq.id] ?? ""}
                    onChange={(v) => setAnswers((s) => ({ ...s, [qq.id]: v }))}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit */}
      <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <button className="btn-secondary" type="button" onClick={resetForm} disabled={m.isPending}>
          Reset
        </button>

        <button disabled={!canSubmit || m.isPending} onClick={onSubmit}>
          {m.isPending ? "Submitting…" : "Submit (STAFF)"}
        </button>
      </div>

      {m.data?.ok && (
        <div style={{ marginTop: 10 }}>
          ✅ Submitted: <b>{m.data.data?.responseId}</b>
        </div>
      )}

      {m.isError && (
        <div className="error" style={{ marginTop: 10 }}>
          {String(m.error?.message || "Failed to submit")}
        </div>
      )}
    </div>
  );
}
