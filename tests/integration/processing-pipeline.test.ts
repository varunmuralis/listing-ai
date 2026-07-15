// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { createMemoryRepositories } from "@/server/repositories/memory";
import { getMemoryStore } from "@/server/repositories/memory/store";
import { createProject } from "@/server/services/project-service";
import { ensureProcessing } from "@/server/services/processing-service";
import type { Repositories } from "@/server/repositories/types";

const USER_ID = "user-1";
const SOURCE_URL = "https://www.zillow.com/homedetails/1420-Maplewood-Dr-Austin-TX-78704/70982345_zpid/";

async function waitForJob(repos: Repositories, jobId: string, timeoutMs = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const job = await repos.jobs.getById(jobId);
    if (job && (job.status === "succeeded" || job.status === "failed")) return job;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Job did not finish in time");
}

function clearStore() {
  const store = getMemoryStore();
  store.projects.clear();
  store.properties.clear();
  store.images.clear();
  store.jobs.clear();
}

describe("ingestion pipeline (memory adapter)", () => {
  beforeEach(() => clearStore());

  it("runs all steps and persists property + classified images", async () => {
    const repos = createMemoryRepositories();
    const created = await createProject(repos, USER_ID, SOURCE_URL);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    await ensureProcessing(repos, created.data.job.id);
    const job = await waitForJob(repos, created.data.job.id);

    expect(job.status).toBe("succeeded");
    expect(job.progress).toBe(100);

    const property = await repos.properties.getByProjectId(created.data.project.id);
    expect(property?.city).toBe("Austin");
    expect(property?.price).toBe(875000);

    const images = await repos.images.listByProjectId(created.data.project.id);
    expect(images.length).toBeGreaterThan(10);
    // Deterministic classification via fixture room hints.
    const kitchen = images.filter((i) => i.roomType === "kitchen");
    expect(kitchen.length).toBeGreaterThanOrEqual(2);
    expect(images.every((i) => i.roomConfidence > 0)).toBe(true);

    const project = await repos.projects.getById(created.data.project.id);
    expect(project?.status).toBe("ready");
    expect(project?.title).toContain("Austin");
  });

  it("is idempotent: re-running does not duplicate images", async () => {
    const repos = createMemoryRepositories();
    const created = await createProject(repos, USER_ID, SOURCE_URL);
    if (!created.ok) return;
    await ensureProcessing(repos, created.data.job.id);
    await waitForJob(repos, created.data.job.id);

    const before = (await repos.images.listByProjectId(created.data.project.id)).length;

    // Re-run the same job.
    await ensureProcessing(repos, created.data.job.id);
    await waitForJob(repos, created.data.job.id);
    const after = (await repos.images.listByProjectId(created.data.project.id)).length;

    expect(after).toBe(before);
  });
});
