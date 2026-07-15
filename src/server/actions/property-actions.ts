"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PropertyImage } from "@/types/domain";
import { listingEditSchema, roomCorrectionSchema } from "@/types/schemas";
import { requireUser } from "@/server/auth/require-user";
import { saveListingDetails } from "@/server/services/project-service";
import { correctRoomType } from "@/server/services/property-service";

/** Result of a listing-editor save. Consumed by the client editor (not a form action). */
export interface SaveListingState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  /** Millisecond timestamp of the last successful save (for "Saved" feedback). */
  savedAt?: number;
}

/**
 * Persist listing-editor changes. Authorization and persistence happen in the
 * service/repository layer; this action only validates the untrusted payload and
 * maps the result to UI state. `projectId` is trusted only after ownership is
 * verified server-side inside `saveListingDetails`.
 */
export async function updatePropertyAction(projectId: string, input: unknown): Promise<SaveListingState> {
  const { user, repos } = await requireUser();

  const parsed = listingEditSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  try {
    const { title, ...property } = parsed.data;
    const result = await saveListingDetails(repos, user.id, projectId, { title, property });
    if (!result.ok) {
      return { status: "error", message: result.error.message, fieldErrors: result.error.fields };
    }
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/details`);
    revalidatePath("/dashboard");
    return { status: "success", savedAt: Date.now() };
  } catch (error) {
    console.error("updatePropertyAction failed:", error);
    return { status: "error", message: "We couldn't save your changes. Please try again." };
  }
}

export interface CorrectRoomState {
  ok: boolean;
  error?: string;
  image?: PropertyImage;
}

/** Persist a user's room-classification correction (optimistic-friendly). */
export async function correctRoomAction(
  projectId: string,
  imageId: string,
  roomType: string,
): Promise<CorrectRoomState> {
  const { user, repos } = await requireUser();

  const parsed = roomCorrectionSchema.safeParse({ imageId, roomType });
  if (!parsed.success) {
    return { ok: false, error: "That isn't a valid room type." };
  }

  try {
    const result = await correctRoomType(repos, user.id, projectId, parsed.data.imageId, parsed.data.roomType);
    if (!result.ok) {
      return { ok: false, error: result.error.message };
    }
    revalidatePath(`/projects/${projectId}/photos`);
    revalidatePath(`/projects/${projectId}/rooms`);
    revalidatePath(`/projects/${projectId}`);
    return { ok: true, image: result.data };
  } catch (error) {
    console.error("correctRoomAction failed:", error);
    return { ok: false, error: "We couldn't update the room. Please try again." };
  }
}
