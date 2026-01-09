import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { readSession, validateSessionUser } from "@/app/lib/session";
import {
  listClients,
  getClient,
  listApartmentsByClient,
  getApartment,
  createClient,
  updateClient,
  deleteClient,
  createApartment,
  updateApartment,
  deleteApartment,
  type Client,
  type Apartment,
  type ApartmentStatus,
} from "@/app/lib/clientStore";
import { getUser } from "@/app/lib/userStore";
import { AppLayout } from "@/app/components/layouts/AppLayout";
import { Box, VStack, HStack, Heading, Text, Grid, GridItem, Field } from "@chakra-ui/react";
import { Select } from "@/app/components/ui/Select";
import { Card, CardBody, CardHeader } from "@/app/components/ui/Card";
import { Link } from "@/app/components/ui/Link";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { Badge } from "@/app/components/ui/Badge";
import { Alert } from "@/app/components/ui/Alert";

export const dynamic = "force-dynamic";

export default async function TechClientsPage({
  searchParams,
}: {
  searchParams?:
    | { action?: string; clientId?: string; aptId?: string; err?: string }
    | Promise<{ action?: string; clientId?: string; aptId?: string; err?: string }>;
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

  const sp = await Promise.resolve(searchParams ?? {});
  const action = sp.action;
  const clientId = sp.clientId;
  const aptId = sp.aptId;
  const err = sp.err;

  const clients = listClients();
  const selectedClient = clientId ? getClient(clientId) : null;
  const selectedApartment = aptId ? getApartment(aptId) : null;

  // Server Actions - Client
  async function handleCreateClient(formData: FormData) {
    "use server";
    const name = (formData.get("name")?.toString() ?? "").trim();

    if (!name) {
      redirect("/app/tech/clients?action=create&err=missing");
    }

    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || `client-${Date.now()}`;

    try {
      createClient(id, name);
    } catch (error: any) {
      redirect(`/app/tech/clients?action=create&err=${encodeURIComponent(error.message)}`);
    }
    
    redirect("/app/tech/clients");
  }

  async function handleUpdateClient(formData: FormData) {
    "use server";
    const id = (formData.get("clientId")?.toString() ?? "").trim();
    const name = (formData.get("name")?.toString() ?? "").trim();

    if (!id || !name) {
      redirect(`/app/tech/clients?action=edit&clientId=${id}&err=missing`);
    }

    const updated = updateClient(id, name);
    if (!updated) {
      redirect("/app/tech/clients?err=notfound");
    }

    redirect(`/app/tech/clients?clientId=${id}`);
  }

  async function handleDeleteClient(formData: FormData) {
    "use server";
    const id = formData.get("clientId")?.toString() ?? "";
    if (!id) return;

    deleteClient(id);
    redirect("/app/tech/clients");
  }

  // Server Actions - Apartment
  async function handleCreateApartment(formData: FormData) {
    "use server";
    const cId = (formData.get("clientId")?.toString() ?? "").trim();
    const name = (formData.get("name")?.toString() ?? "").trim();
    const addressShort = (formData.get("addressShort")?.toString() ?? "").trim() || undefined;

    if (!cId || !name) {
      redirect(`/app/tech/clients?action=createApt&clientId=${cId}&err=missing`);
    }

    const id = `apt-${Date.now()}`;
    const status = "ok" as ApartmentStatus;

    try {
      createApartment(cId, id, {
        name,
        status,
        addressShort,
      });
    } catch (error: any) {
      redirect(`/app/tech/clients?action=createApt&clientId=${cId}&err=${encodeURIComponent(error.message)}`);
    }
    
    redirect(`/app/tech/clients?clientId=${cId}`);
  }

  async function handleUpdateApartment(formData: FormData) {
    "use server";
    const id = (formData.get("aptId")?.toString() ?? "").trim();
    const name = (formData.get("name")?.toString() ?? "").trim();
    const status = (formData.get("status")?.toString() ?? "ok") as ApartmentStatus;
    const addressShort = (formData.get("addressShort")?.toString() ?? "").trim() || undefined;

    if (!id || !name) {
      redirect(`/app/tech/clients?action=editApt&aptId=${id}&err=missing`);
    }

    const apt = getApartment(id);
    if (!apt) {
      redirect("/app/tech/clients?err=aptnotfound");
    }

    updateApartment(id, {
      name,
      status,
      addressShort,
    });

    redirect(`/app/tech/clients?clientId=${apt.clientId}`);
  }

  async function handleDeleteApartment(formData: FormData) {
    "use server";
    const id = formData.get("aptId")?.toString() ?? "";
    const cId = formData.get("clientId")?.toString() ?? "";
    if (!id) return;

    deleteApartment(id);
    redirect(`/app/tech/clients?clientId=${cId}`);
  }

  // Determine view mode
  const isCreateClient = action === "create";
  const isEditClient = action === "edit" && selectedClient;
  const isCreateApt = action === "createApt" && selectedClient;
  const isEditApt = action === "editApt" && selectedApartment;
  const isClientDetail = clientId && selectedClient && !action;

  const techUser = me.userId ? getUser(me.userId) : null;

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
          <HStack justify="space-between">
            <Link href="/app/tech" fontSize="sm" opacity={0.7} _hover={{ opacity: 1 }}>
              ← Torna a Tech
            </Link>
          </HStack>

          <Card>
            <CardBody p={4}>
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between" mb={4}>
                  <Box>
                    <Heading as="h2" size="md" fontWeight="semibold">
                      Gestione Clienti e Appartamenti
                    </Heading>
                    <Text fontSize="sm" opacity={0.7}>
                      Crea e gestisci clienti e appartamenti
                    </Text>
                  </Box>
                  {!isCreateClient && !isEditClient && !isCreateApt && !isEditApt && !isClientDetail && (
                    <Button
                      as={Link}
                      href="/app/tech/clients?action=create"
                      borderRadius="xl"
                      bg="rgba(6, 182, 212, 0.2)"
                      _hover={{ bg: "rgba(6, 182, 212, 0.3)" }}
                      border="1px solid"
                      borderColor="rgba(6, 182, 212, 0.3)"
                      px={4}
                      py={2}
                      fontWeight="semibold"
                      fontSize="sm"
                      whiteSpace="nowrap"
                    >
                      + Nuovo Cliente
                    </Button>
                  )}
                </HStack>

                {/* Error Messages */}
                {err === "missing" && (
                  <Alert variant="error">
                    Compila tutti i campi obbligatori
                  </Alert>
                )}
                {err === "notfound" && (
                  <Alert variant="error">
                    Cliente non trovato
                  </Alert>
                )}
                {err === "aptnotfound" && (
                  <Alert variant="error">
                    Appartamento non trovato
                  </Alert>
                )}
                {err && err !== "missing" && err !== "notfound" && err !== "aptnotfound" && err !== "NEXT_REDIRECT" && (
                  <Alert variant="error">
                    {decodeURIComponent(err)}
                  </Alert>
                )}

                {/* Form Create Client */}
                {isCreateClient && (
                  <Card variant="outlined">
                    <CardBody p={4}>
                      <VStack spacing={4} align="stretch">
                        <Text fontSize="sm" fontWeight="semibold" mb={4}>
                          Crea Nuovo Cliente
                        </Text>
                        <Box as="form" action={handleCreateClient}>
                          <VStack spacing={4} align="stretch">
                            <Input
                              type="text"
                              label="Client ID"
                              disabled
                              placeholder="Generato automaticamente dal BE"
                              helperText="Il Client ID verrà generato automaticamente dal backend"
                            />
                            <Input
                              type="text"
                              name="name"
                              label="Nome *"
                              required
                              placeholder="Nome del cliente"
                            />
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
                                Crea Cliente
                              </Button>
                              <Button
                                as={Link}
                                href="/app/tech/clients"
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
                      </VStack>
                    </CardBody>
                  </Card>
                )}

                {/* Form Edit Client */}
                {isEditClient && (
                  <Card variant="outlined">
                    <CardBody p={4}>
                      <VStack spacing={4} align="stretch">
                        <Text fontSize="sm" fontWeight="semibold" mb={4}>
                          Modifica Cliente: {selectedClient!.name}
                        </Text>
                        <Box as="form" action={handleUpdateClient}>
                          <VStack spacing={4} align="stretch">
                            <input type="hidden" name="clientId" value={selectedClient!.clientId} />
                            <Input
                              type="text"
                              label="Client ID (non modificabile)"
                              value={selectedClient!.clientId}
                              disabled
                            />
                            <Input
                              type="text"
                              name="name"
                              label="Nome"
                              defaultValue={selectedClient!.name}
                              required
                            />
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
                                Salva Modifiche
                              </Button>
                              <Button
                                as={Link}
                                href={`/app/tech/clients?clientId=${selectedClient!.clientId}`}
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
                      </VStack>
                    </CardBody>
                  </Card>
                )}

                {/* Form Create Apartment */}
                {isCreateApt && (
                  <Card variant="outlined">
                    <CardBody p={4}>
                      <VStack spacing={4} align="stretch">
                        <Text fontSize="sm" fontWeight="semibold" mb={4}>
                          Crea Nuovo Appartamento per {selectedClient!.name}
                        </Text>
                        <Box as="form" action={handleCreateApartment}>
                          <VStack spacing={4} align="stretch">
                            <input type="hidden" name="clientId" value={selectedClient!.clientId} />
                            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4}>
                              <Input
                                type="text"
                                label="Apartment ID"
                                disabled
                                placeholder="Generato automaticamente dal BE"
                                helperText="L'ID verrà generato automaticamente"
                              />
                              <Input
                                type="text"
                                label="Status"
                                disabled
                                placeholder="Generato automaticamente dal BE"
                                helperText="Lo status verrà generato automaticamente"
                              />
                            </Grid>
                            <Input
                              type="text"
                              name="name"
                              label="Nome *"
                              required
                              placeholder="Nome dell'appartamento"
                            />
                            <Input
                              type="text"
                              name="addressShort"
                              label="Indirizzo breve"
                              placeholder="es: Via Demo 12, Milano"
                            />
                            <Text fontSize="xs" opacity={0.6} mt={2}>
                              I dettagli (Wi-Fi, Check-in/out, House Rules, Contatti) possono essere aggiunti successivamente dall'host nella vista appartamento.
                            </Text>
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
                                Crea Appartamento
                              </Button>
                              <Button
                                as={Link}
                                href={`/app/tech/clients?clientId=${selectedClient!.clientId}`}
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
                      </VStack>
                    </CardBody>
                  </Card>
                )}

                {/* Form Edit Apartment */}
                {isEditApt && (
                  <Card variant="outlined">
                    <CardBody p={4}>
                      <VStack spacing={4} align="stretch">
                        <Text fontSize="sm" fontWeight="semibold" mb={4}>
                          Modifica Appartamento: {selectedApartment!.name}
                        </Text>
                        <Box as="form" action={handleUpdateApartment}>
                          <VStack spacing={4} align="stretch">
                            <input type="hidden" name="aptId" value={selectedApartment!.aptId} />
                            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4}>
                              <Input
                                type="text"
                                label="Apartment ID (non modificabile)"
                                value={selectedApartment!.aptId}
                                disabled
                              />
                              <Field.Root>
                                <Field.Label fontSize="sm" fontWeight="medium" mb={2}>Status</Field.Label>
                                <Select
                                  name="status"
                                  defaultValue={selectedApartment!.status}
                                  borderRadius="xl"
                                  bg="var(--bg-secondary)"
                                  border="1px solid"
                                  borderColor="var(--border-light)"
                                  px={4}
                                  py={2}
                                  color="var(--text-primary)"
                                  _focus={{ outline: "none", ring: "2px", ringColor: "rgba(6, 182, 212, 1)" }}
                                >
                                  <option value="ok">OK</option>
                                  <option value="warn">Warn</option>
                                  <option value="crit">Crit</option>
                                </Select>
                              </Field.Root>
                            </Grid>
                            <Input
                              type="text"
                              name="name"
                              label="Nome *"
                              defaultValue={selectedApartment!.name}
                              required
                            />
                            <Input
                              type="text"
                              name="addressShort"
                              label="Indirizzo breve"
                              defaultValue={selectedApartment!.addressShort ?? ""}
                            />
                            <Text fontSize="xs" opacity={0.6} mt={2}>
                              I dettagli (Wi-Fi, Check-in/out, House Rules, Contatti) possono essere modificati dall'host nella vista appartamento.
                            </Text>
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
                                Salva Modifiche
                              </Button>
                              <Button
                                as={Link}
                                href={`/app/tech/clients?clientId=${selectedApartment!.clientId}`}
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
                      </VStack>
                    </CardBody>
                  </Card>
                )}

                {/* Client Detail View */}
                {isClientDetail && (
                  <VStack spacing={2} align="stretch">
                    <Card variant="outlined">
                      <CardBody p={4}>
                        <HStack justify="space-between" mb={4}>
                          <Box>
                            <Heading as="h2" size="md" fontWeight="semibold">
                              {selectedClient!.name}
                            </Heading>
                            <Text fontSize="sm" opacity={0.7}>
                              Client ID: {selectedClient!.clientId}
                            </Text>
                          </Box>
                          <HStack spacing={2}>
                            <Button
                              as={Link}
                              href={`/app/tech/clients?action=edit&clientId=${selectedClient!.clientId}`}
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
                              Modifica Cliente
                            </Button>
                            <Box as="form" action={handleDeleteClient}>
                              <input type="hidden" name="clientId" value={selectedClient!.clientId} />
                              <Button
                                type="submit"
                                variant="danger"
                                size="sm"
                                borderRadius="xl"
                                px={4}
                                py={2}
                                fontWeight="semibold"
                                fontSize="sm"
                              >
                                Elimina Cliente
                              </Button>
                            </Box>
                          </HStack>
                        </HStack>
                      </CardBody>
                    </Card>

                    <Box mt={4}>
                      <HStack justify="space-between" mb={3}>
                        <Text fontSize="sm" fontWeight="semibold">
                          Appartamenti ({listApartmentsByClient(selectedClient!.clientId).length})
                        </Text>
                        <Button
                          as={Link}
                          href={`/app/tech/clients?action=createApt&clientId=${selectedClient!.clientId}`}
                          borderRadius="xl"
                          bg="rgba(6, 182, 212, 0.2)"
                          _hover={{ bg: "rgba(6, 182, 212, 0.3)" }}
                          border="1px solid"
                          borderColor="rgba(6, 182, 212, 0.3)"
                          px={4}
                          py={2}
                          fontWeight="semibold"
                          fontSize="sm"
                          color="rgba(6, 182, 212, 1)"
                        >
                          + Nuovo Appartamento
                        </Button>
                      </HStack>

                      <VStack spacing={2} align="stretch">
                        {listApartmentsByClient(selectedClient!.clientId).length === 0 ? (
                          <Text fontSize="sm" opacity={0.6} py={8} textAlign="center">
                            Nessun appartamento configurato
                          </Text>
                        ) : (
                          listApartmentsByClient(selectedClient!.clientId).map((apt) => {
                            const statusVariant = apt.status === "ok" ? "success" : apt.status === "warn" ? "warning" : "error";
                            return (
                              <Card key={apt.aptId} variant="outlined">
                                <CardBody p={3}>
                                  <HStack justify="space-between" gap={3}>
                                    <Box flex={1} minW={0}>
                                      <HStack spacing={2} mb={1}>
                                        <Text fontSize="sm" fontWeight="semibold">
                                          {apt.name}
                                        </Text>
                                        <Badge variant={statusVariant} size="sm" px={2} py={0.5}>
                                          {apt.status.toUpperCase()}
                                        </Badge>
                                      </HStack>
                                      <Text fontSize="xs" opacity={0.6} mt={1}>
                                        {apt.aptId} {apt.addressShort && `• ${apt.addressShort}`}
                                      </Text>
                                    </Box>
                                    <HStack spacing={2}>
                                      <Button
                                        as={Link}
                                        href={`/app/tech/clients?action=editApt&aptId=${apt.aptId}`}
                                        size="sm"
                                        borderRadius="xl"
                                        bg="rgba(6, 182, 212, 0.2)"
                                        _hover={{ bg: "rgba(6, 182, 212, 0.3)" }}
                                        border="1px solid"
                                        borderColor="rgba(6, 182, 212, 0.3)"
                                        px={3}
                                        py={1.5}
                                        fontWeight="semibold"
                                        fontSize="xs"
                                      >
                                        Modifica
                                      </Button>
                                      <Box as="form" action={handleDeleteApartment}>
                                        <input type="hidden" name="aptId" value={apt.aptId} />
                                        <input type="hidden" name="clientId" value={selectedClient!.clientId} />
                                        <Button
                                          type="submit"
                                          variant="danger"
                                          size="sm"
                                          borderRadius="xl"
                                          px={3}
                                          py={1.5}
                                          fontWeight="semibold"
                                          fontSize="xs"
                                        >
                                          Elimina
                                        </Button>
                                      </Box>
                                    </HStack>
                                  </HStack>
                                </CardBody>
                              </Card>
                            );
                          })
                        )}
                      </VStack>
                    </Box>
                  </VStack>
                )}

                {/* Client List View (default) */}
                {!isCreateClient && !isEditClient && !isCreateApt && !isEditApt && !isClientDetail && (
                  <VStack spacing={2} align="stretch">
                    {clients.length === 0 ? (
                      <Text fontSize="sm" opacity={0.6} py={8} textAlign="center">
                        Nessun cliente configurato. Clicca "Nuovo Cliente" per iniziare.
                      </Text>
                    ) : (
                      clients.map((client) => (
                        <Box
                          key={client.clientId}
                          as={Link}
                          href={`/app/tech/clients?clientId=${client.clientId}`}
                          display="flex"
                          alignItems="center"
                          justifyContent="space-between"
                          gap={3}
                          borderRadius="xl"
                          bg="var(--bg-secondary)"
                          border="1px solid"
                          borderColor="var(--border-light)"
                          p={4}
                          _hover={{ bg: "var(--bg-secondary)" }}
                          transition="colors"
                        >
                          <Box flex={1} minW={0}>
                            <Text fontSize="sm" fontWeight="semibold">
                              {client.name}
                            </Text>
                            <Text fontSize="xs" opacity={0.6} mt={1}>
                              {client.clientId} • {client.apartments.length} appartamenti
                            </Text>
                          </Box>
                          <Text fontSize="xs" opacity={0.6}>→</Text>
                        </Box>
                      ))
                    )}
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
