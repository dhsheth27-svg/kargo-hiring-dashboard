-- CreateTable: Role must exist before we can backfill Candidate.roleId
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT,
    "seniority" TEXT,
    "requiredSkills" TEXT NOT NULL,
    "preferredSkills" TEXT,
    "rubricRole" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- Seed two default roles so existing candidates (uploaded before "Role"
-- existed as a concept) have somewhere to land.
INSERT INTO "Role" ("id", "title", "description", "requiredSkills", "rubricRole", "status")
VALUES
  ('default-role-pm', 'Product Manager', 'Default role auto-created for candidates uploaded before role creation existed. Edit this with real details.', '', 'PM', 'active'),
  ('default-role-spm', 'Senior Product Manager', 'Default role auto-created for candidates uploaded before role creation existed. Edit this with real details.', '', 'SPM', 'active');

-- AlterTable: add roleId nullable first so we can backfill it
ALTER TABLE "Candidate" ADD COLUMN     "recruiterRating" INTEGER,
ADD COLUMN     "reviewStatus" TEXT NOT NULL DEFAULT 'needs_review',
ADD COLUMN     "roleId" TEXT;

UPDATE "Candidate" SET "roleId" = CASE WHEN "appliedRole" = 'SPM' THEN 'default-role-spm' ELSE 'default-role-pm' END;

ALTER TABLE "Candidate" ALTER COLUMN "roleId" SET NOT NULL;

-- AlterTable
ALTER TABLE "DraftEmail" ADD COLUMN     "failedReason" TEXT,
ADD COLUMN     "templateType" TEXT NOT NULL DEFAULT 'invite';

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
