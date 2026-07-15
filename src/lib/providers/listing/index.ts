import { serverEnv } from "@/lib/env/server";
import type { ListingDataProvider } from "@/lib/providers/listing/types";
import { MockListingProvider } from "@/lib/providers/listing/mock-provider";
import { ManualListingProvider } from "@/lib/providers/listing/manual-provider";

/** Select the active ingestion provider from configuration. */
export function getListingDataProvider(): ListingDataProvider {
  switch (serverEnv.LISTING_PROVIDER) {
    case "manual":
      return new ManualListingProvider();
    case "mock":
    default:
      return new MockListingProvider();
  }
}

export type { ListingDataProvider, NormalizedListing } from "@/lib/providers/listing/types";
