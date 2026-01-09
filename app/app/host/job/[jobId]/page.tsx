import { cookies } from "next/headers";
import { readSession } from "@/app/lib/session";
import { redirect } from "next/navigation";
import { getJob, resolveProblem } from "@/app/lib/cleaningstore";
import { revalidatePath } from "next/cache";
import { listStaysByApt } from "@/app/lib/staysStore";
import { getApartment } from "@/app/lib/clientStore";
import { listClients } from "@/app/lib/clientStore";
import { getUser } from "@/app/lib/userStore";
import { AppLayout } from "@/app/components/layouts/AppLayout";
import { Box, VStack, HStack, Heading, Text, Grid, GridItem, Image } from "@chakra-ui/react";
import { Card, CardBody, CardHeader } from "@/app/components/ui/Card";
import { Link } from "@/app/components/ui/Link";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Badge";
import { CheckIcon } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function fmtDT(ts?: number | null): string {
  if (!ts) return "—";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtDTFull(ts?: number | null): string {
  if (!ts) return "—";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function timeLeftDHM(ts: number): string {
  const now = Date.now();
  const diff = ts - now;
  if (diff <= 0) return "Scaduto";
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  if (days > 0) return `${days}g ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default async function HostJobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const cookieStore = await cookies();
  const sess = cookieStore.get("sess")?.value;
  const me = readSession(sess);

  if (!me || me.role !== "host") {
    return (
      <Box p={6} color="var(--text-primary)">
        Non autorizzato
      </Box>
    );
  }

  const resolvedParams = await Promise.resolve(params);
  const jobId = String(resolvedParams?.jobId ?? "");

  const job = getJob(jobId);
  const hostUser = me.userId ? getUser(me.userId) : null;

  if (!job) {
    return (
      <AppLayout 
        role="host"
        userInfo={hostUser ? {
          userId: hostUser.userId,
          username: hostUser.username,
          profileImageUrl: hostUser.profileImageUrl,
        } : undefined}
      >
        <Box maxW="3xl" mx="auto" p={{ base: 4, sm: 6 }}>
          <VStack spacing={4} align="stretch">
            <Link href="/app/host" fontSize="sm" opacity={0.7} _hover={{ opacity: 1 }}>
              ← Torna alla dashboard
            </Link>
            <Heading as="h2" size="lg" fontWeight="semibold">
              Pulizia assegnata non trovata
            </Heading>
            <Text fontSize="sm" opacity={0.6}>
              Pulizia assegnata richiesta: {jobId}
            </Text>
          </VStack>
        </Box>
      </AppLayout>
    );
  }

  const apt = getApartment(job.aptId);
  const aptName = apt?.name ?? job.aptName;

  let associatedStay = null;
  if (job.stayId) {
    const stays = listStaysByApt(job.aptId);
    associatedStay = stays.find((s) => s.stayId === job.stayId) ?? null;
  } else {
    const stays = listStaysByApt(job.aptId);
    associatedStay = stays.length > 0 ? stays[0] : null;
  }

  const clients = (listClients() as any[]) ?? [];
  const getClientId = (c: any) => String(c?.id ?? c?.clientId ?? c?.clientID ?? c?.slug ?? "");
  let clientId = "";
  for (const client of clients) {
    const apts = client?.apartments ?? [];
    if (apts.some((a: any) => String(a?.aptId ?? a?.id ?? "") === job.aptId)) {
      clientId = getClientId(client);
      break;
    }
  }

  const statusVariant: Record<string, "warning" | "info" | "success" | "error"> = {
    todo: "warning",
    in_progress: "info",
    done: "success",
    problem: "error",
  };

  const statusLabels: Record<string, string> = {
    todo: "Da fare",
    in_progress: "In corso",
    done: "Completato",
    problem: "Problema",
  };

  const duration = job.startedAt && job.completedAt
    ? Math.round((job.completedAt - job.startedAt) / (60 * 1000))
    : null;

  return (
    <AppLayout 
      role="host"
      userInfo={hostUser ? {
        userId: hostUser.userId,
        username: hostUser.username,
        profileImageUrl: hostUser.profileImageUrl,
      } : undefined}
    >
      <Box maxW="3xl" mx="auto" p={{ base: 4, sm: 6 }}>
        <VStack spacing={4} align="stretch">
          <HStack justify="space-between">
            <Link
              href={
                associatedStay && clientId
                  ? `/app/host/stay/${encodeURIComponent(associatedStay.stayId)}?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(job.aptId)}`
                  : clientId
                  ? `/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(job.aptId)}`
                  : "/app/host"
              }
              fontSize="sm"
              opacity={0.7}
              _hover={{ opacity: 1 }}
            >
              ← Torna {associatedStay ? "allo stay" : "alla dashboard"}
            </Link>
          </HStack>

          {/* Header con informazioni principali */}
          <Card>
            <CardBody p={4}>
              <HStack justify="space-between" gap={4} align="start">
                <Box flex={1}>
                  <Heading as="h2" size="md" fontWeight="semibold">
                    {aptName}
                  </Heading>
                  <Text fontSize="sm" opacity={0.7} mt={1}>
                    ID pulizia assegnata: {job.id}
                  </Text>
                  {job.windowLabel && (
                    <Text fontSize="sm" opacity={0.7} mt={1}>
                      Finestra oraria: {job.windowLabel}
                    </Text>
                  )}
                </Box>
                <Badge
                  variant={statusVariant[job.status] ?? "warning"}
                  size="sm"
                  px={3}
                  py={1}
                  borderRadius="lg"
                  fontSize="sm"
                  fontWeight="semibold"
                >
                  {statusLabels[job.status] ?? job.status}
                </Badge>
              </HStack>
            </CardBody>
          </Card>

          {/* Informazioni sullo stay associato */}
          {associatedStay && (
            <Card>
              <CardBody p={4}>
                <VStack spacing={3} align="stretch">
                  <Text fontSize="sm" opacity={0.7} mb={3}>
                    Soggiorno associato
                  </Text>
                  <VStack spacing={2} align="stretch">
                    <HStack justify="space-between">
                      <Text fontSize="xs" opacity={0.6}>Stay ID</Text>
                      <Text fontFamily="mono" fontSize="sm">
                        {associatedStay.stayId}
                      </Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="xs" opacity={0.6}>Check-in</Text>
                      <Text fontSize="sm">
                        {fmtDTFull(associatedStay.checkInAt)}
                      </Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="xs" opacity={0.6}>Check-out</Text>
                      <Text fontSize="sm">
                        {fmtDTFull(associatedStay.checkOutAt)}
                      </Text>
                    </HStack>
                    {associatedStay.cleanerName && (
                      <HStack justify="space-between">
                        <Text fontSize="xs" opacity={0.6}>Cleaner assegnato</Text>
                        <Text fontSize="sm" fontWeight="semibold">
                          {associatedStay.cleanerName}
                        </Text>
                      </HStack>
                    )}
                    {associatedStay.guests && associatedStay.guests.length > 0 && (
                      <HStack justify="space-between">
                        <Text fontSize="xs" opacity={0.6}>Ospiti</Text>
                        <Text fontSize="sm">
                          {associatedStay.guests.length} ospite/i
                        </Text>
                      </HStack>
                    )}
                    <Box mt={3} pt={3} borderTop="1px solid" borderColor="var(--border-light)">
                      <Button
                        as={Link}
                        href={`/app/host/stay/${encodeURIComponent(associatedStay.stayId)}?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(job.aptId)}`}
                        size="sm"
                        borderRadius="lg"
                        bg="rgba(6, 182, 212, 0.2)"
                        border="1px solid"
                        borderColor="rgba(6, 182, 212, 0.3)"
                        _hover={{ bg: "rgba(6, 182, 212, 0.3)" }}
                        px={3}
                        py={2}
                        fontSize="xs"
                      >
                        Vai al dettaglio stay →
                      </Button>
                    </Box>
                  </VStack>
                </VStack>
              </CardBody>
            </Card>
          )}

          {/* Foto finali */}
          {job.finalPhotos && job.finalPhotos.length > 0 && (
            <Card>
              <CardBody p={4}>
                <VStack spacing={3} align="stretch">
                  <Text fontSize="sm" opacity={0.7} mb={3}>
                    Foto finali
                  </Text>
                  <Grid templateColumns={{ base: "repeat(2, 1fr)", sm: "repeat(3, 1fr)" }} gap={3}>
                    {job.finalPhotos.map((photo, idx) => (
                      <Box
                        key={idx}
                        position="relative"
                        aspectRatio="1"
                        borderRadius="lg"
                        overflow="hidden"
                        border="1px solid"
                        borderColor="var(--border-light)"
                      >
                        <Image src={photo} alt={`Foto finale ${idx + 1}`} w="100%" h="100%" objectFit="cover" />
                      </Box>
                    ))}
                  </Grid>
                </VStack>
              </CardBody>
            </Card>
          )}

          {/* Problema - Note e foto */}
          {job.status === "problem" && (job.problemNote || (job.problemPhotos && job.problemPhotos.length > 0)) && (
            <Card bg="rgba(239, 68, 68, 0.1)" border="1px solid" borderColor="rgba(239, 68, 68, 0.2)">
              <CardBody p={4}>
                <VStack spacing={3} align="stretch">
                  <HStack justify="space-between" mb={3}>
                    <Text fontSize="sm" fontWeight="semibold" color="rgba(254, 226, 226, 1)">
                      ⚠️ Problema segnalato
                    </Text>
                    <Box as="form" action={async () => {
                      "use server";
                      resolveProblem(jobId);
                      revalidatePath(`/app/host/job/${jobId}`);
                      redirect(`/app/host/job/${jobId}`);
                    }}>
                      <Button
                        type="submit"
                        size="sm"
                        borderRadius="xl"
                        bg="rgba(16, 185, 129, 0.2)"
                        _hover={{ bg: "rgba(16, 185, 129, 0.3)" }}
                        border="1px solid"
                        borderColor="rgba(16, 185, 129, 0.3)"
                        px={3}
                        py={1.5}
                        fontSize="xs"
                        fontWeight="semibold"
                      >
                        Risolvi problema
                      </Button>
                    </Box>
                  </HStack>
                  
                  {job.problemNote && (
                    <Box mb={3}>
                      <Text fontSize="xs" opacity={0.7} mb={1}>Note</Text>
                      <Text fontSize="sm" opacity={0.9}>
                        {job.problemNote}
                      </Text>
                    </Box>
                  )}

                  {job.problemPhotos && job.problemPhotos.length > 0 && (
                    <Box>
                      <Text fontSize="xs" opacity={0.7} mb={2}>Foto</Text>
                      <Grid templateColumns={{ base: "repeat(2, 1fr)", sm: "repeat(3, 1fr)" }} gap={3}>
                        {job.problemPhotos.map((photo, idx) => (
                          <Box
                            key={idx}
                            position="relative"
                            aspectRatio="1"
                            borderRadius="lg"
                            overflow="hidden"
                            border="1px solid"
                            borderColor="rgba(239, 68, 68, 0.3)"
                          >
                            <Image src={photo} alt={`Foto problema ${idx + 1}`} w="100%" h="100%" objectFit="cover" />
                          </Box>
                        ))}
                      </Grid>
                    </Box>
                  )}
                </VStack>
              </CardBody>
            </Card>
          )}

          {/* Checklist */}
          <Card>
            <CardBody p={4}>
              <VStack spacing={3} align="stretch">
                <Text fontSize="sm" opacity={0.7} mb={3}>
                  Checklist
                </Text>
                <VStack spacing={2} align="stretch">
                  {job.checklist && job.checklist.length > 0 ? (
                    job.checklist.map((item) => {
                      return (
                        <Card key={item.id} variant="outlined">
                          <CardBody p={3}>
                            <HStack spacing={3}>
                              <Box
                                w={5}
                                h={5}
                                borderRadius="md"
                                border="2px solid"
                                borderColor={item.done ? "rgba(16, 185, 129, 0.5)" : "var(--border-light)"}
                                bg={item.done ? "rgba(16, 185, 129, 0.3)" : "var(--bg-secondary)"}
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                flexShrink={0}
                              >
                                {item.done && (
                                  <CheckIcon size={12} color="rgba(16, 185, 129, 1)" />
                                )}
                              </Box>
                              <Text flex={1} textDecoration={item.done ? "line-through" : "none"} opacity={item.done ? 0.5 : 1}>
                                {item.label}
                              </Text>
                            </HStack>
                          </CardBody>
                        </Card>
                      );
                    })
                  ) : (
                    <Text fontSize="sm" opacity={0.6}>
                      Nessuna checklist disponibile
                    </Text>
                  )}
                </VStack>
                {job.checklist && job.checklist.length > 0 && (
                  <Box mt={3} pt={3} borderTop="1px solid" borderColor="var(--border-light)">
                    <Text fontSize="xs" opacity={0.6}>
                      Completati: {job.checklist.filter((i) => i.done).length} / {job.checklist.length}
                    </Text>
                  </Box>
                )}
              </VStack>
            </CardBody>
          </Card>

          {/* Timestamp e durata */}
          <Card>
            <CardBody p={4}>
              <VStack spacing={3} align="stretch">
                <Text fontSize="sm" opacity={0.7} mb={3}>
                  Cronologia
                </Text>
                <VStack spacing={2} align="stretch">
                  {job.startedAt && (
                    <HStack justify="space-between">
                      <Text fontSize="xs" opacity={0.6}>Avviato il</Text>
                      <Text fontSize="sm">
                        {fmtDTFull(job.startedAt)}
                      </Text>
                    </HStack>
                  )}
                  {job.completedAt && (
                    <HStack justify="space-between">
                      <Text fontSize="xs" opacity={0.6}>Completato il</Text>
                      <Text fontSize="sm">
                        {fmtDTFull(job.completedAt)}
                      </Text>
                    </HStack>
                  )}
                  {duration !== null && (
                    <HStack justify="space-between">
                      <Text fontSize="xs" opacity={0.6}>Durata</Text>
                      <Text fontSize="sm" fontWeight="semibold">
                        {duration} minuti
                      </Text>
                    </HStack>
                  )}
                  {!job.startedAt && !job.completedAt && (
                    <Text fontSize="sm" opacity={0.6}>
                      Job non ancora avviato
                    </Text>
                  )}
                </VStack>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Box>
    </AppLayout>
  );
}
