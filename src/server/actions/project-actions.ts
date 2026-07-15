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

  let projectId: string;
  try {
    const result = await createProject(repos, user.id, parsed.data.sourceUrl);
    if (!result.ok) {
      return errorState(result.error.message, result.error.fields);
    }
    // Begin processing immediately; the processing page also starts it idempotently.
    await ensureProcessing(repos, result.data.job.id);
    projectId = result.data.project.id;
  } catch (error) {
    console.error("createProjectAction failed:", error);
    return errorState("We couldn't start the import. Please try again.");
  }

  revalidatePath("/dashboard");
  // `redirect` throws a control-flow signal — must stay outside the try/catch.
  redirect(`/projects/${projectId}/processing`);
}

export interface TitleActionState {
  ok: boolean;
  error?: string;
}

/** Update only the project title (used by the Settings section). */
export async function updateProjectTitleAction(projectId: string, title: string): Promise<TitleActionState> {
  const { user, repos } = await requireUser();
  const parsed = z.string().trim().min(1).max(200).safeParse(title);
  if (!parsed.success) {
    return { ok: false, error: "Enter a title between 1 and 200 characters." };
  }
  try {
    const auth = await authorizeProject(repos, user.id, projectId);
    if (!auth.ok) return { ok: false, error: auth.error.message };
    await repos.projects.update(projectId, { title: parsed.data });
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/settings`);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    console.error("updateProjectTitleAction failed:", error);
    return { ok: false, error: "We couldn't update the title. Please try again." };
  }
}

export async function deleteProjectAction(formData: FormData): Promise<void> {
  const { user, repos } = await requireUser();
  const projectId = String(formData.get("projectId") ?? "");
  const redirectTo = formData.get("redirectTo");
  if (!projectId) return;

  let deleted = false;
  try {
    const auth = await authorizeProject(repos, user.id, projectId);
    if (!auth.ok) return;
    await repos.projects.delete(projectId);
    revalidatePath("/dashboard");
    deleted = true;
  } catch (error) {
    console.error("deleteProjectAction failed:", error);
    return;
  }

  // Settings deletion passes a redirect target; the dashboard card omits it.
  // `redirect` throws a control-flow signal — keep it outside the try/catch.
  if (deleted && typeof redirectTo === "string" && redirectTo) {
    redirect(redirectTo);
  }
}
