"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

interface BottomNavProps {
  role: Role;
}

export function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname();
  const items = navItemsByRole[role] || [];

  if (items.length === 0) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-[var(--bg-card)] border-t border-[var(--border-light)] shadow-lg">
      <div className="flex items-center justify-around h-16 px-2">
        {items.map((item) => {
          const Icon = item.icon;
          // Per "/app/guest" (Home), attiva solo se pathname è esattamente "/app/guest"
          // Per altre route, usa la logica normale
          const isActive = item.href === "/app/guest" 
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          
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
