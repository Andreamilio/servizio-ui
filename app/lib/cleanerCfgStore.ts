// app/lib/cleanerCfgStore.ts
export type CleaningTimeRange = {
  from: string; // HH:mm format, es. "09:00"
  to: string; // HH:mm format, es. "18:00"
};

export type CleanerInfo = {
  name: string;
  phone: string;
};

export type CleanerCfg = {
  cleaners: CleanerInfo[];
  durationMin: number; // durata default pulizia
  cleaningTimeRanges: CleaningTimeRange[]; // range orari disponibili per le pulizie
};

declare global {
  // eslint-disable-next-line no-var
  var __cleanerCfgStore: Map<string, CleanerCfg> | undefined;
}

const cfgStore: Map<string, CleanerCfg> = global.__cleanerCfgStore ?? new Map();
global.__cleanerCfgStore = cfgStore;

function norm(v: string) {
  return v.trim().replace(/\s+/g, " ");
}

export function getCleanerCfg(aptId: string): CleanerCfg {
  const cfg = cfgStore.get(aptId);
  if (!cfg) {
    return { 
      cleaners: [], 
      durationMin: 60,
      cleaningTimeRanges: [{ from: "09:00", to: "18:00" }] // default: 9:00-18:00
    };
  }
  
  // Migrazione legacy: converte stringhe in oggetti CleanerInfo
  const cleaners = cfg.cleaners.map((c) => {
    if (typeof c === 'string') {
      return { name: c, phone: '' };
    }
    return c;
  });
  
  return {
    ...cfg,
    cleaners
  };
}

export function setCleanerDuration(aptId: string, durationMin: number) {
  const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
  const prev = getCleanerCfg(aptId);
  cfgStore.set(aptId, { ...prev, durationMin: clamp(durationMin, 15, 24 * 60) });
}

export function addCleaner(aptId: string, name: string, phone: string) {
  const n = norm(name);
  const p = norm(phone);
  if (!n || !p) return;
  const prev = getCleanerCfg(aptId);
  const newCleaner: CleanerInfo = { name: n, phone: p };
  // Rimuove eventuali cleaner con lo stesso nome e aggiunge quello nuovo
  const next = [...(prev.cleaners ?? []).filter((c) => c.name !== n), newCleaner];
  cfgStore.set(aptId, { ...prev, cleaners: next });
}

export function removeCleaner(aptId: string, name: string) {
  const n = norm(name);
  const prev = getCleanerCfg(aptId);
  cfgStore.set(aptId, { ...prev, cleaners: (prev.cleaners ?? []).filter((c) => c.name !== n) });
}

export function normalizeCleanerName(v: string) {
  return norm(v);
}

export function setCleaningTimeRanges(aptId: string, ranges: CleaningTimeRange[]) {
  const prev = getCleanerCfg(aptId);
  // Validazione: ogni range deve avere from < to in formato HH:mm
  const validRanges = ranges.filter((r) => {
    const fromParts = r.from.split(":");
    const toParts = r.to.split(":");
    if (fromParts.length !== 2 || toParts.length !== 2) return false;
    const fromH = parseInt(fromParts[0], 10);
    const fromM = parseInt(fromParts[1], 10);
    const toH = parseInt(toParts[0], 10);
    const toM = parseInt(toParts[1], 10);
    if (isNaN(fromH) || isNaN(fromM) || isNaN(toH) || isNaN(toM)) return false;
    if (fromH < 0 || fromH > 23 || fromM < 0 || fromM > 59) return false;
    if (toH < 0 || toH > 23 || toM < 0 || toM > 59) return false;
    const fromMin = fromH * 60 + fromM;
    const toMin = toH * 60 + toM;
    return fromMin < toMin;
  });
  cfgStore.set(aptId, { ...prev, cleaningTimeRanges: validRanges });
}