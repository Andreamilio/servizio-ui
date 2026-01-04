import crypto from "crypto";
import { getUser, getUserByUsername, createUser } from "./userStore";

const secret = process.env.APP_SECRET || "dev-secret-change-me";

type SessionPayload = {
  role: "host" | "tech" | "guest" | "cleaner";
  aptId: string;
  userId?: string; // userId per host/tech (opzionale per retrocompatibilità)
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
export function validateSessionUser(session: SessionPayload | null): SessionPayload | null {
  if (!session) return null;
  if (!session.userId) return session; // Guest/cleaner (PIN login)

  // Assicurati che gli utenti demo esistano (importante per serverless/Render)
  const SHOULD_SEED = process.env.DEMO_MODE === "1" || process.env.NODE_ENV !== "production";
  
  if (SHOULD_SEED) {
    const techUser = getUserByUsername("tech");
    const hostUser = getUserByUsername("host");
    
    if (!techUser) {
      try {
        createUser({ username: "tech", password: "tech123", role: "tech" });
      } catch (error) {
        // Ignora se già esiste
      }
    }
    if (!hostUser) {
      try {
        createUser({ username: "host", password: "host123", role: "host", clientId: "global-properties" });
      } catch (error) {
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
