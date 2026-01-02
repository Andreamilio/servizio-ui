export type NetPath = "main" | "backup";
export type OnlineStatus = "online" | "offline";
export type DoorStatus = "locked" | "unlocked" | "unknown";
export type VpnStatus = "up" | "down";

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

export const techStore =
  global.__techStore ??
  (() => {
    const apts = new Map<string, AptHealth>();

    // ✅ Scelta A: seed 101–106 (coerente con mockup)
    const seed: AptHealth[] = [
      { aptId: "101", aptName: "Apt 101", group: "Lakeside Tower", status: "online",  network: "main",   lastAccessLabel: "11:32 AM", vpn: "up",   door: "locked",  sensorsOnline: 6, sensorsTotal: 6 },
      { aptId: "102", aptName: "Apt 102", group: "Lakeside Tower", status: "offline", network: "backup", lastAccessLabel: "10:15 AM", vpn: "down", door: "unknown", sensorsOnline: 2, sensorsTotal: 6 },
      { aptId: "103", aptName: "Apt 103", group: "Lakeside Tower", status: "online",  network: "main",   lastAccessLabel: "11:48 AM", vpn: "up",   door: "locked",  sensorsOnline: 5, sensorsTotal: 5 },
      { aptId: "104", aptName: "Apt 104", group: "Lakeside Tower", status: "online",  network: "main",   lastAccessLabel: "11:25 AM", vpn: "up",   door: "locked",  sensorsOnline: 7, sensorsTotal: 7 },
      { aptId: "105", aptName: "Apt 105", group: "Lakeside Tower", status: "offline", network: "backup", lastAccessLabel: "09:57 AM", vpn: "down", door: "unknown", sensorsOnline: 3, sensorsTotal: 7 },
      { aptId: "106", aptName: "Apt 106", group: "Lakeside Tower", status: "online",  network: "main",   lastAccessLabel: "11:10 AM", vpn: "up",   door: "locked",  sensorsOnline: 4, sensorsTotal: 4 },
    ];

    seed.forEach((a) => apts.set(a.aptId, a));

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
      clientName: "Global Properties",
      groupName: "Lakeside Tower",
      apts,
      accessLog,
      incidents,
    };
  })();

global.__techStore = techStore;

// ---- selectors
export function listApts() {
  return Array.from(techStore.apts.values()).sort((a, b) => {
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

// ---- mutations (server-side)
export function getApt(aptId: string) {
  return techStore.apts.get(aptId) ?? null;
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

  pushLog({
    tsLabel: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    aptId,
    title: "Network Switched",
    detail: `Now: ${a.network === "main" ? "MAIN WAN" : "BACKUP WAN"}`,
    level: "warn",
  });
  return a;
}

export function toggleVpn(aptId: string) {
  const a = techStore.apts.get(aptId);
  if (!a) return null;
  a.vpn = a.vpn === "up" ? "down" : "up";
  techStore.apts.set(aptId, a);

  pushLog({
    tsLabel: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    aptId,
    title: "VPN Toggled",
    detail: `VPN is now: ${a.vpn.toUpperCase()}`,
    level: a.vpn === "up" ? "ok" : "bad",
  });
  return a;
}

export function openDoor(aptId: string) {
  const a = techStore.apts.get(aptId);
  if (!a) return null;
  a.door = "unlocked";
  techStore.apts.set(aptId, a);

  pushLog({
    tsLabel: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    aptId,
    title: "Door Unlocked",
    detail: "Remote action: Tech",
    level: "ok",
  });
  return a;
}

export function closeDoor(aptId: string) {
  const a = techStore.apts.get(aptId);
  if (!a) return null;
  a.door = "locked";
  techStore.apts.set(aptId, a);

  pushLog({
    tsLabel: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    aptId,
    title: "Door Locked",
    detail: "Remote action: Tech",
    level: "ok",
  });
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