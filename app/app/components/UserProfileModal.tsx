"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Box, VStack, HStack, Text, Image, Heading, IconButton } from "@chakra-ui/react";
import { X } from "lucide-react";
import { Modal } from "@/app/components/ui/Modal";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { Alert } from "@/app/components/ui/Alert";
import { updateProfileImage, removeProfileImage } from "./userProfileActions";

type UserProfileModalProps = {
  userId: string;
  username: string;
  role: "host" | "tech";
  profileImageUrl?: string;
  onClose: () => void;
};

export function UserProfileModal({
  userId,
  username,
  role,
  profileImageUrl,
  onClose,
}: UserProfileModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(profileImageUrl || null);
  const [savingImage, setSavingImage] = useState(false);
  const [removingImage, setRemovingImage] = useState(false);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

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
      setTimeout(() => {
        onClose();
      }, 100);
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
      setTimeout(() => {
        onClose();
      }, 100);
    } catch (error) {
      console.error("Error removing profile image:", error);
      alert("Errore durante la rimozione dell'immagine");
    } finally {
      setRemovingImage(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword !== confirmPassword) {
      setPasswordError("Le password non corrispondono");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("La password deve essere di almeno 6 caratteri");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        setPasswordError(data.error || "Errore durante il cambio password");
        return;
      }

      setPasswordSuccess("Password aggiornata con successo");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Error changing password:", error);
      setPasswordError("Errore durante il cambio password");
    } finally {
      setChangingPassword(false);
    }
  }

  const roleLabel = role === "host" ? "Host" : "Tech";

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  if (!mounted) {
    return null;
  }

  const modalContent = (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Profilo Utente • ${username} • ${roleLabel}`}
      size="md"
    >
      <VStack spacing={6} align="stretch" pb={{ base: "calc(6rem + env(safe-area-inset-bottom))", lg: 6 }}>
        {/* Profile Image Section */}
        <Box pb={6} borderBottom="1px solid" borderColor="var(--border-light)">
          <Text fontSize="sm" fontWeight="medium" mb={3}>
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
                  borderColor="rgba(255, 255, 255, 0.2)"
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
                  <Text fontSize="2xl" fontWeight="semibold" color="var(--accent-primary)">
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
                Cambia immagine
              </Button>
              {profileImage && profileImage !== profileImageUrl && (
                <Button
                  type="button"
                  onClick={handleSaveImage}
                  disabled={savingImage}
                  borderRadius="xl"
                  bg="rgba(6, 182, 212, 0.2)"
                  _hover={{ bg: "rgba(6, 182, 212, 0.3)" }}
                  border="1px solid"
                  borderColor="rgba(6, 182, 212, 0.3)"
                  px={4}
                  py={2}
                  fontSize="sm"
                  fontWeight="semibold"
                  w="100%"
                >
                  {savingImage ? "Salvataggio..." : "Salva immagine"}
                </Button>
              )}
              {(profileImageUrl || profileImage) && (
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
        </Box>

        {/* User Info (Read-only) */}
        <Box pb={6} borderBottom="1px solid" borderColor="var(--border-light)">
          <Text fontSize="sm" fontWeight="medium" mb={3}>
            Informazioni Utente
          </Text>
          <VStack spacing={2} align="stretch">
            <Box>
              <Text fontSize="xs" opacity={0.6} mb={1}>Username</Text>
              <Text fontSize="sm" opacity={0.9}>{username}</Text>
            </Box>
            <Box>
              <Text fontSize="xs" opacity={0.6} mb={1}>Ruolo</Text>
              <Text fontSize="sm" opacity={0.9}>{roleLabel}</Text>
            </Box>
          </VStack>
        </Box>

        {/* Change Password Section */}
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={3}>
            Cambia Password
          </Text>
          <Box as="form" onSubmit={handleChangePassword}>
            <VStack spacing={4} align="stretch">
              {passwordError && (
                <Alert variant="error">
                  {passwordError}
                </Alert>
              )}
              {passwordSuccess && (
                <Alert variant="success">
                  {passwordSuccess}
                </Alert>
              )}

              <Input
                type="password"
                label="Password corrente"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />

              <Input
                type="password"
                label="Nuova password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />

              <Input
                type="password"
                label="Conferma nuova password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />

              <HStack spacing={3} pt={2}>
                <Button
                  type="button"
                  onClick={onClose}
                  variant="secondary"
                  flex={1}
                  borderRadius="xl"
                  px={4}
                  py={2}
                  fontSize="sm"
                  fontWeight="semibold"
                >
                  Chiudi
                </Button>
                <Button
                  type="submit"
                  disabled={changingPassword}
                  flex={1}
                  borderRadius="xl"
                  bg="rgba(6, 182, 212, 0.2)"
                  _hover={{ bg: "rgba(6, 182, 212, 0.3)" }}
                  border="1px solid"
                  borderColor="rgba(6, 182, 212, 0.3)"
                  px={4}
                  py={2}
                  fontSize="sm"
                  fontWeight="semibold"
                >
                  {changingPassword ? "Aggiornamento..." : "Cambia password"}
                </Button>
              </HStack>
            </VStack>
          </Box>
        </Box>
      </VStack>
    </Modal>
  );

  return modalContent;
}
