import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { readSession } from "@/app/lib/session";
import * as Store from "@/app/lib/store";
import { listClients, listApartmentsByClient } from "@/app/lib/clientStore";
import { listJobsByApt, type CleaningJob, type CleaningStatus, updateJobsCleanerByStay } from "@/app/lib/cleaningstore";

import {
  cleaners_getCfg,
  cleaners_normName,
} from "@/app/lib/domain/cleanersDomain";

import { stays_get, stays_updateGuest, stays_updateDates, stays_addGuest, stays_removeGuest, stays_updateCleaner } from "@/app/lib/domain/staysDomain";

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

export default async function StayDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ stayId: string }>;
  searchParams?: SP | Promise<SP>;
}) {
  const { stayId } = await params;
  const sp = ((await Promise.resolve(searchParams as any)) ?? {}) as SP;
  const aptId = pick(sp, "apt") ?? "";
  const clientId = pick(sp, "client") ?? "";

  const cookieStore = await cookies();
  const sess = cookieStore.get("sess")?.value;
  const me = readSession(sess);

  if (!me || me.role !== "host") {
    return <div className="p-6 text-white">Non autorizzato</div>;
  }

  const stayObj = stays_get(stayId);
  if (!stayObj) {
    redirect(
      aptId
        ? `/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`
        : clientId
        ? `/app/host?client=${encodeURIComponent(clientId)}`
        : "/app/host"
    );
  }

  const actualAptId = aptId || stayObj.aptId;
  const pins = pins_listByStay(Store, stayId);
  const jobs = listJobsByApt(actualAptId);

  const stayCheckinDT = stayObj.checkInAt ? new Date(stayObj.checkInAt) : null;
  const stayCheckoutDT = stayObj.checkOutAt ? new Date(stayObj.checkOutAt) : null;

  const stayGuestsCount = Math.max(1, Math.min(10, stayObj?.guests?.length ?? 2));
  const stayCheckin = stayCheckinDT ? toDTLocalValue(stayCheckinDT) : "";
  const stayCheckout = stayCheckoutDT ? toDTLocalValue(stayCheckoutDT) : "";

  // Get apartment name
  const clients = (listClients() as any[]) ?? [];
  const getClientId = (c: any) =>
    String(c?.id ?? c?.clientId ?? c?.clientID ?? c?.slug ?? "");
  const wantedClientId = (pick(sp, "client") ?? getClientId(clients[0]) ?? "").trim();
  const client =
    clients.find((c) => getClientId(c) === wantedClientId) ?? (clients[0] ?? null);

  const finalClientId = client ? getClientId(client) : "";
  const apartments = finalClientId
    ? (listApartmentsByClient(finalClientId) as any[]).map((a) => ({
        aptId: String(a?.aptId ?? a?.id ?? a?.apt ?? ""),
        name: String(
          a?.aptName ?? a?.name ?? a?.title ?? `Apt ${a?.aptId ?? a?.id ?? ""}`
        ),
      }))
    : [{ aptId: me.aptId, name: `Apt ${me.aptId} — Principale` }];

  const apt = apartments.find((x) => x.aptId === actualAptId);

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
      `/app/host/stay/${encodeURIComponent(stayId)}?client=${encodeURIComponent(finalClientId)}&apt=${encodeURIComponent(aptId)}`
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

    pins_createGuestPinsForStay(Store, {
      aptId,
      stayId: stayIdIn,
      validFrom: vf,
      validTo: vt,
      guestNames,
      source: "manual",
    });

    redirect(
      `/app/host/stay/${encodeURIComponent(stayIdIn)}?client=${encodeURIComponent(finalClientId)}&apt=${encodeURIComponent(aptId)}`
    );
  }

  async function delPin(formData: FormData) {
    "use server";
    const pin = formData.get("pin")?.toString() ?? "";
    const aptId = formData.get("aptId")?.toString() ?? "";
    if (!pin) return;

    pins_revoke(Store, pin);

    redirect(
      `/app/host/stay/${encodeURIComponent(stayId)}?client=${encodeURIComponent(finalClientId)}&apt=${encodeURIComponent(aptId)}`
    );
  }

  async function delStay(formData: FormData) {
    "use server";

    const aptId = (formData.get("aptId")?.toString() ?? "").trim();
    const stayId = (formData.get("stayId")?.toString() ?? "").trim();
    if (!aptId || !stayId) return;

    pins_deleteStayAndPins(Store, stayId);

    redirect(
      `/app/host?client=${encodeURIComponent(finalClientId)}&apt=${encodeURIComponent(aptId)}`
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
        `/app/host?client=${encodeURIComponent(finalClientId)}&apt=${encodeURIComponent(aptId)}`
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
      `/app/host/stay/${encodeURIComponent(st.stayId)}?client=${encodeURIComponent(finalClientId)}&apt=${encodeURIComponent(aptId)}`
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0d12] text-white p-6">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs opacity-60">Host • Dettaglio soggiorno</div>
            <h1 className="text-lg font-semibold">
              Stay: <span className="font-mono text-sm">{stayId}</span>
            </h1>
            <div className="mt-1 text-sm opacity-70">
              {apt?.name ?? (actualAptId ? `Apt ${actualAptId}` : "Apt")}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <Link
              className="whitespace-nowrap text-sm opacity-70 hover:opacity-100"
              href={
                actualAptId
                  ? `/app/host?client=${encodeURIComponent(finalClientId)}&apt=${encodeURIComponent(actualAptId)}`
                  : finalClientId
                  ? `/app/host?client=${encodeURIComponent(finalClientId)}`
                  : "/app/host"
              }
            >
              ← Appartamento
            </Link>

            <form action={delStay}>
              <input type="hidden" name="aptId" value={actualAptId} />
              <input type="hidden" name="stayId" value={stayId} />
              <button
                type="submit"
                className="whitespace-nowrap text-sm text-red-200/90 hover:text-red-100 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-1.5"
              >
                Elimina prenotazione
              </button>
            </form>

            <form action="/api/auth/logout" method="post">
              <button className="whitespace-nowrap text-sm opacity-70 hover:opacity-100">
                Esci
              </button>
            </form>
          </div>
        </div>

        {/* Stay info */}
        <section className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="text-sm opacity-70 mb-3">Informazioni soggiorno</div>
          
          {(() => {
            async function updateStayDates(formData: FormData) {
              "use server";
              const stayId = formData.get("stayId")?.toString() ?? "";
              const checkinStr = formData.get("checkin")?.toString() ?? "";
              const checkoutStr = formData.get("checkout")?.toString() ?? "";

              if (!stayId) {
                redirect(
                  `/app/host/stay/${encodeURIComponent(stayId)}?client=${encodeURIComponent(finalClientId)}&apt=${encodeURIComponent(actualAptId)}`
                );
                return;
              }

              const checkinDT = parseDateTimeLocal(checkinStr);
              const checkoutDT = parseDateTimeLocal(checkoutStr);

              if (!checkinDT || !checkoutDT || checkoutDT.getTime() <= checkinDT.getTime()) {
                redirect(
                  `/app/host/stay/${encodeURIComponent(stayId)}?client=${encodeURIComponent(finalClientId)}&apt=${encodeURIComponent(actualAptId)}`
                );
                return;
              }

              stays_updateDates(stayId, {
                checkInAt: checkinDT.getTime(),
                checkOutAt: checkoutDT.getTime(),
              });

              redirect(
                `/app/host/stay/${encodeURIComponent(stayId)}?client=${encodeURIComponent(finalClientId)}&apt=${encodeURIComponent(actualAptId)}`
              );
            }

            return (
              <div className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="opacity-60">Ospiti:</span> {stayGuestsCount}
                  </div>
                </div>

                <form action={updateStayDates} className="space-y-3">
                  <input type="hidden" name="stayId" value={stayId} />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-[11px] opacity-60 mb-1">
                        Check-in (data + ora) <span className="text-red-400">*</span>
                      </div>
                      <input
                        type="datetime-local"
                        name="checkin"
                        defaultValue={stayCheckin ?? ""}
                        required
                        className="w-full rounded-xl bg-black/40 border border-white/10 p-2"
                      />
                    </div>
                    <div>
                      <div className="text-[11px] opacity-60 mb-1">
                        Check-out (data + ora) <span className="text-red-400">*</span>
                      </div>
                      <input
                        type="datetime-local"
                        name="checkout"
                        defaultValue={stayCheckout ?? ""}
                        required
                        className="w-full rounded-xl bg-black/40 border border-white/10 p-2"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-white/10 border border-white/15 px-4 py-2 text-sm font-semibold">
                    Salva modifiche date
                  </button>
                </form>

                {/* Form per modificare il cleaner */}
                {(() => {
                  async function updateCleaner(formData: FormData) {
                    "use server";
                    const stayId = formData.get("stayId")?.toString() ?? "";
                    const newCleanerName = cleaners_normName(formData.get("cleaner")?.toString() ?? "");

                    if (!stayId) {
                      redirect(
                        `/app/host/stay/${encodeURIComponent(stayId)}?client=${encodeURIComponent(finalClientId)}&apt=${encodeURIComponent(actualAptId)}`
                      );
                      return;
                    }

                    const stay = stays_get(stayId);
                    if (!stay) {
                      redirect(
                        `/app/host/stay/${encodeURIComponent(stayId)}?client=${encodeURIComponent(finalClientId)}&apt=${encodeURIComponent(actualAptId)}`
                      );
                      return;
                    }

                    const oldCleanerName = stay.cleanerName;

                    // Aggiorna il cleaner nello stay
                    stays_updateCleaner(stayId, newCleanerName || null);

                    // Aggiorna i job associati
                    updateJobsCleanerByStay(stayId, newCleanerName || null);

                    // Recupera gli orari dal PIN del vecchio cleaner prima di revocarlo
                    let validFrom: number | null = null;
                    let validTo: number | null = null;
                    
                    if (oldCleanerName) {
                      const oldPins = Store.listPinsByStay(stayId).filter((p: any) => p.role === "cleaner");
                      if (oldPins.length > 0) {
                        // Usa gli orari del PIN esistente
                        validFrom = oldPins[0].validFrom ?? oldPins[0].createdAt;
                        validTo = oldPins[0].validTo ?? oldPins[0].expiresAt ?? oldPins[0].createdAt;
                      }
                      // Revoca tutti i PIN del vecchio cleaner per questo stay
                      Store.revokeCleanerPinsByStay(stayId);
                    }

                    // Se non abbiamo recuperato gli orari dal vecchio PIN, calcolali
                    if (validFrom === null || validTo === null) {
                      const cfg = cleaners_getCfg(actualAptId);
                      const dur = Math.max(15, Math.min(24 * 60, Math.round(cfg.durationMin ?? 60)));
                      
                      // Calcola gli orari come fa createCleanerPinForStay
                      const calculateCleaningSlot = (checkOutAt: number, ranges: Array<{ from: string; to: string }>, durationMin: number): { from: number; to: number } => {
                        if (!ranges || ranges.length === 0) {
                          return { from: checkOutAt, to: checkOutAt + durationMin * 60_000 };
                        }

                        const checkoutDate = new Date(checkOutAt);
                        const checkoutHour = checkoutDate.getHours();
                        const checkoutMin = checkoutDate.getMinutes();
                        const checkoutMinOfDay = checkoutHour * 60 + checkoutMin;

                        const timeToMinutes = (timeStr: string): number => {
                          const [h, m] = timeStr.split(":").map(Number);
                          return h * 60 + m;
                        };

                        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
                          for (const range of ranges) {
                            const rangeFrom = timeToMinutes(range.from);
                            const rangeTo = timeToMinutes(range.to);
                            
                            const rangeDate = new Date(checkoutDate);
                            rangeDate.setDate(rangeDate.getDate() + dayOffset);
                            rangeDate.setHours(0, 0, 0, 0);
                            
                            const rangeStart = rangeDate.getTime() + rangeFrom * 60_000;
                            const rangeEnd = rangeDate.getTime() + rangeTo * 60_000;
                            
                            if (dayOffset === 0) {
                              if (checkoutMinOfDay >= rangeFrom && checkoutMinOfDay < rangeTo) {
                                const cleaningStart = checkOutAt;
                                const cleaningEnd = Math.min(cleaningStart + durationMin * 60_000, rangeEnd);
                                return { from: cleaningStart, to: cleaningEnd };
                              }
                            }
                            
                            if (rangeStart >= checkOutAt) {
                              const cleaningStart = rangeStart;
                              const cleaningEnd = Math.min(cleaningStart + durationMin * 60_000, rangeEnd);
                              return { from: cleaningStart, to: cleaningEnd };
                            }
                          }
                        }
                        
                        return { from: checkOutAt, to: checkOutAt + durationMin * 60_000 };
                      };

                      const slot = calculateCleaningSlot(stay.checkOutAt, cfg.cleaningTimeRanges ?? [], dur);
                      validFrom = slot.from;
                      validTo = slot.to;
                    }

                    // Crea un nuovo PIN per il nuovo cleaner (se specificato) senza creare un nuovo job
                    if (newCleanerName && validFrom !== null && validTo !== null) {
                      const g0 = stay.guests[0] ?? { guestId: `g-${crypto.randomUUID()}`, name: "Ospite 1" };
                      const normalizedCleanerName = cleaners_normName(newCleanerName);
                      
                      if (normalizedCleanerName) {
                        Store.createPinForGuest({
                          role: "cleaner",
                          aptId: actualAptId,
                          stayId,
                          guestId: g0.guestId,
                          guestName: normalizedCleanerName,
                          validFrom,
                          validTo,
                          source: "manual", // Usa "manual" per evitare la creazione automatica del job
                        });
                      }
                    }

                    redirect(
                      `/app/host/stay/${encodeURIComponent(stayId)}?client=${encodeURIComponent(finalClientId)}&apt=${encodeURIComponent(actualAptId)}`
                    );
                  }

                  const cfg = cleaners_getCfg(actualAptId);
                  const cleanersList = cfg.cleaners ?? [];

                  return (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="text-sm opacity-70 mb-3">Cleaner assegnato</div>
                      <form action={updateCleaner} className="space-y-3">
                        <input type="hidden" name="stayId" value={stayId} />
                        
                        <div>
                          <div className="text-[11px] opacity-60 mb-1">
                            Cleaner <span className="text-red-400">*</span>
                          </div>
                          <select
                            name="cleaner"
                            required
                            defaultValue={stayObj.cleanerName ?? ""}
                            className="w-full rounded-xl bg-black/40 border border-white/10 p-2">
                            <option value="">— Seleziona cleaner —</option>
                            {cleanersList.map((c: string) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          type="submit"
                          className="w-full rounded-xl bg-cyan-500/30 border border-cyan-400/30 px-4 py-2 text-sm font-semibold">
                          Aggiorna cleaner
                        </button>
                        <div className="text-xs opacity-50">
                          I PIN del vecchio cleaner verranno revocati e verrà creato un nuovo PIN per il cleaner selezionato. Il job esistente verrà aggiornato con il nuovo cleaner.
                        </div>
                      </form>
                    </div>
                  );
                })()}
              </div>
            );
          })()}
        </section>

        {/* Guests management */}
        <section className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="text-sm opacity-70 mb-3">Ospiti</div>

          {stayObj.guests.length === 0 ? (
            <div className="text-sm opacity-50">Nessun ospite registrato.</div>
          ) : (
            <div className="space-y-3">
              {stayObj.guests.map((guest: any, idx: number) => {
                const guestPins = pins.filter((p: any) => p.guestId === guest.guestId && p.role === "guest");
                
                async function updateGuest(formData: FormData) {
                  "use server";
                  const guestId = formData.get("guestId")?.toString() ?? "";
                  const firstName = (formData.get("firstName")?.toString() ?? "").trim();
                  const lastName = (formData.get("lastName")?.toString() ?? "").trim();
                  const phone = (formData.get("phone")?.toString() ?? "").trim();
                  const email = (formData.get("email")?.toString() ?? "").trim();

                  if (!guestId || !firstName || !lastName || !phone) {
                    redirect(
                      `/app/host/stay/${encodeURIComponent(stayId)}?client=${encodeURIComponent(finalClientId)}&apt=${encodeURIComponent(actualAptId)}`
                    );
                    return;
                  }

                  stays_updateGuest(stayId, guestId, {
                    firstName,
                    lastName,
                    phone,
                    email: email || undefined,
                  });

                  redirect(
                    `/app/host/stay/${encodeURIComponent(stayId)}?client=${encodeURIComponent(finalClientId)}&apt=${encodeURIComponent(actualAptId)}`
                  );
                }

                async function revokeGuestPins(formData: FormData) {
                  "use server";
                  const guestId = formData.get("guestId")?.toString() ?? "";
                  if (!guestId) return;

                  const guestPinsToRevoke = pins.filter((p: any) => p.guestId === guestId && p.role === "guest");
                  guestPinsToRevoke.forEach((p: any) => {
                    pins_revoke(Store, p.pin);
                  });

                  redirect(
                    `/app/host/stay/${encodeURIComponent(stayId)}?client=${encodeURIComponent(finalClientId)}&apt=${encodeURIComponent(actualAptId)}`
                  );
                }

                async function createGuestPin(formData: FormData) {
                  "use server";
                  const guestId = formData.get("guestId")?.toString() ?? "";
                  if (!guestId) return;

                  const stay = stays_get(stayId);
                  if (!stay) return;
                  const guest = stay.guests.find((g: any) => g.guestId === guestId);
                  if (!guest) return;

                  Store.createPinForGuest({
                    role: "guest",
                    aptId: actualAptId,
                    stayId,
                    guestId,
                    guestName: guest.name,
                    validFrom: stay.checkInAt,
                    validTo: stay.checkOutAt,
                    source: "manual",
                  });

                  redirect(
                    `/app/host/stay/${encodeURIComponent(stayId)}?client=${encodeURIComponent(finalClientId)}&apt=${encodeURIComponent(actualAptId)}`
                  );
                }

                async function removeGuest(formData: FormData) {
                  "use server";
                  const guestId = formData.get("guestId")?.toString() ?? "";
                  if (!guestId) return;

                  // Revoca tutti i PIN dell'ospite prima di rimuoverlo
                  const stayPins = pins_listByStay(Store, stayId);
                  const guestPinsToRevoke = stayPins.filter((p: any) => p.guestId === guestId && p.role === "guest");
                  guestPinsToRevoke.forEach((p: any) => {
                    pins_revoke(Store, p.pin);
                  });

                  // Rimuovi l'ospite (la funzione controlla che ci sia almeno un ospite)
                  stays_removeGuest(stayId, guestId);

                  redirect(
                    `/app/host/stay/${encodeURIComponent(stayId)}?client=${encodeURIComponent(finalClientId)}&apt=${encodeURIComponent(actualAptId)}`
                  );
                }

                const canRemove = stayObj.guests.length > 1;

                return (
                  <div key={guest.guestId} className="rounded-xl bg-black/30 border border-white/10 p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="text-sm font-semibold">
                          {guest.firstName && guest.lastName
                            ? `${guest.firstName} ${guest.lastName}`
                            : guest.name}
                        </div>
                        <div className="mt-1 text-xs opacity-60">
                          Ospite {idx + 1}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs opacity-60">
                          {guestPins.length} PIN
                        </div>
                        {canRemove && (
                          <form action={removeGuest}>
                            <input type="hidden" name="guestId" value={guest.guestId} />
                            <button
                              type="submit"
                              className="text-xs px-2 py-1 rounded bg-red-500/20 border border-red-500/30 hover:bg-red-500/30">
                              Rimuovi
                            </button>
                          </form>
                        )}
                      </div>
                    </div>

                    <form action={updateGuest} className="space-y-3">
                      <input type="hidden" name="guestId" value={guest.guestId} />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <div className="text-[11px] opacity-60 mb-1">Nome</div>
                          <input
                            type="text"
                            name="firstName"
                            defaultValue={guest.firstName ?? guest.name.split(" ")[0] ?? ""}
                            required
                            className="w-full rounded-xl bg-black/40 border border-white/10 p-2 text-sm"
                          />
                        </div>
                        <div>
                          <div className="text-[11px] opacity-60 mb-1">Cognome</div>
                          <input
                            type="text"
                            name="lastName"
                            defaultValue={guest.lastName ?? guest.name.split(" ").slice(1).join(" ") ?? ""}
                            required
                            className="w-full rounded-xl bg-black/40 border border-white/10 p-2 text-sm"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <div className="text-[11px] opacity-60 mb-1">Telefono</div>
                          <input
                            type="tel"
                            name="phone"
                            defaultValue={guest.phone ?? ""}
                            required
                            className="w-full rounded-xl bg-black/40 border border-white/10 p-2 text-sm"
                          />
                        </div>
                        <div>
                          <div className="text-[11px] opacity-60 mb-1">Email (opzionale)</div>
                          <input
                            type="email"
                            name="email"
                            defaultValue={guest.email ?? ""}
                            className="w-full rounded-xl bg-black/40 border border-white/10 p-2 text-sm"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="w-full rounded-xl bg-white/10 border border-white/15 px-4 py-2 text-sm font-semibold"
                      >
                        Salva modifiche
                      </button>
                    </form>

                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="text-xs opacity-60 mb-2">PIN di accesso</div>
                      {guestPins.length === 0 ? (
                        <div className="text-xs opacity-50 mb-2">Nessun PIN attivo</div>
                      ) : (
                        <div className="space-y-2 mb-2">
                          {guestPins.map((p: any) => {
                            const vTo = p.validTo ?? p.expiresAt;
                            return (
                              <div
                                key={p.pin}
                                className="flex items-center justify-between rounded-lg bg-black/40 border border-white/10 px-3 py-2"
                              >
                                <div>
                                  <div className="text-xs font-mono font-semibold">{p.pin}</div>
                                  <div className="text-[11px] opacity-60">
                                    Scade tra {timeLeftDHM(vTo ?? 0)}
                                  </div>
                                </div>
                                <form action={delPin}>
                                  <input type="hidden" name="aptId" value={actualAptId} />
                                  <input type="hidden" name="pin" value={p.pin} />
                                  <button
                                    type="submit"
                                    className="text-xs px-2 py-1 rounded bg-red-500/20 border border-red-500/30"
                                  >
                                    Revoca
                                  </button>
                                </form>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div className="flex gap-2">
                        {guestPins.length > 0 && (
                          <form action={revokeGuestPins} className="flex-1">
                            <input type="hidden" name="guestId" value={guest.guestId} />
                            <button
                              type="submit"
                              className="w-full text-xs px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30"
                            >
                              Revoca tutti i PIN
                            </button>
                          </form>
                        )}
                        <form action={createGuestPin} className="flex-1">
                          <input type="hidden" name="guestId" value={guest.guestId} />
                          <button
                            type="submit"
                            className="w-full text-xs px-3 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30"
                          >
                            Crea nuovo PIN
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Form per aggiungere nuovo ospite */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="text-sm font-semibold mb-3">Aggiungi nuovo ospite</div>
            {(() => {
              async function addGuest(formData: FormData) {
                "use server";
                const firstName = (formData.get("firstName")?.toString() ?? "").trim();
                const lastName = (formData.get("lastName")?.toString() ?? "").trim();
                const phone = (formData.get("phone")?.toString() ?? "").trim();
                const email = (formData.get("email")?.toString() ?? "").trim();

                if (!firstName || !lastName || !phone) {
                  redirect(
                    `/app/host/stay/${encodeURIComponent(stayId)}?client=${encodeURIComponent(finalClientId)}&apt=${encodeURIComponent(actualAptId)}`
                  );
                  return;
                }

                // Aggiungi l'ospite
                const newGuest = stays_addGuest(stayId, {
                  firstName,
                  lastName,
                  phone,
                  email: email || undefined,
                });

                if (!newGuest) {
                  redirect(
                    `/app/host/stay/${encodeURIComponent(stayId)}?client=${encodeURIComponent(finalClientId)}&apt=${encodeURIComponent(actualAptId)}`
                  );
                  return;
                }

                // Crea automaticamente un PIN per il nuovo ospite
                const stay = stays_get(stayId);
                if (stay) {
                  Store.createPinForGuest({
                    role: "guest",
                    aptId: actualAptId,
                    stayId,
                    guestId: newGuest.guestId,
                    guestName: newGuest.name,
                    validFrom: stay.checkInAt,
                    validTo: stay.checkOutAt,
                    source: "auto",
                  });
                }

                redirect(
                  `/app/host/stay/${encodeURIComponent(stayId)}?client=${encodeURIComponent(finalClientId)}&apt=${encodeURIComponent(actualAptId)}`
                );
              }

              return (
                <form action={addGuest} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <div className="text-[11px] opacity-60 mb-1">
                        Nome <span className="text-red-400">*</span>
                      </div>
                      <input
                        type="text"
                        name="firstName"
                        required
                        placeholder="Nome"
                        className="w-full rounded-xl bg-black/40 border border-white/10 p-2 text-sm"
                      />
                    </div>
                    <div>
                      <div className="text-[11px] opacity-60 mb-1">
                        Cognome <span className="text-red-400">*</span>
                      </div>
                      <input
                        type="text"
                        name="lastName"
                        required
                        placeholder="Cognome"
                        className="w-full rounded-xl bg-black/40 border border-white/10 p-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <div className="text-[11px] opacity-60 mb-1">
                        Telefono <span className="text-red-400">*</span>
                      </div>
                      <input
                        type="tel"
                        name="phone"
                        required
                        placeholder="+39 123 456 7890"
                        className="w-full rounded-xl bg-black/40 border border-white/10 p-2 text-sm"
                      />
                    </div>
                    <div>
                      <div className="text-[11px] opacity-60 mb-1">Email (opzionale)</div>
                      <input
                        type="email"
                        name="email"
                        placeholder="email@example.com"
                        className="w-full rounded-xl bg-black/40 border border-white/10 p-2 text-sm"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-cyan-500/30 border border-cyan-400/30 p-2 font-semibold">
                    Aggiungi ospite
                  </button>
                  <div className="text-xs opacity-50">
                    Un PIN di accesso verrà creato automaticamente per il nuovo ospite.
                  </div>
                </form>
              );
            })()}
          </div>
        </section>

        {/* Cleaner PINs section */}
        <section className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="text-sm opacity-70 mb-3">PIN Cleaner</div>
          {(() => {
            const cleanerPins = pins.filter((p: any) => p.role === "cleaner" && p.stayId === stayId);
            // Recupera il cleaner assegnato allo stay (persistente, indipendente dai PIN)
            const assignedCleaner = stayObj.cleanerName || null;

            async function createCleanerPin(formData: FormData) {
              "use server";
              const stayId = formData.get("stayId")?.toString() ?? "";
              const validFromStr = formData.get("validFrom")?.toString() ?? "";
              const validToStr = formData.get("validTo")?.toString() ?? "";

              if (!stayId) {
                redirect(
                  `/app/host/stay/${encodeURIComponent(stayId)}?client=${encodeURIComponent(finalClientId)}&apt=${encodeURIComponent(actualAptId)}`
                );
                return;
              }

              // Recupera il cleaner assegnato allo stay (persistente, indipendente dai PIN)
              const stay = stays_get(stayId);
              if (!stay) {
                redirect(
                  `/app/host/stay/${encodeURIComponent(stayId)}?client=${encodeURIComponent(finalClientId)}&apt=${encodeURIComponent(actualAptId)}`
                );
                return;
              }

              const cleanerName = stay.cleanerName;
              if (!cleanerName) {
                redirect(
                  `/app/host/stay/${encodeURIComponent(stayId)}?client=${encodeURIComponent(finalClientId)}&apt=${encodeURIComponent(actualAptId)}`
                );
                return;
              }

              const validFrom = parseDateTimeLocal(validFromStr)?.getTime() ?? Date.now();
              const validTo = parseDateTimeLocal(validToStr)?.getTime() ?? Date.now() + 2 * 60 * 60 * 1000;

              if (validTo <= validFrom) {
                redirect(
                  `/app/host/stay/${encodeURIComponent(stayId)}?client=${encodeURIComponent(finalClientId)}&apt=${encodeURIComponent(actualAptId)}`
                );
                return;
              }

              // Usa createPinForGuest per creare il PIN con le date specificate
              const guest0 = stay.guests[0] ?? { guestId: `g-${crypto.randomUUID()}`, name: "Ospite 1" };
              Store.createPinForGuest({
                role: "cleaner",
                aptId: actualAptId,
                stayId,
                guestId: guest0.guestId,
                guestName: cleanerName,
                validFrom: validFrom,
                validTo: validTo,
                source: "manual",
              });

              redirect(
                `/app/host/stay/${encodeURIComponent(stayId)}?client=${encodeURIComponent(finalClientId)}&apt=${encodeURIComponent(actualAptId)}`
              );
            }

            async function revokeCleanerPin(formData: FormData) {
              "use server";
              const pin = formData.get("pin")?.toString() ?? "";
              if (!pin) return;

              pins_revoke(Store, pin);
              redirect(
                `/app/host/stay/${encodeURIComponent(stayId)}?client=${encodeURIComponent(finalClientId)}&apt=${encodeURIComponent(actualAptId)}`
              );
            }

            return (
              <div className="space-y-4">
                {/* Lista PIN esistenti */}
                {cleanerPins.length === 0 ? (
                  <div className="text-sm opacity-60">Nessun PIN cleaner attivo per questo soggiorno.</div>
                ) : (
                  <div className="space-y-2">
                    {cleanerPins.map((p: any) => {
                      const vFrom = p.validFrom ?? p.createdAt;
                      const vTo = p.validTo ?? p.expiresAt;

                      return (
                        <div key={p.pin} className="rounded-xl bg-black/30 border border-white/10 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold tracking-widest text-sm">{p.pin}</div>
                              <div className="mt-1 text-xs opacity-60">
                                {p.guestName || "Cleaner"} • {p.source ?? "manual"}
                              </div>
                              <div className="mt-1 text-xs opacity-50">
                                Valido: {fmtDT(vFrom)} → {fmtDT(vTo)}
                              </div>
                              <div className="mt-1 text-xs opacity-50">Scade tra: {timeLeftDHM(vTo ?? 0)}</div>
                            </div>
                            <form action={revokeCleanerPin}>
                              <input type="hidden" name="pin" value={p.pin} />
                              <button
                                type="submit"
                                className="text-xs px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 whitespace-nowrap">
                                Revoca
                              </button>
                            </form>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Form per creare nuovo PIN */}
                {assignedCleaner ? (
                  <div className="rounded-xl bg-black/20 border border-white/10 p-4">
                    <div className="text-sm font-semibold mb-3">Crea nuovo PIN cleaner</div>
                    <form action={createCleanerPin} className="space-y-3">
                      <input type="hidden" name="stayId" value={stayId} />

                      <div>
                        <div className="text-[11px] opacity-60 mb-1">Cleaner assegnato</div>
                        <div className="w-full rounded-xl bg-black/40 border border-white/10 p-2 text-sm font-semibold">
                          {assignedCleaner}
                        </div>
                        <div className="mt-1 text-xs opacity-50">Il cleaner è stato assegnato automaticamente alla creazione del soggiorno.</div>
                      </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <div className="text-[11px] opacity-60 mb-1">Validità da (data + ora)</div>
                        <input
                          type="datetime-local"
                          name="validFrom"
                          required
                          className="w-full rounded-xl bg-black/40 border border-white/10 p-2"
                        />
                      </div>
                      <div>
                        <div className="text-[11px] opacity-60 mb-1">Validità fino a (data + ora)</div>
                        <input
                          type="datetime-local"
                          name="validTo"
                          required
                          className="w-full rounded-xl bg-black/40 border border-white/10 p-2"
                        />
                      </div>
                    </div>

                      <button type="submit" className="w-full rounded-xl bg-cyan-500/30 border border-cyan-400/30 p-2 font-semibold">
                        Crea PIN cleaner
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="rounded-xl bg-black/20 border border-white/10 p-4">
                    <div className="text-sm opacity-60">Nessun cleaner assegnato a questo soggiorno.</div>
                  </div>
                )}
              </div>
            );
          })()}
        </section>

        {/* PIN list */}
        <section className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="text-sm opacity-70 mb-3">PIN attivi</div>

          {pins.length === 0 ? (
            <div className="text-sm opacity-50">Nessun PIN attivo per questo stay.</div>
          ) : (
            <div className="space-y-2">
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
                          <input type="hidden" name="aptId" value={actualAptId} />
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

        {/* Cleaning Jobs section */}
        <section className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="text-sm opacity-70 mb-3">Jobs di pulizia</div>

          {jobs.length === 0 ? (
            <div className="text-sm opacity-50">Nessun job di pulizia registrato per questo appartamento.</div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job: CleaningJob) => {
                const statusColors: Record<CleaningStatus, string> = {
                  todo: "bg-yellow-500/20 border-yellow-500/30 text-yellow-200",
                  in_progress: "bg-blue-500/20 border-blue-500/30 text-blue-200",
                  done: "bg-green-500/20 border-green-500/30 text-green-200",
                  problem: "bg-red-500/20 border-red-500/30 text-red-200",
                };

                const statusLabels: Record<CleaningStatus, string> = {
                  todo: "Da fare",
                  in_progress: "In corso",
                  done: "Completato",
                  problem: "Problema",
                };

                return (
                  <div key={job.id} className="rounded-xl bg-black/30 border border-white/10 p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold">{job.aptName}</div>
                        <div className="mt-1 text-xs opacity-60">
                          {job.windowLabel}
                        </div>
                        {job.notesFromHost && (
                          <div className="mt-2 text-xs opacity-70 italic">
                            {job.notesFromHost}
                          </div>
                        )}
                      </div>
                      <div className={`px-3 py-1 rounded-lg text-xs font-semibold border ${statusColors[job.status]}`}>
                        {statusLabels[job.status]}
                      </div>
                    </div>

                    {job.startedAt && (
                      <div className="mt-2 text-xs opacity-60">
                        Iniziato: {fmtDT(job.startedAt)}
                      </div>
                    )}
                    {job.completedAt && (
                      <div className="mt-1 text-xs opacity-60">
                        Completato: {fmtDT(job.completedAt)}
                      </div>
                    )}

                    {job.checklist && job.checklist.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <div className="text-xs opacity-60 mb-2">Checklist</div>
                        <div className="space-y-1">
                          {job.checklist.map((item) => (
                            <div key={item.id} className="flex items-center gap-2 text-xs">
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                item.done 
                                  ? "bg-green-500/30 border-green-500/50" 
                                  : "bg-black/40 border-white/20"
                              }`}>
                                {item.done && (
                                  <svg className="w-3 h-3 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <span className={item.done ? "opacity-50 line-through" : ""}>
                                {item.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t border-white/10">
                      <Link
                        href={`/app/host/job/${encodeURIComponent(job.id)}`}
                        className="text-xs px-3 py-2 rounded-lg bg-white/10 border border-white/15 hover:bg-white/15 inline-block">
                        Vedi dettaglio job →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

