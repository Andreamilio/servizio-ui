// app/lib/domain/cleanersDomain.ts
import {
  getCleanerCfg,
  setCleanerDuration,
  addCleaner,
  removeCleaner,
  normalizeCleanerName,
  setCleaningTimeRanges,
  type CleanerCfg,
  type CleaningTimeRange,
} from "@/app/lib/cleanerCfgStore";

export function cleaners_getCfg(aptId: string): CleanerCfg {
  return getCleanerCfg(aptId);
}

export function cleaners_setDuration(aptId: string, durationMin: number) {
  if (!aptId) return;
  setCleanerDuration(aptId, durationMin);
}

export function cleaners_add(aptId: string, name: string, phone: string) {
  if (!aptId) return;
  addCleaner(aptId, name, phone);
}

export function cleaners_remove(aptId: string, name: string) {
  if (!aptId) return;
  removeCleaner(aptId, name);
}

export function cleaners_normName(name: string) {
  return normalizeCleanerName(name);
}

export function cleaners_setTimeRanges(aptId: string, ranges: CleaningTimeRange[]) {
  if (!aptId) return;
  setCleaningTimeRanges(aptId, ranges);
}