import { publicApi } from "./axios";

export async function getPublicSurvey(token) {
  const { data } = await publicApi.get(`/api/public/q/${token}`);
  return data; // { ok, data: { orgId, survey } }
}

export async function submitPublicSurvey(token, payload) {
  const { data } = await publicApi.post(`/api/public/q/${token}/submit`, payload);
  return data; // { ok, data: { responseId, submittedAt } }
}
