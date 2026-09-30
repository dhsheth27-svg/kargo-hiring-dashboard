"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Avatar from "@/components/Avatar";
import { pal, daysAgo, scoreHue } from "@/lib/theme";
import { BOARD_STAGES, STAGE_LABELS, STAGE_HUES, type AnyStage } from "@/lib/types";

interface RoleRow {
  id: string;
  title: string;
  hue: number;
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

export default function PipelineClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<AnyStage | null>(null);

  useEffect(() => {
    const r = searchParams.get("role");
    if (r) setRoleFilter(r);
  }, [searchParams]);

  useEffect(() => {
    load();
  }, []);

  function load() {
    Promise.all([
      fetch("/api/roles").then((r) => r.json()),
      fetch("/api/candidates").then((r) => r.json()),
    ]).then(([rolesData, candData]) => {
      setRoles(rolesData.roles ?? []);
      setCandidates((candData.candidates ?? []).filter((c: CandidateRow) => c.stage !== "declined"));
    });
  }

  const filtered = roleFilter === "all" ? candidates : candidates.filter((c) => c.roleId === roleFilter);

  const columns = useMemo(
    () =>
      BOARD_STAGES.map((s) => ({
        stage: s,
        cards: filtered.filter((c) => c.stage === s),
      })),
    [filtered]
  );

  async function moveTo(id: string, stage: AnyStage) {
    const prev = candidates;
    setCandidates((cs) => cs.map((c) => (c.id === id ? { ...c, stage } : c)));
    const res = await fetch(`/api/candidates/${id}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    if (!res.ok) setCandidates(prev);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <h1 style={{ margin: 0, fontWeight: 300, fontSize: 56, lineHeight: 1, letterSpacing: "-0.045em", color: "white" }}>
          Pipeline.<span style={{ fontSize: 16, fontStyle: "italic", marginLeft: 4, color: "oklch(1 0 0 / .8)" }}>{filtered.length}</span>
        </h1>
        <p style={{ margin: "12px 0 0", color: "oklch(1 0 0 / .85)", fontSize: 16, fontWeight: 300 }}>
          Drag candidates between stages. Click a card for details.
        </p>
      </div>

      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
        <button
          onClick={() => setRoleFilter("all")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 16px",
            borderRadius: 999,
            cursor: "pointer",
            fontSize: 14,
            whiteSpace: "nowrap",
            border: `1px solid ${roleFilter === "all" ? "white" : "oklch(1 0 0 / .3)"}`,
            background: roleFilter === "all" ? "white" : "oklch(1 0 0 / .1)",
            color: roleFilter === "all" ? "oklch(0.28 0.02 170)" : "white",
          }}
        >
          All roles
        </button>
        {roles.map((r) => {
          const active = roleFilter === r.id;
          return (
            <button
              key={r.id}
              onClick={() => setRoleFilter(r.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 16px",
                borderRadius: 999,
                cursor: "pointer",
                fontSize: 14,
                whiteSpace: "nowrap",
                border: `1px solid ${active ? "white" : "oklch(1 0 0 / .3)"}`,
                background: active ? "white" : "oklch(1 0 0 / .1)",
                color: active ? "oklch(0.28 0.02 170)" : "white",
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: pal(r.hue).solid }} />
              {r.title}
            </button>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(236px,1fr))", gap: 12, overflowX: "auto", paddingBottom: 12 }}>
        {columns.map((col, ci) => {
          const isOver = dragOver === col.stage;
          return (
            <div
              key={col.stage}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(col.stage);
              }}
              onDragLeave={() => setDragOver((d) => (d === col.stage ? null : d))}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId) moveTo(dragId, col.stage);
                setDragOver(null);
                setDragId(null);
              }}
              style={{
                animation: "kgRise .6s cubic-bezier(.2,.8,.2,1) both",
                animationDelay: `${ci * 70}ms`,
                transform: isOver ? "scale(1.02)" : "scale(1)",
                borderRadius: 30,
                padding: 12,
                minHeight: 480,
                background: isOver ? "oklch(1 0 0 / .24)" : "oklch(1 0 0 / .12)",
                border: `1px solid ${isOver ? "oklch(1 0 0 / .8)" : "oklch(1 0 0 / .25)"}`,
                backdropFilter: "blur(18px)",
                transition: "background .2s, border-color .2s, transform .25s",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 6px 4px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, color: "white" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: pal(STAGE_HUES[col.stage]).solid }} />
                  {STAGE_LABELS[col.stage]}
                </div>
                <span style={{ fontSize: 12, background: "oklch(1 0 0 / .18)", border: "1px solid oklch(1 0 0 / .35)", color: "white", padding: "2px 9px", borderRadius: 999 }}>
                  {col.cards.length}
                </span>
              </div>

              {col.cards.map((k) => {
                const sh = scoreHue(k.score ?? 0);
                return (
                  <div
                    key={k.id}
                    draggable
                    onDragStart={() => setDragId(k.id)}
                    onDragEnd={() => setDragId(null)}
                    onClick={() => router.push(`/candidates/${k.id}`)}
                    style={{
                      background: "linear-gradient(165deg, oklch(0.96 0.012 150), oklch(0.89 0.025 160))",
                      border: "1px solid oklch(1 0 0 / .85)",
                      borderRadius: 22,
                      padding: 14,
                      cursor: "grab",
                      boxShadow: "0 18px 30px -22px oklch(0.2 0.03 170 / .7), inset 0 1px 0 white",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      opacity: dragId === k.id ? 0.4 : 1,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar name={k.name} hue={k.roleHue} size={38} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k.name}</div>
                        <div style={{ fontSize: 12, color: "oklch(0.42 0.02 170)" }}>{daysAgo(k.createdAt)}d ago</div>
                      </div>
                      {k.score !== null && (
                        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, padding: "4px 9px", borderRadius: 999, background: "oklch(1 0 0 / .7)", border: "1px solid white" }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: pal(sh).solid }} />
                          {k.score}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex" }}>
                      <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 999, border: "1px solid oklch(0.28 0.02 170 / .18)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
                        {k.roleTitle}
                      </span>
                    </div>
                  </div>
                );
              })}
              {col.cards.length === 0 && (
                <div style={{ flex: 1, display: "grid", placeItems: "center", fontSize: 14, fontWeight: 300, color: "oklch(1 0 0 / .75)", padding: 20, textAlign: "center" }}>
                  Drop a candidate here
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
