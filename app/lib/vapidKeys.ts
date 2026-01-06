// app/lib/vapidKeys.ts
// Genera e mantiene VAPID keys in memoria per il prototipo
// Se disponibili, usa variabili d'ambiente per persistenza

import webpush from "web-push";

declare global {
  // eslint-disable-next-line no-var
  var __vapidKeys: { publicKey: string; privateKey: string } | undefined;
}

let vapidKeys = global.__vapidKeys;

if (!vapidKeys) {
  // Controlla se le keys sono in variabili d'ambiente (persistenza)
  const envPublicKey = process.env.VAPID_PUBLIC_KEY;
  const envPrivateKey = process.env.VAPID_PRIVATE_KEY;
  
  if (envPublicKey && envPrivateKey) {
    vapidKeys = {
      publicKey: envPublicKey,
      privateKey: envPrivateKey,
    };
    console.log("[vapidKeys] VAPID keys caricate da variabili d'ambiente");
  } else {
    // Genera nuove keys se non esistono
    const generated = webpush.generateVAPIDKeys();
    vapidKeys = {
      publicKey: generated.publicKey,
      privateKey: generated.privateKey,
    };
    global.__vapidKeys = vapidKeys;
    console.log("[vapidKeys] VAPID keys generate (prototipo in-memory)");
    console.log("[vapidKeys] ⚠️ IMPORTANTE: Aggiungi queste keys come variabili d'ambiente su Render:");
    console.log("[vapidKeys] VAPID_PUBLIC_KEY=" + generated.publicKey);
    console.log("[vapidKeys] VAPID_PRIVATE_KEY=" + generated.privateKey);
  }
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
  // Usa un formato email più standard per Apple/iOS
  const contact = process.env.VAPID_CONTACT_EMAIL || "mailto:admin@servizio.local";
  webpush.setVapidDetails(contact, vapidKeys!.publicKey, vapidKeys!.privateKey);
  console.log("[vapidKeys] WebPush configurato con contact:", contact);
}

