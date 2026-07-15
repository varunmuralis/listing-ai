import "server-only";
import type { ProcessingJob, Project, ProjectWorkspace } from "@/types/domain";
import { err, ok, type Result } from "@/types/result";
import { validateListingUrl } from "@/lib/validation/listing-url";
import type { Repositories } from "@/server/repositories/types";
import { authorizeProject } from "@/server/services/authorization";

export async function listProjects(repos: Repositories, userId: string): Promise<Project[]> {
  return repos.projects.listByOwner(userId);
}

export interface CreatedProject {
  project: Project;
  job: ProcessingJob;
}

/** Create a project + its ingestion job. Owner comes from the session, never the client. */
export async function createProject(
  repos: Repositories,
  userId: string,
  sourceUrl: string,
): Promise<Result<CreatedProject>> {
  const validation = validateListingUrl(sourceUrl);
  if (!validation.valid || !validation.normalized) {
    return err("validation_error", validation.error ?? "Invalid listing URL.", {
      sourceUrl: [validation.error ?? "Invalid listing URL."],
    });
  }

  const project = await repos.projects.create({
    ownerId: userId,
    sourceUrl: validation.normalized,
    title: "Importing listing…",
  });
  const job = await repos.jobs.create({
    projectId: project.id,
    type: "ingest_listing",
    payload: { sourceUrl: validation.normalized, zpid: validation.zpid },
  });

  return ok({ project, job });
}

/** Load the authorized workspace aggregate (project + property + images). */
export async function getWorkspace(
  repos: Repositories,
  userId: string,
  projectId: string,
): Promise<Result<ProjectWorkspace>> {
  const auth = await authorizeProject(repos, userId, projectId);
  if (!auth.ok) return auth;
  const [property, images] = await Promise.all([
    repos.properties.getByProjectId(projectId),
    repos.images.listByProjectId(projectId),
  ]);
  return ok({ project: auth.data, property, images });
}
