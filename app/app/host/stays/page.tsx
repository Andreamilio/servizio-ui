import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { readSession, validateSessionUser } from '@/app/lib/session';
import * as Store from '@/app/lib/store';
import { listClients, getApartment, type Client } from '@/app/lib/clientStore';
import type { Stay, StayGuest } from '@/app/lib/staysStore';
import { getUser } from '@/app/lib/userStore';
import { AppLayout } from '@/app/components/layouts/AppLayout';

import { cleaners_getCfg, cleaners_normName } from '@/app/lib/domain/cleanersDomain';

import { stays_listByApt } from '@/app/lib/domain/staysDomain';

import { stays_createWithGuestsAndCleaner } from '@/app/lib/domain/pinsDomain';
import { CreateStayModal } from '../components/CreateStayModal';

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


function fmtDTMedium(ts?: number | null): string {
    if (!ts) return '—';
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getResponsabileName(guests: StayGuest[]): string {
    if (!guests || guests.length === 0) return 'Nessun ospite';
    const first = guests[0];
    if (first.firstName && first.lastName) {
        return `${first.firstName} ${first.lastName}`;
    }
    return first.name || 'Nessun ospite';
}

export default async function HostStaysPage({ searchParams }: { searchParams?: SP | Promise<SP> }) {
    const sp = ((await Promise.resolve(searchParams)) ?? {}) as SP;
    const aptId = pick(sp, 'apt') ?? '';

    const cookieStore = await cookies();
    const sess = cookieStore.get('sess')?.value;
    const session = readSession(sess);
    const me = validateSessionUser(session);

    if (!me || me.role !== 'host') {
        return <div className="p-6 text-[var(--text-primary)]">Non autorizzato</div>;
    }

    if (!aptId) {
        redirect('/app/host');
        return;
    }

    // Get client info
    const hostUser = getUser(me.userId ?? '');
    const hostUserClientId = hostUser?.clientId ?? '';

    const availableClients = listClients();
    const getClientId = (c: Client) => String(c?.id ?? c?.clientId ?? c?.clientID ?? c?.slug ?? '');
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

        // Validazione: cleaner obbligatorio
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
                redirect(`/app/host/stays?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`);
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
            redirect(`/app/host/stays?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`);
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
            redirect(`/app/host/stays?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`);
            return;
        }

        if (!st || !st.stayId) {
            console.error('Stay non creato correttamente:', { st, guests, aptId, vf, vt, selectedCleaner });
            redirect(`/app/host/stays?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`);
            return;
        }

        // Verifica che lo stay sia stato salvato
        const verifyStay = stays_listByApt(aptId).find((s: Stay) => s.stayId === st.stayId);
        if (!verifyStay) {
            console.error('Stay creato ma non trovato nella lista:', st.stayId);
        }

        // Redirect alla pagina di dettaglio dello stay
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
            <div className='max-w-3xl mx-auto space-y-5 p-4 sm:p-6'>
                <div className='flex items-center justify-between gap-3'>
                    <div>
                        <Link 
                            href={`/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`}
                            className='text-sm opacity-70 hover:opacity-100'
                        >
                            ← Torna alla dashboard
                        </Link>
                        <div className='mt-2'>
                            <div className='text-lg font-semibold'>Soggiorni</div>
                            <div className='text-sm opacity-70'>{apartment.name}</div>
                        </div>
                    </div>
                </div>

                {/* Stay list */}
                <section className='rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] p-4'>
                    <div className='flex items-center justify-between gap-3 mb-3'>
                        <div className='text-sm opacity-70'>Soggiorni</div>
                        <div className='text-xs opacity-50'>{stays.length} stay</div>
                    </div>

                    {stays.length === 0 ? (
                        <div className='text-sm opacity-60 mb-4'>Nessun soggiorno registrato.</div>
                    ) : (
                        <div className='space-y-2 mb-4'>
                            {stays.map((st: Stay) => {
                                const sid = String(st?.stayId ?? '');
                                const g = Array.isArray(st?.guests) ? st.guests.length : 0;
                                const checkin = st?.checkInAt ? fmtDTMedium(st.checkInAt) : '—';
                                const checkout = st?.checkOutAt ? fmtDTMedium(st.checkOutAt) : '—';
                                const responsabileName = getResponsabileName(st?.guests || []);
                                const stayTitle = `${responsabileName} - ${checkin} - ${checkout}`;

                                return (
                                    <Link
                                        key={sid}
                                        href={`/app/host/stay/${encodeURIComponent(sid)}?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`}
                                        className='block rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] p-3 hover:border-[var(--border-medium)] transition-colors'>
                                        <div className='flex items-center justify-between gap-3'>
                                            <div className='min-w-0 flex-1'>
                                                <div className='font-semibold text-sm truncate'>{stayTitle}</div>
                                                {g > 0 && <div className='mt-1 text-xs opacity-50'>{g} ospiti</div>}
                                            </div>
                                            <div className='text-xs opacity-50'>→</div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}

                    {/* Bottone per aprire modale creazione soggiorno */}
                    <div className='pt-4'>
                        {(() => {
                            const cfg = cleaners_getCfg(aptId);
                            return (
                                <CreateStayModal
                                    aptId={aptId}
                                    cleaners={cfg.cleaners}
                                    createStayAction={createStay}
                                />
                            );
                        })()}
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}

