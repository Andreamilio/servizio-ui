"use client";

import { ReactNode } from 'react';
import { Alert as ChakraAlert, Box } from '@chakra-ui/react';

interface AlertProps {
    variant?: 'warning' | 'error' | 'success' | 'info';
    title?: string;
    children: ReactNode;
}

export function Alert({ variant = 'warning', title, children }: AlertProps) {
    const getVariantStyles = () => {
        switch (variant) {
            case 'warning':
                return {
                    bg: 'var(--warning-bg-strong)',
                    border: '2px solid',
                    borderColor: 'var(--warning-border-strong)',
                    color: 'var(--warning-text)',
                };
            case 'error':
                return {
                    bg: 'var(--toast-error-bg)',
                    border: '1px solid',
                    borderColor: 'var(--toast-error-border)',
                    color: 'var(--toast-error-text)',
                };
            case 'success':
                return {
                    bg: 'var(--toast-success-bg)',
                    border: '1px solid',
                    borderColor: 'var(--toast-success-border)',
                    color: 'var(--toast-success-text)',
                };
            case 'info':
                return {
                    bg: 'var(--pastel-blue)',
                    border: '1px solid',
                    borderColor: 'var(--border-light)',
                    color: 'var(--accent-info)',
                };
            default:
                return {};
        }
    };

    const getStatus = () => {
        switch (variant) {
            case 'warning':
                return 'warning';
            case 'error':
                return 'error';
            case 'success':
                return 'success';
            case 'info':
                return 'info';
            default:
                return 'warning';
        }
    };

    return (
        <ChakraAlert.Root status={getStatus()} borderRadius='xl' {...getVariantStyles()}>
            <ChakraAlert.Indicator color={variant === 'warning' ? 'var(--warning-text-icon)' : undefined} />
            <ChakraAlert.Content flex='1'>
                {title && <ChakraAlert.Title fontWeight='semibold'>{title}</ChakraAlert.Title>}
                <ChakraAlert.Description>{children}</ChakraAlert.Description>
            </ChakraAlert.Content>
        </ChakraAlert.Root>
    );
}
