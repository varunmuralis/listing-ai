import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/require-user";
import { getWorkspace } from "@/server/services/project-service";
import { ListingEditor } from "@/features/listing-editor/listing-editor";

export default async function DetailsPage(props: PageProps<"/projects/[projectId]/details">) {
  const { projectId } = await props.params;
  const { user, repos } = await requireUser();

  const workspace = await getWorkspace(repos, user.id, projectId);
  if (!workspace.ok) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <p className="eyebrow">Property details</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">Edit listing</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Update the imported data. Leave a field blank to mark it unavailable.
        </p>
      </header>
      <ListingEditor
        projectId={projectId}
        title={workspace.data.project.title}
        property={workspace.data.property}
      />
    </div>
  );
}
