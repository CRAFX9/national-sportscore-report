import type { QualityReport, VideoSource } from "../types";
import { framePipeline, type Frame } from "./frames";

export interface QualityInput {
  video: VideoSource;
  frames?: Frame[];
}

export async function validateQuality({ video, frames }: QualityInput): Promise<QualityReport> {
  const fs = frames ?? (await framePipeline.extract(video.uri, { fps: 15 }));
  const q = framePipeline.quality(fs);
  const reasons: string[] = [];
  const resScore = video.height ? Math.min(1, video.height / 720) : 0.8;

  if (q.lighting < 0.25) reasons.push("Lighting too low — record in bright, even light.");
  if (q.lighting > 0.95) reasons.push("Overexposed — reduce direct sunlight or glare.");
  if (q.sharpness < 0.3) reasons.push("Blurry footage — hold the phone steadier or clean the lens.");
  if (q.fps < 20) reasons.push("Low frame rate — record at 30 fps or higher.");
  if (resScore < 0.6) reasons.push("Low resolution — record at 720p or higher.");

  return {
    ok: reasons.length === 0,
    lighting: q.lighting,
    sharpness: q.sharpness,
    resolution: resScore,
    fps: q.fps,
    distanceOk: true,
    angleOk: true,
    subjectVisible: true,
    singleAthlete: true,
    reasons,
  };
}
