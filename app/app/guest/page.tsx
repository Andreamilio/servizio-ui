export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { readSession, validateSessionUser } from "@/app/lib/session";
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
import { Button } from "@/app/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/app/components/ui/Card";
import { Badge } from "@/app/components/ui/Badge";
import { AppLayout } from "@/app/components/layouts/AppLayout";
import { DoorOpen, DoorClosed, Fence, Wifi, Clock, Activity, Home, HelpCircle } from "lucide-react";

function badge(outcome: "ok" | "retrying" | "fail" | null) {
  if (outcome === "ok") return { t: "Accesso disponibile", variant: "success" as const };
  if (outcome === "fail") return { t: "Problema accesso", variant: "error" as const };
  if (outcome === "retrying") return { t: "In corso…", variant: "warning" as const };
  return { t: "Pronto", variant: "default" as const };
}

function fmtDT(ts?: number | null) {
  if (!ts) return '—';
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
  const me = validateSessionUser(readSession(sess));

  if (!me || me.role !== "guest") {
    redirect("/?err=session_expired");
    return <div className="p-6 text-white">Non autorizzato</div>;
  }

  const aptId = me.aptId;
  if (!aptId) return <div className="p-6 text-white">AptId non disponibile</div>;
  
  const state = getGuestState(aptId);
  const allEvents = events_listByApt(Store, aptId, 20);
  // Filtra eventi: il guest vede solo eventi relativi a porta e portone
  // Limita a 5 eventi per la visualizzazione
  const events = allEvents.filter((e) => 
    e.type === 'door_opened' || 
    e.type === 'door_closed' || 
    e.type === 'gate_opened'
  ).slice(0, 5);
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
      <div className="mx-auto w-full max-w-4xl p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Badge variant="default" size="sm">GUEST</Badge>
            <h1 className="text-2xl lg:text-3xl font-semibold text-[var(--text-primary)]">{state.apt.aptName}</h1>
            <p className="text-sm text-[var(--text-secondary)]">{state.apt.addressShort}</p>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <Card className={`mb-6 ${
            toast.endsWith("_ok")
              ? "bg-green-500/10 dark:bg-green-500/20 border-2 border-green-500/30 dark:border-green-500/40"
              : "bg-red-500/10 dark:bg-red-500/20 border-2 border-red-500/30 dark:border-red-500/40"
          }`}>
            <CardBody>
              <p className={`text-sm font-semibold ${
                toast.endsWith("_ok")
                  ? "text-green-900 dark:text-green-300"
                  : "text-red-900 dark:text-red-300"
              }`}>
                {toast === "open_ok" && "Porta sbloccata ✅"}
                {toast === "close_ok" && "Porta chiusa ✅"}
                {toast === "open_fail" &&
                  "Non riesco ad aprire. Prova ancora o contatta supporto."}
                {toast === "close_fail" &&
                  "Non riesco a chiudere. Prova ancora o contatta supporto."}
                {toast === "gate_open_ok" && "Portone sbloccato ✅"}
                {toast === "gate_open_fail" &&
                  "Non riesco ad aprire il portone. Prova ancora o contatta supporto."}
              </p>
            </CardBody>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Actions - Left Column (full width on mobile) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status + Door Actions */}
            <Card variant="elevated">
              <CardBody className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Badge variant={b.variant} size="md">{b.t}</Badge>
                  <Badge variant={doorIsOpen ? "success" : "default"} size="md">
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                      doorIsOpen ? "bg-green-500" : "bg-gray-400"
                    }`} />
                    {doorIsOpen ? "PORTA SBLOCCATA" : "PORTA CHIUSA"}
                  </Badge>
                </div>

                <div className="space-y-3">
                  {doorIsOpen ? (
                    <form action={actCloseDoor}>
                      <Button variant="success" size="lg" fullWidth icon={DoorClosed} iconPosition="left">
                        Chiudi porta
                      </Button>
                    </form>
                  ) : (
                    <form action={actOpenDoor}>
                      <Button variant="primary" size="lg" fullWidth icon={DoorOpen} iconPosition="left">
                        Apri porta
                      </Button>
                    </form>
                  )}
                  <form action={actOpenGate}>
                    <Button variant="secondary" size="lg" fullWidth icon={Fence} iconPosition="left">
                      Apri portone
                    </Button>
                  </form>
                </div>
              </CardBody>
            </Card>

            {/* Quick Info */}
            <Card>
              <CardBody>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)]">
                    <div className="flex items-center gap-2 mb-2">
                      <Wifi className="w-4 h-4 text-[var(--text-secondary)]" />
                      <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Wi-Fi</div>
                    </div>
                    <div className="font-semibold text-[var(--text-primary)]">{state.apt.wifiSsid}</div>
                    <div className="text-xs text-[var(--text-secondary)] mt-1">Password: {state.apt.wifiPass}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)]">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-[var(--text-secondary)]" />
                      <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Orari</div>
                    </div>
                    <div className="text-sm text-[var(--text-primary)]">
                      <div>Check-in: <span className="font-semibold">{state.apt.checkIn}</span></div>
                      <div className="mt-1">Check-out: <span className="font-semibold">{state.apt.checkOut}</span></div>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Right Column - Activity */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[var(--text-primary)]" />
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">Attività recente</h2>
                </div>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  {events.length === 0 ? (
                    <div className="text-sm text-[var(--text-secondary)] py-8 text-center">
                      Nessuna attività recente
                    </div>
                  ) : (
                    events.map((e) => (
                      <div key={e.id} className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)]">
                        <div className="text-xs text-[var(--text-tertiary)] mb-1">{fmtDT(e.ts)}</div>
                        <div className="text-sm font-medium text-[var(--text-primary)]">{e.label}</div>
                      </div>
                    ))
                  )}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
