import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Users, Activity, RefreshCw, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/dashboard", label: "Home", Icon: Home },
  { to: "/students", label: "Students", Icon: Users },
  { to: "/assessments/new", label: "Assess", Icon: Activity },
  { to: "/sync", label: "Sync", Icon: RefreshCw },
  { to: "/me", label: "Me", Icon: User },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
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
                  "flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors",
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
