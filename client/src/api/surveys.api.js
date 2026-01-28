import { api } from "./axios";

export async function listSurveys() {
  const { data } = await api.get("/api/surveys");
  return data;
}

export async function getSurvey(id) {
  const { data } = await api.get(`/api/surveys/${id}`);
  return data;
}
