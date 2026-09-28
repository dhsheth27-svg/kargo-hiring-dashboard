"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type Stage = "queued" | "uploading" | "done" | "error";

interface FileJob {
  file: File;
  stage: Stage;
  error?: string;
  candidateId?: string;
}

const STAGE_LABEL: Record<Stage, string> = {
  queued: "Queued",
  uploading: "Extracting → scoring → briefing → drafting…",
  done: "Done",
  error: "Failed",
};

export default function UploadClient() {
  const router = useRouter();
  const [role, setRole] = useState<"PM" | "SPM">("PM");
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
      setJobs((prev) =>
        prev.map((j, idx) => (idx === i ? { ...j, stage: "uploading" } : j))
      );
      try {
        const formData = new FormData();
        formData.append("file", jobs[i].file);
        formData.append("appliedRole", role);
        const res = await fetch("/api/candidates", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Upload failed.");
        setJobs((prev) =>
          prev.map((j, idx) =>
            idx === i ? { ...j, stage: "done", candidateId: data.id } : j
          )
        );
      } catch (err) {
        setJobs((prev) =>
          prev.map((j, idx) =>
            idx === i
              ? {
                  ...j,
                  stage: "error",
                  error: err instanceof Error ? err.message : "Unknown error",
                }
              : j
          )
        );
      }
    }
    setRunning(false);
  }

  const allDone = jobs.length > 0 && jobs.every((j) => j.stage === "done" || j.stage === "error");

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-semibold mb-1">Upload candidates</h1>
      <p className="text-neutral-400 mb-8 text-sm">
        Upload one CV or a batch. Each one runs the full pipeline automatically —
        extraction, scoring against both rubrics, brief generation for
        shortlist candidates, and a draft email. Nothing is sent until you
        confirm it on the dashboard.
      </p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Applied role</label>
          <div className="flex gap-2">
            {(["PM", "SPM"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                disabled={running}
                className={`px-4 py-2 rounded-md text-sm border ${
                  role === r
                    ? "bg-neutral-100 text-neutral-900 border-neutral-100"
                    : "border-neutral-700 text-neutral-300 hover:border-neutral-500"
                }`}
              >
                {r === "PM" ? "Product Manager" : "Senior Product Manager"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">CV file(s)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md"
            multiple
            disabled={running}
            onChange={(e) => onFilesSelected(e.target.files)}
            className="block w-full text-sm text-neutral-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-neutral-800 file:text-neutral-100 hover:file:bg-neutral-700"
          />
          <p className="text-xs text-neutral-500 mt-1">
            All applicants are applying for the same role selected above — run
            separately for a different role's batch.
          </p>
        </div>

        {jobs.length > 0 && (
          <div className="border border-neutral-800 rounded-md divide-y divide-neutral-800">
            {jobs.map((job, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="truncate max-w-xs">{job.file.name}</span>
                <span
                  className={
                    job.stage === "error"
                      ? "text-red-400"
                      : job.stage === "done"
                      ? "text-green-400"
                      : "text-neutral-400"
                  }
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
            className="px-5 py-2.5 rounded-md bg-neutral-100 text-neutral-900 text-sm font-medium disabled:opacity-40"
          >
            {running ? "Running pipeline…" : `Run pipeline (${jobs.length || 0})`}
          </button>
          {allDone && (
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="px-5 py-2.5 rounded-md border border-neutral-700 text-sm font-medium"
            >
              View dashboard →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
