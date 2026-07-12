import { seedDb } from "./seed";

/**
 * Temporary data layer: a single versioned JSON blob in localStorage.
 * The async signatures mirror a future Supabase adapter, so entity fetchers
 * won't change when the backend lands. Not for production PII.
 * Bump the key version whenever the seed shape changes — old blobs are stale.
 */
const STORAGE_KEY = "radar.db.v10";
const LEGACY_KEYS = [
  "radar.db.v1",
  "radar.db.v2",
  "radar.db.v3",
  "radar.db.v4",
  "radar.db.v5",
  "radar.db.v6",
  "radar.db.v7",
  "radar.db.v8",
  "radar.db.v9",
];

export type Collection =
  | "profiles"
  | "groups"
  | "students"
  | "attendanceSessions"
  | "attendanceRecords"
  | "schoolEvents"
  | "subjects"
  | "assignments"
  | "evaluations"
  | "evaluationGrades"
  | "enrollments"
  | "events"
  | "eventParticipations";

// Partial: a seed or a persisted blob may predate a collection (light migration),
// and readCollection/mutateCollection already fall back to [] for missing keys.
export type Db = Partial<Record<Collection, unknown[]>>;

let memory: Db | null = null;

function hasLocalStorage(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

function load(): Db {
  if (hasLocalStorage()) {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as Db;
      } catch {
        // Corrupt blob — fall through and reseed.
      }
    }
    for (const legacyKey of LEGACY_KEYS) window.localStorage.removeItem(legacyKey);
    const seeded = seedDb();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
  if (!memory) memory = seedDb();
  return memory;
}

function persist(db: Db): void {
  if (hasLocalStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } else {
    memory = db;
  }
}

export async function readCollection<T>(name: Collection): Promise<T[]> {
  return ((load()[name] ?? []) as T[]).map((row) => ({ ...row }));
}

export async function mutateCollection<T>(
  name: Collection,
  transform: (rows: T[]) => T[],
): Promise<T[]> {
  const db = load();
  const next = transform((db[name] ?? []) as T[]);
  persist({ ...db, [name]: next });
  return next.map((row) => ({ ...row }));
}

export async function resetDb(): Promise<void> {
  memory = null;
  if (hasLocalStorage()) window.localStorage.removeItem(STORAGE_KEY);
}
