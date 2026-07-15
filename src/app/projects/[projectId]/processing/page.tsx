import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/server/auth/require-user";
import { authorizeProject } from "@/server/services/authorization";
import { ProcessingView } from "@/features/processing/processing-view";
import type { JobSnapshot } from "@/features/processing/types";

export default async function ProcessingPage(props: PageProps<"/projects/[projectId]/processing">) {
  const { projectId } = await props.params;
  const { user, repos } = await requireUser();

  const auth = await authorizeProject(repos, user.id, projectId);
  if (!auth.ok) notFound();

  // Already finished — go straight to the workspace.
  if (auth.data.status === "ready") {
    redirect(`/projects/${projectId}`);
  }

  const job = await repos.jobs.getLatestForProject(projectId);
  const initial: JobSnapshot = { project: auth.data, job };

  return <ProcessingView projectId={projectId} initial={initial} />;
}
