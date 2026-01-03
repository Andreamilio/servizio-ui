"use client";

import { useState, useRef } from "react";

type ProblemModalProps = {
  jobId: string;
  onReport: (formData: FormData) => Promise<void>;
};

export function ProblemModal({ jobId, onReport }: ProblemModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function handleOpen() {
    setIsOpen(true);
  }

  function handleClose() {
    setIsOpen(false);
    formRef.current?.reset();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    // Chiudi la modale prima di chiamare la server action
    handleClose();
    try {
      await onReport(formData);
    } catch (error) {
      console.error("Error reporting problem:", error);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className="rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 px-4 py-2 font-semibold"
      >
        Segnala problema
      </button>
    );
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 px-4 py-2 font-semibold"
      >
        Segnala problema
      </button>

      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={handleClose}>
        <div
          className="bg-[#0a0d12] border border-white/10 rounded-2xl max-w-md w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Segnala problema</h3>
              <button
                type="button"
                onClick={handleClose}
                className="text-white/60 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-sm opacity-70 mb-2">Note</label>
              <textarea
                name="note"
                rows={4}
                className="w-full rounded-xl bg-black/40 border border-white/10 p-3 text-sm text-white"
                placeholder="Descrivi il problema..."
              />
            </div>

            <div>
              <label className="block text-sm opacity-70 mb-2">Foto</label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((num) => (
                  <div key={num} className="relative aspect-square rounded-lg overflow-hidden border border-white/10 bg-[#4a5568] flex items-center justify-center">
                    <span className="text-sm text-[#a0aec0] font-semibold">Foto {num}</span>
                  </div>
                ))}
              </div>
            </div>

            <input type="hidden" name="jobId" value={jobId} />

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 text-sm font-semibold"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 px-4 py-2 text-sm font-semibold"
              >
                Conferma
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

