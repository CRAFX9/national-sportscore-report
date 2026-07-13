import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { TopBar } from "@/components/nsrc/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { studentsRepo } from "@/lib/repositories";
import { LoadingState } from "@/components/nsrc/states";
import { toast } from "sonner";
import type { Student } from "@/lib/types";

export const Route = createFileRoute("/_app/students/$id/edit")({
  component: EditStudentPage,
});

function EditStudentPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: student, isLoading } = useQuery({
    queryKey: ["student", id],
    queryFn: () => studentsRepo.find(id),
  });

  const form = useForm<Partial<Student>>({ values: student });

  if (isLoading || !student) return <LoadingState />;

  const onSubmit = async (v: Partial<Student>) => {
    await studentsRepo.update(id, { ...v, heightCm: Number(v.heightCm), weightKg: Number(v.weightKg) });
    toast.success("Saved");
    navigate({ to: "/profile/$id", params: { id } });
  };

  return (
    <>
      <TopBar title="Edit student" back />
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 px-4 pt-4 pb-6">
        <Card><CardContent className="space-y-3 p-4">
          <Field label="Name"><Input {...form.register("name")} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Height (cm)"><Input type="number" {...form.register("heightCm")} /></Field>
            <Field label="Weight (kg)"><Input type="number" {...form.register("weightKg")} /></Field>
          </div>
          <Field label="School"><Input {...form.register("school")} /></Field>
          <Field label="District"><Input {...form.register("district")} /></Field>
          <Field label="Parent phone"><Input {...form.register("parentPhone")} /></Field>
        </CardContent></Card>
        <Button type="submit" size="lg" className="w-full">Save changes</Button>
      </form>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div><Label className="mb-1 block text-xs">{label}</Label>{children}</div>);
}
