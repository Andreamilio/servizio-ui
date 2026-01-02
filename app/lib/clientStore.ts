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

/**
 * STORE IN-MEMORY
 * In futuro verrà sostituito da DB / API senza cambiare l'interfaccia
 */
declare global {
  // eslint-disable-next-line no-var
  var __clientStore: Map<string, Client> | undefined;
}

const store: Map<string, Client> =
  global.__clientStore ?? new Map<string, Client>();

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
  for (const c of store.values()) {
    out.push(...c.apartments);
  }
  return out;
}

export function getApartment(aptId: string): Apartment | null {
  for (const c of store.values()) {
    const a = c.apartments.find((a) => a.aptId === aptId);
    if (a) return a;
  }
  return null;
}

export function listApartmentsByClient(clientId: string): Apartment[] {
  return store.get(clientId)?.apartments ?? [];
}

/* ----------------------------------------
 * WRITE (mock)
 * ------------------------------------- */

export function setApartmentStatus(
  aptId: string,
  status: ApartmentStatus
) {
  for (const c of store.values()) {
    const a = c.apartments.find((a) => a.aptId === aptId);
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
  store.set("global-properties", {
    clientId: "global-properties",
    name: "Global Properties",
    apartments: [
      {
        aptId: "017",
        name: "Lakeside Tower — Apt 017",
        clientId: "global-properties",
        status: "ok",
      },
      {
        aptId: "018",
        name: "Lakeside Tower — Apt 018",
        clientId: "global-properties",
        status: "warn",
      },
      {
        aptId: "019",
        name: "Lakeside Tower — Apt 019",
        clientId: "global-properties",
        status: "crit",
      },
    ],
  });
}