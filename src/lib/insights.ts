// Athlete development guidance derived from the athlete's own stored metrics.
// Rule-based (not a medical or ML model) — every consumer must label it as guidance.
import type { AssessmentResult, ResultMetrics } from "./types";
import { METRIC_KEYS, METRIC_LABELS } from "./trends";

export interface MetricScore { key: string; label: string; value: number }

export interface DevelopmentPlan {
  strengths: MetricScore[];
  focus: MetricScore[];
  activities: string[];
  nextAssessmentAt: number;
  nextAssessmentInDays: number;
}

const ACTIVITIES: Record<string, string[]> = {
  speed: ["Flying 20m sprints (4–6 reps, full recovery)", "A-skip and high-knee drills before every session"],
  power: ["Box jumps and standing broad jumps, 3 sets of 5", "Medicine-ball overhead throws, 3 sets of 8"],
  agility: ["4x10m shuttle and T-drill twice a week", "Ladder footwork, 6 minutes per session"],
  strength: ["Body-weight circuit: push-ups, squats, plank (3 rounds)", "Resistance-band rows and hip bridges"],
  endurance: ["Interval running: 6 x 200m with 90s rest", "Easy continuous run 15–20 min, twice a week"],
  coordination: ["Skipping rope, 3 x 2 minutes", "Ball-wall reaction drills, 5 minutes"],
  balance: ["Single-leg stance holds, 3 x 30s per leg", "Bosu / uneven-surface holds, 5 minutes"],
  reaction: ["Partner start-signal sprints, 6 reps", "Falling-stick catch drill, 10 reps"],
};

/** Metrics at or above this are called strengths; at or below, focus areas. */
const STRONG = 70;
const WEAK = 55;
const NEXT_ASSESSMENT_DAYS = 30;

export function developmentPlan(result: AssessmentResult): DevelopmentPlan {
  const present: MetricScore[] = METRIC_KEYS
    .filter((k) => typeof result.metrics[k] === "number")
    .map((k) => ({ key: k, label: METRIC_LABELS[k] ?? k, value: result.metrics[k] as number }));

  const sorted = [...present].sort((a, b) => b.value - a.value);
  const strengths = sorted.filter((m) => m.value >= STRONG).slice(0, 3);
  const focus = [...sorted].reverse().filter((m) => m.value <= WEAK).slice(0, 3);

  // Fall back to relative ranking when nothing crosses the absolute bands.
  const finalStrengths = strengths.length ? strengths : sorted.slice(0, 2);
  const finalFocus = focus.length ? focus : [...sorted].reverse().slice(0, 2);

  const activities = finalFocus.flatMap((m) => ACTIVITIES[m.key] ?? []).slice(0, 4);
  const nextAssessmentAt = result.createdAt + NEXT_ASSESSMENT_DAYS * 86_400_000;

  return {
    strengths: finalStrengths,
    focus: finalFocus,
    activities,
    nextAssessmentAt,
    nextAssessmentInDays: NEXT_ASSESSMENT_DAYS,
  };
}

/** Sport suggestions already produced by the AI engine, plus a plain-language basis. */
export function sportSuggestions(result: AssessmentResult): { sport: string; basis: string }[] {
  const m: ResultMetrics = result.metrics;
  const top = METRIC_KEYS
    .filter((k) => typeof m[k] === "number")
    .sort((a, b) => (m[b] as number) - (m[a] as number))
    .slice(0, 2)
    .map((k) => METRIC_LABELS[k] ?? k);
  const basis = top.length ? `Strong ${top.join(" + ")}` : "Available metrics";
  return result.recommendedSports.map((sport) => ({ sport, basis }));
}
