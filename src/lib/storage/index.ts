import { isSupabaseConfigured } from "@/lib/env/server";
import type { PersistImageInput, StorageProvider, StoredImageRef } from "@/lib/storage/types";

/**
 * Dev passthrough: keeps the original image URL, no upload. Used locally where
 * managed storage is unavailable.
 */
class PassthroughStorageProvider implements StorageProvider {
  readonly name = "passthrough";
  async persistImage(input: PersistImageInput): Promise<StoredImageRef> {
    return { storagePath: null, publicUrl: input.sourceUrl };
  }
}

/**
 * Supabase Storage adapter: downloads the source image and uploads it to the
 * `property-images` bucket under `<projectId>/<imageKey>`.
 */
class SupabaseStorageProvider implements StorageProvider {
  readonly name = "supabase";
  private bucket = "property-images";

  async persistImage(input: PersistImageInput): Promise<StoredImageRef> {
    const { createSupabaseAdminClient } = await import("@/lib/database/supabase-server");
    const admin = createSupabaseAdminClient();
    const response = await fetch(input.sourceUrl);
    if (!response.ok) {
      // Fall back to referencing the source URL rather than failing ingestion.
      return { storagePath: null, publicUrl: input.sourceUrl };
    }
    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const bytes = new Uint8Array(await response.arrayBuffer());
    const path = `${input.projectId}/${input.imageKey}`;
    const { error } = await admin.storage.from(this.bucket).upload(path, bytes, {
      contentType,
      upsert: true,
    });
    if (error) {
      return { storagePath: null, publicUrl: input.sourceUrl };
    }
    const { data } = admin.storage.from(this.bucket).getPublicUrl(path);
    return { storagePath: path, publicUrl: data.publicUrl };
  }
}

export function getStorageProvider(): StorageProvider {
  return isSupabaseConfigured ? new SupabaseStorageProvider() : new PassthroughStorageProvider();
}

export type { StorageProvider, StoredImageRef } from "@/lib/storage/types";
