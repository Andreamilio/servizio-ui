"use client";

import { ReactNode, useRef } from "react";
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

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      <HeaderNav role={role} userInfo={userInfo} />
      <main ref={mainRef} className="flex-1 pb-bottom-nav overflow-x-hidden">
        {children}
      </main>
      <BottomNav role={role} />
    </div>
  );
}
