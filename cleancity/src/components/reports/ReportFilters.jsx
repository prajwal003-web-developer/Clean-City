import { motion } from "motion/react";
import { RefreshCw, Search } from "lucide-react";
import Button from "../common/Button";
import { CATEGORIES, RADIUS_OPTIONS_KM, SORT_OPTIONS, STATUS_META } from "../../utils/constants";

const TABS = [{ value: "all", label: "All" }, ...Object.entries(STATUS_META).map(([value, m]) => ({ value, label: m.label }))];
const select = "h-10 rounded-xl border border-line bg-white px-3 text-sm focus:border-aqua-700 focus:outline-none focus:ring-2 focus:ring-aqua-500/30";

/**
 * Status tabs, search, category, radius and sort controls.
 * Radius is only shown when `showRadius` (nearby feed); it triggers a server refetch.
 */
export default function ReportFilters({ filters, onChange, radiusKm, onRadiusChange, showRadius = true, onRefresh, refreshing, counts }) {
  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="Filter by status" className="flex gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1">
        {TABS.map((tab) => {
          const selected = filters.status === tab.value;
          return (
            <button key={tab.value} role="tab" aria-selected={selected} onClick={() => onChange({ status: tab.value })}
              className={`relative shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${selected ? "text-ink" : "text-muted hover:text-ink"}`}>
              {selected && <motion.span layoutId="status-tab" className="absolute inset-0 rounded-xl bg-white shadow-sm" transition={{ type: "spring", duration: 0.35, bounce: 0.15 }} />}
              <span className="relative">{tab.label}{counts?.[tab.value] != null && <span className="ml-1.5 text-xs tabular-nums text-muted">{counts[tab.value]}</span>}</span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input type="search" aria-label="Search loaded reports" placeholder="Search loaded reports" value={filters.search} onChange={(e) => onChange({ search: e.target.value })} className={`${select} w-full pl-9`} />
        </div>
        <select aria-label="Category" value={filters.category} onChange={(e) => onChange({ category: e.target.value })} className={select}>
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        {showRadius && (
          <select aria-label="Distance" value={radiusKm} onChange={(e) => onRadiusChange(Number(e.target.value))} className={select}>
            {RADIUS_OPTIONS_KM.map((km) => <option key={km} value={km}>Within {km} km</option>)}
          </select>
        )}
        <select aria-label="Sort" value={filters.sort} onChange={(e) => onChange({ sort: e.target.value })} className={select}>
          {SORT_OPTIONS.filter((o) => showRadius || o.value !== "nearest").map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <Button variant="secondary" size="icon" onClick={onRefresh} aria-label="Refresh reports"><RefreshCw className={`h-4 w-4 ${refreshing ? "motion-safe:animate-spin" : ""}`} /></Button>
      </div>
    </div>
  );
}
