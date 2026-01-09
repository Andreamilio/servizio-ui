import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { readSession, validateSessionUser } from '@/app/lib/session';
import { listClients, getApartment } from '@/app/lib/clientStore';
import { getUser } from '@/app/lib/userStore';
import { AppLayout } from '@/app/components/layouts/AppLayout';

import { cleaners_getCfg, cleaners_setDuration, cleaners_add, cleaners_remove, cleaners_setTimeRanges } from '@/app/lib/domain/cleanersDomain';

import { Box, VStack, HStack, Heading, Text, Input as ChakraInput } from "@chakra-ui/react";
import { Card, CardBody, CardHeader } from "@/app/components/ui/Card";
import { Link } from "@/app/components/ui/Link";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { Select } from "@/app/components/ui/Select";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type SP = Record<string, string | string[] | undefined>;

function pick(sp: SP, key: string) {
    const v = sp[key];
    return typeof v === 'string' ? v : Array.isArray(v) ? v[0] : undefined;
}

export default async function HostCleanersPage({ searchParams }: { searchParams?: SP | Promise<SP> }) {
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

    const cfg = cleaners_getCfg(aptId);
    const hostUserForLayout = getUser(me.userId ?? '');

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
                                    Cleaner
                                </Heading>
                                <Text fontSize="sm" opacity={0.7}>
                                    {apartment.name}
                                </Text>
                            </Box>
                        </Box>
                    </HStack>

                    {/* Cleaner config */}
                    <Card>
                        <CardBody p={4}>
                            <VStack spacing={4} align="stretch">
                                <Box>
                                    <Text fontSize="sm" fontWeight="semibold">
                                        Cleaner (per appartamento)
                                    </Text>
                                    <Text mt={1} fontSize="xs" opacity={0.6}>
                                        Configura durata standard pulizia e censisci i cleaner per questo appartamento.
                                    </Text>
                                </Box>

                                <VStack spacing={4} align="stretch" mt={4}>
                                    <Box as="form"
                                        action={async (fd: FormData) => {
                                            'use server';
                                            const aptId = (fd.get('aptId')?.toString() ?? '').trim();
                                            if (!aptId) return;
                                            const durationMin = Math.max(15, Math.min(24 * 60, Number(fd.get('durationMin')?.toString() ?? '60') || 60));
                                            cleaners_setDuration(aptId, durationMin);
                                            redirect(`/app/host/cleaners?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`);
                                        }}
                                    >
                                        <VStack spacing={2} align="stretch">
                                            <input type='hidden' name='aptId' value={aptId} />
                                            <Text fontSize="11px" opacity={0.6}>
                                                Durata pulizia default
                                            </Text>
                                            <HStack spacing={2} flexDir={{ base: "column", sm: "row" }}>
                                                <Select
                                                    name='durationMin'
                                                    defaultValue={String(cfg.durationMin)}
                                                    flex={1}
                                                    minW={0}
                                                    borderRadius="xl"
                                                    bg="var(--bg-secondary)"
                                                    border="1px solid"
                                                    borderColor="var(--border-light)"
                                                    p={2}
                                                >
                                                    {[30, 45, 60, 90, 120, 180, 240].map((m) => (
                                                        <option key={m} value={String(m)}>
                                                            {m} min
                                                        </option>
                                                    ))}
                                                </Select>
                                                <Button
                                                    type='submit'
                                                    variant="secondary"
                                                    borderRadius="xl"
                                                    px={4}
                                                    py={2}
                                                    fontSize="sm"
                                                    fontWeight="semibold"
                                                    whiteSpace="nowrap"
                                                >
                                                    Salva
                                                </Button>
                                            </HStack>
                                        </VStack>
                                    </Box>

                                    <Box as="form"
                                        action={async (fd: FormData) => {
                                            'use server';
                                            const aptId = (fd.get('aptId')?.toString() ?? '').trim();
                                            const name = fd.get('cleanerName')?.toString() ?? '';
                                            const phone = fd.get('cleanerPhone')?.toString() ?? '';
                                            if (!aptId) return;
                                            cleaners_add(aptId, name, phone);
                                            redirect(`/app/host/cleaners?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`);
                                        }}
                                    >
                                        <VStack spacing={2} align="stretch">
                                            <input type='hidden' name='aptId' value={aptId} />
                                            <Text fontSize="11px" opacity={0.6}>
                                                Aggiungi cleaner
                                            </Text>
                                            <HStack spacing={2} flexDir={{ base: "column", sm: "row" }}>
                                                <ChakraInput
                                                    name='cleanerName'
                                                    placeholder='Es. Mario Rossi'
                                                    required
                                                    flex={1}
                                                    minW={0}
                                                    borderRadius="xl"
                                                    bg="var(--bg-secondary)"
                                                    border="1px solid"
                                                    borderColor="var(--border-light)"
                                                    p={2}
                                                />
                                                <ChakraInput
                                                    name='cleanerPhone'
                                                    type='tel'
                                                    placeholder='Telefono'
                                                    required
                                                    flex={1}
                                                    minW={0}
                                                    borderRadius="xl"
                                                    bg="var(--bg-secondary)"
                                                    border="1px solid"
                                                    borderColor="var(--border-light)"
                                                    p={2}
                                                />
                                                <Button
                                                    type='submit'
                                                    borderRadius="xl"
                                                    bg="rgba(6, 182, 212, 0.3)"
                                                    border="1px solid"
                                                    borderColor="rgba(6, 182, 212, 0.3)"
                                                    px={4}
                                                    py={2}
                                                    fontSize="sm"
                                                    fontWeight="semibold"
                                                    whiteSpace="nowrap"
                                                >
                                                    Aggiungi
                                                </Button>
                                            </HStack>
                                        </VStack>
                                    </Box>

                                    <Box>
                                        <Text fontSize="11px" opacity={0.6} mb={2}>
                                            Range orari pulizie
                                        </Text>
                                        <Text fontSize="xs" opacity={0.5} mb={2}>
                                            Le pulizie assegnate verranno schedulati nel primo range disponibile dopo il check-out.
                                        </Text>
                                        {(() => {
                                            const ranges = cfg.cleaningTimeRanges ?? [{ from: '09:00', to: '18:00' }];
                                            const rangesWithEmpty = [...ranges, { from: '', to: '' }];

                                            return (
                                                <VStack spacing={2} align="stretch">
                                                    {/* Range rimovibili - form separati */}
                                                    {rangesWithEmpty.map((range, idx) => {
                                                        const isFirst = idx === 0;
                                                        const isLast = idx === rangesWithEmpty.length - 1;
                                                        const isRemovable = !isFirst && !isLast && ranges.length > 1;

                                                        if (isRemovable) {
                                                            return (
                                                                <Box
                                                                    key={idx}
                                                                    as="form"
                                                                    action={async (fd: FormData) => {
                                                                        'use server';
                                                                        const aptId = (fd.get('aptId')?.toString() ?? '').trim();
                                                                        const rangeIndex = parseInt(fd.get('rangeIndex')?.toString() ?? '0', 10);
                                                                        if (!aptId || isNaN(rangeIndex)) return;

                                                                        const currentCfg = cleaners_getCfg(aptId);
                                                                        const currentRanges = currentCfg.cleaningTimeRanges ?? [{ from: '09:00', to: '18:00' }];

                                                                        if (currentRanges.length > 1 && rangeIndex >= 0 && rangeIndex < currentRanges.length) {
                                                                            const newRanges = currentRanges.filter((_, i) => i !== rangeIndex);
                                                                            cleaners_setTimeRanges(aptId, newRanges);
                                                                        }

                                                                        redirect(`/app/host/cleaners?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`);
                                                                    }}
                                                                    display="flex"
                                                                    flexDir={{ base: "column", sm: "row" }}
                                                                    gap={2}
                                                                    alignItems={{ base: "stretch", sm: "center" }}
                                                                >
                                                                    <input type='hidden' name='aptId' value={aptId} />
                                                                    <input type='hidden' name='rangeIndex' value={idx} />
                                                                    <ChakraInput
                                                                        type='time'
                                                                        defaultValue={range.from}
                                                                        placeholder='09:00'
                                                                        flex={1}
                                                                        minW={0}
                                                                        borderRadius="xl"
                                                                        bg="var(--bg-secondary)"
                                                                        border="1px solid"
                                                                        borderColor="var(--border-light)"
                                                                        p={2}
                                                                        opacity={0.6}
                                                                        disabled
                                                                    />
                                                                    <Text fontSize="xs" opacity={0.6} display={{ base: "none", sm: "inline" }}>
                                                                        →
                                                                    </Text>
                                                                    <ChakraInput
                                                                        type='time'
                                                                        defaultValue={range.to}
                                                                        placeholder='18:00'
                                                                        flex={1}
                                                                        minW={0}
                                                                        borderRadius="xl"
                                                                        bg="var(--bg-secondary)"
                                                                        border="1px solid"
                                                                        borderColor="var(--border-light)"
                                                                        p={2}
                                                                        opacity={0.6}
                                                                        disabled
                                                                    />
                                                                    <Button
                                                                        type='submit'
                                                                        size="sm"
                                                                        borderRadius="lg"
                                                                        bg="rgba(239, 68, 68, 0.2)"
                                                                        _hover={{ bg: "rgba(239, 68, 68, 0.3)" }}
                                                                        border="1px solid"
                                                                        borderColor="rgba(239, 68, 68, 0.3)"
                                                                        px={3}
                                                                        py={2}
                                                                        fontSize="xs"
                                                                        whiteSpace={{ base: "normal", sm: "nowrap" }}
                                                                    >
                                                                        Rimuovi
                                                                    </Button>
                                                                </Box>
                                                            );
                                                        }
                                                        return null;
                                                    })}

                                                    {/* Form principale per range editabili */}
                                                    <Box as="form"
                                                        action={async (fd: FormData) => {
                                                            'use server';
                                                            const aptId = (fd.get('aptId')?.toString() ?? '').trim();
                                                            if (!aptId) return;

                                                            const ranges: Array<{ from: string; to: string }> = [];
                                                            let idx = 0;
                                                            while (true) {
                                                                const from = fd.get(`rangeFrom_${idx}`)?.toString()?.trim();
                                                                const to = fd.get(`rangeTo_${idx}`)?.toString()?.trim();
                                                                if (!from || !to) break;
                                                                const fromParts = from.split(':');
                                                                const toParts = to.split(':');
                                                                if (fromParts.length === 2 && toParts.length === 2) {
                                                                    const fromMin = parseInt(fromParts[0], 10) * 60 + parseInt(fromParts[1], 10);
                                                                    const toMin = parseInt(toParts[0], 10) * 60 + parseInt(toParts[1], 10);
                                                                    if (fromMin < toMin) {
                                                                        ranges.push({ from, to });
                                                                    }
                                                                }
                                                                idx++;
                                                            }

                                                            if (ranges.length === 0) {
                                                                ranges.push({ from: '09:00', to: '18:00' });
                                                            }

                                                            cleaners_setTimeRanges(aptId, ranges);
                                                            redirect(`/app/host/cleaners?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`);
                                                        }}
                                                    >
                                                        <VStack spacing={2} align="stretch">
                                                            <input type='hidden' name='aptId' value={aptId} />
                                                            {/* Include hidden inputs per i range rimovibili */}
                                                            {ranges.map((r, idx) => {
                                                                if (idx > 0 && idx < ranges.length) {
                                                                    return <input key={`from_${idx}`} type='hidden' name={`rangeFrom_${idx}`} value={r.from} />;
                                                                }
                                                                return null;
                                                            })}
                                                            {ranges.map((r, idx) => {
                                                                if (idx > 0 && idx < ranges.length) {
                                                                    return <input key={`to_${idx}`} type='hidden' name={`rangeTo_${idx}`} value={r.to} />;
                                                                }
                                                                return null;
                                                            })}
                                                            {/* Range editabili (primo e ultimo vuoto) */}
                                                            {rangesWithEmpty.map((range, idx) => {
                                                                const isFirst = idx === 0;
                                                                const isLast = idx === rangesWithEmpty.length - 1;
                                                                const isRemovable = !isFirst && !isLast && ranges.length > 1;
                                                                const isEmpty = !range.from && !range.to;

                                                                if (!isRemovable) {
                                                                    if (isLast && isEmpty) {
                                                                        return (
                                                                            <Box key={idx} pt={2} borderTop="1px solid" borderColor="var(--border-light)">
                                                                                <VStack spacing={2} align="stretch">
                                                                                    <Text fontSize="10px" opacity={0.7} fontWeight="medium">
                                                                                        + Aggiungi nuovo range
                                                                                    </Text>
                                                                                    <HStack spacing={2} flexDir={{ base: "column", sm: "row" }} alignItems={{ base: "stretch", sm: "center" }}>
                                                                                        <ChakraInput
                                                                                            type='time'
                                                                                            name={`rangeFrom_${idx}`}
                                                                                            defaultValue={range.from}
                                                                                            placeholder='09:00'
                                                                                            flex={1}
                                                                                            minW={0}
                                                                                            borderRadius="xl"
                                                                                            bg="var(--bg-secondary)"
                                                                                            border="2px dashed"
                                                                                            borderColor="var(--border-strong)"
                                                                                            p={2}
                                                                                        />
                                                                                        <Text fontSize="xs" opacity={0.6} display={{ base: "none", sm: "inline" }}>
                                                                                            →
                                                                                        </Text>
                                                                                        <ChakraInput
                                                                                            type='time'
                                                                                            name={`rangeTo_${idx}`}
                                                                                            defaultValue={range.to}
                                                                                            placeholder='18:00'
                                                                                            flex={1}
                                                                                            minW={0}
                                                                                            borderRadius="xl"
                                                                                            bg="var(--bg-secondary)"
                                                                                            border="2px dashed"
                                                                                            borderColor="var(--border-strong)"
                                                                                            p={2}
                                                                                        />
                                                                                    </HStack>
                                                                                </VStack>
                                                                            </Box>
                                                                        );
                                                                    }
                                                                    return (
                                                                        <HStack key={idx} spacing={2} flexDir={{ base: "column", sm: "row" }} alignItems={{ base: "stretch", sm: "center" }}>
                                                                            <ChakraInput
                                                                                type='time'
                                                                                name={`rangeFrom_${idx}`}
                                                                                defaultValue={range.from}
                                                                                placeholder='09:00'
                                                                                flex={1}
                                                                                minW={0}
                                                                                borderRadius="xl"
                                                                                bg="var(--bg-secondary)"
                                                                                border="1px solid"
                                                                                borderColor="var(--border-light)"
                                                                                p={2}
                                                                            />
                                                                            <Text fontSize="xs" opacity={0.6} display={{ base: "none", sm: "inline" }}>
                                                                                →
                                                                            </Text>
                                                                            <ChakraInput
                                                                                type='time'
                                                                                name={`rangeTo_${idx}`}
                                                                                defaultValue={range.to}
                                                                                placeholder='18:00'
                                                                                flex={1}
                                                                                minW={0}
                                                                                borderRadius="xl"
                                                                                bg="var(--bg-secondary)"
                                                                                border="1px solid"
                                                                                borderColor="var(--border-light)"
                                                                                p={2}
                                                                            />
                                                                        </HStack>
                                                                    );
                                                                }
                                                                return null;
                                                            })}
                                                            <Button
                                                                type='submit'
                                                                variant="secondary"
                                                                w="100%"
                                                                borderRadius="xl"
                                                                px={4}
                                                                py={2}
                                                                fontSize="sm"
                                                                fontWeight="semibold"
                                                            >
                                                                Salva range orari
                                                            </Button>
                                                        </VStack>
                                                    </Box>
                                                </VStack>
                                            );
                                        })()}
                                    </Box>

                                    <Box>
                                        <Text fontSize="11px" opacity={0.6} mb={2}>
                                            Cleaner censiti
                                        </Text>
                                        {cfg.cleaners.length === 0 ? (
                                            <Text fontSize="sm" opacity={0.5}>
                                                Nessun cleaner censito.
                                            </Text>
                                        ) : (
                                            <VStack spacing={2} align="stretch">
                                                {cfg.cleaners.map((cleaner) => (
                                                    <Card key={cleaner.name} variant="outlined">
                                                        <CardBody p={3}>
                                                            <HStack justify="space-between">
                                                                <Box>
                                                                    <Text fontSize="sm" fontWeight="semibold">
                                                                        {cleaner.name}
                                                                    </Text>
                                                                    <Text fontSize="xs" opacity={0.6}>
                                                                        {cleaner.phone}
                                                                    </Text>
                                                                </Box>
                                                                <Box as="form"
                                                                    action={async (fd: FormData) => {
                                                                        'use server';
                                                                        const aptId = (fd.get('aptId')?.toString() ?? '').trim();
                                                                        const name = (fd.get('name')?.toString() ?? '').trim();
                                                                        if (!aptId) return;
                                                                        cleaners_remove(aptId, name);
                                                                        redirect(`/app/host/cleaners?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`);
                                                                    }}
                                                                >
                                                                    <input type='hidden' name='aptId' value={aptId} />
                                                                    <input type='hidden' name='name' value={cleaner.name} />
                                                                    <Button
                                                                        type='submit'
                                                                        size="sm"
                                                                        borderRadius="lg"
                                                                        bg="rgba(239, 68, 68, 0.2)"
                                                                        border="1px solid"
                                                                        borderColor="rgba(239, 68, 68, 0.3)"
                                                                        px={3}
                                                                        py={2}
                                                                        fontSize="xs"
                                                                    >
                                                                        Rimuovi
                                                                    </Button>
                                                                </Box>
                                                            </HStack>
                                                        </CardBody>
                                                    </Card>
                                                ))}
                                            </VStack>
                                        )}
                                    </Box>
                                </VStack>
                            </VStack>
                        </CardBody>
                    </Card>
                </VStack>
            </Box>
        </AppLayout>
    );
}
