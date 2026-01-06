"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { Bell } from "lucide-react";

export function TestPushButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  async function handleTestPush() {
    setIsLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Test Push Notification",
          message: "Questa è una notifica di test da Servizio UI!",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Errore invio notifica");
      }

      setResult({
        success: true,
        message: `Notifica inviata con successo a ${data.sent} dispositivo/i su ${data.total}`,
      });
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

  return (
    <div className="space-y-2">
      <Button
        onClick={handleTestPush}
        disabled={isLoading}
        variant="secondary"
        size="sm"
        icon={Bell}
        iconPosition="left"
        className="w-full"
      >
        {isLoading ? "Invio in corso..." : "Test Push"}
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

