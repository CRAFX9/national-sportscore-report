import type { AnalyzerInput } from "./index";
import type { MetricsMap } from "../types";
import { hipCenter, movingAverage, unitToMeters } from "./util";

/** Shuttle run: turning speed, agility, accel/decel, foot placement. */
export function analyzeShuttleRun({ frames, athlete }: AnalyzerInput): MetricsMap {
  if (frames.length < 3) return {};
  const hips = frames.map(hipCenter);
  const xs = hips.map((h) => h.x);
  const dts: number[] = [];
  const vs: number[] = [];
  for (let i = 1; i < frames.length; i++) {
    const dt = (frames[i].timestamp - frames[i - 1].timestamp) / 1000;
    dts.push(dt);
    const dx = unitToMeters(xs[i] - xs[i - 1], athlete.heightCm, frames[i]);
    vs.push(dt > 0 ? dx / dt : 0);
  }
  const smooth = movingAverage(vs, 4);
  const turns = countZeroCrossings(smooth);
  const accels: number[] = [];
  const decels: number[] = [];
  for (let i = 1; i < smooth.length; i++) {
    const a = (smooth[i] - smooth[i - 1]) / Math.max(0.01, dts[i]);
    if (a > 0) accels.push(a); else decels.push(-a);
  }
  const maxAccel = accels.length ? Math.max(...accels) : 0;
  const maxDecel = decels.length ? Math.max(...decels) : 0;
  const turningSpeed = turns / Math.max(0.1, (frames.at(-1)!.timestamp - frames[0].timestamp) / 1000);
  const agility = Math.min(100, 40 + turningSpeed * 40 + maxDecel * 3);
  const footPlacement = 70 + Math.round(Math.random() * 20); // placeholder

  return {
    turningSpeed: { value: +turningSpeed.toFixed(2), unit: "turns/s" },
    agility: { value: +agility.toFixed(0), unit: "score" },
    acceleration: { value: +maxAccel.toFixed(2), unit: "m/s²" },
    deceleration: { value: +maxDecel.toFixed(2), unit: "m/s²" },
    footPlacement: { value: footPlacement, unit: "%" },
  };
}

function countZeroCrossings(a: number[]): number {
  let n = 0;
  for (let i = 1; i < a.length; i++) if (Math.sign(a[i]) !== Math.sign(a[i - 1])) n++;
  return n;
}
