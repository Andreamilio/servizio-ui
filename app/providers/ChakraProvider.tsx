"use client";

import { ChakraProvider as BaseChakraProvider } from "@chakra-ui/react";
import { system } from "@/app/lib/theme/chakraTheme";
import { EmotionCacheProvider } from "./EmotionCacheProvider";
import { ThemeProvider, useTheme } from "@/app/lib/theme";
import { useEffect } from "react";

function ChakraProviderInner({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  // Sync ChakraUI colorMode with our theme system
  useEffect(() => {
    const root = document.documentElement;
    // ChakraUI v3 uses data-theme attribute for color mode
    if (theme === "dark") {
      root.setAttribute("data-theme", "dark");
    } else {
      root.removeAttribute("data-theme");
    }
  }, [theme]);

  return <>{children}</>;
}

export function ChakraProvider({ children }: { children: React.ReactNode }) {
  return (
    <EmotionCacheProvider>
      <BaseChakraProvider value={system}>
        <ChakraProviderInner>{children}</ChakraProviderInner>
      </BaseChakraProvider>
    </EmotionCacheProvider>
  );
}
