"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Building2, Calendar, Sparkles, HelpCircle, Settings } from "lucide-react";
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
  const items = navItemsByRole[role] || [];

  return (
    <header className="sticky top-0 z-40 w-full bg-[var(--bg-card)] border-b border-[var(--border-light)] shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center gap-2">
            <Link href={`/app/${role}`} className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-[var(--accent-primary)] flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="font-semibold text-lg text-[var(--text-primary)] hidden sm:inline">
                Servizio
              </span>
            </Link>
          </div>

          {/* Navigation Items - Desktop Only */}
          <nav className="hidden lg:flex items-center gap-1">
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
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[var(--accent-primary)] text-white"
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
            {userInfo && userInfo.userId && (
              <UserProfile
                userId={userInfo.userId}
                username={userInfo.username || ""}
                role={role}
                profileImageUrl={userInfo.profileImageUrl}
              />
            )}
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
