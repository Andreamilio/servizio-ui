"use client";

import { A2HS_OPEN_EVENT } from "@/app/lib/a2hsStorage";

interface OpenA2HSLinkProps {
  variant?: "default" | "header";
}

export function OpenA2HSLink({ variant = "default" }: OpenA2HSLinkProps) {
  const handleClick = () => {
    window.dispatchEvent(new Event(A2HS_OPEN_EVENT));
  };

  if (variant === "header") {
    return (
      <button
        onClick={handleClick}
        className="text-xs sm:text-sm text-[var(--accent-primary)] hover:underline font-medium"
      >
        Come installare l'app
      </button>
    );
  }

  return (
    <div className="text-center pt-2 lg:hidden">
      <button
        onClick={handleClick}
        className="text-sm text-[var(--accent-primary)] hover:underline font-medium"
      >
        Come installare l'app
      </button>
    </div>
  );
}

