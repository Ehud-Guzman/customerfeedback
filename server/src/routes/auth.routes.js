import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { ok, fail } from "../lib/http.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return fail(res, 400, "Email and password required");

  const user = await prisma.user.findUnique({
    where: { email: String(email).toLowerCase().trim() },
    select: { id: true, email: true, password: true, role: true, isActive: true },
  });

  if (!user || !user.isActive) return fail(res, 401, "Invalid credentials");

  const okPw = await bcrypt.compare(String(password), user.password);
  if (!okPw) return fail(res, 401, "Invalid credentials");

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: "7d" }
  );

  return ok(res, { token, user: { id: user.id, email: user.email, role: user.role } });
});

export default router;
