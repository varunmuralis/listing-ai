import { LoaderCircle } from "lucide-react";

/** App-level navigation fallback shown while a route segment streams in. */
export default function Loading() {
  return (
    <div className="grid min-h-dvh place-items-center" role="status" aria-live="polite">
      <div className="flex items-center gap-3 text-muted-foreground">
        <LoaderCircle className="size-5 animate-spin text-primary" />
        <span className="text-sm">Loading…</span>
      </div>
    </div>
  );
}
