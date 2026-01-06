"use client";

import { getDeviceLabel, type DeviceType } from "@/app/lib/devicePackageTypes";
import type { DeviceApiSettings } from "@/app/lib/technicalSettingsStore";

type ApiDevicesListProps = {
  devicesWithApi: Array<{ deviceType: DeviceType; settings: DeviceApiSettings | null }>;
  onOpenModal: (deviceType: DeviceType) => void;
};

export function ApiDevicesList({ devicesWithApi, onOpenModal }: ApiDevicesListProps) {
  if (devicesWithApi.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] p-4">
      <div className="text-sm font-semibold mb-3">Device con API diretta</div>
      <div className="space-y-2">
        {devicesWithApi.map(({ deviceType, settings }) => (
          <div
            key={deviceType}
            className="flex items-center justify-between rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] p-3"
          >
            <div>
              <div className="text-sm font-semibold">{getDeviceLabel(deviceType)}</div>
              <div className="text-xs opacity-60 mt-0.5">
                {settings?.endpoint ? `Endpoint: ${settings.endpoint}` : "Non configurato"}
              </div>
            </div>
            <button
              onClick={() => onOpenModal(deviceType)}
              className="rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 px-4 py-2 font-semibold text-sm"
            >
              Configura
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

