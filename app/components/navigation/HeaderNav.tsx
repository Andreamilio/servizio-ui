"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Home, Users, Building2, Calendar, Sparkles, HelpCircle, Settings, User } from "lucide-react";
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
    <header className="sticky top-0 z-50 w-full bg-[var(--bg-card)]/95 backdrop-blur-sm border-b border-[var(--border-light)] shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Profile Icon / Logo */}
          <div className="flex items-center gap-2">
            {userInfo && userInfo.userId && (role === "host" || role === "tech") ? (
              <UserProfile
                userId={userInfo.userId}
                username={userInfo.username || ""}
                role={role}
                profileImageUrl={userInfo.profileImageUrl}
              />
            ) : null}
          </div>

          {/* Navigation Items - Desktop Only */}
          <nav className="hidden lg:flex items-center gap-1">
            {allItems.map((item) => {
              const Icon = item.icon;
              // Per "/app/guest" (Home), attiva solo se pathname è esattamente "/app/guest"
              // Per "/app/host/stays" e "/app/host/cleaners", attiva solo se l'href corrisponde esattamente
              // Per altre route, usa la logica normale ma escludi route specifiche
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
                // Per "Soggiorni", controlla se siamo sulla route stays
                isActive = pathname === "/app/host/stays";
              } else if (item.href.includes("/app/host/cleaners")) {
                // Per "Cleaner", controlla se siamo sulla route cleaners
                isActive = pathname === "/app/host/cleaners";
              } else if (item.href === "/app/host") {
                // Per "Dashboard", attiva solo se siamo su /app/host e NON su altre route host
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
                // Per "Dashboard" tech, attiva solo se siamo su /app/tech e NON su /app/tech/users o /app/tech/clients
                if (pathname.startsWith("/app/tech/users") || pathname.startsWith("/app/tech/clients")) {
                  isActive = false;
                } else {
                  isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                }
              } else {
                isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              }
              
              // Check if this is a Dashboard/Home item that should use back navigation
              const isDashboardItem = item.href === "/app/tech" || 
                                      item.href === "/app/host" || 
                                      item.href === "/app/guest";
              
              if (isDashboardItem) {
                const dashboardHref = getDashboardHref(role, pathname, searchParams);
                return (
                  <button
                    key={item.href}
                    onClick={() => router.push(dashboardHref)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-[var(--accent-primary)] text-[var(--text-inverse)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              }
              
              return (
                <Link
                  key={item.href}
                  href={href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[var(--accent-primary)] text-[var(--text-inverse)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            <PushNotificationToggle />
            <ThemeToggle />
            <form action="/api/auth/logout" method="post">
              <Button variant="ghost" size="sm" type="submit" className="hidden sm:flex">
                Logout
              </Button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
