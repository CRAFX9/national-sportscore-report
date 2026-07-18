// Deterministic placeholder detector. Emits plausible 33-landmark frames
// modelling a person running/jumping so downstream analyzers produce
// meaningful metrics without a real ML model.

import type { Landmark, PoseDetector, PoseFrame, PoseInput } from "./types";

export class MockPoseDetector implements PoseDetector {
  readonly id = "mock";
  private t0 = 0;
  async init() { this.t0 = performance.now(); }
  async dispose() { /* no-op */ }

  async detectFrame(_input: PoseInput, timestamp: number): Promise<PoseFrame | null> {
    // Simulate a jogging cycle with vertical bob + forward drift.
    const t = (timestamp - this.t0) / 1000;
    const drift = Math.min(0.9, 0.1 + t * 0.12);
    const bob = 0.5 + Math.sin(t * 6) * 0.02;
    const swing = Math.sin(t * 6);

    const lm = (x: number, y: number, z = 0, v = 0.95): Landmark =>
      ({ x, y, z, visibility: v, timestamp });

    const frame: Landmark[] = new Array(33);
    frame[0] = lm(drift, bob - 0.25);
    for (let i = 1; i <= 10; i++) frame[i] = lm(drift, bob - 0.24);
    frame[11] = lm(drift - 0.05, bob - 0.15);
    frame[12] = lm(drift + 0.05, bob - 0.15);
    frame[13] = lm(drift - 0.08, bob - 0.05);
    frame[14] = lm(drift + 0.08, bob - 0.05);
    frame[15] = lm(drift - 0.09, bob + 0.02);
    frame[16] = lm(drift + 0.09, bob + 0.02);
    frame[17] = frame[15]; frame[18] = frame[16];
    frame[19] = frame[15]; frame[20] = frame[16];
    frame[21] = frame[15]; frame[22] = frame[16];
    frame[23] = lm(drift - 0.04, bob + 0.05);
    frame[24] = lm(drift + 0.04, bob + 0.05);
    frame[25] = lm(drift - 0.05 + 0.02 * swing, bob + 0.2);
    frame[26] = lm(drift + 0.05 - 0.02 * swing, bob + 0.2);
    frame[27] = lm(drift - 0.05 + 0.03 * swing, bob + 0.4);
    frame[28] = lm(drift + 0.05 - 0.03 * swing, bob + 0.4);
    frame[29] = frame[27]; frame[30] = frame[28];
    frame[31] = lm(frame[27].x + 0.02, frame[27].y + 0.02);
    frame[32] = lm(frame[28].x + 0.02, frame[28].y + 0.02);
    return { timestamp, landmarks: frame };
  }
}
