export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { readSession } from "@/app/lib/session";
import { unstable_noStore as noStore } from "next/cache";
import {
  getGuestState,
  guestOpenDoor,
  guestCloseDoor,
  guestOpenGate,
} from "@/app/lib/gueststore";

import * as Store from "@/app/lib/store";
import { events_listByApt, events_log } from "@/app/lib/domain/eventsDomain";
import { door_getStateFromLog } from "@/app/lib/domain/doorStore";
import { Badge } from "@/app/components/ui/Badge";
import { AppLayout } from "@/app/components/layouts/AppLayout";

function badge(outcome: "ok" | "retrying" | "fail" | null) {
  if (outcome === "ok") return { t: "Accesso disponibile", c: "bg-emerald-500/15 border-emerald-400/20 text-emerald-200" };
  if (outcome === "fail") return { t: "Problema accesso", c: "bg-red-500/15 border-red-400/20 text-red-200" };
  if (outcome === "retrying") return { t: "In corso…", c: "bg-yellow-500/15 border-yellow-400/20 text-yellow-200" };
  return { t: "Pronto", c: "bg-[var(--bg-secondary)] border-[var(--border-light)] text-[var(--text-secondary)]" };
}

export default async function GuestPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  noStore();

  const sp = (await searchParams) ?? {};
  const toast = typeof sp.toast === "string" ? sp.toast : undefined;

  const cookieStore = await cookies();
  const sess = cookieStore.get("sess")?.value;
  const me = readSession(sess);

  if (!me || me.role !== "guest") return <div className="p-6 text-[var(--text-primary)]">Non autorizzato</div>;

  const aptId = me.aptId;
  if (!aptId) return <div className="p-6 text-[var(--text-primary)]">AptId non disponibile</div>;
  
  const state = getGuestState(aptId);
  const allEvents = events_listByApt(Store, aptId, 5);
  // Filtra per mostrare solo eventi relativi a porta e portone
  const events = allEvents.filter((e) => 
    e.type === 'door_opened' || 
    e.type === 'door_closed' || 
    e.type === 'gate_opened'
  );
  const b = badge(state.lastOutcome);
  // Leggi stato porta da Store.accessLog (single source of truth) invece che da gueststore locale
  const doorState = door_getStateFromLog(Store, aptId);
  const doorIsOpen = doorState === "open";

  // Rimuovi toast dall'URL se non corrisponde allo stato attuale (evita toast fuorvianti dopo refresh)
  if (toast && toast.startsWith("open_") && !doorIsOpen && !toast.includes("gate")) {
    redirect("/app/guest");
  }
  if (toast && toast.startsWith("close_") && doorIsOpen && !toast.includes("gate")) {
    redirect("/app/guest");
  }

  async function actOpenDoor() {
    "use server";
    const outcome = guestOpenDoor(aptId);

    if (outcome === "ok") {
      events_log(Store, {
        aptId,
        type: "door_opened",
        actor: "guest",
        label: "Porta aperta dall'ospite",
      });
    } else {
      events_log(Store, {
        aptId,
        type: "guest_access_ko",
        actor: "guest",
        label: "Tentativo apertura porta fallito",
      });
    }

    revalidatePath("/app/guest");
    redirect(`/app/guest?toast=${outcome === "ok" ? "open_ok" : "open_fail"}&r=${Date.now()}`);
  }

  async function actCloseDoor() {
    "use server";
    const outcome = guestCloseDoor(aptId);

    if (outcome === "ok") {
      events_log(Store, {
        aptId,
        type: "door_closed",
        actor: "guest",
        label: "Porta chiusa dall'ospite",
      });
    } else {
      events_log(Store, {
        aptId,
        type: "guest_access_ko",
        actor: "guest",
        label: "Tentativo chiusura porta fallito",
      });
    }

    revalidatePath("/app/guest");
    redirect(`/app/guest?toast=${outcome === "ok" ? "close_ok" : "close_fail"}&r=${Date.now()}`);
  }

  async function actOpenGate() {
    "use server";
    const outcome = guestOpenGate(aptId);

    if (outcome === "ok") {
      events_log(Store, {
        aptId,
        type: "gate_opened",
        actor: "guest",
        label: "Portone aperto dall'ospite",
      });
    } else {
      events_log(Store, {
        aptId,
        type: "guest_access_ko",
        actor: "guest",
        label: "Tentativo apertura portone fallito",
      });
    }

    revalidatePath("/app/guest");
    redirect(`/app/guest?toast=${outcome === "ok" ? "gate_open_ok" : "gate_open_fail"}&r=${Date.now()}`);
  }


  return (
    <AppLayout role="guest">
      <div className="mx-auto w-full max-w-md p-5 space-y-4">
        <div className="mb-2">
          <Badge variant="default" size="sm">GUEST</Badge>
          <div className="mt-1 text-lg font-semibold">{state.apt.aptName}</div>
          <div className="text-xs opacity-60">{state.apt.addressShort}</div>
        </div>

        {/* Toast */}
        {toast && (
          <div
            className={`rounded-2xl border p-3 text-sm ${
              toast.endsWith("_ok")
                ? "bg-emerald-500/10 dark:bg-emerald-500/10 border-emerald-400/20 dark:border-emerald-400/20 text-emerald-800 dark:text-emerald-200"
                : "bg-red-500/10 dark:bg-red-500/10 border-red-400/20 dark:border-red-400/20 text-red-800 dark:text-red-200"
            }`}
          >
            {toast === "open_ok" && "Porta sbloccata ✅"}
            {toast === "close_ok" && "Porta chiusa ✅"}
            {toast === "open_fail" &&
              "Non riesco ad aprire. Prova ancora o contatta supporto."}
            {toast === "close_fail" &&
              "Non riesco a chiudere. Prova ancora o contatta supporto."}
            {toast === "gate_open_ok" && "Portone sbloccato ✅"}
            {toast === "gate_open_fail" &&
              "Non riesco ad aprire il portone. Prova ancora o contatta supporto."}
          </div>
        )}

        {/* Controllo Porta */}
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Porta</div>
            <div
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                doorIsOpen
                  ? "bg-emerald-50 dark:bg-emerald-500/20 border-emerald-200 dark:border-emerald-400/30 text-emerald-900 dark:text-emerald-200"
                  : "bg-gray-100 dark:bg-[var(--bg-card)] border-gray-300 dark:border-[var(--border-light)] text-gray-900 dark:text-[var(--text-primary)]"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full flex-shrink-0 ${
                  doorIsOpen ? "bg-emerald-600 dark:bg-emerald-400" : "bg-gray-600 dark:bg-[var(--text-tertiary)]"
                }`}
              />
              {doorIsOpen ? "SBLOCCATA" : "BLOCCATA"}
            </div>
          </div>

          <div className="space-y-2">
            {doorIsOpen ? (
              <form action={actCloseDoor}>
                <button className="w-full rounded-xl bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-400/30 py-3 text-base font-semibold">
                  Chiudi porta
                </button>
              </form>
            ) : (
              <form action={actOpenDoor}>
                <button className="w-full rounded-xl bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-400/30 py-3 text-base font-semibold">
                  Apri porta
                </button>
              </form>
            )}
            <form action={actOpenGate}>
              <button className="w-full rounded-xl bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-400/30 py-3 text-base font-semibold">
                Apri portone
              </button>
            </form>
          </div>
        </div>

        {/* Informazioni Appartamento */}
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] p-4 space-y-4">
          <div className="text-sm font-semibold">Informazioni</div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] p-3">
              <div className="text-xs text-[var(--text-secondary)] mb-1">Wi-Fi</div>
              <div className="font-semibold text-[var(--text-primary)] text-sm">{state.apt.wifiSsid}</div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">Pass: {state.apt.wifiPass}</div>
            </div>
            <div className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] p-3">
              <div className="text-xs text-[var(--text-secondary)] mb-1">Orari</div>
              <div className="text-xs text-[var(--text-secondary)]">Check-in: <span className="font-semibold text-[var(--text-primary)]">{state.apt.checkIn}</span></div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">Check-out: <span className="font-semibold text-[var(--text-primary)]">{state.apt.checkOut}</span></div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Link className="flex-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] px-4 py-3 text-center text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors flex items-center justify-center" href="/app/guest/apartment">
              Dettagli appartamento
            </Link>
            <Link className="flex-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] px-4 py-3 text-center text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors flex items-center justify-center" href="/app/guest/support">
              Supporto
            </Link>
          </div>
        </div>

        {/* Live events */}
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] overflow-hidden">
          <div className="p-4 border-b border-[var(--border-light)]">
            <div className="text-sm font-semibold text-[var(--text-primary)]">Attività recente</div>
          </div>
          <div className="p-4 space-y-2">
            {events.map((e) => (
              <div key={e.id} className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] p-3">
                <div className="text-xs text-[var(--text-secondary)]">{new Date(e.ts).toLocaleString()}</div>
                <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{e.label}</div>
                <div className="mt-1 text-xs text-[var(--text-secondary)]">{e.type}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-[11px] text-[var(--text-tertiary)] text-center">
          Prototipo: nessun servizio reale. Tutto mock.
        </div>
      </div>
    </AppLayout>
  );
}
