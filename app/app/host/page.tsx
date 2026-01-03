import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { readSession, validateSessionUser } from '@/app/lib/session';
import * as Store from '@/app/lib/store';
import { listJobsByApt } from '@/app/lib/cleaningstore';
import { listClients, listApartmentsByClient } from '@/app/lib/clientStore';
import { getUser } from '@/app/lib/userStore';

import { cleaners_getCfg, cleaners_setDuration, cleaners_add, cleaners_remove, cleaners_normName, cleaners_setTimeRanges } from '@/app/lib/domain/cleanersDomain';

import { stays_listByApt } from '@/app/lib/domain/staysDomain';

import { stays_createWithOptionalCleaner, stays_createWithGuestsAndCleaner } from '@/app/lib/domain/pinsDomain';
import { GuestFields } from './components/GuestFields';

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
    // Default a BLOCCATA (closed) per prototipo
    if (!last) return { label: 'BLOCCATA', tone: 'closed' };
    if (last.type === 'door_opened') return { label: 'SBLOCCATA', tone: 'open' };
    return { label: 'BLOCCATA', tone: 'closed' };
}

function getGateUi(aptId: string): { label: string; tone: 'open' | 'closed' | 'unknown' } {
    const log = Store.listAccessLogByApt(aptId, 50) ?? [];
    const last = log.find((e: any) => e?.type === 'gate_opened' || e?.type === 'gate_closed');
    // Default a BLOCCATO (closed) per prototipo
    if (!last) return { label: 'BLOCCATO', tone: 'closed' };
    if (last.type === 'gate_opened') return { label: 'SBLOCCATO', tone: 'open' };
    return { label: 'BLOCCATO', tone: 'closed' };
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
        // Se la sessione era valida ma l'utente è disabilitato, fai logout
        if (session && session.userId && session.role === 'host') {
            redirect('/api/auth/logout');
        }
        return <div className='p-6 text-white'>Non autorizzato</div>;
    }

    const clients = (listClients() as any[]) ?? [];
    const getClientId = (c: any) => String(c?.id ?? c?.clientId ?? c?.clientID ?? c?.slug ?? '');
    
    // Se l'utente host ha un clientId associato, filtra i clienti disponibili
    const hostUser = me.userId ? getUser(me.userId) : null;
    const hostUserClientId = hostUser?.clientId;
    
    // Se l'host ha un clientId specifico, mostra solo quel client
    const availableClients = hostUserClientId 
      ? clients.filter((c) => getClientId(c) === hostUserClientId)
      : clients;
    
    // Se l'host ha un clientId, usa quello di default, altrimenti usa quello dall'URL (o stringa vuota se non specificato)
    const urlClientId = pick(sp, 'client')?.trim();
    const wantedClientId = hostUserClientId || urlClientId || undefined;
    const client = wantedClientId ? availableClients.find((c) => getClientId(c) === wantedClientId) ?? null : null;

    const clientId = client ? getClientId(client) : (hostUserClientId || urlClientId || '');
    
    // Se clientId è specificato, mostra solo gli appartamenti di quel client, altrimenti mostra tutti
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

        const stays = stays_listByApt(aptId) ?? [];

        const doorUi = getDoorUi(aptId);
        const gateUi = getGateUi(aptId);
        const allAccessEvents = Store.listAccessLogByApt(aptId, 20) ?? [];
        // Filtra eventi WAN/VPN: visibili solo nella vista Tech
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

        async function actCloseGate() {
            'use server';
            Store.logAccessEvent(aptId, 'gate_closed', '[host] Portone chiuso');
            revalidatePath('/app/host');
            redirect(`/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}&r=${Date.now()}`);
        }

        async function createStay(formData: FormData) {
            'use server';
            const aptId = formData.get('aptId')?.toString() ?? '';
            if (!aptId) return;

            const checkin = (formData.get('checkin')?.toString() ?? '').trim();
            const checkout = (formData.get('checkout')?.toString() ?? '').trim();
            const guestsCount = Math.max(1, Math.min(10, Number(formData.get('guests')?.toString() ?? '2') || 2));

            const selectedCleaner = cleaners_normName(formData.get('cleaner')?.toString() ?? '');

            // Validazione: cleaner obbligatorio
            if (!selectedCleaner) {
                redirect(`/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`);
                return;
            }

            const ci = parseDateTimeLocal(checkin);
            const co = parseDateTimeLocal(checkout);

            if (!ci || !co || co.getTime() <= ci.getTime()) {
                redirect(`/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`);
                return;
            }

            // Raccogli i dati degli ospiti
            const guests: Array<{ firstName: string; lastName: string; phone: string; email?: string }> = [];

            // Prova prima a cercare dinamicamente i campi inviati
            const allKeys = Array.from(formData.keys());
            const guestIndices = new Set<number>();

            for (const key of allKeys) {
                const match = key.match(/^guest_(\d+)_firstName$/);
                if (match) {
                    guestIndices.add(parseInt(match[1], 10));
                }
            }

            // Se non trova campi dinamicamente, usa il numero dal select
            const indicesToCheck = guestIndices.size > 0 ? Array.from(guestIndices).sort((a, b) => a - b) : Array.from({ length: guestsCount }, (_, i) => i + 1);

            for (const i of indicesToCheck) {
                const firstName = (formData.get(`guest_${i}_firstName`)?.toString() ?? '').trim();
                const lastName = (formData.get(`guest_${i}_lastName`)?.toString() ?? '').trim();
                const phone = (formData.get(`guest_${i}_phone`)?.toString() ?? '').trim();
                const email = (formData.get(`guest_${i}_email`)?.toString() ?? '').trim();

                // Se tutti i campi sono vuoti, salta questo ospite (potrebbe essere nascosto o disabilitato)
                if (!firstName && !lastName && !phone) {
                    continue;
                }

                // Validazione: nome, cognome e telefono obbligatori per ogni ospite
                // Se almeno un campo è presente ma mancano altri, è un errore
                if ((firstName || lastName || phone) && (!firstName || !lastName || !phone)) {
                    // Se mancano dati obbligatori, redirect senza creare lo stay
                    redirect(`/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`);
                    return;
                }

                // Se tutti i campi obbligatori sono presenti, aggiungi l'ospite
                if (firstName && lastName && phone) {
                    guests.push({
                        firstName,
                        lastName,
                        phone,
                        email: email || undefined,
                    });
                }
            }

            // Validazione: deve esserci almeno un ospite
            if (guests.length === 0) {
                // Log per debug: verifica cosa è stato inviato
                console.error('Nessun ospite valido trovato', {
                    guestsCount,
                    allKeys: Array.from(formData.keys()),
                    guestIndices: Array.from(guestIndices),
                    indicesToCheck,
                });
                redirect(`/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`);
                return;
            }

            const vf = ci.getTime();
            const vt = co.getTime();

            // Crea lo stay
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
                redirect(`/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`);
                return;
            }

            if (!st || !st.stayId) {
                console.error('Stay non creato correttamente:', { st, guests, aptId, vf, vt, selectedCleaner });
                redirect(`/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`);
                return;
            }

            // Verifica che lo stay sia stato salvato
            const verifyStay = stays_listByApt(aptId).find((s: any) => s.stayId === st.stayId);
            if (!verifyStay) {
                console.error('Stay creato ma non trovato nella lista:', st.stayId);
            }

            // Redirect alla pagina di dettaglio dello stay
            redirect(`/app/host/stay/${encodeURIComponent(st.stayId)}?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`);
        }

        return (
            <main className='min-h-screen bg-[#0a0d12] text-white p-6'>
                <div className='max-w-3xl mx-auto space-y-5'>
                    <div className='flex items-start justify-between gap-3'>
                        <div>
                            <div className='text-xs opacity-60'>Host • Dettaglio appartamento</div>
                            <h1 className='text-lg font-semibold'>{apt?.name ?? (aptId ? `Apt ${aptId}` : 'Apt')}</h1>
                        </div>

                        <div className='flex flex-wrap items-center justify-end gap-2 sm:gap-3'>
                            <Link className='whitespace-nowrap text-sm opacity-70 hover:opacity-100' href={clientId ? `/app/host?client=${encodeURIComponent(clientId)}` : '/app/host'}>
                                ← Dashboard
                            </Link>

                            <form action='/api/auth/logout' method='post'>
                                <button className='whitespace-nowrap text-sm opacity-70 hover:opacity-100'>Esci</button>
                            </form>
                        </div>
                    </div>

                    <section className='rounded-2xl bg-white/5 border border-white/10 p-4'>
                        <div className='flex items-center justify-between gap-3'>
                            <div>
                                <div className='text-sm opacity-70'>Stato operativo</div>
                                <div className='mt-1 font-semibold'>{health?.readiness ?? '—'}</div>

                                <div className='mt-2 text-sm opacity-70'>Porta</div>
                                <div
                                    className={`mt-1 inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                                        doorUi.tone === 'open'
                                            ? 'bg-emerald-500/10 border-emerald-400/20 text-emerald-200'
                                            : doorUi.tone === 'closed'
                                            ? 'bg-white/5 border-white/10 text-white/80'
                                            : 'bg-yellow-500/10 border-yellow-400/20 text-yellow-200'
                                    }`}>
                                    <span className={`h-2 w-2 rounded-full ${doorUi.tone === 'open' ? 'bg-emerald-400' : doorUi.tone === 'closed' ? 'bg-white/40' : 'bg-yellow-400'}`} />
                                    {doorUi.label}
                                </div>

                                <div className='mt-2 text-sm opacity-70'>Portone</div>
                                <div
                                    className={`mt-1 inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                                        gateUi.tone === 'open'
                                            ? 'bg-emerald-500/10 border-emerald-400/20 text-emerald-200'
                                            : gateUi.tone === 'closed'
                                            ? 'bg-white/5 border-white/10 text-white/80'
                                            : 'bg-yellow-500/10 border-yellow-400/20 text-yellow-200'
                                    }`}>
                                    <span className={`h-2 w-2 rounded-full ${gateUi.tone === 'open' ? 'bg-emerald-400' : gateUi.tone === 'closed' ? 'bg-white/40' : 'bg-yellow-400'}`} />
                                    {gateUi.label}
                                </div>
                            </div>
                            <div className='text-right'>
                                <div className='text-sm opacity-70'>Ultimo evento</div>
                                <div className='mt-1 text-sm opacity-90'>{health?.lastEvent ?? '—'}</div>
                            </div>
                        </div>

                        <div className='mt-4 flex flex-wrap gap-2'>
                            {doorUi.tone !== 'unknown' && (
                                <form action={doorUi.tone === 'open' ? actCloseDoor : actOpenDoor}>
                                    <button
                                        type='submit'
                                        className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                                            doorUi.tone === 'open' ? 'bg-white/10 hover:bg-white/15 border border-white/15' : 'bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-400/30'
                                        }`}>
                                        {doorUi.tone === 'open' ? 'Chiudi porta' : 'Apri porta'}
                                    </button>
                                </form>
                            )}

                            {gateUi.tone !== 'unknown' && (
                                <form action={gateUi.tone === 'open' ? actCloseGate : actOpenGate}>
                                    <button
                                        type='submit'
                                        className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                                            gateUi.tone === 'open' ? 'bg-white/10 hover:bg-white/15 border border-white/15' : 'bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-400/30'
                                        }`}>
                                        {gateUi.tone === 'open' ? 'Chiudi portone' : 'Apri portone'}
                                    </button>
                                </form>
                            )}

                            <button className='rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm opacity-90'>Supporto</button>
                        </div>
                    </section>

                    {/* Cleaner config */}
                    <section className='rounded-2xl bg-white/5 border border-white/10 p-4'>
                        <div>
                            <div className='text-sm font-semibold'>Cleaner (per appartamento)</div>
                            <div className='mt-1 text-xs opacity-60'>Configura durata standard pulizia e censisci i cleaner per questo appartamento.</div>
                        </div>

                        {(() => {
                            const cfg = cleaners_getCfg(aptId);
                            return (
                                <div className='mt-4 space-y-4'>
                                    <form
                                        action={async (fd: FormData) => {
                                            'use server';
                                            const aptId = (fd.get('aptId')?.toString() ?? '').trim();
                                            if (!aptId) return;
                                            const durationMin = Math.max(15, Math.min(24 * 60, Number(fd.get('durationMin')?.toString() ?? '60') || 60));
                                            cleaners_setDuration(aptId, durationMin);
                                            redirect(`/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`);
                                        }}
                                        className='space-y-2'>
                                        <input type='hidden' name='aptId' value={aptId} />
                                        <div className='text-[11px] opacity-60'>Durata pulizia default</div>
                                        <div className='flex gap-2'>
                                            <select name='durationMin' defaultValue={String(cfg.durationMin)} className='flex-1 rounded-xl bg-black/40 border border-white/10 p-2'>
                                                {[30, 45, 60, 90, 120, 180, 240].map((m) => (
                                                    <option key={m} value={String(m)}>
                                                        {m} min
                                                    </option>
                                                ))}
                                            </select>
                                            <button type='submit' className='rounded-xl bg-white/10 border border-white/15 px-4 text-sm font-semibold'>
                                                Salva
                                            </button>
                                        </div>
                                    </form>

                                    <form
                                        action={async (fd: FormData) => {
                                            'use server';
                                            const aptId = (fd.get('aptId')?.toString() ?? '').trim();
                                            const name = fd.get('cleanerName')?.toString() ?? '';
                                            if (!aptId) return;
                                            cleaners_add(aptId, name);
                                            redirect(`/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`);
                                        }}
                                        className='space-y-2'>
                                        <input type='hidden' name='aptId' value={aptId} />
                                        <div className='text-[11px] opacity-60'>Aggiungi cleaner</div>
                                        <div className='flex gap-2'>
                                            <input name='cleanerName' placeholder='Es. Mario Rossi' className='flex-1 rounded-xl bg-black/40 border border-white/10 p-2' />
                                            <button type='submit' className='rounded-xl bg-cyan-500/30 border border-cyan-400/30 px-4 text-sm font-semibold'>
                                                Aggiungi
                                            </button>
                                        </div>
                                    </form>

                                    <div>
                                        <div className='text-[11px] opacity-60 mb-2'>Range orari pulizie</div>
                                        <div className='text-xs opacity-50 mb-2'>I job di pulizia verranno schedulati nel primo range disponibile dopo il check-out.</div>
                                        {(() => {
                                            const ranges = cfg.cleaningTimeRanges ?? [{ from: '09:00', to: '18:00' }];
                                            // Aggiungi sempre un range vuoto alla fine per permettere di aggiungerne uno nuovo
                                            const rangesWithEmpty = [...ranges, { from: '', to: '' }];

                                            return (
                                                <div className='space-y-2'>
                                                    {/* Range rimovibili - form separati */}
                                                    {rangesWithEmpty.map((range, idx) => {
                                                        const isFirst = idx === 0;
                                                        const isLast = idx === rangesWithEmpty.length - 1;
                                                        const isRemovable = !isFirst && !isLast && ranges.length > 1;

                                                        if (isRemovable) {
                                                            return (
                                                                <form
                                                                    key={idx}
                                                                    action={async (fd: FormData) => {
                                                                        'use server';
                                                                        const aptId = (fd.get('aptId')?.toString() ?? '').trim();
                                                                        const rangeIndex = parseInt(fd.get('rangeIndex')?.toString() ?? '0', 10);
                                                                        if (!aptId || isNaN(rangeIndex)) return;

                                                                        const currentCfg = cleaners_getCfg(aptId);
                                                                        const currentRanges = currentCfg.cleaningTimeRanges ?? [{ from: '09:00', to: '18:00' }];

                                                                        // Rimuovi il range all'indice specificato, ma mantieni sempre almeno uno
                                                                        if (currentRanges.length > 1 && rangeIndex >= 0 && rangeIndex < currentRanges.length) {
                                                                            const newRanges = currentRanges.filter((_, i) => i !== rangeIndex);
                                                                            cleaners_setTimeRanges(aptId, newRanges);
                                                                        }

                                                                        redirect(`/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`);
                                                                    }}
                                                                    className='flex gap-2 items-center'>
                                                                    <input type='hidden' name='aptId' value={aptId} />
                                                                    <input type='hidden' name='rangeIndex' value={idx} />
                                                                    <input
                                                                        type='time'
                                                                        defaultValue={range.from}
                                                                        placeholder='09:00'
                                                                        className='flex-1 rounded-xl bg-black/40 border border-white/10 p-2 opacity-60'
                                                                        disabled
                                                                    />
                                                                    <span className='text-xs opacity-60'>→</span>
                                                                    <input
                                                                        type='time'
                                                                        defaultValue={range.to}
                                                                        placeholder='18:00'
                                                                        className='flex-1 rounded-xl bg-black/40 border border-white/10 p-2 opacity-60'
                                                                        disabled
                                                                    />
                                                                    <button
                                                                        type='submit'
                                                                        className='text-xs px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 whitespace-nowrap'>
                                                                        Rimuovi
                                                                    </button>
                                                                </form>
                                                            );
                                                        }
                                                        return null;
                                                    })}

                                                    {/* Form principale per range editabili */}
                                                    <form
                                                        action={async (fd: FormData) => {
                                                            'use server';
                                                            const aptId = (fd.get('aptId')?.toString() ?? '').trim();
                                                            if (!aptId) return;

                                                            // Leggi tutti i range dal form (filtra quelli vuoti)
                                                            const ranges: Array<{ from: string; to: string }> = [];
                                                            let idx = 0;
                                                            while (true) {
                                                                const from = fd.get(`rangeFrom_${idx}`)?.toString()?.trim();
                                                                const to = fd.get(`rangeTo_${idx}`)?.toString()?.trim();
                                                                if (!from || !to) break;
                                                                // Valida che from < to
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

                                                            // Se non ci sono range validi, usa il default
                                                            if (ranges.length === 0) {
                                                                ranges.push({ from: '09:00', to: '18:00' });
                                                            }

                                                            cleaners_setTimeRanges(aptId, ranges);
                                                            redirect(`/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`);
                                                        }}
                                                        className='space-y-2'>
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

                                                            if (!isRemovable) {
                                                                return (
                                                                    <div key={idx} className='flex gap-2 items-center'>
                                                                        <input
                                                                            type='time'
                                                                            name={`rangeFrom_${idx}`}
                                                                            defaultValue={range.from}
                                                                            placeholder='09:00'
                                                                            className='flex-1 rounded-xl bg-black/40 border border-white/10 p-2'
                                                                        />
                                                                        <span className='text-xs opacity-60'>→</span>
                                                                        <input
                                                                            type='time'
                                                                            name={`rangeTo_${idx}`}
                                                                            defaultValue={range.to}
                                                                            placeholder='18:00'
                                                                            className='flex-1 rounded-xl bg-black/40 border border-white/10 p-2'
                                                                        />
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        })}
                                                        <button type='submit' className='w-full rounded-xl bg-white/10 border border-white/15 px-4 py-2 text-sm font-semibold'>
                                                            Salva range orari
                                                        </button>
                                                    </form>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    <div>
                                        <div className='text-[11px] opacity-60 mb-2'>Cleaner censiti</div>
                                        {cfg.cleaners.length === 0 ? (
                                            <div className='text-sm opacity-50'>Nessun cleaner censito.</div>
                                        ) : (
                                            <div className='space-y-2'>
                                                {cfg.cleaners.map((nm) => (
                                                    <div key={nm} className='flex items-center justify-between rounded-xl bg-black/30 border border-white/10 p-3'>
                                                        <div className='text-sm font-semibold'>{nm}</div>
                                                        <form
                                                            action={async (fd: FormData) => {
                                                                'use server';
                                                                const aptId = (fd.get('aptId')?.toString() ?? '').trim();
                                                                const name = (fd.get('name')?.toString() ?? '').trim();
                                                                if (!aptId) return;
                                                                cleaners_remove(aptId, name);
                                                                redirect(`/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`);
                                                            }}>
                                                            <input type='hidden' name='aptId' value={aptId} />
                                                            <input type='hidden' name='name' value={nm} />
                                                            <button type='submit' className='text-xs px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30'>
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

                    {/* Stay list widget */}
                    <section className='rounded-2xl bg-white/5 border border-white/10 p-4'>
                        <div className='flex items-center justify-between gap-3 mb-3'>
                            <div className='text-sm opacity-70'>Soggiorni</div>
                            <div className='text-xs opacity-50'>{stays.length} stay</div>
                        </div>

                        {stays.length === 0 ? (
                            <div className='text-sm opacity-60 mb-4'>Nessun soggiorno registrato.</div>
                        ) : (
                            <div className='space-y-2 mb-4'>
                                {stays.map((st: any) => {
                                    const sid = String(st?.stayId ?? '');
                                    const g = Array.isArray(st?.guests) ? st.guests.length : 0;
                                    const checkin = st?.checkInAt ? fmtDT(st.checkInAt) : '—';
                                    const checkout = st?.checkOutAt ? fmtDT(st.checkOutAt) : '—';

                                    return (
                                        <Link
                                            key={sid}
                                            href={`/app/host/stay/${encodeURIComponent(sid)}?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`}
                                            className='block rounded-xl bg-black/30 border border-white/10 p-3 hover:border-white/20 transition-colors'>
                                            <div className='flex items-center justify-between gap-3'>
                                                <div className='min-w-0 flex-1'>
                                                    <div className='font-semibold text-sm font-mono truncate'>{sid}</div>
                                                    <div className='mt-1 text-xs opacity-60'>
                                                        {checkin} → {checkout}
                                                    </div>
                                                    {g > 0 && <div className='mt-1 text-xs opacity-50'>{g} ospiti</div>}
                                                </div>
                                                <div className='text-xs opacity-50'>→</div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}

                        <div className='rounded-xl bg-black/20 border border-white/10 p-4'>
                            <div className='text-sm font-semibold mb-3'>Crea nuovo soggiorno</div>
                            <form action={createStay} className='space-y-3'>
                                <input type='hidden' name='aptId' value={aptId} />

                                <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                                    <div>
                                        <div className='text-[11px] opacity-60 mb-1'>Check-in (data + ora)</div>
                                        <input type='datetime-local' name='checkin' className='w-full rounded-xl bg-black/40 border border-white/10 p-2' />
                                    </div>

                                    <div>
                                        <div className='text-[11px] opacity-60 mb-1'>Check-out (data + ora)</div>
                                        <input type='datetime-local' name='checkout' className='w-full rounded-xl bg-black/40 border border-white/10 p-2' />
                                    </div>
                                </div>

                                <div>
                                    <div className='text-[11px] opacity-60 mb-1'>Numero ospiti</div>
                                    <select name='guests' id='guestsCount' defaultValue='2' className='w-full rounded-xl bg-black/40 border border-white/10 p-2'>
                                        {Array.from({ length: 10 }).map((_, i) => (
                                            <option key={i + 1} value={String(i + 1)}>
                                                {i + 1}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <div className='text-[11px] opacity-60 mb-2'>
                                        Dati ospiti <span className='text-red-400'>*</span>
                                    </div>
                                    <GuestFields maxGuests={10} />
                                    <div className='mt-2 text-[11px] opacity-50'>I PIN di accesso verranno creati automaticamente per tutti gli ospiti.</div>
                                </div>

                                <div>
                                    <div className='text-[11px] opacity-60 mb-1'>
                                        Cleaner <span className='text-red-400'>*</span>
                                    </div>
                                    {(() => {
                                        const cfg = cleaners_getCfg(aptId);
                                        return (
                                            <select name='cleaner' required className='w-full rounded-xl bg-black/40 border border-white/10 p-2'>
                                                <option value=''>— Seleziona cleaner —</option>
                                                {cfg.cleaners.map((nm) => (
                                                    <option key={nm} value={nm}>
                                                        {nm}
                                                    </option>
                                                ))}
                                            </select>
                                        );
                                    })()}
                                    <div className='mt-1 text-[11px] opacity-50'>Il PIN del cleaner viene creato automaticamente (check-out → check-out + durata pulizia).</div>
                                </div>

                                <button type='submit' className='w-full rounded-xl bg-cyan-500/30 border border-cyan-400/30 p-2 font-semibold'>
                                    Crea soggiorno
                                </button>
                            </form>
                        </div>
                    </section>

                    <section className='rounded-2xl bg-white/5 border border-white/10 p-4'>
                        <div className='flex items-center justify-between gap-3 mb-3'>
                            <div className='text-sm opacity-70'>Attività recente (Access log)</div>
                            <div className='text-xs opacity-50'>Ultimi 20 eventi</div>
                        </div>

                        {accessEvents.length === 0 ? (
                            <div className='text-sm opacity-60'>Nessun evento registrato.</div>
                        ) : (
                            <div className='space-y-2'>
                                {accessEvents.map((e: any) => (
                                    <div key={String(e.id)} className='rounded-xl bg-black/30 border border-white/10 p-3'>
                                        <div className='flex items-center justify-between'>
                                            <div className='text-xs opacity-60'>{fmtDT(e.ts)}</div>
                                            <div className='text-[11px] opacity-60 font-mono'>{e.type}</div>
                                        </div>
                                        <div className='mt-1 text-sm font-semibold'>{e.label}</div>
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
        <main className='min-h-screen bg-[#0a0d12] text-white p-6'>
            <div className='max-w-5xl mx-auto space-y-5'>
                <div className='flex flex-col gap-3 md:flex-row md:items-end md:justify-between'>
                    <div>
                        <div className='text-xs opacity-60'>Host • Dashboard</div>
                        <h1 className='text-xl font-semibold'>{orgLabel}</h1>
                        <div className='mt-1 text-sm opacity-70'>
                            <span className='opacity-80'>{apartments.length} appartamenti</span>
                        </div>
                    </div>

                    <div className='flex items-center gap-3'>
                        <form action='/app/host' method='get' className='flex items-center gap-2'>
                            <input type='hidden' name='client' value={clientId} />
                            <input
                                name='q'
                                defaultValue={q}
                                placeholder='Cerca appartamento…'
                                className='w-56 rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm outline-none focus:border-cyan-400/60'
                            />
                            <button className='rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm opacity-90'>Cerca</button>
                        </form>

                        <form action='/api/auth/logout' method='post'>
                            <button className='rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm opacity-90'>Logout</button>
                        </form>
                    </div>
                </div>

                <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
                    <div className='rounded-2xl bg-white/5 border border-white/10 p-4'>
                        <div className='text-xs opacity-60'>Totali</div>
                        <div className='mt-1 text-2xl font-semibold'>{total}</div>
                    </div>
                    <div className='rounded-2xl bg-white/5 border border-white/10 p-4'>
                        <div className='text-xs opacity-60'>OK</div>
                        <div className='mt-1 text-2xl font-semibold'>{ok}</div>
                    </div>
                    <div className='rounded-2xl bg-white/5 border border-white/10 p-4'>
                        <div className='text-xs opacity-60'>Attenzione</div>
                        <div className='mt-1 text-2xl font-semibold'>{warn}</div>
                    </div>
                    <div className='rounded-2xl bg-white/5 border border-white/10 p-4'>
                        <div className='text-xs opacity-60'>Problema</div>
                        <div className='mt-1 text-2xl font-semibold'>{crit}</div>
                    </div>
                </div>

                <section className='rounded-2xl bg-white/5 border border-white/10 p-4'>
                    <div className='flex items-center justify-between gap-3'>
                        <div className='text-sm opacity-70'>🔴 Problemi (critical first)</div>
                        <div className='text-xs opacity-50'>Mostra max 5</div>
                    </div>

                    {criticalFirst.length === 0 ? (
                        <div className='mt-3 text-sm opacity-60'>Nessun problema critico rilevato.</div>
                    ) : (
                        <div className='mt-3 space-y-2'>
                            {criticalFirst.map((a) => (
                                <Link
                                    key={a.aptId}
                                    href={`/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(a.aptId)}`}
                                    className='block rounded-xl bg-black/30 border border-white/10 p-3 hover:border-white/20'>
                                    <div className='flex items-center justify-between'>
                                        <div className='font-semibold'>{a.name}</div>
                                        <div className='text-xs opacity-70'>{a.readiness}</div>
                                    </div>
                                    <div className='mt-1 text-sm opacity-70'>{a.lastEvent}</div>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>

                <section className='rounded-2xl bg-white/5 border border-white/10 p-4'>
                    <div className='flex items-center justify-between gap-3'>
                        <div className='text-sm opacity-70'>Appartamenti</div>
                        <div className='text-xs opacity-50'>Vista compatta</div>
                    </div>

                    <div className='mt-3 space-y-2'>
                        {healthFiltered.map((a) => (
                            <Link
                                key={a.aptId}
                                href={`/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(a.aptId)}`}
                                className='block rounded-xl bg-black/30 border border-white/10 p-4 hover:border-white/20'>
                                <div className='flex items-center justify-between gap-3'>
                                    <div>
                                        <div className='font-semibold'>{a.name}</div>
                                        <div className='mt-1 text-xs opacity-60'>Ultimo evento: {a.lastEvent}</div>
                                    </div>

                                    <div className='text-right'>
                                        <div className='text-xs opacity-60'>Stato</div>
                                        <div className='font-semibold'>
                                            {a.status === 'ok' && '🟢 OK'}
                                            {a.status === 'warn' && '🟡 Attenzione'}
                                            {a.status === 'crit' && '🔴 Problema'}
                                        </div>
                                        <div className='mt-1 text-xs opacity-70'>{a.readiness}</div>
                                    </div>
                                </div>
                            </Link>
                        ))}

                        {healthFiltered.length === 0 && <div className='text-sm opacity-60'>Nessun appartamento trovato.</div>}
                    </div>
                </section>
            </div>
        </main>
    );
}
