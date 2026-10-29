/** CleanCity mark + wordmark. */
export default function Logo({ light = false }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true"><rect width="32" height="32" rx="9" fill={light ? "#16A34A" : "#14532D"} /><path d="M16 26s7-6.6 7-12a7 7 0 0 0-14 0c0 5.4 7 12 7 12Z" fill={light ? "#14532D" : "#16A34A"} /><path d="M12.5 14.5l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <span className={`font-display text-xl font-semibold ${light ? "text-white" : "text-brand-900"}`}>CleanCity</span>
    </span>
  );
}
