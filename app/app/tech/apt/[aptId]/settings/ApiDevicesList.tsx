"use client";

import { VStack, HStack, Text, Box } from "@chakra-ui/react";
import { getDeviceLabel, type DeviceType } from "@/app/lib/devicePackageTypes";
import type { DeviceApiSettings } from "@/app/lib/technicalSettingsStore";
import { Card, CardBody, CardHeader } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";

type ApiDevicesListProps = {
  devicesWithApi: Array<{ deviceType: DeviceType; settings: DeviceApiSettings | null }>;
  onOpenModal: (deviceType: DeviceType) => void;
};

export function ApiDevicesList({ devicesWithApi, onOpenModal }: ApiDevicesListProps) {
  if (devicesWithApi.length === 0) {
    return null;
  }

  return (
    <Card mb={6}>
      <CardBody p={4}>
        <VStack spacing={3} align="stretch">
          <Text fontSize="sm" fontWeight="semibold" mb={3}>
            Device con API diretta
          </Text>
          <VStack spacing={2} align="stretch">
            {devicesWithApi.map(({ deviceType, settings }) => (
              <Card key={deviceType} variant="outlined">
                <CardBody p={3}>
                  <HStack justify="space-between">
                    <Box>
                      <Text fontSize="sm" fontWeight="semibold">
                        {getDeviceLabel(deviceType)}
                      </Text>
                      <Text fontSize="xs" opacity={0.6} mt={0.5}>
                        {settings?.endpoint ? `Endpoint: ${settings.endpoint}` : "Non configurato"}
                      </Text>
                    </Box>
                    <Button
                      onClick={() => onOpenModal(deviceType)}
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
                      Configura
                    </Button>
                  </HStack>
                </CardBody>
              </Card>
            ))}
          </VStack>
        </VStack>
      </CardBody>
    </Card>
  );
}
