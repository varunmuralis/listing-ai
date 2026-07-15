import { ok, type Result } from "@/types/result";
import type {
  FetchListingInput,
  ListingDataProvider,
  NormalizedListing,
} from "@/lib/providers/listing/types";
import { MAPLEWOOD_FIXTURE } from "@/lib/providers/listing/fixtures/maplewood-home";

/**
 * Development provider. Returns a deterministic fixture so the full ingestion
 * pipeline (fetch -> persist -> classify) runs without any external calls. The
 * source URL is echoed into the result so downstream data stays traceable.
 */
export class MockListingProvider implements ListingDataProvider {
  readonly name = "mock";

  async fetchListing(input: FetchListingInput): Promise<Result<NormalizedListing>> {
    // Deterministic: identical input always yields identical listing data.
    const listing: NormalizedListing = {
      ...MAPLEWOOD_FIXTURE,
      property: { ...MAPLEWOOD_FIXTURE.property },
      images: MAPLEWOOD_FIXTURE.images.map((image) => ({
        ...image,
        metadata: { ...image.metadata, sourceListingUrl: input.sourceUrl, zpid: input.zpid },
      })),
    };
    return ok(listing);
  }
}
