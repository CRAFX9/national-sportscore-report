// Placeholder adapter for Google MediaPipe Pose.
//
// Replace body with real integration:
//   - Web:   @mediapipe/tasks-vision PoseLandmarker
//   - Native: expo-mediapipe / react-native-mediapipe
//
// Must emit 33 landmarks in MediaPipe canonical order (see LM in ../types.ts).

import type { PoseDetector, PoseFrame, PoseInput } from "../types";

export class MediaPipePoseDetector implements PoseDetector {
  readonly id = "mediapipe";
  async init(): Promise<void> {
    throw new Error("MediaPipePoseDetector not implemented — plug @mediapipe/tasks-vision here.");
  }
  async detectFrame(_input: PoseInput, _timestamp: number): Promise<PoseFrame | null> {
    return null;
  }
  async dispose(): Promise<void> { /* no-op */ }
}
