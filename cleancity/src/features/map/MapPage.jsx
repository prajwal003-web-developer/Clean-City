import { useEffect, useState } from "react";
import ReportFilters from "../../components/reports/ReportFilters";
import ReportDetailsPanel from "../../components/reports/ReportDetailsPanel";
import InteractiveMap from "../../components/maps/InteractiveMap";
import { ErrorState } from "../../components/common/States";
import { useAuth } from "../../hooks/useAuth";
import { useReportStore } from "../reports/reportStore";
import { useReportActions } from "../reports/useReportActions";
import { useVisibleReports } from "../reports/useVisibleReports";
import { useUIStore } from "../../store/uiStore";

/** Full-screen map of every report, or only those near the chosen location. */
export default function MapPage() {
  const { userId } = useAuth();
  const store = useReportStore();
  const { reports, scope, isLoading, error, filters, userLocation, radiusKm, pending } = store;
  const { activeReportId, setActiveReportId } = useUIStore();
  const [mode, setMode] = useState("all"); // "all" | "nearby"
  const actions = useReportActions();

  useEffect(() => {
    if (mode === "nearby" && userLocation) store.fetchNearbyReports();
    else store.fetchReports();
  }, [mode, userLocation, radiusKm]); // eslint-disable-line react-hooks/exhaustive-deps

  const expected = mode === "nearby" && userLocation ? "nearby" : "all";
  const { visible, counts } = useVisibleReports(scope === expected ? reports : [], filters, userLocation);
  const active = visible.find((r) => r._id === activeReportId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">Explore the map</h1>
        <div role="group" aria-label="Report scope" className="flex gap-1 rounded-2xl bg-slate-100 p-1 text-sm font-medium">
          {[["all", "All reports"], ["nearby", `Within ${radiusKm} km`]].map(([value, label]) => (
            <button key={value} type="button" aria-pressed={mode === value} disabled={value === "nearby" && !userLocation} onClick={() => setMode(value)} title={value === "nearby" && !userLocation ? "Choose a location on the home page first" : undefined}
              className={`rounded-xl px-4 py-2 disabled:opacity-40 ${mode === value ? "bg-white shadow-sm" : "text-muted"}`}>{label}</button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="order-2 space-y-4 lg:order-1">
          <ReportFilters filters={filters} onChange={store.setFilters} radiusKm={radiusKm} onRadiusChange={store.setRadiusKm} showRadius={mode === "nearby"} onRefresh={mode === "nearby" ? store.fetchNearbyReports : store.fetchReports} refreshing={isLoading} counts={counts} />
          {error && <ErrorState title="Couldn't load the map data" message={error} onRetry={store.fetchReports} />}
          {active ? (
            <ReportDetailsPanel report={active} userId={userId} busy={Boolean(pending[`${active._id}:cleanup`])} onToggleCleanup={actions.toggleCleanup} onClose={() => setActiveReportId(null)} />
          ) : (
            <p className="rounded-2xl bg-white p-4 text-sm text-muted ring-1 ring-line">{isLoading ? "Loading reports…" : `${visible.length} ${visible.length === 1 ? "report" : "reports"} shown. Select a pin to see its details.`}</p>
          )}
        </div>
        <InteractiveMap reports={visible} activeId={activeReportId} onSelect={setActiveReportId} userLocation={userLocation} fitKey={`${mode}|${visible.map((r) => r._id).join(",")}`} className="order-1 h-[60dvh] rounded-3xl border border-line lg:order-2 lg:h-[calc(100dvh-10rem)]" />
      </div>
    </div>
  );
}
