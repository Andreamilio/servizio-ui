"use client";

import { useState } from "react";
import { Box, VStack, HStack, Text, Grid } from "@chakra-ui/react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/app/components/ui/Button";

type PinCollapsibleProps = {
  pin: string;
  role: string;
  source: string;
  guestName?: string;
  stayId?: string;
  validFrom: number;
  validTo: number;
  timeLeft: string;
  revokeAction: (formData: FormData) => Promise<void>;
};

export function PinCollapsible({
  pin,
  role,
  source,
  guestName,
  stayId,
  validFrom,
  validTo,
  timeLeft,
  revokeAction,
}: PinCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Box
      borderRadius="xl"
      bg="var(--bg-secondary)"
      border="1px solid"
      borderColor="var(--border-light)"
      overflow="hidden"
    >
      <Box
        as="button"
        onClick={() => setIsOpen(!isOpen)}
        w="100%"
        cursor="pointer"
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        gap={3}
        px={3}
        py={2}
      >
        <Box minW={0} flex={1}>
          <Text fontWeight="semibold" letterSpacing="widest" isTruncated>
            {pin}
          </Text>
          <Text fontSize="11px" opacity={0.6} isTruncated>
            {role} • {source}
            {guestName ? ` • ${guestName}` : ""}
          </Text>
        </Box>
        <Box textAlign="right">
          <Text fontSize="11px" opacity={0.6}>Scade tra</Text>
          <Text fontSize="xs" fontWeight="semibold">
            {timeLeft}
          </Text>
        </Box>
        <Box
          as={ChevronDown}
          w={4}
          h={4}
          color="var(--text-secondary)"
          transition="transform 0.2s"
          transform={isOpen ? "rotate(180deg)" : "rotate(0deg)"}
        />
      </Box>

      {isOpen && (
        <Box px={3} pb={3} pt={0}>
          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={3} mt={3}>
            <VStack spacing={1} align="stretch" fontSize="xs" opacity={0.8}>
              <Text>
                <Text as="span" opacity={0.6}>Validità:</Text> {new Date(validFrom).toLocaleString()} → {new Date(validTo).toLocaleString()}
              </Text>
              <Text>
                <Text as="span" opacity={0.6}>Nome:</Text> {guestName ?? "—"}
              </Text>
              <Text>
                <Text as="span" opacity={0.6}>Stay:</Text> {stayId ?? "—"}
              </Text>
            </VStack>

            <Box display="flex" alignItems="flex-end" justifyContent="flex-end">
              <Box as="form" action={revokeAction}>
                <Button
                  type="submit"
                  size="sm"
                  borderRadius="lg"
                  bg="rgba(239, 68, 68, 0.2)"
                  border="1px solid"
                  borderColor="rgba(239, 68, 68, 0.3)"
                  px={3}
                  py={2}
                  fontSize="xs"
                >
                  Revoca
                </Button>
              </Box>
            </Box>
          </Grid>
        </Box>
      )}
    </Box>
  );
}
