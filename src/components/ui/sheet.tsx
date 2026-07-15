"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

type Side = "left" | "right" | "bottom" | "top";

const sideClasses: Record<Side, string> = {
  left: "inset-y-0 left-0 h-full w-80 max-w-[85vw] border-r data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left",
  right: "inset-y-0 right-0 h-full w-80 max-w-[85vw] border-l data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
  bottom:
    "inset-x-0 bottom-0 max-h-[85vh] rounded-t-xl border-t data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
  top: "inset-x-0 top-0 max-h-[85vh] rounded-b-xl border-b data-[state=open]:slide-in-from-top data-[state=closed]:slide-out-to-top",
};

export const SheetContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { side?: Side }
>(({ className, children, side = "left", ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed z-50 bg-popover p-5 shadow-2xl transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:duration-300 data-[state=closed]:duration-200 focus:outline-none",
        sideClasses[side],
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
        <X className="size-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
SheetContent.displayName = "SheetContent";

export const SheetTitle = DialogPrimitive.Title;
export const SheetDescription = DialogPrimitive.Description;
