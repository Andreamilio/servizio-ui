import crypto from "crypto";
import { getUser, getUserByUsername, createUser } from "./userStore";
import { getPin } from "./store";

const secret = process.env.APP_SECRET || "dev-secret-change-me";

type SessionPayload = {
  role: "host" | "tech" | "guest" | "cleaner";
  aptId: string;
  userId?: string; // userId per host/tech (opzionale per retrocompatibilità)
  pin?: string; // PIN usato per guest/cleaner (opzionale)
  exp: number; // unix seconds
};

function b64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function sign(data: string) {
  return b64url(crypto.createHmac("sha256", secret).update(data).digest());
}

export function createSession(payload: Omit<SessionPayload, "exp">, ttlSeconds: number) {
  const full: SessionPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const json = JSON.stringify(full);
  return `${b64url(json)}.${sign(json)}`;
}

export function readSession(token?: string | null): SessionPayload | null {
  if (!token) return null;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;

  const json = Buffer.from(payloadB64.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  if (sign(json) !== sig) return null;

  const payload = JSON.parse(json) as SessionPayload;
  if (!payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

/**
 * Valida che l'utente associato alla sessione sia ancora abilitato.
 * Ritorna null se la sessione è invalida o l'utente è disabilitato.
 */
function isDemoPin(pin: string): boolean {
  const demoPins = {
    cleaner: String(process.env.DEMO_PIN_CLEANER ?? "444444").trim(),
    guest: String(process.env.DEMO_PIN_GUEST ?? "333333").trim(),
  };
  return pin === demoPins.cleaner || pin === demoPins.guest;
}

export function validateSessionUser(session: SessionPayload | null): SessionPayload | null {
  if (!session) return null;
  
  // Per guest/cleaner: verificare che il PIN esista ancora
  if ((session.role === "guest" || session.role === "cleaner") && session.pin) {
    // I demo pins non sono nello store, quindi li accettiamo sempre
    if (isDemoPin(session.pin)) {
      return session;
    }
    
    const pinRec = getPin(session.pin);
    if (!pinRec) {
      // PIN revocato, sessione invalida
      return null;
    }
    // Verificare anche validità temporale del PIN
    const now = Date.now();
    const from = pinRec.validFrom ?? pinRec.createdAt;
    const to = pinRec.validTo ?? pinRec.expiresAt ?? pinRec.createdAt;
    if (now < from || now > to) {
      return null; // PIN scaduto
    }
    // PIN valido, sessione valida
    return session;
  }
  
  // Per guest/cleaner senza PIN (retrocompatibilità): accetta la sessione
  // Le nuove sessioni includeranno sempre il PIN
  if (!session.userId) return session;

  // Per host/tech: validazione utente esistente
  // Assicurati che gli utenti demo esistano (importante per serverless/Render)
  const SHOULD_SEED = process.env.DEMO_MODE === "1" || process.env.NODE_ENV !== "production";
  
  if (SHOULD_SEED) {
    const techUser = getUserByUsername("tech");
    const hostUser = getUserByUsername("host");
    
    if (!techUser) {
      try {
        createUser({ username: "tech", password: "tech123", role: "tech" });
      } catch {
        // Ignora se già esiste
      }
    }
    if (!hostUser) {
      try {
        createUser({ username: "host", password: "host123", role: "host", clientId: "global-properties" });
      } catch {
        // Ignora se già esiste
      }
    }
  }
  
  let user = getUser(session.userId);
  
  // Se l'utente non è trovato per userId (es. store resettato), prova per username
  if (!user && (session.role === "tech" || session.role === "host")) {
    user = getUserByUsername(session.role); // Cerca "tech" o "host"
  }

  if (!user || !user.enabled) return null;
  return session;
}
