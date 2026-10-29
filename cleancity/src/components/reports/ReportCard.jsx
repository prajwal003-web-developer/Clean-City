import { memo } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { CheckCircle2, Map as MapIcon, MapPin, Pencil, Trash2, Users } from "lucide-react";
import Avatar from "../common/Avatar";
import Badge from "../common/Badge";
import Button, { buttonClasses } from "../common/Button";
import { StatusBadge } from "./ReportStatus";
import { ReportImageGrid } from "./ReportImages";
import { haversineKm } from "../../utils/distance";
import { formatCoords, formatDistance, getCategory, getParticipantIds, getReportCoords, getReportOwnerId, normalizeStatus, timeAgo } from "../../utils/formatters";

/**
 * Feed card for one report.
 * @param {object} report
 * @param {{lat:number,lng:number}|null} userLocation used to compute distance
 * @param {string|null} userId current user's id (null when signed out)
 * @param {boolean} isAdmin may delete any report
 * @param {boolean} active highlighted because its marker is selected
 * @param {boolean} busy a join/leave request is in flight
 * @param {{onSelect, onShowOnMap, onToggleCleanup, onEdit, onDelete}} handlers
 */
function ReportCard({ report, userLocation, userId, isAdmin, active, busy, onSelect, onShowOnMap, onToggleCleanup, onDelete }) {
  const status = normalizeStatus(report.status);
  const resolved = status === "resolved";
  const category = getCategory(report.category);
  const coords = getReportCoords(report);
  const km = coords && userLocation ? haversineKm(userLocation, coords) : null;
  const participants = getParticipantIds(report);
  const joined = userId ? participants.includes(userId) : false;
  const isOwner = userId && getReportOwnerId(report) === userId;
  const canEdit = isOwner && status === "pending";
  const canDelete = isOwner || isAdmin;
  const creator = typeof report.user === "object" ? report.user : null;

  return (
    <motion.article
      layout="position"
      onClick={() => onSelect?.(report._id)}
      whileHover={{ y: -2 }}
      className={`group cursor-default overflow-hidden rounded-3xl border bg-white p-3 shadow-card transition-colors ${active ? "border-aqua-500 ring-2 ring-aqua-500/30" : resolved ? "border-green-200 bg-gradient-to-b from-brand-50/70 to-white" : "border-line"}`}
      aria-label={report.title}
    >
      <ReportImageGrid report={report} />

      <div className="space-y-3 px-2 pb-2 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={status} />
          <Badge icon={category.icon}>{category.label}</Badge>
        </div>

        <div>
          <h3 className="text-xl font-semibold leading-snug">
            <Link to={`/reports/${report._id}`} className="hover:text-brand-700">{report.title}</Link>
          </h3>
          <p className="mt-1.5 line-clamp-3 max-w-prose text-sm leading-relaxed text-slate-600">{report.description}</p>
        </div>

        {resolved && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-brand-900">
            <CheckCircle2 className="h-4 w-4 text-brand-500" aria-hidden="true" />
            Cleaned up{participants.length ? ` with ${participants.length} ${participants.length === 1 ? "neighbour" : "neighbours"}` : ""}. Thank you.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
          <span className="flex items-center gap-2">
            <Avatar user={creator} size={24} />
            <span>{creator?.name || "A neighbour"} · {timeAgo(report.createdAt)}</span>
          </span>
          {coords && (
            <span className="flex items-center gap-1" title={formatCoords(coords)}>
              <MapPin className="h-4 w-4 text-aqua-700" aria-hidden="true" />{km != null ? formatDistance(km) : formatCoords(coords)}
            </span>
          )}
          <span className="flex items-center gap-1"><Users className="h-4 w-4" aria-hidden="true" />{participants.length} joining</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
          {userId && !isOwner && (
            <Button size="sm" variant={joined ? "secondary" : "primary"} loading={busy} disabled={resolved && !joined} onClick={() => onToggleCleanup(report, joined)}>
              {joined ? "Leave cleanup" : resolved ? "Resolved" : "Join cleanup"}
            </Button>
          )}
          {isOwner && <Badge className="bg-slate-100 text-slate-700 ring-slate-200">Your report</Badge>}
          <Link to={`/reports/${report._id}`} className={buttonClasses("soft", "sm")}>View details</Link>
          {coords && <Button size="sm" variant="ghost" onClick={() => onShowOnMap?.(report._id)}><MapIcon className="h-4 w-4" aria-hidden="true" />On map</Button>}
          <span className="ml-auto flex gap-1">
            {canEdit && <Link to={`/reports/${report._id}/edit`} aria-label={`Edit ${report.title}`} className={buttonClasses("ghost", "icon")}><Pencil className="h-4 w-4" /></Link>}
            {canDelete && <Button variant="ghost" size="icon" aria-label={`Delete ${report.title}`} onClick={() => onDelete(report)}><Trash2 className="h-4 w-4 text-red-600" /></Button>}
          </span>
        </div>
      </div>
    </motion.article>
  );
}
export default memo(ReportCard);
