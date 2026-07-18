// Placeholder adapter for MoveNet Lightning (TFLite, low-latency, low-end phones).
// MoveNet returns 17 keypoints; map into 33-slot MediaPipe layout, leaving
// missing indices with visibility=0.
import type { PoseDetector, PoseFrame, PoseInput } from "../types";

export class MoveNetLightningDetector implements PoseDetector {
  readonly id = "movenet-lightning";
  async init(): Promise<void> {
    throw new Error("MoveNet Lightning not implemented — plug @tensorflow-models/pose-detection or react-native-fast-tflite.");
  }
  async detectFrame(_input: PoseInput, _timestamp: number): Promise<PoseFrame | null> {
    return null;
  }
  async dispose(): Promise<void> { /* no-op */ }
}
