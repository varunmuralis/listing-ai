import "server-only";
// TODO(assistant-milestone): this streaming service layer is complete but not yet
// consumed — the AI chat Route Handler (app/api/projects/[id]/assistant/route.ts)
// and the client chat panel still need to be built to pipe `sendUserMessage`'s
// async iterator to a ReadableStream. See HANDOFF.md priority #6.
import type { Conversation, Message } from "@/types/domain";
import { ok, type Result } from "@/types/result";
import { getAIProvider } from "@/lib/ai";
import { citationsFromFacts, type AIMessage, type GroundedContext } from "@/lib/ai/types";
import type { Repositories } from "@/server/repositories/types";
import { authorizeProject } from "@/server/services/authorization";
import { assembleGroundedContext, buildSystemPrompt } from "@/server/services/assistant-context";
import { getWorkspace } from "@/server/services/project-service";

export interface AssistantSession {
  conversation: Conversation;
  messages: Message[];
  context: GroundedContext;
}

/** Load (or create) the conversation and grounded context for a project. */
export async function loadAssistantSession(
  repos: Repositories,
  userId: string,
  projectId: string,
): Promise<Result<AssistantSession>> {
  const workspace = await getWorkspace(repos, userId, projectId);
  if (!workspace.ok) return workspace;
  const conversation = await repos.conversations.getOrCreateForProject(projectId, userId);
  const messages = await repos.messages.listByConversation(conversation.id);
  const context = assembleGroundedContext(workspace.data);
  return ok({ conversation, messages, context });
}

export interface StreamHandle {
  context: GroundedContext;
  /** Async iterator of text deltas; caller pipes to the HTTP response. */
  stream: AsyncIterable<string>;
}

/**
 * Persist the user's message, then return a stream of assistant deltas. The full
 * assistant reply is persisted (with citations) when the stream completes via
 * the `onComplete` callback.
 */
export async function sendUserMessage(
  repos: Repositories,
  userId: string,
  projectId: string,
  content: string,
): Promise<Result<StreamHandle>> {
  const auth = await authorizeProject(repos, userId, projectId);
  if (!auth.ok) return auth;

  const session = await loadAssistantSession(repos, userId, projectId);
  if (!session.ok) return session;
  const { conversation, messages, context } = session.data;

  await repos.messages.insert({ conversationId: conversation.id, role: "user", content });

  const history: AIMessage[] = [
    ...messages.map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content },
  ];
  const provider = getAIProvider();
  const system = buildSystemPrompt(context);

  async function* stream(): AsyncIterable<string> {
    let full = "";
    for await (const chunk of provider.streamChat({ context, system, messages: history })) {
      full += chunk.delta;
      yield chunk.delta;
    }
    await repos.messages.insert({
      conversationId: conversation.id,
      role: "assistant",
      content: full,
      citations: citationsFromFacts(context.facts),
    });
  }

  return ok({ context, stream: stream() });
}

export const STARTER_QUESTIONS = [
  "Summarize the strongest selling points.",
  "What renovations may improve resale value?",
  "What should I verify during inspection?",
  "Could a king bed fit based on available information?",
] as const;
