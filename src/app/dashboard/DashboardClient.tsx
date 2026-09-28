"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface RoleTotal {
  roleScored: string;
  totalScore: number;
  notEvidencedCount: number;
  confidence: string;
}

interface CandidateRow {
  id: string;
  appliedRole: string;
  status: string;
  createdAt: string;
  name: string;
  totals: RoleTotal[];
  hasBrief: boolean;
  draft: { emailType: string; status: string } | null;
}

export default function DashboardClient() {
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [filter, setFilter] = useState<"ALL" | "PM" | "SPM">("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/candidates");
    const data = await res.json();
    setCandidates(data.candidates ?? []);
    setLoading(false);
  }

  const filtered = candidates.filter(
    (c) => filter === "ALL" || c.appliedRole === filter
  );

  function totalFor(c: CandidateRow, role: string) {
    return c.totals.find((t) => t.roleScored === role);
  }

  const sorted = [...filtered].sort((a, b) => {
    const aTotal = totalFor(a, a.appliedRole)?.totalScore ?? -1;
    const bTotal = totalFor(b, b.appliedRole)?.totalScore ?? -1;
    return bTotal - aTotal;
  });

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex gap-2">
          {(["ALL", "PM", "SPM"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setFilter(r)}
              className={`px-3 py-1.5 rounded-md text-sm border ${
                filter === r
                  ? "bg-neutral-100 text-neutral-900 border-neutral-100"
                  : "border-neutral-700 text-neutral-300"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-neutral-400 text-sm">Loading…</p>}
      {!loading && sorted.length === 0 && (
        <p className="text-neutral-400 text-sm">
          No candidates yet. <Link href="/upload" className="underline">Upload one</Link>.
        </p>
      )}

      <div className="space-y-2">
        {sorted.map((c) => {
          const appliedTotal = totalFor(c, c.appliedRole);
          return (
            <Link
              key={c.id}
              href={`/candidates/${c.id}`}
              className="flex items-center justify-between px-4 py-3 rounded-md border border-neutral-800 hover:border-neutral-600 transition-colors"
            >
              <div className="flex items-center gap-4">
                <span className="font-medium">{c.name || "(processing…)"}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                  {c.appliedRole}
                </span>
                <span className="text-xs text-neutral-500">{c.status}</span>
              </div>
              <div className="flex items-center gap-4">
                {appliedTotal?.confidence === "low" && (
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-900/50 text-amber-300">
                    low confidence
                  </span>
                )}
                {c.hasBrief && (
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-900/50 text-blue-300">
                    shortlisted
                  </span>
                )}
                {c.draft && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      c.draft.status === "sent"
                        ? "bg-green-900/50 text-green-300"
                        : c.draft.emailType === "invite"
                        ? "bg-neutral-800 text-neutral-200"
                        : "bg-neutral-800 text-neutral-400"
                    }`}
                  >
                    {c.draft.status === "sent"
                      ? "sent"
                      : c.draft.emailType === "invite"
                      ? "draft: invite"
                      : "draft: reject"}
                  </span>
                )}
                <span className="text-lg font-semibold w-14 text-right">
                  {appliedTotal ? Math.round(appliedTotal.totalScore) : "—"}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
