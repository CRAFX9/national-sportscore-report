import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Brain, Gauge, MoveVertical, FileCheck2 } from "lucide-react";
import { TopBar } from "@/components/nsrc/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAssessmentDraft } from "@/stores/assessment-draft";
import { resultsRepo, reportsRepo } from "@/lib/repositories";
import type { AssessmentResult, Report } from "@/lib/types";
import { labelForType } from "@/lib/seed";

export const Route = createFileRoute("/_app/assessments/processing")({
  component: ProcessingPage,
});

const STAGES = [
  { label: "Analyzing pose", Icon: Brain },
  { label: "Calculating speed", Icon: Gauge },
  { label: "Estimating jump height", Icon: MoveVertical },
  { label: "Generating report", Icon: FileCheck2 },
];

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
    const timers: number[] = [];
    STAGES.forEach((_, i) => {
      timers.push(window.setTimeout(() => setStage(i + 1), (i + 1) * 700));
    });
    const p = window.setInterval(() => {
      setProgress((v) => (v >= 100 ? 100 : v + 4));
    }, 120);

    const done = window.setTimeout(async () => {
      const base = 55 + Math.floor(Math.random() * 40);
      const jitter = () => Math.max(30, Math.min(99, base + Math.floor(Math.random() * 24 - 12)));
      const r: AssessmentResult = {
        id: crypto.randomUUID(),
        assessmentId: draft.lastAssessmentId!,
        studentId: draft.studentId!,
        overall: base,
        metrics: {
          speed: jitter(), strength: jitter(), agility: jitter(),
          power: jitter(), endurance: jitter(), coordination: jitter(),
        },
        nationalPercentile: 60 + Math.floor(Math.random() * 40),
        districtRank: 1 + Math.floor(Math.random() * 200),
        recommendedSports: ["Athletics — Sprint", "Long Jump", "Football"],
        strengths: ["Explosive power", "Reaction time"],
        improvements: ["Cardiovascular endurance"],
        createdAt: Date.now(),
      };
      await resultsRepo.create(r);
      const type = draft.selected[draft.currentIndex];
      const report: Report = {
        id: crypto.randomUUID(),
        studentId: draft.studentId!,
        resultId: r.id,
        title: `${labelForType(type)} — Report`,
        createdAt: Date.now(),
      };
      await reportsRepo.create(report);
      navigate({ to: "/assessments/results/$id", params: { id: r.id } });
    }, 3200);

    return () => { timers.forEach(clearTimeout); clearInterval(p); clearTimeout(done); };
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
