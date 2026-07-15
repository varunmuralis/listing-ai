import type { Project } from "@/types/domain";
import { err, ok, type Result } from "@/types/result";
import type { Repositories } from "@/server/repositories/types";

/**
 * Central project authorization. Every project read/mutation funnels through
 * `authorizeProject` so ownership is verified server-side. Owner identifiers are
 * never accepted from the browser — they come from the authenticated session.
 */
export async function authorizeProject(
  repos: Repositories,
  userId: string,
  projectId: string,
): Promise<Result<Project>> {
  const project = await repos.projects.getById(projectId);
  if (!project) {
    return err("not_found", "That project doesn't exist.");
  }
  if (project.ownerId !== userId) {
    // Do not leak existence to non-owners.
    return err("not_found", "That project doesn't exist.");
  }
  return ok(project);
}
