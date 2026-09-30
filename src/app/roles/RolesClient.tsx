"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import { pal } from "@/lib/theme";
import { BOARD_STAGES, STAGE_HUES } from "@/lib/types";

interface RoleRow {
  id: string;
  title: string;
  description: string;
  location: string | null;
  seniority: string | null;
  rubricRole: string;
  hue: number;
  totalCandidates: number;
  counts: Record<string, number>;
}
interface CandidateRow {
  id: string;
  name: string;
  roleId: string;
}

export default function RolesClient() {
  const router = useRouter();
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [filter, setFilter] = useState<"ALL" | "PM" | "SPM">("ALL");

  useEffect(() => {
    Promise.all([
      fetch("/api/roles").then((r) => r.json()),
      fetch("/api/candidates").then((r) => r.json()),
    ]).then(([rolesData, candData]) => {
      setRoles(rolesData.roles ?? []);
      setCandidates(candData.candidates ?? []);
    });
  }, []);

  const filtered = filter === "ALL" ? roles : roles.filter((r) => r.rubricRole === filter);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontWeight: 300, fontSize: 56, lineHeight: 1, letterSpacing: "-0.045em", color: "white" }}>
            Roles.<span style={{ fontSize: 16, fontStyle: "italic", marginLeft: 4, color: "oklch(1 0 0 / .8)" }}>{String(roles.length).padStart(2, "0")}</span>
          </h1>
          <p style={{ margin: "12px 0 0", color: "oklch(1 0 0 / .85)", fontSize: 16, fontWeight: 300 }}>
            Every open position and who&apos;s screening against it.
          </p>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(["ALL", "PM", "SPM"] as const).map((f) => {
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "9px 16px",
                  borderRadius: 999,
                  cursor: "pointer",
                  fontSize: 14,
                  border: `1px solid ${active ? "white" : "oklch(1 0 0 / .3)"}`,
                  background: active ? "white" : "oklch(1 0 0 / .1)",
                  color: active ? "oklch(0.28 0.02 170)" : "white",
                }}
              >
                {f === "ALL" ? "All" : f}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(310px,1fr))", gap: 18 }}>
        {filtered.map((r, i) => {
          const p = pal(r.hue);
          const roleCands = candidates.filter((c) => c.roleId === r.id).slice(0, 3);
          return (
            <div
              key={r.id}
              className="mist-panel"
              style={{
                position: "relative",
                padding: 24,
                display: "flex",
                flexDirection: "column",
                gap: 16,
                overflow: "hidden",
                animation: "kgRise .7s cubic-bezier(.2,.8,.2,1) both",
                animationDelay: `${80 + i * 70}ms`,
              }}
            >
              <div style={{ position: "absolute", width: 220, height: 220, borderRadius: "50%", background: p.mid, filter: "blur(40px)", right: -90, top: -100, opacity: 0.9 }} />
              <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start", height: 72 }}>
                <div style={{ position: "relative", width: 140, height: 72 }}>
                  {roleCands.map((c, vi) => (
                    <div
                      key={c.id}
                      style={{
                        position: "absolute",
                        left: vi * 28,
                        top: 0,
                        transform: `rotate(${[-10, 4, 14][vi]}deg)`,
                        borderRadius: 18,
                        border: "2px solid white",
                        boxShadow: "0 12px 22px -10px oklch(0.2 0.03 170 / .5)",
                      }}
                    >
                      <Avatar name={c.name} hue={r.hue} size={58} radius={18} />
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", paddingTop: 6 }}>
                  {BOARD_STAGES.filter((s) => (r.counts[s] ?? 0) > 0)
                    .slice(0, 3)
                    .map((s) => (
                      <div
                        key={s}
                        title={`${r.counts[s]} in ${s}`}
                        style={{
                          position: "relative",
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          marginLeft: -10,
                          background: "oklch(1 0 0 / .6)",
                          border: "1px solid white",
                          display: "grid",
                          placeItems: "center",
                          fontSize: 13,
                          fontWeight: 500,
                        }}
                      >
                        {r.counts[s]}
                        <span style={{ position: "absolute", top: 4, right: 4, width: 7, height: 7, borderRadius: "50%", background: pal(STAGE_HUES[s]).solid }} />
                      </div>
                    ))}
                </div>
              </div>
              <div style={{ position: "relative" }}>
                <div style={{ fontWeight: 300, fontSize: 26, lineHeight: 1.1, letterSpacing: "-0.03em" }}>{r.title}</div>
                <div style={{ fontSize: 14, color: "oklch(0.42 0.02 170)", marginTop: 6 }}>{r.location || "Location not set"}</div>
              </div>
              <div style={{ position: "relative", fontSize: 14, lineHeight: 1.5, color: "oklch(0.36 0.02 170)" }}>{r.description}</div>
              <div style={{ position: "relative", display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, padding: "6px 12px", borderRadius: 999, border: "1px solid oklch(0.28 0.02 170 / .2)" }}>{r.rubricRole}</span>
                {r.seniority && <span style={{ fontSize: 13, padding: "6px 12px", borderRadius: 999, border: "1px solid oklch(0.28 0.02 170 / .2)" }}>{r.seniority}</span>}
              </div>
              <div style={{ position: "relative", display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  onClick={() => router.push(`/roles/${r.id}/upload`)}
                  style={{ padding: "10px 16px", borderRadius: 999, border: "1px solid oklch(0.28 0.02 170 / .2)", background: "oklch(1 0 0 / .5)", cursor: "pointer", fontSize: 14, color: "inherit" }}
                >
                  Add candidates
                </button>
                <button
                  onClick={() => router.push(`/pipeline?role=${r.id}`)}
                  style={{ display: "flex", alignItems: "center", gap: 10, border: "none", cursor: "pointer", padding: "6px 6px 6px 18px", borderRadius: 999, background: "oklch(0.3 0.02 170)", color: "white", fontSize: 14 }}
                >
                  View pipeline
                  <span style={{ width: 30, height: 30, borderRadius: "50%", background: "white", color: "oklch(0.3 0.02 170)", display: "grid", placeItems: "center" }}>→</span>
                </button>
              </div>
            </div>
          );
        })}
        <button
          onClick={() => router.push("/roles/new")}
          style={{
            minHeight: 320,
            borderRadius: 32,
            border: "1.5px dashed oklch(1 0 0 / .45)",
            background: "oklch(1 0 0 / .06)",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            color: "white",
            fontSize: 18,
            fontWeight: 300,
          }}
        >
          <span style={{ width: 56, height: 56, borderRadius: "50%", background: "white", color: "oklch(0.3 0.02 170)", display: "grid", placeItems: "center", fontSize: 22, animation: "kgGlow 3s ease-in-out infinite" }}>
            ✦
          </span>
          Create a role
        </button>
      </div>
    </div>
  );
}
