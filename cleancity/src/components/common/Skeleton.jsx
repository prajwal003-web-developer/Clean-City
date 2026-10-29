/** Animated placeholder block. */
export const Skeleton = ({ className = "" }) => <div aria-hidden="true" className={`skeleton rounded-lg ${className}`} />;

/** Placeholder matching the shape of a ReportCard. */
export function ReportCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-white p-3" role="status" aria-label="Loading report">
      <Skeleton className="h-52 w-full rounded-2xl" />
      <div className="space-y-3 p-3">
        <Skeleton className="h-4 w-1/3" /><Skeleton className="h-6 w-4/5" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" />
        <div className="flex gap-2 pt-2"><Skeleton className="h-10 w-28" /><Skeleton className="h-10 w-24" /></div>
      </div>
    </div>
  );
}
