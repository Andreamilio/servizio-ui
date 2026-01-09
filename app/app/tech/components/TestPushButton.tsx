"use client";

import { useState } from "react";
import { VStack, Text } from "@chakra-ui/react";
import { Select } from "@/app/components/ui/Select";
import { Button } from "@/app/components/ui/Button";
import { Alert } from "@/app/components/ui/Alert";
import { Bell } from "lucide-react";

const notificationTypes = [
  {
    id: "porta-aperta",
    title: "🚪 Porta aperta",
    message: "È stata rilevata l'apertura della porta dell'appartamento.",
  },
  {
    id: "porta-chiusa",
    title: "🔒 Porta chiusa",
    message: "La porta dell'appartamento risulta ora chiusa.",
  },
  {
    id: "fumo",
    title: "🚨 Allarme fumo",
    message: "Rilevata presenza di fumo all'interno dell'appartamento.",
  },
  {
    id: "riscaldamento",
    title: "🌡️ Riscaldamento attivo",
    message: "Il riscaldamento è acceso mentre l'ospite risulta assente.",
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
      setTimeout(() => setResult(null), 5000);
    }
  }

  const selectedNotification = notificationTypes.find((n) => n.id === selectedType) || notificationTypes[0];

  return (
    <VStack spacing={2} align="stretch">
      <Select
        value={selectedType}
        onChange={(e) => setSelectedType(e.target.value)}
        disabled={isLoading}
        borderRadius="xl"
        bg="var(--bg-secondary)"
        border="1px solid"
        borderColor="var(--border-light)"
        px={4}
        py={2.5}
        fontSize="sm"
        color="var(--text-primary)"
        _focus={{ outline: "none", ring: "2px", ringColor: "var(--accent-primary)", borderColor: "transparent" }}
        _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
      >
        {notificationTypes.map((notif) => (
          <option key={notif.id} value={notif.id}>
            {notif.message}
          </option>
        ))}
      </Select>
      
      <Button
        onClick={handleTestPush}
        disabled={isLoading}
        variant="secondary"
        size="sm"
        icon={Bell}
        iconPosition="left"
        fullWidth
      >
        {isLoading ? "Invio in corso..." : `Invia: ${selectedNotification.message}`}
      </Button>
      {result && (
        <Alert variant={result.success ? "success" : "error"}>
          <Text fontSize="xs">
            {result.message}
          </Text>
        </Alert>
      )}
    </VStack>
  );
}
