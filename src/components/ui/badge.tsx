import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-border bg-accent text-accent-foreground",
        primary: "border-primary/30 bg-primary/15 text-primary",
        success: "border-[color:var(--success)]/30 bg-[color:var(--success)]/12 text-[color:var(--success)]",
        warning: "border-[color:var(--warning)]/30 bg-[color:var(--warning)]/12 text-[color:var(--warning)]",
        destructive: "border-destructive/30 bg-destructive/15 text-destructive",
        outline: "border-border bg-transparent text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
