"use client";

import { useState, useEffect } from "react";
import { UserProfileModal } from "./UserProfileModal";

type UserProfileProps = {
  userId: string;
  username: string;
  role: "host" | "tech";
  profileImageUrl?: string;
};

export function UserProfile({ userId, username, role, profileImageUrl }: UserProfileProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Evita problemi di hydration renderizzando solo dopo il mount
  useEffect(() => {
    setMounted(true);
  }, []);

  function getInitials(name: string): string {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  const roleLabel = role === "host" ? "Host" : "Tech";

  // Durante SSR, renderizza solo un placeholder per evitare mismatch
  if (!mounted) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] px-3 py-2">
        <div className="w-8 h-8 rounded-full bg-[var(--pastel-blue)] border border-[var(--border-light)] flex items-center justify-center">
          <span className="text-xs font-semibold text-[var(--accent-primary)]">
            {getInitials(username)}
          </span>
        </div>
        <div className="text-left hidden sm:block">
          <div className="text-xs font-semibold text-[var(--text-primary)]">{username}</div>
          <div className="text-[10px] text-[var(--text-secondary)]">{roleLabel}</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-light)] px-3 py-2 transition-colors"
      >
        {profileImageUrl ? (
          <img
            src={profileImageUrl}
            alt={username}
            className="w-8 h-8 rounded-full object-cover border border-[var(--border-light)]"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[var(--pastel-blue)] border border-[var(--border-light)] flex items-center justify-center">
            <span className="text-xs font-semibold text-[var(--accent-primary)]">
              {getInitials(username)}
            </span>
          </div>
        )}
        <div className="text-left hidden sm:block">
          <div className="text-xs font-semibold text-[var(--text-primary)]">{username}</div>
          <div className="text-[10px] text-[var(--text-secondary)]">{roleLabel}</div>
        </div>
      </button>

      {isModalOpen && (
        <UserProfileModal
          userId={userId}
          username={username}
          role={role}
          profileImageUrl={profileImageUrl}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}

