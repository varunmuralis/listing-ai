import { describe, it, expect } from "vitest";
import { validateListingUrl } from "@/lib/validation/listing-url";

const VALID = "https://www.zillow.com/homedetails/1420-Maplewood-Dr-Austin-TX-78704/70982345_zpid/";

describe("validateListingUrl", () => {
  it("accepts a canonical Zillow home-details URL and extracts the zpid", () => {
    const result = validateListingUrl(VALID);
    expect(result.valid).toBe(true);
    expect(result.zpid).toBe("70982345");
    expect(result.normalized).toBe(VALID);
  });

  it("accepts the bare zillow.com host", () => {
    expect(validateListingUrl("https://zillow.com/homedetails/x/123_zpid/").valid).toBe(true);
  });

  it("rejects non-https URLs", () => {
    const result = validateListingUrl("http://www.zillow.com/homedetails/x/123_zpid/");
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/https/i);
  });

  it("rejects non-allowlisted hosts", () => {
    expect(validateListingUrl("https://redfin.com/homedetails/x/123_zpid/").valid).toBe(false);
    expect(validateListingUrl("https://evil-zillow.com/homedetails/x/123_zpid/").valid).toBe(false);
  });

  it("rejects URLs that are not home-details pages", () => {
    expect(validateListingUrl("https://www.zillow.com/for-sale/austin-tx/").valid).toBe(false);
  });

  it("rejects empty and malformed input", () => {
    expect(validateListingUrl("").valid).toBe(false);
    expect(validateListingUrl("not a url").valid).toBe(false);
  });
});
