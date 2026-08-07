import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Brain, Gauge, MoveVertical, FileCheck2 } from "lucide-react";
import { TopBar } from "@/components/nsrc/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAssessmentDraft } from "@/stores/assessment-draft";
import { resultsRepo, reportsRepo, studentsRepo, assessmentsRepo } from "@/lib/repositories";
import type { AssessmentResult, Report } from "@/lib/types";
import { labelForType } from "@/lib/seed";
import { aiKindForAssessment } from "@/lib/catalog";
import { runPipeline, type PipelineStage } from "@/ai";

export const Route = createFileRoute("/_app/assessments/processing")({
  component: ProcessingPage,
});

const STAGES = [
  { label: "Analyzing pose", Icon: Brain },
  { label: "Calculating speed", Icon: Gauge },
  { label: "Estimating jump height", Icon: MoveVertical },
  { label: "Generating report", Icon: FileCheck2 },
];

const STAGE_MAP: Record<PipelineStage, number> = {
  extracting_frames: 0, quality_check: 0, pose_detection: 0,
  movement_analysis: 1, scoring: 2, anti_cheat: 2, recommendations: 3, report: 3,
};

function ProcessingPage() {
  const navigate = useNavigate();
  const draft = useAssessmentDraft();
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!draft.studentId || !draft.lastAssessmentId) {
      navigate({ to: "/assessments/new" });
      return;
    }
    let cancelled = false;
    (async () => {
      const student = await studentsRepo.find(draft.studentId!);
      const assessment = (await assessmentsRepo.all()).find((a) => a.id === draft.lastAssessmentId);
      if (!student || !assessment) return;
      const report = await runPipeline({
        kind: aiKindForAssessment(assessment.type),
        video: { uri: assessment.videoRef ?? `local://${assessment.id}`, fps: 30, height: 720, recordedAt: assessment.createdAt, deviceClockAt: Date.now() },
        athlete: {
          athleteId: student.athleteId, age: student.age,
          gender: student.gender === "female" ? "female" : student.gender === "male" ? "male" : "other",
          heightCm: student.heightCm, weightKg: student.weightKg,
          district: student.district, state: student.state,
        },
        onProgress: (s, pct) => {
          if (cancelled) return;
          setStage(STAGE_MAP[s]);
          setProgress(pct);
        },
      });
      if (cancelled) return;
      const r: AssessmentResult = {
        id: crypto.randomUUID(),
        assessmentId: draft.lastAssessmentId!,
        studentId: draft.studentId!,
        overall: report.scores.overall,
        metrics: {
          speed: report.scores.speed, strength: report.scores.strength,
          agility: report.scores.agility, power: report.scores.power,
          endurance: report.scores.endurance, coordination: report.scores.coordination,
        },
        nationalPercentile: report.scores.nationalPercentile,
        districtRank: report.scores.districtRank ?? 0,
        recommendedSports: report.recommendations.map((x) => x.sport),
        strengths: report.strengths,
        improvements: report.improvements,
        // Provenance + measured quality/integrity, so the UI never has to invent numbers.
        aiMode: "prototype",
        poseBackend: "mock",
        confidence: report.scores.confidence,
        quality: {
          lighting: report.quality.lighting,
          sharpness: report.quality.sharpness,
          resolution: report.quality.resolution,
          fps: report.quality.fps,
          reasons: report.quality.reasons,
        },
        integrity: {
          status: report.antiCheat.recommendation === "accept"
            ? "verified"
            : report.antiCheat.recommendation === "review" ? "review" : "invalid",
          riskScore: report.antiCheat.riskScore,
          reasons: report.antiCheat.reasons,
        },
        liveAnalysis: assessment.liveAnalysis,
        createdAt: Date.now(),

      };
      await resultsRepo.create(r);
      const rep: Report = {
        id: crypto.randomUUID(),
        studentId: draft.studentId!,
        resultId: r.id,
        title: `${labelForType(assessment.type)} — Report`,
        createdAt: Date.now(),
      };
      await reportsRepo.create(rep);
      navigate({ to: "/assessments/results/$id", params: { id: r.id } });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  return (
    <>
      <TopBar title="Analyzing" />
      <div className="flex flex-col items-center px-6 pt-10">
        <div className="relative flex h-32 w-32 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-primary-container animate-pulse-ring" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full gov-gradient text-primary-foreground elevation-3">
            <Brain className="h-10 w-10" />
          </div>
        </div>
        <p className="mt-6 text-lg font-semibold">Processing your assessment</p>
        <p className="text-sm text-muted-foreground">Runs on-device — no data leaves your phone.</p>

        <div className="mt-6 w-full max-w-sm space-y-3">
          <Progress value={progress} className="h-2" />
          <Card><CardContent className="space-y-3 p-4">
            {STAGES.map((s, i) => {
              const done = i < stage;
              const active = i === stage;
              return (
                <div key={s.label} className="flex items-center gap-3">
                  <span
                    className={
                      "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold " +
                      (done ? "bg-success text-success-foreground"
                        : active ? "bg-primary text-primary-foreground animate-pulse"
                        : "bg-muted text-muted-foreground")
                    }
                  >
                    <s.Icon className="h-4 w-4" />
                  </span>
                  <span className={"text-sm " + (done ? "text-muted-foreground line-through" : "")}>{s.label}</span>
                </div>
              );
            })}
          </CardContent></Card>
        </div>
      </div>
    </>
  );
}
