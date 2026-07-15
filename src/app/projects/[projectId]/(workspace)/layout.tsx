import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/server/auth/require-user";
import { authorizeProject } from "@/server/services/authorization";
import { WorkspaceShell, type WorkspaceChrome } from "@/features/workspace/workspace-shell";

/**
 * Workspace shell layout. Authorizes the project once for the whole section
 * subtree and gates access: an unfinished import is redirected to the live
 * processing view. This route group does NOT wrap `/processing`, which sits
 * outside it and keeps its own full-screen layout.
 */
export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { user, repos } = await requireUser();

  const auth = await authorizeProject(repos, user.id, projectId);
  if (!auth.ok) notFound();
  if (auth.data.status !== "ready") redirect(`/projects/${projectId}/processing`);

  const chrome: WorkspaceChrome = {
    id: auth.data.id,
    title: auth.data.title,
    status: auth.data.status,
    updatedAt: auth.data.updatedAt,
  };

  return <WorkspaceShell project={chrome}>{children}</WorkspaceShell>;
}
