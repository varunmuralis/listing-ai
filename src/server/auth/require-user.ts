import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { getRepositories } from "@/server/repositories";
import type { SessionUser } from "@/server/auth/types";
import type { Repositories } from "@/server/repositories/types";

/** Redirect to sign-in unless authenticated. Returns the session user + repos. */
export async function requireUser(): Promise<{ user: SessionUser; repos: Repositories }> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }
  const repos = await getRepositories();
  return { user, repos };
}
