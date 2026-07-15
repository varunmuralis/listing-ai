import type {
  ClassifierImageInput,
  RoomClassification,
  RoomClassifier,
} from "@/lib/providers/rooms/types";
import { HeuristicRoomClassifier } from "@/lib/providers/rooms/heuristic-classifier";

/**
 * Adapter boundary for a multimodal room classifier. A real implementation would
 * send each image to a vision model and parse a structured label + confidence.
 *
 * Until that is wired to a licensed image source, this delegates to the
 * deterministic heuristic so behavior is safe and reproducible — we never
 * fabricate a classification we cannot justify.
 */
export class AIRoomClassifier implements RoomClassifier {
  readonly name = "ai";
  private fallback = new HeuristicRoomClassifier();

  async classify(images: ClassifierImageInput[]): Promise<RoomClassification[]> {
    // TODO: call the multimodal model here when a licensed image feed exists.
    // Intentionally falling back rather than inventing labels from placeholders.
    return this.fallback.classify(images);
  }
}
