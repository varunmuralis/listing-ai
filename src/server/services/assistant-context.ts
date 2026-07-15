import "server-only";
import { ROOM_TYPE_LABELS, type ProjectWorkspace, type RoomType } from "@/types/domain";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { GroundedContext, GroundedFact } from "@/lib/ai/types";

/**
 * Assemble the ONLY context the assistant may treat as fact. Everything here is
 * derived from the authorized project workspace. Topics we cannot substantiate
 * are listed in `missing` so the assistant can say so instead of inventing.
 */
export function assembleGroundedContext(workspace: ProjectWorkspace): GroundedContext {
  const { project, property, images } = workspace;
  const facts: GroundedFact[] = [];

  const add = (key: string, label: string, value: string | null, kind: GroundedFact["kind"] = "verified") => {
    if (value === null || value === "") return;
    facts.push({ key, label, value, kind });
  };

  const address = [property?.addressLine1, property?.city, property?.region, property?.postalCode]
    .filter(Boolean)
    .join(", ");
  add("address", "Address", address || null);
  add("price", "List price", property?.price != null ? formatCurrency(property.price) : null);
  add("bedrooms", "Bedrooms", property?.bedrooms != null ? String(property.bedrooms) : null);
  add("bathrooms", "Bathrooms", property?.bathrooms != null ? String(property.bathrooms) : null);
  add("square_feet", "Square feet", property?.squareFeet != null ? formatNumber(property.squareFeet) : null);
  add("lot_size", "Lot size (sq ft)", property?.lotSize != null ? formatNumber(property.lotSize) : null);
  add("year_built", "Year built", property?.yearBuilt != null ? String(property.yearBuilt) : null);
  add("hoa", "HOA (monthly)", property?.hoaMonthly != null ? formatCurrency(property.hoaMonthly) : null);
  add(
    "property_tax",
    "Annual property tax",
    property?.annualPropertyTax != null ? formatCurrency(property.annualPropertyTax) : null,
  );
  if (property?.amenities?.length) {
    add("amenities", "Amenities", property.amenities.join(", "));
  }
  if (property?.description) {
    add("description", "Listing description", property.description);
  }

  // Room detection summary (verified from our own classification).
  const roomCounts = new Map<RoomType, number>();
  for (const image of images) {
    roomCounts.set(image.roomType, (roomCounts.get(image.roomType) ?? 0) + 1);
  }
  if (roomCounts.size) {
    const summary = [...roomCounts.entries()]
      .map(([type, count]) => `${count} ${ROOM_TYPE_LABELS[type]}`)
      .join(", ");
    add("rooms", "Detected photo groups", summary);
  }
  add("photo_count", "Photos imported", images.length ? String(images.length) : null);

  const missing = [
    "school ratings",
    "crime or safety data",
    "walk score",
    "exact room dimensions",
    "the property tax rate",
    "comparable sales",
    "sun exposure / orientation",
    "inspection or permit history",
  ];

  return {
    title: address || project.title,
    facts,
    missing,
  };
}

/** System prompt enforcing grounding + honesty rules. */
export function buildSystemPrompt(context: GroundedContext): string {
  const factLines = context.facts.map((f) => `- ${f.label}: ${f.value}`).join("\n");
  return [
    "You are a property-specific assistant for a single residential real-estate listing.",
    "Answer ONLY from the verified listing facts provided below.",
    "",
    "Rules:",
    "1. Clearly distinguish (a) verified listing facts, (b) estimates you derive, (c) recommendations/opinions, and (d) information that is unavailable.",
    "2. NEVER invent school ratings, tax rates, room dimensions, crime data, walk scores, sun exposure, or comparable sales. If asked, say the information is not available and suggest an authoritative source.",
    "3. When you estimate, label it as an estimate and state the assumption.",
    "4. Be concise and specific to THIS property.",
    "",
    `Property: ${context.title}`,
    "",
    "Verified listing facts:",
    factLines || "(No property details have been imported yet.)",
    "",
    `Information NOT available to you: ${context.missing.join(", ")}.`,
  ].join("\n");
}
