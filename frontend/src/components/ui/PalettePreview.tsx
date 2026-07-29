const swatches = [
  { name: 'navy', hex: '#0A2947', label: 'Navy', role: 'Primary / dark bg' },
  { name: 'cream', hex: '#F3E4C9', label: 'Cream', role: 'Light bg / text' },
  { name: 'sage', hex: '#D3D4C0', label: 'Sage', role: 'Cards / borders' },
  { name: 'clay', hex: '#8B5E3C', label: 'Clay', role: 'Accent / CTAs' },
];

export default function PalettePreview() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-5">
      <h3 className="font-heading text-cream mb-3 text-sm font-semibold">Design Tokens</h3>
      <div className="grid grid-cols-2 gap-2">
        {swatches.map((s) => (
          <div key={s.name} className="flex flex-col gap-1.5">
            <div className="h-10 rounded-lg border border-white/[0.08]" style={{ backgroundColor: s.hex }} />
            <div>
              <p className="text-cream/80 text-[11px] leading-none font-medium">{s.label}</p>
              <p className="text-sage/50 mt-0.5 text-[9px]">{s.role}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-sage/40 mt-3 text-[10px] leading-relaxed">
        Use <code className="text-sage/60 font-mono">bg-navy</code>,{' '}
        <code className="text-sage/60 font-mono">text-cream</code> etc. — never raw hex values in components.
      </p>
    </div>
  );
}
