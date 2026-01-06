"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
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
    <nav ref={navRef} className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-[var(--bg-card)] border-t border-[var(--border-light)] shadow-lg" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0), 16px)' }}>
      <div className="flex items-center justify-around h-16 px-2">
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
                className={`flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-lg transition-colors ${
                  isActive
                    ? "text-[var(--accent-primary)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Icon size={20} className={isActive ? "stroke-[2.5]" : ""} />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          }
          
          return (
            <Link
              key={item.href}
              href={href}
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
