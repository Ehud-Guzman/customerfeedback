import express from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { ok, fail } from "../lib/http.js";

const router = express.Router();

function requireOrgAdmin(req, res, next) {
  const r = req.orgRole || req.role;
  if (r !== "ORG_ADMIN" && r !== "SYSTEM_ADMIN") return fail(res, 403, "ORG_ADMIN only");
  return next();
}

function makeToken(len = 24) {
  // URL-safe token
  return crypto.randomBytes(len).toString("base64url");
}

// List surveys
router.get("/", async (req, res) => {
  const rows = await prisma.survey.findMany({
    where: { orgId: req.orgId },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, description: true, isActive: true, createdAt: true },
  });
  return ok(res, rows);
});

// Create survey with questions
router.post("/", requireOrgAdmin, async (req, res) => {
  const { title, description, questions } = req.body || {};
  if (!title) return fail(res, 400, "title required");

  const qArr = Array.isArray(questions) ? questions : [];
  const data = {
    orgId: req.orgId,
    title: String(title).trim(),
    description: description ? String(description).trim() : null,
    questions: {
      create: qArr.map((q, i) => ({
        order: Number(q.order ?? (i + 1)),
        prompt: String(q.prompt || "").trim(),
        type: q.type,
        choices: q.choices ? JSON.stringify(q.choices) : null,
      })),
    },
  };

  const row = await prisma.survey.create({
    data,
    select: { id: true, title: true, description: true, isActive: true },
  });

  return ok(res, row);
});

// Get survey details
router.get("/:id", async (req, res) => {
  const id = String(req.params.id);
  const row = await prisma.survey.findFirst({
    where: { id, orgId: req.orgId },
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
  });
  if (!row) return fail(res, 404, "Survey not found");
  return ok(res, row);
});

//
// ✅ QR TOKEN MANAGEMENT (ADMIN)
//

// GET /api/surveys/:id/qr -> return latest active QR token for this survey
router.get("/:id/qr", requireOrgAdmin, async (req, res) => {
  const surveyId = String(req.params.id || "").trim();
  if (!surveyId) return fail(res, 400, "surveyId required");

  // ensure survey belongs to org
  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, orgId: req.orgId },
    select: { id: true },
  });
  if (!survey) return fail(res, 404, "Survey not found");

  const qr = await prisma.qrToken.findFirst({
    where: {
      orgId: req.orgId,
      surveyId,
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
    select: { token: true, createdAt: true, expiresAt: true, isActive: true },
  });

  return ok(res, { token: qr?.token || null, createdAt: qr?.createdAt || null, expiresAt: qr?.expiresAt || null });
});

// POST /api/surveys/:id/qr -> create a new token (optionally rotate)
router.post("/:id/qr", requireOrgAdmin, async (req, res) => {
  const surveyId = String(req.params.id || "").trim();
  if (!surveyId) return fail(res, 400, "surveyId required");

  const body = req.body || {};
  const rotate = Boolean(body.rotate); // if true, deactivate old tokens
  const expiresInDays = body.expiresInDays == null ? null : Number(body.expiresInDays);

  // ensure survey belongs to org
  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, orgId: req.orgId },
    select: { id: true },
  });
  if (!survey) return fail(res, 404, "Survey not found");

  if (rotate) {
    await prisma.qrToken.updateMany({
      where: { orgId: req.orgId, surveyId, isActive: true },
      data: { isActive: false },
    });
  } else {
    // if not rotating, return existing active if present
    const existing = await prisma.qrToken.findFirst({
      where: {
        orgId: req.orgId,
        surveyId,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: "desc" },
      select: { token: true, createdAt: true, expiresAt: true },
    });
    if (existing) return ok(res, existing);
  }

  let expiresAt = null;
  if (Number.isFinite(expiresInDays) && expiresInDays >= 1 && expiresInDays <= 365) {
    const d = new Date();
    d.setDate(d.getDate() + Math.floor(expiresInDays));
    expiresAt = d;
  }

  // create new
  const created = await prisma.qrToken.create({
    data: {
      orgId: req.orgId,
      surveyId,
      token: makeToken(24),
      isActive: true,
      expiresAt,
    },
    select: { token: true, createdAt: true, expiresAt: true },
  });

  return ok(res, created);
});

export default router;
