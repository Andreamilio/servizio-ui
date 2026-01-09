"use client";

import { A2HS_OPEN_EVENT } from "@/app/lib/a2hsStorage";
import { Box } from "@chakra-ui/react";
import { Button } from "./ui/Button";

interface OpenA2HSLinkProps {
  variant?: "default" | "header";
}

export function OpenA2HSLink({ variant = "default" }: OpenA2HSLinkProps) {
  const handleClick = () => {
    window.dispatchEvent(new Event(A2HS_OPEN_EVENT));
  };

  if (variant === "header") {
    return (
      <Button
        onClick={handleClick}
        variant="ghost"
        fontSize={{ base: "xs", sm: "sm" }}
        color="var(--accent-primary)"
        _hover={{ textDecoration: "underline" }}
        fontWeight="medium"
      >
        Come installare l'app
      </Button>
    );
  }

  return (
    <Box textAlign="center" pt={2} display={{ base: "block", lg: "none" }}>
      <Button
        onClick={handleClick}
        variant="ghost"
        fontSize="sm"
        color="var(--accent-primary)"
        _hover={{ textDecoration: "underline" }}
        fontWeight="medium"
      >
        Come installare l'app
      </Button>
    </Box>
  );
}
