"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Stage = "queued" | "uploading" | "done" | "error";

interface FileJob {
  file: File;
  stage: Stage;
  error?: string;
}

const STAGE_LABEL: Record<Stage, string> = {
  queued: "Queued",
  uploading: "Extracting → scoring → generating brief & draft…",
  done: "Done",
  error: "Failed",
};

export default function UploadClient({ roleId }: { roleId: string }) {
  const router = useRouter();
  const [jobs, setJobs] = useState<FileJob[]>([]);
  const [running, setRunning] = useState(false);

  function onFilesSelected(files: FileList | null) {
    if (!files) return;
    setJobs(Array.from(files).map((file) => ({ file, stage: "queued" })));
  }

  async function runPipeline() {
    setRunning(true);
    for (let i = 0; i < jobs.length; i++) {
      setJobs((prev) => prev.map((j, idx) => (idx === i ? { ...j, stage: "uploading" } : j)));
      try {
        const formData = new FormData();
        formData.append("file", jobs[i].file);
        formData.append("roleId", roleId);
        const res = await fetch("/api/candidates", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Upload failed.");
        setJobs((prev) => prev.map((j, idx) => (idx === i ? { ...j, stage: "done" } : j)));
      } catch (err) {
        setJobs((prev) =>
          prev.map((j, idx) =>
            idx === i
              ? { ...j, stage: "error", error: err instanceof Error ? err.message : "Unknown error" }
              : j
          )
        );
      }
    }
    setRunning(false);
  }

  const allDone = jobs.length > 0 && jobs.every((j) => j.stage === "done" || j.stage === "error");

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <h1 style={{ margin: 0, fontWeight: 300, fontSize: 44, letterSpacing: "-0.03em", color: "white" }}>Add candidates.</h1>
      <p style={{ margin: "12px 0 28px", color: "oklch(1 0 0 / .85)", fontSize: 15, fontWeight: 300, lineHeight: 1.5 }}>
        Upload one CV or a batch. Each one is extracted, scored against the role&apos;s rubric, and — if it
        makes the current shortlist — gets an interview brief and a draft email ready for your review.
        Nothing is ever sent without your explicit confirmation.
      </p>

      <div className="mist-panel" style={{ padding: 20, marginBottom: 20 }}>
        <input
          type="file"
          accept=".pdf,.txt,.md"
          multiple
          disabled={running}
          onChange={(e) => onFilesSelected(e.target.files)}
          style={{ width: "100%", fontSize: 14, color: "inherit" }}
        />
        <p style={{ fontSize: 12, color: "oklch(0.42 0.02 170)", marginTop: 10, marginBottom: 0 }}>Accepted: PDF, TXT, MD.</p>
      </div>

      {jobs.length > 0 && (
        <div className="mist-panel" style={{ marginBottom: 20, overflow: "hidden" }}>
          {jobs.map((job, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "12px 18px",
                fontSize: 14,
                borderTop: i > 0 ? "1px solid oklch(1 0 0 / .5)" : "none",
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 300 }}>{job.file.name}</span>
              <span
                style={{
                  color:
                    job.stage === "error"
                      ? "oklch(0.5 0.1 10)"
                      : job.stage === "done"
                      ? "oklch(0.45 0.1 150)"
                      : "oklch(0.42 0.02 170)",
                }}
              >
                {job.error ?? STAGE_LABEL[job.stage]}
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={runPipeline}
          disabled={running || jobs.length === 0 || allDone}
          style={{
            padding: "12px 22px",
            borderRadius: 999,
            border: "none",
            background: "oklch(0.3 0.02 170)",
            color: "white",
            cursor: "pointer",
            fontSize: 15,
            opacity: running || jobs.length === 0 || allDone ? 0.5 : 1,
          }}
        >
          {running ? "Running…" : `Run pipeline (${jobs.length || 0})`}
        </button>
        {allDone && (
          <button
            onClick={() => router.push(`/pipeline?role=${roleId}`)}
            style={{ padding: "12px 22px", borderRadius: 999, border: "1px solid oklch(1 0 0 / .35)", background: "oklch(1 0 0 / .1)", color: "white", cursor: "pointer", fontSize: 15 }}
          >
            View pipeline →
          </button>
        )}
      </div>
    </div>
  );
}
