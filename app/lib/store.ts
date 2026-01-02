type Role = "host" | "tech" | "guest" | "cleaner";

export type Readiness =
  | "ready"
  | "guest_in_house"
  | "checkout_today"
  | "to_clean"
  | "cleaning_in_progress";

export type Apartment = {
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
}

declare global {
  // eslint-disable-next-line no-var
  var __accessLog: AccessEvent[] | undefined;
}

declare global {
  // eslint-disable-next-line no-var
  var __aptStore: Map<string, Apartment> | undefined;
}

export const pinStore: Map<string, PinRecord> = global.__pinStore ?? new Map();
global.__pinStore = pinStore;

export const aptStore: Map<string, Apartment> =
  global.__aptStore ?? new Map();
global.__aptStore = aptStore;

export const accessLog: AccessEvent[] = global.__accessLog ?? [];
global.__accessLog = accessLog;

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

export function listApartments() {
  return Array.from(aptStore.values());
}

export function getApartment(aptId: string) {
  return aptStore.get(aptId) ?? null;
}

export function setReadiness(aptId: string, readiness: Readiness) {
  const apt = aptStore.get(aptId);
  if (!apt) return null;
  apt.readiness = readiness;
  aptStore.set(aptId, apt);
  return apt;
}

export function listAccessLogByApt(aptId: string, limit = 10) {
  return accessLog.filter((e) => e.aptId === aptId).slice(0, limit);
}

export function logAccessEvent(
  aptId: string,
  type: AccessEventType,
  label: string
) {
  accessLog.unshift({
    id: crypto.randomUUID(),
    aptId,
    type,
    label,
    ts: Date.now(),
  });
}

// DEV SEED (solo per iniziare). In produzione rimuovere.
if (process.env.NODE_ENV !== "production" && pinStore.size === 0) {
  aptStore.set("017", {
    aptId: "017",
    name: "Apt 017 — Demo",
    readiness: "ready",
  });
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
