import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { requireUser } from "@/server/auth/require-user";
import { AppHeader } from "@/components/app-header";
import { NewProjectForm } from "@/features/projects/new-project-form";

const STEPS = [
  "Validate the listing URL",
  "Retrieve property data via the provider",
  "Import and group photos by room",
  "Assemble the AI property context",
];

export default async function NewProjectPage() {
  const { user } = await requireUser();

  return (
    <div className="min-h-dvh">
      <AppHeader user={user} />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to dashboard
        </Link>

        <div className="mt-6">
          <p className="eyebrow">New listing</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Import a listing</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Paste a Zillow home-details URL. We validate and store it, then process it through the ingestion
            provider — we never scrape the page from your browser.
          </p>
        </div>

        <div className="mt-8 panel rounded-xl p-6">
          <NewProjectForm />
        </div>

        <div className="mt-8 rounded-xl border border-border bg-card/50 p-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="size-4 text-primary" />
            What happens next
          </div>
          <ol className="mt-3 space-y-2">
            {STEPS.map((step, i) => (
              <li key={step} className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent font-mono text-[11px] text-foreground">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </main>
    </div>
  );
}
