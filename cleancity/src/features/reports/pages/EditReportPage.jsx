import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import ReportForm from "../../../components/reports/ReportForm";
import { buttonClasses } from "../../../components/common/Button";
import { EmptyState, ErrorState, PageLoader } from "../../../components/common/States";
import { useAuth } from "../../../hooks/useAuth";
import { useReportStore } from "../reportStore";
import { getReportOwnerId, normalizeStatus } from "../../../utils/formatters";

/** Edit page: only the owner may edit, and only while the report is pending (the backend enforces this too). */
export default function EditReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { selectedReport: report, detailError, fetchReportById, updateReport, userLocation } = useReportStore();

  useEffect(() => { fetchReportById(id); }, [id, fetchReportById]);

  if (detailError) return <ErrorState title="Couldn't load this report" message={detailError.message} onRetry={() => fetchReportById(id)} />;
  if (!report || report._id !== id) return <PageLoader label="Loading report" />;
  if (getReportOwnerId(report) !== userId || normalizeStatus(report.status) !== "pending") {
    return <EmptyState title="This report can't be edited" message="Only the person who reported it can edit it, and only while it's pending." action={<Link to={`/reports/${id}`} className={buttonClasses("primary")}>View report</Link>} />;
  }

  const submit = async (formData, options) => {
    await updateReport(id, formData, options);
    toast.success("Changes saved.");
    navigate(`/reports/${id}`);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-8 text-3xl font-semibold">Edit report</h1>
      <div className="rounded-3xl border border-line bg-white p-5 shadow-card sm:p-8">
        <ReportForm key={report._id} initial={report} onSubmit={submit} submitLabel="Save changes" fallbackCenter={userLocation} />
      </div>
    </div>
  );
}
