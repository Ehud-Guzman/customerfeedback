import express from "express";
import { prisma } from "../lib/prisma.js";
import { ok } from "../lib/http.js";

const router = express.Router();

// Basic starter analytics (template): counts + rating average per question
router.get("/overview", async (req, res) => {
  const orgId = req.orgId;

  const totalResponses = await prisma.response.count({ where: { orgId } });

  // Peak hour bucket distribution
  const peak = await prisma.response.groupBy({
    by: ["peakHourBucket"],
    where: { orgId, peakHourBucket: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { _all: "desc" } },
    take: 12,
  });

  return ok(res, {
    totalResponses,
    peakHours: peak.map((p) => ({ bucket: p.peakHourBucket, count: p._count._all })),
  });
});

export default router;
