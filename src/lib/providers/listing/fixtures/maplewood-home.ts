import type { NormalizedListing } from "@/lib/providers/listing/types";

/**
 * Deterministic development fixture used by MockListingProvider. This stands in
 * for a licensed data feed — it is NOT scraped and is clearly a fixture. Image
 * URLs are seeded placeholders; each carries a `roomHint` + `filename` so the
 * heuristic room classifier has realistic signal to work with.
 */

function img(seed: string, filename: string, roomHint: string, order: number) {
  return {
    sourceUrl: `https://picsum.photos/seed/${seed}/1280/854`,
    order,
    width: 1280,
    height: 854,
    metadata: { filename, roomHint },
  };
}

export const MAPLEWOOD_FIXTURE: NormalizedListing = {
  title: "1420 Maplewood Drive, Austin, TX",
  property: {
    addressLine1: "1420 Maplewood Drive",
    city: "Austin",
    region: "TX",
    postalCode: "78704",
    latitude: 30.2451,
    longitude: -97.7714,
    price: 875000,
    bedrooms: 4,
    bathrooms: 3,
    squareFeet: 2680,
    lotSize: 8250,
    yearBuilt: 2015,
    hoaMonthly: 0,
    annualPropertyTax: 15400,
    description:
      "Sun-filled contemporary home in the heart of 78704. An open-concept main level " +
      "connects a chef's kitchen with quartz counters to a vaulted living room and a " +
      "dining area framed by oversized windows. The primary suite offers a spa-style bath " +
      "and walk-in closet. A landscaped backyard with a covered patio rounds out the home, " +
      "minutes from South Congress.",
    amenities: [
      "Chef's kitchen",
      "Quartz countertops",
      "Hardwood floors",
      "Vaulted ceilings",
      "Walk-in closets",
      "Covered patio",
      "Two-car garage",
      "Smart thermostat",
      "Tankless water heater",
    ],
  },
  images: [
    img("maple-exterior-front", "01-exterior-front.jpg", "exterior", 0),
    img("maple-living-1", "02-living-room.jpg", "living_room", 1),
    img("maple-living-2", "03-living-room-alt.jpg", "living_room", 2),
    img("maple-kitchen-1", "04-kitchen.jpg", "kitchen", 3),
    img("maple-kitchen-2", "05-kitchen-island.jpg", "kitchen", 4),
    img("maple-dining", "06-dining-room.jpg", "dining_room", 5),
    img("maple-primary-bed", "07-primary-bedroom.jpg", "primary_bedroom", 6),
    img("maple-bed-2", "08-bedroom.jpg", "bedroom", 7),
    img("maple-bath-1", "09-bathroom.jpg", "bathroom", 8),
    img("maple-office", "10-office.jpg", "office", 9),
    img("maple-backyard", "11-backyard-patio.jpg", "backyard", 10),
    img("maple-garage", "12-garage.jpg", "garage", 11),
    img("maple-floorplan", "13-floorplan.png", "floorplan", 12),
  ],
};
