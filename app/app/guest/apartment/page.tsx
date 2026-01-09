import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSession, validateSessionUser } from "@/app/lib/session";
import { getGuestState } from "@/app/lib/gueststore";
import { Card, CardBody, CardHeader } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { AppLayout } from "@/app/components/layouts/AppLayout";
import { ArrowLeft, Wifi, Clock, FileText, Phone } from "lucide-react";
import { Box, VStack, HStack, Heading, Text, Grid, GridItem, List, ListItem } from "@chakra-ui/react";
import { Link } from "@/app/components/ui/Link";

export default async function GuestApartmentPage() {
  const cookieStore = await cookies();
  const sess = cookieStore.get("sess")?.value;
  const me = validateSessionUser(readSession(sess));

  if (!me || me.role !== "guest") {
    redirect("/?err=session_expired");
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
  
  const s = getGuestState(aptId);

  return (
    <AppLayout role="guest">
      <Box mx="auto" w="100%" maxW="4xl" p={{ base: 4, sm: 6, lg: 8 }}>
        <Box mb={6}>
          <Link href="/app/guest">
            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={16} />}>
              Indietro
            </Button>
          </Link>
        </Box>

        <VStack spacing={6} align="stretch">
          {/* Apartment Info */}
          <Card variant="elevated">
            <CardHeader>
              <Heading as="h1" size="xl" fontWeight="semibold" color="var(--text-primary)">
                {s.apt.aptName}
              </Heading>
              <Text fontSize="sm" color="var(--text-secondary)">
                {s.apt.addressShort}
              </Text>
            </CardHeader>
            <CardBody>
              <VStack spacing={6} align="stretch">
                <Grid templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)" }} gap={4}>
                  <Card variant="outlined">
                    <CardBody p={4}>
                      <VStack align="stretch" spacing={2}>
                        <HStack spacing={2}>
                          <Wifi size={16} color="var(--text-secondary)" />
                          <Text fontSize="xs" fontWeight="medium" color="var(--text-secondary)" textTransform="uppercase" letterSpacing="wide">
                            Wi-Fi
                          </Text>
                        </HStack>
                        <Text fontWeight="semibold" color="var(--text-primary)">
                          {s.apt.wifiSsid}
                        </Text>
                        <Text fontSize="xs" color="var(--text-secondary)" mt={1}>
                          Password: {s.apt.wifiPass}
                        </Text>
                      </VStack>
                    </CardBody>
                  </Card>

                  <Card variant="outlined">
                    <CardBody p={4}>
                      <VStack align="stretch" spacing={2}>
                        <HStack spacing={2}>
                          <Clock size={16} color="var(--text-secondary)" />
                          <Text fontSize="xs" fontWeight="medium" color="var(--text-secondary)" textTransform="uppercase" letterSpacing="wide">
                            Orari
                          </Text>
                        </HStack>
                        <Text fontSize="sm" color="var(--text-primary)">
                          Check-in: <Text as="span" fontWeight="semibold">{s.apt.checkIn}</Text>
                        </Text>
                        <Text fontSize="sm" color="var(--text-primary)" mt={1}>
                          Check-out: <Text as="span" fontWeight="semibold">{s.apt.checkOut}</Text>
                        </Text>
                      </VStack>
                    </CardBody>
                  </Card>
                </Grid>

                <Box>
                  <HStack spacing={2} mb={4}>
                    <FileText size={20} color="var(--text-primary)" />
                    <Heading as="h2" size="md" fontWeight="semibold" color="var(--text-primary)">
                      Regole principali
                    </Heading>
                  </HStack>
                  <VStack spacing={2} align="stretch">
                    {s.apt.rules.map((r, idx) => (
                      <Card key={idx} variant="outlined">
                        <CardBody p={3}>
                          <Text fontSize="sm" color="var(--text-primary)">
                            {r}
                          </Text>
                        </CardBody>
                      </Card>
                    ))}
                  </VStack>
                </Box>
              </VStack>
            </CardBody>
          </Card>

          {/* Contacts */}
          <Card>
            <CardHeader>
              <HStack spacing={2}>
                <Phone size={20} color="var(--text-primary)" />
                <Heading as="h2" size="md" fontWeight="semibold" color="var(--text-primary)">
                  Contatti
                </Heading>
              </HStack>
            </CardHeader>
            <CardBody>
              <VStack spacing={2} align="stretch">
                <Text fontSize="sm" color="var(--text-primary)">
                  <Text as="span" fontWeight="medium">Supporto:</Text>{" "}
                  <Text as="span" color="var(--text-secondary)">chat in-app (mock)</Text>
                </Text>
                <Text fontSize="xs" color="var(--text-tertiary)">
                  (Nel prodotto reale qui avrai chat/ticket e numeri emergenza in base al piano.)
                </Text>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Box>
    </AppLayout>
  );
}
