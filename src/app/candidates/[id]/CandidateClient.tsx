"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import RatingStars from "@/components/RatingStars";
import {
  REVIEW_STATUSES,
  REVIEW_STATUS_LABELS,
  TEMPLATE_TYPES,
  TEMPLATE_LABELS,
  type ReviewStatus,
  type TemplateType,
} from "@/lib/types";

interface ScoreRow {
  criterion: string;
  weight: number;
  rawScore: number | null;
  reasoning: string;
  weightedScore: number | null;
}

interface NoteRow {
  id: string;
  text: string;
  createdAt: string;
}

interface ActivityRow {
  id: string;
  type: string;
  message: string;
  createdAt: string;
}

interface CandidateDetail {
  id: string;
  appliedRole: "PM" | "SPM";
  status: string;
  reviewStatus: ReviewStatus;
  recruiterRating: number | null;
  name: string;
  email: string;
  phone: string | null;
  cvContent: string | null;
  role: {
    id: string;
    title: string;
    rubricRole: "PM" | "SPM";
    requiredSkills: string;
    preferredSkills: string | null;
  };
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
    templateType: TemplateType;
    subject: string;
    body: string;
    status: string;
    sentAt: string | null;
    failedReason: string | null;
  } | null;
  notes: NoteRow[];
  activities: ActivityRow[];
}

function scoreColor(score: number) {
  if (score >= 70) return "var(--score-high)";
  if (score >= 45) return "var(--score-mid)";
  return "var(--score-low)";
}

