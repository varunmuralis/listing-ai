import Link from "next/link";
import { LogOut } from "lucide-react";
import { BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/server/actions/auth-actions";
import type { SessionUser } from "@/server/auth/types";

function initials(user: SessionUser): string {
  const source = user.fullName?.trim() || user.email;
  return source.slice(0, 2).toUpperCase();
}

/** Top application header for dashboard-level pages. */
export function AppHeader({ user }: { user: SessionUser }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/dashboard" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <BrandMark />
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <span
              aria-hidden
              className="grid size-8 place-items-center rounded-full bg-accent text-xs font-medium text-foreground"
            >
              {initials(user)}
            </span>
            <span className="max-w-[14rem] truncate text-sm text-muted-foreground">{user.email}</span>
          </div>
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm" aria-label="Sign out">
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
