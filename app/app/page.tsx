import { cookies } from "next/headers";
import { readSession } from "@/app/lib/session";
import { getIncidents, listApts, techStore } from "@/app/lib/techstore";
import * as Store from "@/app/lib/store";
import { Box, VStack, HStack, Heading, Text, Grid, GridItem } from "@chakra-ui/react";
import { Card, CardBody, CardHeader } from "@/app/components/ui/Card";
import { Link } from "@/app/components/ui/Link";
import { Button } from "@/app/components/ui/Button";
import { StatusPill } from "@/app/components/ui/StatusPill";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TechPage() {
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

  const apts = listApts();

  const accessLog = (Store.accessLog ?? []).slice(0, 10).map((e) => {
    const tsLabel = new Date(e.ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const title =
      e.type === "door_opened"
        ? "Door Opened"
        : e.type === "door_closed"
        ? "Door Closed"
        : e.type === "pin_created"
        ? "PIN Created"
        : e.type === "pin_revoked"
        ? "PIN Revoked"
        : e.type === "cleaning_done"
        ? "Cleaning Done"
        : e.type === "problem_reported"
        ? "Problem Reported"
        : e.type === "guest_access_ok"
        ? "Guest Access OK"
        : e.type === "guest_access_ko"
        ? "Guest Access KO"
        : e.type === "cleaner_access_ok"
        ? "Cleaner Access OK"
        : String(e.type);

    return {
      id: String(e.id),
      tsLabel,
      aptId: String(e.aptId),
      title,
      detail: String(e.label ?? ""),
      level: "ok" as const,
    };
  });

  const incidents = getIncidents(6);

  const totalApts = apts.length;
  const online = apts.filter((a) => a.status === "online").length;
  const offline = totalApts - online;

  return (
    <Box as="main" minH="100vh" bg="var(--bg-primary)" color="var(--text-primary)">
      {/* MOBILE HEADER */}
      <Box p={4} display={{ base: "block", md: "none" }}>
        <Text fontSize="xs" opacity={0.6}>TECH • monitoring</Text>
        <Heading as="h1" size="lg" fontWeight="semibold" mt={1}>
          {techStore.clientName}
        </Heading>
        <Text mt={1} fontSize="xs" opacity={0.6}>
          {totalApts} appartamenti • {online} online • {offline} offline
        </Text>
      </Box>

      {/* DESKTOP GRID / MOBILE STACK */}
      <Grid
        templateColumns={{ base: "1fr", md: "280px 1fr 360px" }}
        gap={{ base: 4, md: 6 }}
        p={{ base: 4, md: 6 }}
      >
        {/* SIDEBAR */}
        <Box as="aside">
          <Card>
            <CardHeader p={4} borderBottom="1px solid" borderColor="var(--border-light)">
              <Text fontSize="xs" opacity={0.6}>CLIENT</Text>
              <Text mt={2} fontWeight="semibold">
                {techStore.clientName}
              </Text>
              <Text mt={1} fontSize="xs" opacity={0.6}>
                {totalApts} appartamenti • {online} online • {offline} offline
              </Text>
            </CardHeader>

            <Box p={4}>
              <Text fontSize="xs" opacity={0.6} mb={3}>
                APARTMENTS
              </Text>

              <VStack spacing={2} align="stretch" maxH={{ base: "52vh", md: "70vh" }} overflowY="auto" pr={1}>
                {apts.map((a) => (
                  <Box
                    key={a.aptId}
                    as={Link}
                    href={`/app/tech/apt/${a.aptId}`}
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    borderRadius="xl"
                    bg="var(--bg-secondary)"
                    border="1px solid"
                    borderColor="var(--border-light)"
                    px={3}
                    py={2}
                    _hover={{ borderColor: "var(--border-medium)" }}
                  >
                    <Box fontSize="sm">
                      <Text fontWeight="semibold">{a.aptName}</Text>
                      <Text fontSize="xs" opacity={0.6}>{a.group}</Text>
                    </Box>
                    <Box
                      w={2}
                      h={2}
                      borderRadius="full"
                      bg={a.status === "online" ? "var(--accent-success)" : "var(--accent-error)"}
                    />
                  </Box>
                ))}
              </VStack>
            </Box>

            <Box p={4} borderTop="1px solid" borderColor="var(--border-light)">
              <Text fontSize="xs" opacity={0.6}>
                TECH • monitoring
              </Text>
            </Box>
          </Card>
        </Box>

        {/* CENTER */}
        <Box as="section">
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
                  <Heading as="h2" size="md" fontWeight="semibold">
                    Status
                  </Heading>
                  <Text fontSize="xs" opacity={0.6} display={{ base: "none", md: "block" }}>
                    Click su una riga per aprire il dettaglio appartamento
                  </Text>
                </Box>
                <Text fontSize="xs" opacity={0.6} display={{ base: "block", md: "none" }}>
                  Tap per dettagli
                </Text>
              </CardHeader>

              {/* desktop header */}
              <Grid
                templateColumns="1.2fr 1fr 1fr 1fr"
                gap={2}
                p={4}
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="wider"
                opacity={0.6}
                display={{ base: "none", md: "grid" }}
              >
                <Box>Apartment</Box>
                <Box>Status</Box>
                <Box>Network</Box>
                <Box>Last Access</Box>
              </Grid>

              <Box px={4} pb={4}>
                <VStack spacing={2} align="stretch">
                  {apts.map((a) => {
                    return (
                      <Box
                        key={a.aptId}
                        as={Link}
                        href={`/app/tech/apt/${a.aptId}`}
                        display="block"
                        borderRadius="xl"
                        bg="var(--bg-secondary)"
                        border="1px solid"
                        borderColor="var(--border-light)"
                        _hover={{ borderColor: "var(--border-medium)" }}
                      >
                        <Grid
                          templateColumns={{ base: "1fr", md: "1.2fr 1fr 1fr 1fr" }}
                          gap={{ base: 3, md: 2 }}
                          p={4}
                          alignItems={{ base: "start", md: "center" }}
                        >
                          <Box>
                            <Text fontWeight="semibold">{a.aptName}</Text>
                            <Text fontSize="xs" opacity={0.6}>{a.group}</Text>
                          </Box>

                          <Box>
                            <StatusPill status={a.status} />
                          </Box>

                          <Box>
                            <StatusPill status={a.network} />
                          </Box>

                          <Box>
                            <Text
                              fontSize={{ base: "xs", md: "sm" }}
                              opacity={{ base: 0.8, md: 0.9 }}
                              borderRadius={{ base: "lg", md: "none" }}
                              border={{ base: "1px solid", md: "none" }}
                              borderColor={{ base: "var(--border-light)", md: "transparent" }}
                              bg={{ base: "var(--bg-secondary)", md: "transparent" }}
                              px={{ base: 3, md: 0 }}
                              py={{ base: 2, md: 0 }}
                            >
                              Last Access: <Text as="span" opacity={1}>{a.lastAccessLabel}</Text>
                            </Text>
                          </Box>
                        </Grid>
                      </Box>
                    );
                  })}
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
                <Text fontSize="sm" fontWeight="semibold">
                  LIVE ACCESS LOG
                </Text>
                <Link href="/app/tech/log" fontSize="xs" opacity={0.6} _hover={{ opacity: 1 }}>
                  Mostra di più
                </Link>
              </CardHeader>

              <Box p={4}>
                <VStack spacing={3} align="stretch">
                  {accessLog.map((e) => (
                    <Card key={e.id} variant="outlined">
                      <CardBody p={3}>
                        <VStack align="stretch" spacing={1}>
                          <Text fontSize="xs" opacity={0.6}>
                            {e.tsLabel}
                          </Text>
                          <Text mt={1} fontSize="sm">
                            <Text as="span" fontWeight="semibold">
                              Apt {e.aptId}
                            </Text>{" "}
                            <Text as="span" opacity={0.7}>|</Text>{" "}
                            <Text as="span" fontWeight="semibold">
                              {e.title}
                            </Text>
                          </Text>
                          <Text mt={1} fontSize="xs" opacity={0.7}>
                            {e.detail}
                          </Text>
                        </VStack>
                      </CardBody>
                    </Card>
                  ))}
                </VStack>
              </Box>

              <Box px={4} pb={4}>
                <Text fontSize="xs" opacity={0.6}>
                  Mostrati ultimi 10 eventi
                </Text>
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
                  {incidents.length === 0 ? (
                    <Text fontSize="sm" opacity={0.6}>
                      Nessun incidente recente.
                    </Text>
                  ) : (
                    incidents.map((i) => (
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
                    ))
                  )}
                </VStack>
              </Box>
            </Card>

            <Box as="form" action="/api/auth/logout" method="post">
              <Button
                type="submit"
                variant="secondary"
                w="100%"
                borderRadius="xl"
                px={4}
                py={3}
              >
                Logout
              </Button>
            </Box>

            <Link
              href="/app/cleaner"
              display="block"
              textAlign="center"
              fontSize="xs"
              opacity={0.6}
              _hover={{ opacity: 1 }}
            >
              Vai a Cleaner (debug)
            </Link>
          </VStack>
        </Box>
      </Grid>
    </Box>
  );
}
