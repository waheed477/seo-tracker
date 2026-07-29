import { InputHTMLAttributes, forwardRef } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, error, hint, className = '', id, ...rest }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-sage/80 tracking-wide"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`
            w-full bg-white/[0.04] border rounded-lg px-3.5 py-2.5
            text-sm text-cream placeholder:text-sage/40
            transition-colors
            focus:outline-none focus:ring-1 focus:border-clay/60 focus:ring-clay/20
            ${error
              ? 'border-red-500/60 focus:border-red-500/80 focus:ring-red-500/20'
              : 'border-white/10 hover:border-white/20'
            }
            ${className}
          `}
          {...rest}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        {hint && !error && <p className="text-xs text-sage/50">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
