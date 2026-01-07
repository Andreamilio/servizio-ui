// app/lib/gateStore.ts
import type { DoorOutcome } from "@/app/lib/gueststore"; // oppure ridefiniscilo qui
import type { AccessEvent } from "@/app/lib/store";

export type GateState = "open" | "closed";

type StoreWithAccessLog = {
  listAccessLogByApt?: (aptId: string, limit?: number) => AccessEvent[];
};

export type GateSnapshot = {
  aptId: string;
  state: GateState;
  lastOutcome: DoorOutcome | null;
  lastTs: number | null;
};

declare global {
   
  var __gateStore: Map<string, GateSnapshot> | undefined;
}

const gateStore: Map<string, GateSnapshot> = global.__gateStore ?? new Map();
global.__gateStore = gateStore;

export function gate_get(aptId: string): GateSnapshot {
  const ex = gateStore.get(aptId);
  if (ex) return ex;

  const seeded: GateSnapshot = {
    aptId,
    state: "closed",
    lastOutcome: null,
    lastTs: null,
  };
  gateStore.set(aptId, seeded);
  return seeded;
}

export function gate_set(aptId: string, patch: Partial<GateSnapshot>) {
  const cur = gate_get(aptId);
  const next = { ...cur, ...patch };
  gateStore.set(aptId, next);
  return next;
}

/**
 * simulazione outcome (oggi mock, domani servizi)
 * - open: 80% ok
 * - close: 90% ok
 */
export function gate_open(aptId: string): DoorOutcome {
  const now = Date.now();
  const ok = Math.random() < 0.8;
  const outcome: DoorOutcome = ok ? "ok" : "fail";
  gate_set(aptId, { state: ok ? "open" : gate_get(aptId).state, lastOutcome: outcome, lastTs: now });
  return outcome;
}


/**
 * Legge lo stato del portone da Store.accessLog (single source of truth)
 * Usato da tutte le viste per avere coerenza
 */
export function gate_getStateFromLog(Store: StoreWithAccessLog, aptId: string): "open" | "closed" | "unknown" {
  if (!Store?.listAccessLogByApt) return "unknown";
  
  const log = Store.listAccessLogByApt(aptId, 50) ?? [];
  const last = log.find((e: AccessEvent) => e?.type === "gate_opened");
  
  if (!last) return "unknown";
  return "open";
}

