// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { createMemoryRepositories } from "@/server/repositories/memory";
import { getMemoryStore } from "@/server/repositories/memory/store";
import { authorizeProject } from "@/server/services/authorization";

const OWNER = "owner-1";
const OTHER = "intruder-2";

function clearStore() {
  const store = getMemoryStore();
  store.projects.clear();
  store.properties.clear();
  store.images.clear();
  store.jobs.clear();
}

describe("authorizeProject", () => {
  beforeEach(() => clearStore());

  it("authorizes the owner to read their project", async () => {
    const repos = createMemoryRepositories();
    const project = await repos.projects.create({ ownerId: OWNER, sourceUrl: "https://x", title: "T" });
    const result = await authorizeProject(repos, OWNER, project.id);
    expect(result.ok).toBe(true);
  });

  it("denies access to a non-owner without leaking existence", async () => {
    const repos = createMemoryRepositories();
    const project = await repos.projects.create({ ownerId: OWNER, sourceUrl: "https://x", title: "T" });
    const result = await authorizeProject(repos, OTHER, project.id);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("not_found");
  });

  it("returns not_found for a missing project", async () => {
    const repos = createMemoryRepositories();
    const result = await authorizeProject(repos, OWNER, "does-not-exist");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("not_found");
  });
});
