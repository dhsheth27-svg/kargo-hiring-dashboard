"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

function ScoreTable({ rows }: { rows: ScoreRow[] }) {
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.criterion} className="border border-neutral-800 rounded-md p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">{r.criterion}</span>
            <span className="text-xs text-neutral-500">weight {r.weight}%</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            {r.rawScore === null ? (
              <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
                not evidenced
              </span>
            ) : (
              <span className="text-sm font-semibold">{r.rawScore}/5</span>
            )}
          </div>
          <p className="text-xs text-neutral-400">{r.reasoning}</p>
        </div>
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

  if (!data) return <div className="max-w-4xl mx-auto px-6 py-10 text-neutral-400">Loading…</div>;

  const brief = data.briefs.find((b) => b.roleScored === data.appliedRole);
  const appliedTotal = data.totals.find((t) => t.roleScored === data.appliedRole);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <Link href="/dashboard" className="text-sm text-neutral-500 hover:text-neutral-300">
        ← Back to dashboard
      </Link>

      <div className="flex items-start justify-between mt-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold">{data.name}</h1>
          <p className="text-sm text-neutral-500">
            {data.email} {data.phone ? `· ${data.phone}` : ""}
          </p>
          <p className="text-sm text-neutral-400 mt-1">
            Applied for {data.appliedRole} · status: {data.status}
          </p>
        </div>
        {appliedTotal && (
          <div className="text-right">
            <div className="text-3xl font-bold">{Math.round(appliedTotal.totalScore)}</div>
            <div className="text-xs text-neutral-500">/ 100 ({data.appliedRole})</div>
            {appliedTotal.confidence === "low" && (
              <div className="text-xs text-amber-400 mt-1">
                low confidence — {appliedTotal.notEvidencedCount} criteria not evidenced
              </div>
            )}
          </div>
        )}
      </div>

      {brief && (
        <div className="mb-8 p-4 rounded-md bg-blue-950/30 border border-blue-900">
          <div className="text-xs font-medium text-blue-300 mb-1">
            Interview brief ({data.appliedRole} shortlist)
          </div>
          <p className="text-sm text-blue-100">{brief.briefText}</p>
        </div>
      )}

      <div className="mb-8">
        <div className="flex gap-2 mb-4">
          {(["PM", "SPM"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTab(r)}
              className={`px-3 py-1.5 rounded-md text-sm border ${
                tab === r
                  ? "bg-neutral-100 text-neutral-900 border-neutral-100"
                  : "border-neutral-700 text-neutral-300"
              }`}
            >
              {r} rubric
              {r === data.appliedRole && (
                <span className="ml-1 text-xs opacity-70">(applied)</span>
              )}
            </button>
          ))}
        </div>
        <ScoreTable rows={data.scoresByRole[tab]} />
      </div>

      {data.draft && (
        <div className="border border-neutral-800 rounded-md p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">
              Draft email —{" "}
              <span className={data.draft.emailType === "invite" ? "text-green-400" : "text-neutral-400"}>
                {data.draft.emailType === "invite" ? "interview invite" : "rejection"}
              </span>
            </span>
            {data.draft.status === "sent" && (
              <span className="text-xs px-2 py-0.5 rounded bg-green-900/50 text-green-300">
                sent {data.draft.sentAt ? new Date(data.draft.sentAt).toLocaleString() : ""}
              </span>
            )}
          </div>

          <label className="block text-xs text-neutral-500 mb-1">Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={data.draft.status === "sent"}
            className="w-full mb-3 px-3 py-2 rounded-md bg-neutral-900 border border-neutral-700 text-sm disabled:opacity-50"
          />

          <label className="block text-xs text-neutral-500 mb-1">Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={data.draft.status === "sent"}
            rows={10}
            className="w-full mb-3 px-3 py-2 rounded-md bg-neutral-900 border border-neutral-700 text-sm disabled:opacity-50"
          />

          {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

          {data.draft.status !== "sent" && (
            <div className="flex gap-3">
              <button
                onClick={saveDraft}
                disabled={saving || sending}
                className="px-4 py-2 rounded-md border border-neutral-700 text-sm disabled:opacity-40"
              >
                {saving ? "Saving…" : "Save draft"}
              </button>
              <button
                onClick={confirmSend}
                disabled={sending}
                className="px-4 py-2 rounded-md bg-green-600 text-white text-sm font-medium disabled:opacity-40"
              >
                {sending ? "Sending…" : `Confirm & send to ${data.email}`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
