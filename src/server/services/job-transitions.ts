import type { JobStatus, ProcessingStep, ProjectStatus } from "@/types/domain";

/**
 * Pure job/project state-machine rules. No I/O — safe to unit test and to reuse
 * from both the memory and Supabase paths.
 */

const ALLOWED_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  pending: ["running", "cancelled"],
  running: ["running", "succeeded", "failed", "cancelled"],
  failed: ["running"], // retry
  cancelled: ["running"], // retry
  succeeded: [], // terminal
};

export function canTransition(from: JobStatus, to: JobStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isTerminal(status: JobStatus): boolean {
  return status === "succeeded" || status === "failed" || status === "cancelled";
}

/** Progress percentage set when a step begins. */
const STEP_START_PROGRESS: Record<ProcessingStep, number> = {
  validating_url: 5,
  retrieving_data: 20,
  importing_photos: 45,
  classifying_rooms: 70,
  building_context: 85,
  preparing_experience: 95,
};

export function progressForStep(step: ProcessingStep): number {
  return STEP_START_PROGRESS[step];
}

/** Derive the project's status from its latest job. */
export function projectStatusForJob(status: JobStatus): ProjectStatus {
  switch (status) {
    case "succeeded":
      return "ready";
    case "failed":
      return "failed";
    case "cancelled":
      return "draft";
    case "pending":
    case "running":
    default:
      return "processing";
  }
}
