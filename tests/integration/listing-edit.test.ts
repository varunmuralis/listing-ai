// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { createMemoryRepositories } from "@/server/repositories/memory";
import { getMemoryStore } from "@/server/repositories/memory/store";
import { saveListingDetails } from "@/server/services/project-service";
import { correctRoomType } from "@/server/services/property-service";
import type { Repositories } from "@/server/repositories/types";

const OWNER = "owner-1";
const OTHER = "intruder-2";

function clearStore() {
  const store = getMemoryStore();
  store.projects.clear();
  store.properties.clear();
  store.images.clear();
  store.jobs.clear();
}

async function seedProject(repos: Repositories, ownerId = OWNER) {
  const project = await repos.projects.create({ ownerId, sourceUrl: "https://x", title: "Original" });
  await repos.properties.upsert(project.id, { price: 800000, amenities: ["Garage"] });
  return project;
}

describe("saveListingDetails", () => {
  beforeEach(() => clearStore());

  it("persists a valid edit (title + property + amenities)", async () => {
    const repos = createMemoryRepositories();
    const project = await seedProject(repos);

    const result = await saveListingDetails(repos, OWNER, project.id, {
      title: "1420 Maplewood Dr",
      property: { price: 900000, bedrooms: 4, amenities: ["Pool", "Garage"] },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.project.title).toBe("1420 Maplewood Dr");
    expect(result.data.property.price).toBe(900000);
    expect(result.data.property.amenities).toEqual(["Pool", "Garage"]);

    // Persisted, not just returned.
    const reloaded = await repos.properties.getByProjectId(project.id);
    expect(reloaded?.price).toBe(900000);
  });

  it("rejects edits from a non-owner and leaves data unchanged", async () => {
    const repos = createMemoryRepositories();
    const project = await seedProject(repos);

    const result = await saveListingDetails(repos, OTHER, project.id, {
      title: "Hijacked",
      property: { price: 1 },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("not_found");

    const reloaded = await repos.projects.getById(project.id);
    expect(reloaded?.title).toBe("Original");
  });
});

describe("correctRoomType", () => {
  beforeEach(() => clearStore());

  it("persists a correction and flags it so re-runs preserve it", async () => {
    const repos = createMemoryRepositories();
    const project = await seedProject(repos);
    const { images } = await repos.images.insertMissing(project.id, [
      { sourceUrl: "https://img/1.jpg", sortOrder: 0, roomType: "other", roomConfidence: 0.3 },
    ]);
    const imageId = images[0].id;

    const result = await correctRoomType(repos, OWNER, project.id, imageId, "kitchen");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.roomType).toBe("kitchen");
    expect(result.data.roomConfidence).toBe(1);
    expect(result.data.metadata.correctedByUser).toBe(true);
  });

  it("denies correction from a non-owner", async () => {
    const repos = createMemoryRepositories();
    const project = await seedProject(repos);
    const { images } = await repos.images.insertMissing(project.id, [
      { sourceUrl: "https://img/1.jpg", sortOrder: 0 },
    ]);
    const result = await correctRoomType(repos, OTHER, project.id, images[0].id, "kitchen");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("not_found");
  });

  it("rejects an image that belongs to another project", async () => {
    const repos = createMemoryRepositories();
    const projectA = await seedProject(repos);
    const projectB = await seedProject(repos);
    const { images } = await repos.images.insertMissing(projectB.id, [
      { sourceUrl: "https://img/b.jpg", sortOrder: 0 },
    ]);
    // Owner tries to correct project B's image via project A's id.
    const result = await correctRoomType(repos, OWNER, projectA.id, images[0].id, "kitchen");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("not_found");
  });
});
