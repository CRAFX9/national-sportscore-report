import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, ClipboardList, Plus, RefreshCw, Trophy, Users, Award, BarChart3 } from "lucide-react";
import { TopBar } from "@/components/nsrc/top-bar";
import { StatusChip } from "@/components/nsrc/status-chip";
import { ScoreRing } from "@/components/nsrc/score-ring";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  assessmentsRepo, coachesRepo, reportsRepo, resultsRepo, studentsRepo, syncRepo,
} from "@/lib/repositories";
import { useAuth } from "@/stores/auth";
import { can, ROLE_LABELS } from "@/lib/permissions";
import { labelForType } from "@/lib/seed";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const user = useAuth((s) => s.user);
  const linkedStudentId = useAuth((s) => s.linkedStudentId);
  const role = user?.role;
  const selfOnly = can(role, "selfOnly");

  return (
    <>
      <TopBar
        title={`Namaste, ${user?.name ?? "Guest"}`}
        subtitle={`${role ? ROLE_LABELS[role] : "Dashboard"}${user?.district ? ` • ${user.district}` : ""}`}
      />
      {selfOnly ? (
        <PersonalDashboard studentId={linkedStudentId} isParent={role === "parent"} />
      ) : (
        <StaffDashboard />
      )}
    </>
  );
}

/* ------------------------------- Student / Parent ------------------------------- */

function PersonalDashboard({ studentId, isParent }: { studentId: string | null; isParent: boolean }) {
  const { data } = useQuery({
    queryKey: ["personal-dashboard", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const s = await studentsRepo.find(studentId!);
      const [results, assessments] = await Promise.all([
        resultsRepo.byStudent(studentId!),
        assessmentsRepo.byStudent(studentId!),
      ]);
      return { s, results, assessments };
    },
  });

  if (!studentId) {
    return (
      <div className="px-4 pt-6">
        <Card><CardContent className="p-5 text-sm">
          No athlete profile is linked to this account. Sign in again and select a profile.
        </CardContent></Card>
      </div>
    );
  }

  const best = data?.results?.[0];

  return (
    <div className="space-y-5 px-4 pt-4">
      <Card><CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-container text-xl font-bold text-on-primary-container">
          {(data?.s?.name ?? "?").slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold">{data?.s?.name ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{data?.s?.athleteId} • {data?.s?.district}</p>
        </div>
        {best ? <ScoreRing score={best.overall} size={64} /> : null}
      </CardContent></Card>

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<ClipboardList className="h-5 w-5" />} label="Assessments" value={data?.assessments.length ?? "—"} />
        <StatCard icon={<Trophy className="h-5 w-5" />} label="National percentile" value={best ? `${best.nationalPercentile}%` : "—"} />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {isParent ? "Your child's reports" : "My reports"}
        </h2>
        <div className="space-y-2">
          {(data?.results ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No results yet — your coach will run an assessment.</p>
          ) : (
            data?.results.map((r) => (
              <Link key={r.id} to="/assessments/results/$id" params={{ id: r.id }}>
                <Card className="hover:elevation-2 transition-shadow">
                  <CardContent className="flex items-center gap-3 p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-tertiary-container text-on-tertiary-container">
                      <Activity className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">Overall score {r.overall}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(r.createdAt, { addSuffix: true })}
                      </p>
                    </div>
                    <StatusChip variant="info">Report</StatusChip>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </section>

      <Button asChild variant="outline" className="w-full">
        <Link to="/profile/$id" params={{ id: studentId }}>
          {isParent ? "View full scout profile" : "View my scout profile"}
        </Link>
      </Button>
    </div>
  );
}

/* --------------------------- Coach / Officer / SAI --------------------------- */

function StaffDashboard() {
  const user = useAuth((s) => s.user);
  const role = user?.role;

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", role],
    queryFn: async () => {
      const [students, today, pending, top, recentReports] = await Promise.all([
        studentsRepo.all(),
        assessmentsRepo.todayCount(),
        syncRepo.pendingCount(),
        resultsRepo.topAthletes(5),
        reportsRepo.recent(5),
      ]);
      let coaches = 0;
      if (can(role, "manageCoaches")) {
        await coachesRepo.ensureSeed();
        coaches = (await coachesRepo.all()).length;
      }
      const studentMap = new Map(students.map((s) => [s.id, s]));
      return {
        studentsCount: students.length, today, pending, coaches,
        top: top.map((r) => ({ ...r, student: studentMap.get(r.studentId) })),
        recentReports: recentReports.map((r) => ({ ...r, student: studentMap.get(r.studentId) })),
      };
    },
  });

  return (
    <>
      <div className="space-y-5 px-4 pt-4">
        <div className="grid grid-cols-2 gap-3">
          {can(role, "assess") && (
            <StatCard icon={<ClipboardList className="h-5 w-5" />} label="Today's Assessments" value={stats?.today ?? "—"} />
          )}
          <StatCard icon={<Users className="h-5 w-5" />} label="Students" value={stats?.studentsCount ?? "—"} />
          {can(role, "manageCoaches") && (
            <StatCard icon={<Award className="h-5 w-5" />} label="Coaches" value={stats?.coaches ?? "—"} />
          )}
          {can(role, "sync") && (
            <StatCard
              icon={<RefreshCw className="h-5 w-5" />}
              label="Pending Sync"
              value={stats?.pending ?? "—"}
              highlight={(stats?.pending ?? 0) > 0}
            />
          )}
          {can(role, "analytics") && (
            <StatCard icon={<BarChart3 className="h-5 w-5" />} label="Reports" value={stats?.recentReports.length ?? "—"} />
          )}
          <StatCard icon={<Trophy className="h-5 w-5" />} label="Top Athletes" value={stats?.top.length ?? "—"} />
        </div>

        {can(role, "manageCoaches") && (
          <Button asChild variant="outline" className="w-full gap-2">
            <Link to="/coaches"><Award className="h-4 w-4" /> Manage coach profiles</Link>
          </Button>
        )}

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
              stats?.recentReports.map((r) => (
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
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>
      </div>

      {can(role, "assess") && (
        <Link
          to="/assessments/new"
          className="fixed bottom-20 right-1/2 z-50 flex translate-x-[calc(50%+11rem)] items-center gap-2 rounded-2xl gov-gradient px-5 py-3 text-sm font-semibold text-primary-foreground elevation-3 hover:opacity-95 sm:right-4 sm:translate-x-0"
        >
          <Plus className="h-4 w-4" />
          Start Assessment
        </Link>
      )}
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

void labelForType;
