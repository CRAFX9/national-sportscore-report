import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Download, Images, Info, Loader2, Play, Trash2, Video } from "lucide-react";
import { TopBar } from "@/components/nsrc/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/nsrc/status-chip";
import { LoadingState } from "@/components/nsrc/states";
import { videosRepo, studentsRepo } from "@/lib/repositories";
import { useAssessmentDraft } from "@/stores/assessment-draft";
import { downloadBlob, formatBytes, galleryCapable, saveToGallery } from "@/lib/video";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/assessments/video")({
  component: SaveVideoPage,
  head: () => ({
    meta: [
      { title: "Save Assessment Video | NSRC" },
      { name: "description", content: "Review and save the recorded athlete assessment video before AI analysis." },
      { property: "og:title", content: "Save Assessment Video | NSRC" },
      { property: "og:description", content: "Review and save the recorded athlete assessment video before AI analysis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function SaveVideoPage() {
  const navigate = useNavigate();
  const draft = useAssessmentDraft();
  const [busy, setBusy] = useState(false);
  const canGallery = useMemo(() => galleryCapable(), []);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["assessment-video", draft.lastVideoId],
    enabled: !!draft.lastVideoId,
    queryFn: async () => {
      const v = draft.lastVideoId ? await videosRepo.find(draft.lastVideoId) : null;
      if (!v) return null;
      const s = await studentsRepo.find(v.studentId);
      return { v, s };
    },
  });

  const url = useMemo(() => (data?.v ? URL.createObjectURL(data.v.blob) : null), [data?.v]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  if (!draft.lastVideoId) {
    return (
      <>
        <TopBar title="Save Video" back />
        <div className="px-4 pt-8 text-center">
          <Video className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-semibold">No recording found</p>
          <p className="mt-1 text-sm text-muted-foreground">Start a new assessment to record a video.</p>
          <Button className="mt-4" onClick={() => navigate({ to: "/assessments/new" })}>New assessment</Button>
        </div>
      </>
    );
  }

  if (isLoading) return <LoadingState label="Loading recorded video…" />;
  if (!data?.v || !url) {
    return (
      <>
        <TopBar title="Save Video" back />
        <div className="px-4 pt-8 text-center">
          <p className="font-semibold">Video unavailable</p>
          <p className="mt-1 text-sm text-muted-foreground">The recording could not be read from local storage.</p>
          <Button className="mt-4" onClick={() => navigate({ to: "/assessments/processing" })}>Continue to AI analysis</Button>
        </div>
      </>
    );
  }

  const { v, s } = data;

  const onGallery = async () => {
    setBusy(true);
    const res = await saveToGallery(v.blob, v.filename);
    setBusy(false);
    if (res === "saved") {
      await videosRepo.markSaved(v.id);
      refetch();
      toast.success("Assessment video saved successfully.");
    } else if (res === "cancelled") {
      toast.info("Gallery save cancelled.");
    } else {
      toast.error("Gallery saving needs the mobile app environment. Use Download instead.");
    }
  };

  return (
    <>
      <TopBar title="Save Video" back />
      <div className="mx-auto w-full max-w-2xl space-y-4 px-4 pt-4 pb-8">
        <Card><CardContent className="space-y-3 p-4">
          <video src={url} controls playsInline className="w-full rounded-xl bg-black" />
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusChip variant="success">Saved locally</StatusChip>
            <StatusChip variant="info">{formatBytes(v.sizeBytes)}</StatusChip>
            <StatusChip variant="info">{v.durationSec}s</StatusChip>
            {v.savedToGallery && <StatusChip variant="success"><Images className="h-3 w-3" /> In gallery</StatusChip>}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Filename</p>
            <p className="break-all font-mono text-xs">{v.filename}</p>
            {s && <p className="mt-1 text-xs text-muted-foreground">{s.name} • {s.athleteId}</p>}
          </div>
        </CardContent></Card>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="outline" onClick={() => downloadBlob(v.blob, v.filename)}>
            <Download className="mr-2 h-4 w-4" /> Download video
          </Button>
          <Button variant="outline" onClick={onGallery} disabled={busy || !canGallery}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Images className="mr-2 h-4 w-4" />}
            Save to gallery
          </Button>
        </div>

        {!canGallery && (
          <Card className="border-warning/40 bg-warning/10">
            <CardContent className="flex gap-2 p-4 text-sm">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <p>
                Saving directly to the device Gallery/Photos requires the mobile app environment
                (Android/iOS media library permission). This browser has no gallery access, so the
                video stays inside NSRC and can be downloaded to your device storage instead.
              </p>
            </CardContent>
          </Card>
        )}

        <Button className="w-full" size="lg" onClick={() => navigate({ to: "/assessments/processing" })}>
          <Play className="mr-2 h-4 w-4" /> Continue to AI analysis
        </Button>

        <Button
          variant="ghost"
          className="w-full text-destructive"
          onClick={async () => {
            if (!window.confirm("Delete this recording permanently? Analysis will not have the video.")) return;
            await videosRepo.remove(v.id);
            draft.setLastVideo(null);
            toast.success("Recording deleted.");
            navigate({ to: "/assessments/processing" });
          }}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Delete recording
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          The original recording is kept after analysis — it is only removed if you delete it.
        </p>
      </div>
    </>
  );
}
