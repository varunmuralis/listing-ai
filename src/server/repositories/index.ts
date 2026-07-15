import "server-only";
import { isSupabaseConfigured } from "@/lib/env/server";
import { createMemoryRepositories } from "@/server/repositories/memory";
import type { Repositories } from "@/server/repositories/types";

/**
 * Repository factory. Returns the Supabase-backed repositories when configured,
 * otherwise the in-memory dev adapter. Consumers depend only on the
 * `Repositories` interface, never on the concrete backend.
 */
export async function getRepositories(): Promise<Repositories> {
  if (isSupabaseConfigured) {
    const [{ createSupabaseServerClient }, { createSupabaseRepositories }] = await Promise.all([
      import("@/lib/database/supabase-server"),
      import("@/server/repositories/supabase"),
    ]);
    const db = await createSupabaseServerClient();
    return createSupabaseRepositories(db);
  }
  return createMemoryRepositories();
}

export type { Repositories } from "@/server/repositories/types";
