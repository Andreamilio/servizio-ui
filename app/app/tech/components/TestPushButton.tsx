"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { Bell } from "lucide-react";

const notificationTypes = [
  {
    id: "porta-aperta",
    title: "easy stay",
    message: "porta aperta",
  },
  {
    id: "porta-chiusa",
    title: "easy stay",
    message: "porta chiusa",
  },
  {
    id: "fumo",
    title: "easy stay",
    message: "rilevato fumo nell'appartamento",
  },
  {
    id: "riscaldamento",
    title: "easy stay",
    message: "rilevato riscaldamento acceso con ospite fuori",
  },
] as const;

export function TestPushButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>(notificationTypes[0].id);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  async function handleTestPush() {
    setIsLoading(true);
    setResult(null);

    const notification = notificationTypes.find((n) => n.id === selectedType) || notificationTypes[0];

    try {
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: notification.title,
          message: notification.message,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Errore invio notifica");
      }

      if (data.sent === 0) {
        setResult({
          success: false,
          message: data.errors && data.errors.length > 0 
            ? `Errore: ${data.errors[0]}` 
            : "Nessuna notifica inviata. Verifica che le notifiche siano abilitate.",
        });
      } else {
        setResult({
          success: true,
          message: `Notifica inviata con successo a ${data.sent} dispositivo/i su ${data.total}${data.failed > 0 ? ` (${data.failed} fallite)` : ''}`,
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || "Errore durante l'invio della notifica",
      });
    } finally {
      setIsLoading(false);
      // Rimuovi il messaggio dopo 5 secondi
      setTimeout(() => setResult(null), 5000);
    }
  }

  const selectedNotification = notificationTypes.find((n) => n.id === selectedType) || notificationTypes[0];

  return (
    <div className="space-y-2">
      <select
        value={selectedType}
        onChange={(e) => setSelectedType(e.target.value)}
        disabled={isLoading}
        className="w-full rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {notificationTypes.map((notif) => (
          <option key={notif.id} value={notif.id}>
            {notif.message}
          </option>
        ))}
      </select>
      
      <Button
        onClick={handleTestPush}
        disabled={isLoading}
        variant="secondary"
        size="sm"
        icon={Bell}
        iconPosition="left"
        className="w-full"
      >
        {isLoading ? "Invio in corso..." : `Invia: ${selectedNotification.message}`}
      </Button>
      {result && (
        <div
          className={`text-xs p-2 rounded-lg ${
            result.success
              ? "bg-emerald-500/10 border border-emerald-400/20 text-emerald-200"
              : "bg-red-500/10 border border-red-400/20 text-red-200"
          }`}
        >
          {result.message}
        </div>
      )}
    </div>
  );
}

