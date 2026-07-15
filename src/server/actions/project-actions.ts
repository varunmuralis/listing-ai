"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createProjectSchema } from "@/types/schemas";
import { requireUser } from "@/server/auth/require-user";
import { authorizeProject } from "@/server/services/authorization";
import { createProject } from "@/server/services/project-service";
import { ensureProcessing } from "@/server/services/processing-service";
import { type ActionState, errorState } from "@/server/actions/action-state";

export async function createProjectAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, repos } = await requireUser();

  const parsed = createProjectSchema.safeParse({ sourceUrl: formData.get("sourceUrl") });
  if (!parsed.success) {
    return errorState("Please fix the errors below.", z.flattenError(parsed.error).fieldErrors);
  }

  const result = await createProject(repos, user.id, parsed.data.sourceUrl);
  if (!result.ok) {
    return errorState(result.error.message, result.error.fields);
  }

  // Begin processing immediately; the processing page also starts it idempotently.
  await ensureProcessing(repos, result.data.job.id);

  revalidatePath("/dashboard");
  redirect(`/projects/${result.data.project.id}/processing`);
}

export async function deleteProjectAction(formData: FormData): Promise<void> {
  const { user, repos } = await requireUser();
  const projectId = String(formData.get("projectId") ?? "");
  const auth = await authorizeProject(repos, user.id, projectId);
  if (!auth.ok) return;
  await repos.projects.delete(projectId);
  revalidatePath("/dashboard");
}
