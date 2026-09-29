"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import RatingStars from "@/components/RatingStars";
import ScoreBadge from "@/components/ScoreBadge";
import type { ReviewStatus } from "@/lib/types";

interface CandidateRow {
  id: string;
  name: string;
  reviewStatus: ReviewStatus;
  recruiterRating: number | null;
  score: number | null;
}

interface ScoreRow {
  criterion: string;
  rawScore: number | null;
  reasoning: string;
}

interface CandidateDetail {
  id: string;
  name: string;
  scoresByRole: { PM: ScoreRow[]; SPM: ScoreRow[] };
  role: { rubricRole: "PM" | "SPM" };
  reviewStatus: ReviewStatus;
  recruiterRating: number | null;
}

export default function ShortlistClient({ roleId }: { roleId: string }) {
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [roleTitle, setRoleTitle] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [details, setDetails] = useState<Record<string, CandidateDetail>>({});

  useEffect(() => {
    load();
  }, [roleId]);

  async function load() {
    const res = await fetch(`/api/roles/${roleId}`);
    const data = await res.json();
    setRoleTitle(data.title);
    const rows: CandidateRow[] = data.candidates.map((c: CandidateRow & { score: number | null }) => ({
      id: c.id,
      name: c.name,
      reviewStatus: c.reviewStatus,
      recruiterRating: c.recruiterRating,
      score: c.score,
    }));
    setCandidates(rows);
    const shortlisted = rows.filter((r) => r.reviewStatus === "shortlisted").map((r) => r.id);
    setSelectedIds(shortlisted.length > 0 ? shortlisted.slice(0, 4) : rows.slice(0, 3).map((r) => r.id));
  }

  useEffect(() => {
    selectedIds.forEach(async (id) => {
      if (details[id]) return;
      const res = await fetch(`/api/candidates/${id}`);
      const data = await res.json();
      setDetails((prev) => ({ ...prev, [id]: data }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds]);

  function toggle(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 4 ? prev : [...prev, id]
    );
  }

  const selected = useMemo(
    () => selectedIds.map((id) => details[id]).filter(Boolean),
    [selectedIds, details]
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <Link href={`/roles/${roleId}`} className="text-sm" style={{ color: "var(--muted)" }}>
        ← {roleTitle || "Role"}
      </Link>
      <h1 className="text-2xl font-semibold mt-4 mb-1">Shortlist comparison</h1>
      <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
        Compare up to 4 candidates side by side. Select who to compare below.
      </p>

      <div className="flex flex-wrap gap-2 mb-8">
        {candidates.map((c) => {
          const active = selectedIds.includes(c.id);
          return (
            <button
              key={c.id}
              onClick={() => toggle(c.id)}
              className={active ? "btn-primary" : "btn-secondary"}
              style={{ padding: "0.5rem 0.875rem", borderRadius: "0.5rem", fontSize: "0.8125rem" }}
            >
              {c.name} {c.score !== null ? `(${c.score})` : ""}
            </button>
          );
        })}
      </div>

      {selected.length === 0 && (
        <div className="card p-8 text-center" style={{ color: "var(--muted)" }}>
          Select candidates above to compare them.
        </div>
      )}

      {selected.length > 0 && (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${selected.length}, minmax(240px, 1fr))` }}
        >
          {selected.map((c) => {
            const rows = c.scoresByRole[c.role.rubricRole];
            const strengths = [...rows]
              .filter((r) => r.rawScore !== null)
              .sort((a, b) => (b.rawScore ?? 0) - (a.rawScore ?? 0))
              .slice(0, 2);
            const gaps = rows.filter((r) => r.rawScore === null || r.rawScore <= 2).slice(0, 2);

            return (
              <div key={c.id} className="card p-4">
                <Link href={`/candidates/${c.id}`} className="font-semibold hover:underline">
                  {c.name}
                </Link>
                <div className="mt-2 mb-3">
                  <StatusBadge status={c.reviewStatus} />
                </div>
                <RatingStars value={c.recruiterRating} size={14} />

                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase mb-2" style={{ color: "var(--status-shortlisted)" }}>
                    Strengths
                  </p>
                  {strengths.length === 0 && (
                    <p className="text-xs" style={{ color: "var(--muted)" }}>
                      Nothing scored yet.
                    </p>
                  )}
                  {strengths.map((s) => (
                    <div key={s.criterion} className="mb-2">
                      <p className="text-xs font-medium">
                        {s.criterion} — {s.rawScore}/5
                      </p>
                      <p className="text-xs" style={{ color: "var(--muted)" }}>
                        {s.reasoning}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase mb-2" style={{ color: "var(--status-declined)" }}>
                    Gaps
                  </p>
                  {gaps.length === 0 && (
                    <p className="text-xs" style={{ color: "var(--muted)" }}>
                      None flagged.
                    </p>
                  )}
                  {gaps.map((g) => (
                    <div key={g.criterion} className="mb-2">
                      <p className="text-xs font-medium">{g.criterion}</p>
                      <p className="text-xs" style={{ color: "var(--muted)" }}>
                        {g.rawScore === null ? "Not evidenced in CV." : g.reasoning}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
