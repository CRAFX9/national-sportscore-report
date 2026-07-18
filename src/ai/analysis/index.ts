// Per-assessment analyzer registry. Each analyzer consumes a stream of
// PoseFrames and returns a MetricsMap. Analyzers are pure functions so
// they are easy to unit-test.

import type { AssessmentKind, AthleteContext, MetricsMap } from "../types";
import type { PoseFrame } from "../pose/types";
import { analyzeSprint } from "./sprint";
import { analyzeBroadJump } from "./broad-jump";
import { analyzeVerticalJump } from "./vertical-jump";
import { analyzeShuttleRun } from "./shuttle-run";
import { analyzeBalance } from "./balance";

export interface AnalyzerInput {
  frames: PoseFrame[];
  athlete: AthleteContext;
  distanceMeters?: number;
}

export type Analyzer = (input: AnalyzerInput) => MetricsMap;

const REGISTRY: Partial<Record<AssessmentKind, Analyzer>> = {
  sprint_30m: (i) => analyzeSprint({ ...i, distanceMeters: 30 }),
  sprint_50m: (i) => analyzeSprint({ ...i, distanceMeters: 50 }),
  broad_jump: analyzeBroadJump,
  vertical_jump: analyzeVerticalJump,
  shuttle_run: analyzeShuttleRun,
  balance_test: analyzeBalance,
  reaction_test: analyzeBalance, // reuses stability signal
};

export function runAnalyzer(kind: AssessmentKind, input: AnalyzerInput): MetricsMap {
  const fn = REGISTRY[kind];
  if (!fn) throw new Error(`No analyzer registered for ${kind}`);
  return fn(input);
}
