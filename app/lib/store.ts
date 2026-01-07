// app/lib/store.ts
// Single source of truth for:
// - STAYS: delegated to staysStore.ts (V2)
// - PINS + AccessLog + Readiness: kept here (in-memory)

import crypto from "crypto";
import {
  listApartments as listClientApartments,
  getApartment as getClientApartment,
} from "./clientStore";

import {
  type Stay,
  type StayGuest,
  createStay as createStayV2,
  getStay as getStayV2,
  listStaysByApt as listStaysByAptV2,
  setStayGuestNames as setStayGuestNamesV2,
  deleteStay as deleteStayV2,
} from "./staysStore";

import { getCleanerCfg, normalizeCleanerName } from "./cleanerCfgStore";
import { createCleaningJob } from "./cleaningstore";

export type Role = "host" | "tech" | "guest" | "cleaner";
export type PinSource = "auto" | "manual";

export type PinRecord = {
  pin: string;
  role: Role;
  aptId: string;

  validFrom: number; // unix ms
  validTo: number; // unix ms
  expiresAt?: number; // legacy alias

  stayId: string;
  guestId: string;
  guestName?: string;

  source: PinSource;
  createdAt: number;
};

export type Readiness =
  | "ready"
  | "guest_in_house"
  | "checkout_today"
  | "to_clean"
  | "cleaning_in_progress";

export type AptReadiness = {
  aptId: string;
  name: string;
  readiness: Readiness;
};

export type AccessEventType =
  | "guest_access_ok"
  | "guest_access_ko"
  | "cleaner_access_ok"
  | "pin_created"
  | "pin_revoked"
  | "cleaning_done"
  | "problem_reported"
  | "door_opened"
  | "door_closed"
  | "gate_opened"
  | "wan_switched"
  | "vpn_toggled"
  | "stay_created"
  | "stay_deleted"
  | "stay_guests_updated";

export type AccessEvent = {
  id: string;
  aptId: string;
  type: AccessEventType;
  label: string;
  ts: number;
};

declare global {
   
  var __pinStore: Map<string, PinRecord> | undefined;
   
  var __accessLog: AccessEvent[] | undefined;
   
  var __readinessStore: Map<string, Readiness> | undefined;
}

export const pinStore: Map<string, PinRecord> = global.__pinStore ?? new Map();
global.__pinStore = pinStore;

export const accessLog: AccessEvent[] = global.__accessLog ?? [];
global.__accessLog = accessLog;

export const readinessStore: Map<string, Readiness> =
  global.__readinessStore ?? new Map();
global.__readinessStore = readinessStore;

/* ----------------------------------------
 * STAYS (delegated to staysStore.ts)
 * ------------------------------------- */

export type { Stay, StayGuest };

export function createStay(input: {
  aptId: string;
  checkInAt: number;
  checkOutAt: number;
  guests: { name: string }[];
  createdBy?: "host" | "system";
}): Stay {
  const st = createStayV2({
    aptId: input.aptId,
    checkInAt: input.checkInAt,
    checkOutAt: input.checkOutAt,
    guests: input.guests,
    createdBy: input.createdBy ?? "host",
  });
  logAccessEvent(input.aptId, "stay_created", `Stay creato (${st.stayId.slice(0, 8)}…)`);
  return st;
}

export function getStay(stayId: string): Stay | null {
  return getStayV2(stayId);
}

export function listStaysByApt(aptId: string): Stay[] {
  return listStaysByAptV2(aptId);
}

export function setStayGuestNames(stayId: string, names: string[]) {
  const st = getStayV2(stayId);
  const out = setStayGuestNamesV2(stayId, names);
  if (st?.aptId) {
    logAccessEvent(st.aptId, "stay_guests_updated", `Ospiti aggiornati (${stayId.slice(0, 8)}…)`);
  }
  return out;
}

/**
 * Delete stay + revoke pins linked to it (clean)
 */
export function deleteStay(stayId: string) {
  const st = getStayV2(stayId);
  try {
    revokePinsByStay(stayId);
  } catch {}
  const out = deleteStayV2(stayId);
  if (st?.aptId) {
    logAccessEvent(st.aptId, "stay_deleted", `Stay eliminato (${stayId.slice(0, 8)}…)`);
  }
  return out;
}

/**
 * Source of truth for “current stay”:
 * - active if now in [checkInAt, checkOutAt)
 * - else upcoming nearest future
 * - else most recent past
 */
