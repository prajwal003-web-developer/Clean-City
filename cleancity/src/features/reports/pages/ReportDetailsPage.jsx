import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, CalendarClock, Pencil, Trash2, Users } from "lucide-react";
import Avatar from "../../../components/common/Avatar";
import Badge from "../../../components/common/Badge";
import Button, { buttonClasses } from "../../../components/common/Button";
import { Skeleton } from "../../../components/common/Skeleton";
import { EmptyState, ErrorState } from "../../../components/common/States";
import InteractiveMap from "../../../components/maps/InteractiveMap";
import DeleteReportDialog from "../../../components/reports/DeleteReportDialog";
import { ReportGallery } from "../../../components/reports/ReportImages";
import { StatusBadge } from "../../../components/reports/ReportStatus";
import { useAuth } from "../../../hooks/useAuth";
import { useReportStore } from "../reportStore";
import { useReportActions } from "../useReportActions";
import { STATUS_META } from "../../../utils/constants";
import { formatCoords, formatDate, getCategory, getParticipantIds, getReportCoords, getReportOwnerId, normalizeStatus } from "../../../utils/formatters";

/** Full report view: gallery, facts, map, participants and permitted actions. */
export default function ReportDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userId, isAdmin } = useAuth();
  const { selectedReport: report, detailError, pending, userLocation, fetchReportById, updateStatus } = useReportStore();
  const actions = useReportActions({ onDeleted: () => navigate("/", { replace: true }) });

  useEffect(() => { fetchReportById(id); }, [id, fetchReportById]);

  if (detailError?.status === 404) return <EmptyState title="Report not found" message="It may have been deleted." action={<Link to="/" className={buttonClasses("primary")}>Back to the feed</Link>} />;
  if (detailError) return <ErrorState title="Couldn't load this report" message={detailError.message} onRetry={() => fetchReportById(id)} />;
  if (!report || report._id !== id) {
    return <div className="grid gap-8 lg:grid-cols-2" role="status" aria-label="Loading report"><Skeleton className="aspect-[4/3] rounded-3xl" /><div className="space-y-4"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-4/5" /><Skeleton className="h-64 w-full rounded-3xl" /></div></div>;
  }

  const status = normalizeStatus(report.status);
  const category = getCategory(report.category);
  const coords = getReportCoords(report);
  const participantIds = getParticipantIds(report);
  const joined = userId ? participantIds.includes(userId) : false;
  const isOwner = userId && getReportOwnerId(report) === userId;
  const creator = typeof report.user === "object" ? report.user : null;
  const participantUsers = (report.cleanedBy || []).filter((p) => typeof p === "object");
  const busy = Boolean(pending[`${report._id}:cleanup`]);

  const changeStatus = async (e) => {
    try { await updateStatus(report._id, e.target.value); toast.success("Status updated."); } catch (error) { toast.error(error.message); }
  };

 

  return (
    <article className="space-y-6">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to the feed</Link>
      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <ReportGallery report={report} />
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2"><StatusBadge status={status} /><Badge icon={category.icon}>{category.label}</Badge></div>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">{report.title}</h1>
          <p className="max-w-prose whitespace-pre-line leading-relaxed text-slate-700">{report.description}</p>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-2"><Avatar user={creator} size={28} /><div><dt className="text-xs text-muted">Reported by</dt><dd className="font-medium">{creator?.name || "A neighbour"}</dd></div></div>
            <div className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-muted" aria-hidden="true" /><div><dt className="text-xs text-muted">Reported</dt><dd className="font-medium">{formatDate(report.createdAt)}</dd>{report.updatedAt && report.updatedAt !== report.createdAt && <dd className="text-xs text-muted">Updated {formatDate(report.updatedAt)}</dd>}</div></div>
          </dl>

          <div className="flex flex-wrap items-center gap-2">
            {userId && !isOwner && <Button loading={busy} variant={joined ? "secondary" : "primary"} disabled={status === "resolved" && !joined} onClick={() => actions.toggleCleanup(report, joined)}>{joined ? "Leave cleanup" : status === "resolved" ? "Resolved" : "Join cleanup"}</Button>}
            {isOwner && status === "pending" && <Link to={`/reports/${report._id}/edit`} className={buttonClasses("secondary")}><Pencil className="h-4 w-4" aria-hidden="true" />Edit</Link>}
            {(isOwner || isAdmin) && <Button variant="secondary" onClick={() => actions.requestDelete(report)}><Trash2 className="h-4 w-4 text-red-600" aria-hidden="true" />Delete</Button>}
          </div>
          {joined || isOwner && (
            <label className="flex items-center gap-2 text-sm">Status
              <select value={status} onChange={changeStatus} className="h-10 rounded-xl border border-line bg-white px-3">{Object.entries(STATUS_META).map(([value, m]) => <option key={value} value={value}>{m.label}</option>)}</select>
            </label>
          )}

          <section aria-labelledby="participants">
            <h2 id="participants" className="mb-2 flex items-center gap-2 text-lg font-semibold"><Users className="h-5 w-5" aria-hidden="true" />{participantIds.length} {participantIds.length === 1 ? "neighbour" : "neighbours"} joining</h2>
            {participantUsers.length > 0 ? (
              <ul className="flex flex-wrap gap-2">{participantUsers.map((p) => <li key={p._id} className="flex items-center gap-2 rounded-full bg-slate-100 py-1 pl-1 pr-3 text-sm"><Avatar user={p} size={24} />{p.name || "Neighbour"}</li>)}</ul>
            ) : <p className="text-sm text-muted">{participantIds.length ? "Participants are shown by count only." : "No one has joined yet. Be the first."}</p>}
          </section>
        </div>
      </div>

      {coords && (
        <section aria-labelledby="where">
          <h2 id="where" className="mb-2 text-lg font-semibold">Where <span className="ml-2 text-sm font-normal tabular-nums text-muted">{formatCoords(coords)}</span></h2>
          <InteractiveMap reports={[report]} activeId={report._id} userLocation={userLocation} fitKey={report._id} className="h-72 rounded-3xl border border-line" />
        </section>
      )}
      <DeleteReportDialog actions={actions} />
    </article>
  );
}
