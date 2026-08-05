interface Props {
  rows?: number;
  height?: string;
}

export default function LoadingSkeleton({ rows = 3, height = 'h-20' }: Props) {
  return (
    <div className="fade-in space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={`${height} shimmer rounded-xl bg-[var(--color-surface)]`} />
      ))}
    </div>
  );
}
