// app/lib/staysStore.ts
import crypto from "crypto";

export type StayGuest = { guestId: string; name: string };

export type Stay = {
  stayId: string;
  aptId: string;
  checkInAt: number;
  checkOutAt: number;
  guests: StayGuest[];
  createdBy?: "host" | "system";
  createdAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __stayStoreV2: Map<string, Stay> | undefined;
}

const stayStore: Map<string, Stay> = global.__stayStoreV2 ?? new Map();
global.__stayStoreV2 = stayStore;

function gid() {
  return `g-${Math.random().toString(16).slice(2, 10)}`;
}

function sid() {
  return `stay-${crypto.randomUUID()}`;
}

export function createStay(args: {
  aptId: string;
  checkInAt: number;
  checkOutAt: number;
  guests: { name: string }[];
  createdBy?: "host" | "system";
}): Stay {
  const now = Date.now();
  const stayId = sid();

  const guests: StayGuest[] = (args.guests ?? []).map((g) => ({
    guestId: gid(),
    name: g.name,
  }));

  const st: Stay = {
    stayId,
    aptId: args.aptId,
    checkInAt: args.checkInAt,
    checkOutAt: args.checkOutAt,
    guests,
    createdBy: args.createdBy ?? "host",
    createdAt: now,
  };

  stayStore.set(stayId, st);
  return st;
}

export function getStay(stayId: string): Stay | null {
  return stayStore.get(stayId) ?? null;
}

export function deleteStay(stayId: string) {
  stayStore.delete(stayId);
}

export function listStaysByApt(aptId: string): Stay[] {
  return Array.from(stayStore.values())
    .filter((s) => s.aptId === aptId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function setStayGuestNames(stayId: string, names: string[]) {
  const st = stayStore.get(stayId);
  if (!st) return;

  const nextGuests = st.guests.map((g, i) => ({
    ...g,
    name: (names[i] ?? g.name).trim() || g.name,
  }));

  stayStore.set(stayId, { ...st, guests: nextGuests });
}