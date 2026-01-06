"use client";

import { useState } from "react";
import Link from "next/link";

type Apartment = {
  aptId: string;
  aptName: string;
  status: "online" | "offline";
  network: "main" | "backup";
  lastAccessLabel: string;
};

type PillStatus = {
  dot: string;
  text: string;
  box: string;
};

type PillNet = {
  text: string;
  box: string;
};

function pillStatus(s: "online" | "offline"): PillStatus {
  return s === "online"
    ? { dot: "bg-emerald-500", text: "ONLINE", box: "bg-[var(--pastel-green)] border-[var(--border-light)] text-[var(--accent-success)] dark:bg-emerald-500/20 dark:border-emerald-500/30 dark:text-emerald-400" }
    : { dot: "bg-red-500", text: "OFFLINE", box: "bg-red-100 border-[var(--border-light)] text-[var(--accent-error)] dark:bg-red-900/30 dark:border-red-500/30 dark:text-red-400" };
}

function pillNet(n: "main" | "backup"): PillNet {
  return n === "main"
    ? { text: "MAIN WAN", box: "bg-[var(--bg-card)] border-[var(--border-light)] text-[var(--text-primary)]" }
    : { text: "BACKUP WAN", box: "bg-[var(--bg-card)] border-[var(--border-light)] text-[var(--text-primary)]" };
}

interface ClientAccordionProps {
  clientName: string;
  apartments: Apartment[];
}

export function ClientAccordion({
  clientName,
  apartments,
}: ClientAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] overflow-hidden">
      {/* Header cliccabile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-[var(--bg-tertiary)] transition-colors"
      >
        <div className="font-semibold text-left">{clientName}</div>
        <svg
          className={`w-5 h-5 text-[var(--text-primary)] transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Contenuto collassabile */}
      {isOpen && (
        <div className="border-t border-[var(--border-light)]">
          {/* Header tabella */}
          <div className="hidden sm:grid grid-cols-[1.2fr_1fr_1fr_1fr] gap-2 p-4 text-xs uppercase tracking-wider opacity-60">
            <div>Apartment</div>
            <div>Status</div>
            <div>Network</div>
            <div>Last Access</div>
          </div>

          {/* Lista appartamenti */}
          <div className="px-4 pt-2 pb-4 space-y-2">
            {apartments.map((apt) => {
              const st = pillStatus(apt.status);
              const net = pillNet(apt.network);

              return (
                <Link
                  key={apt.aptId}
                  href={`/app/tech/apt/${apt.aptId}`}
                  className="grid grid-cols-1 sm:grid-cols-[1.2fr_1fr_1fr_1fr] gap-2 items-start sm:items-center rounded-xl bg-[var(--bg-card)] border border-[var(--border-light)] px-4 py-3 hover:border-[var(--border-medium)] active:scale-[.99] transition"
                >
                  <div className="font-semibold">{apt.aptName}</div>

                  <div className="flex flex-col sm:block gap-1">
                    <span className="text-xs opacity-60 sm:hidden">Status</span>
                    <div
                      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${st.box}`}
                    >
                      <span className={`h-2 w-2 rounded-full ${st.dot}`} />
                      {st.text}
                    </div>
                  </div>

                  <div className="flex flex-col sm:block gap-1">
                    <span className="text-xs opacity-60 sm:hidden">Network</span>
                    <div
                      className={`inline-flex items-center rounded-lg border px-3 py-2 text-xs font-semibold ${net.box}`}
                    >
                      {net.text}
                    </div>
                  </div>

                  <div className="flex flex-col sm:block gap-1">
                    <span className="text-xs opacity-60 sm:hidden">Last Access</span>
                    <div className="text-sm opacity-90 mt-1 sm:mt-0">
                      {apt.lastAccessLabel}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

