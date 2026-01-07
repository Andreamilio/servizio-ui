// app/lib/staysStore.ts
import crypto from "crypto";

export type StayGuest = {
  guestId: string;
  name: string; // Nome completo (per retrocompatibilità)
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
};

export type Stay = {
  stayId: string;
  aptId: string;
  checkInAt: number;
  checkOutAt: number;
  guests: StayGuest[];
  cleanerName?: string; // Cleaner assegnato allo stay (persistente, indipendente dai PIN)
  createdBy?: "host" | "system";
  createdAt: number;
};

declare global {
   
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
  guests: Array<{
    name?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
  }>;
  cleanerName?: string;
  createdBy?: "host" | "system";
}): Stay {
  const now = Date.now();
  const stayId = sid();

  const guests: StayGuest[] = (args.guests ?? []).map((g) => {
    const firstName = (g.firstName ?? "").trim();
    const lastName = (g.lastName ?? "").trim();
    const fullName = firstName && lastName 
      ? `${firstName} ${lastName}` 
      : ((g.name ?? `${firstName}${lastName}`) || "Ospite");
    
    return {
      guestId: gid(),
      name: fullName,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      phone: (g.phone ?? "").trim() || undefined,
      email: (g.email ?? "").trim() || undefined,
    };
  });

  const st: Stay = {
    stayId,
    aptId: args.aptId,
    checkInAt: args.checkInAt,
    checkOutAt: args.checkOutAt,
    guests,
    cleanerName: args.cleanerName?.trim() || undefined,
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

  const nextGuests = st.guests.map((g, i) => {
    const newName = (names[i] ?? g.name).trim() || g.name;
    return {
      ...g,
      name: newName,
      // Se non c'è firstName/lastName, prova a dividerli dal nome completo
      firstName: g.firstName || newName.split(" ")[0] || undefined,
      lastName: g.lastName || newName.split(" ").slice(1).join(" ") || undefined,
    };
  });

  stayStore.set(stayId, { ...st, guests: nextGuests });
}

export function updateStayGuest(
  stayId: string,
  guestId: string,
  updates: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
  }
) {
  const st = stayStore.get(stayId);
  if (!st) return;

  const nextGuests = st.guests.map((g) => {
    if (g.guestId !== guestId) return g;
    
    const firstName = (updates.firstName ?? g.firstName ?? "").trim();
    const lastName = (updates.lastName ?? g.lastName ?? "").trim();
    const fullName = firstName && lastName ? `${firstName} ${lastName}` : (firstName || lastName || g.name);
    
    return {
      ...g,
      name: fullName,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      phone: (updates.phone ?? g.phone ?? "").trim() || undefined,
      email: (updates.email ?? g.email ?? "").trim() || undefined,
    };
  });

  stayStore.set(stayId, { ...st, guests: nextGuests });
}

export function updateStayDates(
  stayId: string,
  updates: {
    checkInAt?: number;
    checkOutAt?: number;
  }
) {
  const st = stayStore.get(stayId);
  if (!st) return;

  const checkInAt = updates.checkInAt;
  const checkOutAt = updates.checkOutAt;

  // Validazione: check-out deve essere dopo check-in
  if (checkInAt !== undefined && checkOutAt !== undefined) {
    if (checkOutAt <= checkInAt) return;
  } else if (checkInAt !== undefined && checkOutAt === undefined) {
    if (st.checkOutAt <= checkInAt) return;
  } else if (checkInAt === undefined && checkOutAt !== undefined) {
    if (checkOutAt <= st.checkInAt) return;
  }

  stayStore.set(stayId, {
    ...st,
    checkInAt: checkInAt ?? st.checkInAt,
    checkOutAt: checkOutAt ?? st.checkOutAt,
  });
}

export function updateStayCleaner(stayId: string, cleanerName: string | null) {
  const st = stayStore.get(stayId);
  if (!st) return;

  stayStore.set(stayId, {
    ...st,
    cleanerName: cleanerName?.trim() || undefined,
  });
}

export function addStayGuest(
  stayId: string,
  guest: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
  }
): StayGuest | null {
  const st = stayStore.get(stayId);
  if (!st) return null;

  const firstName = (guest.firstName ?? "").trim();
  const lastName = (guest.lastName ?? "").trim();
  const fullName = firstName && lastName 
    ? `${firstName} ${lastName}` 
    : (firstName || lastName || "Ospite");

  const newGuest: StayGuest = {
    guestId: gid(),
    name: fullName,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    phone: (guest.phone ?? "").trim() || undefined,
    email: (guest.email ?? "").trim() || undefined,
  };

  stayStore.set(stayId, {
    ...st,
    guests: [...st.guests, newGuest],
  });

  return newGuest;
}

export function removeStayGuest(stayId: string, guestId: string): boolean {
  const st = stayStore.get(stayId);
  if (!st) return false;

  // Non permettere di rimuovere l'ultimo ospite
  if (st.guests.length <= 1) return false;

  const nextGuests = st.guests.filter((g) => g.guestId !== guestId);
  stayStore.set(stayId, { ...st, guests: nextGuests });
  return true;
}