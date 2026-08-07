import { Card, CardContent } from "@/components/ui/card";
import { StatusChip } from "@/components/nsrc/status-chip";
import { DataBadge, Disclaimer } from "@/components/nsrc/data-badge";
import { MetricsRadar } from "@/components/nsrc/metrics-radar";
import type { AssessmentResult } from "@/lib/types";
import { METRIC_KEYS, METRIC_LABELS } from "@/lib/trends";
import { sportSuggestions } from "@/lib/insights";
import { Sparkles } from "lucide-react";

/**
 * Talent radar — only plots dimensions that actually exist on the result,
 * plus sport suggestions (never presented as predictions).
 */
export function TalentRadar({ result }: { result: AssessmentResult }) {
  const present = METRIC_KEYS.filter((k) => typeof result.metrics[k] === "number");
  const radar = Object.fromEntries(
    present.map((k) => [METRIC_LABELS[k] ?? k, result.metrics[k] as number]),
  );
  const suggestions = sportSuggestions(result);
  const prototype = result.aiMode !== "model";

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Talent radar
          </p>
          <DataBadge
            kind={prototype ? "prototype" : "measured"}
            note={prototype ? "Heuristic analysers on the prototype pose backend" : "Produced by a real pose model"}
          />
        </div>

        {present.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No comparable dimensions were produced for this assessment.
          </p>
        ) : (
          <>
            <MetricsRadar metrics={radar} />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {present.map((k) => (
                <div key={k} className="rounded-xl bg-muted/50 p-2 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {METRIC_LABELS[k] ?? k}
                  </p>
                  <p className="text-lg font-bold text-primary">{result.metrics[k]}</p>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="space-y-2 border-t border-border/60 pt-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> AI recommended sports
          </p>
          {suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No suggestions available for this assessment.</p>
          ) : (
            <ul className="space-y-1.5">
              {suggestions.map((s) => (
                <li key={s.sport} className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{s.sport}</span>
                  <StatusChip variant="info">{s.basis}</StatusChip>
                </li>
              ))}
            </ul>
          )}
          <Disclaimer>
            Suggestions only — a possible fit based on this athlete's measured metric pattern.
            They are not guaranteed predictions and do not replace a coach's or selector's judgement.
          </Disclaimer>
        </div>
      </CardContent>
    </Card>
  );
}
