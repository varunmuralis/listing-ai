"use client";

import * as React from "react";
import { useActionState } from "react";
import { ArrowRight, Link2, LoaderCircle, CircleCheck, CircleAlert } from "lucide-react";
import { createProjectAction } from "@/server/actions/project-actions";
import { idleState } from "@/server/actions/action-state";
import { validateListingUrl } from "@/lib/validation/listing-url";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SAMPLE_URL =
  "https://www.zillow.com/homedetails/1420-Maplewood-Dr-Austin-TX-78704/70982345_zpid/";

export function NewProjectForm() {
  const [value, setValue] = React.useState("");
  const [state, action, pending] = useActionState(createProjectAction, idleState);

  const trimmed = value.trim();
  const clientValidation = trimmed ? validateListingUrl(trimmed) : null;
  const serverError = state.fieldErrors?.sourceUrl?.[0] ?? (state.status === "error" ? state.message : undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sourceUrl">Zillow listing URL</Label>
        <div className="relative">
          <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="sourceUrl"
            name="sourceUrl"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://www.zillow.com/homedetails/.../_zpid/"
            className="pl-9 pr-9 font-mono text-xs sm:text-sm"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={clientValidation ? !clientValidation.valid : undefined}
            aria-describedby="url-hint"
          />
          {clientValidation ? (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              {clientValidation.valid ? (
                <CircleCheck className="size-4 text-[color:var(--success)]" />
              ) : (
                <CircleAlert className="size-4 text-destructive" />
              )}
            </span>
          ) : null}
        </div>
        <p id="url-hint" className="min-h-4 text-xs">
          {clientValidation && !clientValidation.valid ? (
            <span className="text-destructive">{clientValidation.error}</span>
          ) : serverError ? (
            <span className="text-destructive">{serverError}</span>
          ) : (
            <span className="text-muted-foreground">
              Must be an https zillow.com home-details link.{" "}
              <button
                type="button"
                onClick={() => setValue(SAMPLE_URL)}
                className="text-primary underline-offset-2 hover:underline"
              >
                Use a sample
              </button>
            </span>
          )}
        </p>
      </div>

      <Button type="submit" size="lg" disabled={pending || (clientValidation ? !clientValidation.valid : false)}>
        {pending ? <LoaderCircle className="animate-spin" /> : null}
        Import listing
        {!pending ? <ArrowRight className="size-4" /> : null}
      </Button>
    </form>
  );
}
