import rateLimit from "express-rate-limit";

export const rateLimitPublic = rateLimit({
  windowMs: 60 * 1000,      // 1 minute
  max: 30,                 // 30 submits/min/IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: "Too many requests. Try again shortly." },
});
