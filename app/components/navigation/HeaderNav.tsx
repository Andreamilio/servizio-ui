"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Home, Users, Building2, Calendar, Sparkles, HelpCircle, Settings, User } from "lucide-react";
import { ThemeToggle } from "../ThemeToggle";
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
              if (item.href === "/app/guest") {
                isActive = pathname === item.href;
              } else if (item.href.includes("/app/host/stays")) {
                // Per "Soggiorni", controlla se siamo sulla route stays
                isActive = pathname === "/app/host/stays";
              } else if (item.href.includes("/app/host/cleaners")) {
                // Per "Cleaner", controlla se siamo sulla route cleaners
                isActive = pathname === "/app/host/cleaners";
              } else if (item.href === "/app/host") {
                // Per "Dashboard", attiva solo se siamo su /app/host e NON su /app/host/stays o /app/host/cleaners
                isActive = pathname === item.href || (pathname.startsWith(item.href + "/") && !pathname.startsWith("/app/host/stays") && !pathname.startsWith("/app/host/cleaners"));
              } else {
                isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              }
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
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
