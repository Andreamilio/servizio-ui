import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { readSession } from "@/app/lib/session";
import { getApt } from "@/app/lib/techstore";
import {
  getTechnicalSettings,
  updateHomeAssistantSettings,
  updateNetworkSettings,
  updateTestResult,
  getRequiredSettingsTabs,
  getDeviceApiSettings,
  updateDeviceApiSettings,
  type DeviceApiSettings,
} from "@/app/lib/technicalSettingsStore";
import { getAllEnabledDevices, getAllDevices, getDeviceLabel, type DeviceType } from "@/app/lib/devicePackageStore";
import { ApiDevicesSection } from "./ApiDevicesSection";

export const dynamic = "force-dynamic";

export default async function TechSettingsPage({
  params,
  searchParams,
}: {
  params: { aptId: string } | Promise<{ aptId: string }>;
  searchParams?: { tab?: string } | Promise<{ tab?: string }>;
}) {
  const cookieStore = await cookies();
  const sess = cookieStore.get("sess")?.value;
  const me = readSession(sess);

  if (!me || me.role !== "tech") {
    return <div className="p-6 text-white">Non autorizzato</div>;
  }

  const p = await Promise.resolve(params);
  const aptId = String(p?.aptId ?? "");

  if (!aptId) {
    return (
      <main className="min-h-screen bg-[#0a0d12] text-white p-4 lg:p-6">
        <Link className="text-sm opacity-70 hover:opacity-100" href="/app/tech">
          ← Back
        </Link>
        <div className="mt-3 text-lg font-semibold">AptId mancante</div>
      </main>
    );
  }

  const apt = getApt(aptId);
  if (!apt) {
    return (
      <main className="min-h-screen bg-[#0a0d12] text-white p-4 lg:p-6">
        <Link className="text-sm opacity-70 hover:opacity-100" href="/app/tech">
          ← Back
        </Link>
        <div className="mt-3 text-lg font-semibold">Appartamento non trovato</div>
        <div className="text-sm opacity-60">AptId: {aptId}</div>
      </main>
    );
  }

  const sp = await Promise.resolve(searchParams ?? {});
  const enabledDevices = getAllEnabledDevices(aptId);
  const requiredTabs = getRequiredSettingsTabs(aptId);
  
  // Se il tab richiesto non è disponibile, usa il primo disponibile
  const requestedTab = sp.tab;
  const activeTab = requestedTab && requiredTabs.includes(requestedTab as any)
    ? requestedTab
    : (requiredTabs[0] ?? "network");

  const settings = getTechnicalSettings(aptId);

  // Server Actions
  async function updateHomeAssistant(formData: FormData) {
    "use server";
    const baseUrl = (formData.get("baseUrl") as string) || "";
    const token = (formData.get("token") as string) || "";
    const entityMappingStr = (formData.get("entityMapping") as string) || "";

    // Parse entity mapping from textarea (key=value format, one per line)
    const entityMapping: Record<string, string> = {};
    entityMappingStr.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && trimmed.includes("=")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
          entityMapping[key.trim()] = valueParts.join("=").trim();
        }
      }
    });

    updateHomeAssistantSettings(aptId, {
      baseUrl,
      token,
      entityMapping,
    });

    revalidatePath(`/app/tech/apt/${aptId}/settings`);
    redirect(`/app/tech/apt/${aptId}/settings?tab=home_assistant`);
  }

  async function updateNetwork(formData: FormData) {
    "use server";
    const wireguardEndpoint = (formData.get("wireguardEndpoint") as string) || "";
    const cloudflareEndpoint = (formData.get("cloudflareEndpoint") as string) || "";
    const healthCheckUrl = (formData.get("healthCheckUrl") as string) || "";

    updateNetworkSettings(aptId, {
      wireguardEndpoint,
      cloudflareEndpoint,
      healthCheckUrl,
    });

    revalidatePath(`/app/tech/apt/${aptId}/settings`);
    redirect(`/app/tech/apt/${aptId}/settings?tab=network`);
  }

  async function testHomeAssistant() {
    "use server";
    // Mock test - in produzione chiamerà l'API reale
    const hasConfig = settings.homeAssistant.baseUrl && settings.homeAssistant.token;

    if (!hasConfig) {
      updateTestResult(aptId, "home_assistant", {
        success: false,
        message: "Configurazione incompleta: baseUrl e token richiesti",
      });
    } else {
      // Simula test (random success/failure per demo)
      const mockSuccess = Math.random() > 0.3;
      updateTestResult(aptId, "home_assistant", {
        success: mockSuccess,
        message: mockSuccess
          ? "Connessione riuscita. Home Assistant raggiungibile."
          : "Errore di connessione. Verificare URL e token.",
      });
    }

    revalidatePath(`/app/tech/apt/${aptId}/settings`);
    redirect(`/app/tech/apt/${aptId}/settings?tab=diagnostics`);
  }

  async function updateDeviceApi(deviceType: string, settings: DeviceApiSettings) {
    "use server";
    updateDeviceApiSettings(aptId, deviceType, settings);
    revalidatePath(`/app/tech/apt/${aptId}/settings`);
  }

  // Trova device con controller="api"
  const allDevicesMap = getAllDevices(aptId);
  const devicesWithApi: Array<{ deviceType: DeviceType; settings: DeviceApiSettings | null }> = [];
  allDevicesMap.forEach((item, deviceType) => {
    if (item.enabled && item.controller === "api" && deviceType !== "ups") {
      const apiSettings = getDeviceApiSettings(aptId, deviceType);
      devicesWithApi.push({ deviceType, settings: apiSettings });
    }
  });

  const allTabs = [
    { id: "home_assistant", label: "Home Assistant" },
    { id: "network", label: "Network" },
    { id: "diagnostics", label: "Diagnostics" },
  ];

  // Filtra i tab in base a quelli richiesti dai device configurati
  const tabs = allTabs.filter((tab) => requiredTabs.includes(tab.id as any));

  return (
    <main className="min-h-screen bg-[#0a0d12] text-white p-4 lg:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="lg:hidden">
          <Link className="text-sm opacity-70 hover:opacity-100" href={`/app/tech/apt/${aptId}`}>
            ← Torna a {apt.aptName}
          </Link>
        </div>

        <Link className="hidden lg:inline-block text-sm opacity-70 hover:opacity-100" href={`/app/tech/apt/${aptId}`}>
          ← Torna a {apt.aptName}
        </Link>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="mb-4">
            <div className="text-lg font-semibold">Technical Settings</div>
            <div className="text-sm opacity-70">{apt.aptName}</div>
          </div>

          {enabledDevices.length === 0 && (
            <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-400/20 text-sm">
              ⚠️ Nessun device configurato. Configura prima i device nel{" "}
              <Link
                href={`/app/tech/apt/${aptId}/devices?edit=1`}
                className="underline text-cyan-400 hover:text-cyan-300"
              >
                Device Package
              </Link>{" "}
              per vedere le impostazioni disponibili.
            </div>
          )}
        </div>

        <ApiDevicesSection
          aptId={aptId}
          devicesWithApi={devicesWithApi}
          saveDeviceApi={updateDeviceApi}
        />

        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          {/* Tabs */}
              <div className="flex gap-2 mb-6 border-b border-white/10">
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                href={`/app/tech/apt/${aptId}/settings?tab=${tab.id}`}
                className={`px-4 py-2 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? "border-b-2 border-cyan-400 text-cyan-200"
                    : "opacity-60 hover:opacity-100"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "home_assistant" && (
            <form action={updateHomeAssistant} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Base URL</label>
                <input
                  type="text"
                  name="baseUrl"
                  defaultValue={settings.homeAssistant.baseUrl}
                  placeholder="http://homeassistant.local:8123"
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Long-Lived Access Token</label>
                <input
                  type="password"
                  name="token"
                  defaultValue={settings.homeAssistant.token}
                  placeholder="Token"
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Entity Mapping (key=value, uno per riga)</label>
                <textarea
                  name="entityMapping"
                  defaultValue={Object.entries(settings.homeAssistant.entityMapping)
                    .map(([k, v]) => `${k}=${v}`)
                    .join("\n")}
                  placeholder="switch.shelly_gate=relay_gate&#10;lock.tedee_101=smart_lock"
                  rows={6}
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-sm"
                />
                <div className="text-xs opacity-60 mt-1">
                  Formato: entity_id=device_type (es. switch.shelly_gate=relay_gate)
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button
                  type="submit"
                  className="rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 px-6 py-3 font-semibold"
                >
                  Salva configurazione
                </button>
              </div>
            </form>
          )}

          {activeTab === "network" && (
            <form action={updateNetwork} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">WireGuard Endpoint</label>
                <input
                  type="text"
                  name="wireguardEndpoint"
                  defaultValue={settings.network.wireguardEndpoint}
                  placeholder="wg.example.com:51820"
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Cloudflare Endpoint (opzionale)</label>
                <input
                  type="text"
                  name="cloudflareEndpoint"
                  defaultValue={settings.network.cloudflareEndpoint}
                  placeholder="https://tunnel.example.com"
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Health Check URL</label>
                <input
                  type="text"
                  name="healthCheckUrl"
                  defaultValue={settings.network.healthCheckUrl}
                  placeholder="https://health.example.com/check"
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button
                  type="submit"
                  className="rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 px-6 py-3 font-semibold"
                >
                  Salva configurazione
                </button>
              </div>
            </form>
          )}

          {activeTab === "diagnostics" && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-semibold">Test di Connessione</div>
                </div>
                <div className="flex gap-3">
                  {requiredTabs.includes("home_assistant") && (
                    <form action={testHomeAssistant}>
                      <button
                        type="submit"
                        className="rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 px-4 py-2 font-semibold text-sm"
                      >
                        Test Home Assistant
                      </button>
                    </form>
                  )}
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold mb-4">Risultati Test</div>
                {(() => {
                  // Filtra i risultati dei test in base ai tab disponibili
                  const filteredResults = Object.entries(settings.diagnostics.testResults).filter(([testName]) => {
                    // Mostra solo i test per i tab che sono presenti
                    // Nota: "smart_lock" non è più un tab valido, quindi i suoi test vengono sempre mostrati
                    if (testName === "home_assistant") return requiredTabs.includes("home_assistant");
                    if (testName === "network") return requiredTabs.includes("network");
                    return true; // Altri test (es. generici, smart_lock) vengono mostrati sempre
                  });

                  return filteredResults.length === 0 ? (
                    <div className="text-sm opacity-60 py-4 text-center">
                      Nessun test eseguito. Esegui un test per vedere i risultati.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredResults.map(([testName, result]) => (
                        <div
                          key={testName}
                          className={`rounded-xl border p-3 ${
                            result.success
                              ? "bg-emerald-500/10 border-emerald-400/20"
                              : "bg-red-500/10 border-red-400/20"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-sm font-semibold capitalize">{testName.replace("_", " ")}</div>
                            <div className="text-xs opacity-60">
                              {new Date(result.timestamp).toLocaleString()}
                            </div>
                          </div>
                          <div className="text-sm opacity-80">{result.message}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              <div>
                <div className="text-sm font-semibold mb-4">Ultimi Errori</div>
                {settings.diagnostics.lastErrors.length === 0 ? (
                  <div className="text-sm opacity-60 py-4 text-center">Nessun errore registrato.</div>
                ) : (
                  <div className="space-y-2">
                    {settings.diagnostics.lastErrors.slice(0, 10).map((error, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl bg-red-500/10 border border-red-400/20 p-3"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs font-semibold capitalize">{error.source.replace("_", " ")}</div>
                          <div className="text-xs opacity-60">
                            {new Date(error.timestamp).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-sm opacity-80">{error.error}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

