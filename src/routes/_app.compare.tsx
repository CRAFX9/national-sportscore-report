import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Users2 } from "lucide-react";
import { TopBar } from "@/components/nsrc/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/nsrc/status-chip";
import { EmptyState, LoadingState } from "@/components/nsrc/states";
import { DataBadge, Disclaimer } from "@/components/nsrc/data-badge";
import { resultsRepo, studentsRepo } from "@/lib/repositories";
import { METRIC_KEYS, METRIC_LABELS } from "@/lib/trends";
import { can } from "@/lib/permissions";
import { useAuth } from "@/stores/auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { AssessmentResult, Student } from "@/lib/types";

export const Route = createFileRoute("/_app/compare")({
  component: ComparePage,
  head: () => ({
    meta: [
      { title: "Athlete Comparison | NSRC" },
      { name: "description", content: "Compare measured assessment metrics side by side for up to three athletes." },
      { property: "og:title", content: "Athlete Comparison | NSRC" },
      { property: "og:description", content: "Compare measured assessment metrics side by side for up to three athletes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const MAX = 3;

function ComparePage() {
  const navigate = useNavigate();
  const role = useAuth((s) => s.user?.role);
  const allowed = can(role, "viewAllStudents") && !can(role, "selfOnly");
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    if (role && !allowed) {
      toast.error("Athlete comparison is available to coaches and officials");
      navigate({ to: "/dashboard" });
    }
  }, [role, allowed, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["compare-pool"],
    enabled: allowed,
    queryFn: async () => {
      const students = await studentsRepo.all();
      const results = await resultsRepo.all();
      const best = new Map<string, AssessmentResult>();
      for (const r of results) {
        const cur = best.get(r.studentId);
        if (!cur || r.createdAt > cur.createdAt) best.set(r.studentId, r);
      }
      const withResults = students.filter((s) => best.has(s.id));
      return { withResults, best };
    },
  });

  if (!allowed) return null;
  if (isLoading) return <LoadingState label="Loading athletes…" />;

  const pool: Student[] = data?.withResults ?? [];
  const best = data?.best ?? new Map<string, AssessmentResult>();
  const selected = picked.map((id) => ({ s: pool.find((p) => p.id === id)!, r: best.get(id)! })).filter((x) => x.s && x.r);

  const toggle = (id: string) =>
    setPicked((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : prev.length >= MAX ? prev : [...prev, id],
    );

  const rows = ["overall", ...METRIC_KEYS.map(String)].filter((k) =>
    k === "overall" ? true : selected.some((x) => typeof x.r.metrics[k as keyof typeof x.r.metrics] === "number"),
  );

  const valueOf = (r: AssessmentResult, key: string) =>
    key === "overall" ? r.overall : (r.metrics[key as keyof typeof r.metrics] as number | undefined);

  return (
    <>
      <TopBar title="Athlete Comparison" back />
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 pt-4 pb-8">
        {pool.length === 0 ? (
          <EmptyState
            icon={<Users2 className="h-8 w-8" />}
            title="No assessed athletes yet"
            description="Comparison uses only stored assessment results, so at least one assessed athlete is required."
          />
        ) : (
          <>
            <Card>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Select up to {MAX} athletes
                  </p>
                  <DataBadge kind="measured" note="Latest stored result per athlete" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {pool.map((s) => {
                    const on = picked.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() => toggle(s.id)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                          on
                            ? "border-primary bg-primary-container text-on-primary-container"
                            : "border-border text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {s.name} • {best.get(s.id)?.overall}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {selected.length < 2 ? (
              <p className="text-center text-sm text-muted-foreground">
                Pick at least two athletes to compare.
              </p>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="p-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Dimension</th>
                          {selected.map((x) => (
                            <th key={x.s.id} className="p-3 text-left">
                              <span className="block truncate font-semibold">{x.s.name}</span>
                              <span className="text-xs font-normal text-muted-foreground">
                                {x.s.age}y • {x.s.district}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((key) => {
                          const values = selected.map((x) => valueOf(x.r, key));
                          const max = Math.max(...values.filter((v): v is number => typeof v === "number"));
                          return (
                            <tr key={key} className="border-b border-border/60 last:border-0">
                              <td className="p-3 font-medium">{METRIC_LABELS[key] ?? key}</td>
                              {values.map((v, i) => (
                                <td key={selected[i].s.id} className="p-3">
                                  {typeof v === "number" ? (
                                    <span className="flex items-center gap-2">
                                      <span className={cn("font-bold", v === max && "text-primary")}>{v}</span>
                                      {v === max && <StatusChip variant="success">Best</StatusChip>}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {selected.length >= 2 && (
              <Disclaimer>
                Comparison uses each athlete's most recent stored assessment. Athletes may have been
                assessed on different tests, ages and dates — treat differences as indicative, not as
                a ranking or selection decision.
              </Disclaimer>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setPicked([])}>Clear selection</Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
