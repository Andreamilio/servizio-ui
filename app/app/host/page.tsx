import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { readSession, validateSessionUser } from '@/app/lib/session';
import * as Store from '@/app/lib/store';
import { listJobsByApt } from '@/app/lib/cleaningstore';
import { listClients, listApartmentsByClient, getApartment, updateApartment, type Client, type Apartment } from '@/app/lib/clientStore';
import { getUser } from '@/app/lib/userStore';
import { AppLayout } from '@/app/components/layouts/AppLayout';
import { ApartmentSearchForm } from './components/ApartmentSearchForm';

import { getAllEnabledDevices, getDeviceState, getDeviceLabel } from '@/app/lib/devicePackageStore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type SP = Record<string, string | string[] | undefined>;

function pick(sp: SP, key: string) {
    const v = sp[key];
    return typeof v === 'string' ? v : Array.isArray(v) ? v[0] : undefined;
}

function fmtDT(ts?: number | null) {
    if (!ts) return '—';
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getDoorUi(aptId: string): { label: string; tone: 'open' | 'closed' | 'unknown' } {
    const log = Store.listAccessLogByApt(aptId, 50) ?? [];
    const last = log.find((e: Store.AccessEvent) => e?.type === 'door_opened' || e?.type === 'door_closed');
    // Default a BLOCCATA (closed) per prototipo
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
    const sp = ((await Promise.resolve(searchParams)) ?? {}) as SP;
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
        return <div className='p-6 text-[var(--text-primary)]'>Non autorizzato</div>;
    }

    const clients = listClients();
    const getClientId = (c: Client) => String(c?.id ?? c?.clientId ?? c?.clientID ?? c?.slug ?? '');
    
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
        ? listApartmentsByClient(clientId).map((a: Apartment) => ({
              aptId: String(a?.aptId ?? a?.id ?? a?.apt ?? ''),
              name: String(a?.aptName ?? a?.name ?? a?.title ?? `Apt ${a?.aptId ?? a?.id ?? ''}`),
          }))
        : listClients().flatMap((c: Client) => 
            listApartmentsByClient(getClientId(c)).map((a: Apartment) => ({
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
        // Filtra eventi WAN/VPN: visibili solo nella vista Tech
        const accessEvents = allAccessEvents.filter((e: Store.AccessEvent) => e.type !== 'wan_switched' && e.type !== 'vpn_toggled');

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
                <div className='max-w-3xl mx-auto space-y-5 p-4 sm:p-6'>
                    <div className='flex items-start justify-between gap-3'>
                        <div>
                            <div className='text-xs opacity-60'>Host • Dettaglio appartamento</div>
                            <h1 className='text-lg font-semibold'>{apt?.name ?? (aptId ? `Apt ${aptId}` : 'Apt')}</h1>
                        </div>

                        <div className='flex flex-wrap items-center justify-end gap-2 sm:gap-3'>
                            <Link className='whitespace-normal sm:whitespace-nowrap text-sm opacity-70 hover:opacity-100' href={clientId ? `/app/host?client=${encodeURIComponent(clientId)}` : '/app/host'}>
                                ← Dashboard
                            </Link>
                        </div>
                    </div>

                    <section className='rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] p-4'>
                        <div className='flex items-center justify-between gap-3'>
                            <div>
                                <div className='text-sm opacity-70'>Stato operativo</div>
                                <div className='mt-1 font-semibold'>{health?.readiness ?? '—'}</div>

                                <div className='mt-2 text-sm opacity-70'>Porta</div>
                                <div
                                    className={`mt-1 inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                                        doorUi.tone === 'open'
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                            : doorUi.tone === 'closed'
                                            ? 'bg-[var(--bg-card)] border-[var(--border-light)] text-[var(--text-primary)]'
                                            : 'bg-yellow-100 border-yellow-300 text-yellow-900'
                                    }`}>
                                    <span className={`h-2 w-2 rounded-full ${doorUi.tone === 'open' ? 'bg-emerald-400' : doorUi.tone === 'closed' ? 'bg-[var(--text-tertiary)]' : 'bg-yellow-400'}`} />
                                    {doorUi.label}
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
                                            doorUi.tone === 'open' ? 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-light)]' : 'bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-400/30'
                                        }`}>
                                        {doorUi.tone === 'open' ? 'Chiudi porta' : 'Apri porta'}
                                    </button>
                                </form>
                            )}

                            <form action={actOpenGate}>
                                <button
                                    type='submit'
                                    className='rounded-xl px-4 py-2 text-sm font-semibold bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-400/30'>
                                    Apri portone
                                </button>
                            </form>

                            <Link 
                                href={aptId 
                                    ? `/app/host/support?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`
                                    : clientId
                                    ? `/app/host/support?client=${encodeURIComponent(clientId)}`
                                    : '/app/host/support'
                                }
                                className='rounded-xl bg-[var(--bg-card)] border border-[var(--border-light)] px-4 py-2 text-sm opacity-90'>
                                Supporto
                            </Link>
                        </div>
                    </section>

                    {/* Dettagli Appartamento */}
                    <section className='rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] p-4'>
                        <div className='text-sm font-semibold mb-4'>Dettagli Appartamento</div>
                        <form
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
                            className='space-y-4'>
                            <input type='hidden' name='aptId' value={aptId} />

                            <div className='grid grid-cols-2 gap-4'>
                                <div>
                                    <label className='block text-sm font-medium mb-2'>Wi-Fi SSID</label>
                                    <input
                                        type='text'
                                        name='wifiSsid'
                                        defaultValue={apartmentDetails?.wifiSsid ?? ''}
                                        className='w-full rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] px-4 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-cyan-500'
                                        placeholder='Nome rete Wi-Fi'
                                    />
                                </div>
                                <div>
                                    <label className='block text-sm font-medium mb-2'>Wi-Fi Password</label>
                                    <input
                                        type='text'
                                        name='wifiPass'
                                        defaultValue={apartmentDetails?.wifiPass ?? ''}
                                        className='w-full rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] px-4 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-cyan-500'
                                        placeholder='Password Wi-Fi'
                                    />
                                </div>
                            </div>

                            <div>
                                <label className='block text-sm font-medium mb-2'>House Rules (una per riga)</label>
                                <textarea
                                    name='rules'
                                    rows={4}
                                    defaultValue={apartmentDetails?.rules?.join('\n') ?? ''}
                                    className='w-full rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] px-4 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-cyan-500'
                                    placeholder='No smoking&#10;Silenzio dopo le 22:30'
                                />
                            </div>

                            <div>
                                <label className='block text-sm font-medium mb-2'>Contatti Supporto</label>
                                <textarea
                                    name='supportContacts'
                                    rows={2}
                                    defaultValue={apartmentDetails?.supportContacts ?? ''}
                                    className='w-full rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] px-4 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-cyan-500'
                                    placeholder='Telefono, email, ecc.'
                                />
                            </div>

                            <div className='flex gap-3 pt-2 border-t border-[var(--border-light)]'>
                                <button
                                    type='submit'
                                    className='rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 px-6 py-3 font-semibold text-sm'>
                                    Salva Dettagli
                                </button>
                            </div>
                        </form>
                    </section>

                    {/* Device Status */}
                    <section className='rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] p-4'>
                        <div className='text-sm font-semibold mb-4'>Device</div>
                        {(() => {
                            const enabledDevices = getAllEnabledDevices(aptId);
                            
                            if (enabledDevices.length === 0) {
                                return (
                                    <div className='text-sm opacity-60 py-4 text-center'>
                                        Nessun device configurato per questo appartamento.
                                        <div className='text-xs opacity-50 mt-1'>I device vengono configurati dalla sezione Tech.</div>
                                    </div>
                                );
                            }

                            return (
                                <div className='space-y-2'>
                                    {enabledDevices.map((deviceType) => {
                                        const state = getDeviceState(aptId, deviceType);
                                        const label = getDeviceLabel(deviceType);
                                        const isOnline = state === 'online';

                                        return (
                                            <div
                                                key={deviceType}
                                                className='flex items-center justify-between gap-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] p-3'>
                                                <div className='flex-1 min-w-0'>
                                                    <div className='text-sm font-semibold'>{label}</div>
                                                    <div className='text-xs opacity-60 mt-0.5'>{deviceType}</div>
                                                </div>
                                                <div className='flex items-center gap-2'>
                                                    <div
                                                        className={`text-xs px-3 py-1 rounded-lg border ${
                                                            isOnline
                                                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                                                : 'bg-red-50 border-red-200 text-red-700'
                                                        }`}>
                                                        {state.toUpperCase()}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </section>



                    <section className='rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] p-4'>
                        <div className='flex items-center justify-between gap-3 mb-3'>
                            <div className='text-sm opacity-70'>Attività recente (Access log)</div>
                            <div className='text-xs opacity-50'>Ultimi 20 eventi</div>
                        </div>

                        {accessEvents.length === 0 ? (
                            <div className='text-sm opacity-60'>Nessun evento registrato.</div>
                        ) : (
                            <div className='space-y-2'>
                                {accessEvents.map((e: Store.AccessEvent) => (
                                    <div key={String(e.id)} className='rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] p-3'>
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
            <div className='max-w-5xl mx-auto space-y-5 p-4 sm:p-6'>
                <div className='flex flex-col gap-3 md:flex-row md:items-end md:justify-between'>
                    <div>
                        <div className='text-xs opacity-60'>Host • Dashboard</div>
                        <h1 className='text-xl font-semibold'>{orgLabel}</h1>
                        <div className='mt-1 text-sm opacity-70'>
                            <span className='opacity-80'>{apartments.length} appartamenti</span>
                        </div>
                    </div>
                </div>

                <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
                    <div className='rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] p-4'>
                        <div className='text-xs opacity-60'>Totali</div>
                        <div className='mt-1 text-2xl font-semibold'>{total}</div>
                    </div>
                    <div className='rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] p-4'>
                        <div className='text-xs opacity-60'>OK</div>
                        <div className='mt-1 text-2xl font-semibold'>{ok}</div>
                    </div>
                    <div className='rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] p-4'>
                        <div className='text-xs opacity-60'>Attenzione</div>
                        <div className='mt-1 text-2xl font-semibold'>{warn}</div>
                    </div>
                    <div className='rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] p-4'>
                        <div className='text-xs opacity-60'>Problema</div>
                        <div className='mt-1 text-2xl font-semibold'>{crit}</div>
                    </div>
                </div>

                <section className='rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] p-4'>
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
                                    className='block rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] p-3 hover:border-[var(--border-medium)]'>
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

                <div className='flex items-center gap-3'>
                    <ApartmentSearchForm clientId={clientId} initialQuery={q} />
                </div>

                <section className='rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] p-4'>
                    <div className='flex items-center justify-between gap-3'>
                        <div className='text-sm opacity-70'>Appartamenti</div>
                        <div className='text-xs opacity-50'>Vista compatta</div>
                    </div>

                    <div className='mt-3 space-y-2'>
                        {healthFiltered.map((a) => (
                            <Link
                                key={a.aptId}
                                href={`/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(a.aptId)}`}
                                className='block rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] p-4 hover:border-[var(--border-medium)]'>
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
        </AppLayout>
    );
}
