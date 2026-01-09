'use client';

import { useRef, useEffect } from 'react';
import { HStack, Box } from "@chakra-ui/react";
import { Input } from "@/app/components/ui/Input";
import { Button } from "@/app/components/ui/Button";

type ApartmentSearchFormProps = {
    clientId: string;
    initialQuery?: string;
};

export function ApartmentSearchForm({ clientId, initialQuery = '' }: ApartmentSearchFormProps) {
    const formRef = useRef<HTMLFormElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const input = inputRef.current;
        if (!input) return;

        let timeoutId: NodeJS.Timeout;

        const handleInput = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                if (formRef.current) {
                    formRef.current.submit();
                }
            }, 500);
        };

        input.addEventListener('input', handleInput);

        return () => {
            clearTimeout(timeoutId);
            input.removeEventListener('input', handleInput);
        };
    }, []);

    return (
        <Box
            as="form"
            ref={formRef}
            action='/app/host' 
            method='get'
            display="flex"
            alignItems="center"
            gap={2}
            w="100%"
        >
            <input type='hidden' name='client' value={clientId} />
            <Input
                ref={inputRef}
                name='q'
                defaultValue={initialQuery}
                placeholder='Cerca appartamento…'
                flex={1}
            />
            <Button 
                type='submit'
                variant="secondary"
                size="sm"
            >
                Cerca
            </Button>
        </Box>
    );
}
