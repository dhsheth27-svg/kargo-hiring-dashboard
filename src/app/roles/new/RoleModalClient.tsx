"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { pal } from "@/lib/theme";

const HUES = [10, 45, 85, 145, 190, 225, 290];
const SENIORITIES = ["Junior", "Mid", "Senior", "Lead", "Principal"];

export default function RoleModalClient() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [seniority, setSeniority] = useState("Mid");
  const [rubricRole, setRubricRole] = useState<"PM" | "SPM">("PM");
  const [hue, setHue] = useState(145);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canNext1 = title.trim().length > 0;

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
          rubricRole,
          requiredSkills: "",
          hue,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create role.");
      router.push(`/pipeline?role=${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  const p = pal(hue);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "grid", placeItems: "center", padding: 20 }}>
      <div onClick={() => router.back()} style={{ position: "absolute", inset: 0, background: "oklch(0.25 0.02 175 / .4)", backdropFilter: "blur(8px)" }} />
      <div
        className="mist-panel"
        style={{ position: "relative", width: "min(580px,100%)", borderRadius: 40, padding: 32, overflow: "hidden", animation: "kgPop .35s cubic-bezier(.2,.8,.2,1)" }}
      >
        <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: p.mid, filter: "blur(60px)", right: -100, top: -120, opacity: 0.9, transition: "background .4s" }} />
        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: 300, fontSize: 38, lineHeight: 1, letterSpacing: "-0.04em" }}>Create a role.</h2>
            <p style={{ margin: "10px 0 0", color: "oklch(0.42 0.02 170)", fontSize: 15 }}>
              A few details, then candidates can start being screened against it.
            </p>
          </div>
          <button
            onClick={() => router.back()}
            style={{ width: 40, height: 40, borderRadius: "50%", border: "1px solid white", background: "oklch(1 0 0 / .55)", cursor: "pointer", fontSize: 18, flexShrink: 0, color: "inherit" }}
          >
            ×
          </button>
        </div>

        <div style={{ position: "relative", display: "flex", gap: 8, margin: "26px 0" }}>
          {[1, 2, 3].map((n) => (
            <div key={n} style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 13,
                  background: n <= step ? "oklch(0.3 0.02 170)" : "oklch(1 0 0 / .6)",
                  color: n <= step ? "white" : "inherit",
                  border: "1px solid white",
                  flexShrink: 0,
                }}
              >
                {n}
              </div>
              <div style={{ flex: 1, height: 2, borderRadius: 2, background: n < step ? "oklch(0.3 0.02 170)" : "oklch(0.28 0.02 170 / .15)" }} />
            </div>
          ))}
        </div>

        <div style={{ position: "relative" }}>
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
                Job title
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Senior Product Manager"
                  style={{ padding: "14px 18px", borderRadius: 999, border: "1px solid white", background: "oklch(1 0 0 / .6)", fontSize: 15, outline: "none", color: "inherit" }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
                Description
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="What will this person own?"
                  style={{ padding: "14px 18px", borderRadius: 24, border: "1px solid white", background: "oklch(1 0 0 / .6)", fontSize: 15, outline: "none", resize: "vertical", color: "inherit" }}
                />
              </label>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
                Location
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Bengaluru · Hybrid"
                  style={{ padding: "14px 18px", borderRadius: 999, border: "1px solid white", background: "oklch(1 0 0 / .6)", fontSize: 15, outline: "none", color: "inherit" }}
                />
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 14 }}>Seniority</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {SENIORITIES.map((s) => {
                    const active = seniority === s;
                    return (
                      <button
                        key={s}
                        onClick={() => setSeniority(s)}
                        style={{ padding: "9px 16px", borderRadius: 999, cursor: "pointer", fontSize: 14, border: `1px solid ${active ? "oklch(0.3 0.02 170)" : "oklch(0.28 0.02 170 / .2)"}`, background: active ? "oklch(0.3 0.02 170)" : "transparent", color: active ? "white" : "inherit" }}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 14 }}>Scoring rubric</div>
                <p style={{ fontSize: 12, color: "oklch(0.42 0.02 170)", margin: 0 }}>
                  Kargo scores every candidate against a fixed rubric built from past-hire patterns — this
                  picks which rubric, it doesn&apos;t change how scoring works.
                </p>
                <div style={{ display: "flex", gap: 6 }}>
                  {(["PM", "SPM"] as const).map((r) => {
                    const active = rubricRole === r;
                    return (
                      <button
                        key={r}
                        onClick={() => setRubricRole(r)}
                        style={{ padding: "9px 16px", borderRadius: 999, cursor: "pointer", fontSize: 14, border: `1px solid ${active ? "oklch(0.3 0.02 170)" : "oklch(0.28 0.02 170 / .2)"}`, background: active ? "oklch(0.3 0.02 170)" : "transparent", color: active ? "white" : "inherit" }}
                      >
                        {r === "PM" ? "Product Manager" : "Senior Product Manager"}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ padding: 22, borderRadius: 28, background: "oklch(1 0 0 / .6)", border: "1px solid white" }}>
                <div style={{ fontWeight: 300, fontSize: 28, lineHeight: 1.1, letterSpacing: "-0.03em" }}>{title || "Untitled role"}</div>
                <div style={{ fontSize: 14, marginTop: 8, color: "oklch(0.42 0.02 170)" }}>
                  {rubricRole} · {location || "Location not set"} · {seniority}
                </div>
                <div style={{ fontSize: 14, marginTop: 12, lineHeight: 1.5 }}>{description || "No description."}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 14 }}>Colour tag</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {HUES.map((h) => (
                    <button
                      key={h}
                      onClick={() => setHue(h)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        cursor: "pointer",
                        background: `radial-gradient(circle at 30% 25%, white, ${pal(h).solid} 75%)`,
                        border: "2px solid white",
                        boxShadow: hue === h ? "0 0 0 2px oklch(0.3 0.02 170)" : "none",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {error && <p style={{ fontSize: 13, color: "oklch(0.5 0.1 10)", marginTop: 12 }}>{error}</p>}

        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 28 }}>
          <button
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            style={{ padding: "12px 22px", borderRadius: 999, border: "1px solid oklch(0.28 0.02 170 / .2)", background: "oklch(1 0 0 / .5)", cursor: "pointer", fontSize: 15, color: "inherit", opacity: step === 1 ? 0 : 1 }}
          >
            Back
          </button>
          {step < 3 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 1 && !canNext1}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 6px 6px 22px", borderRadius: 999, border: "none", background: "oklch(0.3 0.02 170)", color: "white", cursor: "pointer", fontSize: 15, opacity: step === 1 && !canNext1 ? 0.5 : 1 }}
            >
              Next
              <span style={{ width: 38, height: 38, borderRadius: "50%", background: "white", color: "oklch(0.3 0.02 170)", display: "grid", placeItems: "center" }}>✦</span>
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={submitting}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 6px 6px 22px", borderRadius: 999, border: "none", background: "oklch(0.3 0.02 170)", color: "white", cursor: "pointer", fontSize: 15 }}
            >
              {submitting ? "Creating…" : "Create role"}
              <span style={{ width: 38, height: 38, borderRadius: "50%", background: "white", color: "oklch(0.3 0.02 170)", display: "grid", placeItems: "center" }}>✦</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
