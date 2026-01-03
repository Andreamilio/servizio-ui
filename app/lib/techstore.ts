import { getClientLabel, listApartmentsByClient, listApartments } from "@/app/lib/clientStore";
import { listAccessLogByApt } from "@/app/lib/store";
import { gate_open, gate_close } from "@/app/lib/domain/gateStore";
export type NetPath = "main" | "backup";
export type OnlineStatus = "online" | "offline";
export type DoorStatus = "locked" | "unlocked" | "unknown";
export type GateStatus = "locked" | "unlocked" | "unknown";
export type VpnStatus = "up" | "down";

export type SensorKind = "smoke" | "light" | "door" | "window" | "noise";

export type SensorStatus = "online" | "offline";

export type Sensor = {
  id: string;
  aptId: string;
  name: string;
  kind: SensorKind;
  status: SensorStatus;
  online: boolean;
  controllable?: boolean;
  state?: "on" | "off";
};

export type AptHealth = {
  aptId: string;          // "101"
  aptName: string;        // "Apt 101"
  group: string;          // "Lakeside Tower"
  status: OnlineStatus;   // ONLINE/OFFLINE (overall)
  network: NetPath;       // MAIN WAN / BACKUP WAN
  lastAccessLabel: string;// "11:32 AM"
  vpn: VpnStatus;
  door: DoorStatus;
  sensorsOnline: number;
  sensorsTotal: number;
};

export type AccessLogItem = {
  id: string;
  tsLabel: string; // "11:32 AM"
  aptId: string;   // "101"
  title: string;   // "Door Unlocked"
  detail: string;  // "Remote action: Tech"
  level?: "ok" | "warn" | "bad";
};

export type IncidentItem = {
  id: string;
  tsLabel: string; // "10:14 AM"
  aptId: string;
  type: "tamper" | "offline" | "failed_access";
  title: string;   // "Tamper Alert"
};

declare global {
  // eslint-disable-next-line no-var
  var __techStore:
    | {
        clientName: string;
        groupName: string;
        apts: Map<string, AptHealth>;
        accessLog: AccessLogItem[];
        incidents: IncidentItem[];
      }
    | undefined;
}

declare global {
  // eslint-disable-next-line no-var
  var __techSensors: Map<string, Sensor[]> | undefined;
}

export const techSensors: Map<string, Sensor[]> = global.__techSensors ?? new Map();
global.__techSensors = techSensors;

export const techStore =
  global.__techStore ??
  (() => {
    const apts = new Map<string, AptHealth>();

    // Source of truth: clientStore (1 client: global-properties)
    const CLIENT_ID = "global-properties";
    const clientName = getClientLabel(CLIENT_ID);

    let apartments = listApartmentsByClient(CLIENT_ID);
    if (!apartments || apartments.length === 0) {
      apartments = [
        { aptId: "101", name: "Lakeside Tower — Apt 101", clientId: CLIENT_ID, status: "ok" },
        { aptId: "102", name: "Lakeside Tower — Apt 102", clientId: CLIENT_ID, status: "warn" },
        { aptId: "103", name: "Lakeside Tower — Apt 103", clientId: CLIENT_ID, status: "ok" },
        { aptId: "104", name: "Lakeside Tower — Apt 104", clientId: CLIENT_ID, status: "ok" },
        { aptId: "105", name: "Lakeside Tower — Apt 105", clientId: CLIENT_ID, status: "crit" },
        { aptId: "106", name: "Lakeside Tower — Apt 106", clientId: CLIENT_ID, status: "ok" },
      ];
    }

    // Seed AptHealth from apartments list (no more divergent datasets)
    const nowLabel = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    apartments.forEach((apt, idx) => {
      const status: OnlineStatus = idx % 4 === 1 ? "offline" : "online";
      const network: NetPath = status === "offline" ? "backup" : "main";
      const vpn: VpnStatus = status === "offline" ? "down" : "up";

      apts.set(String(apt.aptId), {
        aptId: String(apt.aptId),
        aptName: String(apt.name ?? `Apt ${apt.aptId}`),
        group: getClientLabel(CLIENT_ID),
        status,
        network,
        lastAccessLabel: nowLabel,
        vpn,
        door: status === "online" ? "locked" : "unknown",
        sensorsOnline: 0,
        sensorsTotal: 0,
      });
    });

    const accessLog: AccessLogItem[] = [
      { id: "l1", tsLabel: "11:32 AM", aptId: "101", title: "Door Unlocked", detail: "Keycard: D. Smith", level: "ok" },
      { id: "l2", tsLabel: "11:15 AM", aptId: "102", title: "Access Denied", detail: "Invalid PIN Code", level: "bad" },
      { id: "l3", tsLabel: "11:02 AM", aptId: "104", title: "Door Unlocked", detail: "Mobile ID: J. Brown", level: "ok" },
      { id: "l4", tsLabel: "10:45 AM", aptId: "105", title: "Door Unlocked", detail: "Keycard: A. Lee", level: "ok" },
    ];

    const incidents: IncidentItem[] = [
      { id: "i1", tsLabel: "10:14 AM", aptId: "102", type: "tamper", title: "Tamper Alert" },
      { id: "i2", tsLabel: "09:50 AM", aptId: "105", type: "offline", title: "Offline Alert" },
      { id: "i3", tsLabel: "09:32 AM", aptId: "101", type: "failed_access", title: "Failed Access" },
    ];

    return {
      clientName,
      groupName: "Lakeside Tower",
      apts,
      accessLog,
      incidents,
    };
  })();

