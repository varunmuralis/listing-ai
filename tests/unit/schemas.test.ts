import { describe, it, expect } from "vitest";
import { propertyEditSchema, listingEditSchema } from "@/types/schemas";

describe("propertyEditSchema", () => {
  it("coerces empty numeric strings to null", () => {
    const parsed = propertyEditSchema.parse({ price: "", bedrooms: "" });
    expect(parsed.price).toBeNull();
    expect(parsed.bedrooms).toBeNull();
  });

  it("parses comma-formatted numbers", () => {
    const parsed = propertyEditSchema.parse({ price: "875,000", squareFeet: "2,680" });
    expect(parsed.price).toBe(875000);
    expect(parsed.squareFeet).toBe(2680);
  });

  it("rejects non-numeric values", () => {
    expect(propertyEditSchema.safeParse({ price: "expensive" }).success).toBe(false);
  });

  it("rejects out-of-range values", () => {
    expect(propertyEditSchema.safeParse({ bedrooms: "-2" }).success).toBe(false);
    expect(propertyEditSchema.safeParse({ yearBuilt: "1200" }).success).toBe(false);
  });

  it("trims and preserves amenities", () => {
    const parsed = propertyEditSchema.parse({ amenities: ["  Pool  ", "Garage"] });
    expect(parsed.amenities).toEqual(["Pool", "Garage"]);
  });

  it("defaults amenities to an empty array", () => {
    expect(propertyEditSchema.parse({}).amenities).toEqual([]);
  });
});

describe("listingEditSchema", () => {
  it("accepts a full valid listing payload", () => {
    const result = listingEditSchema.safeParse({
      title: "1420 Maplewood Dr",
      addressLine1: "1420 Maplewood Dr",
      city: "Austin",
      region: "TX",
      postalCode: "78704",
      price: "900000",
      bedrooms: "4",
      bathrooms: "3",
      squareFeet: "2680",
      description: "Nice home",
      amenities: ["Pool"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("1420 Maplewood Dr");
      expect(result.data.price).toBe(900000);
    }
  });

  it("requires a non-empty title", () => {
    const result = listingEditSchema.safeParse({ title: "   " });
    expect(result.success).toBe(false);
  });
});
