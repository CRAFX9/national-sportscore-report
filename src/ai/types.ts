// Shared AI domain types. Framework-agnostic.

export type AssessmentKind =
  | "sprint_30m"
  | "sprint_50m"
  | "broad_jump"
  | "vertical_jump"
  | "shuttle_run"
  | "balance_test"
  | "reaction_test";

export type Gender = "male" | "female" | "other";

export interface AthleteContext {
  athleteId: string;
  age: number;
  gender: Gender;
  heightCm: number;
  weightKg: number;
  district?: string;
  state?: string;
}

export interface VideoSource {
  /** Local URI (file://, blob:, local://). No network fetch. */
  uri: string;
  durationMs?: number;
  width?: number;
  height?: number;
  fps?: number;
  /** Optional metadata for anti-cheat cross-check. */
  recordedAt?: number;
  deviceClockAt?: number;
  gps?: { lat: number; lng: number };
}

export interface QualityReport {
  ok: boolean;
  lighting: number;      // 0..1
  sharpness: number;     // 0..1
  resolution: number;    // 0..1 (>=720p ~ 1)
  fps: number;
  distanceOk: boolean;
  angleOk: boolean;
  subjectVisible: boolean;
  singleAthlete: boolean;
  reasons: string[];
}

export interface Metric { value: number; unit: string; }

export type MetricsMap = Record<string, Metric>;

export interface ScoreBreakdown {
  speed: number;
  power: number;
  strength: number;
  agility: number;
  coordination: number;
  endurance: number;
  reaction: number;
  balance: number;
  overall: number;
  confidence: number;    // 0..1
  nationalPercentile: number;
  districtRank?: number;
  stateRank?: number;
}

export interface Recommendation {
  sport: string;
  fit: number;           // 0..1
  reasons: string[];
}

export interface AntiCheatReport {
  riskScore: number;     // 0..1
  fraudProbability: number;
  reasons: string[];
  recommendation: "accept" | "review" | "reject";
}

export interface AIReport {
  athleteId: string;
  assessment: AssessmentKind;
  createdAt: number;
  quality: QualityReport;
  metrics: MetricsMap;
  scores: ScoreBreakdown;
  recommendations: Recommendation[];
  antiCheat: AntiCheatReport;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  coachNotes: string[];
  trainingPlan: string[];
  nutrition: string[];
  olympicPotential: number; // 0..100
  verification: "verified" | "review" | "rejected";
}
