/**
 * Seeds `rubric_criteria` from rubric.txt (Kargo Hiring Rubric — PM & SPM).
 *
 * rubric.txt gives criterion names, descriptions, and weights verbatim, but
 * explicitly defers 1-5 scoring anchors to "the full analysis doc," which
 * wasn't provided. The anchors below are therefore DERIVED — written by
 * Claude to be consistent with each criterion's "what a strong candidate
 * looks like" description — and every row is flagged `derived: true` so
 * this is visible in the data, not hidden. If a more authoritative anchor
 * set exists, replace these and re-run `npm run db:seed`.
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set.");
}
const adapter = new PrismaPg(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

interface CriterionSeed {
  role: "PM" | "SPM";
  name: string;
  description: string;
  weight: number;
  extraGuidance?: string;
  anchors: { "1": string; "2": string; "3": string; "4": string; "5": string };
  order: number;
}

const CRITERIA: CriterionSeed[] = [
  // ---------------------------- PM ----------------------------
  {
    role: "PM",
    order: 1,
    name: "Unprompted Problem-Finding",
    description:
      "The CV explicitly attributes the origin of a piece of work to the candidate's own observation (\"after finding,\" \"identified,\" \"independently, when X happened\"), not to an assignment, ticket, or manager's request — and this happens more than once across different roles.",
    weight: 30,
    anchors: {
      "1": "All described work traces to an assignment, ticket, or manager's request; no self-attributed origin anywhere in the CV.",
      "2": "Language gestures at initiative (\"proactively,\" \"took initiative\") but without a concrete originating observation distinct from an assigned task.",
      "3": "One clear, specific instance of self-initiated problem identification (own observation named as the origin), not clearly recurring elsewhere.",
      "4": "One strong, specific instance of unprompted problem-finding, plus a second weaker or less explicit instance elsewhere in the CV.",
      "5": "Two or more clear instances, across different roles, where the candidate explicitly attributes the origin of work to their own observation rather than an assignment.",
    },
  },
  {
    role: "PM",
    order: 2,
    name: "Institutional Durability",
    description:
      "The candidate's self-initiated work is explicitly stated to have been adopted, retained, or continued to be used by others beyond the candidate (\"now standard practice,\" \"the team now uses,\" \"retained permanently\") — and this recurs more than once, not just a single isolated instance.",
    weight: 30,
    anchors: {
      "1": "Work is described as a one-off delivery with no claim that it persisted or was used by anyone else after the candidate moved on.",
      "2": "Impact is described but it's ambiguous whether it persisted or was adopted by others beyond a single launch event.",
      "3": "One clear, explicit instance of continued adoption by others (not just the candidate's own continued use).",
      "4": "One strong explicit instance of durable adoption by others, plus a second, weaker gesture toward durability elsewhere.",
      "5": "Two or more explicit instances where self-initiated work is stated to have been adopted, retained, or continued in use by others beyond the candidate.",
    },
  },
  {
    role: "PM",
    order: 3,
    name: "Externally Corroborated Impact",
    description:
      "Claims of impact are backed by something beyond the candidate's own self-description — a quote from someone else, a third-party-given recognition, or an outcome an outside party would visibly confirm (an audit passed, a client renewal, a shipment that departed on schedule despite a crisis) — rather than only internally generated metrics.",
    weight: 25,
    anchors: {
      "1": "No impact claims at all, or claims are vague assertions with no metric or corroboration of any kind.",
      "2": "Impact claims exist but are entirely self-reported or internal metrics only (e.g. \"increased efficiency by 20%\") with no external corroboration.",
      "3": "One instance where impact plausibly involves an outside-verifiable outcome, but it's stated somewhat generically.",
      "4": "One strong, specific instance of impact backed by something an outside party would confirm (a quote, award, client action, external deadline held).",
      "5": "Multiple claims, across different roles, backed by something beyond self-description — quotes, third-party recognition, or outside-verifiable outcomes.",
    },
  },
  {
    role: "PM",
    order: 4,
    name: "Ownership Scope in the Candidate's Own Words",
    description:
      "The candidate describes running something end-to-end without naming a layer of approval above them for that specific piece of work (\"independently,\" \"sole [role] responsible for,\" \"no escalation to management\").",
    weight: 15,
    anchors: {
      "1": "No description of ownership scope, or the CV explicitly describes working under close direct supervision throughout.",
      "2": "Role is framed mostly as execution or support under someone else's direction, with no end-to-end ownership language.",
      "3": "Ownership is described, but with an approval layer or shared team named alongside it (partial/shared ownership).",
      "4": "One clear instance of end-to-end ownership language with no named approval layer above the candidate for that work.",
      "5": "Multiple instances describing running something end-to-end independently, with no named approval layer, across different pieces of work.",
    },
  },

  // ---------------------------- SPM ----------------------------
  {
    role: "SPM",
    order: 1,
    name: "Unprompted Problem-Finding",
    description:
      "Same as PM. At SPM level, give extra weight to problems at process/system scale (an indexing strategy, a vendor dependency, a workflow used company-wide) over a single feature — but do not down-score a candidate for lacking system-scale examples if none exist; mark as mixed rather than weak.",
    weight: 25,
    extraGuidance:
      "If the candidate shows clear unprompted problem-finding but only at feature/task scale (no system-scale example present), do not score this below a 3 solely for lacking system scale — treat the absence of a system-scale example as a gap to flag in reasoning, not a penalty.",
    anchors: {
      "1": "All described work traces to an assignment, ticket, or manager's request; no self-attributed origin anywhere in the CV.",
      "2": "Language gestures at initiative but without a concrete originating observation distinct from an assigned task.",
      "3": "One clear, specific instance of self-initiated problem-finding (feature/task scale is acceptable here; do not penalize for lacking system scale).",
      "4": "One strong instance of unprompted problem-finding at process/system scale (an indexing strategy, a vendor dependency, a company-wide workflow), or two solid feature-scale instances.",
      "5": "Two or more clear instances of unprompted problem-finding, with at least one explicitly at process/system scale.",
    },
  },
  {
    role: "SPM",
    order: 2,
    name: "Institutional Durability, at process/system scale",
    description:
      "The adopted practice functions as an ongoing standard that keeps operating without requiring the candidate's continued personal involvement (a recurring review cycle, an on-call rotation, an SOP set adopted \"in full\") — not just a single artifact or feature.",
    weight: 40,
    anchors: {
      "1": "Work is described as a one-off delivery with no claim it persisted or was adopted as an ongoing standard.",
      "2": "A practice or artifact is adopted, but it reads as a single feature/artifact rather than an ongoing process, or requires the candidate's continued involvement to keep running.",
      "3": "One clear instance of a practice adopted as an ongoing standard that operates without the candidate's continued personal involvement.",
      "4": "One strong instance of a durable process/system-level standard (a recurring cycle, rotation, or SOP set) explicitly adopted \"in full\" or company-wide.",
      "5": "Two or more instances of self-initiated work becoming an ongoing, self-sustaining standard at process/system scale, not tied to the candidate's continued presence.",
    },
  },
  {
    role: "SPM",
    order: 3,
    name: "Externally Corroborated Impact",
    description: "Same as PM.",
    weight: 20,
    anchors: {
      "1": "No impact claims at all, or claims are vague assertions with no metric or corroboration of any kind.",
      "2": "Impact claims exist but are entirely self-reported or internal metrics only, with no external corroboration.",
      "3": "One instance where impact plausibly involves an outside-verifiable outcome, but it's stated somewhat generically.",
      "4": "One strong, specific instance of impact backed by something an outside party would confirm.",
      "5": "Multiple claims, across different roles, backed by something beyond self-description.",
    },
  },
  {
    role: "SPM",
    order: 4,
    name: "Ownership Scope in the Candidate's Own Words",
    description:
      "Same as PM, but the SPM bar requires the described scope to include a decision with a stated downstream consequence — one that had to be lived with, redone under pressure, or that others' work depended on — not ownership of an isolated task. Treat a high score here with caution: it was the weakest clean discriminator in the data (a Meets-rated hire also scores well on this alone).",
    weight: 15,
    extraGuidance:
      "This criterion alone is a weak discriminator — a 4 or 5 here should not, by itself, be read as strong evidence of SPM readiness. Score strictly: only award a 4 or 5 if a downstream consequence is explicitly named (had to be redone, others' work depended on it, had to be lived with under pressure), not merely broad scope.",
    anchors: {
      "1": "No description of ownership scope, or explicitly describes working under close direct supervision throughout.",
      "2": "Role framed mostly as execution/support under someone else's direction.",
      "3": "End-to-end ownership described with no named approval layer, but no stated downstream consequence of the decisions made.",
      "4": "Ownership described with one stated downstream consequence (had to be redone, others depended on it, had to be lived with under pressure).",
      "5": "Multiple instances of end-to-end ownership with explicit, stated downstream consequences that others depended on or that had lasting effect.",
    },
  },
];

async function main() {
  for (const role of ["PM", "SPM"] as const) {
    const total = CRITERIA.filter((c) => c.role === role).reduce(
      (sum, c) => sum + c.weight,
      0
    );
    if (total !== 100) {
      throw new Error(
        `Rubric weights for role ${role} sum to ${total}, not 100. Refusing to seed.`
      );
    }
  }

  await prisma.score.deleteMany();
  await prisma.candidateRoleTotal.deleteMany();
  await prisma.rubricCriterion.deleteMany();

  for (const c of CRITERIA) {
    await prisma.rubricCriterion.create({
      data: {
        role: c.role,
        name: c.name,
        description: c.extraGuidance
          ? `${c.description}\n\n${c.extraGuidance}`
          : c.description,
        weight: c.weight,
        anchors: JSON.stringify(c.anchors),
        derived: true,
        order: c.order,
      },
    });
  }

  const existing = await prisma.setting.findUnique({
    where: { key: "shortlist_size" },
  });
  if (!existing) {
    await prisma.setting.create({
      data: {
        key: "shortlist_size",
        value: process.env.SHORTLIST_SIZE ?? "5",
      },
    });
  }

  console.log(
    `Seeded ${CRITERIA.length} rubric criteria (weights verified to sum to 100 for both PM and SPM).`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
