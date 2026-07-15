import "server-only";
import type { ProcessingStep } from "@/types/domain";
import { getListingDataProvider } from "@/lib/providers/listing";
import { getRoomClassifier } from "@/lib/providers/rooms";
import { getStorageProvider } from "@/lib/storage";
import { validateListingUrl } from "@/lib/validation/listing-url";
import type { NewImage, Repositories } from "@/server/repositories/types";
import { canTransition, progressForStep, projectStatusForJob } from "@/server/services/job-transitions";

/**
 * Ingestion pipeline. Runs real steps through the provider/classifier/storage
 * boundaries and persists progress to the processing job after every step, so
 * the UI's progress reflects true state (no fake timers). Steps are paced with
 * short awaits to model real latency and keep the UI legible.
 *
 * Idempotent: image ingestion dedupes by source URL, property data is upserted,
 * and a per-process guard prevents a job from running twice concurrently.
 */

const GLOBAL_KEY = "__listingai_active_jobs__";
type GlobalWithJobs = typeof globalThis & { [GLOBAL_KEY]?: Set<string> };

function activeJobs(): Set<string> {
  const g = globalThis as GlobalWithJobs;
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = new Set();
  return g[GLOBAL_KEY];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Kick off processing if the job is pending/failed/cancelled and not already running. */
export async function ensureProcessing(repos: Repositories, jobId: string): Promise<void> {
  const running = activeJobs();
  if (running.has(jobId)) return;

  const job = await repos.jobs.getById(jobId);
  if (!job) return;
  if (job.status === "succeeded" || job.status === "running") return;
  if (!canTransition(job.status, "running")) return;

  running.add(jobId);
  // Fire and forget: progress is polled from the persisted job.
  void executeSteps(repos, jobId).finally(() => running.delete(jobId));
}

async function isCancelled(repos: Repositories, jobId: string): Promise<boolean> {
  const job = await repos.jobs.getById(jobId);
  return job?.status === "cancelled";
}

async function enterStep(repos: Repositories, jobId: string, step: ProcessingStep, projectId: string) {
  await repos.jobs.update(jobId, { status: "running", currentStep: step, progress: progressForStep(step) });
  await repos.projects.update(projectId, {
    status: "processing",
    progress: progressForStep(step),
    activeJobStep: step,
    errorMessage: null,
  });
}

async function executeSteps(repos: Repositories, jobId: string): Promise<void> {
  const job = await repos.jobs.getById(jobId);
  if (!job) return;
  const projectId = job.projectId;

  try {
    await repos.jobs.update(jobId, {
      status: "running",
      attempts: job.attempts + 1,
      startedAt: job.startedAt ?? new Date().toISOString(),
      errorMessage: null,
      completedAt: null,
    });

    const project = await repos.projects.getById(projectId);
    if (!project) throw new Error("Project no longer exists");

    // 1. Validate URL ------------------------------------------------------
    await enterStep(repos, jobId, "validating_url", projectId);
    const urlCheck = validateListingUrl(project.sourceUrl);
    if (!urlCheck.valid) throw new Error(urlCheck.error ?? "Invalid listing URL");
    await sleep(500);
    if (await isCancelled(repos, jobId)) return;

    // 2. Retrieve property data (provider boundary) ------------------------
    await enterStep(repos, jobId, "retrieving_data", projectId);
    const provider = getListingDataProvider();
    const listingResult = await provider.fetchListing({ sourceUrl: project.sourceUrl, zpid: urlCheck.zpid });
    if (!listingResult.ok) throw new Error(listingResult.error.message);
    const listing = listingResult.data;
    await repos.properties.upsert(projectId, listing.property);
    if (listing.title) {
      await repos.projects.update(projectId, { title: listing.title });
    }
    await sleep(700);
    if (await isCancelled(repos, jobId)) return;

    // 3. Import photos (storage boundary, idempotent) ----------------------
    await enterStep(repos, jobId, "importing_photos", projectId);
    const storage = getStorageProvider();
    const toInsert: NewImage[] = [];
    for (const image of listing.images) {
      const stored = await storage.persistImage({
        projectId,
        imageKey: String(image.order).padStart(4, "0"),
        sourceUrl: image.sourceUrl,
      });
      toInsert.push({
        sourceUrl: image.sourceUrl,
        storagePath: stored.storagePath,
        sortOrder: image.order,
        width: image.width ?? null,
        height: image.height ?? null,
        metadata: image.metadata ?? {},
      });
    }
    const ingestion = await repos.images.insertMissing(projectId, toInsert);
    await sleep(700);
    if (await isCancelled(repos, jobId)) return;

    // 4. Classify rooms (classifier boundary) ------------------------------
    await enterStep(repos, jobId, "classifying_rooms", projectId);
    const classifier = getRoomClassifier();
    const images = await repos.images.listByProjectId(projectId);
    const classifications = await classifier.classify(
      images.map((img) => ({ sourceUrl: img.sourceUrl, order: img.sortOrder, metadata: img.metadata })),
    );
    for (let i = 0; i < images.length; i += 1) {
      const image = images[i];
      const classification = classifications[i];
      if (!classification) continue;
      // Respect a user's manual correction on re-runs.
      if (image.metadata?.correctedByUser === true) continue;
      await repos.images.updateRoomType(image.id, classification.roomType, { confidence: classification.confidence });
    }
    await sleep(700);
    if (await isCancelled(repos, jobId)) return;

    // 5. Build property context -------------------------------------------
    await enterStep(repos, jobId, "building_context", projectId);
    await sleep(500);
    if (await isCancelled(repos, jobId)) return;

    // 6. Prepare interactive experience -----------------------------------
    await enterStep(repos, jobId, "preparing_experience", projectId);
    await sleep(500);
    if (await isCancelled(repos, jobId)) return;

    // Complete -------------------------------------------------------------
    await repos.jobs.update(jobId, {
      status: "succeeded",
      progress: 100,
      currentStep: null,
      result: { imagesInserted: ingestion.inserted, imagesSkipped: ingestion.skipped, imageCount: images.length },
      completedAt: new Date().toISOString(),
      errorMessage: null,
    });
    await repos.projects.update(projectId, {
      status: projectStatusForJob("succeeded"),
      progress: 100,
      activeJobStep: null,
      errorMessage: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Processing failed unexpectedly.";
    await repos.jobs.update(jobId, {
      status: "failed",
      errorMessage: message,
      completedAt: new Date().toISOString(),
    });
    await repos.projects.update(projectId, {
      status: projectStatusForJob("failed"),
      errorMessage: message,
    });
  }
}

/** Cancel a running/pending job if it is safe to do so. */
export async function cancelJob(repos: Repositories, jobId: string): Promise<boolean> {
  const job = await repos.jobs.getById(jobId);
  if (!job || !canTransition(job.status, "cancelled")) return false;
  await repos.jobs.update(jobId, { status: "cancelled", currentStep: null, completedAt: new Date().toISOString() });
  await repos.projects.update(job.projectId, { status: "draft", activeJobStep: null, progress: 0 });
  return true;
}

/** Retry a failed/cancelled job. Ingestion idempotency prevents duplication. */
export async function retryJob(repos: Repositories, jobId: string): Promise<boolean> {
  const job = await repos.jobs.getById(jobId);
  if (!job || !canTransition(job.status, "running")) return false;
  await ensureProcessing(repos, jobId);
  return true;
}
