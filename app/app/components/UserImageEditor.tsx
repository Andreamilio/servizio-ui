"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Box, VStack, HStack, Text, Image, Input as ChakraInput } from "@chakra-ui/react";
import { Button } from "@/app/components/ui/Button";
import { updateProfileImage, removeProfileImage } from "./userProfileActions";

type UserImageEditorProps = {
  userId: string;
  username: string;
  currentImageUrl?: string;
};

export function UserImageEditor({ userId, username, currentImageUrl }: UserImageEditorProps) {
  const [profileImage, setProfileImage] = useState<string | null>(currentImageUrl || null);
  const [savingImage, setSavingImage] = useState(false);
  const [removingImage, setRemovingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function getInitials(name: string): string {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("L'immagine deve essere inferiore a 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setProfileImage(base64);
    };
    reader.readAsDataURL(file);
  }

  async function handleSaveImage() {
    if (!profileImage) return;
    setSavingImage(true);
    try {
      await updateProfileImage(userId, profileImage);
      router.refresh();
    } catch (error) {
      console.error("Error saving profile image:", error);
      alert("Errore durante il salvataggio dell'immagine");
    } finally {
      setSavingImage(false);
    }
  }

  async function handleRemoveImage() {
    if (!confirm("Sei sicuro di voler rimuovere l'immagine profilo?")) {
      return;
    }
    setRemovingImage(true);
    try {
      await removeProfileImage(userId);
      setProfileImage(null);
      router.refresh();
    } catch (error) {
      console.error("Error removing profile image:", error);
      alert("Errore durante la rimozione dell'immagine");
    } finally {
      setRemovingImage(false);
    }
  }

  const hasUnsavedChanges = profileImage !== currentImageUrl;

  return (
    <VStack spacing={4} align="stretch">
      <Text fontSize="sm" fontWeight="semibold" color="var(--text-primary)">
        Immagine Profilo
      </Text>
      
      <HStack spacing={4} align="start">
        <Box position="relative">
          {profileImage ? (
            <Image
              src={profileImage}
              alt="Profile"
              w={20}
              h={20}
              borderRadius="full"
              objectFit="cover"
              border="2px solid"
              borderColor="var(--border-light)"
            />
          ) : (
            <Box
              w={20}
              h={20}
              borderRadius="full"
              bg="var(--pastel-blue)"
              border="2px solid"
              borderColor="var(--border-light)"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize="xl" fontWeight="semibold" color="var(--accent-primary)">
                {getInitials(username)}
              </Text>
            </Box>
          )}
        </Box>
        
        <VStack spacing={2} align="stretch" flex={1}>
          <ChakraInput
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            display="none"
          />
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            variant="secondary"
            w="100%"
            borderRadius="xl"
            px={4}
            py={2}
            fontSize="sm"
            fontWeight="semibold"
          >
            {profileImage ? "Cambia immagine" : "Carica immagine"}
          </Button>
          
          {hasUnsavedChanges && profileImage && (
            <Button
              type="button"
              onClick={handleSaveImage}
              disabled={savingImage}
              variant="primary"
              w="100%"
              borderRadius="xl"
              px={4}
              py={2}
              fontSize="sm"
              fontWeight="semibold"
            >
              {savingImage ? "Salvataggio..." : "Salva immagine"}
            </Button>
          )}
          
          {(currentImageUrl || profileImage) && (
            <Button
              type="button"
              onClick={handleRemoveImage}
              disabled={removingImage || savingImage}
              variant="danger"
              w="100%"
              borderRadius="xl"
              px={4}
              py={2}
              fontSize="sm"
              fontWeight="semibold"
            >
              {removingImage ? "Rimozione..." : "Rimuovi immagine"}
            </Button>
          )}
        </VStack>
      </HStack>
    </VStack>
  );
}
