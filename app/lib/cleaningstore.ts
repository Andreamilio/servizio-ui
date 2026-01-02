export type CleaningStatus = "todo" | "in_progress" | "done" | "problem";

export type CleaningJob = {
  id: string;
  aptId: string;
  aptName: string;
  windowLabel: string; // es. "10:00–13:00"
  status: CleaningStatus;
  notesFromHost?: string;
  checklist: { id: string; label: string; done: boolean }[];
  startedAt?: number; // unix ms
  completedAt?: number; // unix ms
};

declare global {
  // eslint-disable-next-line no-var
  var __cleaningStore: Map<string, CleaningJob> | undefined;
}

export const cleaningStore: Map<string, CleaningJob> =
  global.__cleaningStore ?? new Map();
global.__cleaningStore = cleaningStore;

// --- helpers
export function listJobsByApt(aptId: string) {
  const out: CleaningJob[] = [];
  for (const j of cleaningStore.values()) {
    if (j.aptId === aptId) out.push(j);
  }
  const rank: Record<CleaningStatus, number> = {
    todo: 0,
    in_progress: 1,
    problem: 2,
    done: 3,
  };
  return out.sort((a, b) => rank[a.status] - rank[b.status]);
}

export function getJob(id: string) {
  return cleaningStore.get(id) ?? null;
}

export function startJob(id: string) {
  const j = cleaningStore.get(id);
  if (!j) return null;
  if (j.status === "done") return j;
  j.status = "in_progress";
  j.startedAt = j.startedAt ?? Date.now();
  cleaningStore.set(id, j);
  return j;
}

export function toggleChecklist(id: string, itemId: string) {
  const j = cleaningStore.get(id);
  if (!j) return null;
  j.checklist = j.checklist.map((it) =>
    it.id === itemId ? { ...it, done: !it.done } : it
  );
  cleaningStore.set(id, j);
  return j;
}

export function completeJob(id: string) {
  const j = cleaningStore.get(id);
  if (!j) return null;
  j.status = "done";
  j.completedAt = Date.now();
  cleaningStore.set(id, j);
  return j;
}

export function markProblem(id: string) {
  const j = cleaningStore.get(id);
  if (!j) return null;
  j.status = "problem";
  cleaningStore.set(id, j);
  return j;
}

// DEV SEED (per prototipo)
if (cleaningStore.size === 0) {
  cleaningStore.set("job-017-1", {
    id: "job-017-1",
    aptId: "017",
    aptName: "Apt 017 — Ufficio (demo)",
    windowLabel: "10:00–13:00",
    status: "todo",
    notesFromHost: "Controlla cucina + bagno, lascia 2 asciugamani extra.",
    checklist: [
      { id: "c1", label: "Cucina (piani + lavello)", done: false },
      { id: "c2", label: "Bagno (sanitari + doccia)", done: false },
      { id: "c3", label: "Pavimenti (tutto)", done: false },
      { id: "c4", label: "Letto rifatto + lenzuola", done: false },
      { id: "c5", label: "Foto finali (opzionale)", done: false },
    ],
  });

  cleaningStore.set("job-017-2", {
    id: "job-017-2",
    aptId: "017",
    aptName: "Apt 017 — Ufficio (demo)",
    windowLabel: "14:00–16:00",
    status: "done",
    notesFromHost: "Solo refresh veloce, ospite tranquillo.",
    checklist: [
      { id: "d1", label: "Refresh superfici", done: true },
      { id: "d2", label: "Bagno rapido", done: true },
      { id: "d3", label: "Pattumiera", done: true },
    ],
    startedAt: Date.now() - 2 * 60 * 60 * 1000,
    completedAt: Date.now() - 90 * 60 * 1000,
  });
}