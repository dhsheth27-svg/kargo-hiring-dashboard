-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "appliedRole" TEXT NOT NULL,
    "personalDetails" TEXT NOT NULL,
    "cvContent" TEXT,
    "rawFileRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RubricCriterion" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "anchors" TEXT NOT NULL,
    "derived" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RubricCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Score" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "roleScored" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "rawScore" INTEGER,
    "reasoning" TEXT NOT NULL,
    "weightedScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateRoleTotal" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "roleScored" TEXT NOT NULL,
    "totalScore" DOUBLE PRECISION NOT NULL,
    "notEvidencedCount" INTEGER NOT NULL,
    "confidence" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateRoleTotal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brief" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "roleScored" TEXT NOT NULL,
    "briefText" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Brief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftEmail" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "emailType" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DraftEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "Score_candidateId_roleScored_idx" ON "Score"("candidateId", "roleScored");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateRoleTotal_candidateId_roleScored_key" ON "CandidateRoleTotal"("candidateId", "roleScored");

-- CreateIndex
CREATE UNIQUE INDEX "Brief_candidateId_roleScored_key" ON "Brief"("candidateId", "roleScored");

-- CreateIndex
CREATE UNIQUE INDEX "DraftEmail_candidateId_key" ON "DraftEmail"("candidateId");

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "RubricCriterion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateRoleTotal" ADD CONSTRAINT "CandidateRoleTotal_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brief" ADD CONSTRAINT "Brief_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftEmail" ADD CONSTRAINT "DraftEmail_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
