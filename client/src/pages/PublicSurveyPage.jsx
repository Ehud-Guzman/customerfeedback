import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getPublicSurvey, submitPublicSurvey } from "../api/public.api";

function QuestionField({ q, value, onChange }) {
  if (q.type === "RATING_1_5") {
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
  if (q.type === "YES_NO") {
    return (
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select…</option>
        <option value="YES">YES</option>
        <option value="NO">NO</option>
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
  const [meta, setMeta] = useState({
    visitFrequency: "",
    timeSpentMin: "",
    fastExitReason: "",
    peakHourBucket: "",
  });

  const q = useQuery({
    queryKey: ["publicSurvey", token],
    queryFn: () => getPublicSurvey(token),
  });

  const survey = q.data?.data?.survey;
  const questions = survey?.questions || [];

  const canSubmit = useMemo(() => {
    if (!questions.length) return false;
    // require at least 1 answered question for v1
    return questions.some((qq) => String(answers[qq.id] || "").trim());
  }, [questions, answers]);

  const m = useMutation({
    mutationFn: (payload) => submitPublicSurvey(token, payload),
  });

  const onSubmit = async () => {
    const items = questions
      .map((qq) => ({
        questionId: qq.id,
        value: String(answers[qq.id] ?? "").trim(),
      }))
      .filter((it) => it.value);

    const payload = {
      visitFrequency: meta.visitFrequency || null,
      timeSpentMin: meta.timeSpentMin ? Number(meta.timeSpentMin) : null,
      fastExitReason: meta.fastExitReason || null,
      peakHourBucket: meta.peakHourBucket || null,
      items,
    };

    await m.mutateAsync(payload);
  };

  if (q.isLoading) return <div style={{ padding: 16 }}>Loading…</div>;
  if (!q.data?.ok) return <div style={{ padding: 16 }}>Survey not available.</div>;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
      <h1 style={{ marginBottom: 4 }}>{survey.title}</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>{survey.description}</p>

      <div style={{ display: "grid", gap: 10, margin: "16px 0" }}>
        <input
          placeholder="Visit frequency (DAILY/WEEKLY/MONTHLY/FIRST_TIME)"
          value={meta.visitFrequency}
          onChange={(e) => setMeta((s) => ({ ...s, visitFrequency: e.target.value }))}
        />
        <input
          placeholder="Time spent (minutes)"
          value={meta.timeSpentMin}
          onChange={(e) => setMeta((s) => ({ ...s, timeSpentMin: e.target.value }))}
        />
        <input
          placeholder="Fast exit reason (QUEUE/NO_STOCK/PRICE/SERVICE/OTHER)"
          value={meta.fastExitReason}
          onChange={(e) => setMeta((s) => ({ ...s, fastExitReason: e.target.value }))}
        />
        <input
          placeholder="Peak hour bucket (e.g. 10-12)"
          value={meta.peakHourBucket}
          onChange={(e) => setMeta((s) => ({ ...s, peakHourBucket: e.target.value }))}
        />
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        {questions.map((qq) => (
          <div key={qq.id} style={{ border: "1px solid #ddd", padding: 12, borderRadius: 10 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{qq.order}. {qq.prompt}</div>
            <QuestionField
              q={qq}
              value={answers[qq.id]}
              onChange={(v) => setAnswers((s) => ({ ...s, [qq.id]: v }))}
            />
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        <button disabled={!canSubmit || m.isPending} onClick={onSubmit}>
          {m.isPending ? "Submitting…" : "Submit"}
        </button>

        {m.data?.ok && (
          <div style={{ marginTop: 10 }}>
            ✅ Submitted: {m.data.data?.responseId}
          </div>
        )}
        {m.isError && (
          <div style={{ marginTop: 10 }}>
            ❌ Failed. Check server / response.
          </div>
        )}
      </div>
    </div>
  );
}
