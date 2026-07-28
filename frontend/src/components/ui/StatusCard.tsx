type Status = 'ready' | 'pending' | 'error';

interface Props {
  label: string;
  value: string;
  sub?: string;
  status: Status;
}

const statusStyles: Record<Status, { dot: string; ring: string }> = {
  ready:   { dot: 'bg-emerald-400',  ring: 'ring-emerald-400/20' },
  pending: { dot: 'bg-amber-400',    ring: 'ring-amber-400/20'   },
  error:   { dot: 'bg-red-400',      ring: 'ring-red-400/20'     },
};

export default function StatusCard({ label, value, sub, status }: Props) {
  const s = statusStyles[status];
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 hover:bg-white/[0.05] transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-widest text-sage/50 font-medium">
          {label}
        </span>
        <span className={`w-2 h-2 rounded-full ring-4 ${s.dot} ${s.ring}`} />
      </div>
      <p className="font-heading text-sm font-semibold text-cream leading-tight">{value}</p>
      {sub && <p className="text-[11px] text-sage/50 mt-1">{sub}</p>}
    </div>
  );
}
