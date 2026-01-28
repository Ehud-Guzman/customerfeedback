import express from "express";
import { prisma } from "../lib/prisma.js";
import { ok, fail } from "../lib/http.js";

const router = express.Router();

function requireSystem(req, res, next) {
  if (req.user?.role !== "SYSTEM_ADMIN") return fail(res, 403, "SYSTEM_ADMIN only");
  return next();
}

router.get("/", requireSystem, async (req, res) => {
  const rows = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, code: true, name: true, isActive: true, createdAt: true },
  });
  return ok(res, rows);
});

router.post("/", requireSystem, async (req, res) => {
  const { code, name } = req.body || {};
  if (!code || !name) return fail(res, 400, "code and name required");

  const row = await prisma.organization.create({
    data: { code: String(code).trim(), name: String(name).trim() },
    select: { id: true, code: true, name: true, isActive: true },
  });
  return ok(res, row);
});

export default router;
