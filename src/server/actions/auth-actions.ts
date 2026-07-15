"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/env/server";
import { devSignIn, signOut } from "@/server/auth/session";
import { type ActionState, errorState } from "@/server/actions/action-state";

const devSignInSchema = z.object({
  email: z.email("Enter a valid email address."),
  fullName: z.string().trim().max(120).optional(),
});

const supabaseSignInSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  intent: z.enum(["signin", "signup"]).default("signin"),
  fullName: z.string().trim().max(120).optional(),
});

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured) {
    const parsed = devSignInSchema.safeParse({
      email: formData.get("email"),
      fullName: formData.get("fullName") || undefined,
    });
    if (!parsed.success) {
      return errorState("Please fix the errors below.", z.flattenError(parsed.error).fieldErrors);
    }
    try {
      await devSignIn(parsed.data.email, parsed.data.fullName ?? null);
    } catch (error) {
      console.error("devSignIn failed:", error);
      return errorState("We couldn't sign you in. Please try again.");
    }
    redirect("/dashboard");
  }

  const parsed = supabaseSignInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    intent: formData.get("intent") || "signin",
    fullName: formData.get("fullName") || undefined,
  });
  if (!parsed.success) {
    return errorState("Please fix the errors below.", z.flattenError(parsed.error).fieldErrors);
  }

  const { createSupabaseServerClient } = await import("@/lib/database/supabase-server");
  const supabase = await createSupabaseServerClient();
  const { email, password, intent, fullName } = parsed.data;

  if (intent === "signup") {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName ?? null } },
    });
    if (error) return errorState(error.message);
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return errorState(error.message);
  }
  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  try {
    await signOut();
  } catch (error) {
    // Sign-out should always land the user on the sign-in page.
    console.error("signOut failed:", error);
  }
  redirect("/sign-in");
}
