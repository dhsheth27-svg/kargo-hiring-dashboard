"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import RatingStars from "@/components/RatingStars";
import ScoreBadge from "@/components/ScoreBadge";
import { REVIEW_STATUSES, REVIEW_STATUS_LABELS, type ReviewStatus } from "@/lib/types";

interface CandidateRow {
  id: string;
  name: string;
  status: string;
  reviewStatus: ReviewStatus;
  recruiterRating: number | null;
  createdAt: string;
  score: number | null;
  confidence: string | null;
  hasBrief: boolean;
  draft: { emailType: string; status: string } | null;
}

interface RoleDetail {
  id: string;
  title: string;
  description: string;
  location: string | null;
  seniority: string | null;
  requiredSkills: string;
  preferredSkills: string | null;
  rubricRole: string;
  status: string;
  candidates: CandidateRow[];
}

type SortKey = "score" | "date" | "rating";

export default function RoleWorkspaceClient({ roleId }: { roleId: string }) {
  const [role, setRole] = useState<RoleDetail | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | "ALL">("ALL");
  const [minRating, setMinRating] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    load();
  }, [roleId]);

  async function load() {
    const res = await fetch(`/api/roles/${roleId}`);
    const data = await res.json();
    setRole(data);
  }

  const filtered = useMemo(() => {
    if (!role) return [];
    let list = role.candidates;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    if (statusFilter !== "ALL") list = list.filter((c) => c.reviewStatus === statusFilter);
    if (minRating > 0) list = list.filter((c) => (c.recruiterRating ?? 0) >= minRating);

    list = [...list].sort((a, b) => {
      if (sortKey === "score") return (b.score ?? -1) - (a.score ?? -1);
      if (sortKey === "rating") return (b.recruiterRating ?? -1) - (a.recruiterRating ?? -1);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return list;
  }, [role, search, statusFilter, minRating, sortKey]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((c) => c.id))
    );
  }

  async function bulkSetStatus(reviewStatus: ReviewStatus) {
    if (selected.size === 0) return;
    if (!confirm(`Set ${selected.size} candidate(s) to "${REVIEW_STATUS_LABELS[reviewStatus]}"?`)) return;
    setBulkBusy(true);
    await Promise.all(
      [...selected].map((id) =>
        fetch(`/api/candidates/${id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviewStatus }),
        })
      )
    );
    setSelected(new Set());
    setBulkBusy(false);
    load();
  }

  if (!role) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="h-24 rounded-xl shimmer mb-4" />
        <div className="h-64 rounded-xl shimmer" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <Link href="/" className="text-sm" style={{ color: "var(--muted)" }}>
        ← Dashboard
      </Link>

      <div className="flex items-start justify-between mt-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{role.title}</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            {[role.seniority, role.location].filter(Boolean).join(" · ")} · {role.rubricRole} rubric ·{" "}
            {role.candidates.length} candidate{role.candidates.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href={`/roles/${roleId}/shortlist`} className="btn-secondary px-4 py-2.5 rounded-lg text-sm font-medium">
            Compare shortlist
          </Link>
          <Link href={`/roles/${roleId}/upload`} className="btn-primary px-4 py-2.5 rounded-lg text-sm font-medium">
            + Add candidates
          </Link>
        </div>
      </div>

      {/* search + filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          className="px-3.5 py-2 rounded-lg text-sm"
          style={{ border: "1px solid var(--border)", minWidth: "220px" }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ReviewStatus | "ALL")}
          className="px-3 py-2 rounded-lg text-sm"
          style={{ border: "1px solid var(--border)" }}
        >
          <option value="ALL">All statuses</option>
          {REVIEW_STATUSES.map((s) => (
            <option key={s} value={s}>
              {REVIEW_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          value={minRating}
          onChange={(e) => setMinRating(Number(e.target.value))}
          className="px-3 py-2 rounded-lg text-sm"
          style={{ border: "1px solid var(--border)" }}
        >
          <option value={0}>Any rating</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}+ stars
            </option>
          ))}
        </select>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="px-3 py-2 rounded-lg text-sm"
          style={{ border: "1px solid var(--border)" }}
        >
          <option value="score">Sort: fit score</option>
          <option value="rating">Sort: rating</option>
          <option value="date">Sort: date applied</option>
        </select>
      </div>

      {/* bulk action bar */}
      {selected.size > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg mb-4 text-sm"
          style={{ background: "var(--accent-soft)" }}
        >
          <span className="font-medium">{selected.size} selected</span>
          {REVIEW_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => bulkSetStatus(s)}
              disabled={bulkBusy}
              className="btn-secondary px-3 py-1.5 rounded-md text-xs font-medium"
            >
              Mark {REVIEW_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      )}

      {/* candidate table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </th>
              <th className="text-left px-3 py-3 font-medium" style={{ color: "var(--muted)" }}>
                Candidate
              </th>
              <th className="text-left px-3 py-3 font-medium" style={{ color: "var(--muted)" }}>
                Applied
              </th>
              <th className="text-left px-3 py-3 font-medium" style={{ color: "var(--muted)" }}>
                Fit score
              </th>
              <th className="text-left px-3 py-3 font-medium" style={{ color: "var(--muted)" }}>
                Rating
              </th>
              <th className="text-left px-3 py-3 font-medium" style={{ color: "var(--muted)" }}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center" style={{ color: "var(--muted)" }}>
                  {role.candidates.length === 0
                    ? "No candidates yet. Add some to get started."
                    : "No candidates match these filters."}
                </td>
              </tr>
            )}
            {filtered.map((c) => (
              <tr
                key={c.id}
                style={{ borderBottom: "1px solid var(--border)" }}
                className="hover:bg-[var(--surface-muted)] transition-colors"
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggleSelect(c.id)}
                    aria-label={`Select ${c.name}`}
                  />
                </td>
                <td className="px-3 py-3">
                  <Link href={`/candidates/${c.id}`} className="font-medium hover:underline">
                    {c.name || "(processing…)"}
                  </Link>
                  {c.confidence === "low" && (
                    <span className="ml-2 text-xs" style={{ color: "var(--status-in-review)" }}>
                      low confidence
                    </span>
                  )}
                </td>
                <td className="px-3 py-3" style={{ color: "var(--muted)" }}>
                  {new Date(c.createdAt).toLocaleDateString()}
                </td>
                <td className="px-3 py-3">
                  <ScoreBadge score={c.score} />
                </td>
                <td className="px-3 py-3">
                  <RatingStars value={c.recruiterRating} size={14} />
                </td>
                <td className="px-3 py-3">
                  <StatusBadge status={c.reviewStatus} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
