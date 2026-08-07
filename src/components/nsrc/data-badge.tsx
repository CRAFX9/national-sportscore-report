import { cn } from "@/lib/utils";
import { FlaskConical, Gauge, Clock } from "lucide-react";

/**
 * Honest provenance labelling used across NSRC:
 *  measured  — value computed by code from the recorded video / stored records
 *  prototype — heuristic or mock layer, replaceable by a real model
 *  future    — not implemented; architecture only
 */
export type DataKind = "measured" | "prototype" | "future";

const CONFIG: Record<DataKind, { label: string; className: string; Icon: typeof Gauge }> = {
  measured: {
    label: "Measured",
    className: "bg-success/15 text-success",
    Icon: Gauge,
  },
  prototype: {
    label: "Prototype",
    className: "bg-warning/20 text-warning-foreground",
    Icon: FlaskConical,
  },
  future: {
    label: "Future",
    className: "bg-muted text-muted-foreground",
    Icon: Clock,
  },
};

export function DataBadge({
  kind, note, className,
}: { kind: DataKind; note?: string; className?: string }) {
  const { label, className: tone, Icon } = CONFIG[kind];
  return (
    <span
      title={note}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        tone, className,
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
      {note ? <span className="sr-only">— {note}</span> : null}
    </span>
  );
}

export function Disclaimer({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl bg-muted/60 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
      {children}
    </p>
  );
}
