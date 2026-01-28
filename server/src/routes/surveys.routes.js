import express from "express";
import { prisma } from "../lib/prisma.js";
import { ok, fail } from "../lib/http.js";

const router = express.Router();

function requireOrgAdmin(req, res, next) {
  const r = req.orgRole || req.role;
  if (r !== "ORG_ADMIN" && r !== "SYSTEM_ADMIN") return fail(res, 403, "ORG_ADMIN only");
  return next();
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
      id: true, title: true, description: true, isActive: true,
      questions: { where: { isActive: true }, orderBy: { order: "asc" }, select: { id: true, order: true, prompt: true, type: true, choices: true } },
    },
  });
  if (!row) return fail(res, 404, "Survey not found");
  return ok(res, row);
});

export default router;
