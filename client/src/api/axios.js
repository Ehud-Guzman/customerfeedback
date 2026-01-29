import axios from "axios";
import { storage } from "../lib/storage";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000";


export const api = axios.create({
  baseURL,
  withCredentials: false,
});

// Attach auth + tenant headers automatically (except public routes)
api.interceptors.request.use((config) => {
  const url = String(config.url || "");
  const isPublic = url.startsWith("/api/public");

  if (!isPublic) {
    const token = storage.getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;

    const orgId = storage.getOrgId();
    if (orgId) config.headers["X-Org-Id"] = orgId;
  }

  return config;
});

export const publicApi = axios.create({
  baseURL,
  withCredentials: false,
});
