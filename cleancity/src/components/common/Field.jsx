import { useId, forwardRef } from "react";

const base = "w-full rounded-xl border bg-white px-3.5 text-sm text-ink placeholder:text-slate-400 transition-colors focus:border-aqua-700 focus:outline-none focus:ring-2 focus:ring-aqua-500/30";

/** Label + control + hint/error wrapper. `children` receives the ids to wire up ARIA. */
function Field({ label, error, hint, counter, children }) {
  const id = useId();
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-ink">{label}</label>
        {counter && <span className="text-xs tabular-nums text-muted">{counter}</span>}
      </div>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error ? <p id={`${id}-err`} role="alert" className="mt-1.5 text-sm text-red-600">{error}</p>
        : hint ? <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

/** Text input with label, hint, error and optional trailing element (e.g. password toggle). */
export const Input = forwardRef(function Input({ label, error, hint, counter, trailing, className = "", ...rest }, ref) {
  return (
    <Field label={label} error={error} hint={hint} counter={counter}>
      {({ id, describedBy, invalid }) => (
        <div className="relative">
          <input ref={ref} id={id} aria-invalid={invalid} aria-describedby={describedBy} className={`${base} h-11 ${invalid ? "border-danger" : "border-line"} ${trailing ? "pr-11" : ""} ${className}`} {...rest} />
          {trailing && <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>}
        </div>
      )}
    </Field>
  );
});

/** Multi-line input. */
export function Textarea({ label, error, hint, counter, rows = 5, ...rest }) {
  return (
    <Field label={label} error={error} hint={hint} counter={counter}>
      {({ id, describedBy, invalid }) => (
        <textarea id={id} rows={rows} aria-invalid={invalid} aria-describedby={describedBy} className={`${base} resize-y py-2.5 ${invalid ? "border-danger" : "border-line"}`} {...rest} />
      )}
    </Field>
  );
}

/** Native select (best keyboard and mobile behaviour) styled to match. */
export function Select({ label, error, hint, options, placeholder, className = "", ...rest }) {
  return (
    <Field label={label} error={error} hint={hint}>
      {({ id, describedBy, invalid }) => (
        <select id={id} aria-invalid={invalid} aria-describedby={describedBy} className={`${base} h-11 ${invalid ? "border-danger" : "border-line"} ${className}`} {...rest}>
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
    </Field>
  );
}
