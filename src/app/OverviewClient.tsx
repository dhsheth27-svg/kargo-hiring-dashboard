"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import { pal, daysAgo } from "@/lib/theme";
import { STAGE_LABELS, STAGE_HUES, BOARD_STAGES, type AnyStage } from "@/lib/types";

interface RoleRow {
  id: string;
  title: string;
  location: string | null;
  hue: number;
  totalCandidates: number;
  counts: Record<AnyStage, number>;
}

interface CandidateRow {
  id: string;
  name: string;
  roleId: string;
  roleTitle: string;
  roleHue: number;
  stage: AnyStage;
  score: number | null;
  createdAt: string;
}

export default function OverviewClient() {
  const router = useRouter();
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/roles").then((r) => r.json()),
      fetch("/api/candidates").then((r) => r.json()),
    ]).then(([rolesData, candData]) => {
      setRoles(rolesData.roles ?? []);
      setCandidates(candData.candidates ?? []);
      setLoading(false);
    });
  }, []);

  const stats = useMemo(() => {
    const inPipeline = candidates.filter((c) => c.stage !== "declined" && c.stage !== "hired").length;
    const interviewing = candidates.filter((c) => c.stage === "interview").length;
    const offers = candidates.filter((c) => c.stage === "offer").length;
    return [
      { label: "Open roles", value: roles.length, sub: `${candidates.length} total applicants`, hue: 225 },
      { label: "In pipeline", value: inPipeline, sub: "Active, not yet resolved", hue: 190 },
      { label: "Interviewing", value: interviewing, sub: "Currently in interview stage", hue: 290 },
      { label: "Offers out", value: offers, sub: "Awaiting a decision", hue: 45 },
    ];
  }, [roles, candidates]);

  const funnel = useMemo(() => {
    const max = Math.max(1, ...BOARD_STAGES.map((s) => candidates.filter((c) => c.stage === s).length));
    return BOARD_STAGES.map((s) => {
      const n = candidates.filter((c) => c.stage === s).length;
      return { label: STAGE_LABELS[s], n, pct: Math.max(6, (n / max) * 100), solid: pal(STAGE_HUES[s]).solid };
    });
  }, [candidates]);

  const attention = useMemo(() => {
    const rows: Array<{ id: string; name: string; roleHue: number; reason: string; tag: string; tagHue: number }> = [];
    for (const c of candidates) {
      if (c.stage === "offer") {
        rows.push({ id: c.id, name: c.name, roleHue: c.roleHue, reason: `Offer out for ${c.roleTitle}`, tag: "Follow up", tagHue: 45 });
      } else if (c.stage === "applied" && daysAgo(c.createdAt) > 5) {
        rows.push({ id: c.id, name: c.name, roleHue: c.roleHue, reason: `Waiting ${daysAgo(c.createdAt)} days for review`, tag: "Review", tagHue: 225 });
      } else if (c.stage === "interview" && (c.score ?? 0) >= 85) {
        rows.push({ id: c.id, name: c.name, roleHue: c.roleHue, reason: `Scored ${c.score}, ready for decision`, tag: "Decide", tagHue: 290 });
      }
    }
    return rows.slice(0, 5);
  }, [candidates]);

  const weekly = useMemo(() => {
    const weeks: number[] = Array(12).fill(0);
    const now = Date.now();
    for (const c of candidates) {
      const weeksAgo = Math.floor((now - new Date(c.createdAt).getTime()) / (7 * 86400000));
      if (weeksAgo >= 0 && weeksAgo < 12) weeks[11 - weeksAgo]++;
    }
    const max = Math.max(1, ...weeks);
    return weeks.map((n, i) => ({ n, h: Math.max(6, (n / max) * 100), latest: i === 11 }));
  }, [candidates]);

  const byRole = useMemo(() => {
    const total = candidates.length || 1;
    const circumference = 2 * Math.PI * 54;
    let offset = 0;
    return roles
      .filter((r) => r.totalCandidates > 0)
      .map((r) => {
        const pct = r.totalCandidates / total;
        const dash = pct * circumference;
        const seg = { role: r, n: r.totalCandidates, solid: pal(r.hue).solid, dash: `${dash} ${circumference - dash}`, offset: -offset };
        offset += dash;
        return seg;
      });
  }, [roles, candidates]);

  if (loading) {
    return (
      <div style={{ color: "white", opacity: 0.7, fontWeight: 300, fontSize: 20 }}>Loading…</div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
      {/* hero */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 28, flexWrap: "wrap", padding: "8px 0 10px" }}>
        <div style={{ maxWidth: 780 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "oklch(1 0 0 / .8)", marginBottom: 16 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "white" }} />
            Dashboard
          </div>
          <h1 style={{ margin: 0, fontWeight: 300, fontSize: "clamp(38px,5.2vw,66px)", lineHeight: 1.02, letterSpacing: "-0.04em", color: "white" }}>
            Open roles, pipeline health, and{" "}
            <span style={{ color: "oklch(0.9 0.06 150)" }}>what needs your attention.</span>
          </h1>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start", maxWidth: 320 }}>
          <div style={{ display: "flex" }}>
            {[
              { n: attention.length, dot: "oklch(0.86 0.055 45)", label: "Need attention" },
              { n: candidates.filter((c) => c.stage === "interview").length, dot: "oklch(0.86 0.055 290)", label: "Interviewing" },
              { n: candidates.filter((c) => c.stage === "offer").length, dot: "oklch(0.86 0.055 45)", label: "Offers out" },
            ].map((b, i) => (
              <div
                key={i}
                title={b.label}
                style={{
                  position: "relative",
                  width: 50,
                  height: 50,
                  borderRadius: "50%",
                  marginRight: -12,
                  background: "oklch(1 0 0 / .16)",
                  border: "1px solid oklch(1 0 0 / .4)",
                  backdropFilter: "blur(14px)",
                  display: "grid",
                  placeItems: "center",
                  color: "white",
                  fontSize: 15,
                  fontWeight: 500,
                }}
              >
                {b.n}
                <span style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: "50%", background: b.dot }} />
              </div>
            ))}
          </div>
          <div style={{ fontSize: 16, fontWeight: 300, lineHeight: 1.45, color: "oklch(1 0 0 / .88)" }}>
            {attention.length > 0
              ? `${attention.length} candidate${attention.length === 1 ? "" : "s"} need a decision this week.`
              : "Nothing urgent right now."}
          </div>
        </div>
      </div>

      {/* stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 16 }}>
        {stats.map((s, i) => (
          <button
            key={s.label}
            onClick={() => router.push(i === 0 ? "/roles" : "/pipeline")}
            className="mist-panel"
            style={{
              position: "relative",
              textAlign: "left",
              cursor: "pointer",
              padding: 24,
              overflow: "hidden",
              animation: "kgRise .7s cubic-bezier(.2,.8,.2,1) both",
              animationDelay: `${i * 90}ms`,
              border: "1px solid oklch(1 0 0 / .7)",
            }}
          >
            <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", background: pal(s.hue).mid, filter: "blur(34px)", right: -70, top: -80, opacity: 0.95 }} />
            <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{s.label}</span>
              <span style={{ width: 30, height: 30, borderRadius: "50%", background: "oklch(1 0 0 / .6)", border: "1px solid white", display: "grid", placeItems: "center", fontSize: 13 }}>↗</span>
            </div>
            <div style={{ position: "relative", fontWeight: 200, fontSize: 72, lineHeight: 1, letterSpacing: "-0.05em", margin: "22px 0 10px" }}>{s.value}</div>
            <div style={{ position: "relative", fontSize: 13, color: "oklch(0.42 0.02 170)" }}>{s.sub}</div>
          </button>
        ))}
      </div>

      {/* funnel + attention */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))", gap: 16 }}>
        <section className="mist-panel" style={{ padding: 26 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
            <h2 style={{ margin: 0, fontWeight: 300, fontSize: 26, letterSpacing: "-0.03em" }}>Pipeline funnel.</h2>
            <button
              onClick={() => router.push("/pipeline")}
              style={{ border: "1px solid oklch(0.28 0.02 170 / .18)", background: "oklch(1 0 0 / .5)", cursor: "pointer", fontSize: 13, padding: "7px 14px", borderRadius: 999, color: "oklch(0.28 0.02 170)" }}
            >
              Open board
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {funnel.map((f) => (
              <div key={f.label} style={{ display: "grid", gridTemplateColumns: "92px 1fr 32px", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 14 }}>{f.label}</div>
                <div style={{ height: 36, borderRadius: 999, background: "oklch(1 0 0 / .55)", border: "1px solid oklch(1 0 0 / .9)", overflow: "hidden", padding: 4 }}>
                  <div style={{ height: "100%", width: `${f.pct}%`, background: f.solid, borderRadius: 999, minWidth: 26 }} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 300, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{f.n}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mist-panel" style={{ padding: 26 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontWeight: 300, fontSize: 26, letterSpacing: "-0.03em" }}>
              Needs attention<span style={{ fontSize: 13, fontStyle: "italic", marginLeft: 3 }}>{attention.length}</span>
            </h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {attention.length === 0 && (
              <p style={{ fontSize: 14, color: "oklch(0.42 0.02 170)" }}>Nothing needs attention right now.</p>
            )}
            {attention.map((a, i) => (
              <button
                key={a.id}
                onClick={() => router.push(`/candidates/${a.id}`)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: 10,
                  borderRadius: 20,
                  border: "1px solid transparent",
                  background: "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                  color: "inherit",
                  animation: "kgRise .55s cubic-bezier(.2,.8,.2,1) both",
                  animationDelay: `${200 + i * 70}ms`,
                }}
              >
                <Avatar name={a.name} hue={a.roleHue} size={42} radius="50%" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 15 }}>{a.name}</div>
                  <div style={{ fontSize: 13, color: "oklch(0.42 0.02 170)" }}>{a.reason}</div>
                </div>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "6px 11px", borderRadius: 999, background: "oklch(1 0 0 / .6)", border: "1px solid white", whiteSpace: "nowrap" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: pal(a.tagHue).solid }} />
                  {a.tag}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* applications + roles distribution */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,380px),1fr))", gap: 16 }}>
        <section className="mist-panel" style={{ padding: 26, display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontWeight: 300, fontSize: 26, letterSpacing: "-0.03em" }}>
              Applications.<span style={{ fontSize: 13, fontStyle: "italic", marginLeft: 2 }}>{candidates.length}</span>
            </h2>
            <span style={{ fontSize: 13, color: "oklch(0.42 0.02 170)" }}>Last 12 weeks</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 180 }}>
            {weekly.map((w, i) => (
              <div key={i} title={`${w.n} applications`} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", gap: 6 }}>
                <div style={{ fontSize: 11, opacity: w.n > 0 ? 1 : 0.4 }}>{w.n}</div>
                <div
                  style={{
                    width: "100%",
                    height: `${w.h}%`,
                    background: w.latest ? "oklch(0.3 0.02 170)" : "linear-gradient(oklch(0.86 0.055 150), oklch(0.94 0.025 150))",
                    border: "1px solid oklch(1 0 0 / .8)",
                    borderRadius: 999,
                  }}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="mist-panel" style={{ padding: 26, display: "flex", flexDirection: "column", gap: 18 }}>
          <h2 style={{ margin: 0, fontWeight: 300, fontSize: 26, letterSpacing: "-0.03em" }}>Roles.</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
            <div style={{ position: "relative", width: 170, height: 170, flexShrink: 0 }}>
              <svg viewBox="0 0 140 140" width={170} height={170} style={{ transform: "rotate(-90deg)" }}>
                <circle cx={70} cy={70} r={54} fill="none" stroke="oklch(1 0 0 / .6)" strokeWidth={16} />
                {byRole.map((seg) => (
                  <circle
                    key={seg.role.id}
                    cx={70}
                    cy={70}
                    r={54}
                    fill="none"
                    stroke={seg.solid}
                    strokeWidth={16}
                    strokeDasharray={seg.dash}
                    strokeDashoffset={seg.offset}
                    strokeLinecap="round"
                  />
                ))}
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
                <div>
                  <div style={{ fontWeight: 200, fontSize: 40, lineHeight: 1, letterSpacing: "-0.04em" }}>{roles.length}</div>
                  <div style={{ fontSize: 12, color: "oklch(0.42 0.02 170)", marginTop: 4 }}>open roles</div>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 160 }}>
              {byRole.map((seg) => (
                <div key={seg.role.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 999 }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: seg.solid }} />
                  <span style={{ flex: 1, fontSize: 14 }}>{seg.role.title}</span>
                  <span style={{ fontSize: 14, fontWeight: 300 }}>{seg.n}</span>
                </div>
              ))}
              {byRole.length === 0 && <p style={{ fontSize: 13, color: "oklch(0.42 0.02 170)" }}>No candidates yet.</p>}
            </div>
          </div>
        </section>
      </div>

      {/* open roles */}
      <section style={{ paddingTop: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontWeight: 300, fontSize: 34, letterSpacing: "-0.035em", color: "white" }}>
            Open roles.<span style={{ fontSize: 14, fontStyle: "italic", marginLeft: 3, color: "oklch(1 0 0 / .8)" }}>{String(roles.length).padStart(2, "0")}</span>
          </h2>
          <button onClick={() => router.push("/roles")} style={{ border: "1px solid oklch(1 0 0 / .35)", background: "oklch(1 0 0 / .1)", cursor: "pointer", fontSize: 13, padding: "8px 16px", borderRadius: 999, color: "white" }}>
            All roles
          </button>
        </div>
        <div style={{ display: "flex", gap: 16, overflowX: "auto", padding: "6px 4px 20px", margin: "0 -4px" }}>
          {roles.map((r, i) => {
            const p = pal(r.hue);
            const roleCands = candidates.filter((c) => c.roleId === r.id).slice(0, 3);
            return (
              <button
                key={r.id}
                onClick={() => router.push(`/pipeline?role=${r.id}`)}
                className="mist-panel"
                style={{
                  flex: "0 0 270px",
                  textAlign: "left",
                  padding: 20,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  animation: "kgRise .6s cubic-bezier(.2,.8,.2,1) both",
                  animationDelay: `${80 + i * 70}ms`,
                }}
              >
                <div style={{ position: "relative", height: 64 }}>
                  {roleCands.map((c, vi) => (
                    <div
                      key={c.id}
                      style={{
                        position: "absolute",
                        left: vi * 26,
                        top: 0,
                        transform: `rotate(${[-10, 4, 14][vi]}deg)`,
                        width: 54,
                        height: 54,
                        borderRadius: 16,
                        border: "2px solid white",
                        boxShadow: "0 10px 20px -10px oklch(0.2 0.03 170 / .5)",
                      }}
                    >
                      <Avatar name={c.name} hue={r.hue} size={50} radius={14} />
                    </div>
                  ))}
                  <div style={{ position: "absolute", right: 0, top: 8, display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "5px 10px", borderRadius: 999, background: "oklch(1 0 0 / .6)", border: "1px solid white" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: p.solid }} />
                    {r.totalCandidates}
                  </div>
                </div>
                <div style={{ fontWeight: 300, fontSize: 21, lineHeight: 1.15, letterSpacing: "-0.02em", minHeight: 48 }}>{r.title}</div>
                <div style={{ display: "flex", height: 6, borderRadius: 999, overflow: "hidden", gap: 3 }}>
                  {BOARD_STAGES.map((s) => {
                    const n = r.counts[s] ?? 0;
                    if (n === 0) return null;
                    return <div key={s} style={{ flex: n, background: pal(STAGE_HUES[s]).solid, borderRadius: 999 }} />;
                  })}
                  {r.totalCandidates === 0 && <div style={{ flex: 1, background: "oklch(1 0 0 / .5)", borderRadius: 999 }} />}
                </div>
                <div style={{ fontSize: 13, color: "oklch(0.42 0.02 170)" }}>{r.location || "Location not set"}</div>
              </button>
            );
          })}
          {roles.length === 0 && (
            <p style={{ color: "oklch(1 0 0 / .8)" }}>No roles yet — create one to start screening candidates.</p>
          )}
        </div>
      </section>
    </div>
  );
}
