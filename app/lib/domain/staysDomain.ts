// app/lib/domain/staysDomain.ts
import {
  getStay,
  createStay as createStayV2,
  listStaysByApt,
  setStayGuestNames,
  type Stay as StayType,
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

export function stays_create(params: {
  aptId: string;
  checkInAt: number;
  checkOutAt: number;
  guestsCount: number;
}) {
  const { aptId, checkInAt, checkOutAt, guestsCount } = params;

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
    createdBy: "host",
  });
}