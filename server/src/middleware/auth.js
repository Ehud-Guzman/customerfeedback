import jwt from "jsonwebtoken";
import { fail } from "../lib/http.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return fail(res, 401, "Unauthorized");

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    req.user = payload;
    return next();
  } catch {
    return fail(res, 401, "Unauthorized");
  }
}
