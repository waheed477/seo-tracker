import { InputHTMLAttributes, forwardRef } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, Props>(({ label, error, hint, className = '', id, ...rest }, ref) => {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium tracking-wide text-[var(--color-text-secondary)]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        ref={ref}
        className={`w-full rounded-lg border bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] transition-colors placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)]/60 focus:ring-1 focus:ring-[var(--color-accent)]/20 focus:outline-none ${
          error
            ? 'border-red-500/60 focus:border-red-500/80 focus:ring-red-500/20'
            : 'border-[var(--color-border)] hover:border-[var(--color-accent)]/30'
        } ${className} `}
        {...rest}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-[var(--color-text-tertiary)]">{hint}</p>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
