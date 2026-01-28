
import { storage } from "../lib/storage";

import { api } from "./axios";

export async function login(email, password, orgId) {
  const { data } = await api.post("/api/auth/login", { email, password, orgId });
  return data;
}
