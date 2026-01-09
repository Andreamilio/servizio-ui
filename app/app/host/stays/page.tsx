import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { readSession, validateSessionUser } from '@/app/lib/session';
import * as Store from '@/app/lib/store';
import { listClients, listApartmentsByClient, getApartment } from '@/app/lib/clientStore';
import { getUser } from '@/app/lib/userStore';
import { AppLayout } from '@/app/components/layouts/AppLayout';

import { cleaners_getCfg, cleaners_normName } from '@/app/lib/domain/cleanersDomain';

import { stays_listByApt } from '@/app/lib/domain/staysDomain';

import { stays_createWithGuestsAndCleaner } from '@/app/lib/domain/pinsDomain';
import { CreateStayModal } from '../components/CreateStayModal';
import { Box, VStack, HStack, Heading, Text } from "@chakra-ui/react";
import { Card, CardBody, CardHeader } from "@/app/components/ui/Card";
import { Link } from "@/app/components/ui/Link";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type SP = Record<string, string | string[] | undefined>;

function pick(sp: SP, key: string) {
    const v = sp[key];
    return typeof v === 'string' ? v : Array.isArray(v) ? v[0] : undefined;
}

function parseDateTimeLocal(v?: string | null) {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
}

function fmtDT(ts?: number | null) {
    if (!ts) return '—';
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, '0');
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

