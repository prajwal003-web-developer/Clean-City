import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Pencil, Trash2, Sparkles } from "lucide-react";

import Avatar from "../../components/common/Avatar";
import Button, { buttonClasses } from "../../components/common/Button";
import { Skeleton } from "../../components/common/Skeleton";
import { EmptyState, ErrorState } from "../../components/common/States";
import DeleteReportDialog from "../../components/reports/DeleteReportDialog";
import { StatusBadge } from "../../components/reports/ReportStatus";

import { useAuth } from "../../hooks/useAuth";
import { useAuthStore } from "../auth/authStore";
import { useReportActions } from "../reports/useReportActions";
import { reportAPI } from "../../services/api";
import {
  getCategory,
  normalizeStatus,
  timeAgo,
} from "../../utils/formatters";

/** Account summary, user's reports, and joined cleaning activities. */
export default function ProfilePage() {
  const { user } = useAuth();
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const [state, setState] = useState({
    reports: [],
    loading: true,
    error: null,
  });

  const [joinedState, setJoinedState] = useState({
    reports: [],
    loading: true,
    error: null,
  });

  const [completingId, setCompletingId] = useState(null);

  const actions = useReportActions({
    onDeleted: (report) =>
      setState((current) => ({
        ...current,
        reports: current.reports.filter(
          (item) => item._id !== report._id
        ),
      })),
  });

  const load = useCallback(async () => {
    setState((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    try {
      const reports = await reportAPI.getMine();

      setState({
        reports: Array.isArray(reports) ? reports : [],
        loading: false,
        error: null,
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error.message || "Failed to load your reports.",
      }));
    }
  }, []);

  const loadJoined = useCallback(async () => {
    setJoinedState((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    try {
      const reports = await reportAPI.getJoined();

      setJoinedState({
        reports: Array.isArray(reports) ? reports : [],
        loading: false,
        error: null,
      });
    } catch (error) {
      setJoinedState((current) => ({
        ...current,
        loading: false,
        error:
          error.message || "Failed to load joined cleaning activities.",
      }));
    }
  }, []);

  useEffect(() => {
    load();
    loadJoined();
  }, [load, loadJoined]);

  const resolved = state.reports.filter(
    (report) => normalizeStatus(report.status) === "resolved"
  ).length;

  const markAsCleaned = async (report) => {
    if (completingId) return;

    try {
      setCompletingId(report._id);

      await reportAPI.updateStatus(report._id, "resolved");

      // Remove it from active joined activities.
      setJoinedState((current) => ({
        ...current,
        reports: current.reports.filter(
          (item) => item._id !== report._id
        ),
      }));

      // Refresh own reports in case this report appears there too.
      await load();
    } catch (error) {
      setJoinedState((current) => ({
        ...current,
        error:
          error.message || "Couldn't mark this report as cleaned.",
      }));
    } finally {
      setCompletingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Profile header */}
      <header className="flex flex-wrap items-center gap-4">
        <Avatar user={user} size={64} />

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-3xl font-semibold">
            {user?.name || "Your profile"}
          </h1>

          <p className="truncate text-muted">{user?.email}</p>

          {user?.phone && (
            <p className="mt-1 text-sm text-muted">{user.phone}</p>
          )}

          {user?.role && (
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-brand-700">
              {user.role}
            </p>
          )}
        </div>

        <Button
          variant="secondary"
          onClick={async () => {
            await logout();
            navigate("/login");
          }}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </Button>
      </header>

      {/* User's reports */}
      <section aria-labelledby="mine">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="mine" className="text-xl font-semibold">
            Your reports
          </h2>

          {!state.loading && !state.error && (
            <p className="text-sm text-muted">
              {state.reports.length} filed · {resolved} resolved
            </p>
          )}
        </div>

        {state.loading ? (
          <div
            className="space-y-3"
            role="status"
            aria-label="Loading your reports"
          >
            {[0, 1, 2].map((index) => (
              <Skeleton
                key={index}
                className="h-20 w-full rounded-2xl"
              />
            ))}
          </div>
        ) : state.error ? (
          <ErrorState
            title="Couldn't load your reports"
            message={state.error}
            onRetry={load}
          />
        ) : state.reports.length === 0 ? (
          <EmptyState
            title="You haven't reported anything yet"
            message="Spotted a dirty corner? Add it so neighbours can help."
            action={
              <Link
                to="/reports/new"
                className={buttonClasses("primary")}
              >
                Report a spot
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-white">
            {state.reports.map((report) => (
              <li
                key={report._id}
                className="flex flex-wrap items-center gap-3 p-4"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/reports/${report._id}`}
                    className="block truncate font-display text-lg font-semibold hover:text-brand-700"
                  >
                    {report.title}
                  </Link>

                  <p className="text-sm text-muted">
                    {getCategory(report.category).label} ·{" "}
                    {timeAgo(report.createdAt)}
                  </p>
                </div>

                <StatusBadge status={report.status} />

                {normalizeStatus(report.status) === "pending" && (
                  <Link
                    to={`/reports/${report._id}/edit`}
                    aria-label={`Edit ${report.title}`}
                    className={buttonClasses("ghost", "icon")}
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${report.title}`}
                  onClick={() => actions.requestDelete(report)}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Joined cleaning activities */}
      <section aria-labelledby="joined-cleanups">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2
            id="joined-cleanups"
            className="text-xl font-semibold"
          >
            Cleaning activities
          </h2>

          {!joinedState.loading && !joinedState.error && (
            <p className="text-sm text-muted">
              {joinedState.reports.length} active
            </p>
          )}
        </div>

        {joinedState.loading ? (
          <div
            className="space-y-3"
            role="status"
            aria-label="Loading cleaning activities"
          >
            {[0, 1].map((index) => (
              <Skeleton
                key={index}
                className="h-24 w-full rounded-2xl"
              />
            ))}
          </div>
        ) : joinedState.error ? (
          <ErrorState
            title="Couldn't load cleaning activities"
            message={joinedState.error}
            onRetry={loadJoined}
          />
        ) : joinedState.reports.length === 0 ? (
          <EmptyState
            title="No cleaning activities yet"
            message="Join a cleanup from a report to see it here."
            action={
              <Link
                to="/reports"
                className={buttonClasses("primary")}
              >
                Explore reports
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-white">
            {joinedState.reports.map((report) => {
              const isResolved =
                normalizeStatus(report.status) === "resolved";

              return (
                <li
                  key={report._id}
                  className="flex flex-wrap items-center gap-3 p-4"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                    <Sparkles
                      className="h-5 w-5"
                      aria-hidden="true"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/reports/${report._id}`}
                      className="block truncate font-display text-lg font-semibold hover:text-brand-700"
                    >
                      {report.title}
                    </Link>

                    <p className="text-sm text-muted">
                      {getCategory(report.category).label} ·{" "}
                      {timeAgo(report.createdAt)}
                    </p>
                  </div>

                  <StatusBadge status={report.status} />

                  {!isResolved && (
                    <Button
                      size="sm"
                      disabled={completingId !== null}
                      loading={completingId === report._id}
                      onClick={() => markAsCleaned(report)}
                    >
                      Mark as cleaned
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <DeleteReportDialog actions={actions} />
    </div>
  );
}