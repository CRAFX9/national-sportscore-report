import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Award, Pencil, Plus, Trash2 } from "lucide-react";
import { TopBar } from "@/components/nsrc/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusChip } from "@/components/nsrc/status-chip";
import { EmptyState } from "@/components/nsrc/states";
import { coachesRepo } from "@/lib/repositories";
import { useAuth } from "@/stores/auth";
import { can } from "@/lib/permissions";
import type { Coach } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/coaches")({
  component: CoachesPage,
});

type FormV = Omit<Coach, "id" | "createdAt">;

function CoachesPage() {
  const role = useAuth((s) => s.user?.role);
  const navigate = useNavigate();
  const allowed = can(role, "manageCoaches");

  useEffect(() => {
    if (role && !allowed) navigate({ to: "/dashboard" });
  }, [role, allowed, navigate]);

  const [editing, setEditing] = useState<Coach | null>(null);
  const [adding, setAdding] = useState(false);

  const { data: coaches = [], refetch } = useQuery({
    queryKey: ["coaches"],
    queryFn: async () => { await coachesRepo.ensureSeed(); return coachesRepo.all(); },
  });

  if (!allowed) return null;

  const remove = async (c: Coach) => {
    if (!confirm(`Remove coach ${c.name}?`)) return;
    await coachesRepo.remove(c.id);
    toast.success("Coach removed");
    refetch();
  };

  return (
    <>
      <TopBar
        title="Coaches"
        subtitle={`${coaches.length} in ${coaches[0]?.district ?? "district"}`}
        action={
          <Button size="sm" className="gap-1" onClick={() => { setAdding(true); setEditing(null); }}>
            <Plus className="h-4 w-4" />Add
          </Button>
        }
      />

      <div className="space-y-3 px-4 pt-4">
        {(adding || editing) && (
          <CoachForm
            initial={editing}
            onCancel={() => { setAdding(false); setEditing(null); }}
            onDone={() => { setAdding(false); setEditing(null); refetch(); }}
          />
        )}

        {coaches.length === 0 ? (
          <EmptyState
            icon={<Award className="h-8 w-8" />}
            title="No coaches yet"
            description="Add coaches so they can assess athletes in your district."
          />
        ) : (
          coaches.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center gap-3 p-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-tertiary-container font-semibold text-on-tertiary-container">
                  {c.name.slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">{c.name}</p>
                    <StatusChip variant={c.active ? "success" : "warning"}>{c.active ? "Active" : "Inactive"}</StatusChip>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.specialization} • {c.school} • {c.phone}
                  </p>
                </div>
                <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => { setEditing(c); setAdding(false); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" aria-label="Remove" onClick={() => remove(c)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </>
  );
}

function CoachForm({
  initial, onCancel, onDone,
}: { initial: Coach | null; onCancel: () => void; onDone: () => void }) {
  const form = useForm<FormV>({
    defaultValues: initial ?? {
      name: "", phone: "", school: "", district: "Pune", state: "Maharashtra",
      specialization: "", active: true,
    },
  });

  const submit = async (v: FormV) => {
    if (!v.name.trim()) { toast.error("Name is required"); return; }
    if (initial) await coachesRepo.update(initial.id, v);
    else await coachesRepo.create({ ...v, id: crypto.randomUUID(), createdAt: Date.now() });
    toast.success(initial ? "Coach updated" : "Coach added");
    onDone();
  };

  return (
    <Card><CardContent className="p-4">
      <form onSubmit={form.handleSubmit(submit)} className="space-y-3">
        <p className="text-sm font-semibold">{initial ? "Edit coach" : "New coach"}</p>
        <Field label="Full name"><Input {...form.register("name")} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone"><Input {...form.register("phone")} /></Field>
          <Field label="Specialization"><Input {...form.register("specialization")} /></Field>
        </div>
        <Field label="School / Centre"><Input {...form.register("school")} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="District"><Input {...form.register("district")} /></Field>
          <Field label="State"><Input {...form.register("state")} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...form.register("active")} /> Active
        </label>
        <div className="flex gap-2">
          <Button type="submit" className="flex-1">{initial ? "Save changes" : "Add coach"}</Button>
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </CardContent></Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="mb-1 block text-xs">{label}</Label>{children}</div>;
}
