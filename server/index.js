import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./src/routes/auth.routes.js";
import orgRoutes from "./src/routes/orgs.routes.js";
import surveyRoutes from "./src/routes/surveys.routes.js";
import publicRoutes from "./src/routes/public.routes.js";

import { requireAuth } from "./src/middleware/auth.js";
import { tenantContext, requireTenant } from "./src/middleware/tenant.js";

import analyticsRoutes from "./src/modules/analytics/analytics.routes.js";
import staffFeedbackRoutes from "./src/modules/staffFeedback/staffFeedback.routes.js";

import { requireAnalyticsAccess } from "./src/middleware/requireAnalyticsAccess.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS
const envOrigins = String(process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  ...envOrigins,
]);

app.set("trust proxy", 1);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.has(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Org-Id"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

app.options("*", cors());

app.use(express.json({ limit: "1mb" }));
app.disable("etag");

// Health
app.get("/health", (req, res) =>
  res.json({ status: "ok", message: "Customer Feedback API running" })
);

// Public (QR) routes (NO AUTH)
app.use("/api/public", publicRoutes);

// Auth
app.use("/api/auth", authRoutes);

// Platform (SYSTEM_ADMIN)
app.use("/api/orgs", requireAuth, orgRoutes);

// Tenant app routes (everything under /api/* except public/auth/orgs)
app.use("/api", requireAuth, tenantContext, requireTenant);

// Tenant modules
app.use("/api/surveys", surveyRoutes);

// Analytics (ORG_ADMIN + SYSTEM_ADMIN only)
app.use("/api/analytics", requireAnalyticsAccess, analyticsRoutes);

// Staff-assisted submissions (STAFF allowed)
app.use("/api/staff-feedback", staffFeedbackRoutes);

// 404
app.use((req, res) =>
  res
    .status(404)
    .json({ ok: false, message: `Route not found: ${req.method} ${req.originalUrl}` })
);

// Global error handler
app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);

  if (err?.message?.includes("CORS") || err?.message?.includes("Not allowed by CORS")) {
    return res.status(403).json({ ok: false, message: "Blocked by CORS" });
  }

  const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
  const message =
    err?.message && status !== 500 ? err.message : err?.message || "Server error";

  return res.status(status).json({ ok: false, message });
});

app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
