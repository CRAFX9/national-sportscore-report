// Realistic Indian dummy data for NSRC demo. Seeded once into IndexedDB.
import { db, isBrowser } from "./db";
import type {
  Assessment,
  AssessmentResult,
  AssessmentType,
  NotificationItem,
  Report,
  Student,
  SyncItem,
} from "./types";

const FIRST_NAMES = [
  "Aarav", "Vihaan", "Aditya", "Rohan", "Krishna", "Arjun", "Ishaan", "Kabir",
  "Ananya", "Diya", "Priya", "Meera", "Riya", "Kavya", "Sneha", "Ishita",
  "Rahul", "Sahil", "Neel", "Yuvraj", "Aisha", "Nisha", "Pooja", "Sanya",
];
const LAST_NAMES = [
  "Sharma", "Patel", "Kumar", "Singh", "Reddy", "Iyer", "Nair", "Verma",
  "Yadav", "Gupta", "Chopra", "Joshi", "Mehta", "Das", "Kapoor", "Rao",
];
const SCHOOLS = [
  "Kendriya Vidyalaya No. 1",
  "Sainik School Bhubaneswar",
  "Jawahar Navodaya Vidyalaya",
  "DAV Public School",
  "Govt. Model Sr. Sec. School",
  "SAI Sports Academy",
];
const VILLAGES = ["Rampur", "Sundarpur", "Bhilai", "Nagaon", "Palakkad", "Junagadh", "Karad", "Warangal"];
const DISTRICTS = ["Pune", "Bengaluru Urban", "Coimbatore", "Lucknow", "Kolkata", "Guwahati", "Jaipur", "Bhopal"];
const STATES = ["Maharashtra", "Karnataka", "Tamil Nadu", "Uttar Pradesh", "West Bengal", "Assam", "Rajasthan", "Madhya Pradesh"];

const SPORTS = ["Athletics — Sprint", "Long Jump", "Football", "Kabaddi", "Basketball", "Hockey", "Boxing", "Wrestling", "Badminton"];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randi(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function makeAthleteId(i: number) {
  return `NSRC-2026-${String(i).padStart(6, "0")}`;
}

function makeStudent(i: number): Student {
  const first = rand(FIRST_NAMES);
  const last = rand(LAST_NAMES);
  const age = randi(10, 18);
  const dobYear = new Date().getFullYear() - age;
  const distIdx = randi(0, DISTRICTS.length - 1);
  return {
    id: crypto.randomUUID(),
    athleteId: makeAthleteId(i + 1),
    name: `${first} ${last}`,
    dob: `${dobYear}-${String(randi(1, 12)).padStart(2, "0")}-${String(randi(1, 28)).padStart(2, "0")}`,
    age,
    gender: Math.random() > 0.5 ? "male" : "female",
    heightCm: randi(140, 185),
    weightKg: randi(35, 78),
    school: rand(SCHOOLS),
    village: rand(VILLAGES),
    district: DISTRICTS[distIdx],
    state: STATES[distIdx],
    parentName: `${rand(FIRST_NAMES)} ${last}`,
    parentPhone: `+91 9${randi(100000000, 999999999)}`,
    medicalConditions: Math.random() > 0.85 ? "Mild asthma" : "",
    createdAt: Date.now() - randi(0, 30) * 86400000,
    syncStatus: Math.random() > 0.7 ? "pending" : "synced",
  };
}

const TYPES: AssessmentType[] = [
  "sprint_30m", "sprint_50m", "broad_jump", "vertical_jump", "shuttle_run", "reaction_test",
];

function makeResult(assessmentId: string, studentId: string): AssessmentResult {
  const base = randi(55, 92);
  const jitter = () => Math.max(30, Math.min(99, base + randi(-12, 12)));
  return {
    id: crypto.randomUUID(),
    assessmentId,
    studentId,
    overall: base,
    metrics: {
      speed: jitter(), strength: jitter(), agility: jitter(),
      power: jitter(), endurance: jitter(), coordination: jitter(),
    },
    nationalPercentile: randi(50, 99),
    districtRank: randi(1, 250),
    recommendedSports: [rand(SPORTS), rand(SPORTS), rand(SPORTS)].filter((v, i, a) => a.indexOf(v) === i),
    strengths: ["Explosive power", "Reaction time", "Lower-body strength"].slice(0, randi(2, 3)),
    improvements: ["Cardiovascular endurance", "Lateral agility", "Core stability"].slice(0, randi(1, 3)),
    createdAt: Date.now() - randi(0, 20) * 86400000,
  };
}

export async function ensureSeed() {
  if (!isBrowser) return;
  const count = await db.students.count();
  if (count > 0) return;

  const students: Student[] = Array.from({ length: 24 }, (_, i) => makeStudent(i));
  await db.students.bulkAdd(students);

  const assessments: Assessment[] = [];
  const results: AssessmentResult[] = [];
  const reports: Report[] = [];
  const syncQ: SyncItem[] = [];

  for (const s of students.slice(0, 18)) {
    const nAssess = randi(1, 3);
    for (let j = 0; j < nAssess; j++) {
      const a: Assessment = {
        id: crypto.randomUUID(),
        studentId: s.id,
        type: rand(TYPES),
        createdAt: Date.now() - randi(0, 25) * 86400000,
        syncStatus: Math.random() > 0.6 ? "pending" : "synced",
      };
      assessments.push(a);
      const r = makeResult(a.id, s.id);
      results.push(r);
      reports.push({
        id: crypto.randomUUID(),
        studentId: s.id,
        resultId: r.id,
        title: `${labelForType(a.type)} — ${s.name}`,
        createdAt: r.createdAt,
      });
      if (a.syncStatus === "pending") {
        syncQ.push({
          id: crypto.randomUUID(),
          kind: "assessment",
          refId: a.id,
          status: "pending",
          attempts: 0,
          createdAt: a.createdAt,
        });
      }
    }
  }
  await db.assessments.bulkAdd(assessments);
  await db.assessment_results.bulkAdd(results);
  await db.reports.bulkAdd(reports);
  await db.sync_queue.bulkAdd(syncQ);

  const notifs: NotificationItem[] = [
    { id: crypto.randomUUID(), title: "Sync recommended", body: "You have pending uploads.", createdAt: Date.now(), read: false },
    { id: crypto.randomUUID(), title: "New guideline", body: "SAI updated shuttle run protocol v2.1.", createdAt: Date.now() - 86400000, read: false },
  ];
  await db.notifications.bulkAdd(notifs);
}

export function labelForType(t: AssessmentType): string {
  switch (t) {
    case "sprint_30m": return "30m Sprint";
    case "sprint_50m": return "50m Sprint";
    case "broad_jump": return "Standing Broad Jump";
    case "vertical_jump": return "Vertical Jump";
    case "shuttle_run": return "4x10m Shuttle Run";
    case "reaction_test": return "Reaction Test";
  }
}
