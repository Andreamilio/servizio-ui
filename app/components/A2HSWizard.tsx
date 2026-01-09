"use client";

import { useState, useEffect, useMemo } from "react";
import { X, ChevronLeft, ChevronRight, Smartphone } from "lucide-react";
import { Button } from "@/app/components/ui/Button";
import {
  A2HS_OPEN_EVENT,
  type Platform,
  hasSeenA2HS,
  markA2HSSeen,
  getSavedPlatform,
  savePlatform,
} from "@/app/lib/a2hsStorage";
import { detectPlatform } from "@/app/lib/deviceDetection";
import { Box, VStack, HStack, Heading, Text, Image, IconButton } from "@chakra-ui/react";

const TOTAL_STEPS = 3;

const iOS_STEPS = [
  {
    image: "/guide/ios-1.PNG",
    title: "Apri Safari",
    description: "Apri l'app Safari sul tuo iPhone o iPad e naviga al sito.",
  },
  {
    image: "/guide/ios-2.PNG",
    title: "Condividi",
    description: "Tocca il pulsante Condividi (box con freccia verso l'alto) nella barra degli strumenti.",
  },
  {
    image: "/guide/ios-3.PNG",
    title: "Aggiungi alla schermata Home",
    description: "Scorri verso il basso e seleziona 'Aggiungi alla schermata Home', quindi conferma.",
  },
];

const Android_STEPS = [
  {
    title: "Passo 1",
    description: "Apri il menu del browser e seleziona 'Aggiungi alla schermata Home'.",
    placeholder: true,
  },
  {
    title: "Passo 2",
    description: "Conferma l'installazione dell'app.",
    placeholder: true,
  },
  {
    title: "Passo 3",
    description: "L'app sarà disponibile nella schermata Home del tuo dispositivo.",
    placeholder: true,
  },
];

