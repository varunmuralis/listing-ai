import type { Citation } from "@/types/domain";

export type AIRole = "system" | "user" | "assistant";

export interface AIMessage {
  role: AIRole;
  content: string;
}

/** Whether a piece of context is a listing fact, a derived estimate, or missing. */
export type FactKind = "verified" | "estimate" | "unavailable";

export interface GroundedFact {
  key: string;
  label: string;
  value: string;
  kind: FactKind;
}

/**
 * The authorized, assembled context the assistant is allowed to use. Nothing
 * outside this object may be treated as fact — the assistant must say when
 * information is missing rather than invent it.
 */
export interface GroundedContext {
  title: string;
  facts: GroundedFact[];
  /** Labels of information the user commonly asks about that we do NOT have. */
  missing: string[];
}

export interface StreamChatInput {
  context: GroundedContext;
  system: string;
  messages: AIMessage[];
}

export interface AIChunk {
  /** Incremental text delta. */
  delta: string;
}

/**
 * AI provider boundary. UI never talks to a model directly; it calls the
 * assistant service, which uses one of these implementations.
 */
export interface AIProvider {
  readonly name: string;
  streamChat(input: StreamChatInput): AsyncIterable<AIChunk>;
}

/** Citations the assistant derived for a completed answer (persisted with it). */
export function citationsFromFacts(facts: GroundedFact[]): Citation[] {
  return facts
    .filter((f) => f.kind !== "unavailable")
    .map((f) => ({ source: f.key, label: f.label }));
}
