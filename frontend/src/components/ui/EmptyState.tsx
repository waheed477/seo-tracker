interface Props {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="fade-in rounded-xl border border-dashed border-[var(--color-border)] py-16 text-center">
      {icon && (
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/10">
          {icon}
        </div>
      )}
      <h2 className="font-heading mb-2 text-lg font-semibold text-[var(--color-text-primary)]">{title}</h2>
      {description && <p className="mx-auto max-w-md text-sm text-[var(--color-text-tertiary)]">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/20 px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-accent)]/30"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
