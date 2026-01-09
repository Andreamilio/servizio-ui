"use client";

import { useState, useEffect } from "react";
import { Box, Image, Text } from "@chakra-ui/react";
import { UserProfileModal } from "./UserProfileModal";

type UserProfileProps = {
  userId: string;
  username: string;
  role: "host" | "tech";
  profileImageUrl?: string;
};

export function UserProfile({ userId, username, role, profileImageUrl }: UserProfileProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

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

  if (!mounted) {
    return (
      <Box
        w={8}
        h={8}
        borderRadius="full"
        bg="var(--pastel-blue)"
        border="1px solid"
        borderColor="var(--border-light)"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Text fontSize="xs" fontWeight="semibold" color="var(--accent-primary)">
          {getInitials(username)}
        </Text>
      </Box>
    );
  }

  return (
    <>
      {profileImageUrl ? (
        <Image
          src={profileImageUrl}
          alt={username}
          onClick={() => setIsModalOpen(true)}
          w={8}
          h={8}
          borderRadius="full"
          objectFit="cover"
          border="1px solid"
          borderColor="var(--border-light)"
          cursor="pointer"
          _hover={{ opacity: 0.8 }}
          transition="opacity"
        />
      ) : (
        <Box
          onClick={() => setIsModalOpen(true)}
          w={8}
          h={8}
          borderRadius="full"
          bg="var(--pastel-blue)"
          border="1px solid"
          borderColor="var(--border-light)"
          display="flex"
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          _hover={{ opacity: 0.8 }}
          transition="opacity"
        >
          <Text fontSize="xs" fontWeight="semibold" color="var(--accent-primary)">
            {getInitials(username)}
          </Text>
        </Box>
      )}

      {isModalOpen && (
        <UserProfileModal
          userId={userId}
          username={username}
          role={role}
          profileImageUrl={profileImageUrl}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}
