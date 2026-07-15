import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/require-user";
import { getWorkspace } from "@/server/services/project-service";
import { RoomSummaryGrid } from "@/features/media/room-summary";

export default async function RoomsPage(props: PageProps<"/projects/[projectId]/rooms">) {
  const { projectId } = await props.params;
  const { user, repos } = await requireUser();

  const workspace = await getWorkspace(repos, user.id, projectId);
  if (!workspace.ok) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <p className="eyebrow">Rooms</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">Room groups</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Photos grouped by detected room type. Open a group to review or correct its classifications. These are
          photo groupings only — no room dimensions or spatial accuracy are inferred.
        </p>
      </header>
      <RoomSummaryGrid projectId={projectId} images={workspace.data.images} />
    </div>
  );
}
