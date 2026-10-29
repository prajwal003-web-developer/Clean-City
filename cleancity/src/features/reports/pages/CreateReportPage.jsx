import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import ReportForm from "../../../components/reports/ReportForm";
import { useReportStore } from "../reportStore";

/** New report page. The form throws on failure so it can keep the user's input. */
export default function CreateReportPage() {
  const navigate = useNavigate();
  const createReport = useReportStore((s) => s.createReport);
  const userLocation = useReportStore((s) => s.userLocation);

  const submit = async (formData, options) => {
    const report = await createReport(formData, options);
    toast.success("Report published. Neighbours can now see it.");
    navigate(report?._id ? `/reports/${report._id}` : "/");
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-semibold">Report a spot</h1>
      <p className="mb-8 mt-2 text-muted">Tell neighbours what needs cleaning and where to find it.</p>
      <div className="rounded-3xl border border-line bg-white p-5 shadow-card sm:p-8">
        <ReportForm onSubmit={submit} submitLabel="Publish report" fallbackCenter={userLocation} />
      </div>
    </div>
  );
}
