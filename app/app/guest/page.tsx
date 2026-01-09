export const dynamic = "force-dynamic";
export const revalidate = 0;

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { readSession } from "@/app/lib/session";
import { unstable_noStore as noStore } from "next/cache";
import {
  getGuestState,
  guestOpenDoor,
  guestCloseDoor,
  guestOpenGate,
} from "@/app/lib/gueststore";

import * as Store from "@/app/lib/store";
import { events_listByApt, events_log } from "@/app/lib/domain/eventsDomain";
import { door_getStateFromLog } from "@/app/lib/domain/doorStore";
import { Badge } from "@/app/components/ui/Badge";
import { AppLayout } from "@/app/components/layouts/AppLayout";
import { Box, VStack, HStack, Text, Heading, Grid, GridItem } from "@chakra-ui/react";
import { Card, CardBody } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Link } from "@/app/components/ui/Link";
import { Alert } from "@/app/components/ui/Alert";

function badge(outcome: "ok" | "retrying" | "fail" | null) {
  if (outcome === "ok") return { t: "Accesso disponibile", variant: "success" as const };
  if (outcome === "fail") return { t: "Problema accesso", variant: "error" as const };
  if (outcome === "retrying") return { t: "In corso…", variant: "warning" as const };
  return { t: "Pronto", variant: "default" as const };
}

