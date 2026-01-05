"use client";

import { useState } from "react";
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
      <div className="mb-4">
        <p className="text-sm text-[var(--text-secondary)]">{getDeviceLabel(deviceType)}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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

        <div className="flex gap-3 pt-4 border-t border-[var(--border-light)]">
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
        </div>
      </form>
    </Modal>
  );
}

