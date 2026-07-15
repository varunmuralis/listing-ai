import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/require-user";
import { getWorkspace } from "@/server/services/project-service";
import { PhotoGallery } from "@/features/media/photo-gallery";

export default async function PhotosPage(props: PageProps<"/projects/[projectId]/photos">) {
  const { projectId } = await props.params;
  const { room } = await props.searchParams;
  const { user, repos } = await requireUser();

  const workspace = await getWorkspace(repos, user.id, projectId);
  if (!workspace.ok) notFound();

  const initialRoom = typeof room === "string" ? room : undefined;

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <p className="eyebrow">Photos</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">
          {workspace.data.images.length} {workspace.data.images.length === 1 ? "photo" : "photos"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Filter by room, inspect source metadata, and correct classifications.
        </p>
      </header>
      <PhotoGallery projectId={projectId} images={workspace.data.images} initialRoom={initialRoom} />
    </div>
  );
}
