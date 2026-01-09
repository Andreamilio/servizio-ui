"use client";

import { Box, VStack, HStack, Heading, Text, Image } from "@chakra-ui/react";
import { Input } from "@/app/components/ui/Input";
import { Button } from "@/app/components/ui/Button";
import { Card, CardBody } from "@/app/components/ui/Card";
import { Alert } from "@/app/components/ui/Alert";
import { Link } from "@/app/components/ui/Link";
import { KeyRound } from "lucide-react";
import { OpenA2HSLink } from "@/app/components/OpenA2HSLink";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const next = searchParams?.get("next") || "";
  const err = searchParams?.get("err") || "";

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
                      bg="var(--pastel-blue)"
                    >
                      <KeyRound size={32} color="var(--accent-primary)" />
                    </Box>
                  </HStack>
                  <Heading as="h1" size="xl" fontWeight="semibold" color="var(--text-primary)">
                    Accesso Guest / Cleaner
                  </Heading>
                  <Text fontSize="sm" color="var(--text-secondary)">
                    Inserisci il tuo PIN per accedere
                  </Text>
                </VStack>
              </VStack>

              {err === "pin" && (
                <Alert variant="error">
                  <Text fontSize="sm" fontWeight="medium">
                    PIN non valido o scaduto
                  </Text>
                </Alert>
              )}

              <Box as="form" action="/api/auth/pin" method="post" w="100%">
                <VStack spacing={4} w="100%">
                  <input type="hidden" name="next" value={next} />

                  <Input
                    name="pin"
                    type="text"
                    inputMode="numeric"
                    placeholder="Inserisci PIN"
                    required
                    autoFocus
                    textAlign="center"
                    fontSize="2xl"
                    letterSpacing="widest"
                    fontFamily="mono"
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
                    Host/Tech?{" "}
                    <Link href="/loginhost-tech" variant="default">
                      Accedi qui
                    </Link>
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
