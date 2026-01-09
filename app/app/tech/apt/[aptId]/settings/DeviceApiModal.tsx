"use client";

import { useState } from "react";
import { VStack, HStack, Text, Box } from "@chakra-ui/react";
import { getDeviceLabel, type DeviceType } from "@/app/lib/devicePackageTypes";
import type { DeviceApiSettings } from "@/app/lib/technicalSettingsStore";
import { Modal } from "@/app/components/ui/Modal";
import { Input } from "@/app/components/ui/Input";
import { Button } from "@/app/components/ui/Button";

type DeviceApiModalProps = {
  deviceType: DeviceType;
  aptId: string;
  initialSettings: DeviceApiSettings | null;
  onClose: () => void;
  onSave: (settings: DeviceApiSettings) => Promise<void>;
};

export function DeviceApiModal({
  deviceType,
  aptId,
  initialSettings,
  onClose,
  onSave,
}: DeviceApiModalProps) {
  const [endpoint, setEndpoint] = useState(initialSettings?.endpoint ?? "");
  const [token, setToken] = useState(initialSettings?.token ?? "");
  const [deviceId, setDeviceId] = useState(initialSettings?.deviceId ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        endpoint,
        token,
        deviceId,
        additionalConfig: initialSettings?.additionalConfig ?? {},
      });
      onClose();
    } catch (error) {
      console.error("Error saving device API settings:", error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Configurazione API"
      size="lg"
    >
      <VStack spacing={4} align="stretch">
        <Box mb={4}>
          <Text fontSize="sm" color="var(--text-secondary)">
            {getDeviceLabel(deviceType)}
          </Text>
        </Box>

        <Box as="form" onSubmit={handleSubmit}>
          <VStack spacing={4} align="stretch">
            <Input
              label="Endpoint"
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://api.example.com"
              required
            />

            <Input
              label="Token / API Key"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="API token"
            />

            <Input
              label="Device ID"
              type="text"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="ID del device nell'API esterna"
            />

            <HStack spacing={3} pt={4} borderTop="1px solid" borderColor="var(--border-light)">
              <Button
                type="submit"
                variant="primary"
                disabled={saving}
                fullWidth
              >
                {saving ? "Salvataggio..." : "Salva configurazione"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                fullWidth
              >
                Annulla
              </Button>
            </HStack>
          </VStack>
        </Box>
      </VStack>
    </Modal>
  );
}
