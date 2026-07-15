import { cn } from "@/lib/utils";

/** ListingAI wordmark. A hollow keystone glyph nods at architecture/blueprints. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 2.5 3.5 8v13h17V8L12 2.5Z"
          stroke="var(--primary)"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M9.5 21v-6.5h5V21" stroke="var(--primary)" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
      <span className="text-[15px] font-semibold tracking-tight text-foreground">
        Listing<span className="text-primary">AI</span>
      </span>
    </span>
  );
}
