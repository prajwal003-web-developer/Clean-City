import { motion } from "motion/react";
import { Loader2, SearchX, WifiOff } from "lucide-react";
import Button from "./Button";

/** Friendly empty state with an optional action. */
export function EmptyState({ title, message, action, icon: Icon = SearchX }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }} className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-aqua-50 text-aqua-700">
        <Icon className="h-7 w-7" aria-hidden="true" />
      </motion.div>
      <h3 className="text-xl font-semibold">{title}</h3>
      {message && <p className="mt-1.5 max-w-sm text-sm text-muted">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

/** Error state with retry. */
export function ErrorState({ title = "Couldn't load this", message, onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-3xl border border-red-200 bg-red-50/60 px-6 py-12 text-center">
      <WifiOff className="mb-3 h-8 w-8 text-red-600" aria-hidden="true" />
      <h3 className="text-xl font-semibold">{title}</h3>
      {message && <p className="mt-1.5 max-w-md text-sm text-slate-700">{message}</p>}
      {onRetry && <Button className="mt-5" variant="secondary" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

/** Full-area spinner. */
export function PageLoader({ label = "Loading" }) {
  return (
    <div role="status" className="flex min-h-[40dvh] items-center justify-center text-muted">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />{label}…
    </div>
  );
}
