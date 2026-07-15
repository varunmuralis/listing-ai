"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LoaderCircle } from "lucide-react";
import { updateProjectTitleAction } from "@/server/actions/project-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProjectTitleForm({ projectId, initialTitle }: { projectId: string; initialTitle: string }) {
  const router = useRouter();
  const [title, setTitle] = React.useState(initialTitle);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const dirty = title.trim() !== initialTitle.trim();

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateProjectTitleAction(projectId, title);
      if (result.ok) {
        toast.success("Title updated");
        router.refresh();
      } else {
        setError(result.error ?? "We couldn't update the title.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <Label htmlFor="project-title">Project title</Label>
      <div className="flex gap-2">
        <Input
          id="project-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={!!error}
          maxLength={200}
        />
        <Button type="submit" variant="secondary" disabled={!dirty || pending}>
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
          Save
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </form>
  );
}
