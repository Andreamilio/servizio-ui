"use client";

import { useState, useRef } from "react";
import { Modal } from "@/app/components/ui/Modal";
import { Button } from "@/app/components/ui/Button";
import { Textarea } from "@/app/components/ui/Textarea";
import { Box, VStack, HStack, Grid, GridItem, Text, Image } from "@chakra-ui/react";

type ProblemModalProps = {
  jobId: string;
  onReport: (formData: FormData) => Promise<void>;
};

export function ProblemModal({ jobId, onReport }: ProblemModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function handleClose() {
    setIsOpen(false);
    formRef.current?.reset();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    handleClose();
    try {
      await onReport(formData);
    } catch (error) {
      console.error("Error reporting problem:", error);
    }
  }

  return (
    <>
      <Button variant="danger" onClick={() => setIsOpen(true)}>
        Segnala problema
      </Button>

      <Modal isOpen={isOpen} onClose={handleClose} title="Segnala problema" size="md">
        <Box as="form" ref={formRef} onSubmit={handleSubmit}>
          <VStack spacing={4} align="stretch">
            <Textarea
              name="note"
              label="Note"
              rows={4}
              placeholder="Descrivi il problema..."
              required
            />

            <Box>
              <Text fontSize="sm" fontWeight="medium" color="var(--text-primary)" mb={2}>
                Foto
              </Text>
              <Grid templateColumns="repeat(3, 1fr)" gap={2}>
                {[1, 2, 3].map((num) => (
                  <Box
                    key={num}
                    position="relative"
                    aspectRatio="1"
                    borderRadius="lg"
                    overflow="hidden"
                    border="1px solid"
                    borderColor="var(--border-light)"
                    bg="var(--bg-secondary)"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Text fontSize="sm" color="var(--text-tertiary)" fontWeight="semibold">
                      Foto {num}
                    </Text>
                  </Box>
                ))}
              </Grid>
            </Box>

            <input type="hidden" name="jobId" value={jobId} />

            <HStack spacing={3} pt={2}>
              <Button type="button" variant="ghost" onClick={handleClose} fullWidth>
                Annulla
              </Button>
              <Button type="submit" variant="danger" fullWidth>
                Conferma
              </Button>
            </HStack>
          </VStack>
        </Box>
      </Modal>
    </>
  );
}
