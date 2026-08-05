import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, CheckCheck, RefreshCw, Trash2 } from "lucide-react";
import { TopBar } from "@/components/nsrc/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/nsrc/status-chip";
import { EmptyState } from "@/components/nsrc/states";
import { notificationsRepo } from "@/lib/repositories";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_app/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsRepo.all(),
  });
  const unread = items.filter((n) => !n.read).length;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["notifications-unread"] });
  };

  return (
    <>
      <TopBar title="Notifications" subtitle={`${unread} unread`} back />
      <div className="space-y-4 px-4 pt-4 pb-6">
        {items.length === 0 ? (
          <EmptyState
            icon={<BellOff className="h-8 w-8" />}
            title="No notifications"
            description="Alerts about sync, guidelines and results appear here."
          />
        ) : (
          <>
            <Button
              variant="outline"
              className="w-full gap-2"
              disabled={unread === 0}
              onClick={async () => { await notificationsRepo.markAllRead(); refresh(); }}
            >
              <CheckCheck className="h-4 w-4" /> Mark all as read
            </Button>
            <div className="space-y-2">
              {items.map((n) => (
                <Card key={n.id} className={n.read ? "" : "border-primary/40 bg-primary-container/25"}>
                  <CardContent className="flex items-start gap-3 p-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
                      <Bell className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold">{n.title}</p>
                        {!n.read && <StatusChip variant="warning">New</StatusChip>}
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatDistanceToNow(n.createdAt, { addSuffix: true })}
                      </p>
                      <div className="mt-2 flex gap-2">
                        {!n.read && (
                          <Button
                            size="sm" variant="outline"
                            onClick={async () => { await notificationsRepo.markRead(n.id); refresh(); }}
                          >
                            Mark read
                          </Button>
                        )}
                        <Button
                          size="sm" variant="ghost" className="gap-1 text-destructive"
                          onClick={async () => { await notificationsRepo.remove(n.id); refresh(); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Dismiss
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        <Button asChild variant="outline" className="w-full gap-2">
          <Link to="/sync"><RefreshCw className="h-4 w-4" /> Open sync queue</Link>
        </Button>
      </div>
    </>
  );
}
