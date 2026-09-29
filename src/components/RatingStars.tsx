"use client";

export default function RatingStars({
  value,
  onChange,
  size = 18,
}: {
  value: number | null;
  onChange?: (v: number | null) => void;
  size?: number;
}) {
  const interactive = !!onChange;

  return (
    <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Recruiter rating">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = value !== null && n <= value;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            disabled={!interactive}
            onClick={() => onChange?.(value === n ? null : n)}
            className={interactive ? "cursor-pointer" : "cursor-default"}
            style={{
              color: filled ? "var(--accent)" : "var(--border)",
              lineHeight: 0,
            }}
          >
            <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6.1L10 14.9l-5.4 3 1.3-6.1L1.3 7.7l6.1-.6L10 1.5z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
