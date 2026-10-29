import { create } from "zustand";
import { reportAPI } from "../../services/api";
import { DEFAULT_RADIUS_KM } from "../../utils/constants";
import { getParticipantIds } from "../../utils/formatters";

const LOCATION_KEY = "cleancity.location";
const DEFAULT_FILTERS = { status: "all", category: "all", sort: "recent", search: "" };

const loadLocation = () => {
  try { return JSON.parse(sessionStorage.getItem(LOCATION_KEY)) || null; } catch { return null; }
};
const saveLocation = (loc) => {
  try { sessionStorage.setItem(LOCATION_KEY, JSON.stringify(loc)); } catch { /* optional */ }
};

let listRequestId = 0; // newest list request wins; older responses are ignored

/**
 * Shared feed/report state. `scope` tells which list `reports` currently holds:
 * "nearby" (radius around userLocation) or "all" (every report, used by the map page).
 */
export const useReportStore = create((set, get) => ({
  reports: [],
  scope: "nearby",
  selectedReport: null,
  detailError: null,
  filters: DEFAULT_FILTERS,
  userLocation: loadLocation(), // { lat, lng, source: "device" | "manual" }
  radiusKm: DEFAULT_RADIUS_KM,
  isLoading: false,
  error: null,
  pending: {}, // in-flight actions, keyed "<reportId>:<action>"

  setUserLocation(location) {
    saveLocation(location);
    set({ userLocation: location });
  },
  setRadiusKm: (radiusKm) => set({ radiusKm }),
  setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
  clearError: () => set({ error: null }),

  async _loadList(scope, request) {
    const id = ++listRequestId;
    set({ isLoading: true, error: null, scope });
    try {
      const reports = await request();
      if (id === listRequestId) set({ reports, isLoading: false });
    } catch (error) {
      if (id === listRequestId) set({ error: error.message, isLoading: false });
    }
  },

  fetchNearbyReports() {
    const { userLocation, radiusKm } = get();
    if (!userLocation) return Promise.resolve();
    return get()._loadList("nearby", () => reportAPI.getNearby({ lat: userLocation.lat, lng: userLocation.lng, radiusKm }));
  },

  fetchReports: () => get()._loadList("all", () => reportAPI.getAll()),

  async fetchReportById(id) {
    set({ selectedReport: null, detailError: null });
    try {
      const report = await reportAPI.getById(id);
      set({ selectedReport: report });
      return report;
    } catch (error) {
      set({ detailError: { message: error.message, status: error.status } });
      return null;
    }
  },

  /** Replaces a report everywhere it is held (feed + detail view). */
  _replace(report) {
    set((s) => ({
      reports: s.reports.map((r) => (r._id === report._id ? { ...r, ...report } : r)),
      selectedReport: s.selectedReport?._id === report._id ? { ...s.selectedReport, ...report } : s.selectedReport,
    }));
  },

  async createReport(formData, options) {
    const report = await reportAPI.create(formData, options);
    if (get().scope === "nearby") get().fetchNearbyReports();
    return report;
  },

  async updateReport(id, formData, options) {
    const report = await reportAPI.update(id, formData, options);
    if (report?._id) get()._replace(report);
    else get().fetchReportById(id);
    return report;
  },

  async deleteReport(id) {
    await reportAPI.delete(id);
    set((s) => ({
      reports: s.reports.filter((r) => r._id !== id),
      selectedReport: s.selectedReport?._id === id ? null : s.selectedReport,
    }));
  },

  /** Join or leave a cleanup. The server response wins; otherwise we patch participants locally. */
  async _toggleCleanup(id, userId, join) {
    const key = `${id}:cleanup`;
    if (get().pending[key]) return false;
    set((s) => ({ pending: { ...s.pending, [key]: true } }));
    try {
      const payload = join ? await reportAPI.joinCleanup(id) : await reportAPI.leaveCleanup(id);
      const fromServer = payload?.report ?? payload;
      if (fromServer?._id && Array.isArray(fromServer.cleanedBy)) {
        get()._replace(fromServer);
      } else {
        const report = get().reports.find((r) => r._id === id) ?? get().selectedReport;
        const ids = getParticipantIds(report);
        const next = join ? [...new Set([...ids, userId])] : ids.filter((p) => p !== userId);
        get()._replace({ _id: id, cleanedBy: next });
      }
      return true;
    } finally {
      set((s) => {
        const { [key]: _done, ...rest } = s.pending;
        return { pending: rest };
      });
    }
  },
  joinCleanup: (id, userId) => get()._toggleCleanup(id, userId, true),
  leaveCleanup: (id, userId) => get()._toggleCleanup(id, userId, false),

  async updateStatus(id, status) {
    await reportAPI.updateStatus(id, status);
    get()._replace({ _id: id, status });
  },
}));
