export type CleaningStatus = "todo" | "in_progress" | "done" | "problem";

export type CleaningJob = {
  id: string;
  aptId: string;
  aptName: string;
  windowLabel: string; // es. "10:00–13:00"
  status: CleaningStatus;
  checklist: { id: string; label: string; done: boolean }[];
  startedAt?: number; // unix ms
  completedAt?: number; // unix ms
  stayId?: string; // ID dello stay associato (se presente)
  cleanerName?: string; // Nome del cleaner assegnato (se presente)
  finalPhotos?: string[]; // Array di base64 per foto finali
  problemNote?: string; // Note quando si segnala problema
  problemPhotos?: string[]; // Array di base64 per foto problema
};

declare global {
   
  var __cleaningStore: Map<string, CleaningJob> | undefined;
}

export const cleaningStore: Map<string, CleaningJob> =
  global.__cleaningStore ?? new Map();
global.__cleaningStore = cleaningStore;

// Helper per generare foto placeholder base64 mock
export function generatePlaceholderPhoto(photoNumber?: number): string {
  const num = photoNumber ?? 1;
  // Genera un'immagine SVG placeholder 200x200px con colore grigio e numero foto
  const svg = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="200" fill="#4a5568"/>
    <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#a0aec0" text-anchor="middle" dominant-baseline="middle">Foto ${num}</text>
  </svg>`;
  // Converti SVG in base64
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

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
  if (j.status !== "in_progress") return false;
  
  // Verifica che tutti gli item della checklist siano completati
  const allItemsDone = j.checklist.every((it) => it.done);
  if (!allItemsDone) {
    return false; // Non può completare se ci sono item non completati
  }
  
  // Verifica che ci siano foto finali se checklist "Foto finali" è done
  const photoItem = j.checklist.find((it) => it.label.includes("Foto finali"));
  if (photoItem?.done && (!j.finalPhotos || j.finalPhotos.length === 0)) {
    return false; // Non può completare senza foto finali
  }
  
  return true;
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
  // Non permettere modifiche se il job è completato
  if (j.status === "done") return j;
  j.checklist = j.checklist.map((it) =>
    it.id === itemId ? { ...it, done: !it.done } : it
  );
  cleaningStore.set(id, j);
  return j;
}

export function completeJob(id: string) {
  const j = cleaningStore.get(id);
  if (!j) return null;
  if (!canCompleteJob(j)) return j; // Questo ora include il controllo delle foto finali
  
  j.status = "done";
  j.completedAt = Date.now();
  cleaningStore.set(id, j);
  return j;
}

export function markProblem(id: string, params?: { note?: string; photos?: string[] }) {
  const j = cleaningStore.get(id);
  if (!j) return null;
  // Permetti di segnalare problemi anche se il job è completato
  // (rimuoviamo il controllo canReportProblem per permettere di segnalare problemi anche dopo il completamento)
  j.status = "problem";
  if (params?.note) {
    j.problemNote = params.note;
  }
  if (params?.photos && params.photos.length > 0) {
    j.problemPhotos = params.photos;
  }
  cleaningStore.set(id, j);
  return j;
}

export function resolveProblem(id: string) {
  const j = cleaningStore.get(id);
  if (!j) return null;
  if (j.status !== "problem") return j;
  // Riporta il job allo stato precedente (in_progress se era stato avviato, altrimenti todo)
  j.status = j.startedAt ? "in_progress" : "todo";
  // Opzionalmente, mantieni note e foto problema per storico, oppure rimuovile
  // Per ora le manteniamo per storico
  cleaningStore.set(id, j);
  return j;
}

export function resetJob(id: string) {
  const j = cleaningStore.get(id);
  if (!j) return null;
  // Reset completo del job
  j.status = "todo";
  j.checklist = j.checklist.map((it) => ({ ...it, done: false }));
  j.startedAt = undefined;
  j.completedAt = undefined;
  j.finalPhotos = undefined;
  j.problemNote = undefined;
  j.problemPhotos = undefined;
  cleaningStore.set(id, j);
  return j;
}

export function createCleaningJob(params: {
  aptId: string;
  aptName: string;
  windowFrom: number; // unix ms
  windowTo: number; // unix ms
  checklist?: { id: string; label: string; done: boolean }[];
  stayId?: string; // ID dello stay associato
}): CleaningJob {
  const { aptId, aptName, windowFrom, windowTo, checklist, stayId } = params;

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
    { id: "c5", label: "Foto finali", done: false },
  ];

  const jobId = `job-${aptId}-${Date.now()}`;

  const job: CleaningJob = {
    id: jobId,
    aptId,
    aptName,
    windowLabel,
    status: "todo",
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
    checklist: [
      { id: "c1", label: "Cucina (piani + lavello)", done: false },
      { id: "c2", label: "Bagno (sanitari + doccia)", done: false },
      { id: "c3", label: "Pavimenti (tutto)", done: false },
      { id: "c4", label: "Letto rifatto + lenzuola", done: false },
      { id: "c5", label: "Foto finali", done: false },
    ],
  });

  cleaningStore.set("job-017-2", {
    id: "job-017-2",
    aptId: "017",
    aptName: "Apt 017 — Ufficio (demo)",
    windowLabel: "14:00–16:00",
    status: "done",
    checklist: [
      { id: "d1", label: "Refresh superfici", done: true },
      { id: "d2", label: "Bagno rapido", done: true },
      { id: "d3", label: "Pattumiera", done: true },
      { id: "d4", label: "Foto finali", done: true },
    ],
    startedAt: Date.now() - 2 * 60 * 60 * 1000,
    completedAt: Date.now() - 90 * 60 * 1000,
    finalPhotos: [generatePlaceholderPhoto(1), generatePlaceholderPhoto(2)],
  });
}