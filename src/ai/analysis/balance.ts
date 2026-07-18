import type { AnalyzerInput } from "./index";
import type { MetricsMap } from "../types";
import { hipCenter } from "./util";

/** Balance test: body sway, center-of-mass drift, posture, overall balance score. */
export function analyzeBalance({ frames }: AnalyzerInput): MetricsMap {
  if (frames.length < 2) return {};
  const hips = frames.map(hipCenter);
  const meanX = hips.reduce((s, h) => s + h.x, 0) / hips.length;
  const meanY = hips.reduce((s, h) => s + h.y, 0) / hips.length;
  const sway = Math.sqrt(
    hips.reduce((s, h) => s + (h.x - meanX) ** 2 + (h.y - meanY) ** 2, 0) / hips.length
  );
  const stability = Math.max(0, 1 - sway * 20);
  const posture = Math.max(0, 1 - Math.abs(meanY - 0.5) * 2);

  return {
    bodySway: { value: +(sway * 1000).toFixed(1), unit: "mm" },
    centerOfMass: { value: +meanY.toFixed(3), unit: "norm" },
    postureStability: { value: +(posture * 100).toFixed(0), unit: "%" },
    balanceScore: { value: +(stability * 100).toFixed(0), unit: "%" },
  };
}
