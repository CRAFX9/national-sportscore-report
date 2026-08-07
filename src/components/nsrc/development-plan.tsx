import { Card, CardContent } from "@/components/ui/card";
import { StatusChip } from "@/components/nsrc/status-chip";
import { Disclaimer } from "@/components/nsrc/data-badge";
import type { AssessmentResult } from "@/lib/types";
import { developmentPlan } from "@/lib/insights";
import { format } from "date-fns";
import { Target } from "lucide-react";

/** Strengths / focus areas / suggested activities / next assessment date. */
export function DevelopmentPlanCard({ result }: { result: AssessmentResult }) {
  const plan = developmentPlan(result);
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Target className="h-3.5 w-3.5" /> Athlete development
        </p>

        <div>
          <p className="text-xs font-medium text-muted-foreground">Strengths</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {plan.strengths.map((m) => (
              <StatusChip key={m.key} variant="success">{m.label} {m.value}</StatusChip>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground">Areas to improve</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {plan.focus.map((m) => (
              <StatusChip key={m.key} variant="warning">{m.label} {m.value}</StatusChip>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground">Recommended activities</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm">
            {plan.activities.length === 0
              ? <li className="text-muted-foreground">Maintain the current training plan.</li>
              : plan.activities.map((a) => <li key={a}>{a}</li>)}
          </ul>
        </div>

        <div className="flex items-center justify-between border-t border-border/60 pt-2 text-sm">
          <span className="text-muted-foreground">Next assessment</span>
          <span className="font-semibold">
            {format(plan.nextAssessmentAt, "dd MMM yyyy")} ({plan.nextAssessmentInDays} days)
          </span>
        </div>

        <Disclaimer>
          AI-assisted general training guidance based on this athlete's measured metrics.
          It is not medical advice, a diagnosis, or a selection decision.
        </Disclaimer>
      </CardContent>
    </Card>
  );
}
