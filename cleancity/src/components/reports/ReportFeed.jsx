import { AnimatePresence, motion } from "motion/react";
import { MapPinned } from "lucide-react";
import ReportCard from "./ReportCard";
import { ReportCardSkeleton } from "../common/Skeleton";
import { EmptyState, ErrorState } from "../common/States";
import Button from "../common/Button";

const list = { show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.28 } } };

/**
 * Renders loading, error, empty and populated states for a list of reports.
 * Card props are forwarded through `cardProps`.
 */
export default function ReportFeed({ reports, isLoading, error, onRetry, hasActiveFilters, onResetFilters, cardProps, emptyAction }) {
  if (error && reports.length === 0) return <ErrorState title="Couldn't load reports" message={error} onRetry={onRetry} />;
  if (isLoading && reports.length === 0) return <div className="space-y-5">{[0, 1, 2].map((i) => <ReportCardSkeleton key={i} />)}</div>;
  if (reports.length === 0) {
    return (
      <EmptyState icon={MapPinned} title={hasActiveFilters ? "Nothing matches these filters" : "No reports in this area yet"}
        message={hasActiveFilters ? "Try another status or widen the distance." : "Be the first to report a spot that needs cleaning."}
        action={hasActiveFilters ? <Button variant="secondary" onClick={onResetFilters}>Clear filters</Button> : emptyAction} />
    );
  }
  return (
    <motion.ul variants={list} initial="hidden" animate="show" className={`space-y-5 transition-opacity ${isLoading ? "opacity-60" : ""}`} aria-busy={isLoading}>
      {error && <li role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">Couldn't refresh: {error}</li>}
      <AnimatePresence initial={false}>
        {reports.map((report) => (
          <motion.li key={report._id} variants={item} exit={{ opacity: 0, scale: 0.97 }}>
            <ReportCard report={report} active={cardProps.activeId === report._id} busy={Boolean(cardProps.pending[`${report._id}:cleanup`])} {...cardProps} />
          </motion.li>
        ))}
      </AnimatePresence>
    </motion.ul>
  );
}
