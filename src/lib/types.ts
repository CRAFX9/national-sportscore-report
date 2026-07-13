// NSRC domain types
export type UserRole = "coach" | "district_officer" | "sai_official" | "parent";

export interface User {
  id: string;
  name: string;
  role: UserRole;
  phone: string;
  district?: string;
  state?: string;
}

export type Gender = "male" | "female" | "other";

export interface Student {
  id: string;
  athleteId: string; // unique NSRC ID e.g. NSRC-2026-000123
  photoDataUrl?: string;
  name: string;
  dob: string; // ISO date
  age: number;
  gender: Gender;
  heightCm: number;
  weightKg: number;
  school: string;
  village: string;
  district: string;
  state: string;
  parentName: string;
  parentPhone: string;
  medicalConditions?: string;
  createdAt: number;
  syncStatus: "pending" | "synced";
}

export type AssessmentType =
  | "sprint_30m"
  | "sprint_50m"
  | "broad_jump"
  | "vertical_jump"
  | "shuttle_run"
  | "reaction_test";

export interface Assessment {
  id: string;
  studentId: string;
  type: AssessmentType;
  createdAt: number;
  videoRef?: string; // placeholder marker for locally stored video
  syncStatus: "pending" | "synced" | "error";
}

export interface AssessmentResult {
  id: string;
  assessmentId: string;
  studentId: string;
  overall: number; // 0–100
  metrics: {
    speed: number;
    strength: number;
    agility: number;
    power: number;
    endurance: number;
    coordination: number;
  };
  nationalPercentile: number;
  districtRank: number;
  recommendedSports: string[];
  strengths: string[];
  improvements: string[];
  createdAt: number;
}

export interface Report {
  id: string;
  studentId: string;
  title: string;
  createdAt: number;
  resultId: string;
}

export interface SyncItem {
  id: string;
  kind: "student" | "assessment" | "result" | "report";
  refId: string;
  createdAt: number;
  status: "pending" | "uploading" | "done" | "error";
  attempts: number;
  error?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  read: boolean;
}
