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
 * GET /api/analytics/overview?days=7
 */
export async function overviewAnalytics({ orgId, days }) {
  // harden days to prevent accidental "all time" queries
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

  return {
    windowDays,
    since: since.toISOString(),

    totalResponses,
    responsesInWindow,

    avgTimeSpentMin: avgTimeSpent._avg.timeSpentMin ?? null,

    // Frontend-friendly arrays
    peakHours: peakHourBuckets
      .filter((x) => x.peakHourBucket)
      .map((x) => ({
        bucket: x.peakHourBucket,
        count: x._count._all,
      })),

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
 *
 * NOTE: SQLite date-grouping via Prisma is limited.
 * We fetch minimal fields for a short window, then aggregate in JS.
 */
export async function trendsAnalytics({ orgId, days }) {
  const windowDays = clampInt(days, 1, 365, 14);
  const since = startDateFromDays(windowDays);

  const rows = await prisma.response.findMany({
    where: { orgId, submittedAt: { gte: since } },
    select: { submittedAt: true, timeSpentMin: true, source: true },
    orderBy: { submittedAt: "asc" },
  });

  const byDay = new Map(); // dayKey -> { count, timeSum, timeCount, bySource }
  for (const r of rows) {
    const day = toDayKey(r.submittedAt);

    if (!byDay.has(day)) {
      byDay.set(day, {
        count: 0,
        timeSum: 0,
        timeCount: 0,
        bySource: new Map(), // source -> count
      });
    }

    const agg = byDay.get(day);
    agg.count += 1;

    // time spent avg
    if (r.timeSpentMin != null) {
      const n = safeNumber(r.timeSpentMin);
      if (n != null) {
        agg.timeSum += n;
        agg.timeCount += 1;
      }
    }

    // source split
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

  // Must belong to org, must be active (optional, but best practice)
  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, orgId },
    include: {
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

  // Count responses in the window for this survey
  const responsesInWindow = await prisma.response.count({
    where: { orgId, surveyId, submittedAt: { gte: since } },
  });

  // Pull response items for this survey+org in window, minimal + joined metadata
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

  // Pre-parse choice definitions (choices JSON string)
  // Expected structure (your design): array of { key, label } OR array of strings
  const choiceMapByQ = new Map(); // qid -> Map(optionKey -> label)
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
      // ignore bad JSON in v1; you can fix in UI later
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


      // rating
      ratingSum: 0,
      ratingCount: 0,

      // yes/no
      yes: 0,
      no: 0,

      // choice
      choiceCounts: new Map(), // optionKey -> count

      // text
      textLatest: [], // { value, submittedAt, source }
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

    // distribution
    s.ratingDist[r] = (s.ratingDist[r] || 0) + 1;
  }
    } else if (qType === "YES_NO") {
      const v = normalizeEnumish(valRaw);
      if (v === "YES") s.yes += 1;
      else if (v === "NO") s.no += 1;
    } else if (qType === "CHOICE_SINGLE") {
      // store option keys normalized so chart isn’t messy
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

  // finalize question analytics
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
      };

   if (String(q.type).toUpperCase() === "RATING_1_5") {
  out.avgRating = q.ratingCount ? q.ratingSum / q.ratingCount : null;
  out.ratingDist = q.ratingDist; // {1: n,2: n,3: n,4: n,5: n}
}


      if (type === "YES_NO") {
        const total = q.yes + q.no;
        out.yes = q.yes;
        out.no = q.no;
        out.yesPercent = total ? (q.yes / total) * 100 : null;
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
