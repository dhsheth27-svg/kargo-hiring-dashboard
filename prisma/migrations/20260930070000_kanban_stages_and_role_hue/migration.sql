-- Rename reviewStatus -> stage, remapped to the new 5+1 stage model
-- (applied | screen | interview | offer | hired | declined) used by the
-- kanban board, preserving existing candidate review state.
ALTER TABLE "Candidate" ADD COLUMN "stage" TEXT;

UPDATE "Candidate" SET "stage" = CASE "reviewStatus"
  WHEN 'needs_review' THEN 'applied'
  WHEN 'in_review' THEN 'screen'
  WHEN 'shortlisted' THEN 'interview'
  WHEN 'declined' THEN 'declined'
  ELSE 'applied'
END;

ALTER TABLE "Candidate" ALTER COLUMN "stage" SET NOT NULL;
ALTER TABLE "Candidate" ALTER COLUMN "stage" SET DEFAULT 'applied';
ALTER TABLE "Candidate" DROP COLUMN "reviewStatus";

-- Accent hue per role (0-360), used by cards/avatars/badges in the new
-- visual system. Existing roles get a deterministic hue so they aren't
-- all identical.
ALTER TABLE "Role" ADD COLUMN "hue" INTEGER NOT NULL DEFAULT 145;
UPDATE "Role" SET "hue" = 225 WHERE "id" = 'default-role-pm';
UPDATE "Role" SET "hue" = 290 WHERE "id" = 'default-role-spm';
