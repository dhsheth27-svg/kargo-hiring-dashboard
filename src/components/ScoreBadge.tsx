function scoreColor(score: number) {
  if (score >= 70) return "var(--score-high)";
  if (score >= 45) return "var(--score-mid)";
  return "var(--score-low)";
}

export default function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="text-sm" style={{ color: "var(--muted)" }}>—</span>;
  }
  return (
    <span className="text-base font-semibold" style={{ color: scoreColor(score) }}>
      {score}
      <span className="text-xs font-normal" style={{ color: "var(--muted)" }}>/100</span>
    </span>
  );
}
