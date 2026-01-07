import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { readSession, validateSessionUser } from '@/app/lib/session';
import { listClients, getApartment, type Client } from '@/app/lib/clientStore';
import { getUser } from '@/app/lib/userStore';
import { AppLayout } from '@/app/components/layouts/AppLayout';

import { cleaners_getCfg, cleaners_setDuration, cleaners_add, cleaners_remove, cleaners_setTimeRanges } from '@/app/lib/domain/cleanersDomain';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type SP = Record<string, string | string[] | undefined>;

function pick(sp: SP, key: string) {
    const v = sp[key];
    return typeof v === 'string' ? v : Array.isArray(v) ? v[0] : undefined;
}

export default async function HostCleanersPage({ searchParams }: { searchParams?: SP | Promise<SP> }) {
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
                            <div className='text-lg font-semibold'>Cleaner</div>
                            <div className='text-sm opacity-70'>{apartment.name}</div>
                        </div>
                    </div>
                </div>

                {/* Cleaner config */}
                <section className='rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] p-4'>
                    <div>
                        <div className='text-sm font-semibold'>Cleaner (per appartamento)</div>
                        <div className='mt-1 text-xs opacity-60'>Configura durata standard pulizia e censisci i cleaner per questo appartamento.</div>
                    </div>

                    <div className='mt-4 space-y-4'>
                        <form
                            action={async (fd: FormData) => {
                                'use server';
                                const aptId = (fd.get('aptId')?.toString() ?? '').trim();
                                if (!aptId) return;
                                const durationMin = Math.max(15, Math.min(24 * 60, Number(fd.get('durationMin')?.toString() ?? '60') || 60));
                                cleaners_setDuration(aptId, durationMin);
                                redirect(`/app/host/cleaners?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`);
                            }}
                            className='space-y-2'>
                            <input type='hidden' name='aptId' value={aptId} />
                            <div className='text-[11px] opacity-60'>Durata pulizia default</div>
                            <div className='flex flex-col sm:flex-row gap-2'>
                                <select name='durationMin' defaultValue={String(cfg.durationMin)} className='flex-1 min-w-0 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] p-2'>
                                    {[30, 45, 60, 90, 120, 180, 240].map((m) => (
                                        <option key={m} value={String(m)}>
                                            {m} min
                                        </option>
                                    ))}
                                </select>
                                <button type='submit' className='rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-light)] px-4 py-2 text-sm font-semibold whitespace-nowrap'>
                                    Salva
                                </button>
                            </div>
                        </form>

                        <form
                            action={async (fd: FormData) => {
                                'use server';
                                const aptId = (fd.get('aptId')?.toString() ?? '').trim();
                                const name = fd.get('cleanerName')?.toString() ?? '';
                                const phone = fd.get('cleanerPhone')?.toString() ?? '';
                                if (!aptId) return;
                                cleaners_add(aptId, name, phone);
                                redirect(`/app/host/cleaners?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`);
                            }}
                            className='space-y-2'>
                            <input type='hidden' name='aptId' value={aptId} />
                            <div className='text-[11px] opacity-60'>Aggiungi cleaner</div>
                            <div className='flex flex-col sm:flex-row gap-2'>
                                <input name='cleanerName' placeholder='Es. Mario Rossi' required className='flex-1 min-w-0 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] p-2' />
                                <input name='cleanerPhone' type='tel' placeholder='Telefono' required className='flex-1 min-w-0 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] p-2' />
                                <button type='submit' className='rounded-xl bg-cyan-500/30 border border-cyan-400/30 px-4 py-2 text-sm font-semibold whitespace-nowrap'>
                                    Aggiungi
                                </button>
                            </div>
                        </form>

                        <div>
                            <div className='text-[11px] opacity-60 mb-2'>Range orari pulizie</div>
                            <div className='text-xs opacity-50 mb-2'>Le pulizie assegnate verranno schedulati nel primo range disponibile dopo il check-out.</div>
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

                                                            redirect(`/app/host/cleaners?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`);
                                                        }}
                                                        className='flex flex-col sm:flex-row gap-2 items-stretch sm:items-center'>
                                                        <input type='hidden' name='aptId' value={aptId} />
                                                        <input type='hidden' name='rangeIndex' value={idx} />
                                                        <input
                                                            type='time'
                                                            defaultValue={range.from}
                                                            placeholder='09:00'
                                                            className='flex-1 min-w-0 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] p-2 opacity-60'
                                                            disabled
                                                        />
                                                        <span className='text-xs opacity-60 hidden sm:inline'>→</span>
                                                        <input
                                                            type='time'
                                                            defaultValue={range.to}
                                                            placeholder='18:00'
                                                            className='flex-1 min-w-0 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] p-2 opacity-60'
                                                            disabled
                                                        />
                                                        <button
                                                            type='submit'
                                                            className='text-xs px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 whitespace-normal sm:whitespace-nowrap'>
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
                                                redirect(`/app/host/cleaners?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`);
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
                                                const isEmpty = !range.from && !range.to;

                                                if (!isRemovable) {
                                                    if (isLast && isEmpty) {
                                                        // Range vuoto per aggiungere nuovo
                                                        return (
                                                            <div key={idx} className='space-y-2 pt-2 border-t border-[var(--border-light)]'>
                                                                <div className='text-[10px] opacity-70 font-medium'>+ Aggiungi nuovo range</div>
                                                                <div className='flex flex-col sm:flex-row gap-2 items-stretch sm:items-center'>
                                                                    <input
                                                                        type='time'
                                                                        name={`rangeFrom_${idx}`}
                                                                        defaultValue={range.from}
                                                                        placeholder='09:00'
                                                                        className='flex-1 min-w-0 rounded-xl bg-[var(--bg-secondary)] border-2 border-dashed border-[var(--border-strong)] p-2'
                                                                    />
                                                                    <span className='text-xs opacity-60 hidden sm:inline'>→</span>
                                                                    <input
                                                                        type='time'
                                                                        name={`rangeTo_${idx}`}
                                                                        defaultValue={range.to}
                                                                        placeholder='18:00'
                                                                        className='flex-1 min-w-0 rounded-xl bg-[var(--bg-secondary)] border-2 border-dashed border-[var(--border-strong)] p-2'
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    // Primo range (sempre presente)
                                                    return (
                                                        <div key={idx} className='flex flex-col sm:flex-row gap-2 items-stretch sm:items-center'>
                                                            <input
                                                                type='time'
                                                                name={`rangeFrom_${idx}`}
                                                                defaultValue={range.from}
                                                                placeholder='09:00'
                                                                className='flex-1 min-w-0 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] p-2'
                                                            />
                                                            <span className='text-xs opacity-60 hidden sm:inline'>→</span>
                                                            <input
                                                                type='time'
                                                                name={`rangeTo_${idx}`}
                                                                defaultValue={range.to}
                                                                placeholder='18:00'
                                                                className='flex-1 min-w-0 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] p-2'
                                                            />
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })}
                                            <button type='submit' className='w-full rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-light)] px-4 py-2 text-sm font-semibold'>
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
                                    {cfg.cleaners.map((cleaner) => (
                                        <div key={cleaner.name} className='flex items-center justify-between rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] p-3'>
                                            <div>
                                                <div className='text-sm font-semibold'>{cleaner.name}</div>
                                                <div className='text-xs opacity-60'>{cleaner.phone}</div>
                                            </div>
                                            <form
                                                action={async (fd: FormData) => {
                                                    'use server';
                                                    const aptId = (fd.get('aptId')?.toString() ?? '').trim();
                                                    const name = (fd.get('name')?.toString() ?? '').trim();
                                                    if (!aptId) return;
                                                    cleaners_remove(aptId, name);
                                                    redirect(`/app/host/cleaners?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`);
                                                }}>
                                                <input type='hidden' name='aptId' value={aptId} />
                                                <input type='hidden' name='name' value={cleaner.name} />
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
                </section>
            </div>
        </AppLayout>
    );
}


