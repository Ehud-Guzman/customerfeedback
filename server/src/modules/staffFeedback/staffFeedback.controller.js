import { fail, ok } from "../../lib/http.js";
import { submitStaffFeedbackService } from "./staffFeedback.service.js";
import { VISIT_FREQUENCY, FAST_EXIT_REASONS, normalizeEnum } from "../../constants/feedback.js";

function requireOrgId(req) {
  const orgId = req.orgId || req.tenant?.orgId || req.headers["x-org-id"];
  return orgId ? String(orgId) : null;
}

function canStaffSubmit(user) {
  const role = String(user?.role || "").toUpperCase();
  return role === "STAFF" || role === "ORG_ADMIN" || role === "SYSTEM_ADMIN";
}

export async function submitStaffFeedback(req, res, next) {
  try {
    const orgId = requireOrgId(req);
    if (!orgId) return fail(res, 400, "Missing X-Org-Id");

    // Your requireAuth sets req.user
    const user = req.user;
    if (!user) return fail(res, 401, "Unauthorized");

    if (!canStaffSubmit(user)) return fail(res, 403, "Forbidden");

    const body = req.body || {};
    const surveyId = String(body.surveyId || "").trim();
    const itemsRaw = Array.isArray(body.items) ? body.items : [];

    if (!surveyId) return fail(res, 400, "surveyId is required");
    if (!itemsRaw.length) return fail(res, 400, "items[] is required");

    // Validate & sanitize items
    const items = itemsRaw.map((x) => ({
      questionId: String(x?.questionId || "").trim(),
      value: String(x?.value ?? "").trim(),
    }));

    for (const it of items) {
      if (!it.questionId) return fail(res, 400, "Each item needs questionId");
      if (!it.value) return fail(res, 400, "Each item needs value");
    }

    // Clamp timeSpentMin
    const timeSpent = body.timeSpentMin != null ? Number(body.timeSpentMin) : null;
    const timeSpentMin =
      Number.isFinite(timeSpent) ? Math.max(0, Math.floor(timeSpent)) : null;

    const payload = {
      orgId,
      surveyId,
      source: "STAFF",

      visitFrequency: normalizeEnum(VISIT_FREQUENCY, body.visitFrequency),
      timeSpentMin,
      fastExitReason: normalizeEnum(FAST_EXIT_REASONS, body.fastExitReason),
      peakHourBucket: String(body.peakHourBucket || "").trim() || null,

      staffUserId: String(user.id || ""), // optional for future audit
      items,
    };

    const data = await submitStaffFeedbackService(payload);

    return ok(res, data);
  } catch (e) {
    next(e);
  }
}
