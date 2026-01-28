// src/api/qr.api.js
import { api } from "./axios";

export async function getSurveyQr(surveyId) {
  const { data } = await api.get(`/api/surveys/${surveyId}/qr`);
  return data; // { ok, data: { token, createdAt, expiresAt } }
}

export async function createSurveyQr(surveyId, { rotate = false, expiresInDays = null } = {}) {
  const { data } = await api.post(`/api/surveys/${surveyId}/qr`, { rotate, expiresInDays });
  return data; // { ok, data: { token, createdAt, expiresAt } }
}
