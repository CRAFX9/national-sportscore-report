import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, UserRole } from "@/lib/types";

interface AuthState {
  user: User | null;
  hydrated: boolean;
  loginAs: (role: UserRole, phone: string) => void;
  logout: () => void;
  setHydrated: () => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  coach: "Coach",
  district_officer: "District Officer",
  sai_official: "SAI Official",
  parent: "Parent",
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      hydrated: false,
      loginAs: (role, phone) => set({
        user: {
          id: crypto.randomUUID(),
          name: `${ROLE_LABELS[role]} — Demo`,
          role,
          phone,
          district: "Pune",
          state: "Maharashtra",
        },
      }),
      logout: () => set({ user: null }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "nsrc-auth",
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);
