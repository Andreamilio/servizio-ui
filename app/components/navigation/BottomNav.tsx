"use client";

import NextLink from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Home, Users, Building2, Calendar, Sparkles, HelpCircle } from "lucide-react";
import { Box, HStack, VStack, Text } from "@chakra-ui/react";
import { Button } from "../ui/Button";
import type { Role } from "@/app/lib/store";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const navItemsByRole: Record<Role, NavItem[]> = {
  tech: [
    { href: "/app/tech", label: "Dashboard", icon: Home },
    { href: "/app/tech/users", label: "Utenti", icon: Users },
    { href: "/app/tech/clients", label: "Clienti", icon: Building2 },
  ],
  host: [
    { href: "/app/host", label: "Dashboard", icon: Home },
  ],
  guest: [
    { href: "/app/guest", label: "Home", icon: Home },
    { href: "/app/guest/apartment", label: "Appartamento", icon: Building2 },
    { href: "/app/guest/support", label: "Supporto", icon: HelpCircle },
  ],
  cleaner: [
    { href: "/app/cleaner", label: "Pulizie", icon: Sparkles },
  ],
};

// Conditional items that appear based on query params
const conditionalItemsByRole: Record<Role, (searchParams: URLSearchParams) => NavItem[]> = {
  tech: () => [],
  host: (searchParams) => {
    const apt = searchParams.get('apt');
    if (!apt) return [];
    
    const client = searchParams.get('client');
    const baseHref = client 
      ? `?apt=${encodeURIComponent(apt)}&client=${encodeURIComponent(client)}`
      : `?apt=${encodeURIComponent(apt)}`;
    
    return [
      { href: `/app/host/stays${baseHref}`, label: "Soggiorni", icon: Calendar },
      { href: `/app/host/cleaners${baseHref}`, label: "Cleaner", icon: Sparkles },
    ];
  },
  guest: () => [],
  cleaner: () => [],
};

function getDashboardHref(
  role: Role,
  pathname: string,
  searchParams: URLSearchParams
): string {
  // Tech
  if (role === "tech") {
    if (pathname.startsWith("/app/tech/users") || 
        pathname.startsWith("/app/tech/clients") ||
        pathname.startsWith("/app/tech/apt")) {
      return "/app/tech";
    }
    return "/app/tech";
  }
  
  // Host
  if (role === "host") {
    const apt = searchParams.get('apt');
    const client = searchParams.get('client');
    const params = apt && client 
      ? `?client=${encodeURIComponent(client)}&apt=${encodeURIComponent(apt)}`
      : apt 
      ? `?apt=${encodeURIComponent(apt)}`
      : client
      ? `?client=${encodeURIComponent(client)}`
      : '';
    
    if (pathname.startsWith("/app/host/stays") ||
        pathname.startsWith("/app/host/cleaners") ||
        pathname.startsWith("/app/host/job") ||
        pathname.startsWith("/app/host/stay") ||
        pathname.startsWith("/app/host/pins") ||
        pathname.startsWith("/app/host/support")) {
      return `/app/host${params}`;
    }
    return `/app/host${params}`;
  }
  
  // Guest
  if (role === "guest") {
    if (pathname.startsWith("/app/guest/apartment") ||
        pathname.startsWith("/app/guest/support")) {
      return "/app/guest";
    }
    return "/app/guest";
  }
  
  return "/app";
}

interface BottomNavProps {
  role: Role;
}

