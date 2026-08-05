import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Languages, Volume2 } from "lucide-react";
import { TopBar } from "@/components/nsrc/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAssessmentDraft } from "@/stores/assessment-draft";
import { labelForType } from "@/lib/seed";
import { voiceForAssessment } from "@/lib/catalog";
import { speak, speechSupported, stopSpeaking } from "@/lib/speech";

export const Route = createFileRoute("/_app/assessments/instructions")({
  component: InstructionsPage,
});

const LANGS = ["English", "हिन्दी", "தமிழ்", "తెలుగు", "मराठी", "বাংলা"];

const STEPS = [
  "Position the phone 3–5m from the start line at hip height.",
  "Ensure the athlete's full body is visible in the frame.",
  "Tap Start when the athlete is set in the ready position.",
  "Keep the phone still — a stable frame improves AI accuracy.",
];

function InstructionsPage() {
  const navigate = useNavigate();
  const draft = useAssessmentDraft();
  const current = draft.selected[draft.currentIndex];
  const script = current ? voiceForAssessment(current) : "";

  useEffect(() => () => stopSpeaking(), []);

  if (!current) {
    navigate({ to: "/assessments/new" });
    return null;
  }

  return (
    <>
      <TopBar title="Instructions" back />
      <div className="space-y-4 px-4 pt-4 pb-6">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Test {draft.currentIndex + 1} of {draft.selected.length}
            </p>
            <h2 className="mt-1 text-2xl font-bold">{labelForType(current)}</h2>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Language</p>
              <Languages className="h-4 w-4 text-muted-foreground" />
            </div>
            <select
              value={draft.language}
              onChange={(e) => draft.setLanguage(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {LANGS.map((l) => <option key={l}>{l}</option>)}
            </select>
            <Button
              variant="outline"
              className="w-full gap-2"
              disabled={!speechSupported()}
              onClick={() => speak(script, draft.language)}
            >
              <Volume2 className="h-4 w-4" />
              {speechSupported() ? "Play voice instructions" : "Voice not supported on this device"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Setup</p>
            <p className="rounded-xl bg-muted/60 p-3 text-sm">{script}</p>
            <ol className="space-y-2 text-sm">
              {STEPS.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-on-primary-container">
                    {i + 1}
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Button size="lg" className="w-full" onClick={() => { stopSpeaking(); navigate({ to: "/assessments/capture" }); }}>
          I'm ready — Open camera
        </Button>
      </div>
    </>
  );
}
