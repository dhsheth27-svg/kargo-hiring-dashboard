"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface ScoreRow {
  criterion: string;
  weight: number;
  rawScore: number | null;
  reasoning: string;
  weightedScore: number | null;
}

interface CandidateDetail {
  id: string;
  appliedRole: string;
  status: string;
  name: string;
  email: string;
  phone: string | null;
  totals: Array<{
    roleScored: string;
    totalScore: number;
    notEvidencedCount: number;
    confidence: string;
  }>;
  scoresByRole: { PM: ScoreRow[]; SPM: ScoreRow[] };
  briefs: Array<{ roleScored: string; briefText: string }>;
  draft: {
    id: string;
    emailType: string;
    subject: string;
    body: string;
    status: string;
    sentAt: string | null;
  } | null;
}

function scoreColor(score: number) {
  if (score >= 4) return "var(--accent-emerald)";
  if (score >= 3) return "var(--accent-cyan)";
  if (score >= 2) return "var(--accent-amber)";
  return "var(--accent-rose)";
}

function totalColor(score: number) {
  if (score >= 80) return "var(--accent-emerald)";
  if (score >= 60) return "var(--accent-cyan)";
  if (score >= 40) return "var(--accent-amber)";
  return "var(--accent-rose)";
}

function ScoreTable({ rows }: { rows: ScoreRow[] }) {
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <motion.div
          key={r.criterion}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06 }}
          className="glass-card rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{r.criterion}</span>
            <span className="text-xs text-neutral-500">weight {r.weight}%</span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            {r.rawScore === null ? (
              <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-neutral-400 border border-white/10">
                not evidenced
              </span>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <motion.span
                      key={n}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ delay: i * 0.06 + n * 0.05 }}
                      className="h-4 w-2 rounded-sm origin-bottom"
                      style={{
                        background:
                          n <= (r.rawScore ?? 0) ? scoreColor(r.rawScore ?? 0) : "rgba(255,255,255,0.08)",
                      }}
                    />
                  ))}
                </div>
                <span className="text-sm font-semibold" style={{ color: scoreColor(r.rawScore) }}>
                  {r.rawScore}/5
                </span>
              </div>
            )}
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">{r.reasoning}</p>
        </motion.div>
      ))}
    </div>
  );
}

