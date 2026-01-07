'use client';

import { useState, useRef } from 'react';
import { Modal } from '@/app/components/ui/Modal';
import { GuestFields } from './GuestFields';

type Cleaner = {
    name: string;
    phone: string;
};

type CreateStayModalProps = {
    aptId: string;
    cleaners: Cleaner[];
    createStayAction: (formData: FormData) => Promise<void>;
};

export function CreateStayModal({ aptId, cleaners, createStayAction }: CreateStayModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    function handleClose() {
        setIsOpen(false);
        formRef.current?.reset();
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        try {
            await createStayAction(formData);
            handleClose();
        } catch (error) {
            console.error('Error creating stay:', error);
        }
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className='w-full rounded-xl bg-cyan-500/30 hover:bg-cyan-500/40 border border-cyan-400/30 px-4 py-3 font-semibold text-sm transition-colors'
            >
                + Crea nuovo soggiorno
            </button>

            <Modal isOpen={isOpen} onClose={handleClose} title="Crea nuovo soggiorno" size="lg">
                <form ref={formRef} onSubmit={handleSubmit} className='space-y-4 min-w-0'>
                    <input type='hidden' name='aptId' value={aptId} />

                    <div className='grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0'>
                        <div>
                            <div className='text-[11px] opacity-60 mb-1'>Check-in (data + ora)</div>
                            <input 
                                type='datetime-local' 
                                name='checkin' 
                                required
                                className='w-full rounded-xl bg-[var(--bg-card)] border border-[var(--border-light)] p-2' 
                            />
                        </div>

                        <div>
                            <div className='text-[11px] opacity-60 mb-1'>Check-out (data + ora)</div>
                            <input 
                                type='datetime-local' 
                                name='checkout' 
                                required
                                className='w-full rounded-xl bg-[var(--bg-card)] border border-[var(--border-light)] p-2' 
                            />
                        </div>
                    </div>

                    <div>
                        <div className='text-[11px] opacity-60 mb-1'>Numero ospiti</div>
                        <select 
                            name='guests' 
                            id='guestsCount' 
                            defaultValue='2' 
                            className='w-full rounded-xl bg-[var(--bg-card)] border border-[var(--border-light)] p-2'
                        >
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
                        <select 
                            name='cleaner' 
                            required 
                            className='w-full rounded-xl bg-[var(--bg-card)] border border-[var(--border-light)] p-2'
                        >
                            <option value=''>— Seleziona cleaner —</option>
                            {cleaners.map((cleaner) => (
                                <option key={cleaner.name} value={cleaner.name}>
                                    {cleaner.name} - {cleaner.phone}
                                </option>
                            ))}
                        </select>
                        <div className='mt-1 text-[11px] opacity-50'>Il PIN del cleaner viene creato automaticamente (check-out → check-out + durata pulizia).</div>
                    </div>

                    <div className='flex gap-3 pt-2 border-t border-[var(--border-light)]'>
                        <button
                            type='button'
                            onClick={handleClose}
                            className='flex-1 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-light)] px-4 py-2 text-sm font-semibold'
                        >
                            Annulla
                        </button>
                        <button 
                            type='submit' 
                            className='flex-1 rounded-xl bg-cyan-500/30 hover:bg-cyan-500/40 border border-cyan-400/30 px-4 py-2 text-sm font-semibold'
                        >
                            Crea soggiorno
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    );
}

