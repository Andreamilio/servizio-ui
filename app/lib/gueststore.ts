export type DoorOutcome = "ok" | "retrying" | "fail";

export type DoorState = "closed" | "open";

export type GuestDoorEvent = {
  id: string;
  aptId: string;
  ts: number; // unix ms
  outcome: DoorOutcome;
  title: string;
  detail: string;
};

export type GuestAptInfo = {
  aptId: string;
  aptName: string;
  addressShort: string;
  wifiSsid: string;
  wifiPass: string;
  checkIn: string;
  checkOut: string;
  rules: string[];
};

export type GuestState = {
  apt: GuestAptInfo;
  door: DoorState;
  lastOutcome: DoorOutcome | null;
  lastTs: number | null;
  events: GuestDoorEvent[];
};

declare global {
  // eslint-disable-next-line no-var
  var __guestStore: Map<string, GuestState> | undefined;
}

const store: Map<string, GuestState> = global.__guestStore ?? new Map();
global.__guestStore = store;

function id() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

export function getGuestState(aptId: string): GuestState {
  const existing = store.get(aptId);
  if (existing) return existing;

  const seeded: GuestState = {
    apt: {
      aptId,
      aptName: aptId === "017" ? "Apt 017 — Ufficio (demo)" : `Apt ${aptId}`,
      addressShort: "Via Demo 12, Milano",
      wifiSsid: "Lakeside-Guest",
      wifiPass: "Lakeside2026!",
      checkIn: "15:00",
      checkOut: "11:00",
      rules: [
        "No smoking",
        "Silenzio dopo le 22:30",
        "Raccogliere i rifiuti prima del checkout",
        "Animali solo se autorizzati dall’host",
      ],
    },
    door: "closed",
    lastOutcome: null,
    lastTs: null,
    events: [],
  };

  // seed iniziale: “piattaforma pronta”
  seeded.events.unshift({
    id: id(),
    aptId,
    ts: Date.now() - 15 * 60 * 1000,
    outcome: "ok",
    title: "Accesso pronto",
    detail: "Sistema operativo. Puoi aprire la porta quando vuoi.",
  });

  store.set(aptId, seeded);
  return seeded;
}

export function listGuestEvents(aptId: string, limit = 10) {
  const s = getGuestState(aptId);
  return s.events.slice(0, limit);
}

/**
 * Simula “Apri porta”.
 * - 80% ok
 * - 20% fail
 * In caso di fail, registra un tentativo “retrying” e poi “fail”.
 */
export function guestOpenDoor(aptId: string): DoorOutcome {
  const s = getGuestState(aptId);

  const r = Math.random();
  const now = Date.now();

  // Primo evento: “invio comando”
  s.events.unshift({
    id: id(),
    aptId,
    ts: now,
    outcome: "retrying",
    title: "Invio comando",
    detail: "Sto contattando la serratura…",
  });

  let outcome: DoorOutcome = "ok";

  if (r < 0.8) {
    outcome = "ok";
    s.events.unshift({
      id: id(),
      aptId,
      ts: now + 600,
      outcome: "ok",
      title: "Porta sbloccata ✅",
      detail: "Comando eseguito correttamente.",
    });
    s.door = "open";
  } else {
    outcome = "fail";
    s.events.unshift({
      id: id(),
      aptId,
      ts: now + 900,
      outcome: "fail",
      title: "Accesso non riuscito",
      detail: "Non riesco ad aprire. Contatta supporto o riprova tra poco.",
    });
  }

  s.lastOutcome = outcome;
  s.lastTs = now;
  store.set(aptId, s);

  return outcome;
}

/**
 * Simula “Chiudi porta”.
 * - 90% ok
 * - 10% fail
 */
export function guestCloseDoor(aptId: string): DoorOutcome {
  const s = getGuestState(aptId);

  const r = Math.random();
  const now = Date.now();

  s.events.unshift({
    id: id(),
    aptId,
    ts: now,
    outcome: "retrying",
    title: "Invio comando",
    detail: "Sto chiudendo la serratura…",
  });

  let outcome: DoorOutcome = "ok";

  if (r < 0.9) {
    outcome = "ok";
    s.door = "closed";
    s.events.unshift({
      id: id(),
      aptId,
      ts: now + 600,
      outcome: "ok",
      title: "Porta chiusa ✅",
      detail: "Serratura chiusa correttamente.",
    });
  } else {
    outcome = "fail";
    s.events.unshift({
      id: id(),
      aptId,
      ts: now + 900,
      outcome: "fail",
      title: "Chiusura non riuscita",
      detail: "Non riesco a chiudere. Riprova tra poco o contatta supporto.",
    });
  }

  s.lastOutcome = outcome;
  s.lastTs = now;
  store.set(aptId, s);

  return outcome;
}
