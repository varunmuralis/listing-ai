"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, LogOut, Menu } from "lucide-react";
import type { ProjectStatus } from "@/types/domain";
import { cn, timeAgo } from "@/lib/utils";
import { BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ProjectStatusBadge } from "@/features/projects/project-status";
import { signOutAction } from "@/server/actions/auth-actions";
import {
  SaveStateIndicator,
  SaveStatusProvider,
  useSaveStatus,
} from "@/features/workspace/save-status";
import { WORKSPACE_SECTIONS, isSectionActive, sectionHref } from "@/features/workspace/nav-items";

export interface WorkspaceChrome {
  id: string;
  title: string;
  status: ProjectStatus;
  updatedAt: string;
}

export function WorkspaceShell({
  project,
  children,
}: {
  project: WorkspaceChrome;
  children: React.ReactNode;
}) {
  return (
    <SaveStatusProvider>
      <div className="min-h-dvh md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
        <DesktopSidebar project={project} />
        <div className="flex min-w-0 flex-col">
          <TopBar project={project} />
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </SaveStatusProvider>
  );
}

/** Guards in-app navigation when the editor has unsaved changes. */
function useUnsavedGuard() {
  const { hasUnsaved } = useSaveStatus();
  const pathname = usePathname();
  return React.useCallback(
    (href: string): ((event: React.MouseEvent) => void) | undefined => {
      if (href === pathname) return undefined;
      return (event: React.MouseEvent) => {
        if (hasUnsaved && !window.confirm("You have unsaved changes. Leave without saving?")) {
          event.preventDefault();
        }
      };
    },
    [hasUnsaved, pathname],
  );
}

function NavList({ projectId, onNavigate }: { projectId: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const guard = useUnsavedGuard();

  return (
    <nav className="flex flex-col gap-1" aria-label="Workspace sections">
      {WORKSPACE_SECTIONS.map((section) => {
        const href = sectionHref(projectId, section);
        const active = isSectionActive(pathname, projectId, section);
        const onGuard = guard(href);
        return (
          <Link
            key={section.key}
            href={href}
            aria-current={active ? "page" : undefined}
            onClick={(event) => {
              onGuard?.(event);
              if (!event.defaultPrevented) onNavigate?.();
            }}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            <section.icon className="size-4 shrink-0" />
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}

function DesktopSidebar({ project }: { project: WorkspaceChrome }) {
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border bg-surface/40 p-4 md:flex">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <BrandMark />
      </Link>
      <NavList projectId={project.id} />
      <div className="mt-auto">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          All projects
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

function TopBar({ project }: { project: WorkspaceChrome }) {
  const [open, setOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72">
          <SheetTitle className="sr-only">Workspace navigation</SheetTitle>
          <div className="mb-6">
            <BrandMark />
          </div>
          <NavList projectId={project.id} onNavigate={() => setOpen(false)} />
          <div className="mt-6 border-t border-border pt-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              All projects
            </Link>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <h1 className="min-w-0 truncate text-sm font-semibold sm:text-base">{project.title}</h1>
        <ProjectStatusBadge status={project.status} />
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <SaveStateIndicator />
        <span className="hidden text-xs text-muted-foreground lg:inline">Updated {timeAgo(project.updatedAt)}</span>
      </div>
    </header>
  );
}
