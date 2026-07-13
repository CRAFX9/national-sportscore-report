import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, ClipboardList, Plus, RefreshCw, Trophy, Users } from "lucide-react";
import { TopBar } from "@/components/nsrc/top-bar";
import { StatusChip } from "@/components/nsrc/status-chip";
import { Card, CardContent } from "@/components/ui/card";
import { assessmentsRepo, reportsRepo, resultsRepo, studentsRepo, syncRepo } from "@/lib/repositories";
import { useAuth } from "@/stores/auth";
import { db } from "@/lib/db";
import { labelForType } from "@/lib/seed";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const user = useAuth((s) => s.user);

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [studentsCount, today, pending, top, recentReports] = await Promise.all([
        studentsRepo.all().then((r) => r.length),
        assessmentsRepo.todayCount(),
        syncRepo.pendingCount(),
        resultsRepo.topAthletes(5),
        reportsRepo.recent(5),
      ]);
      const studentMap = new Map((await studentsRepo.all()).map((s) => [s.id, s]));
      return {
        studentsCount, today, pending,
        top: top.map((r) => ({ ...r, student: studentMap.get(r.studentId) })),
        recentReports: recentReports.map((r) => ({ ...r, student: studentMap.get(r.studentId) })),
      };
    },
  });

  return (
    <>
      <TopBar
        title={`Namaste, ${user?.name ?? "Coach"}`}
        subtitle={user?.district ? `${user.district}, ${user.state}` : "Dashboard"}
      />

      <div className="space-y-5 px-4 pt-4">
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={<ClipboardList className="h-5 w-5" />} label="Today's Assessments" value={stats?.today ?? "—"} />
          <StatCard icon={<Users className="h-5 w-5" />} label="Students" value={stats?.studentsCount ?? "—"} />
          <StatCard
            icon={<RefreshCw className="h-5 w-5" />}
            label="Pending Sync"
            value={stats?.pending ?? "—"}
            highlight={(stats?.pending ?? 0) > 0}
          />
          <StatCard icon={<Trophy className="h-5 w-5" />} label="Top Athletes" value={stats?.top.length ?? "—"} />
        </div>

        <section>
          <SectionHeader title="Top Athletes" to="/students" />
          <div className="space-y-2">
            {stats?.top.length === 0 ? (
              <p className="text-sm text-muted-foreground">No results yet.</p>
            ) : (
              stats?.top.map((r) => (
                <Link key={r.id} to="/profile/$id" params={{ id: r.studentId }}>
                  <Card className="hover:elevation-2 transition-shadow">
                    <CardContent className="flex items-center gap-3 p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-on-primary-container font-semibold">
                        {(r.student?.name ?? "?").slice(0, 1)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{r.student?.name ?? "Athlete"}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {r.student?.district} • {r.student?.age}y
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">{r.overall}</p>
                        <p className="text-[10px] uppercase text-muted-foreground">score</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </section>

        <section>
          <SectionHeader title="Recent Reports" to="/students" />
          <div className="space-y-2">
            {stats?.recentReports.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reports yet.</p>
            ) : (
              stats?.recentReports.map((r) => {
                const assessmentType = (r.title.split(" — ")[0] ?? "Report").toLowerCase().replace(/ /g, "_");
                return (
                  <Card key={r.id}>
                    <CardContent className="flex items-center gap-3 p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-tertiary-container text-on-tertiary-container">
                        <Activity className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{r.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(r.createdAt, { addSuffix: true })}
                        </p>
                      </div>
                      <StatusChip variant="info">Report</StatusChip>
                      <span className="sr-only">{assessmentType}</span>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </section>
      </div>

      <Link
        to="/assessments/new"
        className="fixed bottom-20 right-1/2 z-50 flex translate-x-[calc(50%+11rem)] items-center gap-2 rounded-2xl gov-gradient px-5 py-3 text-sm font-semibold text-primary-foreground elevation-3 hover:opacity-95 sm:right-4 sm:translate-x-0"
      >
        <Plus className="h-4 w-4" />
        Start Assessment
      </Link>
    </>
  );
}

function StatCard({
  icon, label, value, highlight,
}: { icon: React.ReactNode; label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-tertiary/50 bg-tertiary-container/40" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span className="text-xs font-medium">{label}</span>
        </div>
        <p className="mt-2 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function SectionHeader({ title, to }: { title: string; to: string }) {
  return (
    <div className="mb-2 mt-1 flex items-center justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <Link to={to} className="text-xs font-medium text-primary hover:underline">View all</Link>
    </div>
  );
}

// Ensure db import is retained (helps tree-shaker keep types)
void db;
