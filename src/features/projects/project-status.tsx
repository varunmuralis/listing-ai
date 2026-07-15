import { Badge } from "@/components/ui/badge";
import type { ProjectStatus } from "@/types/domain";

const STATUS_META: Record<ProjectStatus, { label: string; variant: "primary" | "success" | "warning" | "destructive" | "outline" }> = {
  draft: { label: "Draft", variant: "outline" },
  processing: { label: "Processing", variant: "warning" },
  ready: { label: "Ready", variant: "success" },
  failed: { label: "Failed", variant: "destructive" },
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge variant={meta.variant}>
      {status === "processing" ? <span className="size-1.5 animate-pulse rounded-full bg-current" /> : null}
      {meta.label}
    </Badge>
  );
}
