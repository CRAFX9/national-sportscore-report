import { Card, CardContent } from "@/components/ui/card";
import { StatusChip } from "@/components/nsrc/status-chip";
import { DataBadge, Disclaimer } from "@/components/nsrc/data-badge";
import type { AssessmentResult } from "@/lib/types";
import { ShieldCheck, Gauge } from "lucide-react";

function pct(v: number) { return Math.round(Math.max(0, Math.min(1, v)) * 100); }

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{pct(value)}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct(value)}%` }} />
      </div>
    </div>
  );
}

/**
 * Assessment quality — driven only by values the pipeline actually measured
 * (lighting, sharpness, resolution, frame rate). When no measurement exists we
 * show "Prototype" instead of inventing a percentage.
 */
export function AssessmentQualityPanel({ result }: { result: AssessmentResult }) {
  const q = result.quality;
  const measured = !!q;
  const score = q ? (q.lighting + q.sharpness + q.resolution + Math.min(1, q.fps / 30)) / 4 : undefined;
  const band = score === undefined ? "" : score >= 0.8 ? "Good" : score >= 0.6 ? "Acceptable" : "Poor";

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Gauge className="h-3.5 w-3.5" /> Assessment quality
          </p>
          <DataBadge kind={measured ? "measured" : "prototype"} />
        </div>

        {measured && q && score !== undefined ? (
          <>
            <p className="text-2xl font-bold">
              {pct(score)}% <span className="text-sm font-medium text-muted-foreground">— {band}</span>
            </p>
            <div className="space-y-2">
              <Bar label="Lighting" value={q.lighting} />
              <Bar label="Frame sharpness" value={q.sharpness} />
              <Bar label="Resolution" value={q.resolution} />
              <Bar label="Frame consistency" value={Math.min(1, q.fps / 30)} />
            </div>
            {result.confidence !== undefined && (
              <p className="text-xs text-muted-foreground">
                Engine confidence in the derived metrics: <strong>{pct(result.confidence)}%</strong>
              </p>
            )}
            {q.reasons.length > 0 && (
              <ul className="list-inside list-disc space-y-0.5 text-xs text-warning-foreground">
                {q.reasons.map((r) => <li key={r}>{r}</li>)}
              </ul>
            )}
          </>
        ) : (
          <>
            <p className="text-lg font-bold">Assessment Quality: Prototype</p>
            <Disclaimer>
              No camera-quality measurement was stored for this assessment, so no percentage is shown.
              The panel is wired to the pipeline's quality output and will display real values once a
              confidence model runs on the recording.
            </Disclaimer>
          </>
        )}
      </CardContent>
    </Card>
  );
}

const INTEGRITY_UI = {
  verified: { label: "VERIFIED", variant: "success" as const },
  review: { label: "REVIEW REQUIRED", variant: "warning" as const },
  invalid: { label: "INVALID", variant: "danger" as const },
};

/** Integrity verification framework — heuristic checks only, clearly labelled. */
export function IntegrityPanel({ result }: { result: AssessmentResult }) {
  const it = result.integrity;
  const ui = it ? INTEGRITY_UI[it.status] : null;

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> Assessment integrity
          </p>
          <DataBadge kind="prototype" note="Integrity verification framework" />
        </div>

        {it && ui ? (
          <>
            <div className="flex items-center gap-2">
              <StatusChip variant={ui.variant}>{ui.label}</StatusChip>
              <span className="text-xs text-muted-foreground">risk {Math.round(it.riskScore * 100)}%</span>
            </div>
            {it.reasons.length > 0 ? (
              <ul className="list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
                {it.reasons.map((r) => <li key={r}>{r}</li>)}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">No heuristic flags were raised.</p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No integrity data stored for this assessment.</p>
        )}

        <div className="border-t border-border/60 pt-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Checks in this framework
          </p>
          <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            <li>Duplicate video hash — implemented</li>
            <li>Timestamp / clock drift — implemented</li>
            <li>Frame-timing consistency — implemented</li>
            <li>Athlete leaves frame — implemented</li>
            <li>Pose continuity — heuristic</li>
            <li>Optical-flow consistency — heuristic</li>
            <li>Device / camera fingerprint — future</li>
            <li>Server-side re-verification — future</li>
          </ul>
        </div>

        <Disclaimer>
          This is an integrity verification <strong>framework</strong>, not a certified authenticity
          proof. Heuristic flags cannot by themselves prove a video is genuine; results marked
          REVIEW REQUIRED must be checked by a human reviewer.
        </Disclaimer>
      </CardContent>
    </Card>
  );
}
