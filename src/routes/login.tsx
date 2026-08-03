import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Award, Building2, GraduationCap, ShieldCheck, User, WifiOff } from "lucide-react";
import { useAuth } from "@/stores/auth";
import type { UserRole } from "@/lib/types";
import { studentsRepo } from "@/lib/repositories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const roles: { id: UserRole; label: string; desc: string; Icon: typeof User }[] = [
  { id: "student", label: "Student", desc: "See your own report card", Icon: GraduationCap },
  { id: "coach", label: "Coach", desc: "Assess & manage athletes", Icon: Award },
  { id: "district_officer", label: "District Officer", desc: "Manage athletes & coaches", Icon: Building2 },
  { id: "sai_official", label: "SAI Official", desc: "National oversight", Icon: ShieldCheck },
  { id: "parent", label: "Parent", desc: "Monitor your child only", Icon: User },
];

const schema = z.object({
  phone: z.string().trim().regex(/^\+?[0-9\s-]{10,15}$/, "Enter a valid phone number"),
  otp: z.string().length(6, "OTP must be 6 digits").regex(/^\d+$/, "Digits only"),
});
type FormV = z.infer<typeof schema>;

function LoginPage() {
  const navigate = useNavigate();
  const loginAs = useAuth((s) => s.loginAs);
  const [role, setRole] = useState<UserRole>("coach");
  const [studentId, setStudentId] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const needsAthlete = role === "student" || role === "parent";
  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: () => studentsRepo.all() });

  const form = useForm<FormV>({
    resolver: zodResolver(schema),
    defaultValues: { phone: "", otp: "" },
  });

  const sendOtp = async () => {
    const ok = await form.trigger("phone");
    if (!ok) return;
    setOtpSent(true);
    form.setValue("otp", "123456"); // demo autofill
    toast.success("OTP sent (demo: 123456)");
  };

  const onSubmit = (v: FormV) => {
    if (needsAthlete && !studentId) {
      toast.error(role === "parent" ? "Select your child's profile" : "Select your athlete profile");
      return;
    }
    const linked = needsAthlete ? students.find((s) => s.id === studentId) : undefined;
    const name = role === "student" ? linked?.name : role === "parent" ? linked?.parentName : undefined;
    loginAs(role, v.phone, needsAthlete ? studentId : null, name);
    toast.success("Signed in");
    navigate({ to: "/dashboard" });
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col px-5 py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl gov-gradient text-primary-foreground text-lg font-black">N</div>
        <div>
          <h1 className="text-lg font-bold">NSRC</h1>
          <p className="text-xs text-muted-foreground">National Sports Report Card</p>
        </div>
      </div>

      <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose your role and continue with OTP. You'll only see the options your role allows.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {roles.map(({ id, label, desc, Icon }) => {
          const active = role === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => { setRole(id); setStudentId(""); }}
              className={cn(
                "flex flex-col items-start gap-2 rounded-2xl border p-3 text-left transition-all",
                active
                  ? "border-primary bg-primary-container elevation-2"
                  : "border-border bg-card hover:bg-muted",
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl",
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="h-4.5 w-4.5" />
              </span>
              <div>
                <p className="text-sm font-semibold">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-5 elevation-1">
        {needsAthlete && (
          <div>
            <Label htmlFor="athlete">{role === "parent" ? "Your child" : "Your athlete profile"}</Label>
            <select
              id="athlete"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="">Select…</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.name} — {s.athleteId}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <Label htmlFor="phone">Mobile number</Label>
          <Input id="phone" placeholder="+91 98765 43210" inputMode="tel" {...form.register("phone")} />
          {form.formState.errors.phone && (
            <p className="mt-1 text-xs text-destructive">{form.formState.errors.phone.message}</p>
          )}
        </div>

        {otpSent ? (
          <div>
            <Label htmlFor="otp">6-digit OTP</Label>
            <Input id="otp" placeholder="••••••" inputMode="numeric" maxLength={6} {...form.register("otp")} />
            {form.formState.errors.otp && (
              <p className="mt-1 text-xs text-destructive">{form.formState.errors.otp.message}</p>
            )}
          </div>
        ) : null}

        {otpSent ? (
          <Button type="submit" className="w-full" size="lg">Verify & Continue</Button>
        ) : (
          <Button type="button" onClick={sendOtp} className="w-full" size="lg">Send OTP</Button>
        )}

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <WifiOff className="h-3.5 w-3.5" />
          Offline login available for verified devices
        </div>
      </form>
    </main>
  );
}
