import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { readSession, validateSessionUser } from "@/app/lib/session";
import {
  listUsers,
  createUser,
  updateUser,
  updateUserPassword,
  disableUser,
  enableUser,
  deleteUser,
  getUser,
  type User,
  type UserRole,
} from "@/app/lib/userStore";
import { listClients } from "@/app/lib/clientStore";
import { UserImageEditor } from "../../components/UserImageEditor";
import { AppLayout } from "@/app/components/layouts/AppLayout";
import { Box, VStack, HStack, Heading, Text, Image, Divider, Field } from "@chakra-ui/react";
import { Select } from "@/app/components/ui/Select";
import { Card, CardBody, CardHeader } from "@/app/components/ui/Card";
import { Link } from "@/app/components/ui/Link";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { Badge } from "@/app/components/ui/Badge";
import { Alert } from "@/app/components/ui/Alert";

export const dynamic = "force-dynamic";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default async function TechUsersPage({
  searchParams,
}: {
  searchParams?: { action?: string; userId?: string; err?: string } | Promise<{ action?: string; userId?: string; err?: string }>;
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
  const userId = sp.userId;

  const users = listUsers();
  const clients = listClients();

  // Server Actions
  async function handleCreate(formData: FormData) {
    "use server";
    const username = (formData.get("username")?.toString() ?? "").trim();
    const password = (formData.get("password")?.toString() ?? "").trim();
    const role = (formData.get("role")?.toString() ?? "tech") as UserRole;
    const clientId = (formData.get("clientId")?.toString() ?? "").trim() || undefined;

    if (!username || !password) {
      redirect("/app/tech/users?err=missing");
      return;
    }

    try {
      createUser({ username, password, role, clientId });
      revalidatePath("/app/tech/users");
      redirect("/app/tech/users");
    } catch (error: any) {
      const errorMessage = error?.message || "";
      if (errorMessage.includes("già esistente")) {
        redirect("/app/tech/users?action=create&err=exists");
      } else {
        revalidatePath("/app/tech/users");
        redirect("/app/tech/users");
      }
    }
  }

  async function handleUpdate(formData: FormData) {
    "use server";
    const id = (formData.get("userId")?.toString() ?? "").trim();
    if (!id) return;

    const username = (formData.get("username")?.toString() ?? "").trim();
    const role = (formData.get("role")?.toString() ?? "tech") as UserRole;
    const clientId = (formData.get("clientId")?.toString() ?? "").trim() || undefined;

    try {
      updateUser(id, { username, role, clientId });
    } catch (error: any) {
      const errorMessage = error?.message || "";
      if (errorMessage.includes("già esistente")) {
        redirect(`/app/tech/users?action=edit&userId=${id}&err=exists`);
      }
      throw error;
    }
    redirect("/app/tech/users");
  }

  async function handleUpdatePassword(formData: FormData) {
    "use server";
    const id = (formData.get("userId")?.toString() ?? "").trim();
    const newPassword = (formData.get("newPassword")?.toString() ?? "").trim();

    if (!id || !newPassword) return;

    updateUserPassword(id, newPassword);
    redirect("/app/tech/users");
  }

  async function handleToggleEnabled(formData: FormData) {
    "use server";
    const userId = formData.get("userId")?.toString() ?? "";
    const enabled = formData.get("enabled") === "true";
    if (!userId) return;
    if (enabled) {
      enableUser(userId);
    } else {
      disableUser(userId);
    }
    redirect("/app/tech/users");
  }

  async function handleDelete(formData: FormData) {
    "use server";
    const userId = formData.get("userId")?.toString() ?? "";
    if (!userId) return;
    deleteUser(userId);
    redirect("/app/tech/users");
  }

  const err = sp.err;
  const selectedUser = userId ? users.find((u) => u.userId === userId) : null;
  const isEditMode = action === "edit" && selectedUser;
  const isCreateMode = action === "create";

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
                <HStack justify="space-between">
                  <Box>
                    <Heading as="h2" size="md" fontWeight="semibold">
                      Gestione Utenti
                    </Heading>
                    <Text fontSize="sm" opacity={0.7}>
                      Tech e Host users
                    </Text>
                  </Box>
                  {!isCreateMode && !isEditMode && (
                    <Button
                      as={Link}
                      href="/app/tech/users?action=create"
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
                      + Nuovo Utente
                    </Button>
                  )}
                </HStack>

                {err === "missing" && (
                  <Alert variant="error">
                    Username e password sono obbligatori
                  </Alert>
                )}

                {err === "exists" && (
                  <Alert variant="error">
                    Username già esistente
                  </Alert>
                )}

                {/* Form Create/Edit */}
                {(isCreateMode || isEditMode) && (
                  <Card variant="outlined">
                    <CardBody p={4}>
                      <VStack spacing={4} align="stretch">
                        <Text fontSize="sm" fontWeight="semibold" mb={4}>
                          {isCreateMode ? "Crea Nuovo Utente" : `Modifica: ${selectedUser?.username}`}
                        </Text>

                        {isCreateMode ? (
                          <Box as="form" action={handleCreate}>
                            <VStack spacing={4} align="stretch">
                              <Input
                                type="text"
                                name="username"
                                label="Username"
                                required
                              />

                              <Input
                                type="password"
                                name="password"
                                label="Password"
                                required
                              />

                              <Field.Root>
                                <Field.Label fontSize="sm" fontWeight="medium" mb={2}>Ruolo</Field.Label>
                                <Select
                                  name="role"
                                  defaultValue="tech"
                                  borderRadius="xl"
                                  bg="var(--bg-secondary)"
                                  border="1px solid"
                                  borderColor="var(--border-light)"
                                  px={4}
                                  py={2}
                                  color="var(--text-primary)"
                                  _focus={{ outline: "none", ring: "2px", ringColor: "rgba(6, 182, 212, 1)" }}
                                >
                                  <option value="tech">Tech</option>
                                  <option value="host">Host</option>
                                </Select>
                              </Field.Root>

                              <Field.Root>
                                <Field.Label fontSize="sm" fontWeight="medium" mb={2}>Client (solo per Host, opzionale)</Field.Label>
                                <Select
                                  name="clientId"
                                  borderRadius="xl"
                                  bg="var(--bg-secondary)"
                                  border="1px solid"
                                  borderColor="var(--border-light)"
                                  px={4}
                                  py={2}
                                  color="var(--text-primary)"
                                  _focus={{ outline: "none", ring: "2px", ringColor: "rgba(6, 182, 212, 1)" }}
                                >
                                  <option value="">Nessuno (accesso a tutti i client)</option>
                                  {clients.map((c) => (
                                    <option key={c.clientId} value={c.clientId}>
                                      {c.name}
                                    </option>
                                  ))}
                                </Select>
                              </Field.Root>

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
                                  Crea Utente
                                </Button>
                                <Button
                                  as={Link}
                                  href="/app/tech/users"
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
                        ) : (
                          <>
                            <Box as="form" action={handleUpdate}>
                              <VStack spacing={4} align="stretch" mb={6}>
                                <input type="hidden" name="userId" value={selectedUser!.userId} />

                                <Input
                                  type="text"
                                  name="username"
                                  label="Username"
                                  defaultValue={selectedUser!.username}
                                  required
                                />

                                <Field.Root>
                                  <Field.Label fontSize="sm" fontWeight="medium" mb={2}>Ruolo</Field.Label>
                                  <Select
                                    name="role"
                                    defaultValue={selectedUser!.role}
                                    borderRadius="xl"
                                    bg="var(--bg-secondary)"
                                    border="1px solid"
                                    borderColor="var(--border-light)"
                                    px={4}
                                    py={2}
                                    color="var(--text-primary)"
                                    _focus={{ outline: "none", ring: "2px", ringColor: "rgba(6, 182, 212, 1)" }}
                                  >
                                    <option value="tech">Tech</option>
                                    <option value="host">Host</option>
                                  </Select>
                                </Field.Root>

                                <Field.Root>
                                  <Field.Label fontSize="sm" fontWeight="medium" mb={2}>Client (solo per Host, opzionale)</Field.Label>
                                  <Select
                                    name="clientId"
                                    defaultValue={selectedUser!.clientId || ""}
                                    borderRadius="xl"
                                    bg="var(--bg-secondary)"
                                    border="1px solid"
                                    borderColor="var(--border-light)"
                                    px={4}
                                    py={2}
                                    color="var(--text-primary)"
                                    _focus={{ outline: "none", ring: "2px", ringColor: "rgba(6, 182, 212, 1)" }}
                                  >
                                    <option value="">Nessuno (accesso a tutti i client)</option>
                                    {clients.map((c) => (
                                      <option key={c.clientId} value={c.clientId}>
                                        {c.name}
                                      </option>
                                    ))}
                                  </Select>
                                </Field.Root>

                                <Box pt={4} borderTop="1px solid" borderColor="var(--border-light)">
                                  <UserImageEditor
                                    userId={selectedUser!.userId}
                                    username={selectedUser!.username}
                                    currentImageUrl={selectedUser!.profileImageUrl}
                                  />
                                </Box>

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
                                    href="/app/tech/users"
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

                            <Box as="form" action={handleUpdatePassword} p={4} borderRadius="xl" bg="rgba(245, 158, 11, 0.05)" border="1px solid" borderColor="rgba(245, 158, 11, 0.1)">
                              <VStack spacing={4} align="stretch">
                                <Text fontSize="sm" fontWeight="semibold" mb={2} color="var(--text-primary)">
                                  Cambia Password
                                </Text>
                                <input type="hidden" name="userId" value={selectedUser!.userId} />

                                <Input
                                  type="password"
                                  name="newPassword"
                                  label="Nuova Password"
                                  required
                                />

                                <Button
                                  type="submit"
                                  borderRadius="xl"
                                  bg="rgba(245, 158, 11, 0.2)"
                                  _hover={{ bg: "rgba(245, 158, 11, 0.3)" }}
                                  border="1px solid"
                                  borderColor="rgba(245, 158, 11, 0.3)"
                                  px={4}
                                  py={2}
                                  fontWeight="semibold"
                                  fontSize="sm"
                                  color="var(--accent-warning)"
                                >
                                  Aggiorna Password
                                </Button>
                              </VStack>
                            </Box>
                          </>
                        )}
                      </VStack>
                    </CardBody>
                  </Card>
                )}

                {/* Lista Utenti */}
                {!isCreateMode && !isEditMode && (
                  <VStack spacing={2} align="stretch">
                    {users.length === 0 ? (
                      <Text fontSize="sm" opacity={0.6} py={8} textAlign="center">
                        Nessun utente configurato
                      </Text>
                    ) : (
                      users.map((user) => (
                        <Card key={user.userId} variant="outlined">
                          <CardBody p={3}>
                            <VStack spacing={3} align="stretch">
                              <HStack justify="space-between" gap={3} flexDir={{ base: "column", sm: "row" }}>
                                <HStack spacing={3} flex={1} minW={0}>
                                  {user.profileImageUrl ? (
                                    <Image
                                      src={user.profileImageUrl}
                                      alt={user.username}
                                      w={10}
                                      h={10}
                                      borderRadius="full"
                                      objectFit="cover"
                                      border="1px solid"
                                      borderColor="var(--border-light)"
                                      flexShrink={0}
                                    />
                                  ) : (
                                    <Box
                                      w={10}
                                      h={10}
                                      borderRadius="full"
                                      bg="var(--pastel-blue)"
                                      border="1px solid"
                                      borderColor="var(--border-light)"
                                      display="flex"
                                      alignItems="center"
                                      justifyContent="center"
                                      flexShrink={0}
                                    >
                                      <Text fontSize="xs" fontWeight="semibold" color="var(--accent-primary)">
                                        {getInitials(user.username)}
                                      </Text>
                                    </Box>
                                  )}
                                  <Box flex={1} minW={0}>
                                    <HStack spacing={2} flexWrap="wrap" mb={1.5}>
                                      <Text fontSize="sm" fontWeight="semibold">
                                        {user.username}
                                      </Text>
                                      <Badge
                                        variant={user.role === "tech" ? "info" : "default"}
                                        size="sm"
                                        px={2}
                                        py={0.5}
                                      >
                                        {user.role.toUpperCase()}
                                      </Badge>
                                      {!user.enabled && (
                                        <Badge variant="error" size="sm" px={2} py={0.5}>
                                          DISABILITATO
                                        </Badge>
                                      )}
                                    </HStack>
                                    <VStack spacing={0.5} align="stretch" fontSize="xs" opacity={0.6}>
                                      {user.clientId && (
                                        <Text>
                                          Client: {clients.find((c) => c.clientId === user.clientId)?.name || user.clientId}
                                        </Text>
                                      )}
                                      {user.lastLoginAt && (
                                        <Text>
                                          Ultimo accesso: {new Date(user.lastLoginAt).toLocaleString()}
                                        </Text>
                                      )}
                                    </VStack>
                                  </Box>
                                </HStack>

                                <HStack spacing={2} flexWrap="wrap" justify={{ base: "start", sm: "end" }}>
                                  <Button
                                    as={Link}
                                    href={`/app/tech/users?action=edit&userId=${user.userId}`}
                                    variant="secondary"
                                    size="sm"
                                    borderRadius="xl"
                                    px={3}
                                    py={1.5}
                                    fontWeight="semibold"
                                    fontSize="xs"
                                  >
                                    Modifica
                                  </Button>
                                  {user.enabled ? (
                                    <Box as="form" action={handleToggleEnabled}>
                                      <input type="hidden" name="userId" value={user.userId} />
                                      <input type="hidden" name="enabled" value="false" />
                                      <Button
                                        type="submit"
                                        size="sm"
                                        borderRadius="xl"
                                        bg="rgba(245, 158, 11, 0.2)"
                                        _hover={{ bg: "rgba(245, 158, 11, 0.3)" }}
                                        border="1px solid"
                                        borderColor="rgba(245, 158, 11, 0.3)"
                                        px={3}
                                        py={1.5}
                                        fontWeight="semibold"
                                        fontSize="xs"
                                        color="var(--accent-warning)"
                                      >
                                        Disabilita
                                      </Button>
                                    </Box>
                                  ) : (
                                    <Box as="form" action={handleToggleEnabled}>
                                      <input type="hidden" name="userId" value={user.userId} />
                                      <input type="hidden" name="enabled" value="true" />
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
                                        fontWeight="semibold"
                                        fontSize="xs"
                                      >
                                        Abilita
                                      </Button>
                                    </Box>
                                  )}
                                  <Box as="form" action={handleDelete}>
                                    <input type="hidden" name="userId" value={user.userId} />
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
                            </VStack>
                          </CardBody>
                        </Card>
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
