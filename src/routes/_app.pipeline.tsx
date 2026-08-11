import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { GitBranch } from "lucide-react";
import { TopBar } from "@/components/nsrc/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/nsrc/status-chip";
import { EmptyState, LoadingState } from "@/components/nsrc/states";
import { DataBadge, Disclaimer } from "@/components/nsrc/data-badge";
import { resultsRepo, studentsRepo, syncRepo } from "@/lib/repositories";
import { can } from "@/lib/permissions";
import { useAuth } from "@/stores/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/pipeline")({
  component: PipelinePage,
  head: () => ({
    meta: [
      { title: "Government Talent Pipeline | NSRC" },
      { name: "description", content: "Stage-by-stage view of athletes moving from registration to assessment, shortlisting and scholarship review." },
      { property: "og:title", content: "Government Talent Pipeline | NSRC" },
      { property: "og:description", content: "Stage-by-stage view of athletes moving from registration to assessment, shortlisting and scholarship review." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const SHORTLIST = 70;
const ELITE = 80;

function PipelinePage() {
  const navigate = useNavigate();
  const role = useAuth((s) => s.user?.role);
  const allowed = can(role, "analytics");

  useEffect(() => {
    if (role && !allowed) {
      toast.error("The talent pipeline is available to district officers and SAI officials");
      navigate({ to: "/dashboard" });
    }
  }, [role, allowed, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["talent-pipeline"],
    enabled: allowed,
    queryFn: async () => {
      const [students, results, pending] = await Promise.all([
        studentsRepo.all(), resultsRepo.all(), syncRepo.pendingCount(),
      ]);
      const bestByStudent = new Map<string, number>();
      for (const r of results) {
        const cur = bestByStudent.get(r.studentId);
        if (cur === undefined || r.overall > cur) bestByStudent.set(r.studentId, r.overall);
      }
      const shortlisted = students.filter((s) => (bestByStudent.get(s.id) ?? -1) >= SHORTLIST);
      const elite = students.filter((s) => (bestByStudent.get(s.id) ?? -1) >= ELITE);
      const flagged = results.filter((r) => r.integrity && r.integrity.status !== "verified").length;
      return {
        registered: students.length,
        assessed: bestByStudent.size,
        shortlisted, elite, flagged, pending,
        bestByStudent,
      };
    },
  });

  if (!allowed) return null;
  if (isLoading) return <LoadingState label="Building pipeline view…" />;
  if (!data || data.registered === 0) {
    return (
      <>
        <TopBar title="Talent Pipeline" back />
        <div className="px-4 pt-6">
          <EmptyState
            icon={<GitBranch className="h-8 w-8" />}
            title="Pipeline is empty"
            description="Register and assess athletes to populate the pipeline stages."
          />
        </div>
      </>
    );
  }

  const stages = [
    { label: "Registered athletes", value: data.registered, note: "Profiles created on device" },
    { label: "Assessed", value: data.assessed, note: "At least one AI-analysed assessment" },
    { label: `Shortlist candidates (score ≥ ${SHORTLIST})`, value: data.shortlisted.length, note: "Meets district shortlist threshold" },
    { label: `Elite review (score ≥ ${ELITE})`, value: data.elite.length, note: "Proposed for SAI-level review" },
  ];
  const top = data.registered ? stages[0].value : 1;

  return (
    <>
      <TopBar title="Government Talent Pipeline" back />
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 pt-4 pb-8">
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pipeline stages
              </p>
              <DataBadge kind="measured" note="Counts from stored records" />
            </div>
            <ul className="space-y-3">
              {stages.map((s) => (
                <li key={s.label}>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium">{s.label}</span>
                    <span className="font-bold text-primary">{s.value}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.round((s.value / Math.max(1, top)) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.note}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Review queue
            </p>
            <div className="flex flex-wrap gap-1.5">
              <StatusChip variant={data.flagged > 0 ? "warning" : "success"}>
                {data.flagged} integrity review{data.flagged === 1 ? "" : "s"}
              </StatusChip>
              <StatusChip variant={data.pending > 0 ? "warning" : "success"}>
                {data.pending} record{data.pending === 1 ? "" : "s"} pending sync
              </StatusChip>
            </div>
            <Disclaimer>
              Shortlist and elite thresholds are configurable policy values used for this prototype,
              not official Sports Authority of India selection criteria. Every stage requires human
              verification before any scholarship or trial decision.
            </Disclaimer>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Shortlist candidates
            </p>
            {data.shortlisted.length === 0 ? (
              <p className="text-sm text-muted-foreground">No athlete currently meets the shortlist threshold.</p>
            ) : (
              <ul className="space-y-2">
                {data.shortlisted
                  .slice()
                  .sort((a, b) => (data.bestByStudent.get(b.id) ?? 0) - (data.bestByStudent.get(a.id) ?? 0))
                  .map((s) => (
                    <li key={s.id}>
                      <Link to="/profile/$id" params={{ id: s.id }}>
                        <Card className="hover:elevation-2 transition-shadow">
                          <CardContent className="flex items-center justify-between gap-3 p-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{s.name}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {s.athleteId} • {s.district} • {s.age}y
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-primary">{data.bestByStudent.get(s.id)}</span>
                              {(data.bestByStudent.get(s.id) ?? 0) >= ELITE && (
                                <StatusChip variant="success">Elite</StatusChip>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Button asChild variant="outline" className="w-full">
          <Link to="/analytics">Back to district analytics</Link>
        </Button>
      </div>
    </>
  );
}
