import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSession, validateSessionUser } from "@/app/lib/session";
import { listJobsByApt, listJobsByStay } from "@/app/lib/cleaningstore";
import { listStaysByApt } from "@/app/lib/staysStore";
import { listPinsByApt } from "@/app/lib/store";
import { Card, CardBody, CardHeader } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Badge";
import { AppLayout } from "@/app/components/layouts/AppLayout";
import { Sparkles } from "lucide-react";
import { Box, VStack, HStack, Heading, Text } from "@chakra-ui/react";
import { Link } from "@/app/components/ui/Link";

export default async function CleanerHome() {
  const cookieStore = await cookies();
  const sess = cookieStore.get("sess")?.value;

  const me = validateSessionUser(readSession(sess));

  if (!me || me.role !== "cleaner") {
    redirect("/?err=session_expired");
    return (
      <Box p={6} color="var(--text-primary)">
        Non autorizzato
      </Box>
    );
  }

  // Trova tutti i PIN del cleaner per questo aptId
  const cleanerPins = listPinsByApt(me.aptId).filter((p) => p.role === "cleaner");
  
  // Trova tutti gli stay associati ai PIN del cleaner
  const stayIds = new Set<string>();
  for (const pin of cleanerPins) {
    if (pin.stayId) {
      stayIds.add(pin.stayId);
    }
  }

  // Raccogli tutti i job associati agli stay del cleaner
  const jobs: any[] = [];
  for (const stayId of stayIds) {
    const stayJobs = listJobsByStay(stayId);
    jobs.push(...stayJobs);
  }

  // Aggiungi anche i job diretti per questo aptId (per retrocompatibilità)
  const aptJobs = listJobsByApt(me.aptId);
  for (const job of aptJobs) {
    if (!jobs.find((j) => j.id === job.id)) {
      jobs.push(job);
    }
  }

  // Ordina per stato
  const rank: Record<string, number> = {
    todo: 0,
    in_progress: 1,
    problem: 2,
    done: 3,
  };
  jobs.sort((a, b) => rank[a.status] - rank[b.status]);

  const getStatusVariant = (status: string) => {
    if (status === "todo") return "default";
    if (status === "in_progress") return "warning";
    if (status === "problem") return "error";
    if (status === "done") return "success";
    return "default";
  };

  const getStatusLabel = (status: string) => {
    if (status === "todo") return "Da fare";
    if (status === "in_progress") return "In corso";
    if (status === "done") return "Completato";
    if (status === "problem") return "Problema";
    return status;
  };

  return (
    <AppLayout role="cleaner">
      <Box mx="auto" w="100%" maxW="4xl" p={{ base: 4, sm: 6, lg: 8 }}>
        <Box mb={6}>
          <Heading as="h1" size="xl" fontWeight="semibold" color="var(--text-primary)">
            Pulizie
          </Heading>
          <Text fontSize="sm" color="var(--text-secondary)" mt={1}>
            Appartamento {me.aptId}
          </Text>
        </Box>

        <Card variant="elevated">
          <CardHeader>
            <HStack spacing={2}>
              <Sparkles size={20} color="var(--text-primary)" />
              <Heading as="h2" size="md" fontWeight="semibold" color="var(--text-primary)">
                Pulizie assegnate
              </Heading>
            </HStack>
          </CardHeader>
          <CardBody>
            {jobs.length === 0 ? (
              <Text fontSize="sm" color="var(--text-secondary)" textAlign="center" py={8}>
                Nessuna pulizia assegnata disponibile
              </Text>
            ) : (
              <VStack spacing={3} align="stretch">
                {jobs.map((j) => (
                  <Box
                    key={j.id}
                    as={Link}
                    href={`/app/cleaner/${j.id}`}
                    display="block"
                    p={4}
                    borderRadius="xl"
                    bg="var(--bg-secondary)"
                    border="1px solid"
                    borderColor="var(--border-light)"
                    _hover={{ borderColor: "var(--border-medium)" }}
                    transition="colors"
                  >
                    <HStack justify="space-between" gap={3} mb={2}>
                      <Text fontWeight="semibold" color="var(--text-primary)">
                        {j.aptName}
                      </Text>
                      <Badge variant={getStatusVariant(j.status)} size="sm">
                        {getStatusLabel(j.status)}
                      </Badge>
                    </HStack>
                    {j.windowLabel && (
                      <Text fontSize="xs" color="var(--text-secondary)">
                        {j.windowLabel}
                      </Text>
                    )}
                  </Box>
                ))}
              </VStack>
            )}
          </CardBody>
        </Card>
      </Box>
    </AppLayout>
  );
}
