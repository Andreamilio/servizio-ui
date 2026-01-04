// app/lib/userStore.ts
// Store in-memory per gestione utenti Tech/Host

import crypto from "crypto";

export type UserRole = "tech" | "host";

export type User = {
  userId: string;
  username: string;
  passwordHash: string; // hash bcrypt-like (pbkdf2)
  role: UserRole;
  clientId?: string; // solo per host, opzionale (se associato a un client specifico)
  enabled: boolean;
  createdAt: number;
  lastLoginAt?: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __userStore: Map<string, User> | undefined;
}

const store: Map<string, User> = global.__userStore ?? new Map();
global.__userStore = store;

// Password hashing usando pbkdf2 (built-in Node.js, no dependencies)
const PASSWORD_ITERATIONS = 100000;
const PASSWORD_KEYLEN = 64;
const PASSWORD_DIGEST = "sha512";

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, PASSWORD_KEYLEN, PASSWORD_DIGEST)
    .toString("hex");
  // Format: salt$hash (per poter verificare dopo)
  return `${salt}$${hash}`;
}

export function verifyPassword(password: string, passwordHash: string): boolean {
  const [salt, hash] = passwordHash.split("$");
  if (!salt || !hash) return false;
  const computedHash = crypto
    .pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, PASSWORD_KEYLEN, PASSWORD_DIGEST)
    .toString("hex");
  return computedHash === hash;
}

// Helper per generare userId
function generateUserId(): string {
  return `user-${crypto.randomUUID()}`;
}

/* ----------------------------------------
 * READ
 * ------------------------------------- */

export function getUserByUsername(username: string): User | null {
  const normalized = username.trim().toLowerCase();
  for (const user of store.values()) {
    if (user.username === normalized) return user;
  }
  return null;
}

export function getUser(userId: string): User | null {
  return store.get(userId) ?? null;
}

export function listUsers(): User[] {
  return Array.from(store.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export function listUsersByRole(role: UserRole): User[] {
  return Array.from(store.values())
    .filter((u) => u.role === role)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function listHostUsersByClient(clientId: string): User[] {
  return Array.from(store.values())
    .filter((u) => u.role === "host" && (u.clientId === clientId || !u.clientId))
    .sort((a, b) => b.createdAt - a.createdAt);
}

/* ----------------------------------------
 * WRITE
 * ------------------------------------- */

export function createUser(params: {
  username: string;
  password: string;
  role: UserRole;
  clientId?: string;
}): User {
  const { username, password, role, clientId } = params;

  // Verifica username unico
  const existing = getUserByUsername(username);
  if (existing) {
    throw new Error(`Username "${username}" già esistente`);
  }

  const userId = generateUserId();
  const user: User = {
    userId,
    username: username.trim().toLowerCase(),
    passwordHash: hashPassword(password),
    role,
    clientId: clientId?.trim() || undefined,
    enabled: true,
    createdAt: Date.now(),
  };

  store.set(userId, user);
  return user;
}

export function updateUser(userId: string, updates: Partial<Omit<User, "userId" | "passwordHash" | "createdAt">>): User | null {
  const user = store.get(userId);
  if (!user) return null;

  // Se username è fornito, normalizzalo e controlla se è cambiato
  let normalizedUsername: string = user.username; // Default: mantieni lo username esistente
  if (updates.username !== undefined) {
    const newUsername = updates.username.trim().toLowerCase();
    
    // Verifica username unico solo se effettivamente cambiato (confronto dopo normalizzazione)
    if (newUsername !== user.username) {
      // Cerca se esiste già un altro utente con questo username (escludendo l'utente corrente)
      for (const otherUser of store.values()) {
        if (otherUser.userId !== userId && otherUser.username === newUsername) {
          throw new Error(`Username "${newUsername}" già esistente`);
        }
      }
    }
    
    normalizedUsername = newUsername;
  }

  const { username: _, ...updatesWithoutUsername } = updates;
  const updated: User = {
    ...user,
    ...updatesWithoutUsername,
    username: normalizedUsername,
  };

  store.set(userId, updated);
  return updated;
}

export function updateUserPassword(userId: string, newPassword: string): User | null {
  const user = store.get(userId);
  if (!user) return null;

  const updated: User = {
    ...user,
    passwordHash: hashPassword(newPassword),
  };

  store.set(userId, updated);
  return updated;
}

export function disableUser(userId: string): User | null {
  return updateUser(userId, { enabled: false });
}

export function enableUser(userId: string): User | null {
  return updateUser(userId, { enabled: true });
}

export function deleteUser(userId: string): boolean {
  return store.delete(userId);
}

export function recordUserLogin(userId: string): void {
  const user = store.get(userId);
  if (user) {
    user.lastLoginAt = Date.now();
    store.set(userId, user);
  }
}

/* ----------------------------------------
 * AUTHENTICATION
 * ------------------------------------- */

export function authenticateUser(username: string, password: string): User | null {
  // Assicurati che gli utenti demo esistano (importante per serverless/Render)
  const SHOULD_SEED = process.env.DEMO_MODE === "1" || process.env.NODE_ENV !== "production";
  
  if (SHOULD_SEED) {
    const techUser = getUserByUsername("tech");
    const hostUser = getUserByUsername("host");
    
    if (!techUser) {
      try {
        createUser({ username: "tech", password: "tech123", role: "tech" });
        console.log("[userStore] ✅ Seeded demo user: tech/tech123");
      } catch (error: any) {
        // Ignora se già esiste (race condition)
        if (!error.message?.includes("già esistente")) console.error("[userStore] Seed error:", error);
      }
    }
    if (!hostUser) {
      try {
        createUser({ username: "host", password: "host123", role: "host", clientId: "global-properties" });
        console.log("[userStore] ✅ Seeded demo user: host/host123");
      } catch (error: any) {
        if (!error.message?.includes("già esistente")) console.error("[userStore] Seed error:", error);
      }
    }
  }
  
  const user = getUserByUsername(username);
  if (!user) return null;
  if (!user.enabled) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;

  recordUserLogin(user.userId);
  return user;
}

/* ----------------------------------------
 * DEV SEED
 * ------------------------------------- */

const SHOULD_SEED =
  process.env.DEMO_MODE === "1" || process.env.NODE_ENV !== "production";

if (SHOULD_SEED && store.size === 0) {
  // Demo users per prototipo
  // Tech user
  createUser({
    username: "tech",
    password: "tech123",
    role: "tech",
  });

  // Host user
  createUser({
    username: "host",
    password: "host123",
    role: "host",
    clientId: "global-properties",
  });

  console.log("[userStore] Seeded demo users: tech/tech123, host/host123");
}
