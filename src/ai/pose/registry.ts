// Central detector registry. Swap the active model here or via PIPELINE_CONFIG.
import type { PoseDetector } from "./types";
import { MockPoseDetector } from "./mock-pose";
import { MediaPipePoseDetector } from "./adapters/mediapipe";
import { MoveNetLightningDetector } from "./adapters/movenet-lightning";
import { MoveNetThunderDetector } from "./adapters/movenet-thunder";

export type PoseBackend = "mock" | "mediapipe" | "movenet-lightning" | "movenet-thunder";

export function createPoseDetector(backend: PoseBackend): PoseDetector {
  switch (backend) {
    case "mediapipe": return new MediaPipePoseDetector();
    case "movenet-lightning": return new MoveNetLightningDetector();
    case "movenet-thunder": return new MoveNetThunderDetector();
    case "mock":
    default: return new MockPoseDetector();
  }
}
