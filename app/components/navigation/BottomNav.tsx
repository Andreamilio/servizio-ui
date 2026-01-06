"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Home, Users, Building2, Calendar, Sparkles, HelpCircle, LogOut } from "lucide-react";
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

interface BottomNavProps {
  role: Role;
}

export function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const items = navItemsByRole[role] || [];
  const conditionalItems = conditionalItemsByRole[role]?.(searchParams) || [];
  const allItems = [...items, ...conditionalItems];

  if (allItems.length === 0) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-[var(--bg-card)] border-t border-[var(--border-light)] shadow-lg">
      <div className="flex items-center justify-around h-16 px-2">
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
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-lg transition-colors ${
                isActive
                  ? "text-[var(--accent-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Icon size={20} className={isActive ? "stroke-[2.5]" : ""} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
