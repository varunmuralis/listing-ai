"use client";

import * as React from "react";
import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { signInAction } from "@/server/actions/auth-actions";
import { idleState } from "@/server/actions/action-state";
import type { AuthMode } from "@/server/auth/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-xs text-destructive">{errors[0]}</p>;
}

export function SignInForm({ mode }: { mode: AuthMode }) {
  const [intent, setIntent] = React.useState<"signin" | "signup">("signin");
  const [state, action, pending] = useActionState(signInAction, idleState);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="intent" value={intent} />

      {mode === "dev" || intent === "signup" ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fullName">Full name {mode === "dev" ? "(optional)" : null}</Label>
          <Input id="fullName" name="fullName" autoComplete="name" placeholder="Jordan Rivera" />
          <FieldError errors={state.fieldErrors?.fullName} />
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
        <FieldError errors={state.fieldErrors?.email} />
      </div>

      {mode === "supabase" ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={intent === "signup" ? "new-password" : "current-password"}
            placeholder="••••••••"
            required
          />
          <FieldError errors={state.fieldErrors?.password} />
        </div>
      ) : null}

      {state.status === "error" && state.message ? (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending} className="mt-1">
        {pending ? <LoaderCircle className="animate-spin" /> : null}
        {mode === "dev" ? "Continue" : intent === "signup" ? "Create account" : "Sign in"}
      </Button>

      {mode === "supabase" ? (
        <button
          type="button"
          onClick={() => setIntent((i) => (i === "signin" ? "signup" : "signin"))}
          className="text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {intent === "signin" ? "No account? Create one" : "Already have an account? Sign in"}
        </button>
      ) : (
        <p className="text-center text-xs text-muted-foreground">
          Local dev mode — email only, no password. Your data lives in an in-memory store.
        </p>
      )}
    </form>
  );
}
