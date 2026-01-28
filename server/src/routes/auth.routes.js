import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { ok, fail } from "../lib/http.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, password, orgId } = req.body || {};

  const e = String(email || "").toLowerCase().trim();
  const p = String(password || "");
  const org = String(orgId || "").trim();

  if (!e || !p) return fail(res, 400, "Email and password required");
  if (!org) return fail(res, 400, "OrgId is required");

  const user = await prisma.user.findUnique({
    where: { email: e },
    select: { id: true, email: true, password: true, role: true, isActive: true },
  });

  if (!user || !user.isActive) return fail(res, 401, "Invalid credentials");

  const okPw = await bcrypt.compare(p, user.password);
  if (!okPw) return fail(res, 401, "Invalid credentials");

  // Validate membership for this org
  const membership = await prisma.membership.findFirst({
    where: { userId: user.id, orgId: org, isActive: true },
    select: {
      id: true,
      role: true,
      org: { select: { id: true, name: true, code: true } },
    },
  });

  if (!membership) {
    return fail(res, 403, "You don't have access to this organization (no membership)");
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,              // global role
      orgRole: membership.role,     // org-scoped role (useful)
    },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: "7d" }
  );

  return ok(res, {
    token,
    user: { id: user.id, email: user.email, role: user.role, orgRole: membership.role },
    org: { id: membership.org.id, name: membership.org.name, code: membership.org.code },
  });
});

export default router;
