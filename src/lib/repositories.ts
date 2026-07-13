// Repository pattern over Dexie tables.
import { db } from "./db";
import type {
  Assessment, AssessmentResult, Report, Student, SyncItem,
} from "./types";

export const studentsRepo = {
  all: () => db.students.orderBy("createdAt").reverse().toArray(),
  find: (id: string) => db.students.get(id),
  create: async (s: Student) => {
    await db.students.add(s);
    await db.sync_queue.add({
      id: crypto.randomUUID(), kind: "student", refId: s.id,
      status: "pending", attempts: 0, createdAt: Date.now(),
    });
  },
  update: (id: string, patch: Partial<Student>) => db.students.update(id, patch),
  remove: (id: string) => db.students.delete(id),
  pendingCount: () => db.students.where("syncStatus").equals("pending").count(),
};

export const assessmentsRepo = {
  all: () => db.assessments.orderBy("createdAt").reverse().toArray(),
  byStudent: (studentId: string) =>
    db.assessments.where("studentId").equals(studentId).reverse().sortBy("createdAt"),
  create: async (a: Assessment) => {
    await db.assessments.add(a);
    await db.sync_queue.add({
      id: crypto.randomUUID(), kind: "assessment", refId: a.id,
      status: "pending", attempts: 0, createdAt: Date.now(),
    });
  },
  todayCount: async () => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return db.assessments.where("createdAt").above(start.getTime()).count();
  },
};

export const resultsRepo = {
  all: () => db.assessment_results.orderBy("createdAt").reverse().toArray(),
  find: (id: string) => db.assessment_results.get(id),
  byStudent: (studentId: string) =>
    db.assessment_results.where("studentId").equals(studentId).reverse().sortBy("createdAt"),
  create: (r: AssessmentResult) => db.assessment_results.add(r),
  topAthletes: async (n = 5) => {
    const all = await db.assessment_results.toArray();
    const bestByStudent = new Map<string, AssessmentResult>();
    for (const r of all) {
      const cur = bestByStudent.get(r.studentId);
      if (!cur || r.overall > cur.overall) bestByStudent.set(r.studentId, r);
    }
    return [...bestByStudent.values()].sort((a, b) => b.overall - a.overall).slice(0, n);
  },
};

export const reportsRepo = {
  all: () => db.reports.orderBy("createdAt").reverse().toArray(),
  recent: (n = 5) => db.reports.orderBy("createdAt").reverse().limit(n).toArray(),
  create: (r: Report) => db.reports.add(r),
};

export const syncRepo = {
  all: () => db.sync_queue.orderBy("createdAt").reverse().toArray(),
  pendingCount: () => db.sync_queue.where("status").anyOf("pending", "error").count(),
  update: (id: string, patch: Partial<SyncItem>) => db.sync_queue.update(id, patch),
  markDone: (id: string) => db.sync_queue.update(id, { status: "done" }),
};