export function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const items = navItemsByRole[role] || [];
  const conditionalItems = conditionalItemsByRole[role]?.(searchParams) || [];
  const allItems = [...items, ...conditionalItems];
  const navRef = useRef<HTMLElement>(null);

  // #region agent log
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Create a temporary element to measure safe-area-inset-bottom
    const testEl = document.createElement('div');
    testEl.style.position = 'fixed';
    testEl.style.bottom = '0';
    testEl.style.left = '0';
    testEl.style.width = '1px';
    testEl.style.height = '1px';
    testEl.style.paddingBottom = 'env(safe-area-inset-bottom, 0px)';
    testEl.style.visibility = 'hidden';
    document.body.appendChild(testEl);
    const computedPadding = window.getComputedStyle(testEl).paddingBottom;
    document.body.removeChild(testEl);
    
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    const viewportContent = viewportMeta?.getAttribute('content') || '';
    const hasViewportFit = viewportContent.includes('viewport-fit=cover');
    const navEl = navRef.current;
    const navPaddingBottom = navEl ? window.getComputedStyle(navEl).paddingBottom : '0px';
    const navHeight = navEl?.offsetHeight || 0;
    const navBottom = navEl ? navEl.getBoundingClientRect().bottom : 0;
    const windowHeight = window.innerHeight;
    const isStandalone = (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    const visualViewport = (window as any).visualViewport;
    const visualViewportHeight = visualViewport?.height || windowHeight;
    const safeAreaDiff = windowHeight - visualViewportHeight;
    
    fetch('http://127.0.0.1:7242/ingest/3df387f4-627b-438e-a378-69576d8b319f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'BottomNav.tsx:useEffect',message:'Safe area debug v2',data:{safeAreaBottom:computedPadding,viewportFit:hasViewportFit,navPaddingBottom,navHeight,navBottom,windowHeight,visualViewportHeight,safeAreaDiff,isStandalone,userAgent:navigator.userAgent},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch(()=>{});
  }, []);
  // #endregion

  // Nascondi la tab bar sulla dashboard host principale (senza apt selezionato)
  if (role === "host" && pathname === "/app/host" && !searchParams.get('apt')) {
    return null;
  }

  // Nascondi la tab bar sulla pagina principale cleaner
  if (role === "cleaner" && pathname === "/app/cleaner") {
    return null;
  }

  if (allItems.length === 0) return null;

  return (
    <Box
      as="nav"
      ref={navRef}
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      zIndex={50}
      display={{ base: "block", lg: "none" }}
      bg="var(--bg-card)"
      borderTop="1px solid"
      borderColor="var(--border-light)"
      boxShadow="lg"
      pb="max(env(safe-area-inset-bottom, 0), 16px)"
    >
      <HStack h={16} justify="space-around" px={2}>
        {allItems.map((item) => {
          const Icon = item.icon;
          let isActive = false;
          let href = item.href;
          
          // Se siamo su Dashboard host e ci sono query params, includiamoli nell'href
          if (item.href === "/app/host" && role === "host") {
            const apt = searchParams.get('apt');
            const client = searchParams.get('client');
            if (apt && client) {
              href = `/app/host?client=${encodeURIComponent(client)}&apt=${encodeURIComponent(apt)}`;
            } else if (apt) {
              href = `/app/host?apt=${encodeURIComponent(apt)}`;
            } else if (client) {
              href = `/app/host?client=${encodeURIComponent(client)}`;
            }
          }
          
          if (item.href === "/app/guest") {
            isActive = pathname === item.href;
          } else if (item.href.includes("/app/host/stays")) {
            isActive = pathname === "/app/host/stays";
          } else if (item.href.includes("/app/host/cleaners")) {
            isActive = pathname === "/app/host/cleaners";
          } else if (item.href === "/app/host") {
            isActive = pathname === item.href || (
              pathname.startsWith(item.href + "/") && 
              !pathname.startsWith("/app/host/stays") && 
              !pathname.startsWith("/app/host/cleaners") &&
              !pathname.startsWith("/app/host/stay") &&
              !pathname.startsWith("/app/host/job") &&
              !pathname.startsWith("/app/host/pins") &&
              !pathname.startsWith("/app/host/support")
            );
          } else if (item.href === "/app/tech") {
            if (pathname.startsWith("/app/tech/users") || pathname.startsWith("/app/tech/clients")) {
              isActive = false;
            } else {
              isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            }
          } else {
            isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          }
          
          const isDashboardItem = item.href === "/app/tech" || 
                                  item.href === "/app/host" || 
                                  item.href === "/app/guest";
          
          if (isDashboardItem) {
            const dashboardHref = getDashboardHref(role, pathname, searchParams);
            return (
              <Button
                key={item.href}
                onClick={() => router.push(dashboardHref)}
                variant="ghost"
                flex={1}
                h="100%"
                borderRadius="lg"
                transition="colors"
                color={isActive ? "var(--accent-primary)" : "var(--text-secondary)"}
                _hover={{
                  color: "var(--text-primary)",
                }}
              >
                <VStack spacing={1}>
                  <Icon size={20} style={{ strokeWidth: isActive ? 2.5 : undefined }} />
                  <Text fontSize="xs" fontWeight="medium">
                    {item.label}
                  </Text>
                </VStack>
              </Button>
            );
          }
          
          return (
            <Button
              key={item.href}
              asChild
              variant="ghost"
              flex={1}
              h="100%"
              borderRadius="lg"
              transition="colors"
              color={isActive ? "var(--accent-primary)" : "var(--text-secondary)"}
              _hover={{
                color: "var(--text-primary)",
              }}
            >
              <NextLink href={href}>
                <VStack spacing={1}>
                  <Icon size={20} style={{ strokeWidth: isActive ? 2.5 : undefined }} />
                  <Text fontSize="xs" fontWeight="medium">
                    {item.label}
                  </Text>
                </VStack>
              </NextLink>
            </Button>
          );
        })}
      </HStack>
    </Box>
  );
}
