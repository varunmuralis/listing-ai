import { ok, type Result } from "@/types/result";
import type {
  FetchListingInput,
  ListingDataProvider,
  NormalizedListing,
} from "@/lib/providers/listing/types";

/**
 * Manual provider: creates an empty, editable listing shell for a submitted URL.
 * The user fills in property details in the listing editor. No external fetch —
 * this is the "bring your own data" path and a template for future MLS adapters.
 */
export class ManualListingProvider implements ListingDataProvider {
  readonly name = "manual";

  async fetchListing(input: FetchListingInput): Promise<Result<NormalizedListing>> {
    const listing: NormalizedListing = {
      title: "Untitled listing",
      property: {
        addressLine1: null,
        amenities: [],
        description: null,
      },
      images: [],
    };
    void input;
    return ok(listing);
  }
}
