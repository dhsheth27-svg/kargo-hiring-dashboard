"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { pal, daysAgo, initials as getInitials, scoreHue } from "@/lib/theme";
import {
  BOARD_STAGES,
  STAGE_LABELS,
  TEMPLATE_TYPES,
  TEMPLATE_LABELS,
  type AnyStage,
  type TemplateType,
} from "@/lib/types";

interface ScoreRow {
  criterion: string;
  weight: number;
  rawScore: number | null;
  reasoning: string;
}
interface NoteRow {
  id: string;
  text: string;
  createdAt: string;
}
interface CandidateDetail {
  id: string;
  status: string;
  stage: AnyStage;
  recruiterRating: number | null;
  name: string;
  email: string;
  phone: string | null;
  cvContent: string | null;
  createdAt: string;
  role: { id: string; title: string; rubricRole: "PM" | "SPM"; hue: number };
  totals: Array<{ roleScored: string; totalScore: number; notEvidencedCount: number; confidence: string }>;
  scoresByRole: { PM: ScoreRow[]; SPM: ScoreRow[] };
  briefs: Array<{ roleScored: string; briefText: string }>;
  draft: {
    templateType: TemplateType;
    subject: string;
    body: string;
    status: string;
    sentAt: string | null;
    failedReason: string | null;
  } | null;
  notes: NoteRow[];
}

type DrawerTab = "profile" | "scorecard" | "notes" | "email";

