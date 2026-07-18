import type { AssessmentKind, Recommendation, ScoreBreakdown } from "../types";

interface Profile { minAge?: number; needs: Partial<Record<keyof ScoreBreakdown, number>>; }

const SPORTS: Record<string, Profile> = {
  "Athletics — Sprint":    { needs: { speed: 75, power: 65, reaction: 65 } },
  "Athletics — Middle Distance": { needs: { endurance: 70, speed: 60 } },
  "Long Jump":             { needs: { power: 75, speed: 70, coordination: 65 } },
  "High Jump":             { needs: { power: 75, coordination: 70, balance: 70 } },
  "Triple Jump":           { needs: { power: 75, coordination: 70, agility: 65 } },
  "Throw Events":          { needs: { strength: 80, power: 70 } },
  "Kabaddi":               { needs: { agility: 70, strength: 65, endurance: 60 } },
  "Kho Kho":               { needs: { agility: 80, speed: 70, reaction: 65 } },
  "Football":              { needs: { endurance: 70, agility: 70, coordination: 65 } },
  "Cricket":               { needs: { coordination: 75, reaction: 70 } },
  "Volleyball":            { needs: { power: 70, coordination: 70, balance: 65 } },
  "Basketball":            { needs: { power: 70, agility: 70, coordination: 70 } },
  "Badminton":             { needs: { reaction: 80, agility: 75, coordination: 70 } },
  "Wrestling":             { needs: { strength: 80, balance: 70, power: 65 } },
  "Boxing":                { needs: { reaction: 80, power: 70, endurance: 65 } },
  "Weightlifting":         { minAge: 14, needs: { strength: 85, power: 80 } },
  "Hockey":                { needs: { endurance: 70, agility: 70, coordination: 65 } },
};

export interface RecommendInput {
  scores: ScoreBreakdown;
  age: number;
  kind: AssessmentKind;
}

export function recommendSports({ scores, age }: RecommendInput): Recommendation[] {
  const out: Recommendation[] = [];
  for (const [sport, profile] of Object.entries(SPORTS)) {
    if (profile.minAge && age < profile.minAge) continue;
    const reasons: string[] = [];
    const parts: number[] = [];
    for (const [k, target] of Object.entries(profile.needs) as [keyof ScoreBreakdown, number][]) {
      const v = scores[k] as number;
      const ratio = Math.min(1.2, v / target);
      parts.push(ratio);
      if (v >= target) reasons.push(`${cap(k)} ${v} meets ${sport} threshold (${target}).`);
      else reasons.push(`${cap(k)} ${v} below ${sport} threshold (${target}).`);
    }
    const fit = Math.max(0, Math.min(1, parts.reduce((a, b) => a + b, 0) / parts.length));
    out.push({ sport, fit: +fit.toFixed(2), reasons });
  }
  return out.sort((a, b) => b.fit - a.fit).slice(0, 5);
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
