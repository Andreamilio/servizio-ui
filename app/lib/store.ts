type Role = "host" | "tech" | "guest" | "cleaner";

export type PinRecord = {
  pin: string;
  role: Role;
  aptId: string;
  expiresAt: number; // unix ms
  createdAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __pinStore: Map<string, PinRecord> | undefined;
}

export const pinStore: Map<string, PinRecord> = global.__pinStore ?? new Map();
global.__pinStore = pinStore;

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
  return pinStore.delete(pin);
}

// DEV SEED (solo per iniziare). In produzione rimuovere.
if (process.env.NODE_ENV !== "production" && pinStore.size === 0) {
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
