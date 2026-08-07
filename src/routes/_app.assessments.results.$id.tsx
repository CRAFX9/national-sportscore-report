import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Award, Save, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import { TopBar } from "@/components/nsrc/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/nsrc/score-ring";
import { MetricsRadar } from "@/components/nsrc/metrics-radar";
import { StatusChip } from "@/components/nsrc/status-chip";
import { LoadingState } from "@/components/nsrc/states";
import { resultsRepo, studentsRepo, videosRepo } from "@/lib/repositories";
import { downloadBlob, formatBytes } from "@/lib/video";
import { useEffect, useMemo } from "react";
import { Download, Video } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/assessments/results/$id")({
  component: ResultsPage,
});

function ResultsPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["result", id],
    queryFn: async () => {
      const r = await resultsRepo.find(id);
      if (!r) return null;
      const s = await studentsRepo.find(r.studentId);
      const v = await videosRepo.byAssessment(r.assessmentId);
      return { r, s, v };
    },
  });

  const video = data?.v ?? null;
  const videoUrl = useMemo(() => (video ? URL.createObjectURL(video.blob) : null), [video]);
  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  if (!data) return <LoadingState label="Loading report…" />;
  const { r, s } = data;

  return (
    <>
      <TopBar title="Assessment Report" back />
      <div className="space-y-4 px-4 pt-4 pb-6">
        <Card><CardContent className="flex items-center gap-4 p-5">
          <ScoreRing score={r.overall} size={100} />
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Overall</p>
            <p className="truncate text-lg font-bold">{s?.name}</p>
            <p className="text-xs text-muted-foreground">{s?.athleteId} • {s?.district}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <StatusChip variant="info"><Trophy className="h-3 w-3" />{r.nationalPercentile}th percentile</StatusChip>
              <StatusChip variant="warning">District rank #{r.districtRank}</StatusChip>
            </div>
          </div>
        </CardContent></Card>

        {videoUrl && video && (
          <Card><CardContent className="space-y-3 p-4">
            <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Video className="h-3.5 w-3.5" /> Recorded assessment video
            </p>
            <video src={videoUrl} controls playsInline className="w-full rounded-xl bg-black" />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="break-all font-mono text-[11px] text-muted-foreground">{video.filename} • {formatBytes(video.sizeBytes)}</p>
              <Button size="sm" variant="outline" onClick={() => downloadBlob(video.blob, video.filename)}>
                <Download className="mr-2 h-4 w-4" /> Save video
              </Button>
            </div>
          </CardContent></Card>
        )}

        <TalentRadar result={r} />
        <AssessmentQualityPanel result={r} />
        <IntegrityPanel result={r} />
        <DevelopmentPlanCard result={r} />


        <div className="grid grid-cols-3 gap-2">
          {Object.entries(r.metrics).map(([k, v]) => (
            <Card key={k}><CardContent className="p-3 text-center">
              <p className="text-xs capitalize text-muted-foreground">{k}</p>
              <p className="mt-1 text-xl font-bold text-primary">{v}</p>
            </CardContent></Card>
          ))}
        </div>

        <Card><CardContent className="space-y-2 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recommended sports</p>
          <div className="flex flex-wrap gap-1.5">
            {r.recommendedSports.map((sp) => (
              <span key={sp} className="rounded-full bg-tertiary-container px-3 py-1 text-xs font-medium text-on-tertiary-container">
                <Award className="mr-1 inline h-3 w-3" /> {sp}
              </span>
            ))}
          </div>
        </CardContent></Card>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Card><CardContent className="p-4">
            <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-success">
              <TrendingUp className="h-3.5 w-3.5" /> Top strengths
            </p>
            <ul className="space-y-1 text-sm">{r.strengths.map((x) => <li key={x}>• {x}</li>)}</ul>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-tertiary-foreground">
              <TrendingDown className="h-3.5 w-3.5" /> Improvement areas
            </p>
            <ul className="space-y-1 text-sm">{r.improvements.map((x) => <li key={x}>• {x}</li>)}</ul>
          </CardContent></Card>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={() => { toast.success("Report saved"); navigate({ to: "/dashboard" }); }}
            className="gap-2"
          >
            <Save className="h-4 w-4" /> Save
          </Button>
          <Button asChild>
            <Link to="/profile/$id" params={{ id: r.studentId }}>Open scout profile</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
