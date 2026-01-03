"use client";

import { useState } from "react";
import { getDeviceLabel, type DeviceType } from "@/app/lib/devicePackageTypes";
import type { DeviceApiSettings } from "@/app/lib/technicalSettingsStore";

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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a0d12] border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-lg font-semibold">Configurazione API</div>
              <div className="text-sm opacity-70">{getDeviceLabel(deviceType)}</div>
            </div>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Endpoint</label>
              <input
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="https://api.example.com"
                className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Token / API Key</label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="API token"
                className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Device ID</label>
              <input
                type="text"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder="ID del device nell'API esterna"
                className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-white/10">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 px-6 py-3 font-semibold disabled:opacity-50"
              >
                {saving ? "Salvataggio..." : "Salva configurazione"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3 font-semibold"
              >
                Annulla
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

