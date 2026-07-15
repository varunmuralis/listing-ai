import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { requireUser } from "@/server/auth/require-user";
import { listProjects } from "@/server/services/project-service";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/features/projects/project-card";

export default async function DashboardPage() {
  const { user, repos } = await requireUser();
  const projects = await listProjects(repos, user.id);

  return (
    <div className="min-h-dvh">
      <AppHeader user={user} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Workspace</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Your listings</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {projects.length
                ? `${projects.length} ${projects.length === 1 ? "project" : "projects"}`
                : "Import a listing to build its interactive workspace."}
            </p>
          </div>
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="size-4" />
              New listing
            </Link>
          </Button>
        </div>

        {projects.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-10 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-primary/15 text-primary">
        <Sparkles className="size-6" />
      </span>
      <h2 className="mt-4 text-lg font-semibold">No listings yet</h2>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        Paste a Zillow listing URL and ListingAI will import the data, group the photos by room, and prepare
        the interactive workspace.
      </p>
      <Button asChild className="mt-6">
        <Link href="/projects/new">
          <Plus className="size-4" />
          Create your first listing
        </Link>
      </Button>
    </div>
  );
}
