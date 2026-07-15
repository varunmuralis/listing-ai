"use client";

import * as React from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { ROOM_TYPES, type PropertyImage, type RoomType } from "@/types/domain";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROOM_VISUALS, confidenceLabel } from "@/features/media/room-visuals";
import { imageDisplayUrl } from "@/features/media/image-url";
import { correctRoomAction } from "@/server/actions/property-actions";

type Filter = RoomType | "all";

function metaString(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata[key];
  return typeof value === "string" ? value : null;
}

export function PhotoGallery({
  projectId,
  images: initialImages,
  initialRoom,
}: {
  projectId: string;
  images: PropertyImage[];
  initialRoom?: string;
}) {
  const [images, setImages] = React.useState(initialImages);
  const validInitial = initialRoom && (ROOM_TYPES as readonly string[]).includes(initialRoom);
  const [filter, setFilter] = React.useState<Filter>(validInitial ? (initialRoom as RoomType) : "all");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const presentTypes = React.useMemo(() => {
    const counts = new Map<RoomType, number>();
    for (const image of images) counts.set(image.roomType, (counts.get(image.roomType) ?? 0) + 1);
    return ROOM_TYPES.filter((t) => counts.has(t)).map((t) => ({ type: t, count: counts.get(t) ?? 0 }));
  }, [images]);

  const visible = filter === "all" ? images : images.filter((i) => i.roomType === filter);
  const selected = images.find((i) => i.id === selectedId) ?? null;

  async function correct(imageId: string, roomType: RoomType) {
    const previous = images;
    setPendingId(imageId);
    // Optimistic: reflect the correction immediately (rollback is reliable — one field).
    setImages((imgs) => imgs.map((i) => (i.id === imageId ? { ...i, roomType, roomConfidence: 1 } : i)));

    const result = await correctRoomAction(projectId, imageId, roomType);
    setPendingId(null);
    if (!result.ok) {
      setImages(previous);
      toast.error(result.error ?? "Couldn't update the room.");
      return;
    }
    toast.success(`Reclassified as ${ROOM_VISUALS[roomType].label}`);
  }

  if (images.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
        No photos were imported for this listing.
      </p>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-2">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="All" count={images.length} />
        {presentTypes.map(({ type, count }) => {
          const visual = ROOM_VISUALS[type];
          return (
            <FilterChip
              key={type}
              active={filter === type}
              onClick={() => setFilter(type)}
              label={visual.label}
              count={count}
              color={visual.color}
            />
          );
        })}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((image) => {
          const visual = ROOM_VISUALS[image.roomType];
          return (
            <button
              key={image.id}
              type="button"
              onClick={() => setSelectedId(image.id)}
              className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Image
                src={imageDisplayUrl(image)}
                alt={`${visual.label} photo`}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
              />
              <span
                className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-background/85 px-2 py-0.5 text-[11px] font-medium backdrop-blur"
                style={{ color: visual.color }}
              >
                <visual.Icon className="size-3" />
                {visual.label}
              </span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No photos in this room group.</p>
      ) : null}

      {/* Detail dialog */}
      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-2xl">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>Photo detail</DialogTitle>
                <DialogDescription>Review metadata and correct the room classification.</DialogDescription>
              </DialogHeader>

              <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-muted">
                <Image
                  src={imageDisplayUrl(selected)}
                  alt={`${ROOM_VISUALS[selected.roomType].label} photo`}
                  fill
                  sizes="(max-width: 768px) 100vw, 640px"
                  className="object-cover"
                />
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="room-select" className="mb-1.5 block">
                    Room classification
                  </Label>
                  <Select
                    value={selected.roomType}
                    onValueChange={(value) => correct(selected.id, value as RoomType)}
                    disabled={pendingId === selected.id}
                  >
                    <SelectTrigger id="room-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOM_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {ROOM_VISUALS[type].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="mt-2">
                    <Badge variant={confidenceLabel(selected.roomConfidence).tone}>
                      {confidenceLabel(selected.roomConfidence).label} ·{" "}
                      {Math.round(selected.roomConfidence * 100)}%
                    </Badge>
                  </div>
                </div>

                <dl className="space-y-1.5 text-sm">
                  <MetaRow label="Sort order" value={`#${selected.sortOrder + 1}`} />
                  <MetaRow
                    label="Dimensions"
                    value={selected.width && selected.height ? `${selected.width}×${selected.height}` : "Unknown"}
                  />
                  <MetaRow label="Filename" value={metaString(selected.metadata, "filename") ?? "—"} />
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-muted-foreground">Source</dt>
                    <dd>
                      <a
                        href={selected.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <ExternalLink className="size-3.5" />
                        Open
                      </a>
                    </dd>
                  </div>
                </dl>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "border-primary/50 bg-primary/15 text-foreground" : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {color ? <span className="size-2 rounded-full" style={{ backgroundColor: color }} /> : null}
      {label}
      <span className="text-muted-foreground">{count}</span>
    </button>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}
