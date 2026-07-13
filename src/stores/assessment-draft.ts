import { create } from "zustand";
import type { AssessmentType } from "@/lib/types";

interface DraftState {
  studentId: string | null;
  selected: AssessmentType[];
  currentIndex: number;
  language: string;
  lastAssessmentId: string | null;
  setStudent: (id: string) => void;
  toggle: (t: AssessmentType) => void;
  setLanguage: (l: string) => void;
  next: () => void;
  reset: () => void;
  setLast: (id: string) => void;
}

export const useAssessmentDraft = create<DraftState>((set, get) => ({
  studentId: null,
  selected: [],
  currentIndex: 0,
  language: "English",
  lastAssessmentId: null,
  setStudent: (id) => set({ studentId: id }),
  toggle: (t) => {
    const cur = get().selected;
    set({ selected: cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t] });
  },
  setLanguage: (l) => set({ language: l }),
  next: () => set({ currentIndex: get().currentIndex + 1 }),
  reset: () => set({ studentId: null, selected: [], currentIndex: 0, lastAssessmentId: null }),
  setLast: (id) => set({ lastAssessmentId: id }),
}));
