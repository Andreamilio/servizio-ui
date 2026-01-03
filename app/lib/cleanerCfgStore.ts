// app/lib/cleanerCfgStore.ts
export type CleanerCfg = {
  cleaners: string[];
  durationMin: number; // durata default pulizia
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
  return cfgStore.get(aptId) ?? { cleaners: [], durationMin: 60 };
}

export function setCleanerDuration(aptId: string, durationMin: number) {
  const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
  const prev = getCleanerCfg(aptId);
  cfgStore.set(aptId, { ...prev, durationMin: clamp(durationMin, 15, 24 * 60) });
}

export function addCleaner(aptId: string, name: string) {
  const n = norm(name);
  if (!n) return;
  const prev = getCleanerCfg(aptId);
  const next = Array.from(new Set([...(prev.cleaners ?? []), n]));
  cfgStore.set(aptId, { ...prev, cleaners: next });
}

export function removeCleaner(aptId: string, name: string) {
  const n = norm(name);
  const prev = getCleanerCfg(aptId);
  cfgStore.set(aptId, { ...prev, cleaners: (prev.cleaners ?? []).filter((x) => x !== n) });
}

export function normalizeCleanerName(v: string) {
  return norm(v);
}