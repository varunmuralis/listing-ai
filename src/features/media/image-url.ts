import type { PropertyImage } from "@/types/domain";

/**
 * Resolve the URL used to display a property image.
 *
 * TODO(storage): when Supabase Storage is the active provider, resolve
 * `storagePath` to its bucket public URL. In local dev the passthrough storage
 * provider keeps the original source URL, which is what we render here.
 */
export function imageDisplayUrl(image: Pick<PropertyImage, "sourceUrl" | "storagePath">): string {
  return image.sourceUrl;
}

/** Pick a representative image: prefer an exterior shot, else the first by order. */
export function representativeImage(images: PropertyImage[]): PropertyImage | null {
  if (images.length === 0) return null;
  const exterior = images.find((image) => image.roomType === "exterior");
  return exterior ?? [...images].sort((a, b) => a.sortOrder - b.sortOrder)[0];
}
