import OpenAI from "openai";
import { serverEnv } from "@/lib/env/server";
import type { AIChunk, AIProvider, StreamChatInput } from "@/lib/ai/types";

/**
 * OpenAI-compatible streaming provider. Works with any endpoint that speaks the
 * OpenAI Chat Completions API (set OPENAI_BASE_URL to redirect). The grounding
 * rules live in the system prompt assembled by the assistant service.
 */
export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: serverEnv.OPENAI_API_KEY,
      baseURL: serverEnv.OPENAI_BASE_URL,
    });
  }

  async *streamChat(input: StreamChatInput): AsyncIterable<AIChunk> {
    const stream = await this.client.chat.completions.create({
      model: serverEnv.OPENAI_MODEL,
      stream: true,
      temperature: 0.3,
      messages: [
        { role: "system", content: input.system },
        ...input.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    });
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield { delta };
    }
  }
}
