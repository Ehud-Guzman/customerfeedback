import bcrypt from "bcrypt";
import { nanoid } from "nanoid";
import { prisma } from "../src/lib/prisma.js";

async function main() {
  // SYSTEM_ADMIN
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
  const adminPass = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";
  const hash = await bcrypt.hash(adminPass, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: hash, role: "SYSTEM_ADMIN", isActive: true },
    create: { email: adminEmail, password: hash, role: "SYSTEM_ADMIN" },
    select: { id: true, email: true, role: true },
  });

  // Demo org
  const code = "demo";
  const org = await prisma.organization.upsert({
    where: { code },
    update: { name: "Demo Supermarket", isActive: true },
    create: { code, name: "Demo Supermarket" },
    select: { id: true, code: true, name: true },
  });

  // Membership for admin into org (ORG_ADMIN)
  await prisma.membership.upsert({
    where: { userId_orgId: { userId: admin.id, orgId: org.id } },
    update: { role: "ORG_ADMIN", isActive: true },
    create: { userId: admin.id, orgId: org.id, role: "ORG_ADMIN" },
  });

  // Demo survey + questions
  const survey = await prisma.survey.create({
    data: {
      orgId: org.id,
      title: "Quick Store Feedback",
      description: "Help us improve in under 30 seconds.",
      questions: {
        create: [
          { order: 1, prompt: "How was your overall experience?", type: "RATING_1_5" },
          { order: 2, prompt: "Did you find what you came for?", type: "YES_NO" },
          { order: 3, prompt: "What made you leave fast (if you did)?", type: "TEXT" },
        ],
      },
    },
    select: { id: true },
  });

  // QR token
  await prisma.qrToken.create({
    data: {
      orgId: org.id,
      surveyId: survey.id,
      token: nanoid(10),
      // expiresAt: null means never expires (template default)
    },
  });

  console.log("Seeded:", { adminEmail, adminPass, org, surveyId: survey.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
