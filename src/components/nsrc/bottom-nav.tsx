import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Users, Activity, RefreshCw, User, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/stores/auth";
import { can } from "@/lib/permissions";

type Item = { to: string; label: string; Icon: typeof Home };

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const user = useAuth((s) => s.user);
  const linkedStudentId = useAuth((s) => s.linkedStudentId);
  const role = user?.role;

  const items: Item[] = [{ to: "/dashboard", label: "Home", Icon: Home }];

  if (role === "student" || role === "parent") {
    if (linkedStudentId) {
      items.push({ to: `/profile/${linkedStudentId}`, label: role === "parent" ? "My child" : "My profile", Icon: User });
    }
  }
  if (can(role, "viewAllStudents")) {
    items.push({ to: "/students", label: role === "student" ? "Athletes" : "Students", Icon: Users });
  }
  if (can(role, "assess")) items.push({ to: "/assessments/new", label: "Assess", Icon: Activity });
  if (can(role, "manageCoaches")) items.push({ to: "/coaches", label: "Coaches", Icon: Award });
  if (can(role, "sync")) items.push({ to: "/sync", label: "Sync", Icon: RefreshCw });
  items.push({ to: "/me", label: "Me", Icon: User });

  return (
    <nav className="sticky bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur elevation-2">
      <ul className="mx-auto flex max-w-2xl items-stretch justify-between px-2">
        {items.map(({ to, label, Icon }) => {
          const active = pathname === to || pathname.startsWith(to + "/");
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-14 items-center justify-center rounded-full transition-colors",
                    active && "bg-primary-container text-on-primary-container",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
