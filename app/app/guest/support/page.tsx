import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSession, validateSessionUser } from "@/app/lib/session";
import { Card, CardBody, CardHeader } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { AppLayout } from "@/app/components/layouts/AppLayout";
import { ArrowLeft, MessageCircle, Ticket, AlertCircle } from "lucide-react";
import { Box, VStack, HStack, Heading, Text } from "@chakra-ui/react";
import { Link } from "@/app/components/ui/Link";
import { Alert } from "@/app/components/ui/Alert";

export default async function GuestSupportPage() {
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

  return (
    <AppLayout role="guest">
      <Box mx="auto" w="100%" maxW="2xl" p={{ base: 4, sm: 6, lg: 8 }}>
        <Box mb={6}>
          <Link href="/app/guest">
            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={16} />}>
              Indietro
            </Button>
          </Link>
        </Box>

        <Card variant="elevated">
          <CardHeader>
            <Heading as="h1" size="xl" fontWeight="semibold" color="var(--text-primary)">
              Supporto
            </Heading>
            <Text fontSize="sm" color="var(--text-secondary)">
              Questa è una versione mock: nel prodotto reale qui apri un ticket o chatti con supporto.
            </Text>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <VStack spacing={3} align="stretch">
                <Button variant="secondary" size="lg" fullWidth leftIcon={<MessageCircle size={24} />}>
                  Apri chat (mock)
                </Button>
                <Button variant="secondary" size="lg" fullWidth leftIcon={<Ticket size={24} />}>
                  Apri ticket (mock)
                </Button>
              </VStack>

              <Alert variant="warning">
                <HStack spacing={3} align="start">
                  <Box flexShrink={0} mt="2px">
                    <AlertCircle size={20} color="var(--warning-text-icon)" />
                  </Box>
                  <VStack align="stretch" spacing={1}>
                    <Text fontWeight="semibold" fontSize="sm" color="var(--warning-text)">
                      Emergenza
                    </Text>
                    <Text fontSize="sm" color="var(--text-primary)">
                      Nel prototipo non chiami nessuno. Nel reale: numeri/istruzioni.
                    </Text>
                  </VStack>
                </HStack>
              </Alert>
            </VStack>
          </CardBody>
        </Card>
      </Box>
    </AppLayout>
  );
}
