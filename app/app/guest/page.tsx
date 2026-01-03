export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSession } from "@/app/lib/session";
import { unstable_noStore as noStore } from "next/cache";
import {
  getGuestState,
  guestOpenDoor,
  guestCloseDoor,
} from "@/app/lib/gueststore";

import * as Store from "@/app/lib/store";
import { events_listByApt, events_log } from "@/app/lib/domain/eventsDomain";

function badge(outcome: "ok" | "retrying" | "fail" | null) {
  if (outcome === "ok") return { t: "Accesso disponibile", c: "bg-emerald-500/15 border-emerald-400/20 text-emerald-200" };
  if (outcome === "fail") return { t: "Problema accesso", c: "bg-red-500/15 border-red-400/20 text-red-200" };
  if (outcome === "retrying") return { t: "In corso…", c: "bg-yellow-500/15 border-yellow-400/20 text-yellow-200" };
  return { t: "Pronto", c: "bg-white/5 border-white/10 text-white/80" };
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

  if (!me || me.role !== "guest") return <div className="p-6 text-white">Non autorizzato</div>;

  const aptId = me.aptId || "017";
  const state = getGuestState(aptId);
  const events = events_listByApt(Store, aptId, 10);
  const b = badge(state.lastOutcome);
  const doorIsOpen = state.door === "open";

  async function actOpenDoor() {
    "use server";
    const outcome = guestOpenDoor(aptId);

    if (outcome === "ok") {
      events_log(Store, {
        aptId,
        type: "door_opened",
        actor: "guest",
        label: "Porta aperta dall’ospite",
      });
    } else {
      events_log(Store, {
        aptId,
        type: "guest_access_ko",
        actor: "guest",
        label: "Tentativo apertura porta fallito",
      });
    }

    redirect(`/app/guest?toast=${outcome === "ok" ? "open_ok" : "open_fail"}`);
  }

  async function actCloseDoor() {
    "use server";
    const outcome = guestCloseDoor(aptId);

    if (outcome === "ok") {
      events_log(Store, {
        aptId,
        type: "door_closed",
        actor: "guest",
        label: "Porta chiusa dall’ospite",
      });
    } else {
      events_log(Store, {
        aptId,
        type: "guest_access_ko",
        actor: "guest",
        label: "Tentativo chiusura porta fallito",
      });
    }

    redirect(`/app/guest?toast=${outcome === "ok" ? "close_ok" : "close_fail"}`);
  }

  return (
    <main className="min-h-screen bg-[#0a0d12] text-white">
      <div className="mx-auto w-full max-w-md p-5 space-y-4">
        {/* Top bar */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs opacity-60">GUEST</div>
            <div className="text-lg font-semibold">{state.apt.aptName}</div>
            <div className="text-xs opacity-60">{state.apt.addressShort}</div>
          </div>

          <form action="/api/auth/logout" method="post">
            <button className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs">
              Logout
            </button>
          </form>
        </div>

        {/* Toast */}
        {toast && (
          <div
            className={`rounded-2xl border p-3 text-sm ${
              toast.endsWith("_ok")
                ? "bg-emerald-500/10 border-emerald-400/20 text-emerald-200"
                : "bg-red-500/10 border-red-400/20 text-red-200"
            }`}
          >
            {toast === "open_ok" && "Porta sbloccata ✅"}
            {toast === "close_ok" && "Porta chiusa ✅"}
            {toast === "open_fail" &&
              "Non riesco ad aprire. Prova ancora o contatta supporto."}
            {toast === "close_fail" &&
              "Non riesco a chiudere. Prova ancora o contatta supporto."}
          </div>
        )}

        {/* Status + CTA */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div
              className={`inline-flex items-center rounded-xl border px-3 py-2 text-xs font-semibold ${b.c}`}
            >
              {b.t}
            </div>

            <div
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${
                doorIsOpen
                  ? "bg-emerald-500/10 border-emerald-400/20 text-emerald-200"
                  : "bg-white/5 border-white/10 text-white/80"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  doorIsOpen ? "bg-emerald-400" : "bg-white/40"
                }`}
              />
              {doorIsOpen ? "PORTA SBLOCCATA" : "PORTA CHIUSA"}
            </div>
          </div>

          <div className="space-y-2">
            {doorIsOpen ? (
              <form action={actCloseDoor}>
                <button className="w-full rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 py-4 text-base font-semibold">
                  Chiudi porta
                </button>
              </form>
            ) : (
              <form action={actOpenDoor}>
                <button className="w-full rounded-2xl bg-cyan-500/25 hover:bg-cyan-500/35 border border-cyan-400/30 py-4 text-base font-semibold">
                  Apri porta
                </button>
              </form>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-black/20 border border-white/10 p-3">
              <div className="text-xs opacity-60">Wi-Fi</div>
              <div className="font-semibold">{state.apt.wifiSsid}</div>
              <div className="text-xs opacity-70">Pass: {state.apt.wifiPass}</div>
            </div>
            <div className="rounded-xl bg-black/20 border border-white/10 p-3">
              <div className="text-xs opacity-60">Orari</div>
              <div className="text-xs opacity-80">Check-in: <span className="font-semibold">{state.apt.checkIn}</span></div>
              <div className="text-xs opacity-80">Check-out: <span className="font-semibold">{state.apt.checkOut}</span></div>
            </div>
          </div>

          <div className="flex gap-3">
            <Link className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-center text-sm" href="/app/guest/apartment">
              Dettagli appartamento
            </Link>
            <Link className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-center text-sm" href="/app/guest/support">
              Supporto
            </Link>
          </div>
        </div>

        {/* Live events */}
        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <div className="text-sm font-semibold">Attività recente</div>
          </div>
          <div className="p-4 space-y-2">
            {events.map((e) => (
              <div key={e.id} className="rounded-xl bg-black/20 border border-white/10 p-3">
                <div className="text-xs opacity-60">{new Date(e.ts).toLocaleString()}</div>
                <div className="mt-1 text-sm font-semibold">{e.label}</div>
                <div className="mt-1 text-xs opacity-70">{e.type}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-[11px] opacity-50 text-center">
          Prototipo: nessun servizio reale. Tutto mock.
        </div>
      </div>
    </main>
  );
}
