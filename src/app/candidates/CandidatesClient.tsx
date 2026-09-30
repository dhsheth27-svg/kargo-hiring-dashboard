"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import StagePill from "@/components/StagePill";
import { pal, daysAgo, scoreHue } from "@/lib/theme";
import type { AnyStage } from "@/lib/types";

interface CandidateRow {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleTitle: string;
  roleHue: number;
  stage: AnyStage;
  score: number | null;
  createdAt: string;
}

type Sort = "score" | "recent" | "az";

export default function CandidatesClient() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("score");

  useEffect(() => {
    fetch("/api/candidates")
      .then((r) => r.json())
      .then((d) => setCandidates(d.candidates ?? []));
  }, []);

  const filtered = useMemo(() => {
    let list = candidates;
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((c) => c.name.toLowerCase().includes(q) || c.roleTitle.toLowerCase().includes(q));
    list = [...list].sort((a, b) => {
      if (sort === "score") return (b.score ?? -1) - (a.score ?? -1);
      if (sort === "az") return a.name.localeCompare(b.name);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return list;
  }, [candidates, search, sort]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontWeight: 300, fontSize: 56, lineHeight: 1, letterSpacing: "-0.045em", color: "white" }}>
            Candidates.<span style={{ fontSize: 16, fontStyle: "italic", marginLeft: 4, color: "oklch(1 0 0 / .8)" }}>{candidates.length}</span>
          </h1>
          <p style={{ margin: "12px 0 0", color: "oklch(1 0 0 / .85)", fontSize: 16, fontWeight: 300 }}>Everyone who has applied, across every role.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or role"
            style={{
              padding: "12px 18px",
              borderRadius: 999,
              border: "1px solid oklch(1 0 0 / .35)",
              background: "oklch(1 0 0 / .12)",
              backdropFilter: "blur(16px)",
              color: "white",
              fontSize: 14,
              width: 250,
              outline: "none",
            }}
          />
          <div style={{ display: "flex", padding: 4, borderRadius: 999, background: "oklch(1 0 0 / .12)", border: "1px solid oklch(1 0 0 / .25)" }}>
            {([
              { k: "score", label: "Top score" },
              { k: "recent", label: "Recent" },
              { k: "az", label: "A–Z" },
            ] as const).map((o) => {
              const active = sort === o.k;
              return (
                <button
                  key={o.k}
                  onClick={() => setSort(o.k)}
                  style={{
                    border: "none",
                    cursor: "pointer",
                    padding: "8px 15px",
                    borderRadius: 999,
                    fontSize: 13,
                    background: active ? "white" : "transparent",
                    color: active ? "oklch(0.28 0.02 170)" : "white",
                  }}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mist-panel" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(210px,2fr) minmax(160px,1.4fr) 130px minmax(120px,1fr) 80px",
              gap: 16,
              padding: "18px 24px 12px",
              fontSize: 12,
              color: "oklch(0.42 0.02 170)",
              minWidth: 780,
            }}
          >
            <div>Candidate</div>
            <div>Role</div>
            <div>Stage</div>
            <div>Score</div>
            <div style={{ textAlign: "right" }}>Applied</div>
          </div>
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => router.push(`/candidates/${c.id}`)}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(210px,2fr) minmax(160px,1.4fr) 130px minmax(120px,1fr) 80px",
                gap: 16,
                padding: "12px 24px",
                alignItems: "center",
                cursor: "pointer",
                borderTop: "1px solid oklch(1 0 0 / .7)",
                minWidth: 780,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <Avatar name={c.name} hue={c.roleHue} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 15 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: "oklch(0.42 0.02 170)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.email}</div>
                </div>
              </div>
              <div style={{ fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.roleTitle}</div>
              <div>
                <StagePill stage={c.stage} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, height: 6, borderRadius: 999, background: "oklch(1 0 0 / .7)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${c.score ?? 0}%`, background: pal(scoreHue(c.score ?? 0)).solid, borderRadius: 999 }} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 300, width: 24 }}>{c.score ?? "—"}</span>
              </div>
              <div style={{ textAlign: "right", fontSize: 13, color: "oklch(0.42 0.02 170)" }}>{daysAgo(c.createdAt)}d ago</div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 48, textAlign: "center", color: "oklch(0.42 0.02 170)" }}>
              {candidates.length === 0 ? "No candidates yet." : `No candidates match "${search}".`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
