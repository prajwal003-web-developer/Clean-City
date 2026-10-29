import { ConfirmDialog } from "../common/Modal";

/** Confirmation for report deletion, driven by `useReportActions`. */
export default function DeleteReportDialog({ actions }) {
  return (
    <ConfirmDialog open={Boolean(actions.toDelete)} onClose={actions.cancelDelete} onConfirm={actions.confirmDelete} loading={actions.deleting}
      title="Delete this report?" confirmLabel="Delete report"
      message={`"${actions.toDelete?.title ?? ""}" will be removed for everyone, including its photos and the people who joined the cleanup. This can't be undone.`} />
  );
}
