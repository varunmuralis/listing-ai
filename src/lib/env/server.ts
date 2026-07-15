import "server-only";
import { z } from "zod";

/**
 * Server-only environment access. Never import this from a Client Component.
 *
 * Every external credential is optional so the app boots in local development
 * without Supabase, Mapbox, or OpenAI. Consumers branch on the `*Configured`
 * flags and render intentional "unavailable" states instead of crashing.
 */
const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Supabase (production persistence/auth). Absent => in-memory dev adapter.
  NEXT_PUBLIC_SUPABASE_URL: z.url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // OpenAI-compatible AI. Absent => grounded MockAIProvider.
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_BASE_URL: z.url().optional(),
  OPENAI_MODEL: z.string().min(1).default("gpt-4o-mini"),

  // Mapbox public token (also read on client via env/client).
  NEXT_PUBLIC_MAPBOX_TOKEN: z.string().min(1).optional(),

  // Listing ingestion provider selection.
  LISTING_PROVIDER: z.enum(["mock", "manual"]).default("mock"),

  // Room classifier selection.
  ROOM_CLASSIFIER: z.enum(["heuristic", "ai"]).default("heuristic"),

  // Secret used to sign the local dev-auth session cookie.
  APP_SESSION_SECRET: z.string().min(1).default("dev-insecure-session-secret"),
});

const parsed = serverSchema.safeParse(process.env);

if (!parsed.success) {
  // Misconfiguration of a *provided* value is fatal; missing optional values are not.
  console.error("Invalid server environment configuration:", z.treeifyError(parsed.error));
  throw new Error("Invalid server environment configuration");
}

export const serverEnv = parsed.data;

export const isSupabaseConfigured = Boolean(
  serverEnv.NEXT_PUBLIC_SUPABASE_URL &&
    serverEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
);

export const isOpenAIConfigured = Boolean(serverEnv.OPENAI_API_KEY);

export const isMapboxConfigured = Boolean(serverEnv.NEXT_PUBLIC_MAPBOX_TOKEN);
