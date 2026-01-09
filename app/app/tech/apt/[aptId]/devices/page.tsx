import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { readSession } from "@/app/lib/session";
import { getApt } from "@/app/lib/techstore";
import { getUser } from "@/app/lib/userStore";
import { AppLayout } from "@/app/components/layouts/AppLayout";
import {
  getDevicePackage,
  getAllDeviceTypes,
  getDeviceLabel,
  getAllEnabledDevices,
  isDeviceControllable,
  getDeviceState,
  setDeviceEnabled,
  setDeviceControllable,
  setDeviceController,
  getAllDevices,
  type DeviceController,
} from "@/app/lib/devicePackageStore";
import { DeviceTable } from "./DeviceTable";
import { Box, VStack, HStack, Heading, Text } from "@chakra-ui/react";
import { Card, CardBody, CardHeader } from "@/app/components/ui/Card";
import { Link } from "@/app/components/ui/Link";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Badge";

export const dynamic = "force-dynamic";

export default async function TechDevicesPage({
  params,
  searchParams,
}: {
  params: { aptId: string } | Promise<{ aptId: string }>;
  searchParams?: { edit?: string } | Promise<{ edit?: string }>;
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
  const isEditMode = sp.edit === "1";

  const devicePackage = getDevicePackage(aptId);
  const allDevicesMap = getAllDevices(aptId);
  const deviceTypes = getAllDeviceTypes();
  
  const allDevices = Array.from(allDevicesMap.entries()).map(([deviceType, item]) => ({
    deviceType,
    ...item,
  }));

  async function updateDevicePackage(formData: FormData) {
    "use server";

    deviceTypes.forEach((deviceType) => {
      const enabledKey = `device_${deviceType}_enabled`;
      const controllableKey = `device_${deviceType}_controllable`;
      const controllerKey = `device_${deviceType}_controller`;

      const enabled = formData.get(enabledKey) === "on";
      const controllable = formData.get(controllableKey) === "on";
      const controllerValue = formData.get(controllerKey) as string;
      const controller: DeviceController = (controllerValue && controllerValue !== "") 
        ? (controllerValue as DeviceController)
        : "home_assistant";

      setDeviceEnabled(aptId, deviceType, enabled);
      if (enabled) {
        if (deviceType !== "ups") {
          setDeviceControllable(aptId, deviceType, controllable);
          setDeviceController(aptId, deviceType, controller);
        }
      }
    });

    revalidatePath(`/app/tech/apt/${aptId}/devices`);
    revalidatePath(`/app/tech/apt/${aptId}`);
    revalidatePath(`/app/tech/apt/${aptId}/settings`);
    redirect(`/app/tech/apt/${aptId}/devices`);
  }

  // Vista di sola lettura (default)
  if (!isEditMode) {
    const enabledDevices = getAllEnabledDevices(aptId);

    return (
      <AppLayout 
        role="tech"
        userInfo={techUser ? {
          userId: techUser.userId,
          username: techUser.username,
          profileImageUrl: techUser.profileImageUrl,
        } : undefined}
      >
        <Box maxW="4xl" mx="auto" p={{ base: 4, lg: 6 }}>
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
                <VStack spacing={4} align="stretch">
                  <HStack justify="space-between" mb={4}>
                    <Box>
                      <Heading as="h2" size="md" fontWeight="semibold" color="var(--text-primary)">
                        Device Package
                      </Heading>
                      <Text fontSize="sm" opacity={0.7}>
                        {apt.aptName}
                      </Text>
                    </Box>
                    <Button
                      as={Link}
                      href={`/app/tech/apt/${aptId}/devices?edit=1`}
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
                      Modifica
                    </Button>
                  </HStack>

                  {enabledDevices.length === 0 ? (
                    <Text fontSize="sm" opacity={0.6} py={8} textAlign="center">
                      Nessun device configurato. Clicca "Modifica" per aggiungere device.
                    </Text>
                  ) : (
                    <VStack spacing={2} align="stretch">
                      {enabledDevices.map((deviceType) => {
                        const controllable = isDeviceControllable(aptId, deviceType);
                        const state = getDeviceState(aptId, deviceType);
                        const label = getDeviceLabel(deviceType);
                        const isOnline = state === "online";

                        return (
                          <Card key={deviceType} variant="outlined">
                            <CardBody p={3}>
                              <HStack justify="space-between" gap={3}>
                                <Box flex={1} minW={0}>
                                  <Text fontSize="sm" fontWeight="semibold">
                                    {label}
                                  </Text>
                                  <Text fontSize="xs" opacity={0.6} mt={0.5}>
                                    {deviceType}
                                  </Text>
                                </Box>
                                <HStack spacing={2}>
                                  <Badge
                                    variant={isOnline ? "success" : "error"}
                                    size="sm"
                                    px={3}
                                    py={1}
                                    borderRadius="lg"
                                    fontSize="xs"
                                  >
                                    {state.toUpperCase()}
                                  </Badge>
                                  <Badge
                                    variant="default"
                                    size="sm"
                                    px={3}
                                    py={1}
                                    borderRadius="lg"
                                    fontSize="xs"
                                  >
                                    {controllable ? "Controllabile" : "Solo lettura"}
                                  </Badge>
                                </HStack>
                              </HStack>
                            </CardBody>
                          </Card>
                        );
                      })}
                    </VStack>
                  )}
                </VStack>
              </CardBody>
            </Card>
          </VStack>
        </Box>
      </AppLayout>
    );
  }

  // Modalità edit: form completo
  return (
    <AppLayout 
      role="tech"
      userInfo={techUser ? {
        userId: techUser.userId,
        username: techUser.username,
        profileImageUrl: techUser.profileImageUrl,
      } : undefined}
    >
      <Box maxW="4xl" mx="auto" p={{ base: 4, lg: 6 }}>
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
              <VStack spacing={4} align="stretch">
                <Box mb={4}>
                  <Heading as="h2" size="md" fontWeight="semibold" color="var(--text-primary)">
                    Device Package
                  </Heading>
                  <Text fontSize="sm" opacity={0.7} color="var(--text-secondary)">
                    {apt.aptName}
                  </Text>
                </Box>

                <Box as="form" action={updateDevicePackage}>
                  <VStack spacing={4} align="stretch">
                    <DeviceTable deviceTypes={deviceTypes} allDevices={allDevices} />

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
                      <Button
                        as={Link}
                        href={`/app/tech/apt/${aptId}/devices`}
                        variant="secondary"
                        borderRadius="xl"
                        px={6}
                        py={3}
                        fontWeight="semibold"
                      >
                        Annulla
                      </Button>
                    </HStack>
                  </VStack>
                </Box>

                <Text mt={4} fontSize="xs" opacity={0.6}>
                  Nota: La checkbox "Controllabile" è disponibile solo se "Presente" è selezionata. Se un device non è presente, non verrà mostrato nelle viste Tech/Host/Guest.
                </Text>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Box>
    </AppLayout>
  );
}
