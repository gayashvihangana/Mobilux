type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  accentClass?: string;
};

export function StatCard({ label, value, hint, accentClass }: StatCardProps) {
  return (
    <div
      className={`rounded-3xl border border-slate-800/70 bg-slate-900/60 p-6 shadow-[0_25px_60px_-45px_rgba(15,23,42,0.9)] ${
        accentClass ?? ""
      }`}
    >
      <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      {hint ? <p className="mt-2 text-sm text-slate-400">{hint}</p> : null}
    </div>
  );
}
