// OpenCV-equivalent frame pipeline. Web build uses <video> + Canvas2D
// (no OpenCV.js dependency to keep bundle light). Native build should
// swap in react-native-vision-camera frame processors implementing the
// same FramePipeline interface.

export interface Frame {
  timestamp: number;
  width: number;
  height: number;
  data: Uint8ClampedArray; // RGBA
}

export interface FramePipeline {
  extract(uri: string, opts?: { fps?: number; maxFrames?: number }): Promise<Frame[]>;
  quality(frames: Frame[]): { lighting: number; sharpness: number; motion: number; fps: number };
  stabilize(frames: Frame[]): Frame[];
  opticalFlow(prev: Frame, next: Frame): { dx: number; dy: number; magnitude: number };
  detectMotion(frames: Frame[]): number[]; // per-frame motion magnitude
}

// Reference implementation. Deterministic, offline.
export const framePipeline: FramePipeline = {
  async extract(uri: string, opts = {}) {
    const fps = opts.fps ?? 15;
    const max = opts.maxFrames ?? 90;
    // Real impl decodes <video src=uri>. Placeholder returns synthetic frames.
    const frames: Frame[] = [];
    const W = 32, H = 24;
    for (let i = 0; i < max; i++) {
      const data = new Uint8ClampedArray(W * H * 4);
      for (let p = 0; p < data.length; p += 4) {
        data[p] = 120 + ((i * 3) % 40);
        data[p + 1] = 130;
        data[p + 2] = 140;
        data[p + 3] = 255;
      }
      frames.push({ timestamp: (i / fps) * 1000, width: W, height: H, data });
    }
    void uri;
    return frames;
  },

  quality(frames) {
    if (!frames.length) return { lighting: 0, sharpness: 0, motion: 0, fps: 0 };
    let lum = 0, sharp = 0, motion = 0;
    for (let f = 0; f < frames.length; f++) {
      const { data, width, height } = frames[f];
      let s = 0, g = 0;
      for (let i = 0; i < data.length; i += 4) {
        s += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }
      lum += s / (width * height);
      // simple horizontal-gradient variance
      for (let y = 0; y < height; y++) {
        for (let x = 1; x < width; x++) {
          const i = (y * width + x) * 4;
          g += Math.abs(data[i] - data[i - 4]);
        }
      }
      sharp += g / (width * height);
      if (f > 0) {
        const prev = frames[f - 1].data;
        let d = 0;
        for (let i = 0; i < data.length; i += 4) d += Math.abs(data[i] - prev[i]);
        motion += d / (width * height);
      }
    }
    const n = frames.length;
    const durSec = (frames.at(-1)!.timestamp - frames[0].timestamp) / 1000 || 1;
    return {
      lighting: Math.min(1, lum / n / 255),
      sharpness: Math.min(1, sharp / n / 40),
      motion: motion / Math.max(1, n - 1),
      fps: n / durSec,
    };
  },

  stabilize(frames) { return frames; },

  opticalFlow(prev, next) {
    let dx = 0, dy = 0, mag = 0;
    const len = Math.min(prev.data.length, next.data.length);
    for (let i = 0; i < len; i += 4) {
      const d = next.data[i] - prev.data[i];
      dx += d;
      mag += Math.abs(d);
    }
    return { dx: dx / len, dy, magnitude: mag / len };
  },

  detectMotion(frames) {
    const out: number[] = [];
    for (let i = 1; i < frames.length; i++) {
      out.push(this.opticalFlow(frames[i - 1], frames[i]).magnitude);
    }
    return out;
  },
};
