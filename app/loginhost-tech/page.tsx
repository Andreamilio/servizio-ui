import { Box, VStack, HStack, Heading, Text, Image } from "@chakra-ui/react";
import { Input } from "@/app/components/ui/Input";
import { Button } from "@/app/components/ui/Button";
import { Card, CardBody } from "@/app/components/ui/Card";
import { Alert } from "@/app/components/ui/Alert";
import { User } from "lucide-react";
import { OpenA2HSLink } from "@/app/components/OpenA2HSLink";

export const dynamic = "force-dynamic";

export default function LoginHostTechPage({ searchParams }: { searchParams?: { err?: string; next?: string } }) {
  const err = typeof searchParams?.err === "string" ? searchParams.err : "";
  const next = typeof searchParams?.next === "string" ? searchParams.next : "";

  return (
    <Box
      as="main"
      minH="100vh"
      bg="var(--bg-primary)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={{ base: 4, sm: 6 }}
    >
      <Box w="100%" maxW="md">
        <Card variant="elevated" w="100%">
          <CardBody>
            <VStack spacing={6}>
              <VStack spacing={4} textAlign="center">
                <HStack justify="center">
                  <Image
                    src="/easy-stay-192.png"
                    alt="easy stay"
                    w={24}
                    h={24}
                    objectFit="contain"
                  />
                </HStack>
                <VStack spacing={2} textAlign="center">
                  <HStack justify="center">
                    <Box
                      p={3}
                      borderRadius="2xl"
                      bg="var(--pastel-purple)"
                    >
                      <User size={32} color="var(--accent-primary)" />
                    </Box>
                  </HStack>
                  <Heading as="h1" size="xl" fontWeight="semibold" color="var(--text-primary)">
                    Accesso Host / Tech
                  </Heading>
                  <Text fontSize="sm" color="var(--text-secondary)">
                    Inserisci le tue credenziali per accedere
                  </Text>
                </VStack>
              </VStack>

              {err === "auth" && (
                <Alert variant="error">
                  <Text fontSize="sm" fontWeight="medium">
                    Username o password non validi
                  </Text>
                </Alert>
              )}

              <Box as="form" action="/api/auth/login" method="post" w="100%">
                <VStack spacing={4} w="100%">
                  <input type="hidden" name="next" value={next} />

                  <Input
                    name="username"
                    type="text"
                    placeholder="Username"
                    autoComplete="username"
                    required
                    autoFocus
                  />

                  <Input
                    name="password"
                    type="password"
                    placeholder="Password"
                    autoComplete="current-password"
                    required
                  />

                  <Button type="submit" variant="primary" size="lg" fullWidth>
                    Entra
                  </Button>
                </VStack>
              </Box>

              <OpenA2HSLink />

              <Box pt={4} borderTop="1px solid" borderColor="var(--border-light)" w="100%">
                <VStack spacing={4} w="100%">
                  <Text textAlign="center" fontSize="sm" color="var(--text-secondary)">
                    Demo: <Text as="span" fontFamily="mono">tech/tech123</Text> oppure <Text as="span" fontFamily="mono">host/host123</Text>
                  </Text>
                  <HStack justify="center" pt={2}>
                    <Image
                      src="/easy-stay-192.png"
                      alt="easy stay"
                      w={16}
                      h={16}
                      opacity={0.6}
                      objectFit="contain"
                    />
                  </HStack>
                </VStack>
              </Box>
            </VStack>
          </CardBody>
        </Card>
      </Box>
    </Box>
  );
}
