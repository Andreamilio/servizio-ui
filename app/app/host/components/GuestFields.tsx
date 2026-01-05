'use client';

import { useEffect, useState } from 'react';

export function GuestFields({ maxGuests = 10 }: { maxGuests?: number }) {
    const [guestsCount, setGuestsCount] = useState(2);

    useEffect(() => {
        const select = document.getElementById('guestsCount') as HTMLSelectElement;
        if (!select) {
            // Se il select non esiste ancora, riprova dopo un breve delay
            const timeout = setTimeout(() => {
                const retrySelect = document.getElementById('guestsCount') as HTMLSelectElement;
                if (retrySelect) {
                    const initialCount = parseInt(retrySelect.value) || 2;
                    setGuestsCount(initialCount);
                    updateVisibilityForSelect(retrySelect);
                }
            }, 100);
            return () => clearTimeout(timeout);
        }

        const updateVisibilityForSelect = (sel: HTMLSelectElement) => {
            const count = parseInt(sel.value) || 2;
            setGuestsCount(count);
            // Non serve più gestire la visibilità perché ora renderizziamo solo i campi necessari
        };

        // Inizializza con il valore corrente del select
        const initialCount = parseInt(select.value) || 2;
        setGuestsCount(initialCount);
        updateVisibilityForSelect(select);
        
        // Aggiungi listener
        select.addEventListener('change', () => updateVisibilityForSelect(select));
        
        return () => {
            select.removeEventListener('change', () => updateVisibilityForSelect(select));
        };
    }, [maxGuests]);

    return (
        <div className='space-y-3'>
            {Array.from({ length: guestsCount }).map((_, i) => {
                const guestNum = i + 1;
                return (
                    <div
                        key={guestNum}
                        id={`guest_${guestNum}_container`}
                        className='guest-container rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] p-4 space-y-3'>
                        <div className='text-sm font-medium text-[var(--text-primary)] mb-2'>Ospite {guestNum}</div>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                            <div>
                                <div className='text-xs font-medium text-[var(--text-primary)] mb-1.5'>
                                    Nome <span className='text-[var(--accent-error)]'>*</span>
                                </div>
                                <input
                                    type='text'
                                    name={`guest_${guestNum}_firstName`}
                                    required
                                    placeholder='Nome'
                                    className='w-full rounded-xl bg-[var(--bg-card)] border border-[var(--border-light)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]'
                                />
                            </div>
                            <div>
                                <div className='text-xs font-medium text-[var(--text-primary)] mb-1.5'>
                                    Cognome <span className='text-[var(--accent-error)]'>*</span>
                                </div>
                                <input
                                    type='text'
                                    name={`guest_${guestNum}_lastName`}
                                    required
                                    placeholder='Cognome'
                                    className='w-full rounded-xl bg-[var(--bg-card)] border border-[var(--border-light)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]'
                                />
                            </div>
                        </div>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                            <div>
                                <div className='text-xs font-medium text-[var(--text-primary)] mb-1.5'>
                                    Telefono <span className='text-[var(--accent-error)]'>*</span>
                                </div>
                                <input
                                    type='tel'
                                    name={`guest_${guestNum}_phone`}
                                    required
                                    placeholder='+39 123 456 7890'
                                    className='w-full rounded-xl bg-[var(--bg-card)] border border-[var(--border-light)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]'
                                />
                            </div>
                            <div>
                                <div className='text-xs font-medium text-[var(--text-primary)] mb-1.5'>Email (opzionale)</div>
                                <input
                                    type='email'
                                    name={`guest_${guestNum}_email`}
                                    placeholder='email@example.com'
                                    className='w-full rounded-xl bg-[var(--bg-card)] border border-[var(--border-light)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]'
                                />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

