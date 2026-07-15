import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { serverEnv, isSupabaseConfigured } from "@/lib/env/server";
import { getMemoryStore } from "@/server/repositories/memory/store";
import { createMemoryRepositories } from "@/server/repositories/memory";
import type { AuthMode, SessionUser } from "@/server/auth/types";

/**
 * Auth abstraction. In production (Supabase configured) sessions come from
 * Supabase Auth. In local dev a signed cookie stands in, backed by the in-memory
 * store. Both paths resolve to the same `SessionUser` shape.
 */

const DEV_COOKIE = "listingai_dev_session";

export function getAuthMode(): AuthMode {
  return isSupabaseConfigured ? "supabase" : "dev";
}

function sign(userId: string): string {
  const mac = createHmac("sha256", serverEnv.APP_SESSION_SECRET).update(userId).digest("hex");
  return `${userId}.${mac}`;
}

function verify(token: string): string | null {
  const idx = token.lastIndexOf(".");
  if (idx <= 0) return null;
  const userId = token.slice(0, idx);
  const provided = token.slice(idx + 1);
  const expected = createHmac("sha256", serverEnv.APP_SESSION_SECRET).update(userId).digest("hex");
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return userId;
}

async function getDevUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(DEV_COOKIE)?.value;
  if (!token) return null;
  const userId = verify(token);
  if (!userId) return null;
  const store = getMemoryStore();
  const profile = store.profiles.get(userId);
  if (!profile) return null;
  const email = [...store.usersByEmail.entries()].find(([, uid]) => uid === userId)?.[0] ?? "";
  return { id: userId, email, fullName: profile.fullName };
}

async function getSupabaseUser(): Promise<SessionUser | null> {
  const { createSupabaseServerClient } = await import("@/lib/database/supabase-server");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const meta = data.user.user_metadata as { full_name?: string } | undefined;
  return {
    id: data.user.id,
    email: data.user.email ?? "",
    fullName: meta?.full_name ?? null,
  };
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  return isSupabaseConfigured ? getSupabaseUser() : getDevUser();
}

/** Dev-only email sign-in: finds or creates a user and sets the session cookie. */
export async function devSignIn(email: string, fullName: string | null): Promise<SessionUser> {
  const store = getMemoryStore();
  const normalizedEmail = email.trim().toLowerCase();
  let userId = store.usersByEmail.get(normalizedEmail);
  if (!userId) {
    userId = crypto.randomUUID();
    store.usersByEmail.set(normalizedEmail, userId);
  }
  const repos = createMemoryRepositories();
  const profile = await repos.profiles.upsert({ id: userId, fullName });
  const cookieStore = await cookies();
  cookieStore.set(DEV_COOKIE, sign(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: serverEnv.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return { id: userId, email: normalizedEmail, fullName: profile.fullName };
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured) {
    const { createSupabaseServerClient } = await import("@/lib/database/supabase-server");
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    return;
  }
  const cookieStore = await cookies();
  cookieStore.delete(DEV_COOKIE);
}
