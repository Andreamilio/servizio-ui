import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { readSession, validateSessionUser } from '@/app/lib/session';
import * as Store from '@/app/lib/store';
import { listJobsByApt } from '@/app/lib/cleaningstore';
import { listClients, listApartmentsByClient, getApartment, updateApartment } from '@/app/lib/clientStore';
import { getUser } from '@/app/lib/userStore';
import { AppLayout } from '@/app/components/layouts/AppLayout';
import { ApartmentSearchForm } from './components/ApartmentSearchForm';
import { UserProfile } from '../components/UserProfile';

import { stays_createWithOptionalCleaner } from '@/app/lib/domain/pinsDomain';
import { getAllEnabledDevices, getDeviceState, getDeviceLabel } from '@/app/lib/devicePackageStore';
import { Box, VStack, HStack, Heading, Text, Grid, GridItem } from "@chakra-ui/react";
import { Badge } from "@/app/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/app/components/ui/Card";
import { Link } from "@/app/components/ui/Link";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { Textarea } from "@/app/components/ui/Textarea";
import { StatusPill } from "@/app/components/ui/StatusPill";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type SP = Record<string, string | string[] | undefined>;

function pick(sp: SP, key: string) {
    const v = sp[key];
    return typeof v === 'string' ? v : Array.isArray(v) ? v[0] : undefined;
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
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtDT(ts?: number | null) {
    if (!ts) return '—';
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getDoorUi(aptId: string): { label: string; tone: 'open' | 'closed' | 'unknown' } {
    const log = Store.listAccessLogByApt(aptId, 50) ?? [];
    const last = log.find((e: any) => e?.type === 'door_opened' || e?.type === 'door_closed');
    if (!last) return { label: 'BLOCCATA', tone: 'closed' };
    if (last.type === 'door_opened') return { label: 'SBLOCCATA', tone: 'open' };
    return { label: 'BLOCCATA', tone: 'closed' };
}


type AptHealth = {
    aptId: string;
    name: string;
    status: 'ok' | 'warn' | 'crit';
    readiness: 'Pronto check-in ✅' | 'Da pulire' | 'Pulizia in corso' | 'Problema';
    lastEvent: string;
};

function computeHealth(aptId: string, name: string): AptHealth {
    const jobs = listJobsByApt(aptId);
    const hasProblem = jobs.some((j) => j.status === 'problem');
    const hasInProgress = jobs.some((j) => j.status === 'in_progress');
    const hasTodo = jobs.some((j) => j.status === 'todo');

    const readiness = hasProblem ? 'Problema' : hasInProgress ? 'Pulizia in corso' : hasTodo ? 'Da pulire' : 'Pronto check-in ✅';

    const status: AptHealth['status'] = hasProblem ? 'crit' : hasInProgress ? 'warn' : 'ok';

    const lastEvent = hasProblem ? 'Pulizia segnalata come problema' : hasInProgress ? 'Pulizia avviata' : hasTodo ? 'In attesa pulizie' : 'Operativo';

    return { aptId, name, status, readiness, lastEvent };
}

export default async function HostPage({ searchParams }: { searchParams?: SP | Promise<SP> }) {
    const sp = ((await Promise.resolve(searchParams as any)) ?? {}) as SP;
    const q = (pick(sp, 'q') ?? '').trim().toLowerCase();
    const aptSelected = pick(sp, 'apt');

    const cookieStore = await cookies();
    const sess = cookieStore.get('sess')?.value;
    const session = readSession(sess);
    const me = validateSessionUser(session);

    if (!me || me.role !== 'host') {
        if (session && session.userId && session.role === 'host') {
            redirect('/api/auth/logout');
        }
        return (
            <Box p={6} color="var(--text-primary)">
                Non autorizzato
            </Box>
        );
    }

    const clients = (listClients() as any[]) ?? [];
    const getClientId = (c: any) => String(c?.id ?? c?.clientId ?? c?.clientID ?? c?.slug ?? '');
    
    const hostUser = me.userId ? getUser(me.userId) : null;
    const hostUserClientId = hostUser?.clientId;
    
    const availableClients = hostUserClientId 
      ? clients.filter((c) => getClientId(c) === hostUserClientId)
      : clients;
    
    const urlClientId = pick(sp, 'client')?.trim();
    const wantedClientId = hostUserClientId || urlClientId || undefined;
    const client = wantedClientId ? availableClients.find((c) => getClientId(c) === wantedClientId) ?? null : null;

    const clientId = client ? getClientId(client) : (hostUserClientId || urlClientId || '');
    
    const apartments = clientId
        ? (listApartmentsByClient(clientId) as any[]).map((a) => ({
              aptId: String(a?.aptId ?? a?.id ?? a?.apt ?? ''),
              name: String(a?.aptName ?? a?.name ?? a?.title ?? `Apt ${a?.aptId ?? a?.id ?? ''}`),
          }))
        : (listClients() as any[]).flatMap((c) => 
            (listApartmentsByClient(getClientId(c)) as any[]).map((a) => ({
              aptId: String(a?.aptId ?? a?.id ?? a?.apt ?? ''),
              name: String(a?.aptName ?? a?.name ?? a?.title ?? `Apt ${a?.aptId ?? a?.id ?? ''}`),
            }))
          );

    const orgLabel = 'Global Properties';

    const healthAll = apartments.map((a) => computeHealth(a.aptId, a.name));
    const healthFiltered = q ? healthAll.filter((a) => a.aptId.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)) : healthAll;

    const total = healthAll.length;
    const ok = healthAll.filter((a) => a.status === 'ok').length;
    const warn = healthAll.filter((a) => a.status === 'warn').length;
    const crit = healthAll.filter((a) => a.status === 'crit').length;

    const criticalFirst = healthAll.filter((a) => a.status === 'crit').slice(0, 5);

    // -------------------------
    // Apartment detail
    // -------------------------
    if (aptSelected) {
        const aptId = String(aptSelected);
        const apt = apartments.find((x) => x.aptId === aptId);
        const health = apt ? computeHealth(aptId, apt.name) : null;
        const apartmentDetails = getApartment(aptId);

        const doorUi = getDoorUi(aptId);
        const allAccessEvents = Store.listAccessLogByApt(aptId, 20) ?? [];
        const accessEvents = allAccessEvents.filter((e: any) => e.type !== 'wan_switched' && e.type !== 'vpn_toggled');

        async function actOpenDoor() {
            'use server';
            Store.logAccessEvent(aptId, 'door_opened', '[host] Porta sbloccata');
            revalidatePath('/app/host');
            redirect(`/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}&r=${Date.now()}`);
        }

        async function actCloseDoor() {
            'use server';
            Store.logAccessEvent(aptId, 'door_closed', '[host] Porta chiusa');
            revalidatePath('/app/host');
            redirect(`/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}&r=${Date.now()}`);
        }

        async function actOpenGate() {
            'use server';
            Store.logAccessEvent(aptId, 'gate_opened', '[host] Portone sbloccato');
            revalidatePath('/app/host');
            redirect(`/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}&r=${Date.now()}`);
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
                                <Text fontSize="xs" opacity={0.6}>Host • Dettaglio appartamento</Text>
                                <Heading as="h1" size="lg" fontWeight="semibold">
                                    {apt?.name ?? (aptId ? `Apt ${aptId}` : 'Apt')}
                                </Heading>
                            </Box>

                            <HStack spacing={{ base: 2, sm: 3 }} flexWrap="wrap" justify="end">
                                <Link
                                    href={clientId ? `/app/host?client=${encodeURIComponent(clientId)}` : '/app/host'}
                                    fontSize="sm"
                                    opacity={0.7}
                                    _hover={{ opacity: 1 }}
                                    whiteSpace={{ base: "normal", sm: "nowrap" }}
                                >
                                    ← Dashboard
                                </Link>
                            </HStack>
                        </HStack>

                        <Card>
                            <CardBody p={4}>
                                <HStack justify="space-between" gap={3}>
                                    <Box>
                                        <Text fontSize="sm" opacity={0.7}>Stato operativo</Text>
                                        <Text mt={1} fontWeight="semibold">
                                            {health?.readiness ?? '—'}
                                        </Text>

                                        <Text mt={2} fontSize="sm" opacity={0.7}>Porta</Text>
                                        <Badge
                                            variant={doorUi.tone === 'open' ? 'success' : doorUi.tone === 'closed' ? 'default' : 'warning'}
                                            size="sm"
                                            display="inline-flex"
                                            alignItems="center"
                                            gap={2}
                                            borderRadius="xl"
                                            px={3}
                                            py={1.5}
                                            mt={1}
                                        >
                                            <Box
                                                w={2}
                                                h={2}
                                                borderRadius="full"
                                                bg={
                                                    doorUi.tone === 'open' 
                                                        ? 'var(--accent-success)' 
                                                        : doorUi.tone === 'closed' 
                                                        ? 'var(--text-tertiary)' 
                                                        : 'var(--accent-warning)'
                                                }
                                            />
                                            {doorUi.label}
                                        </Badge>
                                    </Box>
                                    <Box textAlign="right">
                                        <Text fontSize="sm" opacity={0.7}>Ultimo evento</Text>
                                        <Text mt={1} fontSize="sm" opacity={0.9}>
                                            {health?.lastEvent ?? '—'}
                                        </Text>
                                    </Box>
                                </HStack>

                                <HStack spacing={2} mt={4} flexWrap="wrap">
                                    {doorUi.tone !== 'unknown' && (
                                        <Box as="form" action={doorUi.tone === 'open' ? actCloseDoor : actOpenDoor}>
                                            <Button
                                                type="submit"
                                                borderRadius="xl"
                                                px={4}
                                                py={2}
                                                fontSize="sm"
                                                fontWeight="semibold"
                                                bg={doorUi.tone === 'open' ? 'var(--bg-secondary)' : 'rgba(16, 185, 129, 0.25)'}
                                                _hover={{ bg: doorUi.tone === 'open' ? 'var(--bg-tertiary)' : 'rgba(16, 185, 129, 0.35)' }}
                                                border="1px solid"
                                                borderColor={doorUi.tone === 'open' ? 'var(--border-light)' : 'rgba(16, 185, 129, 0.3)'}
                                            >
                                                {doorUi.tone === 'open' ? 'Chiudi porta' : 'Apri porta'}
                                            </Button>
                                        </Box>
                                    )}

                                    <Box as="form" action={actOpenGate}>
                                        <Button
                                            type="submit"
                                            borderRadius="xl"
                                            px={4}
                                            py={2}
                                            fontSize="sm"
                                            fontWeight="semibold"
                                            bg="rgba(16, 185, 129, 0.25)"
                                            _hover={{ bg: "rgba(16, 185, 129, 0.35)" }}
                                            border="1px solid"
                                            borderColor="rgba(16, 185, 129, 0.3)"
                                        >
                                            Apri portone
                                        </Button>
                                    </Box>

                                    <Button
                                        as={Link}
                                        href={aptId 
                                            ? `/app/host/support?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`
                                            : clientId
                                            ? `/app/host/support?client=${encodeURIComponent(clientId)}`
                                            : '/app/host/support'
                                        }
                                        borderRadius="xl"
                                        bg="var(--bg-card)"
                                        border="1px solid"
                                        borderColor="var(--border-light)"
                                        px={4}
                                        py={2}
                                        fontSize="sm"
                                        opacity={0.9}
                                    >
                                        Supporto
                                    </Button>
                                </HStack>
                            </CardBody>
                        </Card>

                        {/* Dettagli Appartamento */}
                        <Card>
                            <CardBody p={4}>
                                <Text fontSize="sm" fontWeight="semibold" mb={4}>Dettagli Appartamento</Text>
                                <Box
                                    as="form"
                                    action={async (formData: FormData) => {
                                        'use server';
                                        const aptId = formData.get('aptId')?.toString() ?? '';
                                        if (!aptId) return;

                                        const wifiSsid = (formData.get('wifiSsid')?.toString() ?? '').trim() || undefined;
                                        const wifiPass = (formData.get('wifiPass')?.toString() ?? '').trim() || undefined;
                                        const rulesText = (formData.get('rules')?.toString() ?? '').trim();
                                        const rules = rulesText ? rulesText.split('\n').filter((r) => r.trim().length > 0) : undefined;
                                        const supportContacts = (formData.get('supportContacts')?.toString() ?? '').trim() || undefined;

                                        updateApartment(aptId, {
                                            wifiSsid,
                                            wifiPass,
                                            rules,
                                            supportContacts,
                                        });

                                        revalidatePath('/app/host');
                                        redirect(`/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}&r=${Date.now()}`);
                                    }}
                                >
                                    <VStack spacing={4} align="stretch">
                                        <input type='hidden' name='aptId' value={aptId} />

                                        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4}>
                                            <Input
                                                type='text'
                                                name='wifiSsid'
                                                label="Wi-Fi SSID"
                                                defaultValue={apartmentDetails?.wifiSsid ?? ''}
                                                placeholder='Nome rete Wi-Fi'
                                            />
                                            <Input
                                                type='text'
                                                name='wifiPass'
                                                label="Wi-Fi Password"
                                                defaultValue={apartmentDetails?.wifiPass ?? ''}
                                                placeholder='Password Wi-Fi'
                                            />
                                        </Grid>

                                        <Textarea
                                            name='rules'
                                            label="House Rules (una per riga)"
                                            rows={4}
                                            defaultValue={apartmentDetails?.rules?.join('\n') ?? ''}
                                            placeholder='No smoking&#10;Silenzio dopo le 22:30'
                                        />

                                        <Textarea
                                            name='supportContacts'
                                            label="Contatti Supporto"
                                            rows={2}
                                            defaultValue={apartmentDetails?.supportContacts ?? ''}
                                            placeholder='Telefono, email, ecc.'
                                        />

                                        <HStack spacing={3} pt={2} borderTop="1px solid" borderColor="var(--border-light)">
                                            <Button
                                                type='submit'
                                                borderRadius="xl"
                                                bg="rgba(6, 182, 212, 0.2)"
                                                _hover={{ bg: "rgba(6, 182, 212, 0.3)" }}
                                                border="1px solid"
                                                borderColor="rgba(6, 182, 212, 0.3)"
                                                px={6}
                                                py={3}
                                                fontWeight="semibold"
                                                fontSize="sm"
                                            >
                                                Salva Dettagli
                                            </Button>
                                        </HStack>
                                    </VStack>
                                </Box>
                            </CardBody>
                        </Card>

                        {/* Device Status */}
                        <Card>
                            <CardBody p={4}>
                                <Text fontSize="sm" fontWeight="semibold" mb={4}>Device</Text>
                                {(() => {
                                    const enabledDevices = getAllEnabledDevices(aptId);
                                    
                                    if (enabledDevices.length === 0) {
                                        return (
                                            <Box textAlign="center" py={4}>
                                                <Text fontSize="sm" opacity={0.6}>
                                                    Nessun device configurato per questo appartamento.
                                                </Text>
                                                <Text fontSize="xs" opacity={0.5} mt={1}>
                                                    I device vengono configurati dalla sezione Tech.
                                                </Text>
                                            </Box>
                                        );
                                    }

                                    return (
                                        <VStack spacing={2} align="stretch">
                                            {enabledDevices.map((deviceType) => {
                                                const state = getDeviceState(aptId, deviceType);
                                                const label = getDeviceLabel(deviceType);
                                                const isOnline = state === 'online';

                                                return (
                                                    <Card key={deviceType} variant="outlined">
                                                        <CardBody p={3}>
                                                            <HStack justify="space-between" gap={3}>
                                                                <Box flex={1} minW={0}>
                                                                    <Text fontSize="sm" fontWeight="semibold">
                                                                        {label}
                                                                    </Text>
                                                                    <Text fontSize="xs" opacity={0.6} mt={0.5}>
                                                                        {deviceType}
                                                                    </Text>
                                                                </Box>
                                                                <Badge
                                                                    variant={isOnline ? 'success' : 'error'}
                                                                    size="sm"
                                                                    px={3}
                                                                    py={1}
                                                                    borderRadius="lg"
                                                                    fontSize="xs"
                                                                >
                                                                    {state.toUpperCase()}
                                                                </Badge>
                                                            </HStack>
                                                        </CardBody>
                                                    </Card>
                                                );
                                            })}
                                        </VStack>
                                    );
                                })()}
                            </CardBody>
                        </Card>

                        <Card>
                            <Box p={4}>
                                <HStack justify="space-between" gap={3} mb={3}>
                                    <Text fontSize="sm" opacity={0.7}>Attività recente (Access log)</Text>
                                    <Text fontSize="xs" opacity={0.5}>Ultimi 20 eventi</Text>
                                </HStack>

                                {accessEvents.length === 0 ? (
                                    <Text fontSize="sm" opacity={0.6}>Nessun evento registrato.</Text>
                                ) : (
                                    <VStack spacing={2} align="stretch">
                                        {accessEvents.map((e: any) => (
                                            <Card key={String(e.id)} variant="outlined">
                                                <CardBody p={3}>
                                                    <HStack justify="space-between">
                                                        <Text fontSize="xs" opacity={0.6}>
                                                            {fmtDT(e.ts)}
                                                        </Text>
                                                        <Text fontSize="11px" opacity={0.6} fontFamily="mono">
                                                            {e.type}
                                                        </Text>
                                                    </HStack>
                                                    <Text mt={1} fontSize="sm" fontWeight="semibold">
                                                        {e.label}
                                                    </Text>
                                                </CardBody>
                                            </Card>
                                        ))}
                                    </VStack>
                                )}
                            </Box>
                        </Card>
                    </VStack>
                </Box>
            </AppLayout>
        );
    }

    // -------------------------
    // Dashboard Host (overview)
    // -------------------------
    return (
        <AppLayout 
            role="host"
            userInfo={hostUser ? {
                userId: hostUser.userId,
                username: hostUser.username,
                profileImageUrl: hostUser.profileImageUrl,
            } : undefined}
        >
            <Box maxW="5xl" mx="auto" p={{ base: 4, sm: 6 }}>
                <VStack spacing={5} align="stretch">
                    <Box>
                        <HStack justify="space-between" align={{ base: "start", md: "end" }} flexDir={{ base: "column", md: "row" }} gap={3}>
                            <Box>
                                <Text fontSize="xs" opacity={0.6}>Host • Dashboard</Text>
                                <Heading as="h1" size="xl" fontWeight="semibold">
                                    {orgLabel}
                                </Heading>
                                <Text mt={1} fontSize="sm" opacity={0.7}>
                                    <Text as="span" opacity={0.8}>{apartments.length} appartamenti</Text>
                                </Text>
                            </Box>
                        </HStack>
                    </Box>

                    <Grid templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }} gap={3}>
                        <Card>
                            <CardBody p={4}>
                                <Text fontSize="xs" opacity={0.6}>Totali</Text>
                                <Text mt={1} fontSize="2xl" fontWeight="semibold">
                                    {total}
                                </Text>
                            </CardBody>
                        </Card>
                        <Card>
                            <CardBody p={4}>
                                <Text fontSize="xs" opacity={0.6}>OK</Text>
                                <Text mt={1} fontSize="2xl" fontWeight="semibold">
                                    {ok}
                                </Text>
                            </CardBody>
                        </Card>
                        <Card>
                            <CardBody p={4}>
                                <Text fontSize="xs" opacity={0.6}>Attenzione</Text>
                                <Text mt={1} fontSize="2xl" fontWeight="semibold">
                                    {warn}
                                </Text>
                            </CardBody>
                        </Card>
                        <Card>
                            <CardBody p={4}>
                                <Text fontSize="xs" opacity={0.6}>Problema</Text>
                                <Text mt={1} fontSize="2xl" fontWeight="semibold">
                                    {crit}
                                </Text>
                            </CardBody>
                        </Card>
                    </Grid>

                    <Card>
                        <CardBody p={4}>
                            <HStack justify="space-between" gap={3}>
                                <Text fontSize="sm" opacity={0.7}>🔴 Problemi (critical first)</Text>
                                <Text fontSize="xs" opacity={0.5}>Mostra max 5</Text>
                            </HStack>

                            {criticalFirst.length === 0 ? (
                                <Text mt={3} fontSize="sm" opacity={0.6}>
                                    Nessun problema critico rilevato.
                                </Text>
                            ) : (
                                <VStack spacing={2} align="stretch" mt={3}>
                                    {criticalFirst.map((a) => (
                                        <Box
                                            key={a.aptId}
                                            as={Link}
                                            href={`/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(a.aptId)}`}
                                            display="block"
                                            borderRadius="xl"
                                            bg="var(--bg-secondary)"
                                            border="1px solid"
                                            borderColor="var(--border-light)"
                                            p={3}
                                            _hover={{ borderColor: "var(--border-medium)" }}
                                        >
                                            <HStack justify="space-between">
                                                <Text fontWeight="semibold">{a.name}</Text>
                                                <Text fontSize="xs" opacity={0.7}>
                                                    {a.readiness}
                                                </Text>
                                            </HStack>
                                            <Text mt={1} fontSize="sm" opacity={0.7}>
                                                {a.lastEvent}
                                            </Text>
                                        </Box>
                                    ))}
                                </VStack>
                            )}
                        </CardBody>
                    </Card>

                    <HStack spacing={3}>
                        <ApartmentSearchForm clientId={clientId} initialQuery={q} />
                    </HStack>

                    <Card>
                        <CardBody p={4}>
                            <HStack justify="space-between" gap={3}>
                                <Text fontSize="sm" opacity={0.7}>Appartamenti</Text>
                                <Text fontSize="xs" opacity={0.5}>Vista compatta</Text>
                            </HStack>

                            <VStack spacing={2} align="stretch" mt={3}>
                                {healthFiltered.map((a) => (
                                    <Box
                                        key={a.aptId}
                                        as={Link}
                                        href={`/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(a.aptId)}`}
                                        display="block"
                                        borderRadius="xl"
                                        bg="var(--bg-secondary)"
                                        border="1px solid"
                                        borderColor="var(--border-light)"
                                        p={4}
                                        _hover={{ borderColor: "var(--border-medium)" }}
                                    >
                                        <HStack justify="space-between" gap={3}>
                                            <Box>
                                                <Text fontWeight="semibold">{a.name}</Text>
                                                <Text mt={1} fontSize="xs" opacity={0.6}>
                                                    Ultimo evento: {a.lastEvent}
                                                </Text>
                                            </Box>

                                            <Box textAlign="right">
                                                <Text fontSize="xs" opacity={0.6}>Stato</Text>
                                                <Text fontWeight="semibold">
                                                    {a.status === 'ok' && '🟢 OK'}
                                                    {a.status === 'warn' && '🟡 Attenzione'}
                                                    {a.status === 'crit' && '🔴 Problema'}
                                                </Text>
                                                <Text mt={1} fontSize="xs" opacity={0.7}>
                                                    {a.readiness}
                                                </Text>
                                            </Box>
                                        </HStack>
                                    </Box>
                                ))}

                                {healthFiltered.length === 0 && (
                                    <Text fontSize="sm" opacity={0.6}>
                                        Nessun appartamento trovato.
                                    </Text>
                                )}
                            </VStack>
                        </CardBody>
                    </Card>
                </VStack>
            </Box>
        </AppLayout>
    );
}
