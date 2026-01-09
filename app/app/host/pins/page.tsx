import { cookies } from "next/headers";
import { readSession } from "@/app/lib/session";
import { createPin, listPinsByApt, revokePin } from "@/app/lib/store";
import { Card, CardBody, CardHeader } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { Key, X, LogOut } from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AppLayout } from "@/app/components/layouts/AppLayout";
import { Box, VStack, HStack, Heading, Text, Grid, GridItem, Field } from "@chakra-ui/react";
import { Select } from "@/app/components/ui/Select";

export default async function HostPage() {
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

  const aptId = me.aptId;
  const pins = listPinsByApt(aptId);

  async function gen(formData: FormData) {
    "use server";
    const role = (formData.get("role")?.toString() ?? "guest") as any;
    const ttl = Number(formData.get("ttl")?.toString() ?? "120");
    createPin(role, aptId, ttl);
    revalidatePath("/app/host/pins");
    redirect("/app/host/pins");
  }

  async function del(formData: FormData) {
    "use server";
    const pin = formData.get("pin")?.toString() ?? "";
    revokePin(pin);
    revalidatePath("/app/host/pins");
    redirect("/app/host/pins");
  }

  return (
    <AppLayout role="host">
      <Box mx="auto" w="100%" maxW="4xl" p={{ base: 4, sm: 6, lg: 8 }}>
        <VStack spacing={6} align="stretch">
          <HStack justify="space-between" mb={6}>
            <Box>
              <Heading as="h1" size="xl" fontWeight="semibold" color="var(--text-primary)">
                Gestione PIN
              </Heading>
              <Text fontSize="sm" color="var(--text-secondary)" mt={1}>
                Appartamento {aptId}
              </Text>
            </Box>
            <Box as="form" action="/api/auth/logout" method="post">
              <Button variant="ghost" size="sm" leftIcon={<LogOut size={16} />} type="submit">
                Logout
              </Button>
            </Box>
          </HStack>

          <Card variant="elevated">
            <CardHeader>
              <HStack spacing={2}>
                <Key size={20} color="var(--text-primary)" />
                <Heading as="h2" size="md" fontWeight="semibold" color="var(--text-primary)">
                  Genera PIN
                </Heading>
              </HStack>
            </CardHeader>
            <CardBody>
              <Box as="form" action={gen}>
                <VStack spacing={4} align="stretch">
                  <Grid templateColumns={{ base: "1fr", sm: "repeat(3, 1fr)" }} gap={4}>
                    <Field.Root>
                      <Field.Label fontSize="sm" fontWeight="medium" color="var(--text-primary)" mb={2}>
                        Ruolo
                      </Field.Label>
                      <Select
                        name="role"
                        defaultValue="guest"
                        borderRadius="xl"
                        bg="var(--bg-secondary)"
                        border="1px solid"
                        borderColor="var(--border-light)"
                        px={4}
                        py={2.5}
                        color="var(--text-primary)"
                        _focus={{ outline: "none", ring: "2px", ringColor: "var(--accent-primary)" }}
                      >
                        <option value="guest">Guest</option>
                        <option value="cleaner">Cleaner</option>
                        <option value="tech">Tech</option>
                        <option value="host">Host</option>
                      </Select>
                    </Field.Root>
                    <Input
                      name="ttl"
                      type="number"
                      label="TTL (minuti)"
                      defaultValue="120"
                      placeholder="120"
                    />
                    <Box display="flex" alignItems="flex-end">
                      <Button type="submit" variant="primary" fullWidth>
                        Crea PIN
                      </Button>
                    </Box>
                  </Grid>
                  <Text fontSize="xs" color="var(--text-tertiary)">
                    TTL in minuti (es. 120 = 2 ore)
                  </Text>
                </VStack>
              </Box>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <Heading as="h2" size="md" fontWeight="semibold" color="var(--text-primary)">
                PIN attivi
              </Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={3} align="stretch">
                {pins.length === 0 && (
                  <Text fontSize="sm" color="var(--text-secondary)" textAlign="center" py={8}>
                    Nessun PIN attivo
                  </Text>
                )}

                {pins.map((p) => (
                  <Card key={p.pin} variant="outlined">
                    <CardBody p={4}>
                      <HStack justify="space-between">
                        <Box>
                          <Text
                            fontFamily="mono"
                            fontWeight="semibold"
                            fontSize="lg"
                            letterSpacing="widest"
                            color="var(--text-primary)"
                          >
                            {p.pin}
                          </Text>
                          <Text fontSize="xs" color="var(--text-secondary)" mt={1}>
                            {p.role} • scade tra{" "}
                            {(() => {
                              const to = (p as any).validTo ?? p.expiresAt ?? (p as any).createdAt ?? Date.now();
                              return Math.max(0, Math.round((Number(to) - Date.now()) / 60000));
                            })()} min
                          </Text>
                        </Box>

                        <Box as="form" action={del}>
                          <input type="hidden" name="pin" value={p.pin} />
                          <Button variant="danger" size="sm" leftIcon={<X size={16} />} type="submit">
                            Revoca
                          </Button>
                        </Box>
                      </HStack>
                    </CardBody>
                  </Card>
                ))}
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Box>
    </AppLayout>
  );
}