global.__techStore = techStore;

function computeDoorFromSharedLog(aptId: string): DoorStatus {
  // Shared, cross-app source of truth (Host/Guest/Tech all write here)
  // listAccessLogByApt restituisce gli eventi più recenti per primi
  const log = listAccessLogByApt(aptId, 50) ?? [];

  // Find most recent door event (il primo nel log è il più recente)
  // Deve trovare l'evento più recente tra door_opened e door_closed
  for (const e of log) {
    if (e.type === "door_opened" || e.type === "door_closed") {
      return e.type === "door_opened" ? "unlocked" : "locked";
    }
  }

  // If no door events yet, fall back to unknown
  return "unknown";
}

export function computeGateFromSharedLog(aptId: string): GateStatus {
  // Shared, cross-app source of truth (Host/Guest/Tech all write here)
  // listAccessLogByApt restituisce gli eventi più recenti per primi
  const log = listAccessLogByApt(aptId, 50) ?? [];

  // Find most recent gate event (il primo nel log è il più recente)
  // Deve trovare l'evento più recente tra gate_opened e gate_closed
  for (const e of log) {
    if (e.type === "gate_opened" || e.type === "gate_closed") {
      return e.type === "gate_opened" ? "unlocked" : "locked";
    }
  }

  // If no gate events yet, fall back to unknown
  return "unknown";
}

// ---- selectors
export function listApts() {
  // Sync techStore.apts with clientStore (source of truth)
  const allApartments = listApartments(); // Gets all apartments from all clients
  const existingAptIds = new Set(techStore.apts.keys());
  const currentAptIds = new Set(allApartments.map((a) => a.aptId));

  // Add new apartments from clientStore
  allApartments.forEach((apt) => {
    if (!techStore.apts.has(apt.aptId)) {
      // New apartment: create AptHealth entry with default values
      const status: OnlineStatus = "online";
      const network: NetPath = "main";
      const vpn: VpnStatus = "up";
      const nowLabel = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      techStore.apts.set(apt.aptId, {
        aptId: apt.aptId,
        aptName: apt.name ?? `Apt ${apt.aptId}`,
        group: getClientLabel(apt.clientId), // Use client name as group
        status,
        network,
        lastAccessLabel: nowLabel,
        vpn,
        door: computeDoorFromSharedLog(apt.aptId),
        sensorsOnline: 0,
        sensorsTotal: 0,
      });
    } else {
      // Update existing apartment name if it changed
      const existing = techStore.apts.get(apt.aptId)!;
      existing.aptName = apt.name ?? `Apt ${apt.aptId}`;
      // Update group based on clientId (use client name)
      existing.group = getClientLabel(apt.clientId);
    }
  });

  // Remove apartments that no longer exist in clientStore
  existingAptIds.forEach((aptId) => {
    if (!currentAptIds.has(aptId)) {
      techStore.apts.delete(aptId);
    }
  });

  return Array.from(techStore.apts.values())
    .map((a) => ({
      ...a,
      // UI door state must follow shared log, not local seed
      door: computeDoorFromSharedLog(a.aptId),
    }))
    .sort((a, b) => {
      const na = Number(a.aptId);
      const nb = Number(b.aptId);
      if (Number.isNaN(na) || Number.isNaN(nb)) return a.aptId.localeCompare(b.aptId);
      return na - nb;
    });
}

