import type { RoomType } from "@/types/domain";

export interface ClassifierImageInput {
  sourceUrl: string;
  order: number;
  metadata?: Record<string, unknown>;
}

export interface RoomClassification {
  roomType: RoomType;
  confidence: number; // 0..1
}

/**
 * RoomClassifier boundary. A deterministic heuristic implementation ships now;
 * an AI multimodal adapter can replace it without changing callers. `classify`
 * returns classifications aligned by index with the input images.
 */
export interface RoomClassifier {
  readonly name: string;
  classify(images: ClassifierImageInput[]): Promise<RoomClassification[]>;
}
