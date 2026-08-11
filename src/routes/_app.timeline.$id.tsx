import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { format } from "date-fns";
import { TrendingUp } from "lucide-react";
import { TopBar } from "@/components/nsrc/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/nsrc/status-chip";
import { EmptyState, LoadingState } from "@/components/nsrc/states";
import { DataBadge, Disclaimer } from "@/components/nsrc/data-badge";
import { resultsRepo, studentsRepo } from "@/lib/repositories";
import { metricTrends, TREND_LABEL, TREND_VARIANT } from "@/lib/trends";

export const Route = createFileRoute("/_app/timeline/$id")({
  component: TimelinePage,
  head: () => ({
    meta: [
      { title: "Athlete Performance Timeline | NSRC" },
      { name: "description", content: "Track an athlete's measured performance across every stored assessment over time." },
      { property: "og:title", content: "Athlete Performance Timeline | NSRC" },
      { property: "og:description", content: "Track an athlete's measured performance across every stored assessment over time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function TimelinePage() {
  const { id } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["timeline", id],
    queryFn: async () => {
      const [s, results] = await Promise.all([studentsRepo.find(id), resultsRepo.byStudent(id)]);
      return { s, results: results.slice().sort((a, b) => a.createdAt - b.createdAt) };
    },
  });

  if (isLoading) return <LoadingState label="Loading performance history…" />;

  const results = data?.results ?? [];
  const trends = metricTrends(results);
  const overall = trends.find((t) => t.key === "overall");
  const metricTrendList = trends.filter((t) => t.key !== "overall");

  return (
    <>
      <TopBar title="Performance Timeline" subtitle={data?.s?.name} back />
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 pt-4 pb-8">
        {results.length === 0 ? (
          <EmptyState
            icon={<TrendingUp className="h-8 w-8" />}
            title="No assessment history yet"
            description="The timeline is built only from stored assessment results — nothing is simulated."
            action={<Button asChild><Link to="/assessments/new">Run an assessment</Link></Button>}
          />
        ) : (
          <>
            <Card>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Overall score over time
                  </p>
                  <DataBadge kind="measured" note={`${results.length} stored assessment(s)`} />
                </div>
                {overall && (
                  <>
                    <div className="flex items-center gap-2">
                      <p className="text-3xl font-bold text-primary">{overall.latest}</p>
                      <StatusChip variant={TREND_VARIANT[overall.direction]}>
                        {TREND_LABEL[overall.direction]}
                        {overall.delta !== undefined ? ` ${overall.delta > 0 ? "+" : ""}${overall.delta}` : ""}
                      </StatusChip>
                    </div>
                    <div className="h-56 w-full">
                      <ResponsiveContainer>
                        <LineChart data={overall.points.map((p) => ({ date: format(p.at, "d MMM"), score: p.value }))}>
                          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
                          <Tooltip />
                          <Line type="monotone" dataKey="score" stroke="var(--color-primary)" strokeWidth={2.5} dot />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-2 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Dimension trends
                </p>
                {metricTrendList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No per-dimension metrics stored yet.</p>
                ) : (
                  <ul className="divide-y divide-border/60">
                    {metricTrendList.map((t) => (
                      <li key={t.key} className="flex items-center justify-between gap-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{t.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {t.points.length} point{t.points.length === 1 ? "" : "s"}
                            {t.previous !== undefined ? ` • previous ${t.previous}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">{t.latest}</span>
                          <StatusChip variant={TREND_VARIANT[t.direction]}>{TREND_LABEL[t.direction]}</StatusChip>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <Disclaimer>
                  Trends compare the two most recent assessments for each dimension. A single
                  assessment is reported as a baseline, never as progress.
                </Disclaimer>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-2 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Assessment history
                </p>
                <ul className="space-y-2">
                  {results.slice().reverse().map((r) => (
                    <li key={r.id}>
                      <Link to="/assessments/results/$id" params={{ id: r.id }}>
                        <Card className="hover:elevation-2 transition-shadow">
                          <CardContent className="flex items-center justify-between gap-3 p-3">
                            <div>
                              <p className="text-sm font-semibold">Overall {r.overall}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(r.createdAt, "d MMM yyyy, HH:mm")}
                              </p>
                            </div>
                            <StatusChip variant={r.aiMode === "model" ? "success" : "info"}>
                              {r.aiMode === "model" ? "Model" : "Prototype"}
                            </StatusChip>
                          </CardContent>
                        </Card>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </>
        )}

        <Button asChild variant="outline" className="w-full">
          <Link to="/profile/$id" params={{ id }}>Open digital scout profile</Link>
        </Button>
      </div>
    </>
  );
}
