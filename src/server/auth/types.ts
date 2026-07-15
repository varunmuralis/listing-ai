export interface SessionUser {
  id: string;
  email: string;
  fullName: string | null;
}

/** Which auth backend is active, surfaced to UI so it renders the right form. */
export type AuthMode = "supabase" | "dev";
