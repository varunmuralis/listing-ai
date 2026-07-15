"use client";

import { Toaster as SonnerToaster } from "sonner";

/** App-wide toast host, themed to the dark workspace. */
export function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "!bg-popover !border-border !text-popover-foreground !rounded-lg",
          description: "!text-muted-foreground",
          actionButton: "!bg-primary !text-primary-foreground",
        },
      }}
    />
  );
}
