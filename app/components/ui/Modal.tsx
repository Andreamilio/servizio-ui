"use client";

import { ReactNode } from "react";
import {
  Dialog,
  Box,
  Heading,
  IconButton,
} from "@chakra-ui/react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  showCloseButton?: boolean;
}

const sizeMap = {
  sm: "sm",
  md: "md",
  lg: "lg",
  xl: "xl",
} as const;

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  showCloseButton = true,
}: ModalProps) {
  return (
    <Dialog.Root 
      open={isOpen} 
      onOpenChange={(details) => {
        if (!details.open) {
          onClose();
        }
      }}
      size={sizeMap[size]}
      placement="center"
    >
      <Dialog.Backdrop
        bg="var(--bg-overlay)"
        backdropFilter="blur(4px)"
      />
      <Dialog.Content
        maxH="90vh"
        maxW="90vw"
        borderRadius="2xl"
        bg="var(--bg-card)"
        border="1px solid"
        borderColor="var(--border-light)"
        boxShadow="var(--shadow-xl)"
        overflow="hidden"
        position="fixed"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        margin="0"
      >
        {(title || showCloseButton) && (
          <Dialog.Header
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            p={{ base: 4, lg: 6 }}
            borderBottom="1px solid"
            borderColor="var(--border-light)"
          >
            {title && (
              <Heading as="h2" size="lg" fontWeight="semibold" color="var(--text-primary)">
                {title}
              </Heading>
            )}
            {showCloseButton && (
              <Dialog.CloseTrigger asChild>
                <IconButton
                  aria-label="Close"
                  icon={<X size={20} />}
                  variant="ghost"
                  size="sm"
                  color="var(--text-secondary)"
                  _hover={{
                    color: "var(--text-primary)",
                    bg: "var(--bg-secondary)",
                  }}
                  transition="colors"
                />
              </Dialog.CloseTrigger>
            )}
          </Dialog.Header>
        )}
        <Dialog.Body p={{ base: 4, lg: 6 }} overflowX="hidden">
          {children}
        </Dialog.Body>
      </Dialog.Content>
    </Dialog.Root>
  );
}
