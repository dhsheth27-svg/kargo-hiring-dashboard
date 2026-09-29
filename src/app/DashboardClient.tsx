"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { REVIEW_STATUSES, REVIEW_STATUS_LABELS, type ReviewStatus } from "@/lib/types";

interface RoleRow {
  id: string;
  title: string;
  location: string | null;
  seniority: string | null;
  rubricRole: string;
  status: string;
  createdAt: string;
  totalCandidates: number;
  counts: Record<ReviewStatus, number>;
}

interface ActivityRow {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  candidateId: string;
  candidateName: string;
  roleId: string;
  roleTitle: string;
}

export default function DashboardClient() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [rolesRes, activityRes] = await Promise.all([
      fetch("/api/roles"),
      fetch("/api/activity"),
    ]);
    const rolesData = await rolesRes.json();
    const activityData = await activityRes.json();
    setRoles(rolesData.roles ?? []);
    setActivity(activityData.activities ?? []);
    setLoading(false);
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Open roles, pipeline health, and what needs your attention.
          </p>
        </div>
        <Link href="/roles/new" className="btn-primary px-4 py-2.5 rounded-lg text-sm font-medium">
          + New role
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--muted)" }}>
            Open roles
          </h2>

          {loading && (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className="h-28 rounded-xl shimmer" />
              ))}
            </div>
          )}

          {!loading && roles.length === 0 && (
            <div className="card p-8 text-center">
              <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
                No roles yet. Create one to start screening candidates.
              </p>
              <Link href="/roles/new" className="btn-primary px-4 py-2.5 rounded-lg text-sm font-medium inline-block">
                Create your first role
              </Link>
            </div>
          )}

          <div className="space-y-3">
            {roles.map((role) => (
              <Link
                key={role.id}
                href={`/roles/${role.id}`}
                className="card block p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{role.title}</h3>
                    <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                      {[role.seniority, role.location].filter(Boolean).join(" · ") || "No location set"}
                      {" · "}
                      {role.totalCandidates} candidate{role.totalCandidates === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span
                    className="text-xs px-2 py-1 rounded-full font-medium shrink-0"
                    style={{ background: "var(--surface-muted)", color: "var(--muted)" }}
                  >
                    {role.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {REVIEW_STATUSES.map((s) => (
                    <span
                      key={s}
                      className="text-xs px-2 py-1 rounded-md"
                      style={{ background: "var(--surface-muted)" }}
                    >
                      {REVIEW_STATUS_LABELS[s]}: <strong>{role.counts[s] ?? 0}</strong>
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--muted)" }}>
            Recent activity
          </h2>
          <div className="card divide-y" style={{ borderColor: "var(--border)" }}>
            {activity.length === 0 && (
              <p className="p-4 text-sm" style={{ color: "var(--muted)" }}>
                Nothing yet.
              </p>
            )}
            {activity.map((a) => (
              <Link
                key={a.id}
                href={`/candidates/${a.candidateId}`}
                className="block p-3.5 text-sm hover:bg-[var(--surface-muted)] transition-colors"
              >
                <p>
                  <span className="font-medium">{a.candidateName}</span>{" "}
                  <span style={{ color: "var(--muted)" }}>· {a.roleTitle}</span>
                </p>
                <p className="mt-0.5" style={{ color: "var(--muted)" }}>
                  {a.message}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                  {new Date(a.createdAt).toLocaleString()}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
