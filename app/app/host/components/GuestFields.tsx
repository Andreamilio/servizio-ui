'use client';

import { useEffect, useState } from 'react';
import { VStack, HStack, Grid, GridItem, Text } from "@chakra-ui/react";
import { Input } from "@/app/components/ui/Input";
import { Card, CardBody } from "@/app/components/ui/Card";

export function GuestFields({ maxGuests = 10 }: { maxGuests?: number }) {
    const [guestsCount, setGuestsCount] = useState(2);

    useEffect(() => {
        const select = document.getElementById('guestsCount') as HTMLSelectElement;
        if (!select) {
            const timeout = setTimeout(() => {
                const retrySelect = document.getElementById('guestsCount') as HTMLSelectElement;
                if (retrySelect) {
                    const initialCount = parseInt(retrySelect.value) || 2;
                    setGuestsCount(initialCount);
                    updateVisibilityForSelect(retrySelect);
                }
            }, 100);
            return () => clearTimeout(timeout);
        }

        const updateVisibilityForSelect = (sel: HTMLSelectElement) => {
            const count = parseInt(sel.value) || 2;
            setGuestsCount(count);
        };

        const initialCount = parseInt(select.value) || 2;
        setGuestsCount(initialCount);
        updateVisibilityForSelect(select);
        
        select.addEventListener('change', () => updateVisibilityForSelect(select));
        
        return () => {
            select.removeEventListener('change', () => updateVisibilityForSelect(select));
        };
    }, [maxGuests]);

    return (
        <VStack spacing={3} align="stretch" minW={0}>
            {Array.from({ length: guestsCount }).map((_, i) => {
                const guestNum = i + 1;
                return (
                    <Card
                        key={guestNum}
                        id={`guest_${guestNum}_container`}
                        variant="outlined"
                        minW={0}
                    >
                        <CardBody p={4}>
                            <VStack spacing={3} align="stretch" minW={0}>
                                <Text fontSize="sm" fontWeight="medium" color="var(--text-primary)" mb={2}>
                                    {guestNum === 1 ? 'Responsabile soggiorno' : `Ospite ${guestNum}`}
                                </Text>
                                <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={3} minW={0}>
                                    <Input
                                        type='text'
                                        name={`guest_${guestNum}_firstName`}
                                        label={
                                            <>
                                                Nome <Text as="span" color="var(--accent-error)">*</Text>
                                            </>
                                        }
                                        required
                                        placeholder='Nome'
                                        fontSize="sm"
                                    />
                                    <Input
                                        type='text'
                                        name={`guest_${guestNum}_lastName`}
                                        label={
                                            <>
                                                Cognome <Text as="span" color="var(--accent-error)">*</Text>
                                            </>
                                        }
                                        required
                                        placeholder='Cognome'
                                        fontSize="sm"
                                    />
                                </Grid>
                                <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={3} minW={0}>
                                    <Input
                                        type='tel'
                                        name={`guest_${guestNum}_phone`}
                                        label={
                                            <>
                                                Telefono <Text as="span" color="var(--accent-error)">*</Text>
                                            </>
                                        }
                                        required
                                        placeholder='+39 123 456 7890'
                                        fontSize="sm"
                                    />
                                    <Input
                                        type='email'
                                        name={`guest_${guestNum}_email`}
                                        label="Email (opzionale)"
                                        placeholder='email@example.com'
                                        fontSize="sm"
                                    />
                                </Grid>
                            </VStack>
                        </CardBody>
                    </Card>
                );
            })}
        </VStack>
    );
}
