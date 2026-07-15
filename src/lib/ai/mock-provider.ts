import type { AIChunk, AIProvider, GroundedContext, GroundedFact, StreamChatInput } from "@/lib/ai/types";

/**
 * Deterministic, grounded assistant used when no AI key is configured. It answers
 * ONLY from the assembled context and is explicit about what is verified, what is
 * an estimate/recommendation, and what is unavailable. It never invents school
 * ratings, taxes, crime data, walk scores, sun exposure, or room dimensions.
 */
export class MockAIProvider implements AIProvider {
  readonly name = "mock";

  async *streamChat(input: StreamChatInput): AsyncIterable<AIChunk> {
    const question = lastUserMessage(input.messages).toLowerCase();
    const answer = composeAnswer(question, input.context);
    // Stream word-by-word so the UI exercises real incremental rendering.
    const tokens = answer.match(/\S+\s*/g) ?? [answer];
    for (const token of tokens) {
      yield { delta: token };
    }
  }
}

function lastUserMessage(messages: StreamChatInput["messages"]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === "user") return messages[i].content;
  }
  return "";
}

function fact(context: GroundedContext, key: string): GroundedFact | undefined {
  return context.facts.find((f) => f.key === key && f.kind !== "unavailable");
}

function verifiedList(context: GroundedContext): GroundedFact[] {
  return context.facts.filter((f) => f.kind === "verified");
}

const UNAVAILABLE_TOPICS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /school|gpa|rating|district/, label: "school ratings or district quality" },
  { pattern: /crime|safe|safety/, label: "crime or safety statistics" },
  { pattern: /walk.?score|walkab/, label: "walk scores" },
  { pattern: /sun|light|exposure|facing/, label: "sun exposure / orientation" },
  { pattern: /dimension|how big|square.*room|measure/, label: "exact room dimensions" },
  { pattern: /tax rate|property tax rate|millage/, label: "the property tax rate" },
];

function composeAnswer(question: string, context: GroundedContext): string {
  const address = context.title;

  // Questions about data we simply do not have: say so, don't invent.
  for (const topic of UNAVAILABLE_TOPICS) {
    if (topic.pattern.test(question)) {
      return (
        `I don't have ${topic.label} for ${address} in the listing data available to me, ` +
        `so I can't answer that reliably. To get it you'd want an authoritative source ` +
        `(e.g. the county assessor, the school district, or a site visit). ` +
        `Here's what I can confirm from the listing:\n\n${verifiedSummary(context)}`
      );
    }
  }

  if (/selling point|strongest|highlight|best feature|pros/.test(question)) {
    const beds = fact(context, "bedrooms")?.value;
    const sqft = fact(context, "square_feet")?.value;
    const amenities = fact(context, "amenities")?.value;
    const parts = [`**Strongest selling points for ${address}** (from verified listing data):`, ""];
    if (beds) parts.push(`- Layout: ${beds} bedrooms${fact(context, "bathrooms") ? `, ${fact(context, "bathrooms")?.value} baths` : ""}${sqft ? `, ~${sqft} sq ft` : ""}.`);
    if (amenities) parts.push(`- Notable features: ${amenities}.`);
    if (fact(context, "year_built")) parts.push(`- Built in ${fact(context, "year_built")?.value}.`);
    parts.push("", "_Recommendation:_ lead your listing copy with the open-concept feel and the standout kitchen — buyers respond to those first. This is marketing guidance, not a verified fact.");
    return parts.join("\n");
  }

  if (/renovat|resale|improve|upgrade|value add|roi/.test(question)) {
    return (
      `**Renovation ideas that commonly help resale** (these are recommendations, not guarantees):\n\n` +
      `- Kitchen and primary-bath refreshes reliably return value; the listing already highlights the kitchen, so cosmetic polish may beat a gut remodel.\n` +
      `- Curb appeal and lighting are low-cost, high-impact.\n\n` +
      `I can ground this in what's verified — ${verifiedSummary(context)} — but I don't have comparable sales, contractor quotes, or the home's current condition, so treat any dollar figures as estimates you should validate locally.`
    );
  }

  if (/inspect|verify|check|due diligence/.test(question)) {
    const year = fact(context, "year_built")?.value;
    return (
      `**What to verify during inspection:**\n\n` +
      `- Roof, HVAC, water heater age and condition${year ? ` (home built ${year}, so components may be original)` : ""}.\n` +
      `- Foundation, drainage, and grading around the lot.\n` +
      `- Electrical panel capacity and any permits for prior work.\n` +
      `- Plumbing pressure and signs of past leaks.\n\n` +
      `Not available to me: the actual inspection history, permit records, or disclosures — request those from the seller/agent.`
    );
  }

  if (/king bed|bed fit|furniture fit|fit a|will .* fit/.test(question)) {
    const sqft = fact(context, "square_feet")?.value;
    return (
      `I can only estimate this — I don't have room dimensions in the listing data, which is what a definitive answer needs.\n\n` +
      `_Estimate:_ a home of ${sqft ? `~${sqft} sq ft with ` : ""}${fact(context, "bedrooms")?.value ?? "multiple"} bedrooms, including a primary suite, very likely has a primary bedroom that accommodates a king bed (a king needs roughly 10x12 ft with walking room). Confirm with a tape measure or by asking the agent for the primary bedroom's dimensions.`
    );
  }

  if (/price|cost|how much|listed/.test(question)) {
    const price = fact(context, "price");
    if (price) return `The listing price is **${price.value}** (verified from the listing). Financing scenarios are available in the Mortgage tab.`;
    return `I don't have a listed price in the current data for ${address}. You can add it in the listing editor.`;
  }

  if (/mortgage|payment|monthly|afford|down payment/.test(question)) {
    const price = fact(context, "price");
    return (
      `Use the Mortgage tab for a full breakdown. ` +
      (price ? `Starting from the verified price of ${price.value}, ` : "") +
      `it computes principal & interest, taxes, insurance, HOA, and PMI. Those outputs are estimates based on the assumptions you set (rate, down payment, term).`
    );
  }

  // Default: summarize what's known and invite a follow-up.
  return (
    `Here's what I can tell you about ${address} from the listing data:\n\n${verifiedSummary(context)}\n\n` +
    (context.missing.length
      ? `I don't have: ${context.missing.join(", ")}. Ask about selling points, renovations, inspection, or financing and I'll answer from verified data.`
      : `Ask about selling points, renovations, inspection items, or financing.`)
  );
}

function verifiedSummary(context: GroundedContext): string {
  const facts = verifiedList(context);
  if (!facts.length) return "_No verified property details have been imported yet._";
  return facts.map((f) => `- ${f.label}: ${f.value}`).join("\n");
}