export function getCurrentStayForApt(aptId: string): Stay | null {
  const now = Date.now();
  const stays = listStaysByAptV2(aptId);
  if (stays.length === 0) return null;

  const active = stays.find((s) => now >= s.checkInAt && now < s.checkOutAt);
  if (active) return active;

  const upcoming = stays
    .filter((s) => s.checkInAt > now)
    .sort((a, b) => a.checkInAt - b.checkInAt)[0];
  if (upcoming) return upcoming;

  // past: return the most recent by checkOutAt/checkInAt
  return stays.sort((a, b) => (b.checkOutAt ?? b.checkInAt) - (a.checkOutAt ?? a.checkInAt))[0];
}

export function getOrCreateCurrentStayForApt(aptId: string): Stay {
  return getCurrentStayForApt(aptId) ?? ensureAdHocStayForApt(aptId);
}

function ensureAdHocStayForApt(aptId: string): Stay {
  const now = Date.now();
  return createStayV2({
    aptId,
    checkInAt: now - 60 * 60_000,
    checkOutAt: now + 6 * 60 * 60_000,
    guests: [{ name: "Ospite 1" }],
    createdBy: "host",
  });
}

/* ----------------------------------------
 * PINS
 * ------------------------------------- */

function gen6Digits(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function createPin(role: Role, aptId: string, ttlMinutes: number) {
  const stay = getOrCreateCurrentStayForApt(aptId);
  const guest0 = stay.guests[0] ?? { guestId: `g-${crypto.randomUUID()}`, name: "Ospite 1" };

  return createPinForGuest({
    role,
    aptId,
    stayId: stay.stayId,
    guestId: guest0.guestId,
    guestName: guest0.name,
    validFrom: Date.now(),
    validTo: Date.now() + ttlMinutes * 60_000,
    source: "manual",
  });
}

export function createPinForGuest(input: {
  role: Role;
  aptId: string;
  stayId: string;
  guestId: string;
  guestName?: string;
  validFrom: number;
  validTo: number;
  source: PinSource;
}): PinRecord {
  const now = Date.now();

  const rec: PinRecord = {
    pin: gen6Digits(),
    role: input.role,
    aptId: input.aptId,
    validFrom: input.validFrom,
    validTo: input.validTo,
    expiresAt: input.validTo,
    stayId: input.stayId,
    guestId: input.guestId,
    guestName: input.guestName?.trim() || undefined,
    source: input.source,
    createdAt: now,
  };

  pinStore.set(rec.pin, rec);

  accessLog.unshift({
    id: crypto.randomUUID(),
    aptId: input.aptId,
    type: "pin_created",
    label: `PIN ${input.role} creato (${input.source})`,
    ts: now,
  });

  return rec;
}

export function createPinsForStayGuests(input: {
  aptId: string;
  stayId: string;
  role: Role;
  validFrom: number;
  validTo: number;
  source: PinSource;
  guestNames?: string[];
  guestIds?: string[];
}): PinRecord[] {
  const st = getStayV2(input.stayId);
  if (!st) return [];

  if (input.guestNames?.length) {
    setStayGuestNamesV2(input.stayId, input.guestNames);
  }

  const refreshed = getStayV2(input.stayId)!;
  const targets =
    input.guestIds?.length
      ? refreshed.guests.filter((g) => input.guestIds!.includes(g.guestId))
      : refreshed.guests;

  return targets.map((g) =>
    createPinForGuest({
      role: input.role,
      aptId: input.aptId,
      stayId: input.stayId,
      guestId: g.guestId,
      guestName: g.name,
      validFrom: input.validFrom,
      validTo: input.validTo,
      source: input.source,
    })
  );
}

export function listPinsByStay(stayId: string): PinRecord[] {
  return Array.from(pinStore.values())
    .filter((p) => p.stayId === stayId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function listPinsByApt(aptId: string): PinRecord[] {
  return Array.from(pinStore.values())
    .filter((p) => p.aptId === aptId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function getPin(pin: string): PinRecord | null {
  return pinStore.get(pin) ?? null;
}

export function revokePin(pin: string) {
  const rec = pinStore.get(pin);
  if (!rec) return false;
  pinStore.delete(pin);

  accessLog.unshift({
    id: crypto.randomUUID(),
    aptId: rec.aptId,
    type: "pin_revoked",
    label: `PIN ${rec.role} revocato`,
    ts: Date.now(),
  });

  return true;
}

export function revokePinsByStay(stayId: string) {
  const toDelete = listPinsByStay(stayId).map((p) => p.pin);
  let aptId: string | null = null;

  for (const p of toDelete) {
    const rec = pinStore.get(p);
    if (!aptId && rec?.aptId) aptId = rec.aptId;
    pinStore.delete(p);
  }

  accessLog.unshift({
    id: crypto.randomUUID(),
    aptId: aptId ?? "-",
    type: "pin_revoked",
    label: `Revocati ${toDelete.length} PIN dello stay`,
    ts: Date.now(),
  });

  return toDelete.length;
}

export function revokePinsByApt(aptId: string) {
  const toDelete = listPinsByApt(aptId).map((p) => p.pin);
  for (const p of toDelete) pinStore.delete(p);

  accessLog.unshift({
    id: crypto.randomUUID(),
    aptId,
    type: "pin_revoked",
    label: `Revocati ${toDelete.length} PIN attivi`,
    ts: Date.now(),
  });

  return toDelete.length;
}

export function consumePin(pin: string) {
  const rec = pinStore.get(pin);
  if (!rec) return null;

  const now = Date.now();
  const from = rec.validFrom ?? rec.createdAt;
  const to = rec.validTo ?? rec.expiresAt ?? rec.createdAt;

  if (now < from || now > to) {
    if (now > to) pinStore.delete(pin);
    return null;
  }
  return rec;
}

/* ----------------------------------------
 * CLEANER PIN (1 per stay)
 * ------------------------------------- */

export function revokeCleanerPinsByStay(stayId: string): number {
  const pins = listPinsByStay(stayId).filter((p) => p.role === "cleaner");
  for (const p of pins) pinStore.delete(p.pin);

  if (pins.length) {
    accessLog.unshift({
      id: crypto.randomUUID(),
      aptId: pins[0]?.aptId ?? "-",
      type: "pin_revoked",
      label: `Revocati ${pins.length} PIN cleaner dello stay`,
      ts: Date.now(),
    });
  }
  return pins.length;
}

export function createCleanerPinForStay(input: {
  aptId: string;
  stayId: string;
  cleanerName: string;
  cleaningDurationMinutes?: number; // override
  source?: PinSource; // default "auto"
}): PinRecord | null {
  const st = getStayV2(input.stayId);
  if (!st) return null;

  revokeCleanerPinsByStay(input.stayId);

  const nm = normalizeCleanerName(input.cleanerName ?? "");
  if (!nm) return null;

  const cfg = getCleanerCfg(st.aptId);
  const dur =
    Number.isFinite(Number(input.cleaningDurationMinutes))
      ? Math.max(15, Math.min(24 * 60, Math.round(Number(input.cleaningDurationMinutes))))
      : Math.max(15, Math.min(24 * 60, Math.round(cfg.durationMin ?? 60)));

  // Calcola il primo slot disponibile nel range orario
  const calculateCleaningSlot = (checkOutAt: number, ranges: Array<{ from: string; to: string }>, durationMin: number): { from: number; to: number } => {
    if (!ranges || ranges.length === 0) {
      // Nessun range configurato, usa il check-out come prima
      return { from: checkOutAt, to: checkOutAt + durationMin * 60_000 };
    }

    const checkoutDate = new Date(checkOutAt);
    const checkoutHour = checkoutDate.getHours();
    const checkoutMin = checkoutDate.getMinutes();
    const checkoutMinOfDay = checkoutHour * 60 + checkoutMin;

    // Funzione helper per convertire HH:mm in minuti del giorno
    const timeToMinutes = (timeStr: string): number => {
      const [h, m] = timeStr.split(":").map(Number);
      return h * 60 + m;
    };

    // Cerca il primo range disponibile (stesso giorno o giorno successivo)
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      for (const range of ranges) {
        const rangeFrom = timeToMinutes(range.from);
        const rangeTo = timeToMinutes(range.to);
        
        // Calcola la data del range (checkout + dayOffset giorni)
        const rangeDate = new Date(checkoutDate);
        rangeDate.setDate(rangeDate.getDate() + dayOffset);
        rangeDate.setHours(0, 0, 0, 0);
        
        const rangeStart = rangeDate.getTime() + rangeFrom * 60_000;
        const rangeEnd = rangeDate.getTime() + rangeTo * 60_000;
        
        // Se siamo nel primo giorno, verifica se il checkout è già dentro il range
        if (dayOffset === 0) {
          if (checkoutMinOfDay >= rangeFrom && checkoutMinOfDay < rangeTo) {
            // Checkout è dentro il range, inizia subito
            const cleaningStart = checkOutAt;
            const cleaningEnd = Math.min(cleaningStart + durationMin * 60_000, rangeEnd);
            return { from: cleaningStart, to: cleaningEnd };
          }
        }
        
        // Se il range inizia dopo il checkout (o è un giorno successivo), usa l'inizio del range
        if (rangeStart >= checkOutAt) {
          const cleaningStart = rangeStart;
          const cleaningEnd = Math.min(cleaningStart + durationMin * 60_000, rangeEnd);
          return { from: cleaningStart, to: cleaningEnd };
        }
      }
    }
    
    // Fallback: usa il check-out se nessun range è disponibile
    return { from: checkOutAt, to: checkOutAt + durationMin * 60_000 };
  };

  const slot = calculateCleaningSlot(st.checkOutAt, cfg.cleaningTimeRanges ?? [], dur);
  const from = slot.from;
  const to = slot.to;

  const g0 = st.guests[0] ?? { guestId: `g-${crypto.randomUUID()}`, name: "Ospite 1" };

  const pin = createPinForGuest({
    role: "cleaner",
    aptId: input.aptId,
    stayId: input.stayId,
    guestId: g0.guestId,
    guestName: nm,
    validFrom: from,
    validTo: to,
    source: input.source ?? "auto",
  });

  // Crea automaticamente un job di pulizia con gli stessi orari del PIN (solo se source è "auto")
  if (pin && (input.source === "auto" || !input.source)) {
    // Recupera il nome dell'appartamento
    const apt = getClientApartment(input.aptId);
    const aptName = apt?.name ?? `Apt ${input.aptId}`;

    createCleaningJob({
      aptId: input.aptId,
      aptName,
      windowFrom: from,
      windowTo: to,
      stayId: input.stayId,
    });
  }

  return pin;
}

/* ----------------------------------------
 * READINESS (joined with clientStore)
 * ------------------------------------- */

function fallbackName(aptId: string) {
  return `Apt ${aptId}`;
}

export function listApartments(): AptReadiness[] {
  const apts = listClientApartments();
  return apts.map((a) => ({
    aptId: a.aptId,
    name: a.name ?? fallbackName(a.aptId),
    readiness: readinessStore.get(a.aptId) ?? "ready",
  }));
}

export function getApartment(aptId: string): AptReadiness | null {
  const a = getClientApartment(aptId);
  if (!a) return null;
  return {
    aptId: a.aptId,
    name: a.name ?? fallbackName(a.aptId),
    readiness: readinessStore.get(a.aptId) ?? "ready",
  };
}

export function setReadiness(aptId: string, readiness: Readiness) {
  const a = getClientApartment(aptId);
  if (!a) return null;

  readinessStore.set(aptId, readiness);

  return {
    aptId,
    name: a.name ?? fallbackName(aptId),
    readiness,
  } satisfies AptReadiness;
}

/* ----------------------------------------
 * ACCESS LOG
 * ------------------------------------- */

export function listAccessLogByApt(aptId: string, limit = 10) {
  return accessLog.filter((e) => e.aptId === aptId).slice(0, limit);
}

export function logAccessEvent(aptId: string, type: AccessEventType, label: string) {
  accessLog.unshift({
    id: crypto.randomUUID(),
    aptId,
    type,
    label,
    ts: Date.now(),
  });
}

/* ----------------------------------------
 * DEV SEED (optional)
 * ------------------------------------- */

if ((process.env.NODE_ENV !== "production" || process.env.DEMO_MODE === "1") && pinStore.size === 0) {
  // readiness seed (aligned to clientstore demo apts 101–106)
  if (getClientApartment("101")) readinessStore.set("101", "ready");
  if (getClientApartment("102")) readinessStore.set("102", "to_clean");
  if (getClientApartment("103")) readinessStore.set("103", "checkout_today");
  if (getClientApartment("104")) readinessStore.set("104", "ready");
  if (getClientApartment("105")) readinessStore.set("105", "to_clean");
  if (getClientApartment("106")) readinessStore.set("106", "ready");

  // demo stay + demo pins ONLY once (uses staysStore V2)
  const now = Date.now();
  const st = createStayV2({
    aptId: "101",
    checkInAt: now - 2 * 60 * 60_000,
    checkOutAt: now + 24 * 60 * 60_000,
    guests: [{ name: "Giulia" }, { name: "Marco" }, { name: "Sara" }],
    createdBy: "system",
  });

  const mk = (
    pin: string,
    role: Role,
    guestId: string,
    guestName?: string,
    source: PinSource = "manual"
  ): PinRecord => ({
    pin,
    role,
    aptId: "101",
    validFrom: now - 60_000,
    validTo: now + 9999 * 60_000,
    expiresAt: now + 9999 * 60_000,
    stayId: st.stayId,
    guestId,
    guestName,
    source,
    createdAt: now,
  });

  pinStore.set(
    "111111",
    mk("111111", "host", st.guests[0].guestId, st.guests[0].name, "manual")
  );
  pinStore.set(
    "222222",
    mk("222222", "tech", st.guests[0].guestId, st.guests[0].name, "manual")
  );
  pinStore.set(
    "333333",
    mk("333333", "guest", st.guests[1].guestId, st.guests[1].name, "auto")
  );
}