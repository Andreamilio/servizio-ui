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

  // Inizializza piattaforma al mount
  useEffect(() => {
    const saved = getSavedPlatform();
    const detected = detectPlatform();
    setPlatform(saved || detected);
  }, []);

  // Listener CustomEvent per apertura programmatica
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener(A2HS_OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(A2HS_OPEN_EVENT, handleOpen);
  }, []);

  // Scroll lock quando wizard è aperto
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

  // Handler per cambio piattaforma
  const handlePlatformChange = (newPlatform: Platform) => {
    setPlatform(newPlatform);
    savePlatform(newPlatform);
    setCurrentStep(0); // Reset step quando cambia piattaforma
  };

  // Navigazione step
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

  // Chiusura wizard
  const handleClose = () => {
    markA2HSSeen();
    setIsOpen(false);
  };

  // Swipe gesture handlers
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

    // Soglie: deltaX > 40 e deltaY < 30 per evitare conflitti con scroll
    if (absDeltaX > minSwipeDistance && deltaY < maxVerticalDistance) {
      if (deltaX > 0) {
        // Swipe left -> next step
        handleNext();
      } else {
        // Swipe right -> prev step
        handlePrev();
      }
    }
    setTouchStart(null);
  };

  // Memoizza per evitare ricalcoli
  const steps = useMemo(() => platform === "ios" ? iOS_STEPS : Android_STEPS, [platform]);
  const currentStepData = useMemo(() => steps[currentStep], [steps, currentStep]);
  const isLastStep = useMemo(() => currentStep === TOTAL_STEPS - 1, [currentStep]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[var(--bg-overlay)] backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-hidden bg-[var(--bg-card)] rounded-2xl border border-[var(--border-light)] shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Header con X */}
        <div className="flex items-center justify-between p-4 lg:p-6 border-b border-[var(--border-light)] flex-shrink-0">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            Come installare l'app
          </h2>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
            aria-label="Chiudi"
          >
            <X size={20} />
          </button>
        </div>

        {/* Toggle piattaforma */}
        <div className="p-4 lg:p-6 border-b border-[var(--border-light)] flex-shrink-0">
          <div className="flex items-center justify-center gap-4">
            <span className="text-sm text-[var(--text-secondary)]">Piattaforma:</span>
            <div className="flex items-center gap-2 bg-[var(--bg-secondary)] rounded-lg p-1">
              <button
                onClick={() => handlePlatformChange("ios")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  platform === "ios"
                    ? "bg-[var(--accent-primary)] text-white"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                iOS
              </button>
              <button
                onClick={() => handlePlatformChange("android")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  platform === "android"
                    ? "bg-[var(--accent-primary)] text-white"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                Android
              </button>
            </div>
          </div>
        </div>

        {/* Contenuto step */}
        <div className="p-4 lg:p-6 flex-1 flex flex-col items-center justify-center min-h-0 overflow-hidden">
          <div className="text-center space-y-4 w-full">
            {platform === "ios" && 'image' in currentStepData && currentStepData.image ? (
              <div className="flex justify-center">
                <img
                  src={currentStepData.image}
                  alt={currentStepData.title}
                  className="max-w-full max-h-[400px] w-auto h-auto rounded-lg border border-[var(--border-light)] object-contain"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            ) : (
              <div className="flex justify-center items-center h-64 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-light)]">
                <div className="text-center space-y-2">
                  <Smartphone className="w-16 h-16 mx-auto text-[var(--text-secondary)] opacity-50" />
                  <p className="text-sm text-[var(--text-secondary)]">Schermata Android</p>
                  <p className="text-xs text-[var(--text-secondary)] opacity-75">Coming soon</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                {currentStepData.title}
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                {currentStepData.description}
              </p>
            </div>
          </div>
        </div>

        {/* Dots indicator */}
        <div className="flex items-center justify-center gap-2 p-4 lg:p-6 border-t border-[var(--border-light)] flex-shrink-0">
          {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
            <button
              key={index}
              onClick={() => handleStepClick(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentStep
                  ? "bg-[var(--accent-primary)] w-8"
                  : "bg-[var(--border-medium)] hover:bg-[var(--border-dark)]"
              }`}
              aria-label={`Vai allo step ${index + 1}`}
            />
          ))}
        </div>

        {/* Pulsanti navigazione */}
        <div className="flex items-center justify-between gap-4 p-4 lg:p-6 border-t border-[var(--border-light)] flex-shrink-0">
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
        </div>
      </div>
    </div>
  );
}

