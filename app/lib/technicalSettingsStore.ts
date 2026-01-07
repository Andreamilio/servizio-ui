// app/lib/technicalSettingsStore.ts

export type SmartLockProvider = "tedee" | "other" | null;

export type SmartLockSettings = {
  provider: SmartLockProvider;
  bridgeEndpoint: string;
  token: string;
  keypadId: string;
  capabilities: string[]; // es. ["pin_management", "lock_control"]
};

export type HomeAssistantSettings = {
  baseUrl: string; // es. "http://homeassistant.local:8123"
  token: string; // Long-Lived Access Token
  entityMapping: Record<string, string>; // mapping entity_id -> device type
};

export type NetworkSettings = {
  wireguardEndpoint: string;
  cloudflareEndpoint: string; // opzionale
  healthCheckUrl: string;
};

export type DiagnosticError = {
  timestamp: number;
  error: string;
  source: string; // "smart_lock" | "home_assistant" | "network"
};

export type DiagnosticTestResult = {
  success: boolean;
  message: string;
  timestamp: number;
};

export type Diagnostics = {
  lastErrors: DiagnosticError[];
  testResults: Record<string, DiagnosticTestResult>; // key: test name
};

export type DeviceApiSettings = {
  endpoint: string;
  token: string;
  deviceId: string; // ID specifico del device nell'API esterna
  additionalConfig: Record<string, string>; // Configurazioni aggiuntive (key-value)
};

export type TechnicalSettings = {
  aptId: string;
  smartLock: SmartLockSettings;
  homeAssistant: HomeAssistantSettings;
  network: NetworkSettings;
  diagnostics: Diagnostics;
  deviceApis: Map<string, DeviceApiSettings>; // key: DeviceType, value: DeviceApiSettings
};

declare global {
   
  var __technicalSettingsStore: Map<string, TechnicalSettings> | undefined;
}

const store: Map<string, TechnicalSettings> = global.__technicalSettingsStore ?? new Map();
global.__technicalSettingsStore = store;

function createEmptyTechnicalSettings(aptId: string): TechnicalSettings {
  return {
    aptId,
    smartLock: {
      provider: null,
      bridgeEndpoint: "",
      token: "",
      keypadId: "",
      capabilities: [],
    },
    homeAssistant: {
      baseUrl: "",
      token: "",
      entityMapping: {},
    },
    network: {
      wireguardEndpoint: "",
      cloudflareEndpoint: "",
      healthCheckUrl: "",
    },
    diagnostics: {
      lastErrors: [],
      testResults: {},
    },
    deviceApis: new Map(),
  };
}

export function getTechnicalSettings(aptId: string): TechnicalSettings {
  const existing = store.get(aptId);
  if (existing) {
    // Migrazione: assicurati che deviceApis esista (per settings create prima dell'aggiunta di deviceApis)
    if (!existing.deviceApis) {
      existing.deviceApis = new Map();
      store.set(aptId, existing);
    }
    return existing;
  }

  // Crea settings vuote se non esistono
  const empty = createEmptyTechnicalSettings(aptId);
  store.set(aptId, empty);
  return empty;
}

export function updateSmartLockSettings(
  aptId: string,
  settings: Partial<SmartLockSettings>
): TechnicalSettings {
  const current = getTechnicalSettings(aptId);
  const updated = {
    ...current,
    smartLock: {
      ...current.smartLock,
      ...settings,
    },
  };
  store.set(aptId, updated);
  return updated;
}

export function updateHomeAssistantSettings(
  aptId: string,
  settings: Partial<HomeAssistantSettings>
): TechnicalSettings {
  const current = getTechnicalSettings(aptId);
  const updated = {
    ...current,
    homeAssistant: {
      ...current.homeAssistant,
      ...settings,
    },
  };
  store.set(aptId, updated);
  return updated;
}

export function updateNetworkSettings(
  aptId: string,
  settings: Partial<NetworkSettings>
): TechnicalSettings {
  const current = getTechnicalSettings(aptId);
  const updated = {
    ...current,
    network: {
      ...current.network,
      ...settings,
    },
  };
  store.set(aptId, updated);
  return updated;
}

export function addDiagnosticError(
  aptId: string,
  error: Omit<DiagnosticError, "timestamp">
): void {
  const current = getTechnicalSettings(aptId);
  const newError: DiagnosticError = {
    ...error,
    timestamp: Date.now(),
  };
  const updated = {
    ...current,
    diagnostics: {
      ...current.diagnostics,
      lastErrors: [newError, ...current.diagnostics.lastErrors].slice(0, 50), // Keep last 50 errors
    },
  };
  store.set(aptId, updated);
}

export function updateTestResult(
  aptId: string,
  testName: string,
  result: Omit<DiagnosticTestResult, "timestamp">
): void {
  const current = getTechnicalSettings(aptId);
  const updated = {
    ...current,
    diagnostics: {
      ...current.diagnostics,
      testResults: {
        ...current.diagnostics.testResults,
        [testName]: {
          ...result,
          timestamp: Date.now(),
        },
      },
    },
  };
  store.set(aptId, updated);
}

export type RequiredSettingsTab = "home_assistant" | "network" | "diagnostics";

// Lazy imports per evitare circular dependency
let devicePackageStore: typeof import("./devicePackageStore") | null = null;
function getDevicePackageStore() {
  if (!devicePackageStore) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    devicePackageStore = require("./devicePackageStore");
  }
  return devicePackageStore;
}

export function getRequiredSettingsTabs(aptId: string): RequiredSettingsTab[] {
  const { getDevicePackage, getAllDeviceTypes } = getDevicePackageStore();
  const pkg = getDevicePackage(aptId);
  const deviceTypes = getAllDeviceTypes();

  const tabs: RequiredSettingsTab[] = [];
  let hasHomeAssistant = false;

  // Controlla i controller configurati per ogni device ENABLED (non solo controllabili)
  deviceTypes.forEach((deviceType: string) => {
    const item = pkg.devices.get(deviceType);
    // UPS non ha controller, saltalo
    if (deviceType === "ups") return;
    
    if (item?.enabled && item?.controller === "home_assistant") {
      hasHomeAssistant = true;
    }
    // Nota: device con controller="api" avranno modali/gestione dedicata per device (non un tab unico)
  });

  // Home Assistant: solo se c'è almeno un device con controller="home_assistant"
  if (hasHomeAssistant) {
    tabs.push("home_assistant");
  }

  // Network e Diagnostics: sempre presenti
  tabs.push("network");
  tabs.push("diagnostics");

  return tabs;
}

export function getDeviceApiSettings(aptId: string, deviceType: string): DeviceApiSettings | null {
  const current = getTechnicalSettings(aptId);
  return current.deviceApis.get(deviceType) ?? null;
}

export function updateDeviceApiSettings(
  aptId: string,
  deviceType: string,
  settings: Partial<DeviceApiSettings>
): DeviceApiSettings {
  const current = getTechnicalSettings(aptId);
  const existing = current.deviceApis.get(deviceType);
  
  const updated: DeviceApiSettings = {
    endpoint: settings.endpoint ?? existing?.endpoint ?? "",
    token: settings.token ?? existing?.token ?? "",
    deviceId: settings.deviceId ?? existing?.deviceId ?? "",
    additionalConfig: settings.additionalConfig ?? existing?.additionalConfig ?? {},
  };
  
  current.deviceApis.set(deviceType, updated);
  store.set(aptId, current);
  return updated;
}

