import { fail } from "../lib/http.js";

export function requireAnalyticsAccess(req, res, next) {
  const role = String(req.user?.role || "").toUpperCase();

  // Only admins can view analytics
  if (role === "SYSTEM_ADMIN" || role === "ORG_ADMIN") {
    return next();
  }

  return fail(res, 403, "Forbidden");
}
