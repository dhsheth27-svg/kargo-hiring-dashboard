"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { pal } from "@/lib/theme";

interface ActivityRow {
  id: string;
  message: string;
  createdAt: string;
  candidateId: string;
  candidateName: string;
  roleTitle: string;
  roleHue: number;
}

export default function ActivityClient() {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityRow[]>([]);

  useEffect(() => {
    fetch("/api/activity")
      .then((r) => r.json())
      .then((d) => setActivities(d.activities ?? []));
  }, []);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 24, maxWidth: 780 }}>
      <div>
        <h1 style={{ margin: 0, fontWeight: 300, fontSize: 56, lineHeight: 1, letterSpacing: "-0.045em", color: "white" }}>
          Recent activity.
        </h1>
        <p style={{ margin: "12px 0 0", color: "oklch(1 0 0 / .85)", fontSize: 16, fontWeight: 300 }}>
          Everything that moved across your roles.
        </p>
      </div>
      <div style={{ position: "relative", paddingLeft: 30 }}>
        <div style={{ position: "absolute", left: 10, top: 10, bottom: 10, width: 1, background: "oklch(1 0 0 / .35)" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {activities.map((e, i) => (
            <div
              key={e.id}
              onClick={() => router.push(`/candidates/${e.candidateId}`)}
              className="mist-panel"
              style={{
                position: "relative",
                padding: "16px 20px",
                display: "flex",
                gap: 14,
                alignItems: "center",
                cursor: "pointer",
                animation: "kgSlide .55s cubic-bezier(.2,.8,.2,1) both",
                animationDelay: `${i * 60}ms`,
              }}
            >
              <div style={{ position: "absolute", left: -26, top: "50%", marginTop: -7, width: 14, height: 14, borderRadius: "50%", background: pal(e.roleHue).solid, border: "2px solid white" }} />
              <div style={{ flex: 1, fontSize: 15, lineHeight: 1.4 }}>
                {e.message}{" "}
                <span style={{ color: "oklch(0.42 0.02 170)" }}>
                  · {e.candidateName} · {e.roleTitle}
                </span>
              </div>
              <span style={{ fontSize: 13, color: "oklch(0.42 0.02 170)", whiteSpace: "nowrap" }}>
                {new Date(e.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
          {activities.length === 0 && <p style={{ color: "oklch(1 0 0 / .8)" }}>Nothing yet.</p>}
        </div>
      </div>
    </div>
  );
}
