"use client";

import { useState, useRef } from "react";
import { Modal } from "@/app/components/ui/Modal";
import { Button } from "@/app/components/ui/Button";
import { Textarea } from "@/app/components/ui/Textarea";

type ProblemModalProps = {
  jobId: string;
  onReport: (formData: FormData) => Promise<void>;
};

export function ProblemModal({ jobId, onReport }: ProblemModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function handleClose() {
    setIsOpen(false);
    formRef.current?.reset();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    handleClose();
    try {
      await onReport(formData);
    } catch (error) {
      console.error("Error reporting problem:", error);
    }
  }

  return (
    <>
      <Button variant="danger" onClick={() => setIsOpen(true)}>
        Segnala problema
      </Button>

      <Modal isOpen={isOpen} onClose={handleClose} title="Segnala problema" size="md">
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            name="note"
            label="Note"
            rows={4}
            placeholder="Descrivi il problema..."
            required
          />

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Foto</label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((num) => (
                <div key={num} className="relative aspect-square rounded-lg overflow-hidden border border-[var(--border-light)] bg-[var(--bg-secondary)] flex items-center justify-center">
                  <span className="text-sm text-[var(--text-tertiary)] font-semibold">Foto {num}</span>
                </div>
              ))}
            </div>
          </div>

          <input type="hidden" name="jobId" value={jobId} />

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={handleClose} fullWidth>
              Annulla
            </Button>
            <Button type="submit" variant="danger" fullWidth>
              Conferma
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

