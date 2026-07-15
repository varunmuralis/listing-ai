import "server-only";
import type { Property, PropertyImage, RoomType } from "@/types/domain";
import { err, ok, type Result } from "@/types/result";
import type { PropertyData, Repositories } from "@/server/repositories/types";
import { authorizeProject } from "@/server/services/authorization";

/** Persist listing-editor changes after verifying project ownership. */
export async function updateProperty(
  repos: Repositories,
  userId: string,
  projectId: string,
  data: PropertyData,
): Promise<Result<Property>> {
  const auth = await authorizeProject(repos, userId, projectId);
  if (!auth.ok) return auth;
  const property = await repos.properties.upsert(projectId, data);
  return ok(property);
}

/** Persist a user's room-classification correction. */
export async function correctRoomType(
  repos: Repositories,
  userId: string,
  projectId: string,
  imageId: string,
  roomType: RoomType,
): Promise<Result<PropertyImage>> {
  const auth = await authorizeProject(repos, userId, projectId);
  if (!auth.ok) return auth;
  const image = await repos.images.getById(imageId);
  if (!image || image.projectId !== projectId) {
    return err("not_found", "That photo doesn't belong to this project.");
  }
  // A user correction is authoritative: max confidence, flagged so re-runs keep it.
  const updated = await repos.images.updateRoomType(imageId, roomType, { confidence: 1, corrected: true });
  return ok(updated);
}
