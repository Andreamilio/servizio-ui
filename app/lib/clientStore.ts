// app/lib/clientStore.ts

export type ApartmentStatus = "ok" | "warn" | "crit";

export type Apartment = {
  aptId: string;
  name: string;
  clientId: string;
  status: ApartmentStatus;
  // Extended fields (optional for backward compatibility)
  addressShort?: string;
  wifiSsid?: string;
  wifiPass?: string;
  checkIn?: string; // Format: "HH:mm"
  checkOut?: string; // Format: "HH:mm"
  rules?: string[]; // House rules
  supportContacts?: string; // Support contact info
  notes?: string; // Internal operational notes
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
 * WRITE - Client CRUD
 * ------------------------------------- */

export function createClient(clientId: string, name: string): Client {
  if (store.has(clientId)) {
    throw new Error(`Client with ID "${clientId}" already exists`);
  }
  const client: Client = {
    clientId,
    name,
    apartments: [],
  };
  store.set(clientId, client);
  return client;
}

export function updateClient(clientId: string, name: string): Client | null {
  const client = store.get(clientId);
  if (!client) return null;
  client.name = name;
  store.set(clientId, client);
  return client;
}

export function deleteClient(clientId: string): boolean {
  return store.delete(clientId);
}

/* ----------------------------------------
 * WRITE - Apartment CRUD
 * ------------------------------------- */

export function createApartment(clientId: string, aptId: string, data: Partial<Apartment>): Apartment {
  const client = store.get(clientId);
  if (!client) {
    throw new Error(`Client with ID "${clientId}" not found`);
  }
  
  // Check if apartment already exists (across all clients)
  for (const c of store.values()) {
    if (c.apartments.some((a) => a.aptId === aptId)) {
      throw new Error(`Apartment with ID "${aptId}" already exists`);
    }
  }

  const apartment: Apartment = {
    aptId,
    name: data.name ?? `Apt ${aptId}`,
    clientId,
    status: data.status ?? "ok",
    addressShort: data.addressShort,
    wifiSsid: data.wifiSsid,
    wifiPass: data.wifiPass,
    checkIn: data.checkIn,
    checkOut: data.checkOut,
    rules: data.rules,
    supportContacts: data.supportContacts,
    notes: data.notes,
  };

  client.apartments.push(apartment);
  store.set(clientId, client);
  return apartment;
}

export function updateApartment(aptId: string, data: Partial<Apartment>): Apartment | null {
  for (const c of store.values()) {
    const apt = c.apartments.find((a) => a.aptId === aptId);
    if (apt) {
      if (data.name !== undefined) apt.name = data.name;
      if (data.status !== undefined) apt.status = data.status;
      if (data.addressShort !== undefined) apt.addressShort = data.addressShort;
      if (data.wifiSsid !== undefined) apt.wifiSsid = data.wifiSsid;
      if (data.wifiPass !== undefined) apt.wifiPass = data.wifiPass;
      if (data.checkIn !== undefined) apt.checkIn = data.checkIn;
      if (data.checkOut !== undefined) apt.checkOut = data.checkOut;
      if (data.rules !== undefined) apt.rules = data.rules;
      if (data.supportContacts !== undefined) apt.supportContacts = data.supportContacts;
      if (data.notes !== undefined) apt.notes = data.notes;
      
      store.set(c.clientId, c);
      return apt;
    }
  }
  return null;
}

export function deleteApartment(aptId: string): boolean {
  for (const c of store.values()) {
    const index = c.apartments.findIndex((a) => a.aptId === aptId);
    if (index >= 0) {
      c.apartments.splice(index, 1);
      store.set(c.clientId, c);
      return true;
    }
  }
  return false;
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

// In produzione i seed DEV sono disattivati per default.
// Per abilitare il dataset demo su Vercel/Prod usa: DEMO_MODE=1
const SHOULD_SEED =
  process.env.DEMO_MODE === "1" || process.env.NODE_ENV !== "production";

if (SHOULD_SEED && store.size === 0) {
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