export function getAccessLog(limit = 12) {
  return techStore.accessLog.slice(0, limit);
}

export function getAccessLogByApt(aptId: string, limit = 20) {
  return techStore.accessLog.filter((e) => e.aptId === aptId).slice(0, limit);
}

export function getIncidents(limit = 6) {
  return techStore.incidents.slice(0, limit);
}

export function getSensorsByApt(aptId: string): Sensor[] {
  const list = techSensors.get(aptId) ?? [];
  return list.map((s) => ({
    ...s,
    status: s.status ?? (s.online ? "online" : "offline"),
  }));
}

export function toggleSensor(aptId: string, sensorId: string) {
  const list = techSensors.get(aptId) ?? [];
  const s = list.find((x) => x.id === sensorId);
  if (!s) return null;
  if (!s.controllable) return s;
  s.state = s.state === "on" ? "off" : "on";

  // log (mock)
  pushLog({
    tsLabel: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    aptId,
    title: "Sensor Toggled",
    detail: `${s.name}: ${s.state?.toUpperCase()}`,
    level: "ok",
  });

  return s;
}

// ---- mutations (server-side)
export function getApt(aptId: string) {
  const a = techStore.apts.get(aptId);
  if (!a) return null;

  const sensors = getSensorsByApt(aptId);
  
  // Sempre aggiorna door state dal log condiviso (single source of truth)
  const doorState = computeDoorFromSharedLog(aptId);

  // Se non ci sono sensori, ritorna solo con door aggiornato
  if (!sensors.length) {
    return {
      ...a,
      door: doorState,
    };
  }

  // Se ci sono sensori, aggiorna anche status, sensorsTotal, sensorsOnline
  const sensorsOnline = sensors.filter((s) => s.online).length;
  const sensorsTotal = sensors.length;
  // prototype rule: if most sensors are offline -> mark apt offline
  const derivedStatus: OnlineStatus = sensorsOnline === 0 ? "offline" : a.status;

  return {
    ...a,
    status: derivedStatus,
    door: doorState,
    sensorsTotal,
    sensorsOnline,
  };
}

function pushLog(item: Omit<AccessLogItem, "id">) {
  techStore.accessLog.unshift({
    id: `l_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    ...item,
  });
}

export function toggleWan(aptId: string) {
  const a = techStore.apts.get(aptId);
  if (!a) return null;
  a.network = a.network === "main" ? "backup" : "main";
  techStore.apts.set(aptId, a);
  return a;
}

export function toggleVpn(aptId: string) {
  const a = techStore.apts.get(aptId);
  if (!a) return null;
  a.vpn = a.vpn === "up" ? "down" : "up";
  techStore.apts.set(aptId, a);
  return a;
}

export function openDoor(aptId: string) {
  const a = techStore.apts.get(aptId);
  if (!a) return null;
  // Rimossa gestione stato porta locale: ora usiamo Store.accessLog come single source of truth
  // events_log() viene chiamato dalla pagina tech/apt/[aptId]/page.tsx dopo questa funzione
  return a;
}

export function closeDoor(aptId: string) {
  const a = techStore.apts.get(aptId);
  if (!a) return null;
  // Rimossa gestione stato porta locale: ora usiamo Store.accessLog come single source of truth
  // events_log() viene chiamato dalla pagina tech/apt/[aptId]/page.tsx dopo questa funzione
  return a;
}

export function openGate(aptId: string) {
  const a = techStore.apts.get(aptId);
  if (!a) return null;
  // Usa gateStore per la logica
  gate_open(aptId);
  // Rimossa gestione stato portone locale: ora usiamo Store.accessLog come single source of truth
  // events_log() viene chiamato dalla pagina tech/apt/[aptId]/page.tsx dopo questa funzione
  return a;
}

export function closeGate(aptId: string) {
  const a = techStore.apts.get(aptId);
  if (!a) return null;
  // Usa gateStore per la logica
  gate_close(aptId);
  // Rimossa gestione stato portone locale: ora usiamo Store.accessLog come single source of truth
  // events_log() viene chiamato dalla pagina tech/apt/[aptId]/page.tsx dopo questa funzione
  return a;
}

export function revokeAccess(aptId: string) {
  const a = techStore.apts.get(aptId);
  if (!a) return null;

  pushLog({
    tsLabel: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    aptId,
    title: "Access Revoked",
    detail: "All temporary credentials revoked",
    level: "warn",
  });
  return a;
}