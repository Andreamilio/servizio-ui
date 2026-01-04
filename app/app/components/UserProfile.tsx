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
      <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2">
        <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center">
          <span className="text-xs font-semibold text-cyan-200">
            {getInitials(username)}
          </span>
        </div>
        <div className="text-left hidden sm:block">
          <div className="text-xs font-semibold">{username}</div>
          <div className="text-[10px] opacity-60">{roleLabel}</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 transition"
      >
        {profileImageUrl ? (
          <img
            src={profileImageUrl}
            alt={username}
            className="w-8 h-8 rounded-full object-cover border border-white/20"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center">
            <span className="text-xs font-semibold text-cyan-200">
              {getInitials(username)}
            </span>
          </div>
        )}
        <div className="text-left hidden sm:block">
          <div className="text-xs font-semibold">{username}</div>
          <div className="text-[10px] opacity-60">{roleLabel}</div>
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

