'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

export function GuestFields({ maxGuests = 10 }: { maxGuests?: number }) {
    const [guestsCount, setGuestsCount] = useState(2);
    const initializedRef = useRef(false);
    const selectRef = useRef<HTMLSelectElement | null>(null);

    // Callback per sincronizzare lo stato con il valore del select
    const syncWithSelect = useCallback(() => {
        const select = selectRef.current || document.getElementById('guestsCount') as HTMLSelectElement;
        if (select) {
            const count = parseInt(select.value) || 2;
            setGuestsCount(count);
        }
    }, []);

    useEffect(() => {
        // Handler per il change event
        const handleChange = () => {
            syncWithSelect();
        };

        // Funzione per inizializzare il listener
        const initializeListener = (select: HTMLSelectElement) => {
            if (initializedRef.current) return;
            initializedRef.current = true;
            selectRef.current = select;
            
            // Sincronizza il valore iniziale tramite callback (non direttamente nell'effect)
            requestAnimationFrame(() => {
                syncWithSelect();
            });
            
            select.addEventListener('change', handleChange);
        };

        // Controlla subito se il select esiste già
        const existingSelect = document.getElementById('guestsCount') as HTMLSelectElement;
        if (existingSelect) {
            initializeListener(existingSelect);
            return () => {
                existingSelect.removeEventListener('change', handleChange);
            };
        }

        // Altrimenti usa MutationObserver per attendere che il select sia nel DOM
        const observer = new MutationObserver(() => {
            const select = document.getElementById('guestsCount') as HTMLSelectElement;
            if (select) {
                initializeListener(select);
                observer.disconnect();
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
        
        return () => {
            observer.disconnect();
            if (selectRef.current) {
                selectRef.current.removeEventListener('change', handleChange);
            }
        };
    }, [maxGuests, syncWithSelect]);

    return (
        <div className='space-y-3 min-w-0'>
            {Array.from({ length: guestsCount }).map((_, i) => {
                const guestNum = i + 1;
                return (
                    <div
                        key={guestNum}
                        id={`guest_${guestNum}_container`}
                        className='guest-container rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] p-4 space-y-3 min-w-0'>
                        <div className='text-sm font-medium text-[var(--text-primary)] mb-2'>{guestNum === 1 ? 'Responsabile soggiorno' : `Ospite ${guestNum}`}</div>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0'>
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
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0'>
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

