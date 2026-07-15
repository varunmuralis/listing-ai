import type { ProcessingJob, Project } from "@/types/domain";

export interface JobSnapshot {
  project: Project | null;
  job: ProcessingJob | null;
}

export type JobAction = "start" | "retry" | "cancel";
