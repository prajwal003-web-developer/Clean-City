/** Small pill label. `className` controls tone. */
export default function Badge({ children, className = "bg-slate-100 text-slate-700 ring-slate-200", icon: Icon }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${className}`}>
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
      {children}
    </span>
  );
}
