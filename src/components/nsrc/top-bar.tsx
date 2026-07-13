import { ArrowLeft, Bell, Moon, Sun } from "lucide-react";
import { Link, useRouter } from "@tanstack/react-router";
import { useTheme } from "@/stores/theme";
import { Button } from "@/components/ui/button";

interface TopBarProps {
  title: string;
  subtitle?: string;
  back?: boolean;
  action?: React.ReactNode;
}

export function TopBar({ title, subtitle, back, action }: TopBarProps) {
  const router = useRouter();
  const { mode, toggle } = useTheme();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3">
        {back ? (
          <Button variant="ghost" size="icon" onClick={() => router.history.back()} aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full gov-gradient text-primary-foreground text-sm font-bold">
            N
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold">{title}</h1>
          {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        {action}
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
          {mode === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        <Button asChild variant="ghost" size="icon" aria-label="Notifications">
          <Link to="/sync"><Bell className="h-5 w-5" /></Link>
        </Button>
      </div>
    </header>
  );
}
