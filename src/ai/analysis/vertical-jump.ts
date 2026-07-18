import type { AnalyzerInput } from "./index";
import type { MetricsMap } from "../types";
import { hipCenter, unitToMeters } from "./util";

/** Vertical jump: height, hang time, takeoff speed, landing balance, explosive power. */
export function analyzeVerticalJump({ frames, athlete }: AnalyzerInput): MetricsMap {
  if (frames.length < 3) return {};
  const hips = frames.map(hipCenter);
  const ys = hips.map((h) => h.y);
  const baseline = Math.max(...ys);
  const peakY = Math.min(...ys);
  const dyUnits = baseline - peakY;
  const heightM = unitToMeters(dyUnits, athlete.heightCm, frames[0]);

  // Airborne interval
  const airborne = ys.map((y) => baseline - y > 0.05);
  const takeoff = airborne.findIndex(Boolean);
  const land = airborne.lastIndexOf(true);
  const hangMs = takeoff >= 0 && land > takeoff ? frames[land].timestamp - frames[takeoff].timestamp : 300;

  const takeoffSpeed = Math.sqrt(2 * 9.81 * Math.max(0, heightM));
  const power = (athlete.weightKg * 9.81 * heightM) / Math.max(0.1, hangMs / 2000);

  const post = ys.slice(land, land + 8);
  const meanY = post.reduce((a, b) => a + b, 0) / Math.max(1, post.length);
  const variance = post.reduce((s, y) => s + (y - meanY) ** 2, 0) / Math.max(1, post.length);
  const landing = Math.max(0, 1 - variance * 400);

  return {
    jumpHeight: { value: +(heightM * 100).toFixed(1), unit: "cm" },
    hangTime: { value: Math.round(hangMs), unit: "ms" },
    takeoffSpeed: { value: +takeoffSpeed.toFixed(2), unit: "m/s" },
    landingBalance: { value: +(landing * 100).toFixed(0), unit: "%" },
    explosivePower: { value: +power.toFixed(0), unit: "W" },
  };
}
