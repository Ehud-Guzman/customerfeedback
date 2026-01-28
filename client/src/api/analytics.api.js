import { api } from "./axios";

export async function getOverview(days = 7) {
  const { data } = await api.get("/api/analytics/overview", { params: { days } });
  return data; // { ok, data: {...} }
}

export async function getTrends(days = 14) {
  const { data } = await api.get("/api/analytics/trends", { params: { days } });
  return data;
}

export async function getSurveyAnalytics(surveyId, days = 7) {
  const { data } = await api.get(`/api/analytics/surveys/${surveyId}`, { params: { days } });
  return data;
}
