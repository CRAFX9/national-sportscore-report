import { cn } from "@/lib/utils";

type Variant = "success" | "warning" | "info" | "neutral" | "danger";

const styles: Record<Variant, string> = {
  success: "bg-success/15 text-success",
  warning: "bg-warning/20 text-warning-foreground",
  info: "bg-primary-container text-on-primary-container",
  neutral: "bg-muted text-muted-foreground",
  danger: "bg-destructive/15 text-destructive",
};

export function StatusChip({
  children, variant = "neutral", className,
}: { children: React.ReactNode; variant?: Variant; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[variant], className,
      )}
    >
      {children}
    </span>
  );
}
