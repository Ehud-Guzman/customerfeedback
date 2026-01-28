import { Router } from "express";
import {
  getOverview,
  getTrends,
  getSurveyAnalytics,
} from "./analytics.controller.js";

function requireAnalyticsAccess(req, res, next) {
  const user = req.user || req.me;
  const role = String(user?.role || "").toUpperCase();

  if (role === "SYSTEM_ADMIN" || role === "ORG_ADMIN") return next();
  return res.status(403).json({ ok: false, message: "Forbidden" });
}

const router = Router();

router.use(requireAnalyticsAccess);

// GET /api/analytics/overview?days=7
router.get("/overview", getOverview);

// GET /api/analytics/trends?days=14
router.get("/trends", getTrends);

// GET /api/analytics/surveys/:surveyId?days=7
router.get("/surveys/:surveyId", getSurveyAnalytics);

export default router;
