import { z } from "zod";

/**
 * Zillow listing URL validation. Kept provider-agnostic in shape so other
 * sources can be added later, but the allowlist is intentionally strict:
 * we only accept canonical Zillow home-details URLs.
 *
 * NOTE: We never fetch or scrape the URL here — we only validate and normalize
 * it. Ingestion happens behind the ListingDataProvider boundary.
 */

export const ZILLOW_HOST_ALLOWLIST = ["zillow.com", "www.zillow.com"] as const;

export interface ListingUrlValidation {
  valid: boolean;
  /** Canonical normalized URL (origin + pathname), present when valid. */
  normalized?: string;
  /** Zillow property id parsed from the `_zpid` segment, when present. */
  zpid?: string;
  error?: string;
}

/** A Zillow home-details path looks like `/homedetails/<slug>/<zpid>_zpid/`. */
const HOMEDETAILS_PATH = /^\/homedetails\/[^/]+\/(\d+)_zpid\/?$/i;

export function validateListingUrl(raw: string): ListingUrlValidation {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: false, error: "Enter a Zillow listing URL." };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { valid: false, error: "That doesn't look like a valid URL." };
  }

  if (url.protocol !== "https:") {
    return { valid: false, error: "The URL must use HTTPS." };
  }

  const host = url.hostname.toLowerCase();
  if (!ZILLOW_HOST_ALLOWLIST.includes(host as (typeof ZILLOW_HOST_ALLOWLIST)[number])) {
    return {
      valid: false,
      error: "Only zillow.com listing URLs are supported right now.",
    };
  }

  const match = url.pathname.match(HOMEDETAILS_PATH);
  if (!match) {
    return {
      valid: false,
      error: "The URL must point to a Zillow home-details page (e.g. /homedetails/.../<id>_zpid/).",
    };
  }

  const zpid = match[1];
  const normalized = `${url.origin}${url.pathname.replace(/\/?$/, "/")}`;
  return { valid: true, normalized, zpid };
}

/** Zod schema wrapping the validator for form/action boundaries. */
export const listingUrlSchema = z
  .string()
  .trim()
  .min(1, "Enter a Zillow listing URL.")
  .superRefine((value, ctx) => {
    const result = validateListingUrl(value);
    if (!result.valid) {
      ctx.addIssue({ code: "custom", message: result.error ?? "Invalid listing URL." });
    }
  });
