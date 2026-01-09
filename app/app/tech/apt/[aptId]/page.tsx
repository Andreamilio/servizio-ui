import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { readSession, validateSessionUser } from "@/app/lib/session";

import {
  closeDoor,
  getApt,
  openDoor,
  openGate,
  revokeAccess,
  toggleVpn,
  toggleWan,
} from "@/app/lib/techstore";

import * as Store from "@/app/lib/store";
import { events_listByApt, events_log } from "@/app/lib/domain/eventsDomain";
import { getAllEnabledDevices, getDeviceState } from "@/app/lib/devicePackageStore";
import { getUser } from "@/app/lib/userStore";
import { AppLayout } from "@/app/components/layouts/AppLayout";
import { Box, VStack, HStack, Heading, Text, Grid, GridItem } from "@chakra-ui/react";
import { Card, CardBody, CardHeader } from "@/app/components/ui/Card";
import { Link } from "@/app/components/ui/Link";
import { Button } from "@/app/components/ui/Button";
import { StatusPill } from "@/app/components/ui/StatusPill";
import { Alert } from "@/app/components/ui/Alert";

export const dynamic = "force-dynamic";

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <Card variant="outlined">
      <CardBody px={3} py={2}>
        <Text fontSize="10px" textTransform="uppercase" letterSpacing="wider" opacity={0.6}>
          {label}
        </Text>
        <Text fontSize="sm" fontWeight="semibold">
          {value}
        </Text>
      </CardBody>
    </Card>
  );
}

