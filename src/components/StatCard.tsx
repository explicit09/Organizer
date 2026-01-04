type StatCardProps = {
  label: string;
  value: string;
  delta?: string;
  helper?: string;
};

export function StatCard({ label, value, delta, helper }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-stone-200/60 bg-white/80 p-5 shadow-[0_12px_30px_-24px_rgba(15,15,15,0.45)] backdrop-blur">
      <div className="text-xs uppercase tracking-[0.2em] text-stone-500">
        {label}
      </div>
      <div className="mt-3 flex items-end gap-3">
        <div className="text-3xl font-semibold text-stone-900">{value}</div>
        {delta ? (
          <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">
            {delta}
          </span>
        ) : null}
      </div>
      {helper ? (
        <p className="mt-2 text-sm text-stone-500">{helper}</p>
      ) : null}
    </div>
  );
}
