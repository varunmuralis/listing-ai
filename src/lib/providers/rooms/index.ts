import { serverEnv } from "@/lib/env/server";
import type { RoomClassifier } from "@/lib/providers/rooms/types";
import { HeuristicRoomClassifier } from "@/lib/providers/rooms/heuristic-classifier";
import { AIRoomClassifier } from "@/lib/providers/rooms/ai-classifier";

export function getRoomClassifier(): RoomClassifier {
  switch (serverEnv.ROOM_CLASSIFIER) {
    case "ai":
      return new AIRoomClassifier();
    case "heuristic":
    default:
      return new HeuristicRoomClassifier();
  }
}

export type { RoomClassifier, RoomClassification, ClassifierImageInput } from "@/lib/providers/rooms/types";
