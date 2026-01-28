import { api } from "./axios";

export async function submitStaffFeedback(payload) {
  const { data } = await api.post("/api/staff-feedback/submit", payload);
  return data; // { ok, data: { responseId, submittedAt } }
}
