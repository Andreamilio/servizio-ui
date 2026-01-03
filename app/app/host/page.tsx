import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { readSession } from "@/app/lib/session";
import * as Store from "@/app/lib/store";
import { listJobsByApt } from "@/app/lib/cleaningstore";
import { listClients, listApartmentsByClient } from "@/app/lib/clientStore";

import {
  cleaners_getCfg,
  cleaners_setDuration,
  cleaners_add,
  cleaners_remove,
  cleaners_normName,
} from "@/app/lib/domain/cleanersDomain";

import { stays_get, stays_listByApt } from "@/app/lib/domain/staysDomain";

import {
  pins_listByStay,
  pins_revoke,
  pins_createSingleGuestPin,
  pins_createGuestPinsForStay,
  stays_createWithOptionalCleaner,
  pins_deleteStayAndPins,
} from "@/app/lib/domain/pinsDomain";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SP = Record<string, string | string[] | undefined>;

function pick(sp: SP, key: string) {
  const v = sp[key];
  return typeof v === "string" ? v : Array.isArray(v) ? v[0] : undefined;
}

function timeLeftDHM(ts: number) {
  const ms = Math.max(0, ts - Date.now());
  const totalMin = Math.floor(ms / 60000);
  const d = Math.floor(totalMin / (60 * 24));
  const h = Math.floor((totalMin % (60 * 24)) / 60);
  const m = totalMin % 60;

  if (d > 0) return `${d}g ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function parseDateTimeLocal(v?: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toDTLocalValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function fmtDT(ts?: number | null) {
  if (!ts) return "—";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function getDoorUi(aptId: string): { label: string; tone: "open" | "closed" | "unknown" } {
  const log = Store.listAccessLogByApt(aptId, 50) ?? [];
  const last = log.find((e: any) => e?.type === "door_opened" || e?.type === "door_closed");
  if (!last) return { label: "—", tone: "unknown" };
  if (last.type === "door_opened") return { label: "SBLOCCATA", tone: "open" };
  return { label: "CHIUSA", tone: "closed" };
}

type AptHealth = {
  aptId: string;
  name: string;
  status: "ok" | "warn" | "crit";
  readiness: "Pronto check-in ✅" | "Da pulire" | "Pulizia in corso" | "Problema";
  lastEvent: string;
};

function computeHealth(aptId: string, name: string): AptHealth {
  const jobs = listJobsByApt(aptId);
  const hasProblem = jobs.some((j) => j.status === "problem");
  const hasInProgress = jobs.some((j) => j.status === "in_progress");
  const hasTodo = jobs.some((j) => j.status === "todo");

  const readiness = hasProblem
    ? "Problema"
    : hasInProgress
    ? "Pulizia in corso"
    : hasTodo
    ? "Da pulire"
    : "Pronto check-in ✅";

  const status: AptHealth["status"] = hasProblem
    ? "crit"
    : hasInProgress
    ? "warn"
    : "ok";

  const lastEvent = hasProblem
    ? "Pulizia segnalata come problema"
    : hasInProgress
    ? "Pulizia avviata"
    : hasTodo
    ? "In attesa pulizie"
    : "Operativo";

  return { aptId, name, status, readiness, lastEvent };
}

export default async function HostPage({
  searchParams,
}: {
  searchParams?: SP | Promise<SP>;
}) {
  const sp = ((await Promise.resolve(searchParams as any)) ?? {}) as SP;
  const q = (pick(sp, "q") ?? "").trim().toLowerCase();
  const aptSelected = pick(sp, "apt");
  const staySelected = pick(sp, "stay");

  const cookieStore = await cookies();
  const sess = cookieStore.get("sess")?.value;
  const me = readSession(sess);

  if (!me || me.role !== "host") {
    return <div className="p-6 text-white">Non autorizzato</div>;
  }

  const clients = (listClients() as any[]) ?? [];
  const getClientId = (c: any) =>
    String(c?.id ?? c?.clientId ?? c?.clientID ?? c?.slug ?? "");
  const wantedClientId = (pick(sp, "client") ?? getClientId(clients[0]) ?? "").trim();
  const client =
    clients.find((c) => getClientId(c) === wantedClientId) ?? (clients[0] ?? null);

  const clientId = client ? getClientId(client) : "";
  const apartments = clientId
    ? (listApartmentsByClient(clientId) as any[]).map((a) => ({
        aptId: String(a?.aptId ?? a?.id ?? a?.apt ?? ""),
        name: String(
          a?.aptName ?? a?.name ?? a?.title ?? `Apt ${a?.aptId ?? a?.id ?? ""}`
        ),
      }))
    : [{ aptId: me.aptId, name: `Apt ${me.aptId} — Principale` }];

  const orgLabel = "Global Properties";

  const healthAll = apartments.map((a) => computeHealth(a.aptId, a.name));
  const healthFiltered = q
    ? healthAll.filter(
        (a) =>
          a.aptId.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)
      )
    : healthAll;

  const total = healthAll.length;
  const ok = healthAll.filter((a) => a.status === "ok").length;
  const warn = healthAll.filter((a) => a.status === "warn").length;
  const crit = healthAll.filter((a) => a.status === "crit").length;

  const criticalFirst = healthAll.filter((a) => a.status === "crit").slice(0, 5);

  // Stay source of truth
  const stayObj = staySelected ? stays_get(staySelected) : null;

  const stayCheckinDT = stayObj?.checkInAt ? new Date(stayObj.checkInAt) : null;
  const stayCheckoutDT = stayObj?.checkOutAt ? new Date(stayObj.checkOutAt) : null;

  const stayGuestsCount = Math.max(1, Math.min(10, stayObj?.guests?.length ?? 2));
  const stayCheckin = stayCheckinDT ? toDTLocalValue(stayCheckinDT) : "";
  const stayCheckout = stayCheckoutDT ? toDTLocalValue(stayCheckoutDT) : "";

  async function genPin(formData: FormData) {
    "use server";

    const aptId = formData.get("aptId")?.toString() ?? "";
    if (!aptId) return;

    const stayId = (formData.get("stayId")?.toString() ?? "").trim();
    const guestName = (formData.get("guestName")?.toString() ?? "").trim();

    const checkin = (formData.get("checkin")?.toString() ?? "").trim();
    const checkout = (formData.get("checkout")?.toString() ?? "").trim();

    const ci = parseDateTimeLocal(checkin);
    const co = parseDateTimeLocal(checkout);

    const now = Date.now();
    const vf = ci?.getTime() ?? now;
    const vt = co?.getTime() ?? now + 2 * 60 * 60 * 1000;

    pins_createSingleGuestPin(Store, {
      aptId,
      stayId,
      guestName,
      validFrom: vf,
      validTo: vt,
    });

    redirect(
      `/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}` +
        (stayId ? `&stay=${encodeURIComponent(stayId)}` : "")
    );
  }

  async function genPins(formData: FormData) {
    "use server";

    const aptId = formData.get("aptId")?.toString() ?? "";
    if (!aptId) return;

    const stayIdIn = (formData.get("stayId")?.toString() ?? "").trim();
    const checkin = (formData.get("checkin")?.toString() ?? "").trim();
    const checkout = (formData.get("checkout")?.toString() ?? "").trim();
    const guestsStr = (formData.get("guests")?.toString() ?? "2").trim();
    const guestsCount = Math.max(1, Math.min(10, Number(guestsStr) || 2));

    const ci = parseDateTimeLocal(checkin);
    const co = parseDateTimeLocal(checkout);

    const now = Date.now();
    const vf = ci?.getTime() ?? now;
    const vt = co?.getTime() ?? now + 2 * 60 * 60 * 1000;

    const guestNames = Array.from({ length: guestsCount }).map((_, i) => {
      const n = (formData.get(`guestName_${i + 1}`)?.toString() ?? "").trim();
      return n.length ? n : `Ospite ${i + 1}`;
    });

    let st: any = stayIdIn ? stays_get(stayIdIn) : null;
    if (!st) {
      st = stays_createWithOptionalCleaner(Store, {
        aptId,
        checkInAt: vf,
        checkOutAt: vt,
        guestsCount,
      });
    }

    const stayId = String(st?.stayId ?? stayIdIn).trim();

    pins_createGuestPinsForStay(Store, {
      aptId,
      stayId,
      validFrom: vf,
      validTo: vt,
      guestNames,
      source: "manual",
    });

    redirect(
      `/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(
        aptId
      )}&stay=${encodeURIComponent(stayId)}`
    );
  }

  async function delPin(formData: FormData) {
    "use server";
    const pin = formData.get("pin")?.toString() ?? "";
    const aptId = formData.get("aptId")?.toString() ?? "";
    if (!pin) return;

    pins_revoke(Store, pin);

    redirect(
      aptId
        ? `/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}` +
            (staySelected ? `&stay=${encodeURIComponent(staySelected)}` : "")
        : clientId
        ? `/app/host?client=${encodeURIComponent(clientId)}`
        : "/app/host"
    );
  }

  async function createStay(formData: FormData) {
    "use server";
    const aptId = formData.get("aptId")?.toString() ?? "";
    if (!aptId) return;

    const checkin = (formData.get("checkin")?.toString() ?? "").trim();
    const checkout = (formData.get("checkout")?.toString() ?? "").trim();
    const guests = Math.max(
      1,
      Math.min(10, Number(formData.get("guests")?.toString() ?? "2") || 2)
    );

    const selectedCleaner = cleaners_normName(
      formData.get("cleaner")?.toString() ?? ""
    );

    const ci = parseDateTimeLocal(checkin);
    const co = parseDateTimeLocal(checkout);

    if (!ci || !co || co.getTime() <= ci.getTime()) {
      redirect(
        `/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`
      );
    }

    const vf = ci.getTime();
    const vt = co.getTime();

    const st = stays_createWithOptionalCleaner(Store, {
      aptId,
      checkInAt: vf,
      checkOutAt: vt,
      guestsCount: guests,
      cleanerName: selectedCleaner,
    });

    redirect(
      `/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(
        aptId
      )}&stay=${encodeURIComponent(st.stayId)}`
    );
  }

  async function delStay(formData: FormData) {
    "use server";

    const aptId = (formData.get("aptId")?.toString() ?? "").trim();
    const stayId = (formData.get("stayId")?.toString() ?? "").trim();
    if (!aptId || !stayId) return;

    pins_deleteStayAndPins(Store, stayId);

    redirect(
      `/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`
    );
  }

  // -------------------------
  // Apartment detail
  // -------------------------
  if (aptSelected) {
    const aptId = String(aptSelected);
    const apt = apartments.find((x) => x.aptId === aptId);
    const health = apt ? computeHealth(aptId, apt.name) : null;

    const stays = stays_listByApt(aptId) ?? [];
    const pins = staySelected ? pins_listByStay(Store, staySelected) : [];

    const jobs = listJobsByApt(aptId);

    const doorUi = getDoorUi(aptId);
    const accessEvents = Store.listAccessLogByApt(aptId, 20) ?? [];

    async function actOpenDoor() {
      "use server";
      Store.logAccessEvent(aptId, "door_opened", "[host] Porta sbloccata");
      redirect(
        `/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}` +
          (staySelected ? `&stay=${encodeURIComponent(staySelected)}` : "")
      );
    }

    async function actCloseDoor() {
      "use server";
      Store.logAccessEvent(aptId, "door_closed", "[host] Porta chiusa");
      redirect(
        `/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}` +
          (staySelected ? `&stay=${encodeURIComponent(staySelected)}` : "")
      );
    }

    return (
      <main className="min-h-screen bg-[#0a0d12] text-white p-6">
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs opacity-60">Host • Dettaglio appartamento</div>
              <h1 className="text-lg font-semibold">
                {apt?.name ?? (aptId ? `Apt ${aptId}` : "Apt")}
              </h1>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
              <Link
                className="whitespace-nowrap text-sm opacity-70 hover:opacity-100"
                href={clientId ? `/app/host?client=${encodeURIComponent(clientId)}` : "/app/host"}
              >
                ← Dashboard
              </Link>

              {staySelected && (
                <>
                  <Link
                    className="whitespace-nowrap text-sm opacity-70 hover:opacity-100"
                    href={`/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`}
                  >
                    Reset stay
                  </Link>

                  <form action={delStay}>
                    <input type="hidden" name="aptId" value={aptId} />
                    <input type="hidden" name="stayId" value={staySelected} />
                    <button
                      type="submit"
                      className="whitespace-nowrap text-sm text-red-200/90 hover:text-red-100 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-1.5"
                    >
                      Elimina prenotazione
                    </button>
                  </form>
                </>
              )}

              <form action="/api/auth/logout" method="post">
                <button className="whitespace-nowrap text-sm opacity-70 hover:opacity-100">
                  Esci
                </button>
              </form>
            </div>
          </div>

          <section className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm opacity-70">Stato operativo</div>
                <div className="mt-1 font-semibold">{health?.readiness ?? "—"}</div>

                <div className="mt-2 text-sm opacity-70">Porta</div>
                <div
                  className={`mt-1 inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                    doorUi.tone === "open"
                      ? "bg-emerald-500/10 border-emerald-400/20 text-emerald-200"
                      : doorUi.tone === "closed"
                      ? "bg-white/5 border-white/10 text-white/80"
                      : "bg-yellow-500/10 border-yellow-400/20 text-yellow-200"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      doorUi.tone === "open"
                        ? "bg-emerald-400"
                        : doorUi.tone === "closed"
                        ? "bg-white/40"
                        : "bg-yellow-400"
                    }`}
                  />
                  {doorUi.label}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm opacity-70">Ultimo evento</div>
                <div className="mt-1 text-sm opacity-90">{health?.lastEvent ?? "—"}</div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <form action={actOpenDoor}>
                <button
                  type="submit"
                  className="rounded-xl bg-cyan-500/25 hover:bg-cyan-500/35 border border-cyan-400/30 px-4 py-2 text-sm font-semibold"
                >
                  Apri porta
                </button>
              </form>

              <form action={actCloseDoor}>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 px-4 py-2 text-sm font-semibold"
                >
                  Chiudi porta
                </button>
              </form>

              <button className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm opacity-90">
                Supporto
              </button>
            </div>
          </section>
          <section className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="text-sm opacity-70">Attività recente (Access log)</div>
              <div className="text-xs opacity-50">Ultimi 20 eventi</div>
            </div>

            {accessEvents.length === 0 ? (
              <div className="text-sm opacity-60">Nessun evento registrato.</div>
            ) : (
              <div className="space-y-2">
                {accessEvents.map((e: any) => (
                  <div
                    key={String(e.id)}
                    className="rounded-xl bg-black/30 border border-white/10 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs opacity-60">{fmtDT(e.ts)}</div>
                      <div className="text-[11px] opacity-60 font-mono">{e.type}</div>
                    </div>
                    <div className="mt-1 text-sm font-semibold">{e.label}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Cleaner config ONLY when no stay selected */}
          {!staySelected && (
            <section className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <div>
                <div className="text-sm font-semibold">Cleaner (per appartamento)</div>
                <div className="mt-1 text-xs opacity-60">
                  Configura durata standard pulizia e censisci i cleaner per questo appartamento.
                </div>
              </div>

              {(() => {
                const cfg = cleaners_getCfg(aptId);
                return (
                  <div className="mt-4 space-y-4">
                    <form
                      action={async (fd: FormData) => {
                        "use server";
                        const aptId = (fd.get("aptId")?.toString() ?? "").trim();
                        if (!aptId) return;
                        const durationMin = Math.max(
                          15,
                          Math.min(24 * 60, Number(fd.get("durationMin")?.toString() ?? "60") || 60)
                        );
                        cleaners_setDuration(aptId, durationMin);
                        redirect(
                          `/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`
                        );
                      }}
                      className="space-y-2"
                    >
                      <input type="hidden" name="aptId" value={aptId} />
                      <div className="text-[11px] opacity-60">Durata pulizia default</div>
                      <div className="flex gap-2">
                        <select
                          name="durationMin"
                          defaultValue={String(cfg.durationMin)}
                          className="flex-1 rounded-xl bg-black/40 border border-white/10 p-2"
                        >
                          {[30, 45, 60, 90, 120, 180, 240].map((m) => (
                            <option key={m} value={String(m)}>
                              {m} min
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="rounded-xl bg-white/10 border border-white/15 px-4 text-sm font-semibold"
                        >
                          Salva
                        </button>
                      </div>
                    </form>

                    <form
                      action={async (fd: FormData) => {
                        "use server";
                        const aptId = (fd.get("aptId")?.toString() ?? "").trim();
                        const name = fd.get("cleanerName")?.toString() ?? "";
                        if (!aptId) return;
                        cleaners_add(aptId, name);
                        redirect(
                          `/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`
                        );
                      }}
                      className="space-y-2"
                    >
                      <input type="hidden" name="aptId" value={aptId} />
                      <div className="text-[11px] opacity-60">Aggiungi cleaner</div>
                      <div className="flex gap-2">
                        <input
                          name="cleanerName"
                          placeholder="Es. Mario Rossi"
                          className="flex-1 rounded-xl bg-black/40 border border-white/10 p-2"
                        />
                        <button
                          type="submit"
                          className="rounded-xl bg-cyan-500/30 border border-cyan-400/30 px-4 text-sm font-semibold"
                        >
                          Aggiungi
                        </button>
                      </div>
                    </form>

                    <div>
                      <div className="text-[11px] opacity-60 mb-2">Cleaner censiti</div>
                      {cfg.cleaners.length === 0 ? (
                        <div className="text-sm opacity-50">Nessun cleaner censito.</div>
                      ) : (
                        <div className="space-y-2">
                          {cfg.cleaners.map((nm) => (
                            <div
                              key={nm}
                              className="flex items-center justify-between rounded-xl bg-black/30 border border-white/10 p-3"
                            >
                              <div className="text-sm font-semibold">{nm}</div>
                              <form
                                action={async (fd: FormData) => {
                                  "use server";
                                  const aptId = (fd.get("aptId")?.toString() ?? "").trim();
                                  const name = fd.get("name")?.toString() ?? "";
                                  if (!aptId) return;
                                  cleaners_remove(aptId, name);
                                  redirect(
                                    `/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`
                                  );
                                }}
                              >
                                <input type="hidden" name="aptId" value={aptId} />
                                <input type="hidden" name="name" value={nm} />
                                <button
                                  type="submit"
                                  className="text-xs px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30"
                                >
                                  Rimuovi
                                </button>
                              </form>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </section>
          )}

          {/* STAY + accessi */}
          <section className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="text-sm opacity-70">Soggiorno & accessi</div>
              {staySelected ? (
                <div className="text-xs opacity-60 space-y-1">
                  <div>
                    Stay: <span className="font-mono">{staySelected}</span>
                    <span className="opacity-70"> • {stayGuestsCount} ospiti</span>
                  </div>
                  <div className="opacity-70">
                    {stayCheckinDT ? `Check-in: ${fmtDT(stayCheckinDT.getTime())}` : "Check-in: —"}
                    {"  "}•{"  "}
                    {stayCheckoutDT ? `Check-out: ${fmtDT(stayCheckoutDT.getTime())}` : "Check-out: —"}
                  </div>
                </div>
              ) : (
                <div className="text-xs opacity-60">Nessun soggiorno selezionato</div>
              )}
            </div>

            {!staySelected ? (
              <div className="rounded-xl bg-black/20 border border-white/10 p-4">
                <div className="text-sm font-semibold">Crea soggiorno</div>
                <div className="mt-1 text-xs opacity-60">
                  Prima crei uno stay, poi generi i PIN collegati agli ospiti.
                </div>

                <form action={createStay} className="mt-4 space-y-3">
                  <input type="hidden" name="aptId" value={aptId} />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-[11px] opacity-60 mb-1">Check-in (data + ora)</div>
                      <input
                        type="datetime-local"
                        name="checkin"
                        className="w-full rounded-xl bg-black/40 border border-white/10 p-2"
                      />
                    </div>

                    <div>
                      <div className="text-[11px] opacity-60 mb-1">Check-out (data + ora)</div>
                      <input
                        type="datetime-local"
                        name="checkout"
                        className="w-full rounded-xl bg-black/40 border border-white/10 p-2"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] opacity-60 mb-1">Numero ospiti</div>
                    <select
                      name="guests"
                      defaultValue="2"
                      className="w-full rounded-xl bg-black/40 border border-white/10 p-2"
                    >
                      {Array.from({ length: 10 }).map((_, i) => (
                        <option key={i + 1} value={String(i + 1)}>
                          {i + 1}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="text-[11px] opacity-60 mb-1">Cleaner (seleziona)</div>
                    {(() => {
                      const cfg = cleaners_getCfg(aptId);
                      return (
                        <select
                          name="cleaner"
                          defaultValue={""}
                          className="w-full rounded-xl bg-black/40 border border-white/10 p-2"
                        >
                          <option value="">— Nessuno / da assegnare —</option>
                          {cfg.cleaners.map((nm) => (
                            <option key={nm} value={nm}>
                              {nm}
                            </option>
                          ))}
                        </select>
                      );
                    })()}
                    <div className="mt-1 text-[11px] opacity-50">
                      Se selezioni un cleaner, il PIN viene creato automaticamente (check-out → check-out + durata pulizia).
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-cyan-500/30 border border-cyan-400/30 p-2 font-semibold"
                  >
                    Crea soggiorno
                  </button>
                </form>
              </div>
            ) : (
              <>
                <div className="text-xs opacity-50 mb-3">
                  La validità del PIN segue lo stay (check-in → check-out).
                </div>

                {stayGuestsCount > 1 ? (
                  <div className="rounded-xl bg-black/20 border border-white/10 p-4">
                    <div className="text-sm font-semibold">PIN per ospiti (1 per persona)</div>
                    <div className="mt-1 text-xs opacity-60">
                      Inserisci i nomi e crea i PIN in un colpo solo.
                    </div>

                    <form action={genPins} className="mt-4 space-y-3">
                      <input type="hidden" name="aptId" value={aptId} />
                      <input type="hidden" name="stayId" value={staySelected} />
                      <input type="hidden" name="checkin" value={stayCheckin ?? ""} />
                      <input type="hidden" name="checkout" value={stayCheckout ?? ""} />
                      <input type="hidden" name="guests" value={String(stayGuestsCount)} />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {Array.from({ length: stayGuestsCount }).map((_, i) => (
                          <input
                            key={i}
                            name={`guestName_${i + 1}`}
                            placeholder={`Ospite ${i + 1} (nome/cognome)`}
                            className="rounded-xl bg-black/40 border border-white/10 p-2"
                          />
                        ))}
                      </div>

                      <button
                        type="submit"
                        className="w-full rounded-xl bg-cyan-500/30 border border-cyan-400/30 p-2 font-semibold"
                      >
                        Crea PIN per ospiti
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="rounded-xl bg-black/20 border border-white/10 p-4">
                    <div className="text-sm font-semibold">Crea PIN ospite</div>

                    <form action={genPin} className="mt-4 space-y-3">
                      <input type="hidden" name="aptId" value={aptId} />
                      <input type="hidden" name="stayId" value={staySelected} />
                      <input type="hidden" name="checkin" value={stayCheckin ?? ""} />
                      <input type="hidden" name="checkout" value={stayCheckout ?? ""} />

                      <input
                        name="guestName"
                        placeholder="Ospite (nome/cognome)"
                        className="w-full rounded-xl bg-black/40 border border-white/10 p-2"
                      />

                      <button
                        type="submit"
                        className="w-full rounded-xl bg-cyan-500/30 border border-cyan-400/30 p-2 font-semibold"
                      >
                        Crea PIN ospite
                      </button>
                    </form>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Stay selector + pins */}
          <section className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="text-sm opacity-70 mb-3">Stay & PIN</div>

            {!staySelected && (
              <div className="rounded-xl bg-black/20 border border-white/10 p-3">
                <div className="text-[11px] opacity-60 mb-2">Seleziona stay</div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 w-full">
                  <form
                    action="/app/host"
                    method="get"
                    className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 w-full"
                  >
                    <input type="hidden" name="client" value={clientId} />
                    <input type="hidden" name="apt" value={aptId} />

                    <select
                      name="stay"
                      defaultValue={""}
                      className="w-full sm:flex-1 rounded-xl bg-black/40 border border-white/10 p-2"
                    >
                      <option value="">— Seleziona —</option>
                      {stays.map((st: any) => {
                        const sid = String(st?.stayId ?? "");
                        const g = Array.isArray(st?.guests) ? st.guests.length : 0;
                        const label =
                          `${sid.slice(0, 12)}…` +
                          (st?.checkInAt && st?.checkOutAt
                            ? ` • ${fmtDT(st.checkInAt)} → ${fmtDT(st.checkOutAt)}`
                            : "") +
                          (g ? ` • ${g} ospiti` : "");
                        return (
                          <option key={sid} value={sid}>
                            {label}
                          </option>
                        );
                      })}
                    </select>

                    <button
                      type="submit"
                      className="w-full sm:w-auto whitespace-nowrap rounded-xl bg-white/10 border border-white/15 px-4 py-2 text-sm font-semibold"
                    >
                      Apri
                    </button>
                  </form>
                </div>

                <div className="mt-2 text-[11px] opacity-50">
                  Nota: i PIN vengono mostrati solo per lo stay selezionato.
                </div>
              </div>
            )}

            {!staySelected ? (
              <div className="mt-4 text-sm opacity-50">
                Seleziona uno stay dal menu sopra per vedere i PIN relativi.
              </div>
            ) : pins.length === 0 ? (
              <div className="mt-4 text-sm opacity-50">Nessun PIN attivo per questo stay.</div>
            ) : (
              <div className="mt-4 space-y-2">
                {pins.map((p: any) => {
                  const vFrom = p.validFrom ?? p.createdAt;
                  const vTo = p.validTo ?? p.expiresAt;

                  return (
                    <details
                      key={p.pin}
                      className="rounded-xl bg-black/30 border border-white/10 px-3 py-2"
                    >
                      <summary className="cursor-pointer list-none flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold tracking-widest truncate">{p.pin}</div>
                          <div className="text-[11px] opacity-60 truncate">
                            {p.role} • {p.source ?? "manual"}
                            {p.guestName ? ` • ${p.guestName}` : ""}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[11px] opacity-60">Scade tra</div>
                          <div className="text-xs font-semibold">{timeLeftDHM(vTo ?? 0)}</div>
                        </div>
                      </summary>

                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="text-xs opacity-80 space-y-1">
                          <div>
                            <span className="opacity-60">Validità:</span> {fmtDT(vFrom)} → {fmtDT(vTo)}
                          </div>
                          <div>
                            <span className="opacity-60">Nome:</span> {p.guestName ?? "—"}
                          </div>
                          <div>
                            <span className="opacity-60">Stay:</span> {p.stayId ?? "—"}
                          </div>
                        </div>

                        <div className="flex items-end justify-end">
                          <form action={delPin}>
                            <input type="hidden" name="aptId" value={aptId} />
                            <input type="hidden" name="pin" value={p.pin} />
                            <button
                              type="submit"
                              className="text-xs px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30"
                            >
                              Revoca
                            </button>
                          </form>
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="text-sm opacity-70 mb-3">Pulizie (job)</div>
            {jobs.length === 0 ? (
              <div className="text-sm opacity-60">Nessun job registrato.</div>
            ) : (
              <div className="space-y-2">
                {jobs.map((j) => (
                  <div key={j.id} className="rounded-xl bg-black/30 border border-white/10 p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{j.windowLabel}</div>
                      <div className="text-xs opacity-70">{j.id}</div>
                    </div>
                    <div className="mt-1 text-sm opacity-80">
                      Stato:{" "}
                      <span className="font-semibold">
                        {j.status === "todo" && "Da fare"}
                        {j.status === "in_progress" && "In corso"}
                        {j.status === "done" && "Completato"}
                        {j.status === "problem" && "Problema"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    );
  }

  // -------------------------
  // Dashboard Host (overview)
  // -------------------------
  return (
    <main className="min-h-screen bg-[#0a0d12] text-white p-6">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs opacity-60">Host • Dashboard</div>
            <h1 className="text-xl font-semibold">{orgLabel}</h1>
            <div className="mt-1 text-sm opacity-70">
              <span className="opacity-80">{apartments.length} appartamenti</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <form action="/app/host" method="get" className="flex items-center gap-2">
              <input type="hidden" name="client" value={clientId} />
              <input
                name="q"
                defaultValue={q}
                placeholder="Cerca appartamento…"
                className="w-56 rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm outline-none focus:border-cyan-400/60"
              />
              <button className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm opacity-90">
                Cerca
              </button>
            </form>

            <form action="/api/auth/logout" method="post">
              <button className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm opacity-90">
                Logout
              </button>
            </form>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="text-xs opacity-60">Totali</div>
            <div className="mt-1 text-2xl font-semibold">{total}</div>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="text-xs opacity-60">OK</div>
            <div className="mt-1 text-2xl font-semibold">{ok}</div>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="text-xs opacity-60">Attenzione</div>
            <div className="mt-1 text-2xl font-semibold">{warn}</div>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="text-xs opacity-60">Problema</div>
            <div className="mt-1 text-2xl font-semibold">{crit}</div>
          </div>
        </div>

        <section className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm opacity-70">🔴 Problemi (critical first)</div>
            <div className="text-xs opacity-50">Mostra max 5</div>
          </div>

          {criticalFirst.length === 0 ? (
            <div className="mt-3 text-sm opacity-60">Nessun problema critico rilevato.</div>
          ) : (
            <div className="mt-3 space-y-2">
              {criticalFirst.map((a) => (
                <Link
                  key={a.aptId}
                  href={`/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(a.aptId)}`}
                  className="block rounded-xl bg-black/30 border border-white/10 p-3 hover:border-white/20"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{a.name}</div>
                    <div className="text-xs opacity-70">{a.readiness}</div>
                  </div>
                  <div className="mt-1 text-sm opacity-70">{a.lastEvent}</div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm opacity-70">Appartamenti</div>
            <div className="text-xs opacity-50">Vista compatta</div>
          </div>

          <div className="mt-3 space-y-2">
            {healthFiltered.map((a) => (
              <Link
                key={a.aptId}
                href={`/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(a.aptId)}`}
                className="block rounded-xl bg-black/30 border border-white/10 p-4 hover:border-white/20"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{a.name}</div>
                    <div className="mt-1 text-xs opacity-60">Ultimo evento: {a.lastEvent}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs opacity-60">Stato</div>
                    <div className="font-semibold">
                      {a.status === "ok" && "🟢 OK"}
                      {a.status === "warn" && "🟡 Attenzione"}
                      {a.status === "crit" && "🔴 Problema"}
                    </div>
                    <div className="mt-1 text-xs opacity-70">{a.readiness}</div>
                  </div>
                </div>
              </Link>
            ))}

            {healthFiltered.length === 0 && (
              <div className="text-sm opacity-60">Nessun appartamento trovato.</div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}