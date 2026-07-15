import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Bath, Bed, CalendarDays, Images, Ruler } from "lucide-react";
import { requireUser } from "@/server/auth/require-user";
import { getWorkspace } from "@/server/services/project-service";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { RoomType } from "@/types/domain";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { ProjectStatusBadge } from "@/features/projects/project-status";
import { ROOM_VISUALS } from "@/features/media/room-visuals";

// TODO(workspace-milestone): this is a minimal read-only overview that surfaces
// already-ingested data so the "Open workspace" navigation resolves instead of
// 404ing. The full workspace shell (left/sheet nav) plus the Photos, Rooms, 3D,
// Map, Mortgage, AI Agent, and Settings sections — and the listing editor — are
// the next milestone. See HANDOFF.md priorities #1–#8.
const PENDING_SECTIONS = ["Photos", "Rooms", "3D", "Map", "Mortgage", "AI Agent", "Settings"];

export default async function WorkspaceOverviewPage(props: PageProps<"/projects/[projectId]">) {
  const { projectId } = await props.params;
  const { user, repos } = await requireUser();

  const workspace = await getWorkspace(repos, user.id, projectId);
  if (!workspace.ok) notFound();

  const { project, property, images } = workspace.data;

  // Still importing — send the user to the live processing view.
  if (project.status !== "ready") {
    redirect(`/projects/${projectId}/processing`);
  }

  const address = [property?.addressLine1, property?.city, property?.region, property?.postalCode]
    .filter(Boolean)
    .join(", ");

  const roomCounts = new Map<RoomType, number>();
  for (const image of images) roomCounts.set(image.roomType, (roomCounts.get(image.roomType) ?? 0) + 1);

  const stats: Array<{ icon: typeof Bed; label: string; value: string }> = [
    { icon: Bed, label: "Beds", value: property?.bedrooms != null ? String(property.bedrooms) : "—" },
    { icon: Bath, label: "Baths", value: property?.bathrooms != null ? String(property.bathrooms) : "—" },
    { icon: Ruler, label: "Sq ft", value: formatNumber(property?.squareFeet) },
    { icon: CalendarDays, label: "Built", value: property?.yearBuilt != null ? String(property.yearBuilt) : "—" },
    { icon: Images, label: "Photos", value: String(images.length) },
  ];

  return (
    <div className="min-h-dvh">
      <AppHeader user={user} />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to dashboard
        </Link>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Listing overview</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{address || project.title}</h1>
          </div>
          <div className="flex items-center gap-3">
            {property?.price != null ? (
              <span className="font-mono text-xl font-semibold text-primary">{formatCurrency(property.price)}</span>
            ) : null}
            <ProjectStatusBadge status={project.status} />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
              <stat.icon className="size-4 text-muted-foreground" />
              <p className="mt-2 text-lg font-semibold tabular-nums">{stat.value}</p>
              <p className="eyebrow mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {property?.description ? (
          <section className="mt-6 rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold">Description</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{property.description}</p>
          </section>
        ) : null}

        {property?.amenities?.length ? (
          <section className="mt-6">
            <h2 className="text-sm font-semibold">Amenities</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {property.amenities.map((amenity) => (
                <Badge key={amenity} variant="outline">
                  {amenity}
                </Badge>
              ))}
            </div>
          </section>
        ) : null}

        {roomCounts.size ? (
          <section className="mt-6">
            <h2 className="text-sm font-semibold">Detected photo groups</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {[...roomCounts.entries()].map(([roomType, count]) => {
                const visual = ROOM_VISUALS[roomType];
                return (
                  <span
                    key={roomType}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs"
                  >
                    <visual.Icon className="size-3.5" style={{ color: visual.color }} />
                    {visual.label}
                    <span className="text-muted-foreground">· {count}</span>
                  </span>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="mt-8 rounded-xl border border-dashed border-border bg-card/40 p-5">
          <h2 className="text-sm font-semibold">Workspace sections</h2>
          <p className="mt-1 text-sm text-muted-foreground">These modules are in development.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {PENDING_SECTIONS.map((section) => (
              <Badge key={section} variant="default" className="opacity-70">
                {section} · soon
              </Badge>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
