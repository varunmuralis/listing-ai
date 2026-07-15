import { ROOM_TYPES, type RoomType } from "@/types/domain";
import type {
  ClassifierImageInput,
  RoomClassification,
  RoomClassifier,
} from "@/lib/providers/rooms/types";

/**
 * Deterministic room classifier using fixture metadata, filenames, and image
 * order. No network calls — same input always yields the same labels.
 */

const ROOM_TYPE_SET = new Set<string>(ROOM_TYPES);

/** Ordered keyword rules; first match wins. Longer/more specific rules first. */
const KEYWORD_RULES: Array<{ pattern: RegExp; roomType: RoomType }> = [
  { pattern: /floor.?plan/, roomType: "floorplan" },
  { pattern: /(primary|master).*(bed|suite)|(bed|suite).*(primary|master)/, roomType: "primary_bedroom" },
  { pattern: /kitchen|pantry/, roomType: "kitchen" },
  { pattern: /dining/, roomType: "dining_room" },
  { pattern: /living|family.?room|great.?room|lounge/, roomType: "living_room" },
  { pattern: /bath|shower|ensuite|powder/, roomType: "bathroom" },
  { pattern: /office|study|den/, roomType: "office" },
  { pattern: /garage/, roomType: "garage" },
  { pattern: /pool|spa|hot.?tub/, roomType: "pool" },
  { pattern: /backyard|back.?yard|patio|deck|yard|garden|outdoor/, roomType: "backyard" },
  { pattern: /bed|guest.?room/, roomType: "bedroom" },
  { pattern: /exterior|front|facade|elevation|curb|street/, roomType: "exterior" },
];

function isRoomType(value: unknown): value is RoomType {
  return typeof value === "string" && ROOM_TYPE_SET.has(value);
}

/** Classify a single image deterministically. Exported for unit testing. */
export function classifyImage(image: ClassifierImageInput, total: number): RoomClassification {
  const metadata = image.metadata ?? {};

  // 1. Explicit fixture/import hint is the strongest signal.
  const roomHint = metadata.roomHint;
  if (isRoomType(roomHint)) {
    return { roomType: roomHint, confidence: 0.95 };
  }

  // 2. Filename keywords.
  const filename = typeof metadata.filename === "string" ? metadata.filename.toLowerCase() : "";
  const haystack = `${filename} ${image.sourceUrl.toLowerCase()}`;
  for (const rule of KEYWORD_RULES) {
    if (rule.pattern.test(haystack)) {
      return { roomType: rule.roomType, confidence: 0.8 };
    }
  }

  // 3. Positional fallback: the first photo of a listing is almost always the
  // exterior/front elevation. Low confidence so users can correct it.
  if (image.order === 0 && total > 1) {
    return { roomType: "exterior", confidence: 0.45 };
  }

  return { roomType: "other", confidence: 0.3 };
}

export class HeuristicRoomClassifier implements RoomClassifier {
  readonly name = "heuristic";

  async classify(images: ClassifierImageInput[]): Promise<RoomClassification[]> {
    const total = images.length;
    return images.map((image) => classifyImage(image, total));
  }
}
