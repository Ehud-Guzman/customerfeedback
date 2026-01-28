import express from "express";
import { prisma } from "../lib/prisma.js";
import { ok, fail } from "../lib/http.js";
import { rateLimitPublic } from "../middleware/rateLimitPublic.js";
import { VISIT_FREQUENCY, FAST_EXIT_REASONS, normalizeEnum } from "../constants/feedback.js";

const router = express.Router();

function isExpired(expiresAt) {
  return expiresAt && new Date(expiresAt).getTime() <= Date.now();
}

// GET /api/public/q/:token -> survey + questions
router.get("/q/:token", async (req, res) => {
  const token = String(req.params.token || "").trim();
  if (!token) return fail(res, 400, "token required");

  const qr = await prisma.qrToken.findFirst({
    where: { token, isActive: true },
    select: {
      id: true,
      orgId: true,
      surveyId: true,
      expiresAt: true,
      isActive: true,
      survey: {
        select: {
          id: true,
          title: true,
          description: true,
          isActive: true,
          questions: {
            where: { isActive: true },
            orderBy: { order: "asc" },
            select: { id: true, order: true, prompt: true, type: true, choices: true },
          },
        },
      },
    },
  });

  if (!qr || !qr.isActive || !qr.survey?.isActive) return fail(res, 404, "Survey not found");
  if (isExpired(qr.expiresAt)) return fail(res, 410, "QR expired");

  return ok(res, { orgId: qr.orgId, survey: qr.survey });
});

// POST /api/public/q/:token/submit
router.post("/q/:token/submit", rateLimitPublic, async (req, res) => {
  const token = String(req.params.token || "").trim();
  const body = req.body || {};
  const items = Array.isArray(body.items) ? body.items : [];

  if (!token) return fail(res, 400, "token required");

  // Validate items early
  if (!items.length) return fail(res, 400, "items[] is required");
  for (const it of items) {
    if (!it?.questionId) return fail(res, 400, "Each item needs questionId");
    const v = String(it.value ?? "").trim();
    if (!v) return fail(res, 400, "Each item needs value");
  }

  const qr = await prisma.qrToken.findFirst({
    where: { token, isActive: true },
    select: {
      orgId: true,
      surveyId: true,
      expiresAt: true,
      isActive: true,
      survey: { select: { isActive: true } },
    },
  });

  if (!qr || !qr.isActive || !qr.survey?.isActive) return fail(res, 404, "Survey not found");
  if (isExpired(qr.expiresAt)) return fail(res, 410, "QR expired");

  // Security: ensure submitted questionIds belong to this survey
  const allowed = await prisma.question.findMany({
    where: { surveyId: qr.surveyId, isActive: true },
    select: { id: true },
  });
  const allowedSet = new Set(allowed.map((q) => q.id));

  for (const it of items) {
    const qid = String(it.questionId || "").trim();
    if (!allowedSet.has(qid)) {
      return fail(res, 400, "Invalid questionId for this survey");
    }
  }

  const timeSpent = body.timeSpentMin != null ? Number(body.timeSpentMin) : null;
  const timeSpentMin =
    Number.isFinite(timeSpent) ? Math.max(0, Math.floor(timeSpent)) : null;

  const response = await prisma.response.create({
    data: {
      orgId: qr.orgId,
      surveyId: qr.surveyId,

      // Channel tracking (Phase 1 polish)
      source: "QR",

      // Normalized fields (data hygiene)
      visitFrequency: normalizeEnum(VISIT_FREQUENCY, body.visitFrequency),
      timeSpentMin,
      fastExitReason: normalizeEnum(FAST_EXIT_REASONS, body.fastExitReason),
      peakHourBucket: String(body.peakHourBucket || "").trim() || null,

      items: {
        create: items.map((it) => ({
          questionId: String(it.questionId).trim(),
          value: String(it.value ?? "").trim(),
        })),
      },
    },
    select: { id: true, submittedAt: true },
  });

  return ok(res, { responseId: response.id, submittedAt: response.submittedAt });
});

export default router;
