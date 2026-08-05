import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FileText, Search } from "lucide-react";
import { TopBar } from "@/components/nsrc/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusChip } from "@/components/nsrc/status-chip";
import { EmptyState } from "@/components/nsrc/states";
import { reportsRepo, resultsRepo, studentsRepo } from "@/lib/repositories";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_app/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["reports-all"],
    queryFn: async () => {
      const [reports, students, results] = await Promise.all([
        reportsRepo.all(), studentsRepo.all(), resultsRepo.all(),
      ]);
      const sMap = new Map(students.map((s) => [s.id, s]));
      const rMap = new Map(results.map((r) => [r.id, r]));
      return reports.map((r) => ({ ...r, student: sMap.get(r.studentId), result: rMap.get(r.resultId) }));
    },
  });

  const items = (data ?? []).filter((r) =>
    !q || r.title.toLowerCase().includes(q.toLowerCase()) ||
    (r.student?.name ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <>
      <TopBar title="AI Reports" subtitle={`${data?.length ?? 0} generated`} back />
      <div className="space-y-4 px-4 pt-4 pb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search reports or athletes…"
            className="pl-9"
          />
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-8 w-8" />}
            title="No reports yet"
            description="Reports are generated automatically after each assessment is processed."
          />
        ) : (
          <div className="space-y-2">
            {items.map((r) => (
              <Link key={r.id} to="/assessments/results/$id" params={{ id: r.resultId }}>
                <Card className="transition-shadow hover:elevation-2">
                  <CardContent className="flex items-center gap-3 p-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tertiary-container text-on-tertiary-container">
                      <FileText className="h-4.5 w-4.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{r.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {r.student?.name ?? "Athlete"} • {r.student?.district ?? "—"} •{" "}
                        {formatDistanceToNow(r.createdAt, { addSuffix: true })}
                      </p>
                    </div>
                    {r.result ? (
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">{r.result.overall}</p>
                        <p className="text-[10px] uppercase text-muted-foreground">score</p>
                      </div>
                    ) : (
                      <StatusChip variant="neutral">Report</StatusChip>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
