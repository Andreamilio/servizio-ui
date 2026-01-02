// app/lib/store.ts
// PIN + AccessLog + Readiness (mock in-memory).
// IMPORTANT: the apartments list (names, client grouping, etc.) comes from clientStore.

import crypto from "crypto";
import {
  listApartments as listClientApartments,
  getApartment as getClientApartment,
} from "./clientStore";

type Role = "host" | "tech" | "guest" | "cleaner";

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

export type PinRecord = {
  pin: string;
  role: Role;
  aptId: string;
  expiresAt: number; // unix ms
  createdAt: number;
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
  | "door_closed";

export type AccessEvent = {
  id: string;
  aptId: string;
  type: AccessEventType;
  label: string;
  ts: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __pinStore: Map<string, PinRecord> | undefined;
  // eslint-disable-next-line no-var
  var __accessLog: AccessEvent[] | undefined;
  // eslint-disable-next-line no-var
  var __readinessStore: Map<string, Readiness> | undefined;
}

export const pinStore: Map<string, PinRecord> = global.__pinStore ?? new Map();
global.__pinStore = pinStore;

export const accessLog: AccessEvent[] = global.__accessLog ?? [];
global.__accessLog = accessLog;

// readiness keyed by aptId (source-of-truth for apt names is clientStore)
export const readinessStore: Map<string, Readiness> =
  global.__readinessStore ?? new Map();
global.__readinessStore = readinessStore;

/* ----------------------------------------
 * PINS
 * ------------------------------------- */

export function createPin(role: Role, aptId: string, ttlMinutes: number) {
  const pin = String(Math.floor(100000 + Math.random() * 900000)); // 6 cifre
  const now = Date.now();
  const rec: PinRecord = {
    pin,
    role,
    aptId,
    expiresAt: now + ttlMinutes * 60_000,
    createdAt: now,
  };
  pinStore.set(pin, rec);
  accessLog.unshift({
    id: crypto.randomUUID(),
    aptId,
    type: "pin_created",
    label: `PIN ${role} creato`,
    ts: now,
  });
  return rec;
}

export function consumePin(pin: string) {
  const rec = pinStore.get(pin);
  if (!rec) return null;
  if (Date.now() > rec.expiresAt) {
    pinStore.delete(pin);
    return null;
  }
  return rec;
}

export function listPinsByApt(aptId: string) {
  const out: PinRecord[] = [];
  for (const rec of pinStore.values()) {
    if (rec.aptId === aptId) out.push(rec);
  }
  return out.sort((a, b) => b.createdAt - a.createdAt);
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

export function revokePinsByApt(aptId: string) {
  const toDelete: string[] = [];
  for (const rec of pinStore.values()) {
    if (rec.aptId === aptId) toDelete.push(rec.pin);
  }
  for (const p of toDelete) {
    pinStore.delete(p);
  }

  accessLog.unshift({
    id: crypto.randomUUID(),
    aptId,
    type: "pin_revoked",
    label: `Revocati ${toDelete.length} PIN attivi`,
    ts: Date.now(),
  });

  return toDelete.length;
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
  // Only allow if the apartment exists in clientStore
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
 * DEV SEED
 * ------------------------------------- */

// NOTE: apartments are seeded in clientStore. Here we only seed readiness + demo PINs.
if (process.env.NODE_ENV !== "production" && pinStore.size === 0) {
  // readiness seeds (if those apartments exist in clientStore)
  if (getClientApartment("017")) readinessStore.set("017", "ready");
  if (getClientApartment("018")) readinessStore.set("018", "to_clean");
  if (getClientApartment("019")) readinessStore.set("019", "checkout_today");

  pinStore.set("111111", {
    pin: "111111",
    role: "host",
    aptId: "017",
    expiresAt: Date.now() + 9999 * 60_000,
    createdAt: Date.now(),
  });
  pinStore.set("222222", {
    pin: "222222",
    role: "tech",
    aptId: "017",
    expiresAt: Date.now() + 9999 * 60_000,
    createdAt: Date.now(),
  });
  pinStore.set("333333", {
    pin: "333333",
    role: "guest",
    aptId: "017",
    expiresAt: Date.now() + 9999 * 60_000,
    createdAt: Date.now(),
  });
  pinStore.set("444444", {
    pin: "444444",
    role: "cleaner",
    aptId: "017",
    expiresAt: Date.now() + 9999 * 60_000,
    createdAt: Date.now(),
  });
}
