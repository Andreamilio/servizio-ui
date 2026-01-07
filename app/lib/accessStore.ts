// app/lib/accessStore.ts
export type PinRole = "guest" | "cleaner" | "tech" | "host";
export type PinSource = "manual" | "auto";

export type Pin = {
  pin: string;
  role: PinRole;
  aptId: string;

  // opzionali ma utili per evoluzione “vera”
  stayId?: string;
  guestId?: string;
  guestName?: string;

  source?: PinSource;

  createdAt: number;
  validFrom: number;
  validTo: number;
};

declare global {
   
  var __accessPins: Map<string, Pin> | undefined;
}

const pinStore: Map<string, Pin> = global.__accessPins ?? new Map();
global.__accessPins = pinStore;

function genPinCode() {
  // 6 digits numeric
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function createPin(role: PinRole, aptId: string, ttlMinutes: number): Pin {
  const now = Date.now();
  const validFrom = now;
  const validTo = now + Math.max(1, ttlMinutes) * 60_000;

  // evita collisioni banali
  let code = genPinCode();
  for (let i = 0; i < 5 && pinStore.has(code); i++) code = genPinCode();

  const p: Pin = {
    pin: code,
    role,
    aptId,
    createdAt: now,
    validFrom,
    validTo,
    source: "manual",
  };

  pinStore.set(p.pin, p);
  return p;
}

export function revokePin(pin: string) {
  pinStore.delete(pin);
}

export function listPinsByApt(aptId: string): Pin[] {
  const now = Date.now();
  // pulizia soft: rimuove scaduti
  for (const [k, v] of pinStore) {
    if (v.validTo <= now) pinStore.delete(k);
  }
  return Array.from(pinStore.values())
    .filter((p) => p.aptId === aptId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function listPinsByStay(stayId: string): Pin[] {
  const now = Date.now();
  for (const [k, v] of pinStore) {
    if (v.validTo <= now) pinStore.delete(k);
  }
  return Array.from(pinStore.values())
    .filter((p) => p.stayId === stayId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function revokePinsByStay(stayId: string) {
  for (const [k, v] of pinStore) {
    if (v.stayId === stayId) pinStore.delete(k);
  }
}

// “evoluzione vera”: pin collegato a stay/guest e finestra validità precisa
export function createPinForGuest(args: {
  role: PinRole;
  aptId: string;
  stayId?: string;
  guestId?: string;
  guestName?: string;
  validFrom: number;
  validTo: number;
  source?: PinSource;
}): Pin {
  const now = Date.now();

  let code = genPinCode();
  for (let i = 0; i < 5 && pinStore.has(code); i++) code = genPinCode();

  const p: Pin = {
    pin: code,
    role: args.role,
    aptId: args.aptId,
    stayId: args.stayId,
    guestId: args.guestId,
    guestName: args.guestName,
    source: args.source ?? "manual",
    createdAt: now,
    validFrom: args.validFrom,
    validTo: args.validTo,
  };

  pinStore.set(p.pin, p);
  return p;
}

export function createPinsForStayGuests(args: {
  aptId: string;
  stayId: string;
  role: PinRole;
  validFrom: number;
  validTo: number;
  source?: PinSource;
  guestNames: string[];
}): Pin[] {
  return args.guestNames.map((nm) =>
    createPinForGuest({
      role: args.role,
      aptId: args.aptId,
      stayId: args.stayId,
      guestName: nm,
      validFrom: args.validFrom,
      validTo: args.validTo,
      source: args.source ?? "manual",
    })
  );
}