import {
  Bath,
  Bed,
  BedDouble,
  Briefcase,
  Car,
  CookingPot,
  Home,
  Image as ImageIcon,
  LayoutGrid,
  Sofa,
  Trees,
  Utensils,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { ROOM_TYPE_LABELS, type RoomType } from "@/types/domain";

/**
 * Room taxonomy visual language — a single color + icon per room type, reused
 * across photos, rooms, the 3D preview, and AI citations. This consistency is
 * the app's visual through-line.
 */
export interface RoomVisual {
  label: string;
  color: string;
  Icon: LucideIcon;
}

export const ROOM_VISUALS: Record<RoomType, RoomVisual> = {
  exterior: { label: ROOM_TYPE_LABELS.exterior, color: "#6E9FB5", Icon: Home },
  living_room: { label: ROOM_TYPE_LABELS.living_room, color: "#C9A15E", Icon: Sofa },
  kitchen: { label: ROOM_TYPE_LABELS.kitchen, color: "#E0885E", Icon: CookingPot },
  dining_room: { label: ROOM_TYPE_LABELS.dining_room, color: "#D9A566", Icon: Utensils },
  primary_bedroom: { label: ROOM_TYPE_LABELS.primary_bedroom, color: "#A98BD0", Icon: BedDouble },
  bedroom: { label: ROOM_TYPE_LABELS.bedroom, color: "#8B93D0", Icon: Bed },
  bathroom: { label: ROOM_TYPE_LABELS.bathroom, color: "#5FB5A8", Icon: Bath },
  office: { label: ROOM_TYPE_LABELS.office, color: "#9AA0AB", Icon: Briefcase },
  garage: { label: ROOM_TYPE_LABELS.garage, color: "#7C8391", Icon: Car },
  backyard: { label: ROOM_TYPE_LABELS.backyard, color: "#7FB55F", Icon: Trees },
  pool: { label: ROOM_TYPE_LABELS.pool, color: "#5EA6C9", Icon: Waves },
  floorplan: { label: ROOM_TYPE_LABELS.floorplan, color: "#C98B8B", Icon: LayoutGrid },
  other: { label: ROOM_TYPE_LABELS.other, color: "#8B929E", Icon: ImageIcon },
};

// TODO(rooms-milestone): consumed by the pending Rooms section UI (confidence
// indicators + correction control). See HANDOFF.md priority #3.
export function confidenceLabel(confidence: number): { label: string; tone: "success" | "warning" | "outline" } {
  if (confidence >= 0.85) return { label: "High confidence", tone: "success" };
  if (confidence >= 0.6) return { label: "Medium confidence", tone: "warning" };
  return { label: "Low confidence", tone: "outline" };
}
