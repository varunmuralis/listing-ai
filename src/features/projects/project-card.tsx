import Link from "next/link";
import { ArrowRight, Trash2 } from "lucide-react";
import type { Project } from "@/types/domain";
import { timeAgo } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { ProjectStatusBadge } from "@/features/projects/project-status";
import { deleteProjectAction } from "@/server/actions/project-actions";

function destinationFor(project: Project): string {
  return project.status === "ready" ? `/projects/${project.id}` : `/projects/${project.id}/processing`;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "listing";
  }
}

export function ProjectCard({ project }: { project: Project }) {
  return (
    <div className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40">
      <form action={deleteProjectAction} className="absolute right-3 top-3">
        <input type="hidden" name="projectId" value={project.id} />
        <button
          type="submit"
          aria-label={`Delete ${project.title}`}
          className="rounded-md p-1.5 text-muted-foreground opacity-0 transition hover:bg-destructive/15 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Trash2 className="size-4" />
        </button>
      </form>

      <div>
        <ProjectStatusBadge status={project.status} />
        <Link
          href={destinationFor(project)}
          className="mt-3 block rounded-md pr-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <h3 className="text-lg font-semibold leading-snug tracking-tight text-foreground">{project.title}</h3>
        </Link>
        <p className="eyebrow mt-2">
          {hostOf(project.sourceUrl)} · {timeAgo(project.createdAt)}
        </p>
      </div>

      {project.status === "processing" ? (
        <div className="mt-4">
          <Progress value={project.progress} />
          <p className="mt-1.5 text-xs text-muted-foreground">{project.progress}% imported</p>
        </div>
      ) : (
        <Link
          href={destinationFor(project)}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          {project.status === "failed" ? "Review error" : "Open workspace"}
          <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  );
}
