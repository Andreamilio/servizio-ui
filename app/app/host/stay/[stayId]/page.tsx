import { cookies } from "next/headers";
import { readSession } from "@/app/lib/session";
import { redirect } from "next/navigation";
import * as Store from "@/app/lib/store";
import { listClients, listApartmentsByClient } from "@/app/lib/clientStore";
import { listJobsByApt, type CleaningJob, type CleaningStatus, updateJobsCleanerByStay } from "@/app/lib/cleaningstore";
import { getUser } from "@/app/lib/userStore";
import { AppLayout } from "@/app/components/layouts/AppLayout";
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
import { Box, VStack, HStack, Heading, Text, Grid, GridItem, Image, Input as ChakraInput, Field } from "@chakra-ui/react";
import { Select } from "@/app/components/ui/Select";
import { Card, CardBody, CardHeader } from "@/app/components/ui/Card";
import { Link } from "@/app/components/ui/Link";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Badge";
import { Input } from "@/app/components/ui/Input";
import { CheckIcon } from "lucide-react";
import { PinCollapsible } from "./PinCollapsible";

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
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtDT(ts?: number | null) {
  if (!ts) return "—";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtDTMedium(ts?: number | null): string {
  if (!ts) return '—';
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getResponsabileName(guests: any[]): string {
  if (!guests || guests.length === 0) return 'Nessun ospite';
  const first = guests[0];
  if (first.firstName && first.lastName) {
    return `${first.firstName} ${first.lastName}`;
  }
  return first.name || 'Nessun ospite';
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
    return (
      <Box p={6} color="var(--text-primary)">
        Non autorizzato
      </Box>
    );
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

  const hostUser = me.userId ? getUser(me.userId) : null;

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
    <AppLayout 
      role="host"
      userInfo={hostUser ? {
        userId: hostUser.userId,
        username: hostUser.username,
        profileImageUrl: hostUser.profileImageUrl,
      } : undefined}
    >
      <Box maxW="3xl" mx="auto" p={{ base: 4, sm: 6 }}>
        <VStack spacing={5} align="stretch">
          <HStack justify="space-between" gap={3} align="start">
            <Box>
              <Text fontSize="xs" opacity={0.6}>Host • Dettaglio soggiorno</Text>
              <Heading as="h1" size="lg" fontWeight="semibold">
                {getResponsabileName(stayObj.guests || [])} - {fmtDTMedium(stayObj.checkInAt)} - {fmtDTMedium(stayObj.checkOutAt)}
              </Heading>
              <Text mt={1} fontSize="sm" opacity={0.7}>
                {apt?.name ?? (actualAptId ? `Apt ${actualAptId}` : "Apt")}
              </Text>
            </Box>

            <HStack spacing={{ base: 2, sm: 3 }} flexWrap="wrap" justify="end">
              <Link
                href={
                  actualAptId
                    ? `/app/host?client=${encodeURIComponent(finalClientId)}&apt=${encodeURIComponent(actualAptId)}`
                    : finalClientId
                    ? `/app/host?client=${encodeURIComponent(finalClientId)}`
                    : "/app/host"
                }
                fontSize="sm"
                opacity={0.7}
                _hover={{ opacity: 1 }}
                whiteSpace="nowrap"
              >
                ← Appartamento
              </Link>

              <Box as="form" action={delStay}>
                <input type="hidden" name="aptId" value={actualAptId} />
                <input type="hidden" name="stayId" value={stayId} />
                <Button
                  type="submit"
                  size="sm"
                  borderRadius="xl"
                  bg="rgba(239, 68, 68, 0.1)"
                  border="1px solid"
                  borderColor="rgba(239, 68, 68, 0.2)"
                  px={3}
                  py={1.5}
                  fontSize="sm"
                  color="var(--accent-error)"
                  whiteSpace="nowrap"
                >
                  Elimina prenotazione
                </Button>
              </Box>
            </HStack>
          </HStack>

          {/* Stay info */}
          <Card>
            <CardBody p={4}>
              <VStack spacing={4} align="stretch">
                <Text fontSize="sm" opacity={0.7} mb={3}>
                  Informazioni soggiorno
                </Text>
                
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
                    <VStack spacing={4} align="stretch">
                      <VStack spacing={2} align="stretch" fontSize="sm">
                        <Text>
                          <Text as="span" opacity={0.6}>Ospiti:</Text> {stayGuestsCount}
                        </Text>
                      </VStack>

                      <Box as="form" action={updateStayDates}>
                        <VStack spacing={3} align="stretch">
                          <input type="hidden" name="stayId" value={stayId} />
                          
                          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={3}>
                            <Field.Root>
                              <Field.Label fontSize="11px" opacity={0.6} mb={1}>
                                Check-in (data + ora) <Text as="span" color="var(--accent-error)">*</Text>
                              </Field.Label>
                              <ChakraInput
                                type="datetime-local"
                                name="checkin"
                                defaultValue={stayCheckin ?? ""}
                                required
                                borderRadius="xl"
                                bg="var(--bg-secondary)"
                                border="1px solid"
                                borderColor="var(--border-light)"
                                p={2}
                              />
                            </Field.Root>
                            <Field.Root>
                              <Field.Label fontSize="11px" opacity={0.6} mb={1}>
                                Check-out (data + ora) <Text as="span" color="var(--accent-error)">*</Text>
                              </Field.Label>
                              <ChakraInput
                                type="datetime-local"
                                name="checkout"
                                defaultValue={stayCheckout ?? ""}
                                required
                                borderRadius="xl"
                                bg="var(--bg-secondary)"
                                border="1px solid"
                                borderColor="var(--border-light)"
                                p={2}
                              />
                            </Field.Root>
                          </Grid>

                          <Button
                            type="submit"
                            variant="secondary"
                            w="100%"
                            borderRadius="xl"
                            px={4}
                            py={2}
                            fontSize="sm"
                            fontWeight="semibold"
                          >
                            Salva modifiche date
                          </Button>
                        </VStack>
                      </Box>

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

                          stays_updateCleaner(stayId, newCleanerName || null);
                          updateJobsCleanerByStay(stayId, newCleanerName || null);

                          let validFrom: number | null = null;
                          let validTo: number | null = null;
                          
                          if (oldCleanerName) {
                            const oldPins = Store.listPinsByStay(stayId).filter((p: any) => p.role === "cleaner");
                            if (oldPins.length > 0) {
                              validFrom = oldPins[0].validFrom ?? oldPins[0].createdAt;
                              validTo = oldPins[0].validTo ?? oldPins[0].expiresAt ?? oldPins[0].createdAt;
                            }
                            Store.revokeCleanerPinsByStay(stayId);
                          }

                          if (validFrom === null || validTo === null) {
                            const cfg = cleaners_getCfg(actualAptId);
                            const dur = Math.max(15, Math.min(24 * 60, Math.round(cfg.durationMin ?? 60)));
                            
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
                                source: "manual",
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
                          <Box mt={4} pt={4} borderTop="1px solid" borderColor="var(--border-light)">
                            <Text fontSize="sm" opacity={0.7} mb={3}>
                              Cleaner assegnato
                            </Text>
                            <Box as="form" action={updateCleaner}>
                              <VStack spacing={3} align="stretch">
                                <input type="hidden" name="stayId" value={stayId} />
                                
                                <Field.Root>
                                  <Field.Label fontSize="11px" opacity={0.6} mb={1}>
                                    Cleaner <Text as="span" color="var(--accent-error)">*</Text>
                                  </Field.Label>
                                  <Select
                                    name="cleaner"
                                    required
                                    defaultValue={stayObj.cleanerName ?? ""}
                                    borderRadius="xl"
                                    bg="var(--bg-secondary)"
                                    border="1px solid"
                                    borderColor="var(--border-light)"
                                    p={2}
                                  >
                                    <option value="">— Seleziona cleaner —</option>
                                    {cleanersList.map((cleaner) => (
                                      <option key={cleaner.name} value={cleaner.name}>
                                        {cleaner.name} - {cleaner.phone}
                                      </option>
                                    ))}
                                  </Select>
                                </Field.Root>

                                <Button
                                  type="submit"
                                  w="100%"
                                  borderRadius="xl"
                                  bg="rgba(6, 182, 212, 0.3)"
                                  border="1px solid"
                                  borderColor="rgba(6, 182, 212, 0.3)"
                                  px={4}
                                  py={2}
                                  fontSize="sm"
                                  fontWeight="semibold"
                                >
                                  Aggiorna cleaner
                                </Button>
                                <Text fontSize="xs" opacity={0.5}>
                                  I PIN del vecchio cleaner verranno revocati e verrà creato un nuovo PIN per il cleaner selezionato. Il job esistente verrà aggiornato con il nuovo cleaner.
                                </Text>
                              </VStack>
                            </Box>
                          </Box>
                        );
                      })()}
                    </VStack>
                  );
                })()}
              </VStack>
            </CardBody>
          </Card>

          {/* Guests management */}
          <Card>
            <CardBody p={4}>
              <VStack spacing={3} align="stretch">
                <Text fontSize="sm" opacity={0.7} mb={3}>
                  Ospiti
                </Text>

                {stayObj.guests.length === 0 ? (
                  <Text fontSize="sm" opacity={0.5}>
                    Nessun ospite registrato.
                  </Text>
                ) : (
                  <VStack spacing={3} align="stretch">
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

                        const stayPins = pins_listByStay(Store, stayId);
                        const guestPinsToRevoke = stayPins.filter((p: any) => p.guestId === guestId && p.role === "guest");
                        guestPinsToRevoke.forEach((p: any) => {
                          pins_revoke(Store, p.pin);
                        });

                        stays_removeGuest(stayId, guestId);

                        redirect(
                          `/app/host/stay/${encodeURIComponent(stayId)}?client=${encodeURIComponent(finalClientId)}&apt=${encodeURIComponent(actualAptId)}`
                        );
                      }

                      const canRemove = stayObj.guests.length > 1;

                      return (
                        <Card key={guest.guestId} variant="outlined">
                          <CardBody p={4}>
                            <VStack spacing={3} align="stretch">
                              <HStack justify="space-between" gap={3} mb={3}>
                                <Box>
                                  <Text fontSize="sm" fontWeight="semibold">
                                    {guest.firstName && guest.lastName
                                      ? `${guest.firstName} ${guest.lastName}`
                                      : guest.name}
                                  </Text>
                                  <Text mt={1} fontSize="xs" opacity={0.6}>
                                    {idx === 0 ? 'Responsabile soggiorno' : `Ospite ${idx + 1}`}
                                  </Text>
                                </Box>
                                <HStack spacing={2}>
                                  <Text fontSize="xs" opacity={0.6}>
                                    {guestPins.length} PIN
                                  </Text>
                                  {canRemove && (
                                    <Box as="form" action={removeGuest}>
                                      <input type="hidden" name="guestId" value={guest.guestId} />
                                      <Button
                                        type="submit"
                                        size="xs"
                                        borderRadius="md"
                                        bg="rgba(239, 68, 68, 0.2)"
                                        border="1px solid"
                                        borderColor="rgba(239, 68, 68, 0.3)"
                                        _hover={{ bg: "rgba(239, 68, 68, 0.3)" }}
                                        px={2}
                                        py={1}
                                      >
                                        Rimuovi
                                      </Button>
                                    </Box>
                                  )}
                                </HStack>
                              </HStack>

                              <Box as="form" action={updateGuest}>
                                <VStack spacing={3} align="stretch">
                                  <input type="hidden" name="guestId" value={guest.guestId} />
                                  <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={2}>
                                    <Field.Root>
                                      <Field.Label fontSize="11px" opacity={0.6} mb={1}>Nome</Field.Label>
                                      <ChakraInput
                                        type="text"
                                        name="firstName"
                                        defaultValue={guest.firstName ?? guest.name.split(" ")[0] ?? ""}
                                        required
                                        borderRadius="xl"
                                        bg="var(--bg-secondary)"
                                        border="1px solid"
                                        borderColor="var(--border-light)"
                                        p={2}
                                        fontSize="sm"
                                      />
                                    </Field.Root>
                                    <Field.Root>
                                      <Field.Label fontSize="11px" opacity={0.6} mb={1}>Cognome</Field.Label>
                                      <ChakraInput
                                        type="text"
                                        name="lastName"
                                        defaultValue={guest.lastName ?? guest.name.split(" ").slice(1).join(" ") ?? ""}
                                        required
                                        borderRadius="xl"
                                        bg="var(--bg-secondary)"
                                        border="1px solid"
                                        borderColor="var(--border-light)"
                                        p={2}
                                        fontSize="sm"
                                      />
                                    </Field.Root>
                                  </Grid>
                                  <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={2}>
                                    <Field.Root>
                                      <Field.Label fontSize="11px" opacity={0.6} mb={1}>Telefono</Field.Label>
                                      <ChakraInput
                                        type="tel"
                                        name="phone"
                                        defaultValue={guest.phone ?? ""}
                                        required
                                        borderRadius="xl"
                                        bg="var(--bg-secondary)"
                                        border="1px solid"
                                        borderColor="var(--border-light)"
                                        p={2}
                                        fontSize="sm"
                                      />
                                    </Field.Root>
                                    <Field.Root>
                                      <Field.Label fontSize="11px" opacity={0.6} mb={1}>Email (opzionale)</Field.Label>
                                      <ChakraInput
                                        type="email"
                                        name="email"
                                        defaultValue={guest.email ?? ""}
                                        borderRadius="xl"
                                        bg="var(--bg-secondary)"
                                        border="1px solid"
                                        borderColor="var(--border-light)"
                                        p={2}
                                        fontSize="sm"
                                      />
                                    </Field.Root>
                                  </Grid>
                                  <Button
                                    type="submit"
                                    variant="secondary"
                                    w="100%"
                                    borderRadius="xl"
                                    px={4}
                                    py={2}
                                    fontSize="sm"
                                    fontWeight="semibold"
                                  >
                                    Salva modifiche
                                  </Button>
                                </VStack>
                              </Box>

                              <Box mt={4} pt={4} borderTop="1px solid" borderColor="var(--border-light)">
                                <Text fontSize="xs" opacity={0.6} mb={2}>
                                  PIN di accesso
                                </Text>
                                {guestPins.length === 0 ? (
                                  <Text fontSize="xs" opacity={0.5} mb={2}>
                                    Nessun PIN attivo
                                  </Text>
                                ) : (
                                  <VStack spacing={2} align="stretch" mb={2}>
                                    {guestPins.map((p: any) => {
                                      const vTo = p.validTo ?? p.expiresAt;
                                      return (
                                        <Card key={p.pin} variant="outlined">
                                          <CardBody px={3} py={2}>
                                            <HStack justify="space-between">
                                              <Box>
                                                <Text fontSize="xs" fontFamily="mono" fontWeight="semibold">
                                                  {p.pin}
                                                </Text>
                                                <Text fontSize="11px" opacity={0.6}>
                                                  Scade tra {timeLeftDHM(vTo ?? 0)}
                                                </Text>
                                              </Box>
                                              <Box as="form" action={delPin}>
                                                <input type="hidden" name="aptId" value={actualAptId} />
                                                <input type="hidden" name="pin" value={p.pin} />
                                                <Button
                                                  type="submit"
                                                  size="xs"
                                                  borderRadius="md"
                                                  bg="rgba(239, 68, 68, 0.2)"
                                                  border="1px solid"
                                                  borderColor="rgba(239, 68, 68, 0.3)"
                                                  px={2}
                                                  py={1}
                                                >
                                                  Revoca
                                                </Button>
                                              </Box>
                                            </HStack>
                                          </CardBody>
                                        </Card>
                                      );
                                    })}
                                  </VStack>
                                )}
                                <HStack spacing={2}>
                                  {guestPins.length > 0 && (
                                    <Box as="form" action={revokeGuestPins} flex={1}>
                                      <input type="hidden" name="guestId" value={guest.guestId} />
                                      <Button
                                        type="submit"
                                        size="sm"
                                        w="100%"
                                        borderRadius="lg"
                                        bg="rgba(239, 68, 68, 0.2)"
                                        border="1px solid"
                                        borderColor="rgba(239, 68, 68, 0.3)"
                                        px={3}
                                        py={2}
                                        fontSize="xs"
                                      >
                                        Revoca tutti i PIN
                                      </Button>
                                    </Box>
                                  )}
                                  <Box as="form" action={createGuestPin} flex={1}>
                                    <input type="hidden" name="guestId" value={guest.guestId} />
                                    <Button
                                      type="submit"
                                      size="sm"
                                      w="100%"
                                      borderRadius="lg"
                                      bg="rgba(6, 182, 212, 0.2)"
                                      border="1px solid"
                                      borderColor="rgba(6, 182, 212, 0.3)"
                                      px={3}
                                      py={2}
                                      fontSize="xs"
                                    >
                                      Crea nuovo PIN
                                    </Button>
                                  </Box>
                                </HStack>
                              </Box>
                            </VStack>
                          </CardBody>
                        </Card>
                      );
                    })}
                  </VStack>
                )}

                {/* Form per aggiungere nuovo ospite */}
                <Box mt={4} pt={4} borderTop="1px solid" borderColor="var(--border-light)">
                  <Text fontSize="sm" fontWeight="semibold" mb={3}>
                    Aggiungi nuovo ospite
                  </Text>
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
                      <Box as="form" action={addGuest}>
                        <VStack spacing={3} align="stretch">
                          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={2}>
                            <Field.Root>
                              <Field.Label fontSize="11px" opacity={0.6} mb={1}>
                                Nome <Text as="span" color="var(--accent-error)">*</Text>
                              </Field.Label>
                              <ChakraInput
                                type="text"
                                name="firstName"
                                required
                                placeholder="Nome"
                                borderRadius="xl"
                                bg="var(--bg-secondary)"
                                border="1px solid"
                                borderColor="var(--border-light)"
                                p={2}
                                fontSize="sm"
                              />
                            </Field.Root>
                            <Field.Root>
                              <Field.Label fontSize="11px" opacity={0.6} mb={1}>
                                Cognome <Text as="span" color="var(--accent-error)">*</Text>
                              </Field.Label>
                              <ChakraInput
                                type="text"
                                name="lastName"
                                required
                                placeholder="Cognome"
                                borderRadius="xl"
                                bg="var(--bg-secondary)"
                                border="1px solid"
                                borderColor="var(--border-light)"
                                p={2}
                                fontSize="sm"
                              />
                            </Field.Root>
                          </Grid>
                          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={2}>
                            <Field.Root>
                              <Field.Label fontSize="11px" opacity={0.6} mb={1}>
                                Telefono <Text as="span" color="var(--accent-error)">*</Text>
                              </Field.Label>
                              <ChakraInput
                                type="tel"
                                name="phone"
                                required
                                placeholder="+39 123 456 7890"
                                borderRadius="xl"
                                bg="var(--bg-secondary)"
                                border="1px solid"
                                borderColor="var(--border-light)"
                                p={2}
                                fontSize="sm"
                              />
                            </Field.Root>
                            <Field.Root>
                              <Field.Label fontSize="11px" opacity={0.6} mb={1}>Email (opzionale)</Field.Label>
                              <ChakraInput
                                type="email"
                                name="email"
                                placeholder="email@example.com"
                                borderRadius="xl"
                                bg="var(--bg-secondary)"
                                border="1px solid"
                                borderColor="var(--border-light)"
                                p={2}
                                fontSize="sm"
                              />
                            </Field.Root>
                          </Grid>
                          <Button
                            type="submit"
                            w="100%"
                            borderRadius="xl"
                            bg="rgba(6, 182, 212, 0.3)"
                            border="1px solid"
                            borderColor="rgba(6, 182, 212, 0.3)"
                            p={2}
                            fontWeight="semibold"
                          >
                            Aggiungi ospite
                          </Button>
                          <Text fontSize="xs" opacity={0.5}>
                            Un PIN di accesso verrà creato automaticamente per il nuovo ospite.
                          </Text>
                        </VStack>
                      </Box>
                    );
                  })()}
                </Box>
              </VStack>
            </CardBody>
          </Card>

          {/* Cleaner PINs section */}
          <Card>
            <CardBody p={4}>
              <VStack spacing={4} align="stretch">
                <Text fontSize="sm" opacity={0.7} mb={3}>
                  PIN Cleaner
                </Text>
                {(() => {
                  const cleanerPins = pins.filter((p: any) => p.role === "cleaner" && p.stayId === stayId);
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
                    <VStack spacing={4} align="stretch">
                      {/* Lista PIN esistenti */}
                      {cleanerPins.length === 0 ? (
                        <Text fontSize="sm" opacity={0.6}>
                          Nessun PIN cleaner attivo per questo soggiorno.
                        </Text>
                      ) : (
                        <VStack spacing={2} align="stretch">
                          {cleanerPins.map((p: any) => {
                            const vFrom = p.validFrom ?? p.createdAt;
                            const vTo = p.validTo ?? p.expiresAt;

                            return (
                              <Card key={p.pin} variant="outlined">
                                <CardBody p={3}>
                                  <HStack justify="space-between" gap={3} align="start">
                                    <Box minW={0} flex={1}>
                                      <Text fontWeight="semibold" letterSpacing="widest" fontSize="sm">
                                        {p.pin}
                                      </Text>
                                      <Text mt={1} fontSize="xs" opacity={0.6}>
                                        {p.guestName || "Cleaner"} • {p.source ?? "manual"}
                                      </Text>
                                      <Text mt={1} fontSize="xs" opacity={0.5}>
                                        Valido: {fmtDT(vFrom)} → {fmtDT(vTo)}
                                      </Text>
                                      <Text mt={1} fontSize="xs" opacity={0.5}>
                                        Scade tra: {timeLeftDHM(vTo ?? 0)}
                                      </Text>
                                    </Box>
                                    <Box as="form" action={revokeCleanerPin}>
                                      <input type="hidden" name="pin" value={p.pin} />
                                      <Button
                                        type="submit"
                                        size="sm"
                                        borderRadius="lg"
                                        bg="rgba(239, 68, 68, 0.2)"
                                        border="1px solid"
                                        borderColor="rgba(239, 68, 68, 0.3)"
                                        _hover={{ bg: "rgba(239, 68, 68, 0.3)" }}
                                        px={3}
                                        py={2}
                                        fontSize="xs"
                                        whiteSpace="nowrap"
                                      >
                                        Revoca
                                      </Button>
                                    </Box>
                                  </HStack>
                                </CardBody>
                              </Card>
                            );
                          })}
                        </VStack>
                      )}

                      {/* Form per creare nuovo PIN */}
                      {assignedCleaner ? (
                        <Card variant="outlined">
                          <CardBody p={4}>
                            <VStack spacing={3} align="stretch">
                              <Text fontSize="sm" fontWeight="semibold" mb={3}>
                                Crea nuovo PIN cleaner
                              </Text>
                              <Box as="form" action={createCleanerPin}>
                                <VStack spacing={3} align="stretch">
                                  <input type="hidden" name="stayId" value={stayId} />

                                  <Box>
                                    <Text fontSize="11px" opacity={0.6} mb={1}>
                                      Cleaner assegnato
                                    </Text>
                                    <Box
                                      w="100%"
                                      borderRadius="xl"
                                      bg="var(--bg-secondary)"
                                      border="1px solid"
                                      borderColor="var(--border-light)"
                                      p={2}
                                      fontSize="sm"
                                      fontWeight="semibold"
                                    >
                                      {assignedCleaner}
                                    </Box>
                                    <Text mt={1} fontSize="xs" opacity={0.5}>
                                      Il cleaner è stato assegnato automaticamente alla creazione del soggiorno.
                                    </Text>
                                  </Box>

                                  <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={3}>
                                    <Field.Root>
                                      <Field.Label fontSize="11px" opacity={0.6} mb={1}>
                                        Validità da (data + ora)
                                      </Field.Label>
                                      <ChakraInput
                                        type="datetime-local"
                                        name="validFrom"
                                        required
                                        borderRadius="xl"
                                        bg="var(--bg-secondary)"
                                        border="1px solid"
                                        borderColor="var(--border-light)"
                                        p={2}
                                      />
                                    </Field.Root>
                                    <Field.Root>
                                      <Field.Label fontSize="11px" opacity={0.6} mb={1}>
                                        Validità fino a (data + ora)
                                      </Field.Label>
                                      <ChakraInput
                                        type="datetime-local"
                                        name="validTo"
                                        required
                                        borderRadius="xl"
                                        bg="var(--bg-secondary)"
                                        border="1px solid"
                                        borderColor="var(--border-light)"
                                        p={2}
                                      />
                                    </Field.Root>
                                  </Grid>

                                  <Button
                                    type="submit"
                                    w="100%"
                                    borderRadius="xl"
                                    bg="rgba(6, 182, 212, 0.3)"
                                    border="1px solid"
                                    borderColor="rgba(6, 182, 212, 0.3)"
                                    p={2}
                                    fontWeight="semibold"
                                  >
                                    Crea PIN cleaner
                                  </Button>
                                </VStack>
                              </Box>
                            </VStack>
                          </CardBody>
                        </Card>
                      ) : (
                        <Card variant="outlined">
                          <CardBody p={4}>
                            <Text fontSize="sm" opacity={0.6}>
                              Nessun cleaner assegnato a questo soggiorno.
                            </Text>
                          </CardBody>
                        </Card>
                      )}
                    </VStack>
                  );
                })()}
              </VStack>
            </CardBody>
          </Card>

          {/* PIN list */}
          <Card>
            <CardBody p={4}>
              <VStack spacing={3} align="stretch">
                <Text fontSize="sm" opacity={0.7} mb={3}>
                  PIN attivi
                </Text>

                {pins.length === 0 ? (
                  <Text fontSize="sm" opacity={0.5}>
                    Nessun PIN attivo per questo stay.
                  </Text>
                ) : (
                  <VStack spacing={2} align="stretch">
                    {pins.map((p: any) => {
                      const vFrom = p.validFrom ?? p.createdAt;
                      const vTo = p.validTo ?? p.expiresAt;

                      return (
                        <PinCollapsible
                          key={p.pin}
                          pin={p.pin}
                          role={p.role}
                          source={p.source ?? "manual"}
                          guestName={p.guestName}
                          stayId={p.stayId}
                          validFrom={vFrom}
                          validTo={vTo}
                          timeLeft={timeLeftDHM(vTo ?? 0)}
                          revokeAction={delPin}
                        />
                      );
                    })}
                  </VStack>
                )}
              </VStack>
            </CardBody>
          </Card>

          {/* Cleaning Jobs section */}
          <Card>
            <CardBody p={4}>
              <VStack spacing={3} align="stretch">
                <Text fontSize="sm" opacity={0.7} mb={3}>
                  Pulizie assegnate
                </Text>

                {jobs.length === 0 ? (
                  <Text fontSize="sm" opacity={0.5}>
                    Nessuna pulizia assegnata registrata per questo appartamento.
                  </Text>
                ) : (
                  <VStack spacing={3} align="stretch">
                    {jobs.map((job: CleaningJob) => {
                      const statusVariant: Record<CleaningStatus, "warning" | "info" | "success" | "error"> = {
                        todo: "warning",
                        in_progress: "info",
                        done: "success",
                        problem: "error",
                      };

                      const statusLabels: Record<CleaningStatus, string> = {
                        todo: "Da fare",
                        in_progress: "In corso",
                        done: "Completato",
                        problem: "Problema",
                      };

                      return (
                        <Card key={job.id} variant="outlined">
                          <CardBody p={4}>
                            <VStack spacing={3} align="stretch">
                              <HStack justify="space-between" gap={3} mb={3} align="start">
                                <Box minW={0} flex={1}>
                                  <Text fontSize="sm" fontWeight="semibold">
                                    {job.aptName}
                                  </Text>
                                  <Text mt={1} fontSize="xs" opacity={0.6}>
                                    {job.windowLabel}
                                  </Text>
                                  {job.finalPhotos && job.finalPhotos.length > 0 && (
                                    <Text mt={2} fontSize="xs" opacity={0.7}>
                                      📷 {job.finalPhotos.length} foto finali
                                    </Text>
                                  )}
                                  {job.status === "problem" && job.problemNote && (
                                    <Box mt={2} fontSize="xs" color="rgba(254, 226, 226, 1)" bg="rgba(239, 68, 68, 0.1)" border="1px solid" borderColor="rgba(239, 68, 68, 0.2)" borderRadius="md" px={2} py={1}>
                                      ⚠️ {job.problemNote.length > 50 ? job.problemNote.substring(0, 50) + "..." : job.problemNote}
                                    </Box>
                                  )}
                                </Box>
                                <Badge
                                  variant={statusVariant[job.status]}
                                  size="sm"
                                  px={3}
                                  py={1}
                                  borderRadius="lg"
                                  fontSize="xs"
                                  fontWeight="semibold"
                                >
                                  {statusLabels[job.status]}
                                </Badge>
                              </HStack>

                              {job.startedAt && (
                                <Text mt={2} fontSize="xs" opacity={0.6}>
                                  Iniziato: {fmtDT(job.startedAt)}
                                </Text>
                              )}
                              {job.completedAt && (
                                <Text mt={1} fontSize="xs" opacity={0.6}>
                                  Completato: {fmtDT(job.completedAt)}
                                </Text>
                              )}

                              {job.checklist && job.checklist.length > 0 && (
                                <Box mt={3} pt={3} borderTop="1px solid" borderColor="var(--border-light)">
                                  <Text fontSize="xs" opacity={0.6} mb={2}>
                                    Checklist
                                  </Text>
                                  <VStack spacing={1} align="stretch">
                                    {job.checklist.map((item) => (
                                      <HStack key={item.id} spacing={2} fontSize="xs">
                                        <Box
                                          w={4}
                                          h={4}
                                          borderRadius="md"
                                          border="2px solid"
                                          borderColor={item.done ? "rgba(16, 185, 129, 0.5)" : "var(--border-light)"}
                                          bg={item.done ? "rgba(16, 185, 129, 0.3)" : "var(--bg-secondary)"}
                                          display="flex"
                                          alignItems="center"
                                          justifyContent="center"
                                        >
                                          {item.done && (
                                            <CheckIcon size={12} color="rgba(16, 185, 129, 1)" />
                                          )}
                                        </Box>
                                        <Text textDecoration={item.done ? "line-through" : "none"} opacity={item.done ? 0.5 : 1}>
                                          {item.label}
                                        </Text>
                                      </HStack>
                                    ))}
                                  </VStack>
                                </Box>
                              )}

                              <Box mt={3} pt={3} borderTop="1px solid" borderColor="var(--border-light)">
                                <Button
                                  as={Link}
                                  href={`/app/host/job/${encodeURIComponent(job.id)}`}
                                  size="sm"
                                  borderRadius="lg"
                                  variant="secondary"
                                  px={3}
                                  py={2}
                                  fontSize="xs"
                                >
                                  Vedi dettaglio pulizia assegnata →
                                </Button>
                              </Box>
                            </VStack>
                          </CardBody>
                        </Card>
                      );
                    })}
                  </VStack>
                )}
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Box>
    </AppLayout>
  );
}
