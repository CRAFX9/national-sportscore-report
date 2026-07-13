import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/stores/auth";
import { WifiOff, Wifi } from "lucide-react";

export const Route = createFileRoute("/")({
  component: SplashScreen,
});

function SplashScreen() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const hydrated = useAuth((s) => s.hydrated);
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof navigator !== "undefined") setOnline(navigator.onLine);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => {
      navigate({ to: user ? "/dashboard" : "/login" });
    }, 1600);
    return () => clearTimeout(t);
  }, [hydrated, user, navigate]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden gov-gradient px-6 text-primary-foreground">
      <div className="relative flex flex-col items-center">
        <span className="absolute inset-0 -z-10 h-24 w-24 rounded-full bg-primary-foreground/20 animate-pulse-ring" />
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-primary-foreground text-4xl font-black text-primary elevation-3">
          N
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight">NSRC</h1>
        <p className="mt-1 text-sm opacity-90">National Sports Report Card</p>
        <p className="mt-6 max-w-xs text-center text-xs opacity-80">
          Smart India Hackathon prototype — Powered by SAI-ready standards.
        </p>
      </div>
      <div className="absolute bottom-8 flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1.5 text-xs backdrop-blur">
        {online === null ? null : online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
        {online === null ? "Checking connectivity…" : online ? "Online" : "Offline mode ready"}
      </div>
    </main>
  );
}
