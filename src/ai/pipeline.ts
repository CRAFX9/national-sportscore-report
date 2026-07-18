// End-to-end orchestrator.
// video → frames → pose → analyze → score → anti-cheat → recommend → report

import type { AIReport, AssessmentKind, AthleteContext, VideoSource } from "./types";
import { framePipeline } from "./utils/frames";
import { validateQuality } from "./utils/quality";
import { createPoseDetector, type PoseBackend } from "./pose/registry";
import type { PoseFrame } from "./pose/types";
import { runAnalyzer } from "./analysis";
import { computeScores } from "./scoring/engine";
import { detectFraud } from "./antiCheat/engine";
import { recommendSports } from "./recommendations/engine";
import { generateReport } from "./recommendations/report";

export interface PipelineConfig {
  pose: PoseBackend;
  fps: number;
  maxFrames: number;
}

export const PIPELINE_CONFIG: PipelineConfig = {
  pose: "mock",       // ← swap to "mediapipe" | "movenet-lightning" | "movenet-thunder"
  fps: 15,
  maxFrames: 90,
};

export interface RunInput {
  kind: AssessmentKind;
  video: VideoSource;
  athlete: AthleteContext;
  seenHashes?: Set<string>;
  contentHash?: string;
  onProgress?: (stage: PipelineStage, pct: number) => void;
}

export type PipelineStage =
  | "extracting_frames"
  | "quality_check"
  | "pose_detection"
  | "movement_analysis"
  | "scoring"
  | "anti_cheat"
  | "recommendations"
  | "report";

export async function runPipeline(input: RunInput): Promise<AIReport> {
  const { kind, video, athlete, onProgress } = input;
  const p = (s: PipelineStage, n: number) => onProgress?.(s, n);

  p("extracting_frames", 5);
  const frames = await framePipeline.extract(video.uri, { fps: PIPELINE_CONFIG.fps, maxFrames: PIPELINE_CONFIG.maxFrames });

  p("quality_check", 20);
  const quality = await validateQuality({ video, frames });

  p("pose_detection", 35);
  const detector = createPoseDetector(PIPELINE_CONFIG.pose);
  await detector.init();
  const poseFrames: PoseFrame[] = [];
  for (const f of frames) {
    const pf = await detector.detectFrame(
      { width: f.width, height: f.height, data: f.data },
      f.timestamp
    );
    if (pf) poseFrames.push(pf);
  }
  await detector.dispose();

  p("movement_analysis", 55);
  const metrics = runAnalyzer(kind, { frames: poseFrames, athlete });

  p("scoring", 70);
  const scores = computeScores({ kind, athlete, metrics });

  p("anti_cheat", 82);
  const motion = framePipeline.detectMotion(frames);
  const antiCheat = detectFraud({
    video, frames: poseFrames, motion,
    contentHash: input.contentHash, seenHashes: input.seenHashes,
  });

  p("recommendations", 92);
  const recs = recommendSports({ scores, age: athlete.age, kind });

  p("report", 100);
  return generateReport({
    athleteId: athlete.athleteId,
    assessment: kind,
    quality, metrics, scores,
    recommendations: recs,
    antiCheat,
  });
}
