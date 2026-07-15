import type { Result } from "@/types/result";
import type { PropertyData } from "@/server/repositories/types";

/**
 * ListingDataProvider is the ONLY place external listing data enters the system.
 * We never scrape Zillow from the browser. Development uses a deterministic
 * fixture; a licensed MLS/property-data adapter can be dropped in behind this
 * same interface without touching UI or domain logic.
 */

export interface NormalizedImage {
  sourceUrl: string;
  order: number;
  width?: number;
  height?: number;
  /** Fixture/import hints (filename, room hint) used by the heuristic classifier. */
  metadata?: Record<string, unknown>;
}

export interface NormalizedListing {
  title: string;
  property: PropertyData;
  images: NormalizedImage[];
}

export interface FetchListingInput {
  sourceUrl: string;
  zpid?: string;
}

export interface ListingDataProvider {
  readonly name: string;
  fetchListing(input: FetchListingInput): Promise<Result<NormalizedListing>>;
}
