import { motion } from "motion/react";
import Logo from "../../components/layout/Logo";

/** Contour-line artwork: nested, rotated ellipses read as a topographic map of a neighbourhood. */
function Contours() {
  return (
    <svg viewBox="0 0 400 600" className="absolute inset-0 h-full w-full" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      {Array.from({ length: 11 }, (_, i) => (
        <ellipse key={i} cx="210" cy="320" rx={40 + i * 26} ry={28 + i * 21} transform={`rotate(${-18 + i * 3} 210 320)`} fill="none" stroke={i % 4 === 0 ? "#06B6D4" : "#16A34A"} strokeOpacity={0.5 - i * 0.03} strokeWidth="1.5" />
      ))}
      <circle cx="210" cy="320" r="7" fill="#06B6D4" /><circle cx="210" cy="320" r="16" fill="none" stroke="#06B6D4" strokeOpacity=".6" />
    </svg>
  );
}

/** Two-column auth layout: brand panel on large screens, form always. */
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-brand-900 p-10 text-white lg:flex lg:flex-col">
        <Contours />
        <div className="relative"><Logo light /></div>
        <div className="relative mt-auto max-w-sm">
          <p className="font-display text-4xl font-semibold leading-tight">A cleaner street starts with someone saying so.</p>
          <p className="mt-4 text-green-100/90">Report the spot, see who's nearby, and show up together.</p>
        </div>
      </aside>
      <main className="flex items-center justify-center px-5 py-10 pt-safe pb-safe">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h1 className="text-3xl font-semibold">{title}</h1>
          <p className="mt-2 text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-6 text-sm text-muted">{footer}</p>
        </motion.div>
      </main>
    </div>
  );
}