export default function CandidateClient({ id }: { id: string }) {
  const [data, setData] = useState<CandidateDetail | null>(null);
  const [tab, setTab] = useState<"PM" | "SPM">("PM");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    const res = await fetch(`/api/candidates/${id}`);
    const d = await res.json();
    setData(d);
    setTab(d.appliedRole);
    if (d.draft) {
      setSubject(d.draft.subject);
      setBody(d.draft.body);
    }
  }

  async function saveDraft() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/candidates/${id}/draft`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmSend() {
    if (!confirm(`Send this email to ${data?.email}? This cannot be undone.`)) return;
    setSending(true);
    setError(null);
    try {
      await saveDraft();
      const res = await fetch(`/api/candidates/${id}/send`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed.");
    } finally {
      setSending(false);
    }
  }

  if (!data)
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="h-24 rounded-xl glass-card shimmer mb-6" />
        <div className="h-32 rounded-xl glass-card shimmer" />
      </div>
    );

  const brief = data.briefs.find((b) => b.roleScored === data.appliedRole);
  const appliedTotal = data.totals.find((t) => t.roleScored === data.appliedRole);
  const score = appliedTotal ? Math.round(appliedTotal.totalScore) : null;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <Link
        href="/dashboard"
        className="text-sm text-neutral-500 hover:text-[var(--accent-cyan)] transition-colors"
      >
        ← Back to dashboard
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between mt-5 mb-8 glass-card rounded-2xl p-6"
      >
        <div>
          <h1 className="text-2xl font-bold gradient-text">{data.name}</h1>
          <p className="text-sm text-neutral-400 mt-1">
            {data.email} {data.phone ? `· ${data.phone}` : ""}
          </p>
          <p className="text-sm text-neutral-500 mt-1">
            Applied for {data.appliedRole} · status: {data.status}
          </p>
        </div>
        {score !== null && (
          <div className="text-right shrink-0">
            <div
              className="h-20 w-20 rounded-full flex items-center justify-center"
              style={{
                background: `conic-gradient(${totalColor(score)} ${score * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
              }}
            >
              <div className="h-16 w-16 rounded-full bg-[var(--surface)] flex flex-col items-center justify-center">
                <span className="text-2xl font-bold" style={{ color: totalColor(score) }}>
                  {score}
                </span>
              </div>
            </div>
            <div className="text-xs text-neutral-500 mt-1">/ 100 ({data.appliedRole})</div>
            {appliedTotal?.confidence === "low" && (
              <div className="text-xs text-amber-400 mt-1">
                low confidence — {appliedTotal.notEvidencedCount} not evidenced
              </div>
            )}
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {brief && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-5 rounded-2xl relative overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(34,211,238,0.08))",
              border: "1px solid rgba(139,92,246,0.25)",
            }}
          >
            <div className="text-xs font-semibold gradient-text mb-2 uppercase tracking-wide">
              Interview brief · {data.appliedRole} shortlist
            </div>
            <p className="text-sm text-neutral-200 leading-relaxed">{brief.briefText}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-8">
        <div className="flex gap-2 mb-4">
          {(["PM", "SPM"] as const).map((r) => {
            const active = tab === r;
            return (
              <button
                key={r}
                onClick={() => setTab(r)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  active ? "text-white" : "glass-card text-neutral-300 hover:border-white/20"
                }`}
                style={
                  active
                    ? { background: "linear-gradient(135deg, var(--accent-violet), var(--accent-cyan))" }
                    : undefined
                }
              >
                {r} rubric
                {r === data.appliedRole && (
                  <span className="ml-1 text-xs opacity-70">(applied)</span>
                )}
              </button>
            );
          })}
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ScoreTable rows={data.scoresByRole[tab]} />
          </motion.div>
        </AnimatePresence>
      </div>

      {data.draft && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">
              Draft email —{" "}
              <span
                className={
                  data.draft.emailType === "invite"
                    ? "text-[var(--accent-emerald)]"
                    : "text-neutral-400"
                }
              >
                {data.draft.emailType === "invite" ? "interview invite" : "rejection"}
              </span>
            </span>
            {data.draft.status === "sent" && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                sent {data.draft.sentAt ? new Date(data.draft.sentAt).toLocaleString() : ""}
              </span>
            )}
          </div>

          <label className="block text-xs text-neutral-500 mb-1.5">Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={data.draft.status === "sent"}
            className="w-full mb-4 px-3.5 py-2.5 rounded-lg bg-black/20 border border-white/10 text-sm focus:outline-none focus:border-[var(--accent-violet)]/50 disabled:opacity-50 transition-colors"
          />

          <label className="block text-xs text-neutral-500 mb-1.5">Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={data.draft.status === "sent"}
            rows={10}
            className="w-full mb-4 px-3.5 py-2.5 rounded-lg bg-black/20 border border-white/10 text-sm focus:outline-none focus:border-[var(--accent-violet)]/50 disabled:opacity-50 transition-colors"
          />

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-[var(--accent-rose)] mb-4"
            >
              {error}
            </motion.p>
          )}

          {data.draft.status !== "sent" && (
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={saveDraft}
                disabled={saving || sending}
                className="px-4 py-2.5 rounded-lg glass-card text-sm hover:border-white/20 disabled:opacity-40 transition-colors"
              >
                {saving ? "Saving…" : "Save draft"}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={confirmSend}
                disabled={sending}
                className="px-4 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-40"
                style={{
                  background:
                    "linear-gradient(135deg, var(--accent-emerald), var(--accent-cyan))",
                }}
              >
                {sending ? "Sending…" : `Confirm & send to ${data.email}`}
              </motion.button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