export default async function TechAptPage({
  params,
}: {
  params: { aptId: string } | Promise<{ aptId: string }>;
}) {
  const cookieStore = await cookies();
  const sess = cookieStore.get("sess")?.value;
  const session = readSession(sess);
  const me = validateSessionUser(session);

  if (!me || me.role !== "tech") {
    if (session && session.userId && session.role === "tech") {
      redirect("/api/auth/logout");
    }
    return (
      <Box p={6} color="var(--text-primary)">
        Non autorizzato
      </Box>
    );
  }

  const p = await Promise.resolve(params);
  const aptId = String(p?.aptId ?? "");

  const techUser = me.userId ? getUser(me.userId) : null;

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
            AptId mancante (routing)
          </Heading>
          <Text fontSize="sm" opacity={0.6}>
            La route non sta passando correttamente il parametro: prova ad aprire
            <Text as="span" fontWeight="semibold"> /app/tech/apt/101</Text>
          </Text>
        </Box>
      </AppLayout>
    );
  }

  const apt = getApt(aptId);
  const aptLog = events_listByApt(Store, aptId, 20);
  const enabledDevices = getAllEnabledDevices(aptId);
  const deviceOnlineCount = enabledDevices.filter((dt) => getDeviceState(aptId, dt) === "online").length;

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

  async function actOpenDoor() {
    "use server";
    openDoor(aptId);
    events_log(Store, {
      aptId,
      type: "door_opened",
      actor: "tech",
      label: "Porta aperta (azione Tech)",
    });
    revalidatePath("/app/tech");
    revalidatePath(`/app/tech/apt/${aptId}`);
    redirect(`/app/tech/apt/${aptId}?r=${Date.now()}`);
  }

  async function actCloseDoor() {
    "use server";
    closeDoor(aptId);
    events_log(Store, {
      aptId,
      type: "door_closed",
      actor: "tech",
      label: "Porta chiusa (azione Tech)",
    });
    revalidatePath("/app/tech");
    revalidatePath(`/app/tech/apt/${aptId}`);
    redirect(`/app/tech/apt/${aptId}?r=${Date.now()}`);
  }

  async function actOpenGate() {
    "use server";
    openGate(aptId);
    events_log(Store, {
      aptId,
      type: "gate_opened",
      actor: "tech",
      label: "Portone aperto (azione Tech)",
    });
    revalidatePath("/app/tech");
    revalidatePath(`/app/tech/apt/${aptId}`);
    redirect(`/app/tech/apt/${aptId}?r=${Date.now()}`);
  }

  async function actRevoke() {
    "use server";
    Store.revokePinsByApt(aptId);
    revokeAccess(aptId);
    events_log(Store, {
      aptId,
      type: "pin_revoked",
      actor: "tech",
      label: "Revocati accessi (azione Tech)",
    });
    revalidatePath("/app/tech");
    revalidatePath(`/app/tech/apt/${aptId}`);
    redirect(`/app/tech/apt/${aptId}?r=${Date.now()}`);
  }

  async function actWan() {
    "use server";
    const apt = toggleWan(aptId);
    if (apt) {
      events_log(Store, {
        aptId,
        type: "wan_switched",
        actor: "tech",
        label: `WAN switched to ${apt.network === "main" ? "MAIN WAN" : "BACKUP WAN"}`,
      });
    }
    revalidatePath("/app/tech");
    revalidatePath(`/app/tech/apt/${aptId}`);
    redirect(`/app/tech/apt/${aptId}?r=${Date.now()}`);
  }

  async function actVpn() {
    "use server";
    const apt = toggleVpn(aptId);
    if (apt) {
      events_log(Store, {
        aptId,
        type: "vpn_toggled",
        actor: "tech",
        label: `VPN toggled ${apt.vpn.toUpperCase()}`,
      });
    }
    revalidatePath("/app/tech");
    revalidatePath(`/app/tech/apt/${aptId}`);
    redirect(`/app/tech/apt/${aptId}?r=${Date.now()}`);
  }

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
        <Box maxW="3xl" mx="auto">
          <VStack spacing={4} align="stretch">
            <Card display={{ base: "block", lg: "none" }}>
              <CardBody p={4}>
                <HStack justify="space-between" gap={3}>
                  <Box minW={0}>
                    <Text fontSize="xs" opacity={0.6}>TECH</Text>
                    <Text fontSize="sm" fontWeight="semibold" isTruncated>
                      {apt.aptName}
                    </Text>
                    <Text fontSize="xs" opacity={0.6} isTruncated>
                      {apt.group}
                    </Text>
                  </Box>
                  <Link href="/app/tech" fontSize="sm" opacity={0.7} _hover={{ opacity: 1 }}>
                    ← Back
                  </Link>
                </HStack>
              </CardBody>
            </Card>

            <Link
              href="/app/tech"
              fontSize="sm"
              opacity={0.7}
              _hover={{ opacity: 1 }}
              display={{ base: "none", lg: "inline-block" }}
            >
              ← Torna a Tech
            </Link>

            <Card>
              <CardBody p={4}>
                <VStack spacing={4} align="stretch">
                  <HStack justify="space-between" gap={3} flexDir={{ base: "column", sm: "row" }} align={{ base: "start", sm: "start" }}>
                    <Box>
                      <Heading as="h2" size="md" fontWeight="semibold">
                        {apt.aptName}
                      </Heading>
                      <Text fontSize="sm" opacity={0.7}>
                        {apt.group}
                      </Text>
                    </Box>

                    <Box textAlign={{ base: "left", sm: "right" }} fontSize="sm">
                      <Text opacity={0.6}>Last access</Text>
                      <Text fontWeight="semibold">
                        {apt.lastAccessLabel}
                      </Text>
                    </Box>
                  </HStack>

                  <Grid templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)" }} gap={3} fontSize="sm">
                    <Chip label="WAN" value={apt.network === "main" ? "MAIN WAN" : "BACKUP WAN"} />
                    <Chip label="VPN" value={apt.vpn.toUpperCase()} />
                    <Chip label="DOOR" value={apt.door.toUpperCase()} />

                    {apt.door === "unknown" && (
                      <GridItem colSpan={2}>
                        <Alert variant="warning" mt={3}>
                          <HStack spacing={2} align="start">
                            <Text>⚠️</Text>
                            <VStack align="stretch" spacing={1} flex={1}>
                              <Text fontSize="sm" fontWeight="semibold" color="var(--warning-text)">
                                Stato porta sconosciuto
                              </Text>
                              <Text fontSize="xs" color="var(--text-primary)" mt={1}>
                                Non ci sono eventi nel log per questo appartamento. Lo stato della porta verrà aggiornato quando ci sono eventi di apertura/chiusura.
                              </Text>
                            </VStack>
                          </HStack>
                        </Alert>
                      </GridItem>
                    )}

                    <Box
                      as={Link}
                      href={`/app/tech/apt/${aptId}/devices`}
                      borderRadius="xl"
                      bg="rgba(6, 182, 212, 0.2)"
                      _hover={{ bg: "rgba(6, 182, 212, 0.3)" }}
                      border="2px solid"
                      borderColor="rgba(6, 182, 212, 0.4)"
                      p={3}
                      transition="all"
                      _active={{ transform: "scale(0.98)" }}
                      cursor="pointer"
                    >
                      <Text fontSize="xs" fontWeight="semibold" color="var(--text-primary)">
                        DEVICES
                      </Text>
                      <Text fontWeight="semibold" fontSize="sm" mt={1} color="var(--text-primary)">
                        {enabledDevices.length === 0
                          ? "Nessun device"
                          : `${enabledDevices.length} device, ${deviceOnlineCount} online`}
                      </Text>
                    </Box>
                    <Box
                      as={Link}
                      href={`/app/tech/apt/${aptId}/settings`}
                      borderRadius="xl"
                      bg="rgba(6, 182, 212, 0.2)"
                      _hover={{ bg: "rgba(6, 182, 212, 0.3)" }}
                      border="2px solid"
                      borderColor="rgba(6, 182, 212, 0.4)"
                      p={3}
                      transition="all"
                      _active={{ transform: "scale(0.98)" }}
                      cursor="pointer"
                    >
                      <Text fontSize="xs" fontWeight="semibold" color="var(--text-primary)">
                        TECHNICAL SETTINGS
                      </Text>
                      <Text fontWeight="semibold" fontSize="sm" mt={1} color="var(--text-primary)">
                        Configura API
                      </Text>
                    </Box>
                  </Grid>
                </VStack>
              </CardBody>
            </Card>

            <Card>
              <CardBody p={4}>
                <VStack spacing={4} align="stretch">
                  <Text fontSize="sm" opacity={0.7} mb={4}>
                    Azioni rapide
                  </Text>

                  <VStack spacing={4} align="stretch">
                    {apt.door === "unlocked" ? (
                      <Box as="form" action={actCloseDoor} w="100%">
                        <Button
                          type="submit"
                          w="100%"
                          borderRadius="xl"
                          bg="var(--success-button-bg)"
                          _hover={{ bg: "var(--success-button-bg-hover)" }}
                          border="1px solid"
                          borderColor="var(--success-button-border)"
                          color="var(--success-button-text)"
                          px={4}
                          py={2}
                          fontWeight="semibold"
                          fontSize="sm"
                        >
                          Chiudi porta
                        </Button>
                      </Box>
                    ) : (
                      <Box as="form" action={actOpenDoor} w="100%">
                        <Button
                          type="submit"
                          w="100%"
                          borderRadius="xl"
                          bg="var(--success-button-bg)"
                          _hover={{ bg: "var(--success-button-bg-hover)" }}
                          border="1px solid"
                          borderColor="var(--success-button-border)"
                          color="var(--success-button-text)"
                          px={4}
                          py={2}
                          fontWeight="semibold"
                          fontSize="sm"
                        >
                          Apri porta
                        </Button>
                      </Box>
                    )}

                    <Box as="form" action={actOpenGate} w="100%">
                      <Button
                        type="submit"
                        w="100%"
                        borderRadius="xl"
                        bg="var(--success-button-bg)"
                        _hover={{ bg: "var(--success-button-bg-hover)" }}
                        border="1px solid"
                        borderColor="var(--success-button-border)"
                        color="var(--success-button-text)"
                        px={4}
                        py={2}
                        fontWeight="semibold"
                        fontSize="sm"
                      >
                        Apri portone
                      </Button>
                    </Box>

                    <Box pt={2} borderTop="1px solid" borderColor="var(--border-light)">
                      <Grid templateColumns={{ base: "1fr", sm: "repeat(3, 1fr)" }} gap={3}>
                        <Box as="form" action={actRevoke}>
                          <Button
                            type="submit"
                            w="100%"
                            borderRadius="xl"
                            bg="rgba(239, 68, 68, 0.2)"
                            _hover={{ bg: "rgba(239, 68, 68, 0.3)" }}
                            border="1px solid"
                            borderColor="rgba(239, 68, 68, 0.3)"
                            px={4}
                            py={2}
                            fontWeight="semibold"
                            fontSize="sm"
                          >
                            Revoca accessi
                          </Button>
                        </Box>

                        <Box as="form" action={actWan}>
                          <Button
                            type="submit"
                            variant="secondary"
                            w="100%"
                            borderRadius="xl"
                            px={4}
                            py={2}
                            fontWeight="semibold"
                            fontSize="sm"
                          >
                            Switch WAN
                          </Button>
                        </Box>

                        <Box as="form" action={actVpn}>
                          <Button
                            type="submit"
                            variant="secondary"
                            w="100%"
                            borderRadius="xl"
                            px={4}
                            py={2}
                            fontWeight="semibold"
                            fontSize="sm"
                          >
                            Toggle VPN
                          </Button>
                        </Box>
                      </Grid>
                    </Box>
                  </VStack>
                </VStack>
              </CardBody>
            </Card>

            <Card>
              <CardHeader p={4} borderBottom="1px solid" borderColor="var(--border-light)">
                <Text fontSize="sm" fontWeight="semibold">
                  LOG — {apt.aptName}
                </Text>
              </CardHeader>

              <Box p={4}>
                <VStack spacing={2} align="stretch">
                  {aptLog.length === 0 ? (
                    <Text fontSize="sm" opacity={0.6}>
                      Nessun evento.
                    </Text>
                  ) : (
                    aptLog.map((e) => (
                      <Card key={e.id} variant="outlined">
                        <CardBody p={3}>
                          <VStack align="stretch" spacing={1}>
                            <HStack justify="space-between" gap={3}>
                              <Text fontSize="xs" opacity={0.6}>
                                {new Date(e.ts).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </Text>
                              <Text fontSize="10px" opacity={0.5}>
                                Apt {aptId}
                              </Text>
                            </HStack>
                            <Text mt={1} fontSize="sm" fontWeight="semibold" lineHeight="snug">
                              {e.label}
                            </Text>
                            <Text mt={1} fontSize="xs" opacity={0.7} lineHeight="snug">
                              {e.type} • {e.actor}
                            </Text>
                          </VStack>
                        </CardBody>
                      </Card>
                    ))
                  )}
                </VStack>
              </Box>
            </Card>

            <Text fontSize="xs" opacity={0.6}>
              Nota: store in memoria (dev). Ogni azione forza refresh via redirect.
            </Text>
          </VStack>
        </Box>
      </Box>
    </AppLayout>
  );
}
