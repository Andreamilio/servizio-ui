// app/lib/clientStore.ts

export type ApartmentStatus = "ok" | "warn" | "crit";

export type Apartment = {
  aptId: string;
  name: string;
  clientId: string;
  status: ApartmentStatus;
};

export type Client = {
  clientId: string;
  name: string;
  apartments: Apartment[];
};

export type ClientStats = {
  clients: number;
  apartments: number;
  ok: number;
  warn: number;
  crit: number;
};

/**
 * STORE IN-MEMORY
 * In futuro verrà sostituito da DB / API senza cambiare l'interfaccia
 */
declare global {
  // eslint-disable-next-line no-var
  var __clientStore: Map<string, Client> | undefined;
}

const store: Map<string, Client> = global.__clientStore ?? new Map<string, Client>();
global.__clientStore = store;

/* ----------------------------------------
 * READ
 * ------------------------------------- */

export function listClients(): Client[] {
  return Array.from(store.values());
}

export function getClient(clientId: string): Client | null {
  return store.get(clientId) ?? null;
}

export function listApartments(): Apartment[] {
  const out: Apartment[] = [];
  for (const c of store.values()) out.push(...c.apartments);
  return out;
}

export function getApartment(aptId: string): Apartment | null {
  for (const c of store.values()) {
    const a = c.apartments.find((x) => x.aptId === aptId);
    if (a) return a;
  }
  return null;
}

export function listApartmentsByClient(clientId: string): Apartment[] {
  return store.get(clientId)?.apartments ?? [];
}

export function getClientStats(): ClientStats {
  const clients = store.size;

  let apartments = 0;
  let ok = 0;
  let warn = 0;
  let crit = 0;

  for (const c of store.values()) {
    apartments += c.apartments.length;
    for (const a of c.apartments) {
      if (a.status === "ok") ok++;
      else if (a.status === "warn") warn++;
      else crit++;
    }
  }

  return { clients, apartments, ok, warn, crit };
}

export function getClientLabel(clientId: string): string {
  return store.get(clientId)?.name ?? clientId;
}

/* ----------------------------------------
 * WRITE (mock)
 * ------------------------------------- */

export function setApartmentStatus(aptId: string, status: ApartmentStatus) {
  for (const c of store.values()) {
    const a = c.apartments.find((x) => x.aptId === aptId);
    if (a) {
      a.status = status;
      return;
    }
  }
}

/* ----------------------------------------
 * DEV SEED
 * ------------------------------------- */

if (process.env.NODE_ENV !== "production" && store.size === 0) {
  // ✅ Single demo client + populated apartments (101–106)
  // Source of truth for Host / Tech / Guest views.
  store.set("global-properties", {
    clientId: "global-properties",
    name: "Global Properties",
    apartments: [
      { aptId: "101", name: "Lakeside Tower — Apt 101", clientId: "global-properties", status: "ok" },
      { aptId: "102", name: "Lakeside Tower — Apt 102", clientId: "global-properties", status: "warn" },
      { aptId: "103", name: "Lakeside Tower — Apt 103", clientId: "global-properties", status: "ok" },
      { aptId: "104", name: "Lakeside Tower — Apt 104", clientId: "global-properties", status: "ok" },
      { aptId: "105", name: "Lakeside Tower — Apt 105", clientId: "global-properties", status: "crit" },
      { aptId: "106", name: "Lakeside Tower — Apt 106", clientId: "global-properties", status: "ok" },
    ],
  });
}