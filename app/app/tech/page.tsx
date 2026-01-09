import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSession, validateSessionUser } from "@/app/lib/session";
import { getAccessLog, getIncidents, listApts, techStore } from "@/app/lib/techstore";
import { listClients } from "@/app/lib/clientStore";
import { getUser } from "@/app/lib/userStore";
import { AppLayout } from "@/app/components/layouts/AppLayout";
import { UserProfile } from "../components/UserProfile";
import { ClientAccordion } from "./components/ClientAccordion";
import { TestPushButton } from "./components/TestPushButton";
import { Box, VStack, HStack, Heading, Text, Grid, GridItem } from "@chakra-ui/react";
import { Card, CardBody, CardHeader } from "@/app/components/ui/Card";
import { Link } from "@/app/components/ui/Link";

export default async function TechPage({
  searchParams,
}: {
  searchParams?: { all?: string } | Promise<{ all?: string }>;
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

  const apts = listApts();
  const clients = listClients();
  const clientsCount = clients.length;

  const apartmentsByClient = new Map<string, typeof apts>();
  apts.forEach((apt) => {
    const clientName = apt.group;
    if (!apartmentsByClient.has(clientName)) {
      apartmentsByClient.set(clientName, []);
    }
    apartmentsByClient.get(clientName)!.push(apt);
  });

  const sp = await Promise.resolve(searchParams ?? {});
  const showAll = sp.all === "1";
  const logLimit = showAll ? 50 : 10;

  const accessLog = getAccessLog(logLimit);
  const incidents = getIncidents(6);

  const techUser = me.userId ? getUser(me.userId) : null;

  const totalApts = apts.length;
  const online = apts.filter((a) => a.status === "online").length;
  const offline = totalApts - online;

  return (
    <AppLayout 
      role="tech" 
      userInfo={techUser ? {
        userId: techUser.userId,
        username: techUser.username,
        profileImageUrl: techUser.profileImageUrl,
      } : undefined}
    >
      <Grid
        templateColumns={{ base: "1fr", lg: "1fr 360px" }}
        gap={{ base: 4, lg: 6 }}
        p={{ base: 4, lg: 6 }}
      >
        {/* CENTER */}
        <Box as="section">
          <VStack spacing={4} align="stretch">
            <Card>
              <CardHeader p={4} borderBottom="1px solid" borderColor="var(--border-light)">
                <Heading as="h2" size="md" fontWeight="semibold">
                  Status
                </Heading>
                <Text fontSize="sm" opacity={0.6} mt={1}>
                  {totalApts} appartamenti • {online} online • {offline} offline
                </Text>
              </CardHeader>

              <Box p={4}>
                <VStack spacing={3} align="stretch">
                  {Array.from(apartmentsByClient.entries()).map(([clientName, clientApts]) => (
                    <ClientAccordion
                      key={clientName}
                      clientName={clientName}
                      apartments={clientApts.map((a) => ({
                        aptId: a.aptId,
                        aptName: a.aptName,
                        status: a.status,
                        network: a.network,
                        lastAccessLabel: a.lastAccessLabel,
                      }))}
                    />
                  ))}
                </VStack>
              </Box>
            </Card>
          </VStack>
        </Box>

        {/* RIGHT */}
        <Box as="aside">
          <VStack spacing={4} align="stretch">
            <Card>
              <CardHeader
                p={4}
                borderBottom="1px solid"
                borderColor="var(--border-light)"
                display="flex"
                alignItems="center"
                justifyContent="space-between"
              >
                <Box>
                  <Text fontSize="sm" fontWeight="semibold">
                    LIVE ACCESS LOG
                  </Text>
                  <Text fontSize="xs" opacity={0.6}>
                    {showAll ? "Ultimi 50 eventi" : "Ultimi 10 eventi"}
                  </Text>
                </Box>

                {showAll ? (
                  <Link href="/app/tech" fontSize="xs" opacity={0.7} _hover={{ opacity: 1 }}>
                    Mostra meno
                  </Link>
                ) : (
                  <Link href="/app/tech?all=1" fontSize="xs" opacity={0.7} _hover={{ opacity: 1 }}>
                    Mostra di più
                  </Link>
                )}
              </CardHeader>

              <Box p={4}>
                <VStack spacing={3} align="stretch">
                  {accessLog.length === 0 ? (
                    <Text fontSize="sm" opacity={0.6}>
                      Nessun evento.
                    </Text>
                  ) : (
                    accessLog.map((e) => (
                      <Card key={e.id} variant="outlined">
                        <CardBody p={3}>
                          <VStack align="stretch" spacing={1}>
                            <Text fontSize="xs" opacity={0.6}>
                              {e.tsLabel}
                            </Text>
                            <Text fontSize="sm" mt={1}>
                              <Text as="span" fontWeight="semibold">
                                Apt {e.aptId}
                              </Text>{" "}
                              <Text as="span" opacity={0.7}>|</Text>{" "}
                              <Text as="span" fontWeight="semibold">
                                {e.title}
                              </Text>
                            </Text>
                            <Text fontSize="xs" opacity={0.7} mt={1}>
                              {e.detail}
                            </Text>
                          </VStack>
                        </CardBody>
                      </Card>
                    ))
                  )}
                </VStack>
              </Box>
            </Card>

            <Card>
              <CardHeader p={4} borderBottom="1px solid" borderColor="var(--border-light)">
                <Text fontSize="sm" fontWeight="semibold">
                  INCIDENTS
                </Text>
              </CardHeader>

              <Box p={4}>
                <VStack spacing={2} align="stretch">
                  {incidents.map((i) => (
                    <Card key={i.id} variant="outlined">
                      <CardBody px={3} py={3}>
                        <HStack justify="space-between">
                          <HStack spacing={3}>
                            <Text fontSize="lg">
                              {i.type === "tamper" && "⚠️"}
                              {i.type === "offline" && "🛑"}
                              {i.type === "failed_access" && "❗"}
                            </Text>
                            <Box>
                              <Text fontSize="sm" fontWeight="semibold">
                                {i.title}
                              </Text>
                              <Text fontSize="xs" opacity={0.6}>
                                Apt {i.aptId} • {i.tsLabel}
                              </Text>
                            </Box>
                          </HStack>
                        </HStack>
                      </CardBody>
                    </Card>
                  ))}
                </VStack>
              </Box>
            </Card>

            <Card>
              <CardHeader p={4} borderBottom="1px solid" borderColor="var(--border-light)">
                <Text fontSize="sm" fontWeight="semibold">
                  PUSH NOTIFICATIONS
                </Text>
                <Text fontSize="xs" opacity={0.6} mt={1}>
                  Test invio notifiche
                </Text>
              </CardHeader>

              <Box p={4}>
                <TestPushButton />
              </Box>
            </Card>
          </VStack>
        </Box>
      </Grid>
    </AppLayout>
  );
}
