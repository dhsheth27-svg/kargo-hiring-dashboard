import { REVIEW_STATUS_LABELS, type ReviewStatus } from "@/lib/types";

const STYLES: Record<ReviewStatus, { color: string; bg: string }> = {
  needs_review: { color: "var(--status-needs-review)", bg: "var(--status-needs-review-bg)" },
  in_review: { color: "var(--status-in-review)", bg: "var(--status-in-review-bg)" },
  shortlisted: { color: "var(--status-shortlisted)", bg: "var(--status-shortlisted-bg)" },
  declined: { color: "var(--status-declined)", bg: "var(--status-declined-bg)" },
};

export default function StatusBadge({ status }: { status: ReviewStatus }) {
  const style = STYLES[status];
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ color: style.color, background: style.bg }}
    >
      {REVIEW_STATUS_LABELS[status]}
    </span>
  );
}