export default function CandidateClient({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = useState<CandidateDetail | null>(null);
  const [tab, setTab] = useState<DrawerTab>("profile");
  const [noteText, setNoteText] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [templateType, setTemplateType] = useState<TemplateType>("invite");
  const [regenerating, setRegenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function load() {
    const res = await fetch(`/api/candidates/${id}`);
    const d = await res.json();
    setData(d);
    if (d.draft) {
      setSubject(d.draft.subject);
      setBody(d.draft.body);
      setTemplateType(d.draft.templateType);
    }
  }

  async function moveTo(stage: AnyStage) {
    setData((d) => (d ? { ...d, stage } : d));
    await fetch(`/api/candidates/${id}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
  }

  async function setRating(recruiterRating: number) {
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

  async function saveDraft() {
    await fetch(`/api/candidates/${id}/draft`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, body }),
    });
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

  if (!data) {
    return <div style={{ color: "white", opacity: 0.7, fontWeight: 300, fontSize: 20 }}>Loading…</div>;
  }

  const p = pal(data.role.hue);
  const appliedTotal = data.totals.find((t) => t.roleScored === data.role.rubricRole);
  const score = appliedTotal ? Math.round(appliedTotal.totalScore) : null;
  const brief = data.briefs.find((b) => b.roleScored === data.role.rubricRole);
  const criteria = data.scoresByRole[data.role.rubricRole];
  const stageIdx = BOARD_STAGES.indexOf(data.stage as (typeof BOARD_STAGES)[number]);
  const nextStage = stageIdx >= 0 && stageIdx < BOARD_STAGES.length - 1 ? BOARD_STAGES[stageIdx + 1] : null;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div
        className="mist-panel"
        style={{ borderRadius: 40, overflow: "hidden", animation: "kgSlide .35s cubic-bezier(.2,.8,.2,1)" }}
      >
        {/* portrait header */}
        <div
          style={{
            position: "relative",
            height: 250,
            background: `linear-gradient(170deg, oklch(0.58 0.035 165), ${p.mid} 60%, oklch(0.92 0.02 150))`,
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", width: 260, height: 260, borderRadius: "50%", background: p.mid, filter: "blur(50px)", right: -60, top: -60, opacity: 0.9 }} />
          <div style={{ position: "absolute", left: 24, bottom: -40, fontWeight: 200, fontSize: 220, lineHeight: 1, letterSpacing: "-0.06em", color: "oklch(1 0 0 / .45)" }}>
            {getInitials(data.name)}
          </div>
          <div style={{ position: "absolute", top: 22, left: 22, right: 22, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              onClick={() => router.back()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "6px 16px 6px 6px",
                borderRadius: 999,
                border: "1px solid oklch(1 0 0 / .4)",
                background: "oklch(1 0 0 / .15)",
                backdropFilter: "blur(14px)",
                color: "white",
                cursor: "pointer",
                fontSize: 15,
              }}
            >
              <span style={{ width: 32, height: 32, borderRadius: "50%", background: "oklch(1 0 0 / .2)", display: "grid", placeItems: "center" }}>‹</span>
              Back
            </button>
            {score !== null && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 999, background: "oklch(1 0 0 / .2)", border: "1px solid oklch(1 0 0 / .4)", color: "white", fontSize: 13 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "white" }} />
                {score}
              </div>
            )}
          </div>
          <div style={{ position: "absolute", right: 22, bottom: 22, display: "flex" }}>
            {[
              { n: daysAgo(data.createdAt), label: "days" },
              { n: data.notes.length, label: "notes" },
              { n: data.recruiterRating ?? "–", label: "rating" },
            ].map((b, i) => (
              <div
                key={i}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  marginLeft: -10,
                  background: "oklch(1 0 0 / .25)",
                  border: "1px solid oklch(1 0 0 / .55)",
                  backdropFilter: "blur(12px)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "oklch(0.25 0.02 170)",
                  lineHeight: 1.05,
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 500 }}>{b.n}</span>
                <span style={{ fontSize: 9 }}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: "22px 26px 0" }}>
          <div style={{ fontWeight: 300, fontSize: 32, lineHeight: 1.05, letterSpacing: "-0.035em" }}>{data.name}</div>
          <div style={{ fontSize: 15, color: "oklch(0.42 0.02 170)", marginTop: 6 }}>{data.role.title}</div>

          {/* stepper */}
          <div style={{ display: "flex", gap: 4, marginTop: 18 }}>
            {BOARD_STAGES.map((s, i) => {
              const reached = data.stage === "declined" ? false : i <= stageIdx;
              return (
                <button
                  key={s}
                  onClick={() => moveTo(s)}
                  title={`Move to ${STAGE_LABELS[s]}`}
                  style={{ flex: 1, border: "none", cursor: "pointer", background: "transparent", padding: 0, display: "flex", flexDirection: "column", gap: 7, textAlign: "left", color: "inherit" }}
                >
                  <div style={{ height: 5, borderRadius: 999, background: reached ? pal(0).ink : "oklch(0.28 0.02 170 / .15)", transition: "background .3s" }} />
                  <div style={{ fontSize: 11, fontWeight: i === stageIdx ? 600 : 400 }}>{STAGE_LABELS[s]}</div>
                </button>
              );
            })}
          </div>
          {data.stage === "declined" && (
            <div style={{ marginTop: 8, fontSize: 12, color: "oklch(0.5 0.09 10)" }}>Declined</div>
          )}

          {/* tabs */}
          <div style={{ display: "flex", gap: 2, padding: 4, marginTop: 18, borderRadius: 999, background: "oklch(1 0 0 / .5)", border: "1px solid white", width: "fit-content" }}>
            {([
              { k: "profile", label: "Profile" },
              { k: "scorecard", label: "Scorecard" },
              { k: "notes", label: "Notes" },
              { k: "email", label: "Email" },
            ] as const).map((t) => {
              const active = tab === t.k;
              return (
                <button
                  key={t.k}
                  onClick={() => setTab(t.k)}
                  style={{ border: "none", cursor: "pointer", padding: "8px 15px", borderRadius: 999, fontSize: 13, background: active ? "oklch(0.3 0.02 170)" : "transparent", color: active ? "white" : "inherit" }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ padding: "18px 26px 22px", minHeight: 200 }}>
          {tab === "profile" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { k: "Email", v: data.email },
                { k: "Phone", v: data.phone || "Not found" },
                { k: "Applied", v: new Date(data.createdAt).toLocaleDateString() },
                { k: "Rubric", v: data.role.rubricRole },
              ].map((f) => (
                <div key={f.k} style={{ padding: "14px 16px", borderRadius: 20, background: "oklch(1 0 0 / .55)", border: "1px solid white" }}>
                  <div style={{ fontSize: 12, color: "oklch(0.42 0.02 170)" }}>{f.k}</div>
                  <div style={{ fontWeight: 500, fontSize: 15, marginTop: 4, wordBreak: "break-word" }}>{f.v}</div>
                </div>
              ))}
              {brief && (
                <div style={{ gridColumn: "1 / -1", padding: "14px 16px", borderRadius: 20, background: "oklch(1 0 0 / .55)", border: "1px solid white" }}>
                  <div style={{ fontSize: 12, color: "oklch(0.42 0.02 170)" }}>Interview brief</div>
                  <div style={{ fontSize: 14, marginTop: 6, lineHeight: 1.5 }}>{brief.briefText}</div>
                </div>
              )}
              <div style={{ gridColumn: "1 / -1", fontSize: 12, color: "oklch(0.42 0.02 170)" }}>
                Fit score is decision support from Kargo&apos;s fixed rubric — not an automatic hiring decision, and
                never based on title, employer, school, age, gender, ethnicity, or location.
              </div>
            </div>
          )}

          {tab === "scorecard" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {criteria.map((s) => (
                <div key={s.criterion}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 8 }}>
                    <span>{s.criterion}</span>
                    <span style={{ fontWeight: 300 }}>{s.rawScore ?? "—"} / 5</span>
                  </div>
                  <div style={{ display: "flex", gap: 5 }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div
                        key={n}
                        style={{
                          flex: 1,
                          height: 12,
                          borderRadius: 999,
                          border: "1px solid white",
                          background: s.rawScore !== null && n <= s.rawScore ? pal(scoreHue((s.rawScore / 5) * 100)).solid : "oklch(1 0 0 / .5)",
                        }}
                      />
                    ))}
                  </div>
                  <p style={{ fontSize: 13, color: "oklch(0.42 0.02 170)", marginTop: 8 }}>
                    {s.rawScore === null ? "Not evidenced in the CV." : s.reasoning}
                  </p>
                </div>
              ))}
              <div style={{ fontSize: 13, color: "oklch(0.42 0.02 170)" }}>AI-generated from the candidate&apos;s CV against Kargo&apos;s fixed rubric.</div>
            </div>
          )}

          {tab === "notes" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note for the hiring team"
                rows={3}
                style={{ width: "100%", resize: "vertical", padding: "14px 16px", borderRadius: 22, border: "1px solid white", background: "oklch(1 0 0 / .55)", fontSize: 14, outline: "none", color: "inherit" }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={addNote}
                  style={{ border: "none", cursor: "pointer", padding: "9px 18px", borderRadius: 999, background: "oklch(0.3 0.02 170)", color: "white", fontSize: 13 }}
                >
                  Add note
                </button>
              </div>
              {data.notes.map((n) => (
                <div key={n.id} style={{ padding: "14px 16px", borderRadius: 20, background: "oklch(1 0 0 / .55)", border: "1px solid white" }}>
                  <div style={{ fontSize: 14, lineHeight: 1.5 }}>{n.text}</div>
                  <div style={{ fontSize: 12, color: "oklch(0.42 0.02 170)", marginTop: 8 }}>{new Date(n.createdAt).toLocaleString()}</div>
                </div>
              ))}
              {data.notes.length === 0 && (
                <div style={{ fontSize: 14, color: "oklch(0.42 0.02 170)", textAlign: "center", padding: 20 }}>No notes yet.</div>
              )}
            </div>
          )}

          {tab === "email" && data.draft && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {TEMPLATE_TYPES.map((t) => {
                  const active = templateType === t;
                  return (
                    <button
                      key={t}
                      onClick={() => changeTemplate(t)}
                      disabled={regenerating || data.draft?.status === "sent"}
                      style={{ padding: "7px 13px", borderRadius: 999, cursor: "pointer", fontSize: 12, border: `1px solid ${active ? "oklch(0.3 0.02 170)" : "oklch(0.28 0.02 170 / .2)"}`, background: active ? "oklch(0.3 0.02 170)" : "oklch(1 0 0 / .5)", color: active ? "white" : "inherit" }}
                    >
                      {TEMPLATE_LABELS[t]}
                    </button>
                  );
                })}
              </div>
              {regenerating && <p style={{ fontSize: 12, color: "oklch(0.42 0.02 170)" }}>Generating…</p>}

              <div style={{ fontSize: 12, color: "oklch(0.42 0.02 170)" }}>To: {data.email}</div>

              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={data.draft.status === "sent"}
                style={{ padding: "12px 16px", borderRadius: 999, border: "1px solid white", background: "oklch(1 0 0 / .6)", fontSize: 14, outline: "none", color: "inherit" }}
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={data.draft.status === "sent"}
                rows={8}
                style={{ width: "100%", resize: "vertical", padding: "14px 16px", borderRadius: 22, border: "1px solid white", background: "oklch(1 0 0 / .6)", fontSize: 14, outline: "none", color: "inherit" }}
              />

              {data.draft.status === "sent" && (
                <div style={{ fontSize: 13, color: "oklch(0.4 0.1 150)" }}>
                  Sent {data.draft.sentAt ? new Date(data.draft.sentAt).toLocaleString() : ""}
                </div>
              )}
              {data.draft.status === "failed" && (
                <div style={{ fontSize: 13, color: "oklch(0.5 0.1 10)" }}>Failed: {data.draft.failedReason}</div>
              )}
              {error && <p style={{ fontSize: 13, color: "oklch(0.5 0.1 10)" }}>{error}</p>}

              {data.draft.status !== "sent" && (
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={saveDraft} style={{ flex: 1, padding: 12, borderRadius: 999, border: "1px solid oklch(0.28 0.02 170 / .2)", background: "oklch(1 0 0 / .5)", cursor: "pointer", fontSize: 14, color: "inherit" }}>
                    Save draft
                  </button>
                  <button onClick={() => setShowConfirm(true)} style={{ flex: 1, padding: 12, borderRadius: 999, border: "none", background: "oklch(0.3 0.02 170)", color: "white", cursor: "pointer", fontSize: 14 }}>
                    Review & send
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* footer */}
        {data.stage !== "declined" && data.stage !== "hired" && (
          <div style={{ display: "flex", gap: 10, padding: "14px 20px 20px" }}>
            <button
              onClick={() => moveTo("declined")}
              style={{ flex: 1, padding: 14, borderRadius: 999, border: "1px solid oklch(0.28 0.02 170 / .2)", background: "oklch(1 0 0 / .5)", color: "inherit", cursor: "pointer", fontSize: 15 }}
            >
              Reject
            </button>
            {nextStage && (
              <button
                onClick={() => moveTo(nextStage)}
                style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 6px 6px 22px", borderRadius: 999, border: "none", background: "oklch(0.3 0.02 170)", color: "white", cursor: "pointer", fontSize: 15 }}
              >
                Advance to {STAGE_LABELS[nextStage]}
                <span style={{ width: 40, height: 40, borderRadius: "50%", background: "white", color: "oklch(0.3 0.02 170)", display: "grid", placeItems: "center" }}>✦</span>
              </button>
            )}
          </div>
        )}
      </div>

      {showConfirm && data.draft && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "grid", placeItems: "center", padding: 20 }}>
          <div onClick={() => setShowConfirm(false)} style={{ position: "absolute", inset: 0, background: "oklch(0.25 0.02 175 / .4)", backdropFilter: "blur(8px)" }} />
          <div className="mist-panel" style={{ position: "relative", width: "min(480px,100%)", borderRadius: 32, padding: 28 }}>
            <h3 style={{ margin: 0, fontWeight: 300, fontSize: 26 }}>Confirm send</h3>
            <p style={{ fontSize: 14, color: "oklch(0.42 0.02 170)", margin: "10px 0 16px" }}>
              This sends an email to <strong>{data.email}</strong> right now. This cannot be undone.
            </p>
            <div style={{ padding: 14, borderRadius: 18, background: "oklch(1 0 0 / .6)", marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{subject}</div>
              <div style={{ fontSize: 12, color: "oklch(0.42 0.02 170)", marginTop: 6 }}>{body.slice(0, 180)}{body.length > 180 ? "…" : ""}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setShowConfirm(false)} style={{ padding: "10px 18px", borderRadius: 999, border: "1px solid oklch(0.28 0.02 170 / .2)", background: "oklch(1 0 0 / .5)", cursor: "pointer", fontSize: 14, color: "inherit" }}>
                Cancel
              </button>
              <button onClick={confirmSend} disabled={sending} style={{ padding: "10px 18px", borderRadius: 999, border: "none", background: "oklch(0.3 0.02 170)", color: "white", cursor: "pointer", fontSize: 14 }}>
                {sending ? "Sending…" : "Send now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* rating (kept outside the mist panel per their compact fact-tile aesthetic) */}
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 18 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setRating(n)}
            aria-label={`Rate ${n}`}
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              border: "1px solid oklch(1 0 0 / .4)",
              background: data.recruiterRating !== null && n <= data.recruiterRating ? "white" : "oklch(1 0 0 / .12)",
              color: data.recruiterRating !== null && n <= data.recruiterRating ? "oklch(0.3 0.02 170)" : "white",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