export function A2HSWizard() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [platform, setPlatform] = useState<Platform>("android");
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const saved = getSavedPlatform();
    const detected = detectPlatform();
    setPlatform(saved || detected);
  }, []);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener(A2HS_OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(A2HS_OPEN_EVENT, handleOpen);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handlePlatformChange = (newPlatform: Platform) => {
    setPlatform(newPlatform);
    savePlatform(newPlatform);
    setCurrentStep(0);
  };

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (step: number) => {
    setCurrentStep(step);
  };

  const handleClose = () => {
    markA2HSSeen();
    setIsOpen(false);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const touchEndPos = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
    };

    const deltaX = touchStart.x - touchEndPos.x;
    const deltaY = Math.abs(touchStart.y - touchEndPos.y);
    const absDeltaX = Math.abs(deltaX);

    const minSwipeDistance = 40;
    const maxVerticalDistance = 30;

    if (absDeltaX > minSwipeDistance && deltaY < maxVerticalDistance) {
      if (deltaX > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    setTouchStart(null);
  };

  const steps = useMemo(() => platform === "ios" ? iOS_STEPS : Android_STEPS, [platform]);
  const currentStepData = useMemo(() => steps[currentStep], [steps, currentStep]);
  const isLastStep = useMemo(() => currentStep === TOTAL_STEPS - 1, [currentStep]);

  if (!isOpen) return null;

  return (
    <Box
      position="fixed"
      inset={0}
      zIndex={60}
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={4}
      bg="var(--bg-overlay)"
      backdropFilter="blur(4px)"
      pb="env(safe-area-inset-bottom)"
      sx={{ display: { base: "flex", lg: "none" } }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <Box
        w="100%"
        maxW="2xl"
        maxH="90vh"
        overflow="hidden"
        bg="var(--bg-card)"
        borderRadius="2xl"
        border="1px solid"
        borderColor="var(--border-light)"
        boxShadow="xl"
        display="flex"
        flexDirection="column"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Header con X */}
        <HStack
          justify="space-between"
          p={{ base: 4, lg: 6 }}
          borderBottom="1px solid"
          borderColor="var(--border-light)"
          flexShrink={0}
        >
          <Heading as="h2" size="lg" fontWeight="semibold" color="var(--text-primary)">
            Come installare l'app
          </Heading>
          <IconButton
            onClick={handleClose}
            aria-label="Chiudi"
            p={1.5}
            borderRadius="lg"
            color="var(--text-secondary)"
            _hover={{
              color: "var(--text-primary)",
              bg: "var(--bg-secondary)",
            }}
            transition="colors"
            icon={<X size={20} />}
          />
        </HStack>

        {/* Toggle piattaforma */}
        <Box
          p={{ base: 4, lg: 6 }}
          borderBottom="1px solid"
          borderColor="var(--border-light)"
          flexShrink={0}
        >
          <HStack justify="center" spacing={4}>
            <Text fontSize="sm" color="var(--text-secondary)">
              Piattaforma:
            </Text>
            <HStack spacing={2} bg="var(--bg-secondary)" borderRadius="lg" p={1}>
              <Button
                onClick={() => handlePlatformChange("ios")}
                px={4}
                py={2}
                borderRadius="md"
                fontSize="sm"
                fontWeight="medium"
                bg={platform === "ios" ? "var(--accent-primary)" : "transparent"}
                color={platform === "ios" ? "white" : "var(--text-secondary)"}
                _hover={{
                  color: platform === "ios" ? "white" : "var(--text-primary)",
                }}
                transition="colors"
              >
                iOS
              </Button>
              <Button
                onClick={() => handlePlatformChange("android")}
                px={4}
                py={2}
                borderRadius="md"
                fontSize="sm"
                fontWeight="medium"
                bg={platform === "android" ? "var(--accent-primary)" : "transparent"}
                color={platform === "android" ? "white" : "var(--text-secondary)"}
                _hover={{
                  color: platform === "android" ? "white" : "var(--text-primary)",
                }}
                transition="colors"
              >
                Android
              </Button>
            </HStack>
          </HStack>
        </Box>

        {/* Contenuto step */}
        <Box
          p={{ base: 4, lg: 6 }}
          flex={1}
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minH={0}
          overflow="hidden"
        >
          <VStack spacing={4} w="100%" maxW="100%" px={2} overflowY="auto" textAlign="center">
            {platform === "ios" && 'image' in currentStepData && currentStepData.image ? (
              <Box display="flex" justifyContent="center" flexShrink={0}>
                <Image
                  src={currentStepData.image}
                  alt={currentStepData.title}
                  maxW="100%"
                  maxH="400px"
                  w="auto"
                  h="auto"
                  borderRadius="lg"
                  border="1px solid"
                  borderColor="var(--border-light)"
                  objectFit="contain"
                  loading="lazy"
                  decoding="async"
                />
              </Box>
            ) : (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                h={64}
                bg="var(--bg-secondary)"
                borderRadius="lg"
                border="1px solid"
                borderColor="var(--border-light)"
                flexShrink={0}
              >
                <VStack spacing={2} textAlign="center">
                  <Smartphone size={64} color="var(--text-secondary)" style={{ opacity: 0.5 }} />
                  <Text fontSize="sm" color="var(--text-secondary)">
                    Schermata Android
                  </Text>
                  <Text fontSize="xs" color="var(--text-secondary)" opacity={0.75}>
                    Coming soon
                  </Text>
                </VStack>
              </Box>
            )}

            <VStack spacing={2} flexShrink={0}>
              <Heading as="h3" size="md" fontWeight="semibold" color="var(--text-primary)" wordBreak="break-word">
                {currentStepData.title}
              </Heading>
              <Text fontSize="sm" color="var(--text-secondary)" wordBreak="break-word">
                {currentStepData.description}
              </Text>
            </VStack>
          </VStack>
        </Box>

        {/* Dots indicator */}
        <HStack
          justify="center"
          spacing={2}
          p={{ base: 4, lg: 6 }}
          borderTop="1px solid"
          borderColor="var(--border-light)"
          flexShrink={0}
        >
          {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
            <Box
              key={index}
              as="button"
              onClick={() => handleStepClick(index)}
              w={index === currentStep ? 8 : 2}
              h={2}
              borderRadius="full"
              bg={index === currentStep ? "var(--accent-primary)" : "var(--border-medium)"}
              _hover={{
                bg: index === currentStep ? "var(--accent-primary)" : "var(--border-dark)",
              }}
              transition="all"
              aria-label={`Vai allo step ${index + 1}`}
            />
          ))}
        </HStack>

        {/* Pulsanti navigazione */}
        <HStack
          justify="space-between"
          spacing={4}
          p={{ base: 4, lg: 6 }}
          borderTop="1px solid"
          borderColor="var(--border-light)"
          flexShrink={0}
        >
          <Button
            onClick={handlePrev}
            disabled={currentStep === 0}
            variant="secondary"
            icon={ChevronLeft}
            iconPosition="left"
          >
            Indietro
          </Button>

          <Button
            onClick={handleNext}
            variant="primary"
            icon={isLastStep ? undefined : ChevronRight}
            iconPosition="right"
          >
            {isLastStep ? "Fine" : "Avanti"}
          </Button>
        </HStack>
      </Box>
    </Box>
  );
}
