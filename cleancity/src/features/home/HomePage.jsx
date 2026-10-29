import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { List, Map as MapIcon, MapPin, Plus } from "lucide-react";
import ReportFeed from "../../components/reports/ReportFeed";
import ReportFilters from "../../components/reports/ReportFilters";
import DeleteReportDialog from "../../components/reports/DeleteReportDialog";
import InteractiveMap from "../../components/maps/InteractiveMap";
import { buttonClasses } from "../../components/common/Button";
import { LocationGate, LocationModal } from "./LocationGate";
import { useAuth } from "../../hooks/useAuth";
import { useGeolocation } from "../../hooks/useGeolocation";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useReportStore } from "../reports/reportStore";
import { useReportActions } from "../reports/useReportActions";
import { useVisibleReports } from "../reports/useVisibleReports";
import { useUIStore } from "../../store/uiStore";
import { normalizeStatus } from "../../utils/formatters";

/** Nearby community feed (default radius 10 km) with a synchronized map. */
export default function HomePage() {
  const { userId, isAdmin } = useAuth();
  const store = useReportStore();
  const { reports, isLoading, error, filters, userLocation, radiusKm, pending, scope } = store;
  const { activeReportId, setActiveReportId, homeView, setHomeView } = useUIStore();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [pickerOpen, setPickerOpen] = useState(false);
  const geo = useGeolocation();
  const autoRequested = useRef(false);
  const actions = useReportActions();

  // If permission was already granted earlier, restore the location without a prompt.
  useEffect(() => {
    if (userLocation || autoRequested.current || geo.permission !== "granted") return;
    autoRequested.current = true;
    geo.requestLocation().then((c) => c && store.setUserLocation({ lat: c.lat, lng: c.lng, source: "device" }));
  }, [geo.permission, userLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refetch whenever the chosen point or radius changes (stale responses are discarded in the store).
  useEffect(() => { if (userLocation) store.fetchNearbyReports(); }, [userLocation, radiusKm]); // eslint-disable-line react-hooks/exhaustive-deps

  const nearbyReports = scope === "nearby" ? reports : [];
  const { visible, counts } = useVisibleReports(nearbyReports, filters, userLocation);
  const hasActiveFilters = filters.status !== "all" || filters.category !== "all" || Boolean(filters.search);
  const resolvedCount = nearbyReports.filter((r) => normalizeStatus(r.status) === "resolved").length;

  if (!userLocation) {
    return (
      <div className="mx-auto max-w-2xl pt-6">
        <h1 className="mb-6 text-3xl font-semibold sm:text-4xl">Let's make our neighbourhood cleaner.</h1>
        <LocationGate onSelect={store.setUserLocation} />
      </div>
    );
  }

  const showList = isDesktop || homeView === "list";
  const showMap = isDesktop || homeView === "map";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="max-w-xl text-3xl font-semibold leading-tight sm:text-4xl">Let's make our neighbourhood cleaner.</h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted" aria-live="polite">
            <button type="button" onClick={() => setPickerOpen(true)} className="inline-flex items-center gap-1.5 rounded-full bg-aqua-50 px-3 py-1.5 font-medium text-aqua-700 hover:bg-cyan-100">
              <MapPin className="h-4 w-4" aria-hidden="true" />{userLocation.source === "device" ? "Around your location (approximate)" : "Around your chosen point"}
              <span className="underline underline-offset-2">Change</span>
            </button>
            {!isLoading && !error && <span>{nearbyReports.length} {nearbyReports.length === 1 ? "report" : "reports"} within {radiusKm} km{resolvedCount > 0 && ` · ${resolvedCount} already cleaned up`}</span>}
          </p>
        </div>
        <Link to="/reports/new" className={`${buttonClasses("primary", "md")} hidden md:inline-flex`}><Plus className="h-4 w-4" aria-hidden="true" />Report a spot</Link>
      </header>

      <ReportFilters filters={filters} onChange={store.setFilters} radiusKm={radiusKm} onRadiusChange={store.setRadiusKm} onRefresh={store.fetchNearbyReports} refreshing={isLoading} counts={counts} />

      {!isDesktop && (
        <div role="tablist" aria-label="Feed view" className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
          {[["list", "List", List], ["map", "Map", MapIcon]].map(([value, label, Icon]) => (
            <button key={value} role="tab" aria-selected={homeView === value} onClick={() => setHomeView(value)} className={`flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium ${homeView === value ? "bg-white shadow-sm" : "text-muted"}`}><Icon className="h-4 w-4" />{label}</button>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
        {showList && (
          <ReportFeed reports={visible} isLoading={isLoading} error={error} onRetry={store.fetchNearbyReports} hasActiveFilters={hasActiveFilters} onResetFilters={store.resetFilters}
            emptyAction={<Link to="/reports/new" className={buttonClasses("primary")}>Report a spot</Link>}
            cardProps={{
              userLocation, userId, isAdmin, activeId: activeReportId, pending,
              onSelect: setActiveReportId,
              onShowOnMap: (id) => { setActiveReportId(id); if (!isDesktop) setHomeView("map"); },
              onToggleCleanup: actions.toggleCleanup,
              onDelete: actions.requestDelete,
            }} />
        )}
        {showMap && (
          <div className="lg:sticky lg:top-24 lg:self-start">
            <InteractiveMap reports={visible} activeId={activeReportId} onSelect={setActiveReportId} userLocation={userLocation}
              fitKey={`${userLocation.lat},${userLocation.lng}|${radiusKm}|${visible.map((r) => r._id).join(",")}`}
              className="h-[60dvh] rounded-3xl border border-line lg:h-[calc(100dvh-8rem)]" />
          </div>
        )}
      </div>

      <LocationModal key={pickerOpen} open={pickerOpen} onClose={() => setPickerOpen(false)} initial={userLocation} onSelect={store.setUserLocation} />
      <DeleteReportDialog actions={actions} />
    </div>
  );
}
