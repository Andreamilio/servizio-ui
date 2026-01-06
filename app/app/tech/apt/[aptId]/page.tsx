import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { readSession, validateSessionUser } from "@/app/lib/session";

import {
  closeDoor,
  getApt,
  openDoor,
  openGate,
  revokeAccess,
  toggleVpn,
  toggleWan,
} from "@/app/lib/techstore";

import * as Store from "@/app/lib/store";
import { events_listByApt, events_log } from "@/app/lib/domain/eventsDomain";
import { getAllEnabledDevices, getDeviceState } from "@/app/lib/devicePackageStore";
import { getUser } from "@/app/lib/userStore";
import { AppLayout } from "@/app/components/layouts/AppLayout";

export const dynamic = "force-dynamic";

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider opacity-60">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

export default async function TechAptPage({
  params,
}: {
  params: { aptId: string } | Promise<{ aptId: string }>;
}) {
  const cookieStore = await cookies();
  const sess = cookieStore.get("sess")?.value;
  const session = readSession(sess);
  const me = validateSessionUser(session);

  if (!me || me.role !== "tech") {
    // Se la sessione era valida ma l'utente è disabilitato, fai logout
    if (session && session.userId && session.role === "tech") {
      redirect("/api/auth/logout");
    }
    return <div className="p-6 text-[var(--text-primary)]">Non autorizzato</div>;
  }

  const p = await Promise.resolve(params);
  const aptId = String(p?.aptId ?? "");

  const techUser = me.userId ? getUser(me.userId) : null;

  if (!aptId) {
    return (
      <AppLayout 
        role="tech"
        userInfo={techUser ? {
          userId: techUser.userId,
          username: techUser.username,
          profileImageUrl: techUser.profileImageUrl,
        } : undefined}
      >
        <div className="p-4 lg:p-6">
          <Link className="text-sm opacity-70 hover:opacity-100" href="/app/tech">
            ← Back
          </Link>
          <div className="mt-3 text-lg font-semibold">AptId mancante (routing)</div>
          <div className="text-sm opacity-60">
            La route non sta passando correttamente il parametro: prova ad aprire
            <span className="font-semibold"> /app/tech/apt/101</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  const apt = getApt(aptId);

  // ✅ LOG: single source of truth (store.ts via eventsDomain)
  const aptLog = events_listByApt(Store, aptId, 20);
  

  // Device Package stats
  const enabledDevices = getAllEnabledDevices(aptId);
  const deviceOnlineCount = enabledDevices.filter((dt) => getDeviceState(aptId, dt) === "online").length;

  if (!apt) {
    return (
      <AppLayout 
        role="tech"
        userInfo={techUser ? {
          userId: techUser.userId,
          username: techUser.username,
          profileImageUrl: techUser.profileImageUrl,
        } : undefined}
      >
        <div className="p-4 lg:p-6">
          <Link className="text-sm opacity-70 hover:opacity-100" href="/app/tech">
            ← Back
          </Link>
          <div className="mt-3 text-lg font-semibold">Appartamento non trovato</div>
          <div className="text-sm opacity-60">AptId: {aptId}</div>
        </div>
      </AppLayout>
    );
  }

  async function actOpenDoor() {
    "use server";
    openDoor(aptId);

    events_log(Store, {
      aptId,
      type: "door_opened",
      actor: "tech",
      label: "Porta aperta (azione Tech)",
    });

    revalidatePath("/app/tech");
    revalidatePath(`/app/tech/apt/${aptId}`);
    redirect(`/app/tech/apt/${aptId}?r=${Date.now()}`);
  }

  async function actCloseDoor() {
    "use server";
    closeDoor(aptId);

    events_log(Store, {
      aptId,
      type: "door_closed",
      actor: "tech",
      label: "Porta chiusa (azione Tech)",
    });

    revalidatePath("/app/tech");
    revalidatePath(`/app/tech/apt/${aptId}`);
    redirect(`/app/tech/apt/${aptId}?r=${Date.now()}`);
  }

  async function actOpenGate() {
    "use server";
    openGate(aptId);

    events_log(Store, {
      aptId,
      type: "gate_opened",
      actor: "tech",
      label: "Portone aperto (azione Tech)",
    });

    revalidatePath("/app/tech");
    revalidatePath(`/app/tech/apt/${aptId}`);
    redirect(`/app/tech/apt/${aptId}?r=${Date.now()}`);
  }


  async function actRevoke() {
    "use server";

    // ✅ revoke reale PIN nello store centrale
    Store.revokePinsByApt(aptId);

    // (manteniamo anche il mock techstore, così la UI “Tech monitoring” resta coerente)
    revokeAccess(aptId);

    events_log(Store, {
      aptId,
      type: "pin_revoked",
      actor: "tech",
      label: "Revocati accessi (azione Tech)",
    });

    revalidatePath("/app/tech");
    revalidatePath(`/app/tech/apt/${aptId}`);
    redirect(`/app/tech/apt/${aptId}?r=${Date.now()}`);
  }

  async function actWan() {
    "use server";
    const apt = toggleWan(aptId);
    
    if (apt) {
      events_log(Store, {
        aptId,
        type: "wan_switched",
        actor: "tech",
        label: `WAN switched to ${apt.network === "main" ? "MAIN WAN" : "BACKUP WAN"}`,
      });
    }

    revalidatePath("/app/tech");
    revalidatePath(`/app/tech/apt/${aptId}`);
    redirect(`/app/tech/apt/${aptId}?r=${Date.now()}`);
  }

  async function actVpn() {
    "use server";
    const apt = toggleVpn(aptId);
    
    if (apt) {
      events_log(Store, {
        aptId,
        type: "vpn_toggled",
        actor: "tech",
        label: `VPN toggled ${apt.vpn.toUpperCase()}`,
      });
    }

    revalidatePath("/app/tech");
    revalidatePath(`/app/tech/apt/${aptId}`);
    redirect(`/app/tech/apt/${aptId}?r=${Date.now()}`);
  }


  return (
    <AppLayout 
      role="tech"
      userInfo={techUser ? {
        userId: techUser.userId,
        username: techUser.username,
        profileImageUrl: techUser.profileImageUrl,
      } : undefined}
    >
      <div className="p-4 lg:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="lg:hidden rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs opacity-60">TECH</div>
              <div className="text-sm font-semibold truncate">{apt.aptName}</div>
              <div className="text-xs opacity-60 truncate">{apt.group}</div>
            </div>
            <Link className="text-sm opacity-70 hover:opacity-100" href="/app/tech">
              ← Back
            </Link>
          </div>
        </div>

        <Link className="hidden lg:inline-block text-sm opacity-70 hover:opacity-100" href="/app/tech">
          ← Torna a Tech
        </Link>

        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] p-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">{apt.aptName}</div>
              <div className="text-sm opacity-70">{apt.group}</div>
            </div>

            <div className="text-left sm:text-right text-sm">
              <div className="opacity-60">Last access</div>
              <div className="font-semibold">{apt.lastAccessLabel}</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] p-3">
              <div className="opacity-60 text-xs">WAN</div>
              <div className="font-semibold">{apt.network === "main" ? "MAIN WAN" : "BACKUP WAN"}</div>
            </div>
            <div className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] p-3">
              <div className="opacity-60 text-xs">VPN</div>
              <div className="font-semibold">{apt.vpn.toUpperCase()}</div>
            </div>
            <div className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] p-3">
              <div className="opacity-60 text-xs">DOOR</div>
              <div className="font-semibold">{apt.door.toUpperCase()}</div>
            </div>

            {apt.door === "unknown" && (
              <div className="col-span-full mt-3 rounded-xl bg-amber-500/10 border border-amber-400/20 p-3">
                <div className="flex items-start gap-2">
                  <span className="text-amber-700">⚠️</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-amber-900">Stato porta sconosciuto</div>
                    <div className="text-xs text-gray-900 mt-1">
                      Non ci sono eventi nel log per questo appartamento. Lo stato della porta verrà aggiornato quando ci sono eventi di apertura/chiusura.
                    </div>
                  </div>
                </div>
              </div>
            )}


            <Link
              href={`/app/tech/apt/${aptId}/devices`}
              className="rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border-2 border-cyan-400/40 p-3 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <div className="text-xs font-semibold text-[var(--text-primary)]">DEVICES</div>
              <div className="font-semibold text-sm mt-1 text-[var(--text-primary)]">
                {enabledDevices.length === 0
                  ? "Nessun device"
                  : `${enabledDevices.length} device, ${deviceOnlineCount} online`}
              </div>
            </Link>
            <Link
              href={`/app/tech/apt/${aptId}/settings`}
              className="rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border-2 border-cyan-400/40 p-3 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <div className="text-xs font-semibold text-[var(--text-primary)]">TECHNICAL SETTINGS</div>
              <div className="font-semibold text-sm mt-1 text-[var(--text-primary)]">Configura API</div>
            </Link>
          </div>
        </div>

        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] p-4">
          <div className="text-sm opacity-70 mb-4">Azioni rapide</div>

          <div className="space-y-4">
            {/* Azioni principali: Porta e Portone */}
            <div className="grid grid-cols-2 gap-3">
              {apt.door === "unlocked" ? (
                <>
                  <form action={actCloseDoor}>
                    <button className="w-full rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-light)] px-4 py-2 font-semibold text-sm">
                      Chiudi porta
                    </button>
                  </form>
                  <form action={actOpenDoor}>
                    <button className="w-full rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 px-4 py-2 font-semibold text-sm">
                      Apri porta
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <form action={actOpenDoor}>
                    <button className="w-full rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 px-4 py-2 font-semibold text-sm">
                      Apri porta
                    </button>
                  </form>
                  <form action={actCloseDoor}>
                    <button className="w-full rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-light)] px-4 py-2 font-semibold text-sm">
                      Chiudi porta
                    </button>
                  </form>
                </>
              )}
            </div>

            <form action={actOpenGate}>
              <button className="w-full rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 px-4 py-2 font-semibold text-sm">
                Apri portone
              </button>
            </form>

            {/* Azioni secondarie */}
            <div className="pt-2 border-t border-[var(--border-light)]">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <form action={actRevoke}>
                  <button className="w-full rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 px-4 py-2 font-semibold text-sm">
                    Revoca accessi
                  </button>
                </form>

                <form action={actWan}>
                  <button className="w-full rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-light)] px-4 py-2 font-semibold text-sm">
                    Switch WAN
                  </button>
                </form>

                <form action={actVpn}>
                  <button className="w-full rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-light)] px-4 py-2 font-semibold text-sm">
                    Toggle VPN
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] overflow-hidden">
          <div className="p-4 border-b border-[var(--border-light)]">
            <div className="text-sm font-semibold">LOG — {apt.aptName}</div>
          </div>

          <div className="p-4 space-y-2">
            {aptLog.length === 0 ? (
              <div className="text-sm opacity-60">Nessun evento.</div>
            ) : (
              aptLog.map((e) => (
                <div key={e.id} className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-xs opacity-60">
                      {new Date(e.ts).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <div className="text-[10px] opacity-50">Apt {aptId}</div>
                  </div>
                  <div className="mt-1 text-sm font-semibold leading-snug">{e.label}</div>
                  <div className="mt-1 text-xs opacity-70 leading-snug">
                    {e.type} • {e.actor}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="text-xs opacity-60">
          Nota: store in memoria (dev). Ogni azione forza refresh via redirect.
        </div>
      </div>
      </div>
    </AppLayout>
  );
}