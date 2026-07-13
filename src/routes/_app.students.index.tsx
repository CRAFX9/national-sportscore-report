import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Filter, Plus, Search, Trash2, Pencil, Eye } from "lucide-react";
import { TopBar } from "@/components/nsrc/top-bar";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { StatusChip } from "@/components/nsrc/status-chip";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/nsrc/states";
import { studentsRepo } from "@/lib/repositories";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/students/")({
  component: StudentsPage,
});

type Filter = "all" | "recent" | "pending";

function StudentsPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const { data: students = [], refetch } = useQuery({
    queryKey: ["students"],
    queryFn: () => studentsRepo.all(),
  });

  const filtered = students
    .filter((s) => (filter === "pending" ? s.syncStatus === "pending" : true))
    .filter((s) => (filter === "recent" ? Date.now() - s.createdAt < 7 * 86400000 : true))
    .filter((s) =>
      q ? [s.name, s.athleteId, s.school, s.district].join(" ").toLowerCase().includes(q.toLowerCase()) : true,
    );

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    await studentsRepo.remove(id);
    toast.success("Student deleted");
    refetch();
  };

  return (
    <>
      <TopBar
        title="Students"
        subtitle={`${students.length} registered`}
        action={
          <Button asChild size="sm" className="gap-1">
            <Link to="/students/new"><Plus className="h-4 w-4" />Add</Link>
          </Button>
        }
      />

      <div className="space-y-3 px-4 pt-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name, ID, school…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["all", "recent", "pending"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={
                "shrink-0 rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors " +
                (filter === f
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground")
              }
            >
              {f === "pending" ? "Pending sync" : f}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Filter className="h-8 w-8" />}
            title="No students match your filters"
            description="Try clearing the search or adding a new student."
            action={<Button asChild><Link to="/students/new">Register student</Link></Button>}
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((s) => (
              <Card key={s.id}>
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-container text-on-primary-container font-semibold">
                    {s.name.slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{s.name}</p>
                      {s.syncStatus === "pending" ? (
                        <StatusChip variant="warning">Pending</StatusChip>
                      ) : (
                        <StatusChip variant="success">Synced</StatusChip>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.athleteId} • {s.age}y • {s.district}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button asChild size="icon" variant="ghost">
                      <Link to="/profile/$id" params={{ id: s.id }} aria-label="View"><Eye className="h-4 w-4" /></Link>
                    </Button>
                    <Button asChild size="icon" variant="ghost">
                      <Link to="/students/$id/edit" params={{ id: s.id }} aria-label="Edit"><Pencil className="h-4 w-4" /></Link>
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(s.id, s.name)} aria-label="Delete">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
