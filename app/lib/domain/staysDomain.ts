// app/lib/domain/staysDomain.ts
import {
  getStay,
  createStay as createStayV2,
  listStaysByApt,
  setStayGuestNames,
  updateStayGuest,
  updateStayDates,
  addStayGuest,
  removeStayGuest,
  updateStayCleaner,
  type Stay as StayType,
  type StayGuest,
} from "@/app/lib/staysStore";

export type Stay = StayType;

export function stays_get(stayId: string): Stay | null {
  if (!stayId) return null;
  return getStay(stayId) ?? null;
}

export function stays_listByApt(aptId: string): Stay[] {
  if (!aptId) return [];
  return listStaysByApt(aptId) ?? [];
}

export function stays_setGuestNames(stayId: string, guestNames: string[]) {
  if (!stayId) return;
  setStayGuestNames(stayId, guestNames);
}

export function stays_updateGuest(
  stayId: string,
  guestId: string,
  updates: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
  }
) {
  if (!stayId || !guestId) return;
  updateStayGuest(stayId, guestId, updates);
}

export function stays_updateDates(
  stayId: string,
  updates: {
    checkInAt?: number;
    checkOutAt?: number;
  }
) {
  if (!stayId) return;
  updateStayDates(stayId, updates);
}

export function stays_addGuest(
  stayId: string,
  guest: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
  }
): StayGuest | null {
  if (!stayId) return null;
  return addStayGuest(stayId, guest);
}

export function stays_removeGuest(stayId: string, guestId: string): boolean {
  if (!stayId || !guestId) return false;
  return removeStayGuest(stayId, guestId);
}

export function stays_updateCleaner(stayId: string, cleanerName: string | null) {
  if (!stayId) return;
  updateStayCleaner(stayId, cleanerName);
}

export function stays_create(params: {
  aptId: string;
  checkInAt: number;
  checkOutAt: number;
  guestsCount: number;
  cleanerName?: string;
}) {
  const { aptId, checkInAt, checkOutAt, guestsCount, cleanerName } = params;

  if (!aptId) throw new Error("aptId missing");
  if (!Number.isFinite(checkInAt) || !Number.isFinite(checkOutAt)) {
    throw new Error("invalid dates");
  }
  if (checkOutAt <= checkInAt) throw new Error("checkout must be after checkin");

  const count = Math.max(1, Math.min(10, Number(guestsCount) || 1));
  const guests = Array.from({ length: count }).map((_, i) => ({
    name: `Ospite ${i + 1}`,
  }));

  return createStayV2({
    aptId,
    checkInAt,
    checkOutAt,
    guests,
    cleanerName: cleanerName?.trim() || undefined,
    createdBy: "host",
  });
}