function ScoreTable({ rows }: { rows: ScoreRow[] }) {
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.criterion} className="card p-3.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">{r.criterion}</span>
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              weight {r.weight}%
            </span>
          </div>
          {r.rawScore === null ? (
            <span
              className="inline-block text-xs px-2 py-0.5 rounded-full mb-1"
              style={{ background: "var(--surface-muted)", color: "var(--muted)" }}
            >
              not evidenced
            </span>
          ) : (
            <span className="text-sm font-semibold" style={{ color: scoreColor(r.rawScore * 20) }}>
              {r.rawScore}/5
            </span>
          )}
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            {r.reasoning}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function CandidateClient({ id }: { id: string }) {
  const [data, setData] = useState<CandidateDetail | null>(null);
  const [tab, setTab] = useState<"cv" | "PM" | "SPM">("cv");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [templateType, setTemplateType] = useState<TemplateType>("invite");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

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
      setTemplateType(d.draft.templateType);
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

  async function changeTemplate(next: TemplateType) {
    setTemplateType(next);
    setRegenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/candidates/${id}/draft/template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateType: next }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setSubject(d.subject);
      setBody(d.body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't generate that template.");
    } finally {
      setRegenerating(false);
    }
  }

  async function confirmSend() {
    setSending(true);
    setError(null);
    try {
      await saveDraft();
      const res = await fetch(`/api/candidates/${id}/send`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setShowConfirm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed.");
    } finally {
      setSending(false);
    }
  }

  async function setReviewStatus(reviewStatus: ReviewStatus) {
    setData((d) => (d ? { ...d, reviewStatus } : d));
    await fetch(`/api/candidates/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewStatus }),
    });
    load();
  }

  async function setRating(recruiterRating: number | null) {
    setData((d) => (d ? { ...d, recruiterRating } : d));
    await fetch(`/api/candidates/${id}/rating`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recruiterRating }),
    });
  }

  async function addNote() {
    if (!noteText.trim()) return;
    const res = await fetch(`/api/candidates/${id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: noteText }),
    });
    if (res.ok) {
      setNoteText("");
      load();
    }
  }

  if (!data) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="h-24 rounded-xl shimmer mb-6" />
        <div className="h-64 rounded-xl shimmer" />
      </div>
    );
  }

  const appliedTotal = data.totals.find((t) => t.roleScored === data.role.rubricRole);
  const score = appliedTotal ? Math.round(appliedTotal.totalScore) : null;
  const brief = data.briefs.find((b) => b.roleScored === data.role.rubricRole);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <Link href={`/roles/${data.role.id}`} className="text-sm" style={{ color: "var(--muted)" }}>
        ← {data.role.title}
      </Link>

      {/* header */}
      <div className="card p-6 mt-4 mb-6 flex items-start justify-between gap-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">{data.name}</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            {data.email} {data.phone ? `· ${data.phone}` : ""}
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Applying for {data.role.title} · pipeline status: {data.status}
          </p>
          <div className="flex items-center gap-3 mt-3">
            <RatingStars value={data.recruiterRating} onChange={setRating} />
            <select
              value={data.reviewStatus}
              onChange={(e) => setReviewStatus(e.target.value as ReviewStatus)}
              className="px-2.5 py-1.5 rounded-lg text-sm"
              style={{ border: "1px solid var(--border)" }}
            >
              {REVIEW_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {REVIEW_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
        {score !== null && (
          <div className="text-right shrink-0">
            <div className="text-3xl font-bold" style={{ color: scoreColor(score) }}>
              {score}
            </div>
            <div className="text-xs" style={{ color: "var(--muted)" }}>
              / 100 fit score
            </div>
            {appliedTotal?.confidence === "low" && (
              <div className="text-xs mt-1" style={{ color: "var(--status-in-review)" }}>
                low confidence — {appliedTotal.notEvidencedCount} not evidenced
              </div>
            )}
          </div>
        )}
      </div>

      <p
        className="text-xs mb-6 px-4 py-2.5 rounded-lg"
        style={{ background: "var(--surface-muted)", color: "var(--muted)" }}
      >
        Fit score is decision support, generated by comparing this CV against Kargo&apos;s fixed hiring
        rubric — it is not an automatic hiring decision. It never considers title, employer, school, age,
        gender, ethnicity, location, or any protected characteristic.
      </p>

      {brief && (
        <div
          className="mb-6 p-4 rounded-xl"
          style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}
        >
          <p className="text-xs font-semibold uppercase mb-1" style={{ color: "var(--accent)" }}>
            Interview brief
          </p>
          <p className="text-sm">{brief.briefText}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* left: CV + score evidence */}
        <div className="lg:col-span-2">
          <div className="flex gap-2 mb-4">
            {(["cv", "PM", "SPM"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={tab === t ? "btn-primary" : "btn-secondary"}
                style={{ padding: "0.5rem 0.875rem", borderRadius: "0.5rem", fontSize: "0.8125rem" }}
              >
                {t === "cv" ? "CV" : `${t} rubric evidence`}
              </button>
            ))}
          </div>

          {tab === "cv" && (
            <div className="card p-4 max-h-[600px] overflow-y-auto">
              <pre className="text-xs whitespace-pre-wrap font-sans" style={{ color: "var(--foreground)" }}>
                {data.cvContent || "No content extracted."}
              </pre>
            </div>
          )}
          {(tab === "PM" || tab === "SPM") && <ScoreTable rows={data.scoresByRole[tab]} />}
        </div>

        {/* right: notes + activity */}
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold mb-2">
              Private notes <span style={{ color: "var(--muted)", fontWeight: 400 }}>(never shown to candidate)</span>
            </h2>
            <div className="card p-3 mb-2">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={3}
                placeholder="Add a private note…"
                className="w-full text-sm resize-none focus:outline-none"
              />
              <button
                onClick={addNote}
                disabled={!noteText.trim()}
                className="btn-secondary mt-2 px-3 py-1.5 rounded-md text-xs font-medium"
              >
                Add note
              </button>
            </div>
            <div className="space-y-2">
              {data.notes.map((n) => (
                <div key={n.id} className="card p-3">
                  <p className="text-sm">{n.text}</p>
                  <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold mb-2">Activity</h2>
            <div className="card divide-y" style={{ borderColor: "var(--border)" }}>
              {data.activities.map((a) => (
                <div key={a.id} className="px-3 py-2.5 text-xs">
                  <p>{a.message}</p>
                  <p style={{ color: "var(--muted)" }}>{new Date(a.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* email composer */}
      {data.draft && (
        <div className="card p-5 mt-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-sm font-semibold">Email composer</h2>
            {data.draft.status === "sent" && (
              <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "var(--status-shortlisted-bg)", color: "var(--status-shortlisted)" }}>
                Sent {data.draft.sentAt ? new Date(data.draft.sentAt).toLocaleString() : ""}
              </span>
            )}
            {data.draft.status === "failed" && (
              <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "var(--status-declined-bg)", color: "var(--status-declined)" }}>
                Failed to send
              </span>
            )}
            {data.draft.status === "draft" && (
              <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "var(--surface-muted)", color: "var(--muted)" }}>
                Draft
              </span>
            )}
          </div>

          {data.draft.status !== "sent" && (
            <div className="mb-4">
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>
                Template
              </label>
              <div className="flex flex-wrap gap-2">
                {TEMPLATE_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => changeTemplate(t)}
                    disabled={regenerating}
                    className={templateType === t ? "btn-primary" : "btn-secondary"}
                    style={{ padding: "0.375rem 0.75rem", borderRadius: "0.5rem", fontSize: "0.75rem" }}
                  >
                    {TEMPLATE_LABELS[t]}
                  </button>
                ))}
              </div>
              {regenerating && (
                <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
                  Generating…
                </p>
              )}
            </div>
          )}

          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>
            Recipient
          </label>
          <p className="text-sm mb-3">{data.email}</p>

          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>
            Subject
          </label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={data.draft.status === "sent"}
            className="w-full mb-3 px-3.5 py-2.5 rounded-lg text-sm disabled:opacity-60"
            style={{ border: "1px solid var(--border)" }}
          />

          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>
            Body
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={data.draft.status === "sent"}
            rows={9}
            className="w-full mb-3 px-3.5 py-2.5 rounded-lg text-sm disabled:opacity-60"
            style={{ border: "1px solid var(--border)" }}
          />

          {error && <p className="text-sm mb-3" style={{ color: "var(--status-declined)" }}>{error}</p>}

          {data.draft.status !== "sent" && (
            <div className="flex gap-3">
              <button
                onClick={saveDraft}
                disabled={saving || sending}
                className="btn-secondary px-4 py-2.5 rounded-lg text-sm font-medium"
              >
                {saving ? "Saving…" : "Save draft"}
              </button>
              <button
                onClick={() => setShowConfirm(true)}
                disabled={sending}
                className="btn-primary px-4 py-2.5 rounded-lg text-sm font-medium"
              >
                Review & send
              </button>
            </div>
          )}
        </div>
      )}

      {/* send confirmation modal */}
      {showConfirm && data.draft && (
        <div
          className="fixed inset-0 flex items-center justify-center p-6 z-50"
          style={{ background: "rgba(35,32,27,0.4)" }}
        >
          <div className="card p-6 max-w-md w-full" style={{ background: "var(--surface)" }}>
            <h3 className="font-semibold mb-2">Confirm send</h3>
            <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
              This will send an email to <strong>{data.email}</strong> right now. This cannot be undone.
            </p>
            <div className="card p-3 mb-4" style={{ background: "var(--surface-muted)" }}>
              <p className="text-xs font-medium mb-1">{subject}</p>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                {body.slice(0, 200)}
                {body.length > 200 ? "…" : ""}
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="btn-secondary px-4 py-2 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmSend}
                disabled={sending}
                className="btn-primary px-4 py-2 rounded-lg text-sm font-medium"
              >
                {sending ? "Sending…" : "Send now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
