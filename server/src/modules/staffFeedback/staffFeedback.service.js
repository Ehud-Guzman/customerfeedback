import { prisma } from "../../lib/prisma.js";

export async function submitStaffFeedbackService({
  orgId,
  surveyId,
  source,
  visitFrequency,
  timeSpentMin,
  fastExitReason,
  peakHourBucket,
  staffUserId, // v1: not stored unless you add a field (future)
  items,
}) {
  // Ensure survey belongs to org and is active
  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, orgId, isActive: true },
    select: { id: true },
  });

  if (!survey) {
    const err = new Error("Survey not found for this organization");
    err.status = 404;
    throw err;
  }

  // Security: ensure questionIds belong to this survey (prevents injection)
  const allowed = await prisma.question.findMany({
    where: { surveyId, isActive: true },
    select: { id: true },
  });

  const allowedSet = new Set(allowed.map((q) => q.id));
  for (const it of items) {
    if (!allowedSet.has(it.questionId)) {
      const err = new Error("Invalid questionId for this survey");
      err.status = 400;
      throw err;
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    const response = await tx.response.create({
      data: {
        orgId,
        surveyId,
        source: source || "STAFF",

        visitFrequency: visitFrequency || null,
        timeSpentMin: Number.isFinite(timeSpentMin) ? Math.max(0, Math.floor(timeSpentMin)) : null,
        fastExitReason: fastExitReason || null,
        peakHourBucket: peakHourBucket || null,
      },
      select: { id: true, submittedAt: true },
    });

    await tx.responseItem.createMany({
      data: items.map((it) => ({
        responseId: response.id,
        questionId: it.questionId,
        value: it.value,
      })),
    });

    return response;
  });

  return {
    responseId: created.id,
    submittedAt: created.submittedAt,
  };
}
