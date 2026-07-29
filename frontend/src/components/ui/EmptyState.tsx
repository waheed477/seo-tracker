interface Props {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="fade-in rounded-xl border border-dashed border-white/10 py-16 text-center">
      {icon && (
        <div className="bg-clay/10 border-clay/20 mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border">
          {icon}
        </div>
      )}
      <h2 className="font-heading text-cream mb-2 text-lg font-semibold">{title}</h2>
      {description && <p className="text-sage/50 mx-auto max-w-md text-sm">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="bg-clay/20 border-clay/30 text-cream hover:bg-clay/30 mt-4 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
