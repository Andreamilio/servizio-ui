// app/lib/vapidKeys.ts
// Genera e mantiene VAPID keys in memoria per il prototipo

import webpush from "web-push";

declare global {
  // eslint-disable-next-line no-var
  var __vapidKeys: { publicKey: string; privateKey: string } | undefined;
}

let vapidKeys = global.__vapidKeys;

if (!vapidKeys) {
  // Genera nuove keys se non esistono
  const generated = webpush.generateVAPIDKeys();
  vapidKeys = {
    publicKey: generated.publicKey,
    privateKey: generated.privateKey,
  };
  global.__vapidKeys = vapidKeys;
  console.log("[vapidKeys] VAPID keys generate (prototipo in-memory)");
}

/**
 * Restituisce la public key VAPID.
 */
export function getVapidPublicKey(): string {
  return vapidKeys!.publicKey;
}

/**
 * Restituisce la private key VAPID.
 */
export function getVapidPrivateKey(): string {
  return vapidKeys!.privateKey;
}

/**
 * Configura webpush con le VAPID keys.
 */
export function configureWebPush(): void {
  const contact = process.env.VAPID_CONTACT_EMAIL || "mailto:noreply@servizio.local";
  webpush.setVapidDetails(contact, vapidKeys!.publicKey, vapidKeys!.privateKey);
}

