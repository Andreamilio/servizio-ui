"use client";

import { ReactNode, useEffect, useRef } from "react";
import { Box, VStack } from "@chakra-ui/react";
import { HeaderNav } from "../navigation/HeaderNav";
import { BottomNav } from "../navigation/BottomNav";
import type { Role } from "@/app/lib/store";

interface AppLayoutProps {
  children: ReactNode;
  role: Role;
  userInfo?: {
    userId?: string;
    username?: string;
    profileImageUrl?: string;
  };
}

export function AppLayout({ children, role, userInfo }: AppLayoutProps) {
  const mainRef = useRef<HTMLElement>(null);

  // #region agent log
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mainEl = mainRef.current;
    const mainPaddingBottom = mainEl ? window.getComputedStyle(mainEl).paddingBottom : '0px';
    const mainBottom = mainEl ? mainEl.getBoundingClientRect().bottom : 0;
    const viewportHeight = window.innerHeight;
    const visualViewport = (window as any).visualViewport;
    const visualViewportHeight = visualViewport?.height || viewportHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    // Create a temporary element to measure safe-area-inset-bottom
    const testEl = document.createElement('div');
    testEl.style.position = 'fixed';
    testEl.style.bottom = '0';
    testEl.style.paddingBottom = 'env(safe-area-inset-bottom, 0px)';
    testEl.style.visibility = 'hidden';
    document.body.appendChild(testEl);
    const safeAreaBottom = window.getComputedStyle(testEl).paddingBottom;
    document.body.removeChild(testEl);
    
    fetch('http://127.0.0.1:7242/ingest/3df387f4-627b-438e-a378-69576d8b319f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AppLayout.tsx:useEffect',message:'Main content padding debug v2',data:{mainPaddingBottom,mainBottom,viewportHeight,visualViewportHeight,documentHeight,safeAreaBottom},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
  }, []);
  // #endregion

  return (
    <Box
      minH="100vh"
      bg="var(--bg-primary)"
      display="flex"
      flexDirection="column"
    >
      <HeaderNav role={role} userInfo={userInfo} />
      <Box
        ref={mainRef}
        as="main"
        flex="1"
        pb={{
          base: "calc(4rem + max(env(safe-area-inset-bottom, 0), 16px))",
          lg: 0,
        }}
        overflowX="hidden"
      >
        {children}
      </Box>
      <BottomNav role={role} />
    </Box>
  );
}
