import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { LogOut, Shield, Building2, Award, User as UserIcon, GraduationCap, Check } from "lucide-react";
import { TopBar } from "@/components/nsrc/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/nsrc/status-chip";
import { useAuth } from "@/stores/auth";
import { ROLE_CAPABILITIES, ROLE_LABELS } from "@/lib/permissions";
import type { UserRole } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/me")({
  component: MePage,
});

const ICONS: Record<UserRole, typeof Award> = {
  student: GraduationCap,
  coach: Award,
  district_officer: Building2,
  sai_official: Shield,
  parent: UserIcon,
};

const PERMISSION_LABELS: Record<string, string> = {
  assess: "Run assessments",
  manageStudents: "Add / edit / remove athlete profiles",
  manageCoaches: "Manage coach profiles",
  viewAllStudents: "Browse athlete directory",
  viewOtherProfiles: "View other athletes (read-only)",
  sync: "Manage offline sync queue",
  analytics: "View analytics dashboards",
};

function MePage() {
  const user = useAuth((s) => s.user);
  const linkedStudentId = useAuth((s) => s.linkedStudentId);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();

  const role = (user?.role ?? "coach") as UserRole;
  const Icon = ICONS[role];
  const caps = ROLE_CAPABILITIES[role];
  const granted = Object.entries(caps).filter(([k, v]) => v && PERMISSION_LABELS[k]);

  return (
    <>
      <TopBar title="My Account" />
      <div className="space-y-4 px-4 pt-4">
        <Card><CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl gov-gradient text-primary-foreground">
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.phone} • {user?.district}, {user?.state}</p>
            <div className="mt-2"><StatusChip variant="info">{ROLE_LABELS[role]}</StatusChip></div>
          </div>
        </CardContent></Card>

        {linkedStudentId && (
          <Button asChild variant="outline" className="w-full">
            <Link to="/profile/$id" params={{ id: linkedStudentId }}>
              {role === "parent" ? "Open my child's profile" : "Open my athlete profile"}
            </Link>
          </Button>
        )}

        <Card><CardContent className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your access</p>
          {granted.length === 0 ? (
            <p className="mt-2 text-sm">View-only access to your linked athlete profile and reports.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {granted.map(([k]) => (
                <li key={k} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-success" /> {PERMISSION_LABELS[k]}
                </li>
              ))}
            </ul>
          )}
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
