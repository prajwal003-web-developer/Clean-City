import { create } from "zustand";

/** Ephemeral UI state shared between the feed and the map. */
export const useUIStore = create((set) => ({
  activeReportId: null,
  homeView: "list", // "list" | "map" (mobile only)
  setActiveReportId: (id) => set({ activeReportId: id }),
  setHomeView: (view) => set({ homeView: view }),
}));
