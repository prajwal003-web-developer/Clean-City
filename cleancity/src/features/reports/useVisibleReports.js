import { useMemo } from "react";
import { haversineKm } from "../../utils/distance";
import { getParticipantIds, getReportCoords, normalizeStatus } from "../../utils/formatters";

/**
 * Applies status/category/search/sort to already-fetched reports (client-side only: the
 * search box filters loaded data, it does not query the server). Also returns per-status counts
 * for the tabs, computed after category and search so the numbers match what each tab would show.
 */
export function useVisibleReports(reports, filters, userLocation) {
  return useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    const base = reports.filter((r) => {
      if (filters.category !== "all" && r.category !== filters.category) return false;
      if (term && !`${r.title} ${r.description}`.toLowerCase().includes(term)) return false;
      return true;
    });
    const counts = { all: base.length, pending: 0, "in-progress": 0, resolved: 0 };
    base.forEach((r) => { counts[normalizeStatus(r.status)] += 1; });

    const visible = base.filter((r) => filters.status === "all" || normalizeStatus(r.status) === filters.status);
    const distanceOf = (r) => {
      const c = getReportCoords(r);
      return c && userLocation ? haversineKm(userLocation, c) : Infinity;
    };
    const sorters = {
      recent: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
      nearest: (a, b) => distanceOf(a) - distanceOf(b),
      participants: (a, b) => getParticipantIds(b).length - getParticipantIds(a).length,
    };
    return { visible: [...visible].sort(sorters[filters.sort] || sorters.recent), counts };
  }, [reports, filters, userLocation]);
}
