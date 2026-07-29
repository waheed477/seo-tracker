type Status = 'ready' | 'pending' | 'error';

interface Props {
  label: string;
  value: string;
  sub?: string;
  status: Status;
}

const statusStyles: Record<Status, { dot: string; ring: string }> = {
  ready: { dot: 'bg-emerald-400', ring: 'ring-emerald-400/20' },
  pending: { dot: 'bg-amber-400', ring: 'ring-amber-400/20' },
  error: { dot: 'bg-red-400', ring: 'ring-red-400/20' },
};

export default function StatusCard({ label, value, sub, status }: Props) {
  const s = statusStyles[status];
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05]">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sage/50 text-[10px] font-medium tracking-widest uppercase">{label}</span>
        <span className={`h-2 w-2 rounded-full ring-4 ${s.dot} ${s.ring}`} />
      </div>
      <p className="font-heading text-cream text-sm leading-tight font-semibold">{value}</p>
      {sub && <p className="text-sage/50 mt-1 text-[11px]">{sub}</p>}
    </div>
  );
}
