import { cookies } from "next/headers";
import { readSession, validateSessionUser } from "@/app/lib/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  cleaningStore,
  getJob,
  startJob,
  toggleChecklist,
  completeJob,
  markProblem,
  resolveProblem,
  generatePlaceholderPhoto,
} from "@/app/lib/cleaningstore";
import { listPinsByApt } from "@/app/lib/store";
import * as Store from "@/app/lib/store";
import { door_open, door_close, door_getStateFromLog } from "@/app/lib/domain/doorStore";
import { gate_open } from "@/app/lib/domain/gateStore";
import { ProblemModal } from "./ProblemModal";
import { AppLayout } from "@/app/components/layouts/AppLayout";
import { Box, VStack, HStack, Heading, Text, Grid, GridItem, Image } from "@chakra-ui/react";
import { Card, CardBody } from "@/app/components/ui/Card";
import { Alert } from "@/app/components/ui/Alert";
import { Link } from "@/app/components/ui/Link";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Badge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CleanerJobPage({
  params,
  searchParams,
}: {
  params: { jobId: string } | Promise<{ jobId: string }>;
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
}) {
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

  const resolvedParams = await Promise.resolve(params as any);
  const jobIdRaw = (resolvedParams as any)?.jobId;
  const jobId = Array.isArray(jobIdRaw) ? jobIdRaw[0] : jobIdRaw;
  const jobIdStr = String(jobId ?? "");

  const spResolved = (await Promise.resolve(searchParams as any)) ?? {};
  const sp = spResolved as Record<string, string | string[] | undefined>;
  const start = sp.start === "1";
  const done = sp.done === "1";
  const problem = sp.problem === "1";
  const resolve = sp.resolve === "1";
  const toggle =
    typeof sp.toggle === "string"
      ? sp.toggle
      : Array.isArray(sp.toggle)
        ? sp.toggle[0]
        : undefined;

  // Mutazioni server-side
  if (start) {
    startJob(jobIdStr);
    redirect(`/app/cleaner/${jobIdStr}`);
  }
  if (done) {
    completeJob(jobIdStr);
    redirect(`/app/cleaner/${jobIdStr}`);
  }
  if (problem) {
    markProblem(jobIdStr);
    redirect(`/app/cleaner/${jobIdStr}`);
  }
  if (toggle) {
    const currentJob = getJob(jobIdStr);
    if (currentJob && currentJob.status === "todo") {
      // Non fare nulla
    } else {
      toggleChecklist(jobIdStr, toggle);
    }
    redirect(`/app/cleaner/${jobIdStr}`);
  }
  if (resolve) {
    resolveProblem(jobIdStr);
    redirect(`/app/cleaner/${jobIdStr}`);
  }

  const job = getJob(jobIdStr);

  if (!job) {
    return (
      <AppLayout role="cleaner">
        <Box maxW="2xl" mx="auto" p={{ base: 4, sm: 6 }}>
          <VStack spacing={3} align="stretch">
            <Link href="/app/cleaner" fontSize="sm" opacity={0.7} _hover={{ opacity: 1 }}>
              ← Torna a Pulizie
            </Link>
            <Heading as="h2" size="lg" fontWeight="semibold">
              Pulizia assegnata non trovata
            </Heading>
            <Text fontSize="sm" opacity={0.6}>
              Pulizia assegnata richiesta: {jobIdStr}
            </Text>
            <Text fontSize="xs" opacity={0.5} mt={2}>
              Store keys: {Array.from(cleaningStore.keys()).join(", ")}
            </Text>
          </VStack>
        </Box>
      </AppLayout>
    );
  }

  const cleanerPins = listPinsByApt(me.aptId).filter((p) => p.role === "cleaner");
  const hasAccess = job.aptId === me.aptId || (job.stayId && cleanerPins.some((p) => p.stayId === job.stayId));
  
  if (!hasAccess) {
    return (
      <AppLayout role="cleaner">
        <Box maxW="2xl" mx="auto" p={{ base: 4, sm: 6 }}>
          <VStack spacing={3} align="stretch">
            <Link href="/app/cleaner" fontSize="sm" opacity={0.7} _hover={{ opacity: 1 }}>
              ← Torna a Pulizie
            </Link>
            <Heading as="h2" size="lg" fontWeight="semibold">
              Non autorizzato
            </Heading>
          </VStack>
        </Box>
      </AppLayout>
    );
  }

  const aptId = job.aptId;
  const doorState = door_getStateFromLog(Store, aptId);
  const doorIsOpen = doorState === "open";
  const photoItem = job.checklist.find((it) => it.label.includes("Foto finali"));
  const photoItemDone = photoItem?.done ?? false;
  const hasFinalPhotos = job.finalPhotos && job.finalPhotos.length > 0;
  const allChecklistDone = job.checklist.every((it) => it.done);

  async function actOpenDoor() {
    "use server";
    const outcome = door_open(aptId);
    if (outcome === "ok") {
      Store.logAccessEvent(aptId, "door_opened", "[cleaner] Porta aperta dal cleaner");
    } else {
      Store.logAccessEvent(aptId, "guest_access_ko", "[cleaner] Tentativo apertura porta fallito");
    }
    revalidatePath(`/app/cleaner/${jobIdStr}`);
    redirect(`/app/cleaner/${jobIdStr}`);
  }

  async function actCloseDoor() {
    "use server";
    const outcome = door_close(aptId);
    if (outcome === "ok") {
      Store.logAccessEvent(aptId, "door_closed", "[cleaner] Porta chiusa dal cleaner");
    } else {
      Store.logAccessEvent(aptId, "guest_access_ko", "[cleaner] Tentativo chiusura porta fallito");
    }
    revalidatePath(`/app/cleaner/${jobIdStr}`);
    redirect(`/app/cleaner/${jobIdStr}`);
  }

  async function actOpenGate() {
    "use server";
    const outcome = gate_open(aptId);
    if (outcome === "ok") {
      Store.logAccessEvent(aptId, "gate_opened", "[cleaner] Portone aperto dal cleaner");
    } else {
      Store.logAccessEvent(aptId, "guest_access_ko", "[cleaner] Tentativo apertura portone fallito");
    }
    revalidatePath(`/app/cleaner/${jobIdStr}`);
    redirect(`/app/cleaner/${jobIdStr}`);
  }

  async function actUploadFinalPhotos() {
    "use server";
    const currentJob = getJob(jobIdStr);
    if (!currentJob) {
      redirect(`/app/cleaner/${jobIdStr}`);
      return;
    }
    const photoCount = 2 + Math.floor(Math.random() * 2);
    const photos: string[] = [];
    for (let i = 0; i < photoCount; i++) {
      photos.push(generatePlaceholderPhoto(i + 1));
    }
    currentJob.finalPhotos = photos;
    cleaningStore.set(jobIdStr, currentJob);
    revalidatePath(`/app/cleaner/${jobIdStr}`);
    redirect(`/app/cleaner/${jobIdStr}`);
  }

  async function handleReportProblem(formData: FormData) {
    "use server";
    const note = formData.get("note")?.toString() || "";
    const formJobId = formData.get("jobId")?.toString() || jobIdStr;
    const photoCount = 2 + Math.floor(Math.random() * 2);
    const photos: string[] = [];
    for (let i = 0; i < photoCount; i++) {
      photos.push(generatePlaceholderPhoto(i + 1));
    }
    markProblem(formJobId, {
      note: note.trim() || undefined,
      photos: photos,
    });
    revalidatePath(`/app/cleaner/${formJobId}`);
    redirect(`/app/cleaner/${formJobId}`);
  }
  
  async function actResolveProblem() {
    "use server";
    resolveProblem(jobIdStr);
    revalidatePath(`/app/cleaner/${jobIdStr}`);
    redirect(`/app/cleaner/${jobIdStr}`);
  }

  return (
    <AppLayout role="cleaner">
      <Box maxW="2xl" mx="auto" p={{ base: 4, sm: 6 }}>
        <VStack spacing={4} align="stretch">
          <Link href="/app/cleaner" fontSize="sm" opacity={0.7} _hover={{ opacity: 1 }}>
            ← Torna a Pulizie
          </Link>

          <Card>
            <CardBody p={4}>
              <HStack justify="space-between" gap={3} align="start">
                <Box>
                  <Heading as="h2" size="md" fontWeight="semibold">
                    {job.aptName}
                  </Heading>
                  <Text fontSize="sm" opacity={0.7}>
                    {job.windowLabel}
                  </Text>
                </Box>
                <Box textAlign="right" fontSize="sm">
                  <Text opacity={0.7}>Stato</Text>
                  <Text fontWeight="semibold">
                    {job.status === "todo" && "Da fare"}
                    {job.status === "in_progress" && "In corso"}
                    {job.status === "done" && "Completato"}
                    {job.status === "problem" && "Problema"}
                  </Text>
                </Box>
              </HStack>
            </CardBody>
          </Card>

          <Card>
            <CardBody p={4}>
              <VStack spacing={3} align="stretch">
                <Text fontSize="sm" opacity={0.7}>Checklist</Text>

                {job.status === "todo" && (
                  <Alert variant="warning" mb={2}>
                    <Text fontSize="sm">
                      ⚠️ Avvia la pulizia assegnata per poter spuntare gli elementi della checklist
                    </Text>
                  </Alert>
                )}

                <VStack spacing={2} align="stretch">
                  {job.checklist.map((it) => {
                    const canToggle = job.status !== "todo" && job.status !== "done";
                    return (
                      <Box
                        key={it.id}
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        gap={3}
                        borderRadius="xl"
                        px={2}
                        py={2}
                        bg={canToggle ? "transparent" : "var(--bg-secondary)"}
                        opacity={canToggle ? 1 : 0.5}
                        cursor={canToggle ? "pointer" : "not-allowed"}
                        _hover={canToggle ? { bg: "var(--bg-card)" } : {}}
                      >
                        {canToggle ? (
                          <Box
                            as={Link}
                            href={`/app/cleaner/${jobIdStr}?toggle=${encodeURIComponent(it.id)}`}
                            display="flex"
                            alignItems="center"
                            justifyContent="space-between"
                            gap={3}
                            w="100%"
                          >
                            <HStack spacing={3}>
                              <Box
                                h={5}
                                w={5}
                                borderRadius="md"
                                border="1px solid"
                                borderColor={it.done ? "rgba(6, 182, 212, 0.4)" : "var(--border-light)"}
                                bg={it.done ? "rgba(6, 182, 212, 0.4)" : "transparent"}
                              />
                              <Text textDecoration={it.done ? "line-through" : "none"} opacity={it.done ? 0.6 : 1}>
                                {it.label}
                              </Text>
                            </HStack>
                            <Text fontSize="sm" opacity={0.7} _hover={{ opacity: 1 }}>
                              {it.done ? "Undo" : "Fatto"}
                            </Text>
                          </Box>
                        ) : (
                          <>
                            <HStack spacing={3}>
                              <Box
                                h={5}
                                w={5}
                                borderRadius="md"
                                border="1px solid"
                                borderColor={it.done ? "rgba(6, 182, 212, 0.4)" : "var(--border-light)"}
                                bg={it.done ? "rgba(6, 182, 212, 0.4)" : "transparent"}
                              />
                              <Text textDecoration={it.done ? "line-through" : "none"} opacity={it.done ? 0.6 : 1}>
                                {it.label}
                              </Text>
                            </HStack>
                            {job.status === "done" ? (
                              <Text fontSize="xs" opacity={0.5}>
                                Completato
                              </Text>
                            ) : (
                              <Text fontSize="sm" opacity={0.5}>
                                {it.done ? "Undo" : "Fatto"}
                              </Text>
                            )}
                          </>
                        )}
                      </Box>
                    );
                  })}
                </VStack>
              </VStack>
            </CardBody>
          </Card>

          <Card>
            <CardBody p={4}>
              <VStack spacing={3} align="stretch">
                <Text fontSize="sm" opacity={0.7} mb={2}>Controllo accessi</Text>
                
                <VStack spacing={3} align="stretch">
                  <Box>
                    <Text fontSize="xs" opacity={0.6} mb={2}>Porta</Text>
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
                  </Box>

                  <HStack spacing={2} flexWrap="wrap">
                    {doorIsOpen ? (
                      <Box as="form" action={actCloseDoor}>
                        <Button
                          type="submit"
                          borderRadius="xl"
                          bg="rgba(16, 185, 129, 0.25)"
                          border="1px solid"
                          borderColor="rgba(16, 185, 129, 0.3)"
                          _hover={{ bg: "rgba(16, 185, 129, 0.35)" }}
                          px={4}
                          py={2}
                          fontSize="sm"
                          fontWeight="semibold"
                        >
                          Chiudi porta
                        </Button>
                      </Box>
                    ) : (
                      <Box as="form" action={actOpenDoor}>
                        <Button
                          type="submit"
                          borderRadius="xl"
                          bg="rgba(16, 185, 129, 0.25)"
                          border="1px solid"
                          borderColor="rgba(16, 185, 129, 0.3)"
                          _hover={{ bg: "rgba(16, 185, 129, 0.35)" }}
                          px={4}
                          py={2}
                          fontSize="sm"
                          fontWeight="semibold"
                        >
                          Apri porta
                        </Button>
                      </Box>
                    )}

                    <Box as="form" action={actOpenGate}>
                      <Button
                        type="submit"
                        borderRadius="xl"
                        bg="rgba(16, 185, 129, 0.25)"
                        border="1px solid"
                        borderColor="rgba(16, 185, 129, 0.3)"
                        _hover={{ bg: "rgba(16, 185, 129, 0.35)" }}
                        px={4}
                        py={2}
                        fontSize="sm"
                        fontWeight="semibold"
                      >
                        Apri portone
                      </Button>
                    </Box>
                  </HStack>
                </VStack>
              </VStack>
            </CardBody>
          </Card>

          {/* Foto finali */}
          {photoItemDone && job.status === "in_progress" && (
            <Card>
              <CardBody p={4}>
                <VStack spacing={3} align="stretch">
                  <Text fontSize="sm" opacity={0.7} mb={2}>Foto finali</Text>
                  
                  {hasFinalPhotos ? (
                    <VStack spacing={3} align="stretch">
                      <Grid templateColumns={{ base: "repeat(2, 1fr)", sm: "repeat(3, 1fr)" }} gap={2}>
                        {job.finalPhotos?.map((photo, idx) => (
                          <Box
                            key={idx}
                            position="relative"
                            aspectRatio="1"
                            borderRadius="lg"
                            overflow="hidden"
                            border="1px solid"
                            borderColor="var(--border-light)"
                          >
                            <Image src={photo} alt={`Foto ${idx + 1}`} w="100%" h="100%" objectFit="cover" />
                          </Box>
                        ))}
                      </Grid>
                      <Box as="form" action={actUploadFinalPhotos}>
                        <Button
                          type="submit"
                          w="100%"
                          borderRadius="xl"
                          bg="var(--bg-card)"
                          _hover={{ bg: "var(--bg-tertiary)" }}
                          border="1px solid"
                          borderColor="var(--border-light)"
                          px={4}
                          py={2}
                          fontSize="sm"
                          fontWeight="semibold"
                        >
                          Sostituisci foto
                        </Button>
                      </Box>
                    </VStack>
                  ) : (
                    <VStack spacing={3} align="stretch">
                      <Grid templateColumns="repeat(3, 1fr)" gap={2}>
                        {[1, 2, 3].map((num) => (
                          <Box
                            key={num}
                            position="relative"
                            aspectRatio="1"
                            borderRadius="lg"
                            overflow="hidden"
                            border="1px solid"
                            borderColor="var(--border-light)"
                            bg="#4a5568"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                          >
                            <Text fontSize="sm" color="#a0aec0" fontWeight="semibold">
                              Foto {num}
                            </Text>
                          </Box>
                        ))}
                      </Grid>
                      <Box as="form" action={actUploadFinalPhotos}>
                        <Button
                          type="submit"
                          w="100%"
                          borderRadius="xl"
                          bg="rgba(6, 182, 212, 0.25)"
                          _hover={{ bg: "rgba(6, 182, 212, 0.35)" }}
                          border="1px solid"
                          borderColor="rgba(6, 182, 212, 0.3)"
                          px={4}
                          py={2}
                          fontSize="sm"
                          fontWeight="semibold"
                        >
                          Genera foto finali
                        </Button>
                      </Box>
                    </VStack>
                  )}
                </VStack>
              </CardBody>
            </Card>
          )}

          <HStack spacing={3} flexWrap="wrap">
            {job.status === "todo" && (
              <Button
                as={Link}
                href={`/app/cleaner/${jobIdStr}?start=1`}
                borderRadius="xl"
                bg="rgba(6, 182, 212, 0.25)"
                _hover={{ bg: "rgba(6, 182, 212, 0.35)" }}
                border="1px solid"
                borderColor="rgba(6, 182, 212, 0.3)"
                px={4}
                py={2}
                fontWeight="semibold"
              >
                Avvia
              </Button>
            )}

            {job.status === "in_progress" && (
              <>
                {!allChecklistDone ? (
                  <VStack align="stretch" spacing={2}>
                    <Box
                      borderRadius="xl"
                      bg="rgba(107, 114, 128, 0.2)"
                      border="1px solid"
                      borderColor="rgba(156, 163, 175, 0.3)"
                      opacity={0.5}
                      cursor="not-allowed"
                      px={4}
                      py={2}
                      fontWeight="semibold"
                      display="inline-block"
                    >
                      Completa (checklist incompleta)
                    </Box>
                    <Text fontSize="xs" color="var(--accent-warning)" opacity={0.9}>
                      ⚠️ Devi completare tutti gli item della checklist prima di completare la pulizia assegnata
                    </Text>
                  </VStack>
                ) : photoItemDone && !hasFinalPhotos ? (
                  <VStack align="stretch" spacing={2}>
                    <Box
                      borderRadius="xl"
                      bg="rgba(107, 114, 128, 0.2)"
                      border="1px solid"
                      borderColor="rgba(156, 163, 175, 0.3)"
                      opacity={0.5}
                      cursor="not-allowed"
                      px={4}
                      py={2}
                      fontWeight="semibold"
                      display="inline-block"
                    >
                      Completa (foto finali obbligatorie)
                    </Box>
                    <Text fontSize="xs" color="var(--accent-warning)" opacity={0.9}>
                      ⚠️ Devi caricare le foto finali prima di completare la pulizia assegnata
                    </Text>
                  </VStack>
                ) : (
                  <Button
                    as={Link}
                    href={`/app/cleaner/${jobIdStr}?done=1`}
                    borderRadius="xl"
                    bg="rgba(16, 185, 129, 0.2)"
                    _hover={{ bg: "rgba(16, 185, 129, 0.3)" }}
                    border="1px solid"
                    borderColor="rgba(16, 185, 129, 0.3)"
                    px={4}
                    py={2}
                    fontWeight="semibold"
                  >
                    Completa
                  </Button>
                )}
              </>
            )}

            {job.status === "problem" ? (
              <Box as="form" action={actResolveProblem}>
                <Button
                  type="submit"
                  borderRadius="xl"
                  bg="rgba(16, 185, 129, 0.2)"
                  _hover={{ bg: "rgba(16, 185, 129, 0.3)" }}
                  border="1px solid"
                  borderColor="rgba(16, 185, 129, 0.3)"
                  px={4}
                  py={2}
                  fontWeight="semibold"
                >
                  Risolvi problema
                </Button>
              </Box>
            ) : (
              <ProblemModal jobId={jobIdStr} onReport={handleReportProblem} />
            )}
          </HStack>
        </VStack>
      </Box>
    </AppLayout>
  );
}
