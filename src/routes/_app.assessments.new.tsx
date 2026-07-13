import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Activity, Timer, Zap, MoveVertical, MoveHorizontal, Gauge } from "lucide-react";
import { TopBar } from "@/components/nsrc/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { studentsRepo } from "@/lib/repositories";
import { useAssessmentDraft } from "@/stores/assessment-draft";
import type { AssessmentType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/assessments/new")({
  component: AssessmentSelectPage,
});

const ASSESSMENTS: { id: AssessmentType; label: string; desc: string; Icon: typeof Activity }[] = [
  { id: "sprint_30m", label: "30m Sprint", desc: "Acceleration test", Icon: Timer },
  { id: "sprint_50m", label: "50m Sprint", desc: "Peak speed", Icon: Zap },
  { id: "broad_jump", label: "Standing Broad Jump", desc: "Explosive power", Icon: MoveHorizontal },
  { id: "vertical_jump", label: "Vertical Jump", desc: "Lower-body power", Icon: MoveVertical },
  { id: "shuttle_run", label: "4x10m Shuttle Run", desc: "Agility & change of direction", Icon: Activity },
  { id: "reaction_test", label: "Reaction Test", desc: "Neuromuscular response", Icon: Gauge },
];

function AssessmentSelectPage() {
  const navigate = useNavigate();
  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: () => studentsRepo.all() });
  const draft = useAssessmentDraft();
  const [studentId, setStudentId] = useState<string>(draft.studentId ?? "");

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

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select tests (multi)</p>
          <div className="grid grid-cols-2 gap-3">
            {ASSESSMENTS.map(({ id, label, desc, Icon }) => {
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
