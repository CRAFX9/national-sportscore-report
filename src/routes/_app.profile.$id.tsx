import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Download, Share2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { TopBar } from "@/components/nsrc/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/nsrc/status-chip";
import { ScoreRing } from "@/components/nsrc/score-ring";
import { LoadingState } from "@/components/nsrc/states";
import { assessmentsRepo, resultsRepo, studentsRepo } from "@/lib/repositories";
import { labelForType } from "@/lib/seed";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/profile/$id")({
  component: ProfilePage,
});

function ProfilePage() {
  const { id } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["profile", id],
    queryFn: async () => {
      const s = await studentsRepo.find(id);
      if (!s) return null;
      const [assessments, results] = await Promise.all([
        assessmentsRepo.byStudent(id),
        resultsRepo.byStudent(id),
      ]);
      return { s, assessments, results };
    },
  });

  if (!data) return <LoadingState />;
  const { s, assessments, results } = data;

  const timeline = results
    .slice()
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((r) => ({ date: format(r.createdAt, "d MMM"), score: r.overall }));

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: `NSRC — ${s.name}`, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Profile link copied");
    }
  };

  return (
    <>
      <TopBar title="Digital Scout Profile" back
        action={<Button size="icon" variant="ghost" onClick={share}><Share2 className="h-4 w-4" /></Button>}
      />
      <div className="space-y-4 px-4 pt-4 pb-6">
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-4">
            {s.photoDataUrl ? (
              <img src={s.photoDataUrl} alt={s.name} className="h-20 w-20 rounded-2xl object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-container text-2xl font-bold text-on-primary-container">
                {s.name.slice(0, 1)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-bold">{s.name}</h2>
              <p className="text-xs text-muted-foreground">{s.athleteId}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <StatusChip variant="info">{s.age}y • {s.gender}</StatusChip>
                <StatusChip variant="neutral">{s.district}, {s.state}</StatusChip>
              </div>
            </div>
            {results[0] ? <ScoreRing score={results[0].overall} size={72} /> : null}
          </div>
        </CardContent></Card>

        <div className="grid grid-cols-2 gap-3">
          <Info label="School" value={s.school} />
          <Info label="Village" value={s.village} />
          <Info label="Height" value={`${s.heightCm} cm`} />
          <Info label="Weight" value={`${s.weightKg} kg`} />
          <Info label="Parent" value={s.parentName} />
          <Info label="Contact" value={s.parentPhone} />
        </div>

        {timeline.length > 0 && (
          <Card><CardContent className="p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Performance timeline</p>
            <div className="h-40 w-full">
              <ResponsiveContainer>
                <LineChart data={timeline}>
                  <XAxis dataKey="date" fontSize={10} stroke="var(--color-muted-foreground)" />
                  <YAxis domain={[0, 100]} fontSize={10} stroke="var(--color-muted-foreground)" />
                  <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="score" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent></Card>
        )}

        <Card><CardContent className="p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assessment history</p>
          {assessments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assessments yet.</p>
          ) : (
            <ul className="space-y-2">
              {assessments.map((a) => (
                <li key={a.id} className="flex items-center justify-between border-t border-border/60 pt-2 first:border-0 first:pt-0">
                  <div>
                    <p className="text-sm font-medium">{labelForType(a.type)}</p>
                    <p className="text-xs text-muted-foreground">{formatDistanceToNow(a.createdAt, { addSuffix: true })}</p>
                  </div>
                  <StatusChip variant={a.syncStatus === "synced" ? "success" : "warning"}>{a.syncStatus}</StatusChip>
                </li>
              ))}
            </ul>
          )}
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Coach remarks</p>
          <p className="text-sm">
            Consistent improvement across explosive-power tests. Recommend enrolment in
            district-level sprint program and continued strength conditioning.
          </p>
        </CardContent></Card>

        <Card><CardContent className="flex flex-col items-center gap-3 p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Athlete QR</p>
          <div className="rounded-xl bg-white p-3">
            <QRCodeSVG value={JSON.stringify({ id: s.id, athleteId: s.athleteId })} size={140} />
          </div>
          <p className="text-xs text-muted-foreground">Scan to verify profile authenticity.</p>
        </CardContent></Card>

        <Button variant="outline" className="w-full gap-2" onClick={() => toast.info("PDF export queued (placeholder)")}>
          <Download className="h-4 w-4" /> Download PDF Report
        </Button>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card><CardContent className="p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium">{value}</p>
    </CardContent></Card>
  );
}
