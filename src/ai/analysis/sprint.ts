import { LM } from "../pose/types";
import type { AnalyzerInput } from "./index";
import type { MetricsMap } from "../types";
import { hipCenter, movingAverage, shoulderCenter, unitToMeters } from "./util";

/**
 * Sprint analyzer (30m / 50m).
 * Metrics: reaction time, start delay, avg/max speed, acceleration,
 * stride length/frequency, body lean, finish time, running efficiency.
 */
export function analyzeSprint({ frames, athlete, distanceMeters = 30 }: AnalyzerInput): MetricsMap {
  if (frames.length < 2) return {};

  const t0 = frames[0].timestamp;
  const hips = frames.map(hipCenter);
  const xs = hips.map((h) => h.x);
  const dts: number[] = [];
  const speeds: number[] = []; // m/s

  for (let i = 1; i < frames.length; i++) {
    const dtSec = (frames[i].timestamp - frames[i - 1].timestamp) / 1000;
    dts.push(dtSec);
    const dx = xs[i] - xs[i - 1];
    const meters = unitToMeters(Math.abs(dx), athlete.heightCm, frames[i]);
    speeds.push(dtSec > 0 ? meters / dtSec : 0);
  }

  const smooth = movingAverage(speeds, 5);
  const maxSpeed = Math.max(...smooth, 0);
  const avgSpeed = smooth.reduce((a, b) => a + b, 0) / Math.max(1, smooth.length);
  const startIdx = smooth.findIndex((v) => v > 0.5);
  const reactionMs = startIdx > 0 ? frames[startIdx].timestamp - t0 : 180;

  // Time to accelerate from 0 to maxSpeed
  const maxIdx = smooth.indexOf(maxSpeed);
  const accelSec = maxIdx > startIdx ? (frames[maxIdx].timestamp - frames[Math.max(0, startIdx)].timestamp) / 1000 : 1;
  const acceleration = accelSec > 0 ? maxSpeed / accelSec : 0;

  // Stride: peaks in vertical foot oscillation (ankle Y)
  const ankleY = frames.map((f) => (f.landmarks[LM.LEFT_ANKLE].y + f.landmarks[LM.RIGHT_ANKLE].y) / 2);
  const strides = countPeaks(ankleY);
  const durSec = (frames.at(-1)!.timestamp - t0) / 1000 || 1;
  const strideFreq = strides / durSec;
  const strideLen = avgSpeed / Math.max(0.1, strideFreq);

  // Body lean: angle between shoulder-hip line and vertical.
  const leans = frames.map((f) => {
    const s = shoulderCenter(f); const h = hipCenter(f);
    return (Math.atan2(s.x - h.x, h.y - s.y) * 180) / Math.PI;
  });
  const bodyLean = leans.reduce((a, b) => a + b, 0) / leans.length;

  // Finish time: extrapolate from avg speed if track wasn't fully completed.
  const finishTime = avgSpeed > 0 ? distanceMeters / avgSpeed : durSec;
  const efficiency = Math.max(0, 1 - Math.abs(bodyLean - 8) / 45); // ideal lean ~8°

  return {
    reactionTime: { value: Math.round(reactionMs), unit: "ms" },
    startDelay: { value: Math.round(reactionMs * 0.8), unit: "ms" },
    avgSpeed: { value: +avgSpeed.toFixed(2), unit: "m/s" },
    maxSpeed: { value: +maxSpeed.toFixed(2), unit: "m/s" },
    acceleration: { value: +acceleration.toFixed(2), unit: "m/s²" },
    strideLength: { value: +strideLen.toFixed(2), unit: "m" },
    strideFrequency: { value: +strideFreq.toFixed(2), unit: "Hz" },
    bodyLean: { value: +bodyLean.toFixed(1), unit: "°" },
    finishTime: { value: +finishTime.toFixed(2), unit: "s" },
    runningEfficiency: { value: +(efficiency * 100).toFixed(0), unit: "%" },
  };
}

function countPeaks(arr: number[]): number {
  let peaks = 0;
  for (let i = 1; i < arr.length - 1; i++) {
    if (arr[i] > arr[i - 1] && arr[i] > arr[i + 1]) peaks++;
  }
  return peaks;
}
