import { create } from "zustand";
import { persist } from "zustand/middleware";

type Mode = "light" | "dark";

interface ThemeState {
  mode: Mode;
  toggle: () => void;
  apply: () => void;
}

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: "light",
      toggle: () => {
        const next: Mode = get().mode === "light" ? "dark" : "light";
        set({ mode: next });
        if (typeof document !== "undefined") {
          document.documentElement.classList.toggle("dark", next === "dark");
        }
      },
      apply: () => {
        if (typeof document !== "undefined") {
          document.documentElement.classList.toggle("dark", get().mode === "dark");
        }
      },
    }),
    { name: "nsrc-theme" },
  ),
);
