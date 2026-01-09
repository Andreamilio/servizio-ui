"use client";

import { useContext, useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { ThemeContext } from "@/app/lib/theme";
import { Box, IconButton } from "@chakra-ui/react";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const context = useContext(ThemeContext);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !context) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        w={10}
        h={10}
        borderRadius="full"
        bg="var(--bg-card)"
        border="1px solid"
        borderColor="var(--border-light)"
      >
        <Sun size={20} color="var(--text-primary)" style={{ opacity: 0.5 }} />
      </Box>
    );
  }

  const { theme, toggleTheme } = context;

  return (
    <IconButton
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      display="flex"
      alignItems="center"
      justifyContent="center"
      w={10}
      h={10}
      borderRadius="full"
      bg="var(--bg-card)"
      border="1px solid"
      borderColor="var(--border-light)"
      _hover={{ opacity: 0.8 }}
      transition="opacity"
      icon={theme === "light" ? <Moon size={20} color="var(--text-primary)" /> : <Sun size={20} color="var(--text-primary)" />}
    />
  );
}