export default async function GuestPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  noStore();

  const sp = (await searchParams) ?? {};
  const toast = typeof sp.toast === "string" ? sp.toast : undefined;

  const cookieStore = await cookies();
  const sess = cookieStore.get("sess")?.value;
  const me = readSession(sess);

  if (!me || me.role !== "guest") {
    return (
      <Box p={6} color="var(--text-primary)">
        Non autorizzato
      </Box>
    );
  }

  const aptId = me.aptId;
  if (!aptId) {
    return (
      <Box p={6} color="var(--text-primary)">
        AptId non disponibile
      </Box>
    );
  }
  
  const state = getGuestState(aptId);
  const allEvents = events_listByApt(Store, aptId, 5);
  // Filtra per mostrare solo eventi relativi a porta e portone
  const events = allEvents.filter((e) => 
    e.type === 'door_opened' || 
    e.type === 'door_closed' || 
    e.type === 'gate_opened'
  );
  const b = badge(state.lastOutcome);
  // Leggi stato porta da Store.accessLog (single source of truth) invece che da gueststore locale
  const doorState = door_getStateFromLog(Store, aptId);
  const doorIsOpen = doorState === "open";

  // Rimuovi toast dall'URL se non corrisponde allo stato attuale (evita toast fuorvianti dopo refresh)
  if (toast && toast.startsWith("open_") && !doorIsOpen && !toast.includes("gate")) {
    redirect("/app/guest");
  }
  if (toast && toast.startsWith("close_") && doorIsOpen && !toast.includes("gate")) {
    redirect("/app/guest");
  }

  async function actOpenDoor() {
    "use server";
    const outcome = guestOpenDoor(aptId);

    if (outcome === "ok") {
      events_log(Store, {
        aptId,
        type: "door_opened",
        actor: "guest",
        label: "Porta aperta dall'ospite",
      });
    } else {
      events_log(Store, {
        aptId,
        type: "guest_access_ko",
        actor: "guest",
        label: "Tentativo apertura porta fallito",
      });
    }

    revalidatePath("/app/guest");
    redirect(`/app/guest?toast=${outcome === "ok" ? "open_ok" : "open_fail"}&r=${Date.now()}`);
  }

  async function actCloseDoor() {
    "use server";
    const outcome = guestCloseDoor(aptId);

    if (outcome === "ok") {
      events_log(Store, {
        aptId,
        type: "door_closed",
        actor: "guest",
        label: "Porta chiusa dall'ospite",
      });
    } else {
      events_log(Store, {
        aptId,
        type: "guest_access_ko",
        actor: "guest",
        label: "Tentativo chiusura porta fallito",
      });
    }

    revalidatePath("/app/guest");
    redirect(`/app/guest?toast=${outcome === "ok" ? "close_ok" : "close_fail"}&r=${Date.now()}`);
  }

  async function actOpenGate() {
    "use server";
    const outcome = guestOpenGate(aptId);

    if (outcome === "ok") {
      events_log(Store, {
        aptId,
        type: "gate_opened",
        actor: "guest",
        label: "Portone aperto dall'ospite",
      });
    } else {
      events_log(Store, {
        aptId,
        type: "guest_access_ko",
        actor: "guest",
        label: "Tentativo apertura portone fallito",
      });
    }

    revalidatePath("/app/guest");
    redirect(`/app/guest?toast=${outcome === "ok" ? "gate_open_ok" : "gate_open_fail"}&r=${Date.now()}`);
  }


  return (
    <AppLayout role="guest">
      <Box mx="auto" w="100%" maxW="md" p={5}>
        <VStack spacing={4} align="stretch">
          <Box mb={2}>
            <Badge variant={b.variant} size="sm">{b.t}</Badge>
            <Heading as="h1" size="lg" fontWeight="semibold" mt={1} color="var(--text-primary)">
              {state.apt.aptName}
            </Heading>
            <Text fontSize="xs" opacity={0.6} color="var(--text-secondary)">
              {state.apt.addressShort}
            </Text>
          </Box>

          {/* Toast */}
          {toast && (
            <Alert variant={toast.endsWith("_ok") ? "success" : "error"}>
              {toast === "open_ok" && "Porta sbloccata ✅"}
              {toast === "close_ok" && "Porta chiusa ✅"}
              {toast === "open_fail" &&
                "Non riesco ad aprire. Prova ancora o contatta supporto."}
              {toast === "close_fail" &&
                "Non riesco a chiudere. Prova ancora o contatta supporto."}
              {toast === "gate_open_ok" && "Portone sbloccato ✅"}
              {toast === "gate_open_fail" &&
                "Non riesco ad aprire il portone. Prova ancora o contatta supporto."}
            </Alert>
          )}

          {/* Controllo Porta */}
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <Text fontSize="sm" fontWeight="semibold">Porta</Text>
                  <Badge
                    variant={doorIsOpen ? "success" : "default"}
                    size="sm"
                    display="inline-flex"
                    alignItems="center"
                    gap={2}
                    borderRadius="xl"
                    px={3}
                    py={1.5}
                  >
                    <Box
                      w={2}
                      h={2}
                      borderRadius="full"
                      bg={doorIsOpen ? "var(--accent-success)" : "var(--text-secondary)"}
                      flexShrink={0}
                    />
                    {doorIsOpen ? "SBLOCCATA" : "BLOCCATA"}
                  </Badge>
                </HStack>

                <VStack spacing={2}>
                  {doorIsOpen ? (
                    <Box as="form" action={actCloseDoor} w="100%">
                      <Button
                        type="submit"
                        w="100%"
                        borderRadius="xl"
                        bg="rgba(16, 185, 129, 0.25)"
                        border="1px solid"
                        borderColor="rgba(16, 185, 129, 0.3)"
                        _hover={{ bg: "rgba(16, 185, 129, 0.35)" }}
                        py={3}
                        fontSize="base"
                        fontWeight="semibold"
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
                        bg="rgba(16, 185, 129, 0.25)"
                        border="1px solid"
                        borderColor="rgba(16, 185, 129, 0.3)"
                        _hover={{ bg: "rgba(16, 185, 129, 0.35)" }}
                        py={3}
                        fontSize="base"
                        fontWeight="semibold"
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
                      bg="rgba(16, 185, 129, 0.25)"
                      border="1px solid"
                      borderColor="rgba(16, 185, 129, 0.3)"
                      _hover={{ bg: "rgba(16, 185, 129, 0.35)" }}
                      py={3}
                      fontSize="base"
                      fontWeight="semibold"
                    >
                      Apri portone
                    </Button>
                  </Box>
                </VStack>
              </VStack>
            </CardBody>
          </Card>

          {/* Informazioni Appartamento */}
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Text fontSize="sm" fontWeight="semibold">Informazioni</Text>
                
                <Grid templateColumns="repeat(2, 1fr)" gap={3}>
                  <Card variant="outlined">
                    <CardBody p={3}>
                      <VStack align="stretch" spacing={1}>
                        <Text fontSize="xs" color="var(--text-secondary)">Wi-Fi</Text>
                        <Text fontWeight="semibold" fontSize="sm" color="var(--text-primary)">
                          {state.apt.wifiSsid}
                        </Text>
                        <Text fontSize="xs" color="var(--text-secondary)" mt={1}>
                          Pass: {state.apt.wifiPass}
                        </Text>
                      </VStack>
                    </CardBody>
                  </Card>
                  <Card variant="outlined">
                    <CardBody p={3}>
                      <VStack align="stretch" spacing={1}>
                        <Text fontSize="xs" color="var(--text-secondary)">Orari</Text>
                        <Text fontSize="xs" color="var(--text-secondary)">
                          Check-in: <Text as="span" fontWeight="semibold" color="var(--text-primary)">{state.apt.checkIn}</Text>
                        </Text>
                        <Text fontSize="xs" color="var(--text-secondary)" mt={1}>
                          Check-out: <Text as="span" fontWeight="semibold" color="var(--text-primary)">{state.apt.checkOut}</Text>
                        </Text>
                      </VStack>
                    </CardBody>
                  </Card>
                </Grid>

                <HStack spacing={3} pt={2}>
                  <Box
                    as={Link}
                    href="/app/guest/apartment"
                    flex={1}
                    borderRadius="xl"
                    bg="var(--bg-secondary)"
                    border="1px solid"
                    borderColor="var(--border-light)"
                    px={4}
                    py={3}
                    textAlign="center"
                    fontSize="sm"
                    color="var(--text-primary)"
                    _hover={{ bg: "var(--bg-tertiary)" }}
                    transition="colors"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    Dettagli appartamento
                  </Box>
                  <Box
                    as={Link}
                    href="/app/guest/support"
                    flex={1}
                    borderRadius="xl"
                    bg="var(--bg-secondary)"
                    border="1px solid"
                    borderColor="var(--border-light)"
                    px={4}
                    py={3}
                    textAlign="center"
                    fontSize="sm"
                    color="var(--text-primary)"
                    _hover={{ bg: "var(--bg-tertiary)" }}
                    transition="colors"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    Supporto
                  </Box>
                </HStack>
              </VStack>
            </CardBody>
          </Card>

          {/* Live events */}
          <Card>
            <Box p={4} borderBottom="1px solid" borderColor="var(--border-light)">
              <Text fontSize="sm" fontWeight="semibold" color="var(--text-primary)">
                Attività recente
              </Text>
            </Box>
            <Box p={4}>
              <VStack spacing={2} align="stretch">
                {events.map((e) => (
                  <Card key={e.id} variant="outlined">
                    <CardBody p={3}>
                      <VStack align="stretch" spacing={1}>
                        <Text fontSize="xs" color="var(--text-secondary)">
                          {new Date(e.ts).toLocaleString()}
                        </Text>
                        <Text fontSize="sm" fontWeight="semibold" color="var(--text-primary)" mt={1}>
                          {e.label}
                        </Text>
                        <Text fontSize="xs" color="var(--text-secondary)" mt={1}>
                          {e.type}
                        </Text>
                      </VStack>
                    </CardBody>
                  </Card>
                ))}
              </VStack>
            </Box>
          </Card>

          <Text fontSize="11px" color="var(--text-tertiary)" textAlign="center">
            Prototipo: nessun servizio reale. Tutto mock.
          </Text>
        </VStack>
      </Box>
    </AppLayout>
  );
}
