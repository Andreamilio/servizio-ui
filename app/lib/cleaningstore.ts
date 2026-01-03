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
  stayId?: string; // ID dello stay associato (se presente)
  cleanerName?: string; // Nome del cleaner assegnato (se presente)
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

export function updateJobsCleanerByStay(stayId: string, cleanerName: string | null) {
  for (const job of cleaningStore.values()) {
    if (job.stayId === stayId) {
      cleaningStore.set(job.id, {
        ...job,
        cleanerName: cleanerName?.trim() || undefined,
      });
    }
  }
}

export function listJobsByStay(stayId: string): CleaningJob[] {
  const out: CleaningJob[] = [];
  for (const j of cleaningStore.values()) {
    if (j.stayId === stayId) out.push(j);
  }
  const rank: Record<CleaningStatus, number> = {
    todo: 0,
    in_progress: 1,
    problem: 2,
    done: 3,
  };
  return out.sort((a, b) => rank[a.status] - rank[b.status]);
}

export function canStartJob(j: CleaningJob) {
  return j.status === "todo";
}

export function canCompleteJob(j: CleaningJob) {
  return j.status === "in_progress";
}

export function canReportProblem(j: CleaningJob) {
  return j.status !== "done";
}

export function startJob(id: string) {
  const j = cleaningStore.get(id);
  if (!j) return null;
  if (!canStartJob(j)) return j;
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
  if (!canCompleteJob(j)) return j;
  j.status = "done";
  j.completedAt = Date.now();
  cleaningStore.set(id, j);
  return j;
}

export function markProblem(id: string) {
  const j = cleaningStore.get(id);
  if (!j) return null;
  if (!canReportProblem(j)) return j;
  j.status = "problem";
  cleaningStore.set(id, j);
  return j;
}

export function createCleaningJob(params: {
  aptId: string;
  aptName: string;
  windowFrom: number; // unix ms
  windowTo: number; // unix ms
  notesFromHost?: string;
  checklist?: { id: string; label: string; done: boolean }[];
  stayId?: string; // ID dello stay associato
}): CleaningJob {
  const { aptId, aptName, windowFrom, windowTo, notesFromHost, checklist, stayId } = params;

  // Formatta windowLabel come "HH:mm–HH:mm"
  const formatTime = (ts: number): string => {
    const d = new Date(ts);
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  };

  const windowLabel = `${formatTime(windowFrom)}–${formatTime(windowTo)}`;

  // Checklist di default se non fornita
  const defaultChecklist: { id: string; label: string; done: boolean }[] = [
    { id: "c1", label: "Cucina (piani + lavello)", done: false },
    { id: "c2", label: "Bagno (sanitari + doccia)", done: false },
    { id: "c3", label: "Pavimenti (tutto)", done: false },
    { id: "c4", label: "Letto rifatto + lenzuola", done: false },
    { id: "c5", label: "Foto finali (opzionale)", done: false },
  ];

  const jobId = `job-${aptId}-${Date.now()}`;

  const job: CleaningJob = {
    id: jobId,
    aptId,
    aptName,
    windowLabel,
    status: "todo",
    notesFromHost: notesFromHost || undefined,
    checklist: checklist || defaultChecklist,
    stayId: stayId || undefined,
  };

  cleaningStore.set(jobId, job);
  return job;
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