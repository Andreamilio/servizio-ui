"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Box, HStack, Text, IconButton } from "@chakra-ui/react";

export function PushNotificationToggle() {
  const [mounted, setMounted] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    checkSupport();
    checkSubscriptionStatus();
  }, []);

  function checkSupport() {
    if (typeof window === "undefined") return;
    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setIsSupported(supported);
  }

  async function checkSubscriptionStatus() {
    if (typeof window === "undefined" || !isSupported) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (err) {
      console.error("[PushNotificationToggle] Errore controllo subscription:", err);
    }
  }

  async function enableNotifications() {
    if (!isSupported) {
      setError("Le notifiche push non sono supportate nel tuo browser");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Permesso notifiche negato");
        setIsLoading(false);
        return;
      }

      let registration = await navigator.serviceWorker.ready;
      if (!registration) {
        registration = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
      }

      const vapidRes = await fetch("/api/push/vapid-public-key");
      if (!vapidRes.ok) {
        throw new Error("Errore ottenimento VAPID key");
      }
      const { publicKey } = await vapidRes.json();

      try {
        const existingSubscription = await registration.pushManager.getSubscription();
        if (existingSubscription) {
          await existingSubscription.unsubscribe();
          console.log("[PushNotificationToggle] Subscription esistente eliminata");
        }
      } catch (err) {
        console.warn("[PushNotificationToggle] Errore eliminazione subscription esistente:", err);
      }

      const applicationServerKey = urlBase64ToUint8Array(publicKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource,
      });

      const subData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey("p256dh")!),
          auth: arrayBufferToBase64(subscription.getKey("auth")!),
        },
      };

      const subscribeRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subData),
      });

      if (!subscribeRes.ok) {
        throw new Error("Errore registrazione subscription");
      }

      setIsSubscribed(true);
    } catch (err: any) {
      console.error("[PushNotificationToggle] Errore abilitazione:", err);
      setError(err.message || "Errore durante l'abilitazione delle notifiche");
    } finally {
      setIsLoading(false);
    }
  }

  async function disableNotifications() {
    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
    } catch (err: any) {
      console.error("[PushNotificationToggle] Errore disabilitazione:", err);
      setError(err.message || "Errore durante la disabilitazione");
    } finally {
      setIsLoading(false);
    }
  }

  if (!mounted) {
    return null;
  }

  if (!isSupported) {
    return null;
  }

  return (
    <HStack spacing={2}>
      {error && (
        <Text
          fontSize="xs"
          color="var(--accent-error)"
          maxW="150px"
          isTruncated
          title={error}
        >
          {error}
        </Text>
      )}
      <IconButton
        onClick={isSubscribed ? disableNotifications : enableNotifications}
        disabled={isLoading}
        aria-label={isSubscribed ? "Disabilita notifiche" : "Abilita notifiche"}
        title={isSubscribed ? "Notifiche abilitate" : "Abilita notifiche"}
        display="flex"
        alignItems="center"
        justifyContent="center"
        w={10}
        h={10}
        borderRadius="full"
        bg="var(--bg-card)"
        border="1px solid"
        borderColor="var(--border-light)"
        _hover={{ opacity: 0.8 }}
        transition="opacity"
        opacity={isLoading ? 0.5 : 1}
        icon={
          isSubscribed ? (
            <Bell size={20} color="var(--accent-primary)" />
          ) : (
            <BellOff size={20} color="var(--text-primary)" style={{ opacity: 0.6 }} />
          )
        }
      />
    </HStack>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
