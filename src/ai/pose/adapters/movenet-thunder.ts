// Placeholder adapter for MoveNet Thunder (higher accuracy, mid-range phones).
import type { PoseDetector, PoseFrame, PoseInput } from "../types";

export class MoveNetThunderDetector implements PoseDetector {
  readonly id = "movenet-thunder";
  async init(): Promise<void> {
    throw new Error("MoveNet Thunder not implemented — plug TFLite runtime.");
  }
  async detectFrame(_input: PoseInput, _timestamp: number): Promise<PoseFrame | null> {
    return null;
  }
  async dispose(): Promise<void> { /* no-op */ }
}
