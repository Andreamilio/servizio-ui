"use client";

import { useState, useSyncExternalStore } from "react";
import { UserProfileModal } from "./UserProfileModal";

type UserProfileProps = {
  userId: string;
  username: string;
  role: "host" | "tech";
  profileImageUrl?: string;
};

// Hook per evitare problemi di hydration
function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function UserProfile({ userId, username, role, profileImageUrl }: UserProfileProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isClient = useIsClient();

  function getInitials(name: string): string {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  // Durante SSR, renderizza solo un placeholder per evitare mismatch
  if (!isClient) {
    return (
      <div className="w-8 h-8 rounded-full bg-[var(--pastel-blue)] border border-[var(--border-light)] flex items-center justify-center">
        <span className="text-xs font-semibold text-[var(--accent-primary)]">
          {getInitials(username)}
        </span>
      </div>
    );
  }

  return (
    <>
      {profileImageUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={profileImageUrl}
          alt={username}
          onClick={() => setIsModalOpen(true)}
          className="w-8 h-8 rounded-full object-cover border border-[var(--border-light)] cursor-pointer hover:opacity-80 transition-opacity"
        />
      ) : (
        <div
          onClick={() => setIsModalOpen(true)}
          className="w-8 h-8 rounded-full bg-[var(--pastel-blue)] border border-[var(--border-light)] flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
        >
          <span className="text-xs font-semibold text-[var(--accent-primary)]">
            {getInitials(username)}
          </span>
        </div>
      )}

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
