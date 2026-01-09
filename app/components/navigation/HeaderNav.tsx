"use client";

import NextLink from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Home, Users, Building2, Calendar, Sparkles, HelpCircle } from "lucide-react";
import { Box, HStack, Container, IconButton } from "@chakra-ui/react";
import { ThemeToggle } from "../ThemeToggle";
import { PushNotificationToggle } from "../PushNotificationToggle";
import { Button } from "../ui/Button";
import { UserProfile } from "@/app/app/components/UserProfile";
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

interface HeaderNavProps {
  role: Role;
  userInfo?: {
    userId?: string;
    username?: string;
    profileImageUrl?: string;
  };
}

export function HeaderNav({ role, userInfo }: HeaderNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const items = navItemsByRole[role] || [];
  const conditionalItems = conditionalItemsByRole[role]?.(searchParams) || [];
  const allItems = [...items, ...conditionalItems];

  return (
    <Box
      as="header"
      position="sticky"
      top={0}
      zIndex={50}
      w="100%"
      bg="var(--bg-card)"
      bgOpacity={0.95}
      backdropFilter="blur(4px)"
      borderBottom="1px solid"
      borderColor="var(--border-light)"
      boxShadow="sm"
    >
      <Container maxW="7xl" px={{ base: 4, sm: 6, lg: 8 }}>
        <HStack h={16} justify="space-between">
          {/* Profile Icon / Logo */}
          <HStack spacing={4}>
            {userInfo && userInfo.userId && (role === "host" || role === "tech") ? (
              <>
                <Box
                  as="img"
                  src="/easy-stay-192.png"
                  alt="easy stay"
                  w={10}
                  h={10}
                  objectFit="contain"
                />
                <UserProfile
                  userId={userInfo.userId}
                  username={userInfo.username || ""}
                  role={role}
                  profileImageUrl={userInfo.profileImageUrl}
                />
              </>
            ) : null}
          </HStack>

          {/* Navigation Items - Desktop Only */}
          <Box as="nav" display={{ base: "none", lg: "flex" }} alignItems="center" gap={1}>
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
                    leftIcon={<Icon size={18} />}
                    size="sm"
                    px={4}
                    py={2}
                    borderRadius="xl"
                    fontSize="sm"
                    fontWeight="medium"
                    transition="colors"
                    bg={isActive ? "var(--accent-primary)" : "transparent"}
                    color={isActive ? "var(--text-inverse)" : "var(--text-secondary)"}
                    _hover={{
                      color: isActive ? undefined : "var(--text-primary)",
                      bg: isActive ? undefined : "var(--bg-secondary)",
                    }}
                  >
                    {item.label}
                  </Button>
                );
              }
              
              return (
                <Button
                  key={item.href}
                  asChild
                  leftIcon={<Icon size={18} />}
                  size="sm"
                  px={4}
                  py={2}
                  borderRadius="xl"
                  fontSize="sm"
                  fontWeight="medium"
                  transition="colors"
                  bg={isActive ? "var(--accent-primary)" : "transparent"}
                  color={isActive ? "var(--text-inverse)" : "var(--text-secondary)"}
                  _hover={{
                    color: isActive ? undefined : "var(--text-primary)",
                    bg: isActive ? undefined : "var(--bg-secondary)",
                  }}
                >
                  <NextLink href={href}>
                    {item.label}
                  </NextLink>
                </Button>
              );
            })}
          </Box>

          {/* Right Side Actions */}
          <HStack spacing={2}>
            <PushNotificationToggle />
            <ThemeToggle />
            <Box as="form" action="/api/auth/logout" method="post">
              <Button
                variant="ghost"
                size="sm"
                type="submit"
                display={{ base: "none", sm: "flex" }}
              >
                Logout
              </Button>
            </Box>
          </HStack>
        </HStack>
      </Container>
    </Box>
  );
}
