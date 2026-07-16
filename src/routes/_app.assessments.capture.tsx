import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, Play, Square, CheckCircle2, AlertTriangle } from "lucide-react";
import { TopBar } from "@/components/nsrc/top-bar";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/nsrc/status-chip";
import { useAssessmentDraft } from "@/stores/assessment-draft";
import { assessmentsRepo } from "@/lib/repositories";
import { labelForType } from "@/lib/seed";
import type { Assessment } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/assessments/capture")({
  component: CapturePage,
});

function CapturePage() {
  const navigate = useNavigate();
  const draft = useAssessmentDraft();
  const current = draft.selected[draft.currentIndex];
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [personDetected, setPersonDetected] = useState(false);
  const [lightingOk, setLightingOk] = useState(false);
  const [steady, setSteady] = useState(false);
  const [frameOk, setFrameOk] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const bboxRef = useRef<{ x: number; y: number; w: number; h: number; score: number } | null>(null);
  const smoothRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const maskRef = useRef<{ data: Uint8Array; width: number; height: number; edge: Uint8Array } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let detectTimer: ReturnType<typeof setInterval> | null = null;
    let qualityTimer: ReturnType<typeof setInterval> | null = null;
    let model: import("@tensorflow-models/body-pix").BodyPix | null = null;

    async function initCam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;

        // Frame-quality sampler: lighting, steadiness, sharpness
        const canvas = document.createElement("canvas");
        const W = 80, H = 60;
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        let prev: Uint8ClampedArray | null = null;

        qualityTimer = setInterval(() => {
          const v = videoRef.current;
          if (!v || v.readyState < 2 || !ctx) return;
          try {
            ctx.drawImage(v, 0, 0, W, H);
            const { data } = ctx.getImageData(0, 0, W, H);

            let sum = 0;
            for (let i = 0; i < data.length; i += 4) {
              sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            }
            const mean = sum / (W * H);
            if (!cancelled) setLightingOk(mean >= 55 && mean <= 220);

            let gsum = 0, gsq = 0, n = 0;
            for (let y = 0; y < H; y++) {
              for (let x = 1; x < W; x++) {
                const i = (y * W + x) * 4;
                const j = (y * W + x - 1) * 4;
                const l1 = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                const l2 = 0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2];
                const g = l1 - l2;
                gsum += g; gsq += g * g; n++;
              }
            }
            const variance = gsq / n - (gsum / n) ** 2;
            if (!cancelled) setFrameOk(variance > 40);

            if (prev) {
              let diff = 0;
              for (let i = 0; i < data.length; i += 4) {
                diff += Math.abs(data[i] - prev[i]);
              }
              const avgDiff = diff / (W * H);
              if (!cancelled) setSteady(avgDiff < 12);
            }
            prev = new Uint8ClampedArray(data);
          } catch { /* ignore */ }
        }, 300);

        // Load on-device body segmentation (BodyPix via TensorFlow.js)
        const [tf, bodyPix] = await Promise.all([
          import("@tensorflow/tfjs"),
          import("@tensorflow-models/body-pix"),
        ]);
        await tf.ready();
        if (cancelled) return;
        model = await bodyPix.load({ architecture: "MobileNetV1", outputStride: 16, multiplier: 0.5, quantBytes: 2 });
        if (cancelled) return;

        detectTimer = setInterval(async () => {
          const v = videoRef.current;
          if (!v || v.readyState < 2 || !model) return;
          try {
            const seg = await model.segmentPerson(v, {
              internalResolution: "medium",
              segmentationThreshold: 0.7,
              maxDetections: 1,
            });
            const { data, width, height } = seg;
            // Compute bbox + count from mask
            let minX = width, minY = height, maxX = 0, maxY = 0, count = 0;
            for (let y = 0; y < height; y++) {
              for (let x = 0; x < width; x++) {
                if (data[y * width + x]) {
                  count++;
                  if (x < minX) minX = x;
                  if (y < minY) minY = y;
                  if (x > maxX) maxX = x;
                  if (y > maxY) maxY = y;
                }
              }
            }
            const found = count > width * height * 0.02;
            if (found) {
              // Edge mask: pixel is edge if fg and any 4-neighbor is bg
              const edge = new Uint8Array(width * height);
              for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                  const i = y * width + x;
                  if (!data[i]) continue;
                  if (!data[i - 1] || !data[i + 1] || !data[i - width] || !data[i + width]) edge[i] = 1;
                }
              }
              // Map bbox from mask coords to video coords
              const sx = v.videoWidth / width;
              const sy = v.videoHeight / height;
              bboxRef.current = {
                x: minX * sx,
                y: minY * sy,
                w: (maxX - minX) * sx,
                h: (maxY - minY) * sy,
                score: Math.min(1, count / (width * height * 0.25)),
              };
              maskRef.current = { data: data as Uint8Array, width, height, edge };
            } else {
              bboxRef.current = null;
              maskRef.current = null;
            }
            if (!cancelled) setPersonDetected(found);
          } catch { /* ignore per-frame errors */ }
        }, 250);

        // rAF draw loop: body-shaped tracking outline
        let raf = 0;
        // Offscreen canvases for the mask fill and edge outline
        const fillCanvas = document.createElement("canvas");
        const edgeCanvas = document.createElement("canvas");
        const draw = () => {
          const v = videoRef.current;
          const c = overlayRef.current;
          if (v && c && v.videoWidth) {
            const cw = c.clientWidth, ch = c.clientHeight;
            if (c.width !== cw) c.width = cw;
            if (c.height !== ch) c.height = ch;
            const dctx = c.getContext("2d");
            if (dctx) {
              dctx.clearRect(0, 0, cw, ch);
              const box = bboxRef.current;
              const mask = maskRef.current;
              if (box && mask) {
                // object-cover mapping video -> canvas
                const vw = v.videoWidth, vh = v.videoHeight;
                const scale = Math.max(cw / vw, ch / vh);
                const dw = vw * scale, dh = vh * scale;
                const offX = (cw - dw) / 2, offY = (ch - dh) / 2;

                const t = performance.now() / 1000;
                const pulse = 0.55 + 0.45 * Math.sin(t * 3.5);

                // Build fill imagedata (green tint over person)
                const { data: md, width: mw, height: mh, edge } = mask;
                if (fillCanvas.width !== mw) { fillCanvas.width = mw; edgeCanvas.width = mw; }
                if (fillCanvas.height !== mh) { fillCanvas.height = mh; edgeCanvas.height = mh; }
                const fctx = fillCanvas.getContext("2d");
                const ectx = edgeCanvas.getContext("2d");
                if (fctx && ectx) {
                  const fill = fctx.createImageData(mw, mh);
                  const edgeImg = ectx.createImageData(mw, mh);
                  for (let i = 0; i < md.length; i++) {
                    if (md[i]) {
                      const p = i * 4;
                      fill.data[p] = 52; fill.data[p + 1] = 211; fill.data[p + 2] = 153; fill.data[p + 3] = 55;
                    }
                    if (edge[i]) {
                      const p = i * 4;
                      edgeImg.data[p] = 52; edgeImg.data[p + 1] = 211; edgeImg.data[p + 2] = 153; edgeImg.data[p + 3] = 255;
                    }
                  }
                  fctx.putImageData(fill, 0, 0);
                  ectx.putImageData(edgeImg, 0, 0);

                  // Draw silhouette fill
                  dctx.imageSmoothingEnabled = true;
                  dctx.globalAlpha = 0.65 * pulse;
                  dctx.drawImage(fillCanvas, offX, offY, dw, dh);

                  // Draw glow outline (blurred)
                  dctx.globalAlpha = 0.9;
                  dctx.filter = "blur(4px)";
                  dctx.drawImage(edgeCanvas, offX, offY, dw, dh);
                  dctx.filter = "none";

                  // Crisp outline
                  dctx.globalAlpha = 1;
                  dctx.drawImage(edgeCanvas, offX, offY, dw, dh);
                  dctx.globalAlpha = 1;
                }

                // Derived bbox in canvas coords
                const tx = box.x * scale + offX;
                const ty = box.y * scale + offY;
                const tw = box.w * scale;
                const th = box.h * scale;
                const s = smoothRef.current;
                const next = s
                  ? { x: s.x + (tx - s.x) * 0.35, y: s.y + (ty - s.y) * 0.35, w: s.w + (tw - s.w) * 0.35, h: s.h + (th - s.h) * 0.35 }
                  : { x: tx, y: ty, w: tw, h: th };
                smoothRef.current = next;
                const { x, y, w, h } = next;

                // Corner brackets around bbox
                const cl = Math.min(24, Math.min(w, h) * 0.2);
                dctx.strokeStyle = "#34d399";
                dctx.lineWidth = 3;
                dctx.lineCap = "round";
                const corners: Array<[number, number, number, number, number, number]> = [
                  [x, y + cl, x, y, x + cl, y],
                  [x + w - cl, y, x + w, y, x + w, y + cl],
                  [x, y + h - cl, x, y + h, x + cl, y + h],
                  [x + w - cl, y + h, x + w, y + h, x + w, y + h - cl],
                ];
                for (const [x1, y1, x2, y2, x3, y3] of corners) {
                  dctx.beginPath();
                  dctx.moveTo(x1, y1); dctx.lineTo(x2, y2); dctx.lineTo(x3, y3);
                  dctx.stroke();
                }

                // Label
                const label = `PERSON  ${(box.score * 100).toFixed(0)}%`;
                dctx.font = "600 11px ui-sans-serif, system-ui";
                const tm = dctx.measureText(label);
                const padX = 8, padY = 4;
                const labelW = tm.width + padX * 2, labelH = 20;
                const lx = x, ly = Math.max(0, y - labelH - 4);
                dctx.fillStyle = "rgba(16, 185, 129, 0.95)";
                dctx.fillRect(lx, ly, labelW, labelH);
                dctx.fillStyle = "#0b1220";
                dctx.fillText(label, lx + padX, ly + labelH - padY - 2);
              } else {
                smoothRef.current = null;
              }
            }
          }
          raf = requestAnimationFrame(draw);
        };
        raf = requestAnimationFrame(draw);
        rafRef = raf;
      } catch {
        /* camera not available */
      }
    }
    let rafRef = 0;
    initCam();
    return () => {
      cancelled = true;
      if (detectTimer) clearInterval(detectTimer);
      if (qualityTimer) clearInterval(qualityTimer);
      if (rafRef) cancelAnimationFrame(rafRef);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  if (!current) { navigate({ to: "/assessments/new" }); return null; }

  const stop = async () => {
    setRecording(false);
    if (!draft.studentId) return;
    const a: Assessment = {
      id: crypto.randomUUID(),
      studentId: draft.studentId,
      type: current,
      createdAt: Date.now(),
      videoRef: `local://${crypto.randomUUID()}.mp4`,
      syncStatus: "pending",
    };
    await assessmentsRepo.create(a);
    draft.setLast(a.id);
    toast.success("Video saved locally");
    navigate({ to: "/assessments/processing" });
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <>
      <TopBar title={labelForType(current)} back />
      <div className="relative -mt-4 h-[calc(100vh-9rem)] w-full overflow-hidden bg-black">
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover opacity-90" />
        <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" />

        {/* Skeleton / overlay guides */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-4 top-1/3 h-px w-8 bg-tertiary" />
          <div className="absolute right-4 top-1/3 h-px w-8 bg-tertiary" />
          <p className="absolute left-4 top-[calc(33%-18px)] text-[10px] font-semibold uppercase tracking-widest text-tertiary">Start line</p>

          <div className="absolute left-4 bottom-1/4 h-px w-8 bg-primary-foreground" />
          <div className="absolute right-4 bottom-1/4 h-px w-8 bg-primary-foreground" />
          <p className="absolute left-4 bottom-[calc(25%+8px)] text-[10px] font-semibold uppercase tracking-widest text-primary-foreground">Finish line</p>

          {/* Joint markers */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            {[
              { x: 0, y: -60 }, { x: -20, y: -20 }, { x: 20, y: -20 },
              { x: -30, y: 20 }, { x: 30, y: 20 }, { x: -20, y: 60 }, { x: 20, y: 60 },
            ].map((p, i) => (
              <span
                key={i}
                className="absolute h-2 w-2 rounded-full bg-tertiary ring-2 ring-tertiary/40"
                style={{ transform: `translate(${p.x}px, ${p.y}px)` }}
              />
            ))}
          </div>
        </div>

        {/* Top overlay chips */}
        <div className="absolute left-3 right-3 top-3 flex flex-wrap gap-1.5">
          <QualityChip ok={personDetected} label={personDetected ? "Person detected" : "Detecting person…"} />
          <QualityChip ok={lightingOk} label={lightingOk ? "Lighting good" : "Poor lighting"} />
          <QualityChip ok={steady} label={steady ? "Camera stable" : "Hold steady"} />
          <QualityChip ok={frameOk} label={frameOk ? "Frame quality" : "Blurry frame"} />
        </div>

        {/* Timer */}
        {recording && (
          <div className="absolute left-1/2 top-16 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-sm font-mono text-primary-foreground">
            <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" /> REC {mm}:{ss}
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center">
          {recording ? (
            <button onClick={stop} className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive text-destructive-foreground elevation-3">
              <Square className="h-6 w-6" />
            </button>
          ) : (
            <button
              disabled={!personDetected || !lightingOk || !steady || !frameOk}
              onClick={() => {
                if (!personDetected) { toast.error("No person detected"); return; }
                if (!lightingOk) { toast.error("Lighting is poor"); return; }
                if (!steady) { toast.error("Hold the camera steady"); return; }
                if (!frameOk) { toast.error("Frame is blurry"); return; }
                setSeconds(0); setRecording(true);
              }}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-foreground text-primary elevation-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="h-7 w-7" />
            </button>
          )}
        </div>

        <div className="pointer-events-none absolute bottom-2 left-0 right-0 text-center text-[10px] uppercase tracking-widest text-primary-foreground/70">
          <Camera className="mr-1 inline h-3 w-3" /> AI skeleton overlay — placeholder
        </div>
      </div>
    </>
  );
}

function QualityChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <StatusChip variant={ok ? "success" : "warning"} className="backdrop-blur bg-black/40 text-primary-foreground">
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />} {label}
    </StatusChip>
  );
}
