// Role capability matrix — the single source of truth for what each role sees.
import type { UserRole } from "./types";

export interface Capabilities {
  /** Can run/record assessments for athletes. */
  assess: boolean;
  /** Can create/edit/delete any athlete profile. */
  manageStudents: boolean;
  /** Can create/edit/delete coach profiles. */
  manageCoaches: boolean;
  /** Can browse the full athlete directory. */
  viewAllStudents: boolean;
  /** Can view (read-only) other athletes' profiles. */
  viewOtherProfiles: boolean;
  /** Sees the offline sync queue. */
  sync: boolean;
  /** Sees district/state analytics. */
  analytics: boolean;
  /** Restricted to a single linked athlete profile. */
  selfOnly: boolean;
}

export const ROLE_CAPABILITIES: Record<UserRole, Capabilities> = {
  student: {
    assess: false, manageStudents: false, manageCoaches: false,
    viewAllStudents: true, viewOtherProfiles: true, sync: false,
    analytics: false, selfOnly: true,
  },
  parent: {
    assess: false, manageStudents: false, manageCoaches: false,
    viewAllStudents: false, viewOtherProfiles: false, sync: false,
    analytics: false, selfOnly: true,
  },
  coach: {
    assess: true, manageStudents: true, manageCoaches: false,
    viewAllStudents: true, viewOtherProfiles: true, sync: true,
    analytics: false, selfOnly: false,
  },
  district_officer: {
    assess: true, manageStudents: true, manageCoaches: true,
    viewAllStudents: true, viewOtherProfiles: true, sync: true,
    analytics: true, selfOnly: false,
  },
  sai_official: {
    assess: false, manageStudents: false, manageCoaches: false,
    viewAllStudents: true, viewOtherProfiles: true, sync: false,
    analytics: true, selfOnly: false,
  },
};

export const ROLE_LABELS: Record<UserRole, string> = {
  student: "Student Athlete",
  coach: "Coach",
  district_officer: "District Officer",
  sai_official: "SAI Official",
  parent: "Parent",
};

export function can(role: UserRole | undefined, cap: keyof Capabilities): boolean {
  if (!role) return false;
  return ROLE_CAPABILITIES[role][cap];
}
