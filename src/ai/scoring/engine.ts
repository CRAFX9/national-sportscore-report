import benchmarks from "../benchmarks.json";
import type { AssessmentKind, AthleteContext, MetricsMap, ScoreBreakdown } from "../types";

type Band = { elite: number; good: number; avg: number };
type AgeGroup = "5-8" | "9-12" | "13-15" | "16-18";

function ageGroup(age: number): AgeGroup {
  if (age <= 8) return "5-8";
  if (age <= 12) return "9-12";
  if (age <= 15) return "13-15";
  return "16-18";
}

function lookup(kind: AssessmentKind, age: number, gender: "male" | "female"): Band | null {
  const table = (benchmarks as unknown as Record<string, Record<string, Record<string, Band>>>)[kind];
  if (!table) return null;
  return table[ageGroup(age)]?.[gender] ?? null;
}

/** Convert a raw metric value to a 0-100 score using benchmarks.
 * `lowerIsBetter` for time-based metrics. */
function scoreVsBand(value: number, band: Band, lowerIsBetter: boolean): number {
  const { elite, avg } = band;
  if (lowerIsBetter) {
    if (value <= elite) return 100;
    if (value >= avg) return 40;
    return Math.round(40 + ((avg - value) / (avg - elite)) * 60);
  } else {
    if (value >= elite) return 100;
    if (value <= avg) return 40;
    return Math.round(40 + ((value - avg) / (elite - avg)) * 60);
  }
}

const PRIMARY: Record<AssessmentKind, { metric: string; lowerIsBetter: boolean }> = {
  sprint_30m: { metric: "finishTime", lowerIsBetter: true },
  sprint_50m: { metric: "finishTime", lowerIsBetter: true },
  broad_jump: { metric: "jumpDistance", lowerIsBetter: false },
  vertical_jump: { metric: "jumpHeight", lowerIsBetter: false },
  shuttle_run: { metric: "agility", lowerIsBetter: false },
  balance_test: { metric: "balanceScore", lowerIsBetter: false },
  reaction_test: { metric: "balanceScore", lowerIsBetter: false },
};

export interface ScoreInput {
  kind: AssessmentKind;
  athlete: AthleteContext;
  metrics: MetricsMap;
}

export function computeScores({ kind, athlete, metrics }: ScoreInput): ScoreBreakdown {
  const g: "male" | "female" = athlete.gender === "female" ? "female" : "male";
  const band = lookup(kind, athlete.age, g);
  const primary = PRIMARY[kind];
  const primaryValue = metrics[primary.metric]?.value ?? 0;
  const primaryScore = band ? scoreVsBand(primaryValue, band, primary.lowerIsBetter) : 60;

  const speed = pick(metrics.maxSpeed?.value, 0, 12, 100) || primaryScore;
  const power = pick(metrics.powerScore?.value ?? metrics.explosivePower?.value, 0, 900, 100) || primaryScore;
  const agility = pick(metrics.agility?.value ?? metrics.turningSpeed?.value, 0, 3, 100) || primaryScore;
  const balance = pick(metrics.balanceScore?.value ?? metrics.landingBalance?.value ?? metrics.postureStability?.value, 0, 100, 100) || primaryScore;
  const reaction = metrics.reactionTime ? Math.max(20, 100 - metrics.reactionTime.value / 5) : primaryScore;
  const coordination = Math.round((agility + balance) / 2);
  const endurance = Math.round((speed + power) / 2);
  const strength = Math.round((power + primaryScore) / 2);

  const overall = Math.round(
    primaryScore * 0.35 + speed * 0.1 + power * 0.15 + agility * 0.1 + balance * 0.1 + coordination * 0.1 + endurance * 0.1
  );

  const percentile = Math.min(99, 40 + Math.round((overall - 40) * 1.1));

  return {
    speed, power, strength, agility, coordination, endurance, reaction, balance,
    overall,
    confidence: band ? 0.9 : 0.6,
    nationalPercentile: percentile,
    districtRank: 1 + Math.round((100 - overall) * 4),
    stateRank: 1 + Math.round((100 - overall) * 20),
  };
}

function pick(v: number | undefined, lo: number, hi: number, top: number): number {
  if (v == null) return 0;
  const clamped = Math.max(lo, Math.min(hi, v));
  return Math.round((clamped / hi) * top);
}
