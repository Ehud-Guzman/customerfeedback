import { prisma } from "../../lib/prisma.js";

/**
 * Analytics service (multi-tenant, production-safe).
 * - Always scopes by orgId (never trust user-provided orgId in query/body)
 * - Uses time windows to keep queries cheap
 */

function clampInt(n, min, max, fallback) {
  const v = Number.parseInt(String(n ?? ""), 10);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

function startDateFromDays(days) {
  const d = new Date();
  d.setDate(d.getDate() - Number(days));
  return d;
}

function toDayKey(date) {
  // YYYY-MM-DD (server local time). Good enough for v1.
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeEnumish(v) {
  const s = String(v ?? "").trim();
  return s ? s.toUpperCase() : null;
}

function safeStr(v) {
  const s = String(v ?? "").trim();
  return s || null;
}

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Try to parse an hour from a bucket string.
 * Supports:
 *  - "08-09" -> 8
 *  - "8-9"   -> 8
 *  - "08"    -> 8
 *  - "8"     -> 8
 * Otherwise returns null.
 */
function bucketToHour(bucket) {
  const s = String(bucket ?? "").trim();
  if (!s) return null;

  const dash = s.split("-");
  if (dash.length >= 2) {
    const h = Number.parseInt(dash[0], 10);
    return Number.isFinite(h) ? h : null;
  }

  const h = Number.parseInt(s, 10);
  return Number.isFinite(h) ? h : null;
}

/**
 * GET /api/analytics/overview?days=7
 */
export async function overviewAnalytics({ orgId, days }) {
  const windowDays = clampInt(days, 1, 365, 7);
  const since = startDateFromDays(windowDays);

  const whereAllTime = { orgId };
  const whereWindow = { orgId, submittedAt: { gte: since } };

  const [
    totalResponses,
    responsesInWindow,
    avgTimeSpent,
    peakHourBuckets,
    fastExitReasons,
    bySource,
    surveyBreakdown,
  ] = await Promise.all([
    prisma.response.count({ where: whereAllTime }),

    prisma.response.count({ where: whereWindow }),

    prisma.response.aggregate({
      where: { ...whereWindow, timeSpentMin: { not: null } },
      _avg: { timeSpentMin: true },
    }),

    prisma.response.groupBy({
      by: ["peakHourBucket"],
      where: { ...whereWindow, peakHourBucket: { not: null } },
      _count: { _all: true },
      orderBy: { peakHourBucket: "asc" },
    }),

    prisma.response.groupBy({
      by: ["fastExitReason"],
      where: { ...whereWindow, fastExitReason: { not: null } },
      _count: { _all: true },
    }),

    prisma.response.groupBy({
      by: ["source"],
      where: whereWindow,
      _count: { _all: true },
    }),

    prisma.response.groupBy({
      by: ["surveyId"],
      where: whereWindow,
      _count: { _all: true },
    }),
  ]);

  // enrich survey titles (cheap)
  const surveyIds = surveyBreakdown.map((x) => x.surveyId).filter(Boolean);
  const surveys = surveyIds.length
    ? await prisma.survey.findMany({
        where: { id: { in: surveyIds }, orgId },
        select: { id: true, title: true },
      })
    : [];

  const surveyTitleMap = new Map(surveys.map((s) => [s.id, s.title]));

  const fastExitReasonsTop = fastExitReasons
    .map((x) => ({
      reason: normalizeEnumish(x.fastExitReason) ?? "UNKNOWN",
      count: x._count._all,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const peakHours = peakHourBuckets
    .filter((x) => x.peakHourBucket)
    .map((x) => {
      const bucket = x.peakHourBucket;
      const hour = bucketToHour(bucket);
      return {
        bucket,
        hour,
        count: x._count._all,
      };
    });

  return {
    updatedAt: new Date().toISOString(),

    windowDays,
    since: since.toISOString(),

    totalResponses,
    responsesInWindow,

    avgTimeSpentMin: avgTimeSpent._avg.timeSpentMin ?? null,

    peakHours,

    sources: bySource
      .map((x) => ({
        source: normalizeEnumish(x.source) ?? "UNKNOWN",
        count: x._count._all,
      }))
      .sort((a, b) => b.count - a.count),

    fastExitReasonsTop,

    surveyBreakdown: surveyBreakdown
      .map((x) => ({
        surveyId: x.surveyId,
        title: surveyTitleMap.get(x.surveyId) || "Unknown survey",
        count: x._count._all,
      }))
      .sort((a, b) => b.count - a.count),
  };
}

/**
 * GET /api/analytics/trends?days=14
 */
export async function trendsAnalytics({ orgId, days }) {
  const windowDays = clampInt(days, 1, 365, 14);
  const since = startDateFromDays(windowDays);

  const rows = await prisma.response.findMany({
    where: { orgId, submittedAt: { gte: since } },
    select: { submittedAt: true, timeSpentMin: true, source: true },
    orderBy: { submittedAt: "asc" },
  });

  const byDay = new Map();
  for (const r of rows) {
    const day = toDayKey(r.submittedAt);

    if (!byDay.has(day)) {
      byDay.set(day, {
        count: 0,
        timeSum: 0,
        timeCount: 0,
        bySource: new Map(),
      });
    }

    const agg = byDay.get(day);
    agg.count += 1;

    if (r.timeSpentMin != null) {
      const n = safeNumber(r.timeSpentMin);
      if (n != null) {
        agg.timeSum += n;
        agg.timeCount += 1;
      }
    }

    const src = normalizeEnumish(r.source) ?? "UNKNOWN";
    agg.bySource.set(src, (agg.bySource.get(src) || 0) + 1);
  }

  const series = Array.from(byDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, v]) => ({
      day,
      responses: v.count,
      avgTimeSpentMin: v.timeCount ? v.timeSum / v.timeCount : null,
      sources: Array.from(v.bySource.entries())
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count),
    }));

  return {
    updatedAt: new Date().toISOString(),

    windowDays,
    since: since.toISOString(),
    series,
  };
}

/**
 * GET /api/analytics/surveys/:surveyId?days=7
 */
export async function surveyAnalytics({ orgId, surveyId, days }) {
  const windowDays = clampInt(days, 1, 365, 7);
  const since = startDateFromDays(windowDays);

  // Must belong to org
  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, orgId },
    select: {
      id: true,
      title: true,
      description: true,
      questions: {
        where: { isActive: true },
        orderBy: { order: "asc" },
        select: { id: true, prompt: true, type: true, order: true, choices: true },
      },
    },
  });

  if (!survey) {
    const err = new Error("Survey not found");
    err.status = 404;
    throw err;
  }

  const responsesInWindow = await prisma.response.count({
    where: { orgId, surveyId, submittedAt: { gte: since } },
  });

  const items = await prisma.responseItem.findMany({
    where: {
      response: { orgId, surveyId, submittedAt: { gte: since } },
      question: { surveyId },
    },
    include: {
      question: { select: { id: true, type: true, prompt: true, order: true, choices: true } },
      response: { select: { submittedAt: true, source: true } },
    },
  });

  // Pre-parse choices JSON for CHOICE_SINGLE
  const choiceMapByQ = new Map();
  for (const q of survey.questions) {
    if (String(q.type).toUpperCase() !== "CHOICE_SINGLE") continue;
    const raw = String(q.choices || "").trim();
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      const m = new Map();

      if (Array.isArray(parsed)) {
        for (const opt of parsed) {
          if (typeof opt === "string") {
            const key = normalizeEnumish(opt) || opt;
            m.set(key, opt);
          } else if (opt && typeof opt === "object") {
            const key = normalizeEnumish(opt.key) || String(opt.key || "").trim();
            const label = String(opt.label || opt.key || "").trim();
            if (key) m.set(key, label || key);
          }
        }
      }

      if (m.size) choiceMapByQ.set(q.id, m);
    } catch {
      // ignore bad JSON in v1; fix via UI later
    }
  }

  // Aggregation per question
  const stats = new Map();
  for (const q of survey.questions) {
    stats.set(q.id, {
      questionId: q.id,
      order: q.order,
      prompt: q.prompt,
      type: q.type,
      totalAnswers: 0,

      ratingDist: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      ratingSum: 0,
      ratingCount: 0,

      yes: 0,
      no: 0,

      choiceCounts: new Map(),

      textLatest: [],
    });
  }

  for (const it of items) {
    const s = stats.get(it.questionId);
    if (!s) continue;

    const valRaw = String(it.value ?? "").trim();
    if (!valRaw) continue;

    s.totalAnswers += 1;

    const qType = String(it.question.type || "").toUpperCase();

    if (qType === "RATING_1_5") {
      const n = Number(valRaw);
      const r = Math.round(n);

      if (Number.isFinite(n) && r >= 1 && r <= 5) {
        s.ratingSum += r;
        s.ratingCount += 1;
        s.ratingDist[r] = (s.ratingDist[r] || 0) + 1;
      }
    } else if (qType === "YES_NO") {
      const v = normalizeEnumish(valRaw);
      if (v === "YES") s.yes += 1;
      else if (v === "NO") s.no += 1;
    } else if (qType === "CHOICE_SINGLE") {
      const key = normalizeEnumish(valRaw) ?? valRaw;
      s.choiceCounts.set(key, (s.choiceCounts.get(key) || 0) + 1);
    } else if (qType === "TEXT") {
      s.textLatest.push({
        value: valRaw,
        submittedAt: it.response.submittedAt,
        source: normalizeEnumish(it.response.source) ?? "UNKNOWN",
      });
    }
  }

  const questions = Array.from(stats.values())
    .sort((a, b) => a.order - b.order)
    .map((q) => {
      const type = String(q.type).toUpperCase();

      const out = {
        questionId: q.questionId,
        order: q.order,
        prompt: q.prompt,
        type: q.type,
        totalAnswers: q.totalAnswers,
        chart: null,
      };

      if (type === "RATING_1_5") {
        out.avgRating = q.ratingCount ? q.ratingSum / q.ratingCount : null;
        out.ratingDist = q.ratingDist;
        out.chart = [1, 2, 3, 4, 5].map((k) => ({
          label: String(k),
          count: q.ratingDist[k] || 0,
        }));
      }

      if (type === "YES_NO") {
        const total = q.yes + q.no;
        out.yes = q.yes;
        out.no = q.no;
        out.yesPercent = total ? (q.yes / total) * 100 : null;
        out.chart = [
          { label: "YES", count: q.yes },
          { label: "NO", count: q.no },
        ];
      }

      if (type === "CHOICE_SINGLE") {
        const labelMap = choiceMapByQ.get(q.questionId);

        out.options = Array.from(q.choiceCounts.entries())
          .map(([key, count]) => ({
            key,
            label: labelMap?.get(key) || labelMap?.get(String(key)) || key,
            count,
          }))
          .sort((a, b) => b.count - a.count);

        out.chart = out.options.map((o) => ({
          label: o.label,
          count: o.count,
        }));
      }

      if (type === "TEXT") {
        out.latest = q.textLatest
          .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
          .slice(0, 10)
          .map((x) => ({
            value: x.value,
            submittedAt: x.submittedAt,
            source: x.source,
          }));
      }

      return out;
    });

  return {
    updatedAt: new Date().toISOString(),

    windowDays,
    since: since.toISOString(),

    survey: {
      id: survey.id,
      title: survey.title,
      description: safeStr(survey.description),
    },

    responsesInWindow,
    questions,
  };
}
