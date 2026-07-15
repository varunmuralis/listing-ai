"use client";

import * as React from "react";
import { Check, CircleAlert, Dot, LoaderCircle } from "lucide-react";

/**
 * Shared save-state for the workspace. The listing editor drives these
 * transitions; the top bar and the nav's unsaved-change guard read them. Lives
 * in the workspace shell so it spans the top bar and the (server-rendered)
 * editor page beneath it.
 */
export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

interface SaveStatusContextValue {
  state: SaveState;
  setState: React.Dispatch<React.SetStateAction<SaveState>>;
  hasUnsaved: boolean;
}

const SaveStatusContext = React.createContext<SaveStatusContextValue | null>(null);

export function SaveStatusProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<SaveState>("idle");
  const hasUnsaved = state === "dirty" || state === "error";

  // Warn on browser unload/refresh while there are unsaved edits.
  React.useEffect(() => {
    if (!hasUnsaved) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsaved]);

  const value = React.useMemo(() => ({ state, setState, hasUnsaved }), [state, hasUnsaved]);
  return <SaveStatusContext.Provider value={value}>{children}</SaveStatusContext.Provider>;
}

export function useSaveStatus(): SaveStatusContextValue {
  const ctx = React.useContext(SaveStatusContext);
  if (!ctx) throw new Error("useSaveStatus must be used within a SaveStatusProvider");
  return ctx;
}

/** Compact save-state indicator for the top bar. */
export function SaveStateIndicator() {
  const { state } = useSaveStatus();
  if (state === "idle") return null;

  const map: Record<Exclude<SaveState, "idle">, { icon: React.ReactNode; label: string; className: string }> = {
    dirty: { icon: <Dot className="size-5" />, label: "Unsaved changes", className: "text-[color:var(--warning)]" },
    saving: { icon: <LoaderCircle className="size-3.5 animate-spin" />, label: "Saving…", className: "text-muted-foreground" },
    saved: { icon: <Check className="size-3.5" />, label: "Saved", className: "text-[color:var(--success)]" },
    error: { icon: <CircleAlert className="size-3.5" />, label: "Save failed", className: "text-destructive" },
  };
  const meta = map[state];

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${meta.className}`}
      role="status"
      aria-live="polite"
    >
      {meta.icon}
      <span className="hidden sm:inline">{meta.label}</span>
    </span>
  );
}
