import { Link } from "react-router-dom";
import { Users, X } from "lucide-react";
import Button, { buttonClasses } from "../common/Button";
import { StatusBadge } from "./ReportStatus";
import { ReportImageGrid } from "./ReportImages";
import { getCategory, getParticipantIds, getReportOwnerId, normalizeStatus, timeAgo } from "../../utils/formatters";

/** Compact summary of the selected report, shown beside the full map. */
export default function ReportDetailsPanel({ report, userId, busy, onToggleCleanup, onClose }) {
  const participants = getParticipantIds(report);
  const joined = userId && participants.includes(userId);
  const owner = userId && getReportOwnerId(report) === userId;
  const resolved = normalizeStatus(report.status) === "resolved";
  return (
    <section aria-label="Selected report" className="rounded-3xl border border-line bg-white p-3 shadow-card">
      <div className="mb-2 flex items-center justify-between px-1">
        <StatusBadge status={report.status} />
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Clear selection"><X className="h-4 w-4" /></Button>
      </div>
      <ReportImageGrid report={report} className="h-40" />
      <div className="space-y-2 p-2 pt-3">
        <h3 className="text-lg font-semibold leading-snug">{report.title}</h3>
        <p className="text-xs text-muted">{getCategory(report.category).label} · {timeAgo(report.createdAt)}</p>
        <p className="line-clamp-3 text-sm text-slate-600">{report.description}</p>
        <p className="flex items-center gap-1 text-sm text-muted"><Users className="h-4 w-4" aria-hidden="true" />{participants.length} joining</p>
        <div className="flex flex-wrap gap-2 pt-1">
          {userId && !owner && <Button size="sm" variant={joined ? "secondary" : "primary"} loading={busy} disabled={resolved && !joined} onClick={() => onToggleCleanup(report, joined)}>{joined ? "Leave cleanup" : resolved ? "Resolved" : "Join cleanup"}</Button>}
          <Link to={`/reports/${report._id}`} className={buttonClasses("soft", "sm")}>View details</Link>
        </div>
      </div>
    </section>
  );
}
