import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
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

function QuestionField({ q, value, onChange }) {
  const type = String(q.type || "").toUpperCase();

  if (type === "RATING_1_5") {
    return (
      <input
        type="number"
        min={1}
        max={5}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="1-5"
      />
    );
  }

  if (type === "YES_NO") {
    return (
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select…</option>
        <option value="YES">YES</option>
        <option value="NO">NO</option>
      </select>
    );
  }

  if (type === "CHOICE_SINGLE") {
    const options = parseChoices(q.choices);
    return (
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
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
      rows={3}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Type here…"
    />
  );
}

export default function PublicSurveyPage() {
  const { token } = useParams();
  const [answers, setAnswers] = useState({}); // questionId -> value

  const q = useQuery({
    queryKey: ["publicSurvey", token],
    queryFn: () => getPublicSurvey(token),
  });

  const survey = q.data?.data?.survey;

  const questions = useMemo(() => {
    return Array.isArray(survey?.questions) ? survey.questions : [];
  }, [survey]);

  const submit = useMutation({
    mutationFn: (payload) => submitPublicSurvey(token, payload),
    onSuccess: (res) => {
      if (res?.ok) {
        toast.success("Thanks! Feedback submitted.");
        setAnswers({});
      } else {
        toast.error(res?.message || "Submit failed");
      }
    },
    onError: () => toast.error("Submit failed"),
  });

  function setAnswer(questionId, v) {
    setAnswers((prev) => ({ ...prev, [questionId]: v }));
  }

  function onSubmit() {
    const items = questions
      .map((q) => ({
        questionId: q.id,
        value: String(answers[q.id] ?? "").trim(),
      }))
      .filter((x) => x.value);

    submit.mutate({ items });
  }

  if (q.isLoading) return <div className="container">Loading…</div>;
  if (!q.data?.ok) return <div className="container">Not found.</div>;

  return (
    <div className="container" style={{ maxWidth: 760 }}>
      <div className="card">
        <h1 style={{ marginBottom: 6 }}>{survey?.title || "Survey"}</h1>
        {survey?.description ? <div className="muted">{survey.description}</div> : null}
      </div>

      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        {questions.map((qItem, idx) => (
          <div className="card" key={qItem.id}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>
              {idx + 1}. {qItem.prompt}
            </div>

            <QuestionField
              q={qItem}
              value={answers[qItem.id] ?? ""}
              onChange={(v) => setAnswer(qItem.id, v)}
            />
          </div>
        ))}
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center" }}>
        <button className="btn" onClick={onSubmit} disabled={submit.isPending}>
          {submit.isPending ? "Submitting..." : "Submit"}
        </button>
        <span className="muted" style={{ fontSize: 12 }}>
          No login required.
        </span>
      </div>
    </div>
  );
}
