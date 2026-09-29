"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

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

const STAGE_DOT: Record<Stage, string> = {
  queued: "bg-neutral-600",
  uploading: "bg-[var(--accent-cyan)]",
  done: "bg-[var(--accent-emerald)]",
  error: "bg-[var(--accent-rose)]",
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
    <div className="max-w-2xl mx-auto px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold mb-2 gradient-text">Upload candidates</h1>
        <p className="text-neutral-400 mb-10 text-sm leading-relaxed">
          Upload one CV or a batch. Each one runs the full pipeline automatically —
          extraction, scoring against both rubrics, brief generation for
          shortlist candidates, and a draft email. Nothing is sent until
          you confirm it on the dashboard.
        </p>
      </motion.div>

      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
        >
          <label className="block text-sm font-medium mb-3 text-neutral-300">Applied role</label>
          <div className="flex gap-3">
            {(["PM", "SPM"] as const).map((r) => {
              const active = role === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  disabled={running}
                  className={`relative px-5 py-2.5 rounded-xl text-sm font-medium transition-all overflow-hidden ${
                    active
                      ? "text-white glow-violet scale-[1.02]"
                      : "text-neutral-300 glass-card hover:border-white/20"
                  }`}
                  style={
                    active
                      ? {
                          background:
                            "linear-gradient(135deg, var(--accent-violet), var(--accent-fuchsia))",
                        }
                      : undefined
                  }
                >
                  {r === "PM" ? "Product Manager" : "Senior Product Manager"}
                </button>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <label className="block text-sm font-medium mb-3 text-neutral-300">CV file(s)</label>
          <div className="glass-card rounded-xl p-4 border-dashed border-2 border-white/10 hover:border-[var(--accent-violet)]/50 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md"
              multiple
              disabled={running}
              onChange={(e) => onFilesSelected(e.target.files)}
              className="block w-full text-sm text-neutral-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-medium file:cursor-pointer file:text-white"
              style={{
                colorScheme: "dark",
              }}
            />
          </div>
          <p className="text-xs text-neutral-500 mt-2">
            All applicants are applying for the same role selected above — run
            separately for a different role&apos;s batch.
          </p>
        </motion.div>

        <AnimatePresence>
          {jobs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-card rounded-xl overflow-hidden divide-y divide-white/5"
            >
              {jobs.map((job, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center justify-between px-4 py-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-2 w-2 rounded-full ${STAGE_DOT[job.stage]} ${
                        job.stage === "uploading" ? "animate-pulse" : ""
                      }`}
                    />
                    <span className="truncate max-w-xs">{job.file.name}</span>
                  </div>
                  <span
                    className={
                      job.stage === "error"
                        ? "text-[var(--accent-rose)]"
                        : job.stage === "done"
                        ? "text-[var(--accent-emerald)]"
                        : "text-neutral-400"
                    }
                  >
                    {job.error ?? STAGE_LABEL[job.stage]}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-3">
          <motion.button
            type="button"
            onClick={runPipeline}
            disabled={running || jobs.length === 0 || allDone}
            whileHover={!running && jobs.length > 0 && !allDone ? { scale: 1.02 } : {}}
            whileTap={!running && jobs.length > 0 && !allDone ? { scale: 0.98 } : {}}
            className="px-6 py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, var(--accent-violet), var(--accent-fuchsia), var(--accent-cyan))",
              backgroundSize: "200% auto",
            }}
          >
            {running ? "Running pipeline…" : `Run pipeline (${jobs.length || 0})`}
          </motion.button>
          <AnimatePresence>
            {allDone && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                type="button"
                onClick={() => router.push("/dashboard")}
                className="px-6 py-3 rounded-xl glass-card text-sm font-medium hover:border-white/20 transition-colors"
              >
                View dashboard →
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
