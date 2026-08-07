// Trend maths over the athlete's real stored results. No history is invented:
// if only one assessment exists the trend is reported as "baseline".
import type { AssessmentResult, ResultMetrics } from "./types";

export type TrendDirection = "improving" | "stable" | "attention" | "baseline";

export const METRIC_KEYS: (keyof ResultMetrics)[] = [
  "speed", "power", "agility", "strength", "endurance", "coordination", "balance", "reaction",
];

export const METRIC_LABELS: Record<string, string> = {
  speed: "Speed",
  power: "Power / Jump",
  agility: "Agility",
  strength: "Strength",
  endurance: "Endurance",
  coordination: "Coordination",
  balance: "Balance",
  reaction: "Reaction",
  overall: "Overall score",
};

export interface MetricTrend {
  key: string;
  label: string;
  latest: number;
  previous?: number;
  delta?: number;
  direction: TrendDirection;
  points: { at: number; value: number }[];
}

const THRESHOLD = 3; // score points — smaller changes are treated as noise

export function directionFor(delta: number | undefined, latest: number): TrendDirection {
  if (delta === undefined) return latest < 45 ? "attention" : "baseline";
  if (delta >= THRESHOLD) return "improving";
  if (delta <= -THRESHOLD) return "attention";
  return latest < 45 ? "attention" : "stable";
}

/** results must be sorted oldest → newest. */
export function metricTrends(results: AssessmentResult[]): MetricTrend[] {
  if (results.length === 0) return [];
  const out: MetricTrend[] = [];

  const series = (pick: (r: AssessmentResult) => number | undefined) =>
    results
      .map((r) => ({ at: r.createdAt, value: pick(r) }))
      .filter((p): p is { at: number; value: number } => typeof p.value === "number");

  const push = (key: string, pick: (r: AssessmentResult) => number | undefined) => {
    const pts = series(pick);
    if (pts.length === 0) return; // metric genuinely absent — do not display
    const latest = pts[pts.length - 1].value;
    const previous = pts.length > 1 ? pts[pts.length - 2].value : undefined;
    const delta = previous === undefined ? undefined : Math.round(latest - previous);
    out.push({
      key,
      label: METRIC_LABELS[key] ?? key,
      latest,
      previous,
      delta,
      direction: directionFor(delta, latest),
      points: pts,
    });
  };

  push("overall", (r) => r.overall);
  for (const k of METRIC_KEYS) push(k, (r) => r.metrics[k]);
  return out;
}

export function overallTrend(results: AssessmentResult[]): MetricTrend | undefined {
  return metricTrends(results).find((t) => t.key === "overall");
}

export const TREND_LABEL: Record<TrendDirection, string> = {
  improving: "Improving",
  stable: "Stable",
  attention: "Needs attention",
  baseline: "Baseline",
};

export const TREND_VARIANT: Record<TrendDirection, "success" | "info" | "warning" | "neutral"> = {
  improving: "success",
  stable: "info",
  attention: "warning",
  baseline: "neutral",
};
