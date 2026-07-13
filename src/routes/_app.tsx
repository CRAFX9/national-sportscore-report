// Layout wrapper for authed app screens: TopBar + Outlet + BottomNav
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { BottomNav } from "@/components/nsrc/bottom-nav";
import { useAuth } from "@/stores/auth";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const hydrated = useAuth((s) => s.hydrated);

  useEffect(() => {
    if (hydrated && !user) navigate({ to: "/login" });
  }, [hydrated, user, navigate]);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto w-full max-w-2xl flex-1 pb-4">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
