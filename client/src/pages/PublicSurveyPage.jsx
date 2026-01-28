import { useMemo, useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { getPublicSurvey, submitPublicSurvey } from "../api/public.api";

function parseChoices(choices) {
  if (!choices) return [];
  try {
    const v = JSON.parse(choices);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function Badge({ children }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid #e5e7eb",
        background: "#fff",
        fontSize: 12,
        fontWeight: 800,
      }}
    >
      {children}
    </span>
  );
}

function QuestionField({ q, value, onChange, kiosk }) {
  const type = String(q.type || "").toUpperCase();

  const baseStyle = kiosk
    ? { padding: 14, fontSize: 16, borderRadius: 14 }
    : { padding: 10, borderRadius: 12 };

  if (type === "RATING_1_5") {
    return (
      <input
        style={baseStyle}
        type="number"
        min={1}
        max={5}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="1–5"
      />
    );
  }

  if (type === "YES_NO") {
    return (
      <select
        style={baseStyle}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select…</option>
        <option value="YES">YES</option>
        <option value="NO">NO</option>
      </select>
    );
  }

  if (type === "CHOICE_SINGLE") {
    const options = parseChoices(q.choices);
    return (
      <select
        style={baseStyle}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select…</option>
        {options.map((opt, idx) => {
          const key = typeof opt === "string" ? opt : opt?.key ?? String(idx);
          const label = typeof opt === "string" ? opt : opt?.label ?? key;
          return (
            <option key={key} value={key}>
              {label}
            </option>
          );
        })}
      </select>
    );
  }

  return (
    <textarea
      style={kiosk ? { ...baseStyle, minHeight: 110 } : { ...baseStyle, minHeight: 90 }}
      rows={kiosk ? 4 : 3}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Type here…"
    />
  );
}

export default function PublicSurveyPage() {
  const { token } = useParams();
  const [params] = useSearchParams();
  const kiosk = params.get("mode") === "kiosk";

  const [answers, setAnswers] = useState({});
  const [successScreen, setSuccessScreen] = useState(false);

  const q = useQuery({
    queryKey: ["publicSurvey", token],
    queryFn: () => getPublicSurvey(token),
  });

  const survey = q.data?.data?.survey;

  const questions = useMemo(() => {
    return Array.isArray(survey?.questions) ? survey.questions : [];
  }, [survey]);

  const answeredCount = useMemo(() => {
    return questions.reduce((n, qq) => {
      const v = String(answers[qq.id] ?? "").trim();
      return n + (v ? 1 : 0);
    }, 0);
  }, [questions, answers]);

  const canSubmit = useMemo(() => {
    if (!questions.length) return false;
    // fastest/friendliest rule: at least one answer
    return answeredCount > 0;
  }, [questions, answeredCount]);

  const setAnswer = useCallback((questionId, v) => {
    setAnswers((prev) => ({ ...prev, [questionId]: v }));
  }, []);

  const submit = useMutation({
    mutationFn: (payload) => submitPublicSurvey(token, payload),
    onSuccess: (res) => {
      if (res?.ok) {
        toast.success("Thanks! Feedback submitted.");
        setAnswers({});
        setSuccessScreen(true);

        // kiosk auto-reset
        if (kiosk) setTimeout(() => setSuccessScreen(false), 2000);
      } else {
        toast.error(res?.message || "Submit failed");
      }
    },
    onError: () => toast.error("Submit failed"),
  });

  const onSubmit = useCallback(() => {
    const items = questions
      .map((qq) => ({
        questionId: qq.id,
        value: String(answers[qq.id] ?? "").trim(),
      }))
      .filter((x) => x.value);

    submit.mutate({ items });
  }, [questions, answers, submit]);

  // kiosk: keep it clean after success
  useEffect(() => {
    if (!kiosk) return;
    if (!successScreen) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [kiosk, successScreen]);

  // on success screen in QR mode, scroll top when returning
  useEffect(() => {
    if (successScreen) return;
    // when success clears (submit another), bring user to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [successScreen]);

  // Loading / invalid
  if (q.isLoading) {
    return (
      <div className="container" style={{ maxWidth: kiosk ? 980 : 760 }}>
        <div className="card" style={{ padding: kiosk ? 22 : 16 }}>
          <div style={{ fontWeight: 950, fontSize: kiosk ? 20 : 16 }}>Loading survey…</div>
          <div className="muted" style={{ marginTop: 6 }}>Preparing questions.</div>
        </div>
      </div>
    );
  }

  if (!q.data?.ok || !survey) {
    return (
      <div className="container" style={{ maxWidth: kiosk ? 980 : 760 }}>
        <div className="card" style={{ padding: kiosk ? 22 : 16 }}>
          <div style={{ fontWeight: 950, fontSize: kiosk ? 20 : 16 }}>Survey not found</div>
          <div className="muted" style={{ marginTop: 6 }}>
            This link may be invalid or the QR token was rotated.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: kiosk ? 980 : 760 }}>
      {/* Header */}
      <div className="card" style={{ padding: kiosk ? 22 : 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ marginBottom: 6, fontSize: kiosk ? 30 : 22, fontWeight: 950 }}>
              {survey.title || "Survey"}
            </h1>
            {survey.description ? <div className="muted">{survey.description}</div> : null}
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {kiosk ? <Badge>🧾 Kiosk mode</Badge> : <Badge>🔒 No login</Badge>}
            <Badge>
              {answeredCount}/{questions.length} answered
            </Badge>
          </div>
        </div>

        <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
          {kiosk
            ? "Tap answers and press Submit. It resets automatically for the next customer."
            : "Quick and anonymous. Takes under a minute."}
        </div>
      </div>

      {/* Success */}
      {successScreen ? (
        <div className="card" style={{ marginTop: 12, padding: kiosk ? 28 : 18, textAlign: "center" }}>
          <div style={{ fontSize: kiosk ? 28 : 18, fontWeight: 950 }}>✅ Thank you!</div>
          <div className="muted" style={{ marginTop: 8 }}>
            Your feedback has been submitted.
          </div>

          {!kiosk ? (
            <button className="btn" style={{ marginTop: 14 }} onClick={() => setSuccessScreen(false)}>
              Submit another
            </button>
          ) : (
            <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
              Preparing for next customer…
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Questions */}
          <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
            {questions.map((qItem, idx) => (
              <div className="card" key={qItem.id} style={{ padding: kiosk ? 20 : 14 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "baseline",
                    flexWrap: "wrap",
                    marginBottom: 10,
                  }}
                >
                  <div style={{ fontWeight: 950, fontSize: kiosk ? 18 : 14 }}>
                    {idx + 1}. {qItem.prompt}
                  </div>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {String(qItem.type || "").replaceAll("_", " ")}
                  </span>
                </div>

                <QuestionField
                  q={qItem}
                  value={answers[qItem.id] ?? ""}
                  onChange={(v) => setAnswer(qItem.id, v)}
                  kiosk={kiosk}
                />
              </div>
            ))}
          </div>

          {/* Submit */}
          <div
            style={{
              marginTop: 14,
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              className="btn"
              onClick={onSubmit}
              disabled={submit.isPending || !canSubmit}
              style={kiosk ? { padding: "14px 18px", fontSize: 16, borderRadius: 14 } : {}}
            >
              {submit.isPending ? "Submitting…" : "Submit"}
            </button>

            <span className="muted" style={{ fontSize: 12 }}>
              {canSubmit ? "Ready to submit." : "Answer at least one question to submit."}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
