// app/lib/doorStore.ts
import crypto from "crypto";
import type { DoorOutcome } from "@/app/lib/gueststore"; // oppure ridefiniscilo qui
import type { AccessEventType } from "@/app/lib/store";

export type DoorState = "open" | "closed";

export type DoorSnapshot = {
  aptId: string;
  state: DoorState;
  lastOutcome: DoorOutcome | null;
  lastTs: number | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __doorStore: Map<string, DoorSnapshot> | undefined;
}

const doorStore: Map<string, DoorSnapshot> = global.__doorStore ?? new Map();
global.__doorStore = doorStore;

export function door_get(aptId: string): DoorSnapshot {
  const ex = doorStore.get(aptId);
  if (ex) return ex;

  const seeded: DoorSnapshot = {
    aptId,
    state: "closed",
    lastOutcome: null,
    lastTs: null,
  };
  doorStore.set(aptId, seeded);
  return seeded;
}

export function door_set(aptId: string, patch: Partial<DoorSnapshot>) {
  const cur = door_get(aptId);
  const next = { ...cur, ...patch };
  doorStore.set(aptId, next);
  return next;
}

/**
 * simulazione outcome (oggi mock, domani servizi)
 * - open: 80% ok
 * - close: 90% ok
 */
export function door_open(aptId: string): DoorOutcome {
  const now = Date.now();
  const ok = Math.random() < 0.8;
  const outcome: DoorOutcome = ok ? "ok" : "fail";
  door_set(aptId, { state: ok ? "open" : door_get(aptId).state, lastOutcome: outcome, lastTs: now });
  return outcome;
}

export function door_close(aptId: string): DoorOutcome {
  const now = Date.now();
  const ok = Math.random() < 0.9;
  const outcome: DoorOutcome = ok ? "ok" : "fail";
  door_set(aptId, { state: ok ? "closed" : door_get(aptId).state, lastOutcome: outcome, lastTs: now });
  return outcome;
}

/**
 * Legge lo stato della porta da Store.accessLog (single source of truth)
 * Usato da tutte le viste per avere coerenza
 */
export function door_getStateFromLog(Store: any, aptId: string): "open" | "closed" | "unknown" {
  if (!Store?.listAccessLogByApt) return "unknown";
  
  const log = Store.listAccessLogByApt(aptId, 50) ?? [];
  const last = log.find((e: any) => e?.type === "door_opened" || e?.type === "door_closed");
  
  if (!last) return "unknown";
  if (last.type === "door_opened") return "open";
  return "closed";
}