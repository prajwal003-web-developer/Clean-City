import { Check } from "lucide-react";
import { STATUS_META } from "../../utils/constants";
import { normalizeStatus } from "../../utils/formatters";

/** Status pill with a small animated indicator (pulsing while the report is open). */
export function StatusBadge({ status }) {
  const key = normalizeStatus(status);
  const meta = STATUS_META[key];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${meta.chip}`}>
      {key === "resolved" ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : (
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span className={`absolute inline-flex h-full w-full rounded-full opacity-60 motion-safe:animate-ping ${meta.dot}`} />
          <span className={`relative inline-flex h-2 w-2 rounded-full ${meta.dot}`} />
        </span>
      )}
      {meta.label}
    </span>
  );
}
