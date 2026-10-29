import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth";
import { useReportStore } from "./reportStore";

/**
 * Join/leave and delete orchestration shared by the feed, map, details and profile pages.
 * Backend authorization is the source of truth; failures surface as toasts.
 * @param {{ onDeleted?: (report: object) => void }} [options]
 */
export function useReportActions({ onDeleted } = {}) {
  const { userId } = useAuth();
  const { joinCleanup, leaveCleanup, deleteReport } = useReportStore.getState();
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const toggleCleanup = useCallback(async (report, joined) => {
    try {
      const done = await (joined ? leaveCleanup : joinCleanup)(report._id, userId);
      if (done) toast.success(joined ? "You've left this cleanup." : "You're in. Thanks for showing up.");
    } catch (error) {
      toast.error(error.message);
    }
  }, [joinCleanup, leaveCleanup, userId]);

  const confirmDelete = useCallback(async () => {
    if (!toDelete || deleting) return;
    setDeleting(true);
    try {
      await deleteReport(toDelete._id);
      toast.success("Report deleted.");
      onDeleted?.(toDelete);
      setToDelete(null);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDeleting(false);
    }
  }, [toDelete, deleting, deleteReport, onDeleted]);

  return { toggleCleanup, toDelete, requestDelete: setToDelete, cancelDelete: () => setToDelete(null), confirmDelete, deleting };
}
