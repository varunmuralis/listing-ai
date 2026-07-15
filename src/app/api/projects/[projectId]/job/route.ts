import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth/session";
import { getRepositories } from "@/server/repositories";
import { authorizeProject } from "@/server/services/authorization";
import { cancelJob, ensureProcessing, retryJob } from "@/server/services/processing-service";

/**
 * Job status + control endpoint for a project. GET returns the current snapshot
 * (polled by the job-status hook); POST starts, retries, or cancels processing.
 * Every call verifies the caller owns the project.
 */

async function loadContext(projectId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  const repos = await getRepositories();
  const auth = await authorizeProject(repos, user.id, projectId);
  if (!auth.ok) return { error: NextResponse.json({ error: auth.error.code }, { status: 404 }) };
  return { user, repos, project: auth.data };
}

async function snapshot(projectId: string, ctx: Awaited<ReturnType<typeof loadContext>>) {
  if (ctx.error) return ctx.error;
  const [project, job] = await Promise.all([
    ctx.repos.projects.getById(projectId),
    ctx.repos.jobs.getLatestForProject(projectId),
  ]);
  return NextResponse.json({ project, job });
}

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const ctx = await loadContext(projectId);
  if (ctx.error) return ctx.error;
  return snapshot(projectId, ctx);
}

const bodySchema = z.object({ action: z.enum(["start", "retry", "cancel"]) });

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const ctx = await loadContext(projectId);
  if (ctx.error) return ctx.error;

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  const job = await ctx.repos.jobs.getLatestForProject(projectId);
  if (!job) return NextResponse.json({ error: "no_job" }, { status: 404 });

  switch (parsed.data.action) {
    case "start":
      await ensureProcessing(ctx.repos, job.id);
      break;
    case "retry":
      await retryJob(ctx.repos, job.id);
      break;
    case "cancel":
      await cancelJob(ctx.repos, job.id);
      break;
  }

  return snapshot(projectId, ctx);
}
