"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Ban, CircleCheck, LoaderCircle, RotateCcw, TriangleAlert } from "lucide-react";
import {
  PROCESSING_STEPS,
  PROCESSING_STEP_LABELS,
  type JobStatus,
  type ProcessingJob,
  type ProcessingStep,
} from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BrandMark } from "@/components/brand";
import { useJobStatus } from "@/features/processing/use-job-status";
import type { JobSnapshot } from "@/features/processing/types";

type StepState = "done" | "active" | "pending" | "failed";

function stepState(step: ProcessingStep, job: ProcessingJob | null): StepState {
  if (!job) return "pending";
  const index = PROCESSING_STEPS.indexOf(step);
  const currentIndex = job.currentStep ? PROCESSING_STEPS.indexOf(job.currentStep) : -1;
  if (job.status === "succeeded") return "done";
  if (job.status === "failed") {
    if (currentIndex === index) return "failed";
    return currentIndex > index || currentIndex === -1 ? "done" : index < currentIndex ? "done" : "pending";
  }
  if (currentIndex === -1) return "pending";
  if (index < currentIndex) return "done";
  if (index === currentIndex) return "active";
  return "pending";
}

const STATUS_HEADLINE: Record<JobStatus, string> = {
  pending: "Preparing to import…",
  running: "Building your workspace",
  succeeded: "Workspace ready",
  failed: "Import failed",
  cancelled: "Import cancelled",
};

export function ProcessingView({ projectId, initial }: { projectId: string; initial: JobSnapshot }) {
  const router = useRouter();
  const { job, project, isTerminal, retry, cancel, isMutating } = useJobStatus(projectId, initial);

  const status: JobStatus = job?.status ?? "pending";
  const progress = job?.progress ?? project?.progress ?? 0;
  const title = project?.title ?? "Listing";

  // Auto-enter the workspace shortly after success.
  React.useEffect(() => {
    if (status === "succeeded") {
      const t = setTimeout(() => router.push(`/projects/${projectId}`), 1100);
      return () => clearTimeout(t);
    }
  }, [status, projectId, router]);

  const currentLabel = job?.currentStep ? PROCESSING_STEP_LABELS[job.currentStep] : STATUS_HEADLINE[status];

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4 py-12 sm:px-6">
      <div className="mb-8 flex justify-center">
        <BrandMark />
      </div>

      <div className="panel rounded-xl p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">{STATUS_HEADLINE[status]}</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">{title}</h1>
          </div>
          <StatusGlyph status={status} />
        </div>

        <div className="mt-6">
          <Progress value={progress} />
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span aria-live="polite" aria-atomic="true">
              {status === "failed" ? "Stopped" : currentLabel}
            </span>
            <span className="font-mono">{progress}%</span>
          </div>
        </div>

        <ol className="mt-6 space-y-1">
          {PROCESSING_STEPS.map((step) => {
            const state = stepState(step, job);
            return (
              <li key={step} className="flex items-center gap-3 rounded-lg px-2 py-2">
                <StepIcon state={state} />
                <span
                  className={
                    state === "pending"
                      ? "text-sm text-muted-foreground"
                      : state === "failed"
                        ? "text-sm font-medium text-destructive"
                        : "text-sm text-foreground"
                  }
                >
                  {PROCESSING_STEP_LABELS[step]}
                </span>
                {state === "active" ? (
                  <motion.span
                    layout
                    className="ml-auto text-xs text-primary"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    In progress
                  </motion.span>
                ) : null}
              </li>
            );
          })}
        </ol>

        {status === "failed" ? (
          <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-destructive">
              <TriangleAlert className="size-4" /> Something went wrong
            </p>
            <p className="mt-1 text-sm text-destructive/90">
              {job?.errorMessage ?? project?.errorMessage ?? "The import could not be completed."}
            </p>
            <div className="mt-4 flex gap-2">
              <Button size="sm" onClick={retry} disabled={isMutating}>
                {isMutating ? <LoaderCircle className="animate-spin" /> : <RotateCcw className="size-4" />}
                Retry import
              </Button>
              <Button size="sm" variant="outline" onClick={() => router.push("/dashboard")}>
                Back to dashboard
              </Button>
            </div>
          </div>
        ) : null}

        {status === "succeeded" ? (
          <div className="mt-6 flex justify-end">
            <Button onClick={() => router.push(`/projects/${projectId}`)}>
              Enter workspace <ArrowRight className="size-4" />
            </Button>
          </div>
        ) : null}

        {(status === "running" || status === "pending") && !isTerminal ? (
          <div className="mt-6 flex justify-end">
            <Button variant="ghost" size="sm" onClick={cancel} disabled={isMutating}>
              <Ban className="size-4" /> Cancel
            </Button>
          </div>
        ) : null}

        {status === "cancelled" ? (
          <div className="mt-6 flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">Import cancelled.</p>
            <Button size="sm" onClick={retry} disabled={isMutating}>
              <RotateCcw className="size-4" /> Restart
            </Button>
          </div>
        ) : null}
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Progress reflects the persisted processing job — refresh anytime, it won&apos;t restart.
      </p>
    </main>
  );
}

function StatusGlyph({ status }: { status: JobStatus }) {
  if (status === "succeeded")
    return <CircleCheck className="size-7 text-[color:var(--success)]" />;
  if (status === "failed") return <TriangleAlert className="size-7 text-destructive" />;
  if (status === "cancelled") return <Ban className="size-7 text-muted-foreground" />;
  return <LoaderCircle className="size-7 animate-spin text-primary" />;
}

function StepIcon({ state }: { state: StepState }) {
  if (state === "done") return <CircleCheck className="size-5 text-[color:var(--success)]" />;
  if (state === "failed") return <TriangleAlert className="size-5 text-destructive" />;
  if (state === "active") return <LoaderCircle className="size-5 animate-spin text-primary" />;
  return <span className="size-5 rounded-full border border-border" />;
}
