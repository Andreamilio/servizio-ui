'use client';

import { useRef, useEffect } from 'react';

type ApartmentSearchFormProps = {
    clientId: string;
    initialQuery?: string;
};

export function ApartmentSearchForm({ clientId, initialQuery = '' }: ApartmentSearchFormProps) {
    const formRef = useRef<HTMLFormElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const input = inputRef.current;
        if (!input) return;

        let timeoutId: NodeJS.Timeout;

        const handleInput = () => {
            // Cancella il timeout precedente
            clearTimeout(timeoutId);
            
            // Fai submit automatico dopo un breve delay (debounce)
            timeoutId = setTimeout(() => {
                if (formRef.current) {
                    formRef.current.submit();
                }
            }, 500); // Delay di 500ms per evitare troppi submit durante la digitazione
        };

        input.addEventListener('input', handleInput);

        return () => {
            clearTimeout(timeoutId);
            input.removeEventListener('input', handleInput);
        };
    }, []);

    return (
        <form 
            ref={formRef}
            action='/app/host' 
            method='get' 
            className='flex items-center gap-2 w-full'
        >
            <input type='hidden' name='client' value={clientId} />
            <input
                ref={inputRef}
                name='q'
                defaultValue={initialQuery}
                placeholder='Cerca appartamento…'
                className='flex-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] px-3 py-2 text-sm outline-none focus:border-cyan-400/60'
            />
            <button 
                type='submit'
                className='rounded-xl bg-[var(--bg-card)] border border-[var(--border-light)] px-3 py-2 text-sm opacity-90'
            >
                Cerca
            </button>
        </form>
    );
}

