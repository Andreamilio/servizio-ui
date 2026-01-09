"use client";

import { useState } from "react";
import { Box, VStack, HStack, Text, Heading, Grid, GridItem, IconButton } from "@chakra-ui/react";
import { ChevronDown } from "lucide-react";
import { Link } from "@/app/components/ui/Link";
import { StatusPill } from "@/app/components/ui/StatusPill";
import { Card, CardBody } from "@/app/components/ui/Card";

type Apartment = {
  aptId: string;
  aptName: string;
  status: "online" | "offline";
  network: "main" | "backup";
  lastAccessLabel: string;
};

interface ClientAccordionProps {
  clientName: string;
  apartments: Apartment[];
}

export function ClientAccordion({
  clientName,
  apartments,
}: ClientAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card variant="outlined">
      {/* Header cliccabile */}
      <Box
        as="button"
        onClick={() => setIsOpen(!isOpen)}
        w="100%"
        p={4}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        _hover={{ bg: "var(--bg-tertiary)" }}
        transition="colors"
      >
        <Text fontWeight="semibold" textAlign="left">
          {clientName}
        </Text>
        <Box
          as={ChevronDown}
          w={5}
          h={5}
          color="var(--text-primary)"
          transition="transform 0.2s"
          transform={isOpen ? "rotate(180deg)" : "rotate(0deg)"}
        />
      </Box>

      {/* Contenuto collassabile */}
      {isOpen && (
        <Box borderTop="1px solid" borderColor="var(--border-light)">
          {/* Header tabella */}
          <Grid
            templateColumns={{ base: "1fr", sm: "1.2fr 1fr 1fr 1fr" }}
            gap={2}
            p={4}
            fontSize="xs"
            textTransform="uppercase"
            letterSpacing="wider"
            opacity={0.6}
            display={{ base: "none", sm: "grid" }}
          >
            <Box>Apartment</Box>
            <Box>Status</Box>
            <Box>Network</Box>
            <Box>Last Access</Box>
          </Grid>

          {/* Lista appartamenti */}
          <Box px={4} pt={2} pb={4}>
            <VStack spacing={2} align="stretch">
              {apartments.map((apt) => (
                <Box
                  key={apt.aptId}
                  as={Link}
                  href={`/app/tech/apt/${apt.aptId}`}
                  display="grid"
                  gridTemplateColumns={{ base: "1fr", sm: "1.2fr 1fr 1fr 1fr" }}
                  gap={2}
                  alignItems={{ base: "start", sm: "center" }}
                  borderRadius="xl"
                  bg="var(--bg-card)"
                  border="1px solid"
                  borderColor="var(--border-light)"
                  px={4}
                  py={3}
                  _hover={{ borderColor: "var(--border-medium)" }}
                  transition="all"
                  _active={{ transform: "scale(0.99)" }}
                >
                  <Text fontWeight="semibold">{apt.aptName}</Text>

                  <VStack align={{ base: "start", sm: "stretch" }} spacing={1}>
                    <Text fontSize="xs" opacity={0.6} display={{ base: "block", sm: "none" }}>
                      Status
                    </Text>
                    <StatusPill status={apt.status} />
                  </VStack>

                  <VStack align={{ base: "start", sm: "stretch" }} spacing={1}>
                    <Text fontSize="xs" opacity={0.6} display={{ base: "block", sm: "none" }}>
                      Network
                    </Text>
                    <StatusPill status={apt.network} />
                  </VStack>

                  <VStack align={{ base: "start", sm: "stretch" }} spacing={1}>
                    <Text fontSize="xs" opacity={0.6} display={{ base: "block", sm: "none" }}>
                      Last Access
                    </Text>
                    <Text fontSize="sm" opacity={0.9} mt={{ base: 1, sm: 0 }}>
                      {apt.lastAccessLabel}
                    </Text>
                  </VStack>
                </Box>
              ))}
            </VStack>
          </Box>
        </Box>
      )}
    </Card>
  );
}
