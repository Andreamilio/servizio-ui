import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { readSession } from "@/app/lib/session";
import { getApt } from "@/app/lib/techstore";
import { getUser } from "@/app/lib/userStore";
import { AppLayout } from "@/app/components/layouts/AppLayout";
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
import { Box, VStack, HStack, Heading, Text } from "@chakra-ui/react";
import { Card, CardBody, CardHeader } from "@/app/components/ui/Card";
import { Link } from "@/app/components/ui/Link";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { Textarea } from "@/app/components/ui/Textarea";
import { Alert } from "@/app/components/ui/Alert";

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
    return (
      <Box p={6} color="var(--text-primary)">
        Non autorizzato
      </Box>
    );
  }

  const techUser = me.userId ? getUser(me.userId) : null;
  const p = await Promise.resolve(params);
  const aptId = String(p?.aptId ?? "");

  if (!aptId) {
    return (
      <AppLayout 
        role="tech"
        userInfo={techUser ? {
          userId: techUser.userId,
          username: techUser.username,
          profileImageUrl: techUser.profileImageUrl,
        } : undefined}
      >
        <Box p={{ base: 4, lg: 6 }}>
          <Link href="/app/tech" fontSize="sm" opacity={0.7} _hover={{ opacity: 1 }}>
            ← Back
          </Link>
          <Heading as="h2" size="lg" fontWeight="semibold" mt={3}>
            AptId mancante
          </Heading>
        </Box>
      </AppLayout>
    );
  }

  const apt = getApt(aptId);
  if (!apt) {
    return (
      <AppLayout 
        role="tech"
        userInfo={techUser ? {
          userId: techUser.userId,
          username: techUser.username,
          profileImageUrl: techUser.profileImageUrl,
        } : undefined}
      >
        <Box p={{ base: 4, lg: 6 }}>
          <Link href="/app/tech" fontSize="sm" opacity={0.7} _hover={{ opacity: 1 }}>
            ← Back
          </Link>
          <Heading as="h2" size="lg" fontWeight="semibold" mt={3}>
            Appartamento non trovato
          </Heading>
          <Text fontSize="sm" opacity={0.6}>
            AptId: {aptId}
          </Text>
        </Box>
      </AppLayout>
    );
  }

  const sp = await Promise.resolve(searchParams ?? {});
  const enabledDevices = getAllEnabledDevices(aptId);
  const requiredTabs = getRequiredSettingsTabs(aptId);
  
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
    const hasConfig = settings.homeAssistant.baseUrl && settings.homeAssistant.token;

    if (!hasConfig) {
      updateTestResult(aptId, "home_assistant", {
        success: false,
        message: "Configurazione incompleta: baseUrl e token richiesti",
      });
    } else {
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

  const tabs = allTabs.filter((tab) => requiredTabs.includes(tab.id as any));

  return (
    <AppLayout 
      role="tech"
      userInfo={techUser ? {
        userId: techUser.userId,
        username: techUser.username,
        profileImageUrl: techUser.profileImageUrl,
      } : undefined}
    >
      <Box p={{ base: 4, lg: 6 }}>
        <Box maxW="4xl" mx="auto">
          <VStack spacing={4} align="stretch">
            <Box display={{ base: "block", lg: "none" }}>
              <Link href={`/app/tech/apt/${aptId}`} fontSize="sm" opacity={0.7} _hover={{ opacity: 1 }}>
                ← Torna a {apt.aptName}
              </Link>
            </Box>

            <Link
              href={`/app/tech/apt/${aptId}`}
              fontSize="sm"
              opacity={0.7}
              _hover={{ opacity: 1 }}
              display={{ base: "none", lg: "inline-block" }}
            >
              ← Torna a {apt.aptName}
            </Link>

            <Card>
              <CardBody p={4}>
                <Box mb={4}>
                  <Heading as="h2" size="md" fontWeight="semibold" color="var(--text-primary)">
                    Technical Settings
                  </Heading>
                  <Text fontSize="sm" opacity={0.7} color="var(--text-secondary)">
                    {apt.aptName}
                  </Text>
                </Box>

                {enabledDevices.length === 0 && (
                  <Alert variant="warning" mb={4}>
                    <Text fontSize="sm">
                      ⚠️ Nessun device configurato. Configura prima i device nel{" "}
                      <Link
                        href={`/app/tech/apt/${aptId}/devices?edit=1`}
                        textDecoration="underline"
                        color="rgba(6, 182, 212, 1)"
                        _hover={{ color: "rgba(6, 182, 212, 0.8)" }}
                      >
                        Device Package
                      </Link>{" "}
                      per vedere le impostazioni disponibili.
                    </Text>
                  </Alert>
                )}
              </CardBody>
            </Card>

            <ApiDevicesSection
              aptId={aptId}
              devicesWithApi={devicesWithApi}
              saveDeviceApi={updateDeviceApi}
            />

            <Card>
              <CardBody p={4}>
                <VStack spacing={6} align="stretch">
                  {/* Tabs */}
                  <HStack gap={2} borderBottom="1px solid" borderColor="var(--border-light)" mb={6}>
                    {tabs.map((tab) => (
                      <Box
                        key={tab.id}
                        as={Link}
                        href={`/app/tech/apt/${aptId}/settings?tab=${tab.id}`}
                        px={4}
                        py={2}
                        fontSize="sm"
                        fontWeight="medium"
                        transition="all"
                        borderBottom="2px solid"
                        borderColor={activeTab === tab.id ? "rgba(6, 182, 212, 1)" : "transparent"}
                        color={activeTab === tab.id ? "rgba(6, 182, 212, 1)" : "var(--text-primary)"}
                        opacity={activeTab === tab.id ? 1 : 0.6}
                        _hover={{ opacity: 1 }}
                      >
                        {tab.label}
                      </Box>
                    ))}
                  </HStack>

                  {/* Tab Content */}
                  {activeTab === "home_assistant" && (
                    <Box>
                        <Box as="form" action={updateHomeAssistant}>
                          <VStack spacing={4} align="stretch">
                            <Input
                              type="text"
                              name="baseUrl"
                              label="Base URL"
                              defaultValue={settings.homeAssistant.baseUrl}
                              placeholder="http://homeassistant.local:8123"
                            />

                            <Input
                              type="password"
                              name="token"
                              label="Long-Lived Access Token"
                              defaultValue={settings.homeAssistant.token}
                              placeholder="Token"
                            />

                            <Textarea
                              name="entityMapping"
                              label="Entity Mapping (key=value, uno per riga)"
                              defaultValue={Object.entries(settings.homeAssistant.entityMapping)
                                .map(([k, v]) => `${k}=${v}`)
                                .join("\n")}
                              placeholder="switch.shelly_gate=relay_gate&#10;lock.tedee_101=smart_lock"
                              rows={6}
                              fontFamily="mono"
                              fontSize="sm"
                            />
                            <Text fontSize="xs" opacity={0.6} mt={1}>
                              Formato: entity_id=device_type (es. switch.shelly_gate=relay_gate)
                            </Text>

                            <HStack spacing={3} pt={4} borderTop="1px solid" borderColor="var(--border-light)">
                              <Button
                                type="submit"
                                borderRadius="xl"
                                bg="rgba(6, 182, 212, 0.2)"
                                _hover={{ bg: "rgba(6, 182, 212, 0.3)" }}
                                border="1px solid"
                                borderColor="rgba(6, 182, 212, 0.3)"
                                px={6}
                                py={3}
                                fontWeight="semibold"
                              >
                                Salva configurazione
                              </Button>
                            </HStack>
                          </VStack>
                        </Box>
                      </Box>
                    )}

                    {activeTab === "network" && (
                      <Box>
                        <Box as="form" action={updateNetwork}>
                          <VStack spacing={4} align="stretch">
                            <Input
                              type="text"
                              name="wireguardEndpoint"
                              label="WireGuard Endpoint"
                              defaultValue={settings.network.wireguardEndpoint}
                              placeholder="wg.example.com:51820"
                            />

                            <Input
                              type="text"
                              name="cloudflareEndpoint"
                              label="Cloudflare Endpoint (opzionale)"
                              defaultValue={settings.network.cloudflareEndpoint}
                              placeholder="https://tunnel.example.com"
                            />

                            <Input
                              type="text"
                              name="healthCheckUrl"
                              label="Health Check URL"
                              defaultValue={settings.network.healthCheckUrl}
                              placeholder="https://health.example.com/check"
                            />

                            <HStack spacing={3} pt={4} borderTop="1px solid" borderColor="var(--border-light)">
                              <Button
                                type="submit"
                                borderRadius="xl"
                                bg="rgba(6, 182, 212, 0.2)"
                                _hover={{ bg: "rgba(6, 182, 212, 0.3)" }}
                                border="1px solid"
                                borderColor="rgba(6, 182, 212, 0.3)"
                                px={6}
                                py={3}
                                fontWeight="semibold"
                              >
                                Salva configurazione
                              </Button>
                            </HStack>
                          </VStack>
                        </Box>
                      </Box>
                    )}

                    {activeTab === "diagnostics" && (
                      <Box>
                        <VStack spacing={6} align="stretch">
                          <Box>
                            <HStack justify="space-between" mb={4}>
                              <Text fontSize="sm" fontWeight="semibold">
                                Test di Connessione
                              </Text>
                            </HStack>
                            <HStack spacing={3}>
                              {requiredTabs.includes("home_assistant") && (
                                <Box as="form" action={testHomeAssistant}>
                                  <Button
                                    type="submit"
                                    borderRadius="xl"
                                    bg="rgba(6, 182, 212, 0.2)"
                                    _hover={{ bg: "rgba(6, 182, 212, 0.3)" }}
                                    border="1px solid"
                                    borderColor="rgba(6, 182, 212, 0.3)"
                                    px={4}
                                    py={2}
                                    fontWeight="semibold"
                                    fontSize="sm"
                                  >
                                    Test Home Assistant
                                  </Button>
                                </Box>
                              )}
                            </HStack>
                          </Box>

                          <Box>
                            <Text fontSize="sm" fontWeight="semibold" mb={4}>
                              Risultati Test
                            </Text>
                            {(() => {
                              const filteredResults = Object.entries(settings.diagnostics.testResults).filter(([testName]) => {
                                if (testName === "home_assistant") return requiredTabs.includes("home_assistant");
                                if (testName === "network") return requiredTabs.includes("network");
                                return true;
                              });

                              return filteredResults.length === 0 ? (
                                <Text fontSize="sm" opacity={0.6} py={4} textAlign="center">
                                  Nessun test eseguito. Esegui un test per vedere i risultati.
                                </Text>
                              ) : (
                                <VStack spacing={3} align="stretch">
                                  {filteredResults.map(([testName, result]) => (
                                    <Alert key={testName} variant={result.success ? "success" : "error"}>
                                      <VStack align="stretch" spacing={1} flex={1}>
                                        <HStack justify="space-between" mb={1}>
                                          <Text fontSize="sm" fontWeight="semibold" textTransform="capitalize">
                                            {testName.replace("_", " ")}
                                          </Text>
                                          <Text fontSize="xs" opacity={0.6}>
                                            {new Date(result.timestamp).toLocaleString()}
                                          </Text>
                                        </HStack>
                                        <Text fontSize="sm" opacity={0.8}>
                                          {result.message}
                                        </Text>
                                      </VStack>
                                    </Alert>
                                  ))}
                                </VStack>
                              );
                            })()}
                          </Box>

                          <Box>
                            <Text fontSize="sm" fontWeight="semibold" mb={4}>
                              Ultimi Errori
                            </Text>
                            {settings.diagnostics.lastErrors.length === 0 ? (
                              <Text fontSize="sm" opacity={0.6} py={4} textAlign="center">
                                Nessun errore registrato.
                              </Text>
                            ) : (
                              <VStack spacing={2} align="stretch">
                                {settings.diagnostics.lastErrors.slice(0, 10).map((error, idx) => (
                                  <Alert key={idx} variant="error">
                                    <VStack align="stretch" spacing={1} flex={1}>
                                      <HStack justify="space-between" mb={1}>
                                        <Text fontSize="xs" fontWeight="semibold" textTransform="capitalize">
                                          {error.source.replace("_", " ")}
                                        </Text>
                                        <Text fontSize="xs" opacity={0.6}>
                                          {new Date(error.timestamp).toLocaleString()}
                                        </Text>
                                      </HStack>
                                      <Text fontSize="sm" opacity={0.8}>
                                        {error.error}
                                      </Text>
                                    </VStack>
                                  </Alert>
                                ))}
                              </VStack>
                            )}
                          </Box>
                        </VStack>
                      </Box>
                    )}
                </VStack>
              </CardBody>
            </Card>
          </VStack>
        </Box>
      </Box>
    </AppLayout>
  );
}
