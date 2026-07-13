import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Camera } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { TopBar } from "@/components/nsrc/top-bar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { studentsRepo } from "@/lib/repositories";
import type { Gender, Student } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/students/new")({
  component: StudentRegistrationPage,
});

const schema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  dob: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["male", "female", "other"]),
  heightCm: z.coerce.number().min(80).max(230),
  weightKg: z.coerce.number().min(15).max(200),
  school: z.string().trim().min(2).max(120),
  village: z.string().trim().min(1).max(80),
  district: z.string().trim().min(1).max(80),
  state: z.string().trim().min(1).max(80),
  parentName: z.string().trim().min(2).max(80),
  parentPhone: z.string().trim().regex(/^\+?[0-9\s-]{10,15}$/, "Enter a valid phone"),
  medicalConditions: z.string().max(300).optional(),
});
type FormV = z.infer<typeof schema>;

function ageFromDob(dob: string) {
  const d = new Date(dob);
  const diff = Date.now() - d.getTime();
  return Math.max(0, Math.floor(diff / (365.25 * 86400000)));
}

function StudentRegistrationPage() {
  const navigate = useNavigate();
  const [photo, setPhoto] = useState<string | undefined>();
  const [preview, setPreview] = useState<Student | null>(null);

  const form = useForm<FormV>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "", dob: "", gender: "male", heightCm: 160, weightKg: 50,
      school: "", village: "", district: "", state: "", parentName: "", parentPhone: "",
      medicalConditions: "",
    },
  });

  const onPhoto = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result));
    reader.readAsDataURL(file);
  };

  const onSubmit = async (v: FormV) => {
    const idNumber = String(Date.now()).slice(-6);
    const student: Student = {
      id: crypto.randomUUID(),
      athleteId: `NSRC-2026-${idNumber}`,
      photoDataUrl: photo,
      name: v.name, dob: v.dob, age: ageFromDob(v.dob), gender: v.gender as Gender,
      heightCm: Number(v.heightCm), weightKg: Number(v.weightKg),
      school: v.school, village: v.village, district: v.district, state: v.state,
      parentName: v.parentName, parentPhone: v.parentPhone,
      medicalConditions: v.medicalConditions ?? "",
      createdAt: Date.now(),
      syncStatus: "pending",
    };
    await studentsRepo.create(student);
    setPreview(student);
    toast.success("Student saved locally");
  };

  if (preview) {
    return (
      <>
        <TopBar title="Registration complete" back />
        <div className="space-y-4 px-4 pt-4">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
              <p className="text-sm text-muted-foreground">Athlete ID</p>
              <p className="text-xl font-bold tracking-wide">{preview.athleteId}</p>
              <div className="rounded-xl bg-white p-3">
                <QRCodeSVG value={JSON.stringify({ id: preview.id, athleteId: preview.athleteId, name: preview.name })} size={180} />
              </div>
              <p className="text-sm">{preview.name} • {preview.age}y</p>
              <p className="text-xs text-muted-foreground">Saved offline. Will sync automatically.</p>
            </CardContent>
          </Card>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => navigate({ to: "/students" })}>Back to list</Button>
            <Button onClick={() => navigate({ to: "/profile/$id", params: { id: preview.id } })}>Open profile</Button>
          </div>
        </div>
      </>
    );
  }

  const err = form.formState.errors;

  return (
    <>
      <TopBar title="Register Student" back />
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-4 pt-4 pb-8">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <label className="flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-muted text-muted-foreground">
              {photo ? (
                <img src={photo} alt="Student" className="h-full w-full object-cover" />
              ) : (
                <Camera className="h-6 w-6" />
              )}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
            </label>
            <div>
              <p className="text-sm font-semibold">Student photo</p>
              <p className="text-xs text-muted-foreground">Tap to capture or upload</p>
            </div>
          </CardContent>
        </Card>

        <Section title="Personal">
          <Field label="Full name" error={err.name?.message}>
            <Input {...form.register("name")} placeholder="e.g. Aarav Sharma" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date of birth" error={err.dob?.message}>
              <Input type="date" {...form.register("dob")} />
            </Field>
            <Field label="Gender">
              <select className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" {...form.register("gender")}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Height (cm)" error={err.heightCm?.message}>
              <Input type="number" {...form.register("heightCm")} />
            </Field>
            <Field label="Weight (kg)" error={err.weightKg?.message}>
              <Input type="number" {...form.register("weightKg")} />
            </Field>
          </div>
        </Section>

        <Section title="Location">
          <Field label="School" error={err.school?.message}><Input {...form.register("school")} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Village" error={err.village?.message}><Input {...form.register("village")} /></Field>
            <Field label="District" error={err.district?.message}><Input {...form.register("district")} /></Field>
          </div>
          <Field label="State" error={err.state?.message}><Input {...form.register("state")} /></Field>
        </Section>

        <Section title="Guardian">
          <Field label="Parent name" error={err.parentName?.message}><Input {...form.register("parentName")} /></Field>
          <Field label="Parent phone" error={err.parentPhone?.message}>
            <Input inputMode="tel" {...form.register("parentPhone")} />
          </Field>
          <Field label="Medical conditions (optional)">
            <Input {...form.register("medicalConditions")} placeholder="Allergies, asthma, etc." />
          </Field>
        </Section>

        <Button type="submit" size="lg" className="w-full">Save & Generate QR</Button>
      </form>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
        {children}
      </CardContent>
    </Card>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1 block text-xs">{label}</Label>
      {children}
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
