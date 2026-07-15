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
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function initCam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        // Simulate AI person detection after camera warms up
        setTimeout(() => { if (!cancelled) setPersonDetected(true); }, 1800);
      } catch {
        /* camera not available — show placeholder */
      }
    }
    initCam();
    return () => {
      cancelled = true;
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
          <QualityChip ok label="Person detected" />
          <QualityChip ok label="Lighting good" />
          <QualityChip ok={seconds < 2} label={seconds >= 2 && recording ? "Camera stable" : "Hold steady"} />
          <QualityChip ok label="Frame quality" />
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
              onClick={() => { setSeconds(0); setRecording(true); }}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-foreground text-primary elevation-3"
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
