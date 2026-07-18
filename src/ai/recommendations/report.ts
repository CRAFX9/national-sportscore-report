import type { AIReport, MetricsMap, Recommendation, ScoreBreakdown } from "../types";

export function generateReport(input: {
  athleteId: string;
  assessment: AIReport["assessment"];
  quality: AIReport["quality"];
  metrics: MetricsMap;
  scores: ScoreBreakdown;
  recommendations: Recommendation[];
  antiCheat: AIReport["antiCheat"];
}): AIReport {
  const { scores, recommendations, antiCheat } = input;
  const strengths = topKeys(scores, 3);
  const weaknesses = bottomKeys(scores, 2);
  const improvements = weaknesses.map((k) => `Focus on ${k} — target +${100 - (scores[k as keyof ScoreBreakdown] as number)} points.`);
  const training = buildTrainingPlan(weaknesses);
  const nutrition = [
    "Balanced diet: 55% carbs, 20% protein, 25% healthy fats.",
    "Hydration: 3–4 L water per training day.",
    "Iron-rich foods for endurance (spinach, ragi, dates).",
    "Post-training protein within 45 minutes (dal, eggs, milk).",
  ];
  const verification = antiCheat.recommendation === "accept" ? "verified" : antiCheat.recommendation;
  const olympic = Math.round(Math.min(100, scores.overall * 0.9 + scores.confidence * 10));

  return {
    athleteId: input.athleteId,
    assessment: input.assessment,
    createdAt: Date.now(),
    quality: input.quality,
    metrics: input.metrics,
    scores,
    recommendations,
    antiCheat,
    summary: `Overall score ${scores.overall}/100 (${scores.nationalPercentile}th percentile). Recommended: ${recommendations[0]?.sport ?? "n/a"}.`,
    strengths: strengths.map((k) => `${cap(k)}: ${scores[k as keyof ScoreBreakdown]}`),
    weaknesses: weaknesses.map((k) => `${cap(k)}: ${scores[k as keyof ScoreBreakdown]}`),
    improvements,
    coachNotes: [
      recommendations[0] ? `Primary sport track: ${recommendations[0].sport}.` : "Continue general athletic development.",
      antiCheat.recommendation === "review" ? "Manual review recommended before submission." : "Video passes automated checks.",
    ],
    trainingPlan: training,
    nutrition,
    olympicPotential: olympic,
    verification: verification as AIReport["verification"],
  };
}

function topKeys(s: ScoreBreakdown, n: number) {
  return numericKeys(s).sort((a, b) => (s[b] as number) - (s[a] as number)).slice(0, n);
}
function bottomKeys(s: ScoreBreakdown, n: number) {
  return numericKeys(s).sort((a, b) => (s[a] as number) - (s[b] as number)).slice(0, n);
}
function numericKeys(s: ScoreBreakdown): (keyof ScoreBreakdown)[] {
  return (["speed", "power", "strength", "agility", "coordination", "endurance", "reaction", "balance"] as const).filter((k) => typeof s[k] === "number");
}
function buildTrainingPlan(weak: string[]): string[] {
  const plan: Record<string, string> = {
    speed: "Sprint intervals: 6×60m at 90%, 3× per week.",
    power: "Plyometrics: box jumps 4×8, broad jumps 4×6.",
    strength: "Bodyweight circuit: pushups, squats, planks — 4 rounds.",
    agility: "Ladder drills + 5-10-5 shuttle, 3× per week.",
    coordination: "Reaction ball drills, 15 minutes daily.",
    endurance: "Steady runs 20–30 min at conversational pace, 3× per week.",
    reaction: "Ruler-drop drills + light-board reaction games.",
    balance: "Single-leg holds, Bosu ball work, 10 minutes daily.",
  };
  return weak.map((k) => plan[k]).filter(Boolean);
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
