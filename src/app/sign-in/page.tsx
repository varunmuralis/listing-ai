import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthMode } from "@/server/auth/session";
import { getCurrentUser } from "@/server/auth/session";
import { BrandMark } from "@/components/brand";
import { SignInForm } from "@/features/auth/sign-in-form";

const CAPABILITIES = [
  "Editable listing data",
  "Room-grouped photos",
  "Grounded property assistant",
  "Mortgage modeling",
  "Property map",
  "Spatial 3D preview",
];

export default async function SignInPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const mode = getAuthMode();

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_minmax(0,0.9fr)]">
      {/* Left: thesis panel */}
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-border p-10 lg:flex">
        <div className="absolute inset-0 -z-10 app-ambient" />
        <BrandMark />
        <div className="max-w-lg">
          <p className="eyebrow mb-4">Listing intelligence workspace</p>
          <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-foreground">
            Every listing becomes an interactive workspace.
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Import a listing and ListingAI assembles the data, groups the photos by room, and stands up a
            property-specific assistant that only speaks from verified facts.
          </p>
          <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3">
            {CAPABILITIES.map((cap) => (
              <li key={cap} className="flex items-center gap-2 text-sm text-foreground/80">
                <span className="size-1.5 rounded-full bg-primary" />
                {cap}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">
          Listing data is ingested through a licensed provider boundary — never scraped in the browser.
        </p>
      </section>

      {/* Right: auth */}
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <BrandMark />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {mode === "dev"
              ? "Enter an email to open your dev workspace."
              : "Welcome back — sign in to your workspace."}
          </p>
          <div className="mt-6 panel rounded-xl p-6">
            <SignInForm mode={mode} />
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing you agree this is a demo product.{" "}
            <Link href="/" className="underline underline-offset-4 hover:text-foreground">
              Back home
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
