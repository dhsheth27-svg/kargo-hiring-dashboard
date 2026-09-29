"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STEPS = ["Basics", "Skills", "Scoring rubric"] as const;

export default function RoleSetupClient() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [seniority, setSeniority] = useState("");
  const [requiredSkills, setRequiredSkills] = useState("");
  const [preferredSkills, setPreferredSkills] = useState("");
  const [rubricRole, setRubricRole] = useState<"PM" | "SPM">("PM");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAdvanceFromBasics = title.trim().length > 0 && description.trim().length > 0;

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          location,
          seniority,
          requiredSkills,
          preferredSkills,
          rubricRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create role.");
      router.push(`/roles/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-semibold mb-1">Create a role</h1>
      <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>
        A few details, then candidates can start being screened against it.
      </p>

      {/* progress */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
              style={{
                background: i <= step ? "var(--accent)" : "var(--surface-muted)",
                color: i <= step ? "white" : "var(--muted)",
              }}
            >
              {i + 1}
            </div>
            <span className="text-xs hidden sm:inline" style={{ color: i <= step ? "var(--foreground)" : "var(--muted)" }}>
              {s}
            </span>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            )}
          </div>
        ))}
      </div>

      <div className="card p-6 space-y-5">
        {step === 0 && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1.5" htmlFor="title">
                Job title
              </label>
              <input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Senior Product Manager, Logistics"
                className="w-full px-3.5 py-2.5 rounded-lg text-sm"
                style={{ border: "1px solid var(--border)" }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="What this role owns, who it reports to, why it exists…"
                className="w-full px-3.5 py-2.5 rounded-lg text-sm"
                style={{ border: "1px solid var(--border)" }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" htmlFor="location">
                  Location
                </label>
                <input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Bengaluru / Remote"
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm"
                  style={{ border: "1px solid var(--border)" }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" htmlFor="seniority">
                  Seniority
                </label>
                <input
                  id="seniority"
                  value={seniority}
                  onChange={(e) => setSeniority(e.target.value)}
                  placeholder="e.g. Senior, 5-8 years"
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm"
                  style={{ border: "1px solid var(--border)" }}
                />
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1.5" htmlFor="required">
                Required skills
              </label>
              <input
                id="required"
                value={requiredSkills}
                onChange={(e) => setRequiredSkills(e.target.value)}
                placeholder="Comma-separated, e.g. Product strategy, SQL, Stakeholder management"
                className="w-full px-3.5 py-2.5 rounded-lg text-sm"
                style={{ border: "1px solid var(--border)" }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" htmlFor="preferred">
                Preferred skills
              </label>
              <input
                id="preferred"
                value={preferredSkills}
                onChange={(e) => setPreferredSkills(e.target.value)}
                placeholder="Comma-separated, optional"
                className="w-full px-3.5 py-2.5 rounded-lg text-sm"
                style={{ border: "1px solid var(--border)" }}
              />
            </div>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              These are shown for reference on the candidate profile — they don&apos;t change how candidates are scored (see next step).
            </p>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1.5">Scoring rubric</label>
              <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
                Kargo scores every candidate against a fixed rubric built from patterns in past hires — not a
                generic skills match. Pick which of the two existing rubrics applies to this role.
              </p>
              <div className="flex gap-3">
                {(["PM", "SPM"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRubricRole(r)}
                    className={rubricRole === r ? "btn-primary" : "btn-secondary"}
                    style={{ padding: "0.625rem 1rem", borderRadius: "0.5rem", fontSize: "0.875rem", fontWeight: 500 }}
                  >
                    {r === "PM" ? "Product Manager rubric" : "Senior Product Manager rubric"}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-between pt-2">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="btn-secondary px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-0"
          >
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 0 && !canAdvanceFromBasics}
              className="btn-primary px-5 py-2 rounded-lg text-sm font-medium"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="btn-primary px-5 py-2 rounded-lg text-sm font-medium"
            >
              {submitting ? "Creating…" : "Create role"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
