import { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Textarea({ label, error, helperText, className = "", ...props }: TextareaProps) {
  const textareaClasses = `w-full rounded-xl bg-[var(--bg-secondary)] border px-4 py-2.5 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none ${
    error ? "border-[var(--accent-error)] focus:ring-[var(--accent-error)]" : "border-[var(--border-light)]"
  } ${className}`;
  
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          {label}
        </label>
      )}
      <textarea className={textareaClasses} {...props} />
      {error && (
        <p className="mt-1.5 text-sm text-[var(--accent-error)]">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1.5 text-sm text-[var(--text-secondary)]">{helperText}</p>
      )}
    </div>
  );
}

