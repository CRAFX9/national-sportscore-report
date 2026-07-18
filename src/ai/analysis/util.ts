import { LM, type Landmark, type PoseFrame } from "../pose/types";

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function hipCenter(f: PoseFrame): Landmark {
  const l = f.landmarks[LM.LEFT_HIP];
  const r = f.landmarks[LM.RIGHT_HIP];
  return { x: (l.x + r.x) / 2, y: (l.y + r.y) / 2, z: (l.z + r.z) / 2, visibility: Math.min(l.visibility, r.visibility), timestamp: f.timestamp };
}

export function shoulderCenter(f: PoseFrame): Landmark {
  const l = f.landmarks[LM.LEFT_SHOULDER];
  const r = f.landmarks[LM.RIGHT_SHOULDER];
  return { x: (l.x + r.x) / 2, y: (l.y + r.y) / 2, z: 0, visibility: Math.min(l.visibility, r.visibility), timestamp: f.timestamp };
}

/** Body height in normalized units (nose to ankle-midpoint). */
export function bodyPixelHeight(f: PoseFrame): number {
  const nose = f.landmarks[LM.NOSE];
  const la = f.landmarks[LM.LEFT_ANKLE];
  const ra = f.landmarks[LM.RIGHT_ANKLE];
  const ankleY = (la.y + ra.y) / 2;
  return Math.max(0.01, ankleY - nose.y);
}

/** Convert normalized units to meters using athlete height. */
export function unitToMeters(units: number, heightCm: number, frame: PoseFrame): number {
  const h = bodyPixelHeight(frame);
  const metersPerUnit = (heightCm / 100) / h;
  return units * metersPerUnit;
}

export function movingAverage(arr: number[], win = 5): number[] {
  const out: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    const s = Math.max(0, i - win + 1);
    const slice = arr.slice(s, i + 1);
    out.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return out;
}
