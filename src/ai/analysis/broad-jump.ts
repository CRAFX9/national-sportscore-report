import { LM } from "../pose/types";
import type { AnalyzerInput } from "./index";
import type { MetricsMap } from "../types";
import { hipCenter, unitToMeters } from "./util";

/** Standing broad jump: distance, takeoff angle, flight time, landing stability, power. */
export function analyzeBroadJump({ frames, athlete }: AnalyzerInput): MetricsMap {
  if (frames.length < 3) return {};
  const hips = frames.map(hipCenter);
  const ys = hips.map((h) => h.y);
  const xs = hips.map((h) => h.x);

  // Airborne: y significantly above baseline
  const baseline = Math.max(...ys);
  const airborne = ys.map((y) => baseline - y > 0.08);
  const takeoffIdx = airborne.findIndex(Boolean);
  const landIdx = airborne.lastIndexOf(true);
  if (takeoffIdx < 0 || landIdx <= takeoffIdx) return { jumpDistance: { value: 0, unit: "m" } };

  const flightMs = frames[landIdx].timestamp - frames[takeoffIdx].timestamp;
  const dxUnits = Math.abs(xs[landIdx] - xs[takeoffIdx]);
  const distance = unitToMeters(dxUnits, athlete.heightCm, frames[takeoffIdx]);

  const dyUnits = baseline - ys[takeoffIdx];
  const takeoffAngle = (Math.atan2(dyUnits, dxUnits) * 180) / Math.PI;

  // Landing stability: hip-Y variance in 500ms post-landing
  const postWindow = frames.slice(landIdx, landIdx + 8).map((f) => hipCenter(f).y);
  const meanY = postWindow.reduce((a, b) => a + b, 0) / postWindow.length;
  const variance = postWindow.reduce((s, y) => s + (y - meanY) ** 2, 0) / postWindow.length;
  const stability = Math.max(0, 1 - variance * 500);

  const g = 9.81;
  const power = ((athlete.weightKg * g * distance) / Math.max(0.1, flightMs / 1000));

  return {
    jumpDistance: { value: +distance.toFixed(2), unit: "m" },
    takeoffAngle: { value: +takeoffAngle.toFixed(1), unit: "°" },
    flightTime: { value: Math.round(flightMs), unit: "ms" },
    landingStability: { value: +(stability * 100).toFixed(0), unit: "%" },
    balanceScore: { value: +(stability * 100).toFixed(0), unit: "%" },
    powerScore: { value: +power.toFixed(0), unit: "W" },
  };
  void LM;
}
