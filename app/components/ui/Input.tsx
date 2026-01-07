import { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({ label, error, helperText, className = "", ...props }: InputProps) {
  const inputClasses = `w-full rounded-xl bg-[var(--bg-secondary)] border px-4 py-2.5 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${
    error ? "border-[var(--accent-error)] focus:ring-[var(--accent-error)]" : "border-[var(--border-light)]"
  } ${className}`;
  
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          {label}
        </label>
      )}
      <input className={inputClasses} {...props} />
      {error && (
        <p className="mt-1.5 text-sm text-[var(--accent-error)]">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1.5 text-sm text-[var(--text-secondary)]">{helperText}</p>
      )}
    </div>
  );
}