export default async function HostStaysPage({ searchParams }: { searchParams?: SP | Promise<SP> }) {
    const sp = ((await Promise.resolve(searchParams as any)) ?? {}) as SP;
    const aptId = pick(sp, 'apt') ?? '';

    const cookieStore = await cookies();
    const sess = cookieStore.get('sess')?.value;
    const session = readSession(sess);
    const me = validateSessionUser(session);

    if (!me || me.role !== 'host') {
        return (
            <Box p={6} color="var(--text-primary)">
                Non autorizzato
            </Box>
        );
    }

    if (!aptId) {
        redirect('/app/host');
        return;
    }

    // Get client info
    const hostUser = getUser(me.userId ?? '');
    const hostUserClientId = hostUser?.clientId ?? '';

    const availableClients = listClients() as any[];
    const getClientId = (c: any) => String(c?.id ?? c?.clientId ?? c?.clientID ?? c?.slug ?? '');
    const urlClientId = pick(sp, 'client')?.trim();
    const wantedClientId = hostUserClientId || urlClientId || undefined;
    const client = wantedClientId ? availableClients.find((c) => getClientId(c) === wantedClientId) ?? null : null;

    const clientId = client ? getClientId(client) : (hostUserClientId || urlClientId || '');

    // Get apartment
    const apartment = getApartment(aptId);
    if (!apartment) {
        redirect('/app/host');
        return;
    }

    const stays = stays_listByApt(aptId);

    const hostUserForLayout = getUser(me.userId ?? '');

    async function createStay(formData: FormData) {
        'use server';
        const aptId = formData.get('aptId')?.toString() ?? '';
        if (!aptId) return;

        const checkin = (formData.get('checkin')?.toString() ?? '').trim();
        const checkout = (formData.get('checkout')?.toString() ?? '').trim();
        const guestsCount = Math.max(1, Math.min(10, Number(formData.get('guests')?.toString() ?? '2') || 2));

        const selectedCleaner = cleaners_normName(formData.get('cleaner')?.toString() ?? '');

        if (!selectedCleaner) {
            redirect(`/app/host/stays?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`);
            return;
        }

        const ci = parseDateTimeLocal(checkin);
        const co = parseDateTimeLocal(checkout);

        if (!ci || !co || co.getTime() <= ci.getTime()) {
            redirect(`/app/host/stays?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`);
            return;
        }

        const guests: Array<{ firstName: string; lastName: string; phone: string; email?: string }> = [];

        const allKeys = Array.from(formData.keys());
        const guestIndices = new Set<number>();

        for (const key of allKeys) {
            const match = key.match(/^guest_(\d+)_firstName$/);
            if (match) {
                guestIndices.add(parseInt(match[1], 10));
            }
        }

        const indicesToCheck = guestIndices.size > 0 ? Array.from(guestIndices).sort((a, b) => a - b) : Array.from({ length: guestsCount }, (_, i) => i + 1);

        for (const i of indicesToCheck) {
            const firstName = (formData.get(`guest_${i}_firstName`)?.toString() ?? '').trim();
            const lastName = (formData.get(`guest_${i}_lastName`)?.toString() ?? '').trim();
            const phone = (formData.get(`guest_${i}_phone`)?.toString() ?? '').trim();
            const email = (formData.get(`guest_${i}_email`)?.toString() ?? '').trim();

            if (!firstName && !lastName && !phone) {
                continue;
            }

            if ((firstName || lastName || phone) && (!firstName || !lastName || !phone)) {
                redirect(`/app/host/stays?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`);
                return;
            }

            if (firstName && lastName && phone) {
                guests.push({
                    firstName,
                    lastName,
                    phone,
                    email: email || undefined,
                });
            }
        }

        if (guests.length === 0) {
            redirect(`/app/host/stays?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`);
            return;
        }

        const vf = ci.getTime();
        const vt = co.getTime();

        let st;
        try {
            st = stays_createWithGuestsAndCleaner(Store, {
                aptId,
                checkInAt: vf,
                checkOutAt: vt,
                guests,
                cleanerName: selectedCleaner,
            });
        } catch (error) {
            console.error('Errore nella creazione dello stay:', error);
            redirect(`/app/host/stays?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`);
            return;
        }

        if (!st || !st.stayId) {
            console.error('Stay non creato correttamente:', { st, guests, aptId, vf, vt, selectedCleaner });
            redirect(`/app/host/stays?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`);
            return;
        }

        const verifyStay = stays_listByApt(aptId).find((s: any) => s.stayId === st.stayId);
        if (!verifyStay) {
            console.error('Stay creato ma non trovato nella lista:', st.stayId);
        }

        redirect(`/app/host/stay/${encodeURIComponent(st.stayId)}?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`);
    }

    return (
        <AppLayout 
            role="host"
            userInfo={hostUserForLayout ? {
                userId: hostUserForLayout.userId,
                username: hostUserForLayout.username,
                profileImageUrl: hostUserForLayout.profileImageUrl,
            } : undefined}
        >
            <Box maxW="3xl" mx="auto" p={{ base: 4, sm: 6 }}>
                <VStack spacing={5} align="stretch">
                    <HStack justify="space-between" gap={3}>
                        <Box>
                            <Link
                                href={`/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`}
                                fontSize="sm"
                                opacity={0.7}
                                _hover={{ opacity: 1 }}
                            >
                                ← Torna alla dashboard
                            </Link>
                            <Box mt={2}>
                                <Heading as="h2" size="lg" fontWeight="semibold">
                                    Soggiorni
                                </Heading>
                                <Text fontSize="sm" opacity={0.7}>
                                    {apartment.name}
                                </Text>
                            </Box>
                        </Box>
                    </HStack>

                    {/* Stay list */}
                    <Card>
                        <CardBody p={4}>
                            <VStack spacing={3} align="stretch">
                                <HStack justify="space-between" gap={3} mb={3}>
                                    <Text fontSize="sm" opacity={0.7}>
                                        Soggiorni
                                    </Text>
                                    <Text fontSize="xs" opacity={0.5}>
                                        {stays.length} stay
                                    </Text>
                                </HStack>

                                {stays.length === 0 ? (
                                    <Text fontSize="sm" opacity={0.6} mb={4}>
                                        Nessun soggiorno registrato.
                                    </Text>
                                ) : (
                                    <VStack spacing={2} align="stretch" mb={4}>
                                        {stays.map((st: any) => {
                                            const sid = String(st?.stayId ?? '');
                                            const g = Array.isArray(st?.guests) ? st.guests.length : 0;
                                            const checkin = st?.checkInAt ? fmtDTMedium(st.checkInAt) : '—';
                                            const checkout = st?.checkOutAt ? fmtDTMedium(st.checkOutAt) : '—';
                                            const responsabileName = getResponsabileName(st?.guests || []);
                                            const stayTitle = `${responsabileName} - ${checkin} - ${checkout}`;

                                            return (
                                                <Box
                                                    key={sid}
                                                    as={Link}
                                                    href={`/app/host/stay/${encodeURIComponent(sid)}?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`}
                                                    display="block"
                                                    borderRadius="xl"
                                                    bg="var(--bg-secondary)"
                                                    border="1px solid"
                                                    borderColor="var(--border-light)"
                                                    p={3}
                                                    _hover={{ borderColor: "var(--border-medium)" }}
                                                    transition="colors"
                                                >
                                                    <HStack justify="space-between" gap={3}>
                                                        <Box minW={0} flex={1}>
                                                            <Text fontWeight="semibold" fontSize="sm" isTruncated>
                                                                {stayTitle}
                                                            </Text>
                                                            {g > 0 && (
                                                                <Text mt={1} fontSize="xs" opacity={0.5}>
                                                                    {g} ospiti
                                                                </Text>
                                                            )}
                                                        </Box>
                                                        <Text fontSize="xs" opacity={0.5}>→</Text>
                                                    </HStack>
                                                </Box>
                                            );
                                        })}
                                    </VStack>
                                )}

                                {/* Bottone per aprire modale creazione soggiorno */}
                                <Box pt={4}>
                                    {(() => {
                                        const cfg = cleaners_getCfg(aptId);
                                        return (
                                            <CreateStayModal
                                                aptId={aptId}
                                                clientId={clientId}
                                                cleaners={cfg.cleaners}
                                                createStayAction={createStay}
                                            />
                                        );
                                    })()}
                                </Box>
                            </VStack>
                        </CardBody>
                    </Card>
                </VStack>
            </Box>
        </AppLayout>
    );
}
