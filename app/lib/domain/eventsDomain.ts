// app/lib/domain/eventsDomain.ts
// Dominio eventi (audit log) - SINGLE source of truth
// Tutte le viste devono leggere/scrivere eventi passando da qui.
// Lo storage reale (oggi in-memory, domani DB/API) sta sotto in Store.

import type { AccessEventType } from "@/app/lib/store";

// Actor = chi ha generato l’evento (per audit)
export type EventActor = "host" | "guest" | "cleaner" | "tech" | "system";

export type DomainEvent = {
  id: string;
  aptId: string;
  type: AccessEventType;
  actor: EventActor;
  label: string;
  ts: number;
};

function hasFn(obj: any, name: string) {
  return obj && typeof obj[name] === "function";
}

export function events_listByApt(Store: any, aptId: string, limit = 10): DomainEvent[] {
  if (!aptId) return [];

  // ✅ store.ts già espone listAccessLogByApt(aptId, limit)
  if (hasFn(Store, "listAccessLogByApt")) {
    const raw = Store.listAccessLogByApt(aptId, limit) ?? [];
    // Store.AccessEvent non ha "actor": lo aggiungiamo come "system" di default.
    return raw.map((e: any) => ({
      id: String(e.id),
      aptId: String(e.aptId),
      type: e.type as AccessEventType,
      actor: "system",
      label: String(e.label ?? ""),
      ts: Number(e.ts ?? Date.now()),
    }));
  }

  return [];
}

export function events_log(
  Store: any,
  params: {
    aptId: string;
    type: AccessEventType;
    actor?: EventActor;
    label: string;
  }
) {
  const { aptId, type, actor = "system", label } = params;
  if (!aptId || !type || !label) return;

  // ✅ store.ts già espone logAccessEvent(aptId, type, label)
  // Lo store non salva "actor" (per ora). Lo teniamo nel dominio come info logica.
  // Se domani vuoi, estendiamo Store.AccessEvent includendo actor.
  if (hasFn(Store, "logAccessEvent")) {
    Store.logAccessEvent(aptId, type, `[${actor}] ${label}`);
    return;
  }

  // fallback: non facciamo crashare nulla
}