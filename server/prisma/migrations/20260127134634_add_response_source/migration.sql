-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Response" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'QR',
    "visitFrequency" TEXT,
    "timeSpentMin" INTEGER,
    "fastExitReason" TEXT,
    "peakHourBucket" TEXT,
    CONSTRAINT "Response_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Response_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Response" ("fastExitReason", "id", "orgId", "peakHourBucket", "submittedAt", "surveyId", "timeSpentMin", "visitFrequency") SELECT "fastExitReason", "id", "orgId", "peakHourBucket", "submittedAt", "surveyId", "timeSpentMin", "visitFrequency" FROM "Response";
DROP TABLE "Response";
ALTER TABLE "new_Response" RENAME TO "Response";
CREATE INDEX "Response_orgId_idx" ON "Response"("orgId");
CREATE INDEX "Response_surveyId_idx" ON "Response"("surveyId");
CREATE INDEX "Response_submittedAt_idx" ON "Response"("submittedAt");
CREATE INDEX "Response_orgId_source_idx" ON "Response"("orgId", "source");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
