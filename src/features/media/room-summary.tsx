import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ROOM_TYPES, type PropertyImage, type RoomType } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { ROOM_VISUALS, confidenceLabel } from "@/features/media/room-visuals";
import { imageDisplayUrl, representativeImage } from "@/features/media/image-url";

interface RoomGroup {
  roomType: RoomType;
  images: PropertyImage[];
  avgConfidence: number;
  representative: PropertyImage;
}

function groupByRoom(images: PropertyImage[]): RoomGroup[] {
  const byType = new Map<RoomType, PropertyImage[]>();
  for (const image of images) {
    const list = byType.get(image.roomType) ?? [];
    list.push(image);
    byType.set(image.roomType, list);
  }
  return ROOM_TYPES.flatMap((roomType) => {
    const group = byType.get(roomType);
    if (!group || group.length === 0) return [];
    const representative = representativeImage(group);
    if (!representative) return [];
    const avgConfidence = group.reduce((sum, img) => sum + img.roomConfidence, 0) / group.length;
    return [{ roomType, images: group, avgConfidence, representative }];
  });
}

/** Grouped room summary — representative image, count, confidence, deep link. */
export function RoomSummaryGrid({ projectId, images }: { projectId: string; images: PropertyImage[] }) {
  const groups = groupByRoom(images);

  if (groups.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
        No classified photos yet.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((group) => {
        const visual = ROOM_VISUALS[group.roomType];
        const confidence = confidenceLabel(group.avgConfidence);
        return (
          <Link
            key={group.roomType}
            href={`/projects/${projectId}/photos?room=${group.roomType}`}
            className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-muted">
              <Image
                src={imageDisplayUrl(group.representative)}
                alt={`${visual.label} — representative photo`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
              <span
                className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-background/85 px-2.5 py-1 text-xs font-medium backdrop-blur"
                style={{ color: visual.color }}
              >
                <visual.Icon className="size-3.5" />
                {visual.label}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 p-4">
              <div>
                <p className="text-sm font-medium">
                  {group.images.length} {group.images.length === 1 ? "photo" : "photos"}
                </p>
                <Badge variant={confidence.tone} className="mt-1">
                  {confidence.label}
                </Badge>
              </div>
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
