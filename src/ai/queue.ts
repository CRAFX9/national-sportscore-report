// Offline processing queue. Jobs persist in IndexedDB and resume on next launch.
import { db, isBrowser } from "@/lib/db";
import type { RunInput } from "./pipeline";
import { runPipeline } from "./pipeline";
import type { AIReport } from "./types";

// Attach a table lazily so we don't break the existing db version.
interface QueueRow {
  id: string;
  input: Omit<RunInput, "onProgress" | "seenHashes">;
  status: "pending" | "running" | "done" | "error";
  createdAt: number;
  error?: string;
  reportId?: string;
}

const KEY = "ai_processing_queue_v1";

function load(): QueueRow[] {
  if (!isBrowser) return [];
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}
function save(rows: QueueRow[]) {
  if (!isBrowser) return;
  localStorage.setItem(KEY, JSON.stringify(rows));
}

export function enqueueJob(input: RunInput): string {
  const id = crypto.randomUUID();
  const rows = load();
  const { onProgress: _o, seenHashes: _s, ...persist } = input;
  void _o; void _s;
  rows.push({ id, input: persist, status: "pending", createdAt: Date.now() });
  save(rows);
  return id;
}

export function listJobs(): QueueRow[] { return load(); }

export async function resumePendingJobs(onReport?: (r: AIReport) => void): Promise<void> {
  const rows = load();
  for (const row of rows) {
    if (row.status !== "pending" && row.status !== "error") continue;
    row.status = "running"; save(rows);
    try {
      const report = await runPipeline(row.input as RunInput);
      row.status = "done"; row.reportId = report.athleteId + ":" + report.createdAt;
      save(rows);
      onReport?.(report);
    } catch (e) {
      row.status = "error"; row.error = e instanceof Error ? e.message : String(e);
      save(rows);
    }
  }
  void db; // reserved for future Dexie-backed queue
}
