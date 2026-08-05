import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, RefreshCw, Upload, XCircle, Wifi, WifiOff } from "lucide-react";
import { TopBar } from "@/components/nsrc/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusChip } from "@/components/nsrc/status-chip";
import { EmptyState } from "@/components/nsrc/states";
import { syncRepo } from "@/lib/repositories";
import { listJobs, resumePendingJobs } from "@/ai";
import { Cpu } from "lucide-react";
import { db } from "@/lib/db";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_app/sync")({
  component: SyncPage,
});

function SyncPage() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({
    queryKey: ["sync-queue"],
    queryFn: () => syncRepo.all(),
  });
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [syncing, setSyncing] = useState(false);
  const [resuming, setResuming] = useState(false);
  const { data: jobs = [] } = useQuery({ queryKey: ["ai-jobs"], queryFn: async () => listJobs() });

  const resumeAi = async () => {
    setResuming(true);
    try {
      await resumePendingJobs();
      toast.success("AI processing queue resumed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not resume AI jobs");
    }
    await qc.invalidateQueries({ queryKey: ["ai-jobs"] });
    setResuming(false);
  };

  const runSync = async () => {
    setSyncing(true);
    const pending = items.filter((i) => i.status !== "done");
    for (const it of pending) {
      await syncRepo.update(it.id, { status: "uploading" });
      for (let p = 0; p <= 100; p += 10) {
        setProgress((prev) => ({ ...prev, [it.id]: p }));
        await new Promise((r) => setTimeout(r, 60));
      }
      const failed = Math.random() < 0.1;
      await syncRepo.update(it.id, { status: failed ? "error" : "done", attempts: it.attempts + 1, error: failed ? "Network timeout" : undefined });
      if (!failed && it.kind === "student") await db.students.update(it.refId, { syncStatus: "synced" });
      if (!failed && it.kind === "assessment") await db.assessments.update(it.refId, { syncStatus: "synced" });
    }
    await qc.invalidateQueries({ queryKey: ["sync-queue"] });
    await qc.invalidateQueries({ queryKey: ["students"] });
    await qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    setSyncing(false);
    toast.success("Sync run complete");
  };

  const retryOne = async (id: string) => {
    await syncRepo.update(id, { status: "pending" });
    await qc.invalidateQueries({ queryKey: ["sync-queue"] });
  };

  const online = typeof navigator !== "undefined" ? navigator.onLine : true;
  const pending = items.filter((i) => i.status !== "done").length;

  return (
    <>
      <TopBar title="Sync Queue" subtitle={`${pending} pending`} />
      <div className="space-y-4 px-4 pt-4 pb-6">
        <Card><CardContent className="flex items-center gap-3 p-4">
          <span className={"flex h-10 w-10 items-center justify-center rounded-full " + (online ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
            {online ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold">{online ? "Connected" : "Offline"}</p>
            <p className="text-xs text-muted-foreground">
              {online ? "Ready to upload pending items" : "Uploads will resume automatically when back online"}
            </p>
          </div>
          <Button size="sm" onClick={runSync} disabled={syncing || pending === 0} className="gap-1">
            <RefreshCw className={"h-4 w-4 " + (syncing ? "animate-spin" : "")} /> Sync now
          </Button>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-tertiary-container text-on-tertiary-container">
              <Cpu className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">On-device AI queue</p>
              <p className="text-xs text-muted-foreground">
                {jobs.length === 0
                  ? "No videos waiting for analysis"
                  : `${jobs.filter((j) => j.status === "pending" || j.status === "error").length} pending • ${jobs.length} total`}
              </p>
            </div>
            <Button
              size="sm" variant="outline"
              disabled={resuming || jobs.every((j) => j.status === "done")}
              onClick={resumeAi}
            >
              {resuming ? "Processing…" : "Resume"}
            </Button>
          </div>
          {jobs.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {jobs.slice(0, 5).map((j) => (
                <li key={j.id} className="flex items-center justify-between border-t border-border/60 pt-1.5 text-xs">
                  <span className="truncate text-muted-foreground">
                    {j.input.kind} • {formatDistanceToNow(j.createdAt, { addSuffix: true })}
                  </span>
                  <StatusChip variant={
                    j.status === "done" ? "success" : j.status === "error" ? "danger"
                      : j.status === "running" ? "info" : "warning"
                  }>{j.status}</StatusChip>
                </li>
              ))}
            </ul>
          )}
        </CardContent></Card>

        {items.length === 0 ? (
          <EmptyState
            icon={<Upload className="h-8 w-8" />}
            title="All caught up"
            description="No pending items in the sync queue."
          />
        ) : (
          <div className="space-y-2">
            {items.map((it) => {
              const p = progress[it.id];
              return (
                <Card key={it.id}><CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <span className={"flex h-9 w-9 items-center justify-center rounded-full " + (
                      it.status === "done" ? "bg-success/15 text-success"
                        : it.status === "error" ? "bg-destructive/15 text-destructive"
                        : it.status === "uploading" ? "bg-primary-container text-on-primary-container"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {it.status === "done" ? <CheckCircle2 className="h-4 w-4" />
                        : it.status === "error" ? <XCircle className="h-4 w-4" />
                        : <Upload className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold capitalize">{it.kind} upload</p>
                      <p className="text-xs text-muted-foreground">
                        {it.error ?? `Queued ${formatDistanceToNow(it.createdAt, { addSuffix: true })}`}
                      </p>
                    </div>
                    <StatusChip variant={
                      it.status === "done" ? "success"
                        : it.status === "error" ? "danger"
                        : it.status === "uploading" ? "info"
                        : "warning"
                    }>{it.status}</StatusChip>
                  </div>
                  {typeof p === "number" && it.status !== "done" && (
                    <Progress value={p} className="mt-2 h-1.5" />
                  )}
                  {it.status === "error" && (
                    <Button size="sm" variant="outline" onClick={() => retryOne(it.id)} className="mt-2 w-full">
                      Retry
                    </Button>
                  )}
                </CardContent></Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
