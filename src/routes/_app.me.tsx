import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut, Shield, Building2, Award, User as UserIcon } from "lucide-react";
import { TopBar } from "@/components/nsrc/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/stores/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/me")({
  component: MePage,
});

function MePage() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();

  const icon = {
    coach: Award,
    district_officer: Building2,
    sai_official: Shield,
    parent: UserIcon,
  }[user?.role ?? "coach"];
  const Icon = icon;

  return (
    <>
      <TopBar title="Profile" />
      <div className="space-y-4 px-4 pt-4">
        <Card><CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl gov-gradient text-primary-foreground">
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.phone} • {user?.district}, {user?.state}</p>
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">About NSRC</p>
          <p className="mt-2 text-sm">
            The National Sports Report Card (NSRC) is an offline-first assessment platform designed for
            grassroots talent identification across India. Prototype built for Smart India Hackathon.
          </p>
        </CardContent></Card>

        <Button
          variant="outline"
          className="w-full gap-2 text-destructive"
          onClick={() => { logout(); toast.success("Signed out"); navigate({ to: "/login" }); }}
        >
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    </>
  );
}
