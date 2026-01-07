// app/lib/devicePackageTypes.ts
// Types and pure utility functions that can be safely imported in Client Components
// This file has NO dependencies on global/store state

export type DeviceType =
  | "smart_lock"
  | "relay_gate"
  | "smoke_sensor"
  | "thermostat"
  | "alarm_sensors"
  | "lights"
  | "ring_cam"
  | "scenes"
  | "ups";

export type DeviceController = "api" | "home_assistant";

export type DevicePackageItem = {
  enabled: boolean;      // device presente nell'appartamento
  controllable: boolean; // device è controllabile (può essere comandato)
  controller: DeviceController; // API/controller per leggere stato e/o controllare (se enabled=true)
};

export type DevicePackage = {
  aptId: string;
  devices: Map<DeviceType, DevicePackageItem>;
};

// Pure function - no side effects, safe for Client Components
export function getDeviceLabel(deviceType: DeviceType): string {
  const labels: Record<DeviceType, string> = {
    smart_lock: "Smart Lock (porta appartamento)",
    relay_gate: "Relay cancello/portone (Shelly)",
    smoke_sensor: "Sensore fumo",
    thermostat: "Termostato",
    alarm_sensors: "Allarme + sensori porta/finestra",
    lights: "Luci (Shelly)",
    ring_cam: "Ring / cam",
    scenes: "Scene (preset)",
    ups: "UPS presente",
  };
  return labels[deviceType] ?? deviceType;
}

// Pure function - no side effects
export function getAllDeviceTypes(): DeviceType[] {
  return [
    "smart_lock",
    "relay_gate",
    "smoke_sensor",
    "thermostat",
    "alarm_sensors",
    "lights",
    "ring_cam",
    "scenes",
    "ups",
  ];
}


