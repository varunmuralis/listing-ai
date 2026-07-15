"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle, Trash2 } from "lucide-react";
import { deleteProjectAction } from "@/server/actions/project-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      Delete permanently
    </Button>
  );
}

export function DeleteProjectDialog({ projectId, projectTitle }: { projectId: string; projectTitle: string }) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 className="size-4" />
          Delete project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this project?</DialogTitle>
          <DialogDescription>
            This permanently removes <span className="font-medium text-foreground">{projectTitle}</span>, its imported
            photos, and its data. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <form action={deleteProjectAction} className="mt-4 flex justify-end gap-2">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="redirectTo" value="/dashboard" />
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <DeleteButton />
        </form>
      </DialogContent>
    </Dialog>
  );
}
