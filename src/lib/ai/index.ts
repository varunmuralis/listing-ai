import { isOpenAIConfigured } from "@/lib/env/server";
import type { AIProvider } from "@/lib/ai/types";
import { MockAIProvider } from "@/lib/ai/mock-provider";
import { OpenAIProvider } from "@/lib/ai/openai-provider";

/** Select the AI provider: OpenAI when a key is present, otherwise the grounded mock. */
export function getAIProvider(): AIProvider {
  return isOpenAIConfigured ? new OpenAIProvider() : new MockAIProvider();
}

export type { AIProvider, GroundedContext, GroundedFact, AIMessage } from "@/lib/ai/types";
