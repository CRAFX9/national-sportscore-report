import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Activity, Timer, Zap, MoveVertical, MoveHorizontal, Gauge, HeartPulse, Dumbbell, Trophy,
} from "lucide-react";
import { TopBar } from "@/components/nsrc/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { studentsRepo } from "@/lib/repositories";
import { useAssessmentDraft } from "@/stores/assessment-draft";
import {
  ASSESSMENT_CATALOG, CATEGORY_LABELS, type AssessmentCategory,
} from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/assessments/new")({
  component: AssessmentSelectPage,
});

const CATEGORY_ORDER: AssessmentCategory[] = ["fitness", "health", "sport", "game"];

const CATEGORY_ICON: Record<AssessmentCategory, typeof Activity> = {
  fitness: Dumbbell,
  health: HeartPulse,
  sport: Trophy,
  game: Activity,
};

const TEST_ICON: Record<string, typeof Activity> = {
  sprint_30m: Timer,
  sprint_50m: Zap,
  broad_jump: MoveHorizontal,
  vertical_jump: MoveVertical,
  shuttle_run: Activity,
  reaction_test: Gauge,
};

function AssessmentSelectPage() {
  const navigate = useNavigate();
  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: () => studentsRepo.all() });
  const draft = useAssessmentDraft();
  const [studentId, setStudentId] = useState<string>(draft.studentId ?? "");
  const [category, setCategory] = useState<AssessmentCategory>("fitness");

  const tests = useMemo(
    () => ASSESSMENT_CATALOG.filter((a) => a.category === category),
    [category],
  );

  const proceed = () => {
    if (!studentId) return toast.error("Select an athlete first");
    if (draft.selected.length === 0) return toast.error("Choose at least one assessment");
    draft.setStudent(studentId);
    navigate({ to: "/assessments/instructions" });
  };

  return (
    <>
      <TopBar title="New Assessment" back />
      <div className="space-y-4 px-4 pt-4 pb-6">
        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Athlete</p>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="">Select an athlete…</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.name} — {s.athleteId}</option>
              ))}
            </select>
            {students.length === 0 && (
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link to="/students/new">+ Register a student</Link>
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORY_ORDER.map((c) => {
            const Icon = CATEGORY_ICON[c];
            const count = ASSESSMENT_CATALOG.filter((a) => a.category === c && draft.selected.includes(a.id)).length;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  category === c
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-muted",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {CATEGORY_LABELS[c]}
                {count > 0 && (
                  <span className="rounded-full bg-background/25 px-1.5 text-[10px] font-bold">{count}</span>
                )}
              </button>
            );
          })}
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {CATEGORY_LABELS[category]} — select tests (multi)
          </p>
          <div className="grid grid-cols-2 gap-3">
            {tests.map(({ id, label, desc }) => {
              const Icon = TEST_ICON[id] ?? CATEGORY_ICON[category];
              const active = draft.selected.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => draft.toggle(id)}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-2xl border p-3 text-left transition",
                    active
                      ? "border-primary bg-primary-container elevation-2"
                      : "border-border bg-card hover:bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl",
                      active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        <Button size="lg" className="w-full" onClick={proceed}>
          Continue ({draft.selected.length})
        </Button>
      </div>
    </>
  );
}
