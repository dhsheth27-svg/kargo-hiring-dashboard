"use client";

import { useState, useRef } from "react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const acceptedTypes = ".pdf,.txt,.md";

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-semibold mb-1">Add candidates</h1>
      <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>
        Upload one CV or a batch. Each one is automatically extracted, scored against the role&apos;s rubric,
        and — if it makes the current shortlist — gets an interview brief and a draft email ready for your
        review. Nothing is ever sent without your explicit confirmation.
      </p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">CV files</label>
          <div className="card border-dashed p-4">
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedTypes}
              multiple
              disabled={running}
              onChange={(e) => onFilesSelected(e.target.files)}
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-medium file:cursor-pointer"
              style={{ color: "var(--foreground)" }}
            />
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
            Accepted: PDF, TXT, MD.
          </p>
        </div>

        {jobs.length > 0 && (
          <div className="card divide-y" style={{ borderColor: "var(--border)" }}>
            {jobs.map((job, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="truncate max-w-xs">{job.file.name}</span>
                <span
                  style={{
                    color:
                      job.stage === "error"
                        ? "var(--status-declined)"
                        : job.stage === "done"
                        ? "var(--status-shortlisted)"
                        : "var(--muted)",
                  }}
                >
                  {job.error ?? STAGE_LABEL[job.stage]}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={runPipeline}
            disabled={running || jobs.length === 0 || allDone}
            className="btn-primary px-5 py-2.5 rounded-lg text-sm font-medium"
          >
            {running ? "Running…" : `Run pipeline (${jobs.length || 0})`}
          </button>
          {allDone && (
            <button
              type="button"
              onClick={() => router.push(`/roles/${roleId}`)}
              className="btn-secondary px-5 py-2.5 rounded-lg text-sm font-medium"
            >
              View role workspace →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
