// app/lib/devicePackageStore.ts

// Re-export types and pure functions from devicePackageTypes for backward compatibility
export type {
  DeviceType,
  DeviceController,
  DevicePackageItem,
  DevicePackage,
} from "./devicePackageTypes";
export { getDeviceLabel, getAllDeviceTypes } from "./devicePackageTypes";

// Import for internal use
import { getAllDeviceTypes, type DeviceType, type DevicePackageItem, type DevicePackage, type DeviceController } from "./devicePackageTypes";

declare global {
  // eslint-disable-next-line no-var
  var __devicePackageStore: Map<string, DevicePackage> | undefined;
}

const store: Map<string, DevicePackage> = global.__devicePackageStore ?? new Map();
global.__devicePackageStore = store;

function createEmptyDevicePackage(aptId: string): DevicePackage {
  const devices = new Map<DeviceType, DevicePackageItem>();
  getAllDeviceTypes().forEach((deviceType) => {
    devices.set(deviceType, {
      enabled: false,
      controllable: false, // Di default non controllabile (può essere attivato solo se enabled è true)
      controller: deviceType !== "ups" ? "home_assistant" : "home_assistant", // Default, ma UPS non lo usa realmente
    });
  });
  return { aptId, devices };
}

export function getDevicePackage(aptId: string): DevicePackage {
  const existing = store.get(aptId);
  if (existing) return existing;

  // Crea package vuoto se non esiste
  const empty = createEmptyDevicePackage(aptId);
  store.set(aptId, empty);
  return empty;
}

export function setDeviceEnabled(aptId: string, deviceType: DeviceType, enabled: boolean): void {
  const pkg = getDevicePackage(aptId);
  const item = pkg.devices.get(deviceType);
  if (!item) return;

  pkg.devices.set(deviceType, {
    ...item,
    enabled,
    // Se disabilitato, anche controllable diventa false, controller rimane (default)
    controllable: enabled && deviceType !== "ups" ? item.controllable : false,
    controller: enabled && deviceType !== "ups" ? (item.controller ?? "home_assistant") : "home_assistant",
  });
  store.set(aptId, pkg);
}

export function setDeviceControllable(aptId: string, deviceType: DeviceType, controllable: boolean): void {
  const pkg = getDevicePackage(aptId);
  const item = pkg.devices.get(deviceType);
  if (!item) return;

  // Controllabile può essere true solo se enabled è true
  if (!item.enabled && controllable) return;

  pkg.devices.set(deviceType, {
    ...item,
    controllable,
    // NON rimuoviamo controller qui - può servire anche solo per leggere stato
  });
  store.set(aptId, pkg);
}

export function setDeviceController(aptId: string, deviceType: DeviceType, controller: DeviceController): void {
  const pkg = getDevicePackage(aptId);
  const item = pkg.devices.get(deviceType);
  if (!item) return;

  // Controller può essere impostato se enabled è true (per leggere stato, anche se non controllabile)
  // UPS non ha controller
  if (!item.enabled || deviceType === "ups") return;

  pkg.devices.set(deviceType, {
    ...item,
    controller,
  });
  store.set(aptId, pkg);
}

export function getDeviceController(aptId: string, deviceType: DeviceType): DeviceController | null {
  const pkg = getDevicePackage(aptId);
  const item = pkg.devices.get(deviceType);
  // UPS non ha controller
  if (deviceType === "ups" || !item?.enabled) return null;
  return item.controller;
}

export function isDeviceEnabled(aptId: string, deviceType: DeviceType): boolean {
  const pkg = getDevicePackage(aptId);
  return pkg.devices.get(deviceType)?.enabled ?? false;
}

export function isDeviceControllable(aptId: string, deviceType: DeviceType): boolean {
  const pkg = getDevicePackage(aptId);
  return pkg.devices.get(deviceType)?.controllable ?? false;
}

export function getAllEnabledDevices(aptId: string): DeviceType[] {
  const pkg = getDevicePackage(aptId);
  const enabled: DeviceType[] = [];
  pkg.devices.forEach((item, deviceType) => {
    if (item.enabled) enabled.push(deviceType);
  });
  return enabled;
}

export function getAllDevices(aptId: string): Map<DeviceType, DevicePackageItem> {
  const pkg = getDevicePackage(aptId);
  return new Map(pkg.devices);
}

// Stati mock deterministi per prototipo
// Quando si collegheranno servizi reali, questi stati verranno da API (Home Assistant, Smart Lock, etc.)
export function getDeviceState(aptId: string, deviceType: DeviceType): "online" | "offline" {
  // Hash semplice e determinista basato su aptId + deviceType
  const key = `${aptId}_${deviceType}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // ~80% online, 20% offline
  const isOnline = (Math.abs(hash) % 10) < 8;
  return isOnline ? "online" : "offline";
}

