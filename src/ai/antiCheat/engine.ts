import type { AntiCheatReport, VideoSource } from "../types";
import type { PoseFrame } from "../pose/types";

export interface AntiCheatInput {
  video: VideoSource;
  frames: PoseFrame[];
  /** Motion magnitude per frame from optical flow. */
  motion: number[];
  /** Hash of the video bytes for duplicate detection. */
  contentHash?: string;
  /** Set of hashes already seen locally. */
  seenHashes?: Set<string>;
}

/**
 * Heuristic tamper detector. Scores are additive; recommendation thresholds:
 *   risk < 0.3   → accept
 *   0.3–0.6      → review
 *   > 0.6        → reject
 */
export function detectFraud(input: AntiCheatInput): AntiCheatReport {
  const reasons: string[] = [];
  let risk = 0;

  // 1. Duplicate upload
  if (input.contentHash && input.seenHashes?.has(input.contentHash)) {
    reasons.push("Duplicate video already submitted (matching content hash).");
    risk += 0.7;
  }

  // 2. Timestamp / device clock mismatch
  if (input.video.recordedAt && input.video.deviceClockAt) {
    const drift = Math.abs(input.video.recordedAt - input.video.deviceClockAt);
    if (drift > 5 * 60 * 1000) {
      reasons.push(`Phone clock drift ${(drift / 60000).toFixed(1)} min from recording timestamp.`);
      risk += 0.15;
    }
  }

  // 3. Frame skipping / insertion — jumps in landmark position
  const gaps = frameGaps(input.frames);
  if (gaps.max > 200) { reasons.push(`Frame gap ${gaps.max}ms suggests skipped frames.`); risk += 0.15; }
  if (gaps.stddev > 60) { reasons.push("Irregular frame timing suggests edited playback speed."); risk += 0.1; }

  // 4. Multiple people — placeholder (needs multi-person detector)
  if (input.frames.some((f) => f.landmarks.length !== 33)) {
    reasons.push("Non-standard landmark count — possible multiple people or corrupt data.");
    risk += 0.2;
  }

  // 5. Person leaves frame
  const outOfFrame = input.frames.filter((f) => f.landmarks.some((l) => l.x < 0 || l.x > 1 || l.y < 0 || l.y > 1)).length;
  if (outOfFrame / Math.max(1, input.frames.length) > 0.15) {
    reasons.push("Athlete leaves the frame frequently.");
    risk += 0.1;
  }

  // 6. Camera shaking (very high global motion)
  const avgMotion = input.motion.reduce((a, b) => a + b, 0) / Math.max(1, input.motion.length);
  if (avgMotion > 40) { reasons.push("Excessive camera shake detected."); risk += 0.1; }

  // 7. Background static (screen recording of a still video)
  if (avgMotion < 0.5 && input.motion.length > 10) {
    reasons.push("Background is unusually static — possible screen recording.");
    risk += 0.15;
  }

  // 8. Playback-speed change — inconsistent stride cadence variance
  const cadence = strideCadenceVariance(input.frames);
  if (cadence > 0.4) { reasons.push("Stride cadence variance suggests speed manipulation."); risk += 0.1; }

  // 9. GPS mismatch (only if provided)
  if (input.video.gps && (Math.abs(input.video.gps.lat) < 0.001 && Math.abs(input.video.gps.lng) < 0.001)) {
    reasons.push("GPS coordinates missing or spoofed to (0,0).");
    risk += 0.1;
  }

  risk = Math.min(1, risk);
  const recommendation = risk >= 0.6 ? "reject" : risk >= 0.3 ? "review" : "accept";
  return { riskScore: +risk.toFixed(2), fraudProbability: +risk.toFixed(2), reasons, recommendation };
}

function frameGaps(frames: PoseFrame[]) {
  if (frames.length < 2) return { max: 0, stddev: 0 };
  const gaps: number[] = [];
  for (let i = 1; i < frames.length; i++) gaps.push(frames[i].timestamp - frames[i - 1].timestamp);
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const variance = gaps.reduce((s, g) => s + (g - mean) ** 2, 0) / gaps.length;
  return { max: Math.max(...gaps), stddev: Math.sqrt(variance) };
}

function strideCadenceVariance(frames: PoseFrame[]): number {
  if (frames.length < 6) return 0;
  const ankleY = frames.map((f) => (f.landmarks[27].y + f.landmarks[28].y) / 2);
  const gaps: number[] = [];
  let lastPeak = -1;
  for (let i = 1; i < ankleY.length - 1; i++) {
    if (ankleY[i] > ankleY[i - 1] && ankleY[i] > ankleY[i + 1]) {
      if (lastPeak >= 0) gaps.push(frames[i].timestamp - frames[lastPeak].timestamp);
      lastPeak = i;
    }
  }
  if (gaps.length < 2) return 0;
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const variance = gaps.reduce((s, g) => s + (g - mean) ** 2, 0) / gaps.length;
  return Math.sqrt(variance) / Math.max(1, mean);
}
