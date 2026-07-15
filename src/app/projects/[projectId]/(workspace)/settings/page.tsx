import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requireUser } from "@/server/auth/require-user";
import { getWorkspace } from "@/server/services/project-service";
import { isSupabaseConfigured, serverEnv } from "@/lib/env/server";
import { timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ProjectStatusBadge } from "@/features/projects/project-status";
import { ProjectTitleForm } from "@/features/workspace/project-title-form";
import { DeleteProjectDialog } from "@/features/workspace/delete-project-dialog";

export default async function SettingsPage(props: PageProps<"/projects/[projectId]/settings">) {
  const { projectId } = await props.params;
  const { user, repos } = await requireUser();

  const workspace = await getWorkspace(repos, user.id, projectId);
  if (!workspace.ok) notFound();
  const { project, images } = workspace.data;

  const providerRows: Array<{ label: string; value: string }> = [
    { label: "Persistence", value: isSupabaseConfigured ? "Supabase" : "In-memory (development)" },
    { label: "Listing provider", value: serverEnv.LISTING_PROVIDER },
    { label: "Room classifier", value: serverEnv.ROOM_CLASSIFIER },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="eyebrow">Settings</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">Project settings</h2>
      </header>

      <section className="rounded-xl border border-border bg-card p-5">
        <ProjectTitleForm projectId={project.id} initialTitle={project.title} />
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold">Source</h3>
        <a
          href={project.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex max-w-full items-center gap-1.5 truncate font-mono text-xs text-primary hover:underline"
        >
          <ExternalLink className="size-3.5 shrink-0" />
          {project.sourceUrl}
        </a>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold">Project metadata</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <ProjectStatusBadge status={project.status} />
            </dd>
          </div>
          <MetaRow label="Photos imported" value={String(images.length)} />
          <MetaRow label="Created" value={timeAgo(project.createdAt)} />
          <MetaRow label="Last updated" value={timeAgo(project.updatedAt)} />
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">Project ID</dt>
            <dd className="truncate font-mono text-xs">{project.id}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold">Provider mode</h3>
        <div className="flex flex-wrap gap-2">
          {providerRows.map((row) => (
            <Badge key={row.label} variant="outline">
              {row.label}: {row.value}
            </Badge>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
        <h3 className="text-sm font-semibold text-destructive">Danger zone</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Deleting a project removes it and all of its imported data permanently.
        </p>
        <div className="mt-4">
          <DeleteProjectDialog projectId={project.id} projectTitle={project.title} />
        </div>
      </section>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
