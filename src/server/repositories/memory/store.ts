import type {
  Conversation,
  Message,
  ProcessingJob,
  Profile,
  Project,
  Property,
  PropertyImage,
} from "@/types/domain";

/**
 * In-memory persistence store for local development (no Docker/Supabase here).
 * Pinned to `globalThis` so it survives Next.js HMR module reloads within a
 * single dev process. Not for production — the Supabase adapter is used when
 * credentials are present.
 */
export interface MemoryStore {
  profiles: Map<string, Profile>;
  projects: Map<string, Project>;
  properties: Map<string, Property>; // keyed by projectId
  images: Map<string, PropertyImage>; // keyed by imageId
  jobs: Map<string, ProcessingJob>; // keyed by jobId
  conversations: Map<string, Conversation>; // keyed by conversationId
  messages: Map<string, Message>; // keyed by messageId
  /** dev-auth: email -> userId */
  usersByEmail: Map<string, string>;
}

const GLOBAL_KEY = "__listingai_memory_store__";

type GlobalWithStore = typeof globalThis & { [GLOBAL_KEY]?: MemoryStore };

function createStore(): MemoryStore {
  return {
    profiles: new Map(),
    projects: new Map(),
    properties: new Map(),
    images: new Map(),
    jobs: new Map(),
    conversations: new Map(),
    messages: new Map(),
    usersByEmail: new Map(),
  };
}

export function getMemoryStore(): MemoryStore {
  const g = globalThis as GlobalWithStore;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = createStore();
  }
  return g[GLOBAL_KEY];
}
