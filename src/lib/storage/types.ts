export interface StoredImageRef {
  /** Storage object path when uploaded to managed storage; null for passthrough. */
  storagePath: string | null;
  /** URL the UI should render. */
  publicUrl: string;
}

export interface PersistImageInput {
  projectId: string;
  /** Stable key for the object within the project (e.g. sort order or hash). */
  imageKey: string;
  sourceUrl: string;
}

/**
 * StorageProvider boundary. Dev passes image URLs through unchanged; the Supabase
 * adapter copies them into a bucket. The processing pipeline depends only on this
 * interface.
 */
export interface StorageProvider {
  readonly name: string;
  persistImage(input: PersistImageInput): Promise<StoredImageRef>;
}
