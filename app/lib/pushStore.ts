// app/lib/pushStore.ts
export type PushSubscriptionData = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userId?: string;
  createdAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __pushSubscriptions: Map<string, PushSubscriptionData> | undefined;
}

const subscriptionStore: Map<string, PushSubscriptionData> =
  global.__pushSubscriptions ?? new Map();
global.__pushSubscriptions = subscriptionStore;

/**
 * Salva una subscription push.
 * Usa l'endpoint come chiave unica.
 */
export function saveSubscription(
  subscription: PushSubscriptionData
): PushSubscriptionData {
  subscriptionStore.set(subscription.endpoint, subscription);
  return subscription;
}

/**
 * Elimina una subscription dato l'endpoint.
 */
export function deleteSubscription(endpoint: string): boolean {
  return subscriptionStore.delete(endpoint);
}

/**
 * Restituisce tutte le subscription registrate.
 */
export function listAllSubscriptions(): PushSubscriptionData[] {
  return Array.from(subscriptionStore.values());
}

/**
 * Restituisce una subscription dato l'endpoint.
 */
export function getSubscription(
  endpoint: string
): PushSubscriptionData | undefined {
  return subscriptionStore.get(endpoint);
}

/**
 * Elimina tutte le subscription (utile per reset/prototipo).
 */
export function deleteAllSubscriptions(): number {
  const count = subscriptionStore.size;
  subscriptionStore.clear();
  return count;
}

