import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { serverEnv, isSupabaseConfigured } from "@/lib/env/server";

/**
 * Supabase server clients. The request-scoped client carries the user's session
 * cookies so Row Level Security applies. The admin client (service role) is used
 * only for trusted server-side maintenance and never exposed to the browser.
 */

function requireConfig(): { url: string; anonKey: string } {
  if (!isSupabaseConfigured || !serverEnv.NEXT_PUBLIC_SUPABASE_URL || !serverEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Supabase is not configured");
  }
  return { url: serverEnv.NEXT_PUBLIC_SUPABASE_URL, anonKey: serverEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY };
}

export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const { url, anonKey } = requireConfig();
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // `setAll` may be called from a Server Component render where cookies
          // are read-only; the proxy refreshes the session so this is safe to ignore.
        }
      },
    },
  });
}

export function createSupabaseAdminClient(): SupabaseClient {
  const { url } = requireConfig();
  if (!serverEnv.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase service role key is not configured");
  }
  return createClient(url, serverEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
