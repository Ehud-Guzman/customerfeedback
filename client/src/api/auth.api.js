import { api } from "./axios";
import { storage } from "../lib/storage";

export async function login(email, password) {
  const { data } = await api.post("/api/auth/login", { email, password });
  // your backend returns ok + data maybe token (adjust if needed)
  // If your login response is different, paste it and I’ll align instantly.
  const token = data?.token || data?.data?.token;
  if (token) storage.setToken(token);
  return data;
}
