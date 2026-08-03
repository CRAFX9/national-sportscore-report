import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, UserRole } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/permissions";

interface AuthState {
  user: User | null;
  /** Athlete profile this account is tied to (student / parent). */
  linkedStudentId: string | null;
  hydrated: boolean;
  loginAs: (role: UserRole, phone: string, linkedStudentId?: string | null, name?: string) => void;
  logout: () => void;
  setHydrated: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      linkedStudentId: null,
      hydrated: false,
      loginAs: (role, phone, linkedStudentId = null, name) => set({
        linkedStudentId,
        user: {
          id: crypto.randomUUID(),
          name: name ?? `${ROLE_LABELS[role]} — Demo`,
          role,
          phone,
          district: "Pune",
          state: "Maharashtra",
        },
      }),
      logout: () => set({ user: null, linkedStudentId: null }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "nsrc-auth",
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);
