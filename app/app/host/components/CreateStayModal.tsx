'use client';

import { useState, useRef } from 'react';
import { Box, VStack, HStack, Grid, GridItem, Text, Field } from "@chakra-ui/react";
import { Select } from "@/app/components/ui/Select";
import { Modal } from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { GuestFields } from './GuestFields';

type Cleaner = {
    name: string;
    phone: string;
};

type CreateStayModalProps = {
    aptId: string;
    clientId: string;
    cleaners: Cleaner[];
    createStayAction: (formData: FormData) => Promise<void>;
};

export function CreateStayModal({ aptId, clientId, cleaners, createStayAction }: CreateStayModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    function handleClose() {
        setIsOpen(false);
        formRef.current?.reset();
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        try {
            await createStayAction(formData);
            handleClose();
        } catch (error) {
            console.error('Error creating stay:', error);
        }
    }

    return (
        <>
            <Button
                onClick={() => setIsOpen(true)}
                w="100%"
                borderRadius="xl"
                bg="rgba(6, 182, 212, 0.3)"
                _hover={{ bg: "rgba(6, 182, 212, 0.4)" }}
                border="1px solid"
                borderColor="rgba(6, 182, 212, 0.3)"
                px={4}
                py={3}
                fontWeight="semibold"
                fontSize="sm"
                transition="colors"
            >
                + Crea nuovo soggiorno
            </Button>

            <Modal isOpen={isOpen} onClose={handleClose} title="Crea nuovo soggiorno" size="lg">
                <Box as="form" ref={formRef} onSubmit={handleSubmit} minW={0}>
                    <VStack spacing={4} align="stretch" minW={0}>
                        <input type='hidden' name='aptId' value={aptId} />

                        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={3} minW={0}>
                            <Input
                                type='datetime-local'
                                name='checkin'
                                label="Check-in (data + ora)"
                                required
                            />

                            <Input
                                type='datetime-local'
                                name='checkout'
                                label="Check-out (data + ora)"
                                required
                            />
                        </Grid>

                        <Field.Root>
                            <Field.Label fontSize="11px" opacity={0.6} mb={1}>
                                Numero ospiti
                            </Field.Label>
                            <Select
                                name='guests'
                                id='guestsCount'
                                defaultValue='2'
                                borderRadius="xl"
                                bg="var(--bg-card)"
                                border="1px solid"
                                borderColor="var(--border-light)"
                                p={2}
                            >
                                {Array.from({ length: 10 }).map((_, i) => (
                                    <option key={i + 1} value={String(i + 1)}>
                                        {i + 1}
                                    </option>
                                ))}
                            </Select>
                        </Field.Root>

                        <Box>
                            <Text fontSize="11px" opacity={0.6} mb={2}>
                                Dati ospiti <Text as="span" color="var(--accent-error)">*</Text>
                            </Text>
                            <GuestFields maxGuests={10} />
                            <Text mt={2} fontSize="11px" opacity={0.5}>
                                I PIN di accesso verranno creati automaticamente per tutti gli ospiti.
                            </Text>
                        </Box>

                        <Field.Root>
                            <Field.Label fontSize="11px" opacity={0.6} mb={1}>
                                Cleaner <Text as="span" color="var(--accent-error)">*</Text>
                            </Field.Label>
                            <Select
                                name='cleaner'
                                required
                                borderRadius="xl"
                                bg="var(--bg-card)"
                                border="1px solid"
                                borderColor="var(--border-light)"
                                p={2}
                            >
                                <option value=''>— Seleziona cleaner —</option>
                                {cleaners.map((cleaner) => (
                                    <option key={cleaner.name} value={cleaner.name}>
                                        {cleaner.name} - {cleaner.phone}
                                    </option>
                                ))}
                            </Select>
                            <Text mt={1} fontSize="11px" opacity={0.5}>
                                Il PIN del cleaner viene creato automaticamente (check-out → check-out + durata pulizia).
                            </Text>
                        </Field.Root>

                        <HStack spacing={3} pt={2} borderTop="1px solid" borderColor="var(--border-light)">
                            <Button
                                type='button'
                                onClick={handleClose}
                                variant="secondary"
                                flex={1}
                                borderRadius="xl"
                                px={4}
                                py={2}
                                fontSize="sm"
                                fontWeight="semibold"
                            >
                                Annulla
                            </Button>
                            <Button
                                type='submit'
                                flex={1}
                                borderRadius="xl"
                                bg="rgba(6, 182, 212, 0.3)"
                                _hover={{ bg: "rgba(6, 182, 212, 0.4)" }}
                                border="1px solid"
                                borderColor="rgba(6, 182, 212, 0.3)"
                                px={4}
                                py={2}
                                fontSize="sm"
                                fontWeight="semibold"
                            >
                                Crea soggiorno
                            </Button>
                        </HStack>
                    </VStack>
                </Box>
            </Modal>
        </>
    );
}
