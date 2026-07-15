import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ExternalLink, Pencil } from "lucide-react";
import { requireUser } from "@/server/auth/require-user";
import { getWorkspace } from "@/server/services/project-service";
import { formatCurrency, timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PropertyFacts } from "@/features/workspace/property-facts";
import { RoomSummaryGrid } from "@/features/media/room-summary";
import { imageDisplayUrl, representativeImage } from "@/features/media/image-url";

export default async function OverviewPage(props: PageProps<"/projects/[projectId]">) {
  const { projectId } = await props.params;
  const { user, repos } = await requireUser();

  const workspace = await getWorkspace(repos, user.id, projectId);
  if (!workspace.ok) notFound();
  const { project, property, images } = workspace.data;

  const address = [property?.addressLine1, property?.city, property?.region, property?.postalCode]
    .filter(Boolean)
    .join(", ");
  const hero = representativeImage(images);
  let sourceHost = "listing";
  try {
    sourceHost = new URL(project.sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    sourceHost = "listing";
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Hero */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="relative aspect-[16/7] bg-muted">
          {hero ? (
            <Image
              src={imageDisplayUrl(hero)}
              alt={address ? `${address} — hero photo` : "Property hero photo"}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
              No photos imported
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-5 sm:p-6">
            <div className="min-w-0">
              <p className="eyebrow text-white/70">Listing overview</p>
              <h2 className="mt-1 truncate text-xl font-semibold text-white sm:text-2xl">
                {address || project.title}
              </h2>
            </div>
            {property?.price != null ? (
              <span className="font-mono text-2xl font-semibold text-white">{formatCurrency(property.price)}</span>
            ) : null}
          </div>
        </div>
      </section>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <span>Imported {timeAgo(project.createdAt)}</span>
        <span>Updated {timeAgo(project.updatedAt)}</span>
        <a
          href={project.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-foreground/80 transition-colors hover:text-foreground"
        >
          <ExternalLink className="size-3.5" />
          {sourceHost}
        </a>
        <Button asChild size="sm" variant="outline" className="ml-auto">
          <Link href={`/projects/${projectId}/details`}>
            <Pencil className="size-4" />
            Edit details
          </Link>
        </Button>
      </div>

      {/* Facts */}
      <section>
        <h3 className="mb-3 text-sm font-semibold">Key facts</h3>
        <PropertyFacts property={property} />
      </section>

      {/* Description */}
      <section>
        <h3 className="mb-3 text-sm font-semibold">Description</h3>
        {property?.description ? (
          <p className="rounded-xl border border-border bg-card p-5 text-sm leading-relaxed text-muted-foreground">
            {property.description}
          </p>
        ) : (
          <p className="rounded-xl border border-dashed border-border bg-card/40 p-5 text-sm text-muted-foreground">
            No description provided.{" "}
            <Link href={`/projects/${projectId}/details`} className="text-primary hover:underline">
              Add one
            </Link>
            .
          </p>
        )}
      </section>

      {/* Amenities */}
      <section>
        <h3 className="mb-3 text-sm font-semibold">Amenities</h3>
        {property?.amenities?.length ? (
          <div className="flex flex-wrap gap-2">
            {property.amenities.map((amenity) => (
              <Badge key={amenity} variant="outline">
                {amenity}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No amenities listed.</p>
        )}
      </section>

      {/* Rooms */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Rooms</h3>
          <Link
            href={`/projects/${projectId}/rooms`}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            View all
            <ArrowRight className="size-4" />
          </Link>
        </div>
        <RoomSummaryGrid projectId={projectId} images={images} />
      </section>
    </div>
  );
}
