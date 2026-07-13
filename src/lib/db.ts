// Offline-first local database using Dexie (IndexedDB) — web equivalent of SQLite.
// Repository pattern lives in src/lib/repositories/*.
import Dexie, { type Table } from "dexie";
import type {
  Assessment,
  AssessmentResult,
  NotificationItem,
  Report,
  Student,
  SyncItem,
  User,
} from "./types";

class NSRCDatabase extends Dexie {
  users!: Table<User, string>;
  students!: Table<Student, string>;
  assessments!: Table<Assessment, string>;
  assessment_results!: Table<AssessmentResult, string>;
  reports!: Table<Report, string>;
  sync_queue!: Table<SyncItem, string>;
  notifications!: Table<NotificationItem, string>;

  constructor() {
    super("nsrc_db");
    this.version(1).stores({
      users: "id, role, phone",
      students: "id, athleteId, name, district, syncStatus, createdAt",
      assessments: "id, studentId, type, syncStatus, createdAt",
      assessment_results: "id, assessmentId, studentId, createdAt",
      reports: "id, studentId, createdAt",
      sync_queue: "id, kind, status, createdAt",
      notifications: "id, read, createdAt",
    });
  }
}

export const db = typeof window !== "undefined" ? new NSRCDatabase() : (null as unknown as NSRCDatabase);

export const isBrowser = typeof window !== "undefined";
