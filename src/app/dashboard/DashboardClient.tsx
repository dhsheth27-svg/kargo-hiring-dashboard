"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

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

function scoreColor(score: number) {
  if (score >= 80) return "var(--accent-emerald)";
  if (score >= 60) return "var(--accent-cyan)";
  if (score >= 40) return "var(--accent-amber)";
  return "var(--accent-rose)";
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
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <motion.h1
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-3xl font-bold gradient-text"
        >
          Dashboard
        </motion.h1>
        <div className="flex gap-2">
          {(["ALL", "PM", "SPM"] as const).map((r) => {
            const active = filter === r;
            return (
              <button
                key={r}
                onClick={() => setFilter(r)}
                className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  active ? "text-white glow-violet" : "glass-card text-neutral-300 hover:border-white/20"
                }`}
                style={
                  active
                    ? { background: "linear-gradient(135deg, var(--accent-violet), var(--accent-cyan))" }
                    : undefined
                }
              >
                {r}
              </button>
            );
          })}
        </div>
      </div>

      {loading && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 rounded-xl glass-card shimmer" />
          ))}
        </div>
      )}
      {!loading && sorted.length === 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-neutral-400 text-sm glass-card rounded-xl px-5 py-8 text-center"
        >
          No candidates yet.{" "}
          <Link href="/upload" className="text-[var(--accent-cyan)] hover:underline">
            Upload one
          </Link>
          .
        </motion.p>
      )}

      <div className="space-y-2.5">
        <AnimatePresence>
          {sorted.map((c, i) => {
            const appliedTotal = totalFor(c, c.appliedRole);
            const score = appliedTotal ? Math.round(appliedTotal.totalScore) : null;
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.6) }}
                whileHover={{ scale: 1.005, x: 2 }}
              >
                <Link
                  href={`/candidates/${c.id}`}
                  className="flex items-center justify-between px-5 py-4 rounded-xl glass-card hover:border-[var(--accent-violet)]/40 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span
                      className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{
                        background: score !== null
                          ? `conic-gradient(${scoreColor(score)} ${score * 3.6}deg, rgba(255,255,255,0.08) 0deg)`
                          : "rgba(255,255,255,0.08)",
                      }}
                    >
                      <span className="h-7 w-7 rounded-full bg-[var(--surface)] flex items-center justify-center">
                        {score ?? "–"}
                      </span>
                    </span>
                    <div>
                      <div className="font-medium">{c.name || "(processing…)"}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-neutral-300 border border-white/10">
                          {c.appliedRole}
                        </span>
                        <span className="text-xs text-neutral-500">{c.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {appliedTotal?.confidence === "low" && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20">
                        low confidence
                      </span>
                    )}
                    {c.hasBrief && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--accent-violet)]/15 text-violet-300 border border-violet-500/20">
                        shortlisted
                      </span>
                    )}
                    {c.draft && (
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full border ${
                          c.draft.status === "sent"
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/20"
                            : c.draft.emailType === "invite"
                            ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/20"
                            : "bg-rose-500/10 text-rose-300 border-rose-500/20"
                        }`}
                      >
                        {c.draft.status === "sent"
                          ? "sent"
                          : c.draft.emailType === "invite"
                          ? "draft: invite"
                          : "draft: reject"}
                      </span>
                    )}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
