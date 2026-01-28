import {
  overviewAnalytics,
  trendsAnalytics,
  surveyAnalytics,
} from "./analytics.service.js";

function parseDays(qDays, fallback = 7) {
  const n = Number.parseInt(String(qDays ?? ""), 10);
  if (Number.isFinite(n) && n >= 1 && n <= 365) return n;
  return fallback;
}

function requireOrgId(req) {
  // best practice: orgId comes from tenant middleware using X-Org-Id header
  const orgId = req.orgId || req.tenant?.orgId || req.headers["x-org-id"];
  if (!orgId) {
    const err = new Error("Missing X-Org-Id");
    err.status = 400;
    throw err;
  }
  return String(orgId);
}

export async function getOverview(req, res, next) {
  try {
    const orgId = requireOrgId(req);
    const days = parseDays(req.query.days, 7);
    const data = await overviewAnalytics({ orgId, days });
    return res.json({ ok: true, data });
  } catch (e) {
    next(e);
  }
}

export async function getTrends(req, res, next) {
  try {
    const orgId = requireOrgId(req);
    const days = parseDays(req.query.days, 14);
    const data = await trendsAnalytics({ orgId, days });
    return res.json({ ok: true, data });
  } catch (e) {
    next(e);
  }
}

export async function getSurveyAnalytics(req, res, next) {
  try {
    const orgId = requireOrgId(req);
    const days = parseDays(req.query.days, 7);
    const surveyId = String(req.params.surveyId || "");
    if (!surveyId) return res.status(400).json({ ok: false, message: "Missing surveyId" });

    const data = await surveyAnalytics({ orgId, surveyId, days });
    return res.json({ ok: true, data });
  } catch (e) {
    next(e);
  }
}
