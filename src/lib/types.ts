import { z } from "zod";

export const ROLES = ["PM", "SPM"] as const;
export type Role = (typeof ROLES)[number];

export const CANDIDATE_STATUSES = [
  "uploaded",
  "extracted",
  "scored",
  "briefed",
  "drafted",
  "sent",
] as const;
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export const CONFIDENCE = ["normal", "low"] as const;
export type Confidence = (typeof CONFIDENCE)[number];

export const EMAIL_TYPES = ["invite", "reject"] as const;
export type EmailType = (typeof EMAIL_TYPES)[number];

export const EMAIL_STATUSES = ["draft", "sent", "failed"] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];

export const TEMPLATE_TYPES = ["invite", "request_info", "update", "reject"] as const;
export type TemplateType = (typeof TEMPLATE_TYPES)[number];
export const TEMPLATE_LABELS: Record<TemplateType, string> = {
  invite: "Interview invitation",
  request_info: "Request more information",
  update: "Application update",
  reject: "Rejection",
};

export const REVIEW_STATUSES = [
  "needs_review",
  "in_review",
  "shortlisted",
  "declined",
] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];
export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  needs_review: "Needs review",
  in_review: "In review",
  shortlisted: "Shortlisted",
  declined: "Declined",
};

export const ROLE_POSTING_STATUSES = ["draft", "active", "closed"] as const;
export type RolePostingStatus = (typeof ROLE_POSTING_STATUSES)[number];

export const ACTIVITY_TYPES = [
  "uploaded",
  "scored",
  "status_changed",
  "rating_changed",
  "note_added",
  "email_sent",
  "email_failed",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export interface PersonalDetails {
  name: string;
  email: string;
  phone: string | null;
}

export interface Anchors {
  "1": string;
  "2": string;
  "3": string;
  "4": string;
  "5": string;
}

// Structured output schema Gemini must return for a single criterion score.
export const CriterionScoreSchema = z.object({
  raw_score: z.union([z.number().int().min(1).max(5), z.null()]),
  reasoning: z.string(),
});
export type CriterionScoreResult = z.infer<typeof CriterionScoreSchema>;

export const BriefSchema = z.object({
  brief_text: z.string(),
});

export const EmailDraftSchema = z.object({
  subject: z.string(),
  body: z.string(),
});
