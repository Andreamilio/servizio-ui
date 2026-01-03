// app/lib/domain/pinsDomain.ts
import { stays_get, stays_create, stays_setGuestNames } from "@/app/lib/domain/staysDomain";
import { createStay as createStayV2, getStay as getStayV2 } from "@/app/lib/staysStore";

// Interfaccia MINIMA che il domain si aspetta: se non c’è, meglio che esploda in build
export type StorePinsLike = {
  listPinsByStay(stayId: string): any[];
  revokePin(pin: string): void;

  createPinForGuest(input: {
    role: "guest" | "cleaner" | "host" | "tech";
    aptId: string;
    stayId: string;
    guestId: string;
    guestName?: string;
    validFrom: number;
    validTo: number;
    source: "auto" | "manual";
  }): any;

  createPinsForStayGuests(input: {
    aptId: string;
    stayId: string;
    role: "guest";
    validFrom: number;
    validTo: number;
    source: "auto" | "manual";
    guestNames?: string[];
    guestIds?: string[];
  }): any;

  createCleanerPinForStay(input: {
    aptId: string;
    stayId: string;
    cleanerName: string;
    source?: "auto" | "manual";
  }): any;

  deleteStay(stayId: string): any;
};

export function pins_listByStay(Store: StorePinsLike, stayId: string) {
  if (!stayId) return [];
  return Store.listPinsByStay(stayId) ?? [];
}

export function pins_revoke(Store: StorePinsLike, pin: string) {
  if (!pin) return;
  Store.revokePin(pin);
}

export function pins_createCleanerForStay(
  Store: StorePinsLike,
  params: {
    aptId: string;
    stayId: string;
    cleanerName: string;
    source?: "auto" | "manual";
  }
) {
  const { aptId, stayId, cleanerName, source = "auto" } = params;
  if (!aptId || !stayId || !cleanerName) return;

  Store.createCleanerPinForStay({
    aptId,
    stayId,
    cleanerName: cleanerName.trim(),
    source,
  });
}

export function pins_createGuestPinsForStay(
  Store: StorePinsLike,
  params: {
    aptId: string;
    stayId: string;
    validFrom: number;
    validTo: number;
    guestNames: string[];
    source?: "manual" | "auto";
  }
) {
  const { aptId, stayId, validFrom, validTo, guestNames, source = "manual" } = params;
  if (!aptId || !stayId) return;

  const names = (guestNames ?? []).map((x, i) => (x?.trim() ? x.trim() : `Ospite ${i + 1}`));

  // Manteniamo sincronizzati i nomi sullo stay (source of truth)
  stays_setGuestNames(stayId, names);

  Store.createPinsForStayGuests({
    aptId,
    stayId,
    role: "guest",
    validFrom,
    validTo,
    source,
    guestNames: names,
  });
}

export function pins_createSingleGuestPin(
  Store: StorePinsLike,
  params: {
    aptId: string;
    stayId: string;
    guestName?: string;
    validFrom: number;
    validTo: number;
  }
) {
  const { aptId, stayId, guestName, validFrom, validTo } = params;
  if (!aptId) return;

  const st = stayId ? stays_get(stayId) : null;
  const g0 = st?.guests?.[0];

  if (!stayId || !g0) return;

  const name = (guestName?.trim() || g0.name || "Ospite 1").trim();

  // sincronizza nome guest 1 sullo stay
  stays_setGuestNames(stayId, [name]);

  Store.createPinForGuest({
    role: "guest",
    aptId,
    stayId,
    guestId: g0.guestId,
    guestName: name,
    validFrom,
    validTo,
    source: "manual",
  });
}

export function pins_deleteStayAndPins(Store: StorePinsLike, stayId: string) {
  if (!stayId) return;
  // Store.deleteStay nel tuo store revoca già i pins in modo pulito
  Store.deleteStay(stayId);
}

export function stays_createWithOptionalCleaner(
  Store: StorePinsLike,
  params: {
    aptId: string;
    checkInAt: number;
    checkOutAt: number;
    guestsCount: number;
    cleanerName?: string;
  }
) {
  const { aptId, checkInAt, checkOutAt, guestsCount, cleanerName } = params;

  const st = stays_create({ aptId, checkInAt, checkOutAt, guestsCount, cleanerName: cleanerName?.trim() || undefined });

  const cn = (cleanerName ?? "").trim();
  if (cn) {
    Store.createCleanerPinForStay({
      aptId,
      stayId: st.stayId,
      cleanerName: cn,
      source: "auto",
    });
  }

  return st;
}

export function stays_createWithGuestsAndCleaner(
  Store: StorePinsLike,
  params: {
    aptId: string;
    checkInAt: number;
    checkOutAt: number;
    guests: Array<{
      firstName: string;
      lastName: string;
      phone: string;
      email?: string;
    }>;
    cleanerName: string;
  }
) {
  const { aptId, checkInAt, checkOutAt, guests, cleanerName } = params;

  // Crea lo stay con i dati completi degli ospiti e il cleaner assegnato
  const st = createStayV2({
    aptId,
    checkInAt,
    checkOutAt,
    guests: guests.map((g) => ({
      firstName: g.firstName.trim(),
      lastName: g.lastName.trim(),
      phone: g.phone.trim(),
      email: g.email?.trim(),
    })),
    cleanerName: cleanerName.trim(),
    createdBy: "host",
  });

  // Crea automaticamente i PIN per gli ospiti usando guestIds
  try {
    Store.createPinsForStayGuests({
      aptId,
      stayId: st.stayId,
      role: "guest",
      validFrom: checkInAt,
      validTo: checkOutAt,
      source: "auto",
      guestIds: st.guests.map((g) => g.guestId),
    });
  } catch (error) {
    // Se la creazione dei PIN fallisce, lo stay è comunque stato creato
    console.error("Errore nella creazione dei PIN per gli ospiti:", error);
  }

  // Crea il PIN per il cleaner
  const cn = (cleanerName ?? "").trim();
  if (cn) {
    Store.createCleanerPinForStay({
      aptId,
      stayId: st.stayId,
      cleanerName: cn,
      source: "auto",
    });
  }

  return st;
}