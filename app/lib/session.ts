import crypto from "crypto";

const secret = process.env.APP_SECRET || "dev-secret-change-me";

type SessionPayload = {
  role: "host" | "tech" | "guest" | "cleaner";
  aptId: string;
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