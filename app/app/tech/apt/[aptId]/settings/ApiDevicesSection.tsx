"use client";

import { useState } from "react";
import { ApiDevicesList } from "./ApiDevicesList";
import { DeviceApiModal } from "./DeviceApiModal";
import type { DeviceType } from "@/app/lib/devicePackageTypes";
import type { DeviceApiSettings } from "@/app/lib/technicalSettingsStore";

type ApiDevicesSectionProps = {
  devicesWithApi: Array<{ deviceType: DeviceType; settings: DeviceApiSettings | null }>;
  saveDeviceApi: (deviceType: string, settings: DeviceApiSettings) => Promise<void>;
};

export function ApiDevicesSection({ devicesWithApi, saveDeviceApi }: ApiDevicesSectionProps) {
  const [selectedDevice, setSelectedDevice] = useState<DeviceType | null>(null);
  const [currentSettings, setCurrentSettings] = useState<DeviceApiSettings | null>(null);

  function handleOpenModal(deviceType: DeviceType) {
    const deviceData = devicesWithApi.find((d) => d.deviceType === deviceType);
    setSelectedDevice(deviceType);
    setCurrentSettings(deviceData?.settings ?? null);
  }

  function handleCloseModal() {
    setSelectedDevice(null);
    setCurrentSettings(null);
  }

  async function handleSaveSettings(settings: DeviceApiSettings) {
    if (!selectedDevice) return;
    await saveDeviceApi(selectedDevice, settings);
    handleCloseModal();
    // Ricarica la pagina per vedere le modifiche
    window.location.reload();
  }

  return (
    <>
      <ApiDevicesList devicesWithApi={devicesWithApi} onOpenModal={handleOpenModal} />
      {selectedDevice && (
        <DeviceApiModal
          deviceType={selectedDevice}
          initialSettings={currentSettings}
          onClose={handleCloseModal}
          onSave={handleSaveSettings}
        />
      )}
    </>
  );
}


