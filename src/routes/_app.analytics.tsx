import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { TopBar } from "@/components/nsrc/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/nsrc/status-chip";
import { EmptyState, LoadingState } from "@/components/nsrc/states";
import { DataBadge, Disclaimer } from "@/components/nsrc/data-badge";
import { assessmentsRepo, resultsRepo, studentsRepo } from "@/lib/repositories";
import { can } from "@/lib/permissions";
import { useAuth } from "@/stores/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/analytics")({
  component: AnalyticsPage,
  head: () => ({
    meta: [
      { title: "District Talent Analytics | NSRC" },
      { name: "description", content: "District and state level participation, coverage and talent distribution built from stored assessment data." },
      { property: "og:title", content: "District Talent Analytics | NSRC" },
      { property: "og:description", content: "District and state level participation, coverage and talent distribution built from stored assessment data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AnalyticsPage() {
  const navigate = useNavigate();
  const role = useAuth((s) => s.user?.role);
  const allowed = can(role, "analytics");

  useEffect(() => {
    if (role && !allowed) {
      toast.error("Analytics is available to district officers and SAI officials");
      navigate({ to: "/dashboard" });
    }
  }, [role, allowed, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["district-analytics"],
    enabled: allowed,
    queryFn: async () => {
      const [students, results, assessments] = await Promise.all([
        studentsRepo.all(), resultsRepo.all(), assessmentsRepo.all(),
      ]);
      const byDistrict = new Map<string, { district: string; athletes: number; assessed: number; scores: number[] }>();
      const assessedIds = new Set(results.map((r) => r.studentId));
      for (const s of students) {
        const key = s.district || "Unspecified";
        const row = byDistrict.get(key) ?? { district: key, athletes: 0, assessed: 0, scores: [] };
        row.athletes += 1;
        if (assessedIds.has(s.id)) row.assessed += 1;
        byDistrict.set(key, row);
      }
      const studentDistrict = new Map(students.map((s) => [s.id, s.district || "Unspecified"]));
      for (const r of results) {
        const key = studentDistrict.get(r.studentId);
        if (key && byDistrict.has(key)) byDistrict.get(key)!.scores.push(r.overall);
      }
      const districts = [...byDistrict.values()]
        .map((d) => ({
          ...d,
          coverage: d.athletes ? Math.round((d.assessed / d.athletes) * 100) : 0,
          avgScore: d.scores.length ? Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length) : undefined,
        }))
        .sort((a, b) => b.athletes - a.athletes);

      const bands = [
        { band: "80–100", count: results.filter((r) => r.overall >= 80).length },
        { band: "65–79", count: results.filter((r) => r.overall >= 65 && r.overall < 80).length },
        { band: "50–64", count: results.filter((r) => r.overall >= 50 && r.overall < 65).length },
        { band: "< 50", count: results.filter((r) => r.overall < 50).length },
      ];

      const genders = ["male", "female", "other"].map((g) => ({
        gender: g,
        count: students.filter((s) => s.gender === g).length,
      })).filter((g) => g.count > 0);

      return {
        totals: {
          athletes: students.length,
          assessed: assessedIds.size,
          assessments: assessments.length,
          districts: districts.length,
        },
        districts, bands, genders,
      };
    },
  });

  if (!allowed) return null;
  if (isLoading) return <LoadingState label="Aggregating district data…" />;

  const d = data;

  return (
    <>
      <TopBar title="District Talent Analytics" back />
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 pt-4 pb-8">
        {!d || d.totals.athletes === 0 ? (
          <EmptyState
            icon={<BarChart3 className="h-8 w-8" />}
            title="No athlete data to aggregate"
            description="Analytics is computed live from the athletes and results stored on this device."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Athletes" value={d.totals.athletes} />
              <Stat label="Assessed" value={d.totals.assessed} />
              <Stat label="Assessments" value={d.totals.assessments} />
              <Stat label="Districts" value={d.totals.districts} />
            </div>

            <Card>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Assessment coverage by district
                  </p>
                  <DataBadge kind="measured" note="Computed from local records" />
                </div>
                <ul className="divide-y divide-border/60">
                  {d.districts.map((row) => (
                    <li key={row.district} className="py-2">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="font-medium">{row.district}</span>
                        <span className="text-muted-foreground">
                          {row.assessed}/{row.athletes} assessed
                          {row.avgScore !== undefined ? ` • avg ${row.avgScore}` : ""}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${row.coverage}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Talent distribution (overall score bands)
                </p>
                <div className="h-56 w-full">
                  <ResponsiveContainer>
                    <BarChart data={d.bands}>
                      <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                      <XAxis dataKey="band" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {d.genders.map((g) => (
                    <StatusChip key={g.gender} variant="info">
                      {g.gender}: {g.count}
                    </StatusChip>
                  ))}
                </div>
                <Disclaimer>
                  Aggregates cover only records present on this device. On a nationwide deployment the
                  same computation runs server-side over synced data.
                </Disclaimer>
              </CardContent>
            </Card>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button asChild variant="outline"><Link to="/pipeline">Government talent pipeline</Link></Button>
              <Button asChild variant="outline"><Link to="/compare">Compare athletes</Link></Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-2xl font-bold text-primary">{value}</p>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
